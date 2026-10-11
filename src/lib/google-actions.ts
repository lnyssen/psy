"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { dechiffrer } from "@/lib/chiffrement";
import { demoOuverte } from "@/lib/demo";
import { GoogleErreur, jetonAcces, listerEvenements, revoquer } from "@/lib/google-api";
import { rattacherEvenement, synchroniser, synchroniserApres } from "@/lib/google-sync";
import { exigerSession } from "@/lib/garde";

/**
 * Actions de l'interface pour la synchronisation Google Agenda.
 *
 * Les événements créés dans Google arrivent « à rattacher » — sauf ceux titrés
 * du nom d'un patient, que la synchronisation rattache d'elle-même. Pour les
 * autres, trois issues, toutes décidées par Amandine : une séance (avec son
 * patient, ou un lieu facturé à l'heure comme l'école), un simple créneau
 * occupé, ou rien.
 */

function texte(f: FormData, cle: string) {
  return String(f.get(cle) ?? "").trim();
}

function rafraichir() {
  for (const c of ["/admin", "/admin/semaine", "/admin/google", "/admin/patients", "/admin/reglages"]) {
    revalidatePath(c);
  }
  revalidatePath("/rendez-vous");
}

/** Le formulaire peut viser toute la série d'un événement récurrent. */
async function cibles(f: FormData) {
  const id = texte(f, "id");
  const ev = await prisma.evenementGoogle.findUnique({ where: { id } });
  if (!ev) return [];
  if (f.get("serie") === "on" && ev.serieId) {
    return prisma.evenementGoogle.findMany({
      where: { serieId: ev.serieId, statut: "A_RATTACHER" },
      orderBy: { debut: "asc" },
    });
  }
  return [ev];
}

export async function rattacherEvenementGoogle(f: FormData) {
  await exigerSession();
  const cabinetId = texte(f, "cabinetId");
  const patientId = texte(f, "patientId");
  const cabinet = await prisma.cabinet.findUnique({ where: { id: cabinetId } });
  if (!cabinet) return;

  // Un lieu facturé à l'heure (l'école) n'a pas de patient ; partout ailleurs
  // une séance en a un, et sans lui il n'y a rien à rattacher.
  let patient: { id: string } | null = null;
  if (!cabinet.factureInstitution) {
    if (!patientId) return;
    patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
    if (!patient) return;
  }

  let crees = 0;
  for (const ev of await cibles(f)) {
    // Faux si déjà rattaché entre-temps (double clic) : rien à faire.
    if (await rattacherEvenement(ev, { patientId: patient?.id ?? null, cabinetId: cabinet.id })) crees++;
  }

  rafraichir();
  synchroniserApres();
  // Compte rendu sur la page de tri : combien de séances, pour qui, avec un lien
  // vers la fiche. Sans lui, un rattachement de série ne laisse aucune trace
  // visible de ce qui vient d'être créé.
  const retour = new URLSearchParams({ fait: String(crees), c: cabinet.id });
  if (patient) retour.set("p", patient.id);
  redirect(`/admin/google?${retour}`);
}

async function marquer(f: FormData, statut: "OCCUPE" | "IGNORE") {
  const ids = (await cibles(f)).map((e) => e.id);
  if (ids.length === 0) return;
  await prisma.evenementGoogle.updateMany({ where: { id: { in: ids } }, data: { statut } });
  rafraichir();
}

export async function marquerEvenementOccupe(f: FormData) {
  await exigerSession();
  await marquer(f, "OCCUPE");
}

export async function ignorerEvenementGoogle(f: FormData) {
  await exigerSession();
  await marquer(f, "IGNORE");
}

/**
 * Retire un rendez-vous Google du calendrier de l'outil : il n'y est plus
 * affiché et ne bloque plus la réservation. Rien n'est supprimé chez Google —
 * l'événement y reste, c'est dans Google qu'on l'efface pour de bon — et rien
 * n'est perdu : il est seulement marqué « ignoré ».
 */
export async function retirerEvenementGoogle(id: string) {
  await exigerSession();
  await prisma.evenementGoogle.updateMany({
    where: { id, statut: { in: ["A_RATTACHER", "OCCUPE"] } },
    data: { statut: "IGNORE" },
  });
  rafraichir();
}

/**
 * Traite d'un coup les événements sans titre : ils n'ont aucune chance d'être
 * reconnus et il serait absurde de les trier un par un.
 *
 * Deux issues, qui n'ont pas les mêmes conséquences, d'où le choix explicite
 * à l'écran : « occupé » les garde dans le calendrier et sur la réservation en
 * ligne (le temps d'Amandine reste protégé) ; « ignoré » les efface des deux.
 * Seuls les événements encore « à rattacher » sont touchés — jamais un
 * créneau déjà décidé.
 */
export async function traiterSansTitre(statut: "OCCUPE" | "IGNORE") {
  await exigerSession();
  if (statut !== "OCCUPE" && statut !== "IGNORE") return;
  await prisma.evenementGoogle.updateMany({
    where: { statut: "A_RATTACHER", titre: "(sans titre)" },
    data: { statut },
  });
  rafraichir();
}

export async function synchroniserMaintenant() {
  await exigerSession();
  await synchroniser();
  rafraichir();
}

/**
 * Déconnecte Google. Les événements déjà créés restent dans l'agenda — les
 * effacer sans qu'on l'ait demandé serait pire qu'un résidu — mais l'outil
 * cesse de les suivre. À la reconnexion, ils sont reconnus à l'identifiant de
 * séance qu'ils portent et renoués sans doublon.
 */
export async function deconnecterGoogle() {
  await exigerSession();
  const c = await prisma.googleConnexion.findUnique({ where: { id: "global" } });
  if (c) {
    try {
      await revoquer(dechiffrer(c.refreshTokenChiffre));
    } catch {
      /* le jeton local est supprimé de toute façon */
    }
  }
  await prisma.$transaction([
    prisma.googleConnexion.deleteMany(),
    prisma.evenementGoogle.deleteMany(),
    prisma.session.updateMany({
      where: { googleEventId: { not: null } },
      data: { googleEventId: null, googleEtag: null, googleEmpreinte: null },
    }),
  ]);
  rafraichir();
}

/**
 * Extrait l'identifiant d'agenda de ce qui a été collé : l'identifiant brut,
 * l'adresse iCal (…/calendar/ical/<id encodé>/private-…/basic.ics) ou l'adresse
 * d'intégration (…/embed?src=<id>). Vide ou « primary » : l'agenda principal.
 * L'adresse iCal porte un jeton secret : on n'en garde que l'identifiant, elle
 * n'est ni stockée ni journalisée.
 */
function identifiantAgenda(saisie: string): string | null {
  const brut = saisie.trim();
  if (!brut || brut.toLowerCase() === "primary") return "primary";
  let id = brut;
  if (/^https?:\/\//i.test(brut)) {
    let url: URL;
    try {
      url = new URL(brut);
    } catch {
      return null;
    }
    const ical = url.pathname.match(/\/calendar\/ical\/([^/]+)\//);
    const src = url.searchParams.get("src") ?? url.searchParams.get("cid");
    if (ical) id = ical[1];
    else if (src) id = src;
    else return null;
  }
  try {
    id = decodeURIComponent(id).trim();
  } catch {
    return null;
  }
  // Un identifiant d'agenda ressemble à une adresse : quelque chose@domaine.
  return /^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(id) ? id : null;
}

/**
 * Change l'agenda Google suivi. On vérifie d'abord, avec le jeton, que l'agenda
 * est lisible ; rien ne bouge sinon. Ensuite les séances perdent leur lien pour
 * être recréées dans le nouvel agenda, et les événements importés de l'ancien
 * sont oubliés. L'ancien agenda Google, lui, n'est pas touché.
 */
export async function changerAgendaGoogle(f: FormData) {
  await exigerSession();
  function retour(code: string): never {
    redirect(`/admin/reglages?google=${code}#google`);
  }
  if (demoOuverte()) retour("demo");

  const c = await prisma.googleConnexion.findUnique({ where: { id: "global" } });
  if (!c) retour("echec");
  const id = identifiantAgenda(texte(f, "calendrierId"));
  if (!id) retour("agenda-invalide");
  if (id === c.calendrierId) retour("agenda-inchange");
  if (c.verrouJusqua && c.verrouJusqua > new Date()) retour("agenda-occupe");

  let code = "agenda-ok";
  try {
    const jeton = await jetonAcces(dechiffrer(c.refreshTokenChiffre));
    await listerEvenements(jeton, id, { maxResults: "1" });
  } catch (e) {
    code =
      e instanceof GoogleErreur && (e.statut === 403 || e.statut === 404)
        ? "agenda-introuvable"
        : "agenda-echec";
  }
  if (code !== "agenda-ok") retour(code);

  await prisma.$transaction([
    prisma.googleConnexion.update({
      where: { id: "global" },
      data: { calendrierId: id, syncToken: null, derniereErreur: null },
    }),
    // EvenementGoogle n'a aucune relation : tout ce qu'il contient vient de
    // l'ancien agenda, les séances, elles, sont dans Session.
    prisma.evenementGoogle.deleteMany(),
    prisma.session.updateMany({
      where: { googleEventId: { not: null } },
      data: { googleEventId: null, googleEtag: null, googleEmpreinte: null },
    }),
  ]);
  rafraichir();
  synchroniserApres();
  retour(code);
}
