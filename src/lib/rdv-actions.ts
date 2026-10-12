"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { synchroniserApres } from "@/lib/google-sync";
import { prisma } from "@/lib/db";
import { creneauEncoreLibre } from "@/lib/creneaux";
import { parametres } from "@/lib/parametres";
import { exigerSession } from "@/lib/garde";
import {
  adresseNotifications,
  creneauEnClair,
  envoyerCourriel,
} from "@/lib/courriel";
import { SITE } from "@/lib/site";
import { horsQuotaPour } from "@/lib/quotas";
import { envoyerConfirmation, lienSeance } from "@/lib/rappels";

/** Adresse publique de l'outil, pour les liens des e-mails. */
const URL_SITE = process.env.SITE_URL || "https://amandinemonsel.be";

/** Prévient Amandine après la réponse au visiteur : un serveur de messagerie
 *  lent ne doit jamais faire attendre la personne qui réserve. */
function prevenirAmandine(sujet: string, texte: string, repondreA?: string) {
  after(() =>
    envoyerCourriel({ a: adresseNotifications(), sujet, texte, repondreA }),
  );
}

function lieuEnClair(c: {
  nom: string;
  addressLine: string;
  postalCode: string;
  city: string;
}) {
  return `${c.nom}, ${c.addressLine}, ${c.postalCode} ${c.city}`;
}

/**
 * Prise de rendez-vous depuis le site public.
 *
 * Deux chemins, selon que l'outil connaît déjà la personne :
 *
 * - un patient qui arrive avec son lien personnel réserve directement, son
 *   créneau devient une séance ;
 * - toute autre personne dépose une demande, qu'Amandine confirme ou décline.
 *   Elle garde ainsi la main sur qui entre dans son agenda, ce qui compte
 *   particulièrement pour une première consultation.
 *
 * Dans les deux cas la disponibilité est revérifiée ici : l'affichage a pu
 * vieillir de quelques minutes entre la page et l'envoi du formulaire.
 */

function texte(f: FormData, cle: string) {
  return String(f.get(cle) ?? "").trim();
}

/**
 * Garde-fous contre les envois en rafale.
 *
 * Volontairement sans adresse IP : la stocker ferait entrer une donnée
 * personnelle de plus dans une base qui en contient déjà de sensibles, pour un
 * bénéfice mince. On s'en tient à ce que le formulaire donne déjà — le
 * téléphone, seul champ obligatoire — et à un plafond global, qui borne les
 * dégâts d'un envoi automatisé sans jamais bloquer une personne réelle.
 *
 * Ce n'est pas une protection contre un adversaire déterminé. C'en est une
 * contre le robot de passage, qui est le cas réel.
 */
const MAX_PAR_NUMERO = 3;
const MAX_PAR_HEURE = 20;

async function tropDeDemandes(phone: string) {
  const uneHeure = new Date(Date.now() - 60 * 60 * 1000);
  const unJour = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [parNumero, total] = await Promise.all([
    prisma.demandeRdv.count({
      where: { phone, createdAt: { gte: unJour } },
    }),
    prisma.demandeRdv.count({ where: { createdAt: { gte: uneHeure } } }),
  ]);

  if (parNumero >= MAX_PAR_NUMERO) {
    return "Plusieurs demandes ont déjà été déposées avec ce numéro. Amandine vous répondra ; inutile d’en envoyer d’autres.";
  }
  if (total >= MAX_PAR_HEURE) {
    return "Le formulaire reçoit un nombre inhabituel de demandes. Réessayez dans un moment, ou téléphonez.";
  }
  return null;
}

export type ResultatRdv = { ok: boolean; message: string } | null;

export async function reserverOuDemander(
  _etat: ResultatRdv,
  f: FormData,
): Promise<ResultatRdv> {
  // Fermé depuis les réglages : aucune demande n'est prise, même si la page
  // d'un visiteur était restée ouverte ou si le formulaire est envoyé à la main.
  if (!(await parametres()).rdvEnLigne) {
    return {
      ok: false,
      message:
        "Les rendez-vous en ligne sont fermés pour le moment. Contactez le cabinet par téléphone.",
    };
  }

  const cabinetId = texte(f, "cabinetId");
  const iso = texte(f, "creneau");
  const jeton = texte(f, "jeton");

  // Nouveaux patients fermés : seuls ceux qui ont leur lien personnel réservent.
  if (!jeton && !(await parametres()).nouveauxPatients) {
    return {
      ok: false,
      message:
        "Je ne prends pas de nouveaux patients pour le moment. Vous pouvez vous inscrire sur la liste d’attente.",
    };
  }

  if (!cabinetId || !iso) {
    return { ok: false, message: "Choisissez un créneau." };
  }

  const debut = new Date(iso);
  if (Number.isNaN(debut.getTime()) || debut < new Date()) {
    return { ok: false, message: "Ce créneau n’est plus valable." };
  }

  if (!(await creneauEncoreLibre(cabinetId, iso))) {
    return {
      ok: false,
      message:
        "Ce créneau vient d’être pris. Choisissez-en un autre, la liste est à jour.",
    };
  }

  // Patient connu : réservation immédiate.
  if (jeton) {
    const patient = await prisma.patient.findUnique({
      where: { jetonRdv: jeton },
    });
    if (!patient) {
      return { ok: false, message: "Ce lien personnel n’est plus valable." };
    }
    const seance = await prisma.session.create({
      data: {
        patientId: patient.id,
        cabinetId,
        startsAt: debut,
        durationMin: (await parametres()).dureeSeanceMin,
        reserveeEnLigne: true,
      },
      include: { cabinet: true },
    });
    const horsQuota = (await horsQuotaPour([patient.id])).has(seance.id);
    prevenirAmandine(
      `Réservation : ${patient.firstName} ${patient.lastName}, ${creneauEnClair(debut)}`,
      [
        `${patient.firstName} ${patient.lastName} a réservé en ligne avec son lien personnel :`,
        "",
        `${creneauEnClair(debut)} à ${seance.cabinet.nom}.`,
        ...(horsQuota
          ? [
              "",
              "Attention : cette séance dépasse le plafond INAMI sur douze mois, elle ne sera pas remboursée par la convention.",
            ]
          : []),
        "",
        `La séance est déjà dans l’agenda : ${URL_SITE}/admin/semaine`,
      ].join("\n"),
    );
    revalidatePath("/admin/semaine");
    revalidatePath("/admin");
    synchroniserApres();
    // La confirmation par e-mail part après la réponse : un serveur de
    // messagerie lent ne fait pas attendre le patient.
    after(() => envoyerConfirmation(seance.id));
    return {
      ok: true,
      message: "Votre rendez-vous est confirmé.",
    };
  }

  // Inconnu : demande à confirmer. Le minimum de champs, et rien de clinique —
  // le motif se dira en séance, pas dans un formulaire public.
  const firstName = texte(f, "firstName");
  const lastName = texte(f, "lastName");
  const email = texte(f, "email");
  const phone = texte(f, "phone");
  if (!firstName || !lastName || !phone) {
    return {
      ok: false,
      message: "Nom, prénom et téléphone sont nécessaires.",
    };
  }
  if (email && !email.includes("@")) {
    return { ok: false, message: "L’adresse électronique n’est pas valable." };
  }

  const trop = await tropDeDemandes(phone);
  if (trop) return { ok: false, message: trop };

  const demande = await prisma.demandeRdv.create({
    data: {
      firstName,
      lastName,
      email: email ? email.toLowerCase() : null,
      phone,
      message: texte(f, "message") || null,
      souhaite: debut,
      cabinetId,
    },
    include: { cabinet: true },
  });
  revalidatePath("/admin/demandes");
  // Le message libre du visiteur reste dans l'outil : il peut dire plus qu'il
  // ne faudrait, et l'e-mail n'est pas le bon endroit pour le lire.
  prevenirAmandine(
    `Demande de rendez-vous : ${firstName} ${lastName}`,
    [
      `${firstName} ${lastName} demande un rendez-vous :`,
      "",
      `${creneauEnClair(debut)} à ${demande.cabinet.nom}.`,
      `Téléphone : ${phone}`,
      ...(demande.email ? [`E-mail : ${demande.email}`] : []),
      ...(demande.message
        ? ["", "Un message accompagne la demande, à lire dans l’outil."]
        : []),
      "",
      `Confirmer ou décliner : ${URL_SITE}/admin/demandes`,
    ].join("\n"),
    demande.email ?? undefined,
  );

  return {
    ok: true,
    message:
      "Votre demande est transmise. Amandine vous répondra pour confirmer ce créneau ou vous en proposer un autre.",
  };
}

/** Confirmation d'une demande : elle crée le dossier patient s'il n'existe pas,
 *  puis la séance. Décliner ne crée rien. */
export async function traiterDemande(f: FormData) {
  await exigerSession();
  const id = texte(f, "id");
  const decision = texte(f, "decision");
  if (!id) return;

  const demande = await prisma.demandeRdv.findUnique({
    where: { id },
    include: { cabinet: true },
  });
  if (!demande || demande.statut !== "EN_ATTENTE") return;

  // La réponse promise sur le site part d'elle-même quand le demandeur a
  // laissé une adresse ; sinon, c'est au téléphone (le seul champ exigé).
  const repondre = (sujet: string, lignes: string[]) => {
    if (!demande.email) return;
    const a = demande.email;
    after(() =>
      envoyerCourriel({
        a,
        sujet,
        texte: [
          `Bonjour ${demande.firstName},`,
          "",
          ...lignes,
          "",
          SITE.nom,
          SITE.telephone,
        ].join("\n"),
        repondreA: SITE.email,
      }),
    );
  };

  if (decision === "refuser") {
    await prisma.demandeRdv.update({
      where: { id },
      data: { statut: "REFUSEE" },
    });
    repondre("Votre demande de rendez-vous", [
      `Je ne peux malheureusement pas vous recevoir le ${creneauEnClair(demande.souhaite)}.`,
      `Vous pouvez choisir un autre créneau sur ${URL_SITE}/rendez-vous, ou me joindre au ${SITE.telephone}.`,
    ]);
  } else {
    const tarif = await prisma.tarif.findFirst({
      where: { regime: "PRIVE", actif: true },
      orderBy: [{ parDefaut: "desc" }, { ordre: "asc" }],
    });
    const patient = await prisma.patient.create({
      data: {
        firstName: demande.firstName,
        lastName: demande.lastName,
        email: demande.email,
        phone: demande.phone,
        scheme: "PRIVE",
        tarifId: tarif?.id ?? null,
        cabinetId: demande.cabinetId,
        jetonRdv: crypto.randomUUID(),
      },
    });
    const seanceConfirmee = await prisma.session.create({
      data: {
        patientId: patient.id,
        cabinetId: demande.cabinetId,
        startsAt: demande.souhaite,
        durationMin: (await parametres()).dureeSeanceMin,
        reserveeEnLigne: true,
      },
    });
    const lienAnnulation = await lienSeance(seanceConfirmee.id);
    if (demande.message) {
      await prisma.note.create({
        data: {
          patientId: patient.id,
          body: `Demande en ligne : ${demande.message}`,
        },
      });
    }
    await prisma.demandeRdv.update({
      where: { id },
      data: { statut: "CONFIRMEE" },
    });
    repondre("Votre rendez-vous est confirmé", [
      `Votre rendez-vous du ${creneauEnClair(demande.souhaite)} est confirmé.`,
      "",
      `Adresse : ${lieuEnClair(demande.cabinet)}`,
      "",
      `Pour annuler ou déplacer ce rendez-vous, jusqu’à 24 heures avant : ${lienAnnulation}`,
      `Passé ce délai, merci de me joindre au ${SITE.telephone}.`,
      ...(patient.jetonRdv
        ? [
            "",
            `Pour vos prochains rendez-vous, ce lien personnel vous permet de réserver directement : ${URL_SITE}/rendez-vous?p=${patient.jetonRdv}`,
          ]
        : []),
    ]);
  }

  for (const c of [
    "/admin/demandes",
    "/admin",
    "/admin/semaine",
    "/admin/patients",
  ]) {
    revalidatePath(c);
  }
  synchroniserApres();
}

/**
 * Inscription sur la liste d'attente, quand les nouveaux patients ne sont pas
 * acceptés. Rien de clinique : un nom, un téléphone, une adresse facultative et
 * un mot. Même garde-fous que la demande de rendez-vous, sans adresse IP
 * stockée.
 */
export async function rejoindreListeAttente(
  _etat: ResultatRdv,
  f: FormData,
): Promise<ResultatRdv> {
  const firstName = texte(f, "firstName");
  const lastName = texte(f, "lastName");
  const phone = texte(f, "phone");
  const email = texte(f, "email");
  if (!firstName || !lastName || !phone) {
    return { ok: false, message: "Nom, prénom et téléphone sont nécessaires." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, message: "L’adresse électronique n’est pas valable." };
  }

  const unJour = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const uneHeure = new Date(Date.now() - 60 * 60 * 1000);
  const [parNumero, total] = await Promise.all([
    prisma.attenteRdv.count({ where: { phone, createdAt: { gte: unJour } } }),
    prisma.attenteRdv.count({ where: { createdAt: { gte: uneHeure } } }),
  ]);
  if (parNumero >= 1) {
    return {
      ok: true,
      message:
        "Vous êtes déjà sur la liste d’attente. Inutile de vous inscrire à nouveau.",
    };
  }
  if (total >= MAX_PAR_HEURE) {
    return {
      ok: false,
      message:
        "Le formulaire reçoit un nombre inhabituel de demandes. Réessayez plus tard, ou téléphonez.",
    };
  }

  await prisma.attenteRdv.create({
    data: {
      firstName,
      lastName,
      phone,
      email: email ? email.toLowerCase() : null,
      message: texte(f, "message") || null,
    },
  });
  revalidatePath("/admin/demandes");
  prevenirAmandine(
    `Liste d’attente : ${firstName} ${lastName}`,
    [
      `${firstName} ${lastName} s’est inscrit(e) sur la liste d’attente.`,
      `Téléphone : ${phone}`,
      "",
      `Voir : ${URL_SITE}/admin/demandes`,
    ].join("\n"),
    email || undefined,
  );
  return {
    ok: true,
    message:
      "Vous êtes sur la liste d’attente. Je vous rappellerai si une place se libère.",
  };
}

/** Classer une personne de la liste d'attente (rappelée, ou plus d'actualité). */
export async function classerAttente(f: FormData) {
  await exigerSession();
  const id = texte(f, "id");
  if (!id) return;
  await prisma.attenteRdv.update({ where: { id }, data: { active: false } });
  revalidatePath("/admin/demandes");
}
