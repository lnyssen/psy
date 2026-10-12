import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  courrielConfigure,
  creneauEnClair,
  envoyerCourriel,
} from "@/lib/courriel";
import { instantBruxelles, partiesJour } from "@/lib/format";
import { SITE } from "@/lib/site";

/**
 * Messages envoyés aux patients : confirmation d'un rendez-vous, rappel de la
 * veille, et le lien qui permet d'annuler ou de déplacer.
 *
 * Rien de clinique n'y figure : un créneau, un lieu, un prénom. L'e-mail n'est
 * pas chiffré de bout en bout, il ne doit transporter que de la logistique.
 */

/** Adresse publique de l'outil, pour les liens des e-mails. */
const URL_SITE = process.env.SITE_URL || "https://amandinemonsel.be";

/** Au-delà de ce délai avant la séance, le patient annule seul ; en deçà, il
 *  téléphone. C'est la règle affichée sur la page Questions du site. */
export const DELAI_ANNULATION_H = 24;

/**
 * Lien public d'une séance (annulation, report). Le jeton est propre à la
 * séance et créé à la demande : il ne donne accès à rien d'autre qu'à elle.
 */
export async function lienSeance(seanceId: string) {
  const s = await prisma.session.findUnique({
    where: { id: seanceId },
    select: { jetonPublic: true },
  });
  let jeton = s?.jetonPublic;
  if (!jeton) {
    jeton = randomBytes(24).toString("base64url");
    await prisma.session.update({
      where: { id: seanceId },
      data: { jetonPublic: jeton },
    });
  }
  return `${URL_SITE}/rendez-vous/seance/${jeton}`;
}

type Destinataires = {
  email: string | null;
  emailMother: string | null;
  emailFather: string | null;
  firstName: string;
};

/** Le patient s'il a une adresse ; sinon ses parents, qui sont ceux qu'on
 *  joint pour un enfant. Une adresse n'apparaît qu'une fois. */
export function destinatairesDe(p: Destinataires) {
  const adresses = p.email ? [p.email] : [p.emailMother, p.emailFather];
  return [
    ...new Set(
      adresses
        .filter((a): a is string => Boolean(a))
        .map((a) => a.toLowerCase()),
    ),
  ];
}

function lieu(
  c: { nom: string; addressLine: string; postalCode: string; city: string },
  visio: boolean,
) {
  return visio
    ? "en visio (le lien vous sera communiqué)"
    : `${c.nom}, ${c.addressLine}, ${c.postalCode} ${c.city}`;
}

type SeanceMail = {
  id: string;
  startsAt: Date;
  visio: boolean;
  cabinet: {
    nom: string;
    addressLine: string;
    postalCode: string;
    city: string;
  };
  patient: Destinataires;
};

function corps(ligneIntro: string, s: SeanceMail, lien: string) {
  return [
    s.patient.email ? `Bonjour ${s.patient.firstName},` : "Bonjour,",
    "",
    ligneIntro,
    "",
    `${creneauEnClair(s.startsAt)}`,
    `Lieu : ${lieu(s.cabinet, s.visio)}`,
    "",
    `Pour annuler ou déplacer ce rendez-vous, jusqu’à ${DELAI_ANNULATION_H} heures avant : ${lien}`,
    `Passé ce délai, merci de me joindre au ${SITE.telephone}.`,
    "",
    "Ce message est automatique : pour toute question, répondez-y ou appelez-moi.",
    "",
    SITE.nom,
    SITE.telephone,
  ].join("\n");
}

/** Confirmation d'un rendez-vous pris par le patient avec son lien personnel. */
export async function envoyerConfirmation(seanceId: string) {
  if (!courrielConfigure()) return;
  const s = await prisma.session.findUnique({
    where: { id: seanceId },
    include: { cabinet: true, patient: true },
  });
  if (!s?.patient || !s.patient.rappelsEmail) return;
  const dest = destinatairesDe(s.patient);
  if (dest.length === 0) return;
  const lien = await lienSeance(s.id);
  const m = { ...s, patient: s.patient };
  for (const a of dest) {
    await envoyerCourriel({
      a,
      sujet: "Votre rendez-vous est confirmé",
      texte: corps("Votre rendez-vous est confirmé :", m, lien),
      repondreA: SITE.email,
    });
  }
}

function jourIso(annee: number, mois: number, jour: number) {
  return `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

/** Bornes de « demain » à Bruxelles, en instants absolus. */
export function fenetreDemain(maintenant: Date) {
  const { annee, mois, jour } = partiesJour(maintenant);
  const demain = new Date(Date.UTC(annee, mois - 1, jour + 1));
  const apres = new Date(Date.UTC(annee, mois - 1, jour + 2));
  const iso = (d: Date) =>
    jourIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  return {
    debut: instantBruxelles(iso(demain), "00:00")!,
    fin: instantBruxelles(iso(apres), "00:00")!,
  };
}

/**
 * Rappel de la veille : chaque séance de demain, une seule fois. Lancé par la
 * tâche quotidienne de 05 h — les rendez-vous de demain sont donc rappelés
 * environ vingt-quatre heures avant.
 */
export async function envoyerRappels(maintenant = new Date()) {
  if (!courrielConfigure())
    return { configure: false, envoyes: 0, sansAdresse: 0 };

  const { debut, fin } = fenetreDemain(maintenant);
  const seances = await prisma.session.findMany({
    where: {
      status: "SCHEDULED",
      startsAt: { gte: debut, lt: fin },
      rappelEnvoyeAt: null,
      patient: { is: { rappelsEmail: true, anonymiseAt: null } },
    },
    include: { cabinet: true, patient: true },
    orderBy: { startsAt: "asc" },
  });

  let envoyes = 0;
  let sansAdresse = 0;
  for (const s of seances) {
    if (!s.patient) continue;
    const dest = destinatairesDe(s.patient);
    if (dest.length === 0) {
      sansAdresse += 1;
      continue;
    }
    const lien = await lienSeance(s.id);
    const m = { ...s, patient: s.patient };
    let parti = false;
    for (const a of dest) {
      const ok = await envoyerCourriel({
        a,
        sujet: "Rappel : rendez-vous demain",
        texte: corps("Un rappel pour votre rendez-vous de demain :", m, lien),
        repondreA: SITE.email,
      });
      parti = parti || ok;
    }
    if (parti) {
      await prisma.session.update({
        where: { id: s.id },
        data: { rappelEnvoyeAt: new Date() },
      });
      envoyes += 1;
    }
  }
  return { configure: true, envoyes, sansAdresse };
}
