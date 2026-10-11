import { createHash } from "node:crypto";
import { after } from "next/server";
import type { EvenementGoogle } from "@prisma/client";
import { prisma } from "@/lib/db";
import { demoOuverte } from "@/lib/demo";
import { chiffrer, dechiffrer } from "@/lib/chiffrement";
import { adresseCabinet, lundiDe, partiesJour } from "@/lib/format";
import {
  GoogleErreur,
  creerEvenement,
  googleConfigure,
  jetonAcces,
  listerEvenements,
  modifierEvenement,
  supprimerEvenement,
  type CorpsEvenement,
  type EvenementDistant,
} from "@/lib/google-api";
import { cabinetAutorise, cabinetDesLieux, patientDuTitre } from "@/lib/google-correspondance";

/**
 * Synchronisation dans les deux sens avec le Google Agenda d'Amandine.
 *
 * Deux flux, toujours dans cet ordre — lire, puis écrire :
 *
 * - Google → app. Un événement créé dans Google arrive « à rattacher ». S'il
 *   est titré exactement du prénom et du nom d'un seul patient, il devient sa
 *   séance de lui-même (règles dans lib/google-correspondance.ts) ; sinon,
 *   c'est à Amandine de décider. Un événement qui est déjà une séance de
 *   l'app (déplacé ou supprimé dans Google) répercute le changement sur la
 *   séance.
 * - app → Google. Chaque séance à venir devient un événement titré du nom du
 *   patient et du lieu. Rien n'est envoyé si rien n'a changé : l'empreinte de
 *   ce qui est parti sert de mémoire.
 *
 * Lire avant d'écrire est ce qui évite qu'un déplacement fait dans Google soit
 * aussitôt écrasé par l'ancienne version venue de l'app.
 *
 * Le verrou et la séparation par `googleEtag` empêchent les deux boucles
 * classiques : deux synchronisations simultanées qui dupliquent des
 * événements, et l'écho de nos propres envois relu comme une modification
 * extérieure.
 */

const FUSEAU = "Europe/Brussels";
/** Écritures par passage : au-delà, la suite attend le passage suivant plutôt
 *  que de risquer le délai de la fonction ou les quotas de Google. */
const MAX_ECRITURES = 40;
const VERROU_MS = 90_000;

export type ResultatSynchro = {
  ok: boolean;
  /** Pourquoi rien n'a été fait, quand ce n'est pas une erreur. */
  ignoree?: "non-configure" | "non-connecte" | "demo" | "recent" | "en-cours";
  erreur?: string;
  importes: number;
  /** Événements « à rattacher » devenus des séances d'eux-mêmes. */
  rattaches: number;
  envoyes: number;
  supprimes: number;
  annulees: number;
  reste: number;
};

const vide = (): ResultatSynchro => ({
  ok: true,
  importes: 0,
  rattaches: 0,
  envoyes: 0,
  supprimes: 0,
  annulees: 0,
  reste: 0,
});

// --- Contenu de l'événement ------------------------------------------------

type SeanceComplete = Awaited<ReturnType<typeof chargerSeances>>[number];

/** Identifiant d'événement dérivé de la séance. Google accepte des identifiants
 *  choisis par l'appelant (alphabet base32hex) : l'hexadécimal en fait partie.
 *  Rejouer un envoi retombe donc sur le même événement. */
export function idEvenement(idSeance: string) {
  return Buffer.from(idSeance, "utf8").toString("hex");
}

function corpsEvenement(
  s: Pick<SeanceComplete, "id" | "startsAt" | "durationMin" | "patient" | "cabinet" | "visio">,
): CorpsEvenement {
  const fin = new Date(s.startsAt.getTime() + s.durationMin * 60_000);
  return {
    // Le nom du patient part chez Google : choix assumé d'Amandine, plus lisible
    // qu'un simple lieu. Le flux iCalendar public, lui, n'en porte jamais.
    summary: s.patient
      ? `${s.patient.firstName} ${s.patient.lastName} — ${s.visio ? "visio" : s.cabinet.nom}`
      : s.cabinet.nom,
    location: s.visio ? "Visio" : adresseCabinet(s.cabinet),
    description: "Séance — détail dans l’outil de gestion.",
    start: { dateTime: s.startsAt.toISOString(), timeZone: FUSEAU },
    end: { dateTime: fin.toISOString(), timeZone: FUSEAU },
    transparency: "opaque",
    extendedProperties: { private: { psySessionId: s.id } },
  };
}

function empreinte(c: CorpsEvenement) {
  return createHash("sha256")
    .update(JSON.stringify([c.summary, c.location, c.start.dateTime, c.end.dateTime]))
    .digest("hex")
    .slice(0, 32);
}

async function chargerSeances(debut: Date, fin: Date) {
  return prisma.session.findMany({
    where: { startsAt: { gte: debut, lt: fin } },
    include: { patient: true, cabinet: true },
    orderBy: { startsAt: "asc" },
  });
}

// --- Fenêtre et calendrier --------------------------------------------------

/** De lundi dernier à six mois : assez pour voir la semaine en cours en entier
 *  et bien au-delà de l'horizon de réservation, sans charger dans l'outil un
 *  agenda personnel entier. La fenêtre glisse : ce qui entre dans les six mois
 *  est envoyé ou importé au passage suivant. */
function fenetre() {
  const debut = lundiDe(new Date());
  const fin = new Date();
  fin.setMonth(fin.getMonth() + 6);
  return { debut, fin };
}

function estJourOuvre(d: Date) {
  const { annee, mois, jour } = partiesJour(d);
  const w = new Date(Date.UTC(annee, mois - 1, jour)).getUTCDay();
  return w !== 0 && w !== 6;
}

function dates(ev: EvenementDistant) {
  const d = ev.start?.dateTime;
  const f = ev.end?.dateTime;
  if (!d || !f) return null; // un événement « toute la journée » n'est pas un rendez-vous
  const debut = new Date(d);
  const fin = new Date(f);
  if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime()) || fin <= debut) return null;
  return { debut, fin };
}

// --- Google → app -----------------------------------------------------------

type Contexte = {
  debut: Date;
  fin: Date;
  maintenant: Date;
  /** Supprime côté Google un événement dont la séance n'existe plus. Au mieux :
   *  un échec ne doit pas interrompre la synchronisation. */
  supprimerOrphelin: (idEvenement: string) => Promise<void>;
};

async function traiterEvenement(
  ev: EvenementDistant,
  ctx: Contexte,
  bilan: ResultatSynchro,
) {
  // Supprimé dans Google.
  if (ev.status === "cancelled") {
    const s = await prisma.session.findUnique({ where: { googleEventId: ev.id } });
    if (s) {
      // Une séance à venir encore planifiée se répercute en annulation. Une
      // séance passée ou déjà traitée garde son statut : la facturation ne se
      // réécrit pas parce qu'un événement a été nettoyé dans Google.
      const annulable = s.status === "SCHEDULED" && s.startsAt > ctx.maintenant;
      await prisma.session.update({
        where: { id: s.id },
        data: {
          googleEventId: null,
          googleEtag: null,
          googleEmpreinte: null,
          ...(annulable ? { status: "CANCELLED_IN_TIME" as const } : {}),
        },
      });
      if (annulable) bilan.annulees++;
    }
    await prisma.evenementGoogle.deleteMany({ where: { googleId: ev.id } });
    return;
  }

  const priv = ev.extendedProperties?.private;
  const idSeance = priv?.psySessionId;

  let session = await prisma.session.findUnique({
    where: { googleEventId: ev.id },
    include: { patient: true, cabinet: true },
  });

  // Événement que nous avons créé, dont la séance a perdu son lien (déconnexion
  // puis reconnexion) : on renoue plutôt que de l'importer comme un inconnu.
  if (!session && idSeance) {
    const orpheline = await prisma.session.findUnique({
      where: { id: idSeance },
      include: { patient: true, cabinet: true },
    });
    if (orpheline && !orpheline.googleEventId) {
      session = await prisma.session.update({
        where: { id: orpheline.id },
        data: { googleEventId: ev.id, googleEtag: ev.etag ?? null, googleEmpreinte: null },
        include: { patient: true, cabinet: true },
      });
    } else if (!orpheline) {
      // Séance supprimée côté app : son événement n'a plus de raison d'être.
      await ctx.supprimerOrphelin(ev.id);
      return;
    }
  }

  const horaire = dates(ev);

  if (session) {
    if (ev.etag && ev.etag === session.googleEtag) return; // écho de notre propre envoi
    if (!horaire) {
      await prisma.session.update({ where: { id: session.id }, data: { googleEtag: ev.etag ?? null } });
      return;
    }
    const dureeMin = Math.round((horaire.fin.getTime() - horaire.debut.getTime()) / 60_000);
    const change = horaire.debut.getTime() !== session.startsAt.getTime() || dureeMin !== session.durationMin;
    const modifiable = session.status === "SCHEDULED" && session.startsAt > ctx.maintenant;

    if (change && modifiable && estJourOuvre(horaire.debut)) {
      const maj = { ...session, startsAt: horaire.debut, durationMin: dureeMin };
      await prisma.session.update({
        where: { id: session.id },
        data: {
          startsAt: horaire.debut,
          durationMin: dureeMin,
          googleEtag: ev.etag ?? null,
          googleEmpreinte: empreinte(corpsEvenement(maj)),
        },
      });
      bilan.importes++;
    } else {
      // Changement refusé (séance déjà traitée, week-end…) : on retient l'état
      // vu et on oublie l'empreinte, pour que l'app réécrive sa version.
      await prisma.session.update({
        where: { id: session.id },
        data: { googleEtag: ev.etag ?? null, ...(change ? { googleEmpreinte: null } : {}) },
      });
    }
    return;
  }

  // Événement inconnu : un rendez-vous créé dans Google.
  const refuse = ev.attendees?.some((a) => a.self && a.responseStatus === "declined");
  if (!horaire || refuse || horaire.fin <= ctx.debut || horaire.debut >= ctx.fin || !estJourOuvre(horaire.debut)) {
    await prisma.evenementGoogle.deleteMany({ where: { googleId: ev.id } });
    return;
  }
  const donnees = {
    etag: ev.etag ?? null,
    titre: ev.summary?.trim() || "(sans titre)",
    lieu: ev.location ?? null,
    debut: horaire.debut,
    fin: horaire.fin,
    serieId: ev.recurringEventId ?? null,
  };
  const existait = await prisma.evenementGoogle.findUnique({ where: { googleId: ev.id } });
  await prisma.evenementGoogle.upsert({
    where: { googleId: ev.id },
    create: { googleId: ev.id, ...donnees },
    update: donnees,
  });
  if (!existait) bilan.importes++;
}

async function lire(
  jeton: string,
  connexion: { calendrierId: string; syncToken: string | null },
  ctx: Contexte,
  bilan: ResultatSynchro,
) {
  let syncToken = connexion.syncToken;
  let complet = !syncToken;
  const vus = new Set<string>();

  for (let tentative = 0; tentative < 2; tentative++) {
    let pageToken: string | undefined;
    let prochain: string | undefined;
    try {
      do {
        const requete: Record<string, string> = { singleEvents: "true", maxResults: "250" };
        if (syncToken) {
          // Avec un curseur, Google exige de voir aussi les suppressions et
          // interdit les bornes de dates.
          requete.syncToken = syncToken;
          requete.showDeleted = "true";
        } else {
          requete.timeMin = ctx.debut.toISOString();
          requete.timeMax = ctx.fin.toISOString();
        }
        if (pageToken) requete.pageToken = pageToken;

        const page = await listerEvenements(jeton, connexion.calendrierId, requete);
        for (const ev of page.items) {
          vus.add(ev.id);
          await traiterEvenement(ev, ctx, bilan);
        }
        pageToken = page.nextPageToken;
        prochain = page.nextSyncToken ?? prochain;
      } while (pageToken);
    } catch (e) {
      // 410 : le curseur est périmé, Google demande de tout relire.
      if (e instanceof GoogleErreur && e.statut === 410 && syncToken) {
        syncToken = null;
        complet = true;
        vus.clear();
        continue;
      }
      throw e;
    }

    // Relecture complète : ce que Google ne renvoie plus a disparu. Les
    // événements importés s'effacent ; une séance dont l'événement manque est
    // seulement déliée, jamais annulée — une réponse vide ne doit pas pouvoir
    // vider l'agenda. Elle sera simplement renvoyée.
    if (complet) {
      await prisma.evenementGoogle.deleteMany({
        where: { debut: { gte: ctx.debut }, googleId: { notIn: [...vus] } },
      });
      await prisma.session.updateMany({
        where: {
          googleEventId: { not: null, notIn: [...vus] },
          startsAt: { gte: ctx.debut },
        },
        data: { googleEventId: null, googleEtag: null, googleEmpreinte: null },
      });
    }
    return prochain ?? null;
  }
  return null;
}

// --- Rattachement -----------------------------------------------------------

/**
 * Fait d'un événement « à rattacher » une séance, et l'efface, d'un seul
 * tenant. Commun au rattachement manuel et automatique. Faux si l'événement
 * était déjà rattaché entre-temps (double clic, synchronisation concurrente).
 */
export async function rattacherEvenement(
  ev: Pick<EvenementGoogle, "id" | "googleId" | "etag" | "debut" | "fin">,
  cible: { patientId: string | null; cabinetId: string },
) {
  const duree = Math.min(480, Math.max(5, Math.round((ev.fin.getTime() - ev.debut.getTime()) / 60_000)));
  try {
    await prisma.$transaction([
      prisma.session.create({
        data: {
          patientId: cible.patientId,
          cabinetId: cible.cabinetId,
          startsAt: ev.debut,
          durationMin: duree,
          // Le lien est posé tout de suite : la prochaine lecture reconnaît
          // l'événement comme une séance, pas comme un nouvel inconnu. Pas
          // d'empreinte — la séance repart vers Google pour y prendre son
          // titre normalisé (nom du patient, lieu).
          googleEventId: ev.googleId,
          googleEtag: ev.etag,
        },
      }),
      prisma.evenementGoogle.delete({ where: { id: ev.id } }),
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rattache d'eux-mêmes les événements à venir, encore « à rattacher », dont le
 * titre désigne un patient sans ambiguïté — règles dans
 * lib/google-correspondance.ts. Passe après la lecture, donc sur les nouveaux
 * venus comme sur ceux déjà en base, et avant l'écriture, qui donne aussitôt
 * à l'événement son titre normalisé. Un événement marqué « occupé » ou
 * « ignoré » n'est jamais repris : c'était une décision.
 */
async function rattacherAutomatiquement(ctx: Contexte, bilan: ResultatSynchro) {
  const evenements = await prisma.evenementGoogle.findMany({
    where: { statut: "A_RATTACHER", debut: { gt: ctx.maintenant } },
    orderBy: { debut: "asc" },
  });
  if (evenements.length === 0) return;

  const [patients, cabinets] = await Promise.all([
    prisma.patient.findMany({
      where: { active: true },
      select: { id: true, firstName: true, lastName: true, cabinetId: true },
    }),
    prisma.cabinet.findMany({
      select: {
        id: true,
        nom: true,
        addressLine: true,
        postalCode: true,
        city: true,
        actif: true,
        factureInstitution: true,
      },
    }),
  ]);
  const parId = new Map(cabinets.map((c) => [c.id, c]));

  for (const ev of evenements) {
    const trouve = patientDuTitre(ev.titre, patients);
    if (!trouve) continue;

    let cabinetId: string | null = null;
    const duLieu = cabinetDesLieux([trouve.lieu, ev.lieu], cabinets);
    if (duLieu === "refuse") continue;
    if (duLieu) {
      cabinetId = duLieu.cabinet.id;
    } else {
      const derniere = await prisma.session.findFirst({
        where: {
          patientId: trouve.patient.id,
          startsAt: { lt: ev.debut },
          cabinet: { actif: true, factureInstitution: false },
        },
        orderBy: { startsAt: "desc" },
        select: { cabinetId: true },
      });
      const habituel = trouve.patient.cabinetId ? parId.get(trouve.patient.cabinetId) : undefined;
      cabinetId = derniere?.cabinetId ?? (habituel && cabinetAutorise(habituel) ? habituel.id : null);
    }
    if (!cabinetId) continue;

    if (await rattacherEvenement(ev, { patientId: trouve.patient.id, cabinetId })) bilan.rattaches++;
  }
}

// --- app → Google -----------------------------------------------------------

const ACTIFS = ["SCHEDULED", "ATTENDED", "NO_SHOW"] as const;

async function ecrire(
  jeton: string,
  connexion: { calendrierId: string },
  ctx: { debut: Date; fin: Date },
  bilan: ResultatSynchro,
) {
  const cal = connexion.calendrierId;
  const seances = await chargerSeances(ctx.debut, ctx.fin);
  let ecritures = 0;

  for (const s of seances) {
    const actif = (ACTIFS as readonly string[]).includes(s.status);

    // Séance annulée : l'événement disparaît.
    if (!actif) {
      if (!s.googleEventId) continue;
      if (ecritures >= MAX_ECRITURES) {
        bilan.reste++;
        continue;
      }
      await supprimerEvenement(jeton, cal, s.googleEventId);
      await prisma.session.update({
        where: { id: s.id },
        data: { googleEventId: null, googleEtag: null, googleEmpreinte: null },
      });
      ecritures++;
      bilan.supprimes++;
      continue;
    }

    const corps = corpsEvenement(s);
    const emp = empreinte(corps);
    if (s.googleEventId && s.googleEmpreinte === emp) continue; // déjà à jour
    // On ne crée que des séances à venir : les passées n'ont pas besoin
    // d'apparaître d'un coup dans l'agenda quand on se connecte.
    if (!s.googleEventId && s.status !== "SCHEDULED") continue;

    if (ecritures >= MAX_ECRITURES) {
      bilan.reste++;
      continue;
    }

    const id = s.googleEventId ?? idEvenement(s.id);
    let etag: string | undefined;
    try {
      if (s.googleEventId) {
        etag = (await modifierEvenement(jeton, cal, id, corps)).etag;
      } else {
        etag = (await creerEvenement(jeton, cal, { ...corps, id })).etag;
      }
    } catch (e) {
      if (!(e instanceof GoogleErreur)) throw e;
      if (e.statut === 409) {
        // L'identifiant existe déjà (envoi précédent interrompu, ou événement
        // supprimé que Google garde en mémoire) : on le met à jour et on le
        // ressuscite.
        etag = (await modifierEvenement(jeton, cal, id, { ...corps, status: "confirmed" })).etag;
      } else if (e.statut === 404 || e.statut === 410) {
        etag = (await creerEvenement(jeton, cal, { ...corps, id })).etag;
      } else {
        throw e;
      }
    }
    await prisma.session.update({
      where: { id: s.id },
      data: { googleEventId: id, googleEtag: etag ?? null, googleEmpreinte: emp },
    });
    ecritures++;
    bilan.envoyes++;
  }
}

// --- Point d'entrée ---------------------------------------------------------

export async function synchroniser(opts: { maxAgeMs?: number } = {}): Promise<ResultatSynchro> {
  const bilan = vide();
  if (!googleConfigure()) return { ...bilan, ignoree: "non-configure" };
  // Jamais en démonstration ouverte : l'outil y est lisible par n'importe qui,
  // et l'agenda d'Amandine ne doit pas s'y afficher.
  if (demoOuverte()) return { ...bilan, ignoree: "demo" };

  const connexion = await prisma.googleConnexion.findUnique({ where: { id: "global" } });
  if (!connexion) return { ...bilan, ignoree: "non-connecte" };

  const maintenant = new Date();
  if (
    opts.maxAgeMs &&
    connexion.derniereSynchro &&
    maintenant.getTime() - connexion.derniereSynchro.getTime() < opts.maxAgeMs &&
    !connexion.derniereErreur
  ) {
    return { ...bilan, ignoree: "recent" };
  }

  const verrou = await prisma.googleConnexion.updateMany({
    where: {
      id: "global",
      OR: [{ verrouJusqua: null }, { verrouJusqua: { lt: maintenant } }],
    },
    data: { verrouJusqua: new Date(maintenant.getTime() + VERROU_MS) },
  });
  if (verrou.count === 0) return { ...bilan, ignoree: "en-cours" };

  try {
    const jeton = await jetonAcces(dechiffrer(connexion.refreshTokenChiffre));
    const ctx: Contexte = {
      ...fenetre(),
      maintenant,
      supprimerOrphelin: async (id) => {
        try {
          await supprimerEvenement(jeton, connexion.calendrierId, id);
        } catch {
          /* au mieux */
        }
      },
    };

    const syncToken = await lire(jeton, connexion, ctx, bilan);
    await rattacherAutomatiquement(ctx, bilan);
    await ecrire(jeton, connexion, ctx, bilan);

    await prisma.googleConnexion.update({
      where: { id: "global" },
      data: {
        syncToken,
        derniereSynchro: new Date(),
        derniereErreur: null,
        verrouJusqua: null,
      },
    });
    return bilan;
  } catch (e) {
    const revoquee = e instanceof GoogleErreur && e.code === "invalid_grant";
    const message = revoquee
      ? "L’accès à Google a expiré ou a été retiré — reconnecte ton agenda."
      : e instanceof Error
        ? e.message
        : "Erreur inconnue.";
    await prisma.googleConnexion.update({
      where: { id: "global" },
      data: { derniereErreur: message, verrouJusqua: null },
    });
    return { ...bilan, ok: false, erreur: message };
  }
}

/**
 * À appeler après une modification : la synchronisation part une fois la
 * réponse envoyée, sans faire attendre qui vient de cliquer.
 */
export function synchroniserApres(maxAgeMs = 0) {
  try {
    after(async () => {
      try {
        await synchroniser({ maxAgeMs });
      } catch {
        /* la synchronisation ne doit jamais faire échouer une action */
      }
    });
  } catch {
    /* hors requête (script, test) : rien à planifier */
  }
}

// --- Connexion --------------------------------------------------------------

export async function enregistrerConnexion(email: string, refreshToken: string) {
  const chiffre = chiffrer(refreshToken);
  await prisma.googleConnexion.upsert({
    where: { id: "global" },
    create: { id: "global", email, refreshTokenChiffre: chiffre },
    // Nouvelle autorisation : on repart d'une relecture complète.
    update: { email, refreshTokenChiffre: chiffre, syncToken: null, derniereErreur: null, verrouJusqua: null },
  });
}

export async function etatGoogle() {
  const configure = googleConfigure();
  const demo = demoOuverte();
  const connexion = await prisma.googleConnexion.findUnique({ where: { id: "global" } });
  const aRattacher = await prisma.evenementGoogle.count({ where: { statut: "A_RATTACHER" } });
  return {
    configure,
    demo,
    connecte: Boolean(connexion),
    email: connexion?.email ?? null,
    calendrierId: connexion?.calendrierId ?? null,
    derniereSynchro: connexion?.derniereSynchro ?? null,
    derniereErreur: connexion?.derniereErreur ?? null,
    aRattacher,
  };
}
