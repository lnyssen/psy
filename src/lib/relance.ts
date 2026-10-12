import { prisma } from "@/lib/db";
import { euros, fmtDateCourte, isBillable, nomComplet } from "@/lib/format";
import { montantSeanceCents, payeurDe } from "@/lib/tarifs";
import { SITE } from "@/lib/site";

export type Relance = {
  patientId: string;
  nom: string;
  /** Les adresses connues de la famille : parents d'abord, puis le patient. */
  adresses: string[];
  telephone: string | null;
  seances: { date: string; montant: string }[];
  total: string;
  /** Ancienneté de la plus vieille séance impayée, en jours. */
  depuisJours: number;
};

/**
 * Tout ce que chaque patient privé doit encore, regroupé par famille, quels que
 * soient les filtres de la table de facturation : une relance qui oublierait la
 * séance d'un autre cabinet serait à refaire. La plus ancienne d'abord.
 */
export async function relancesImpayees(patientId?: string): Promise<Relance[]> {
  const impayees = (
    await prisma.session.findMany({
      where: {
        patientId: patientId ?? { not: null },
        status: { in: ["ATTENDED", "NO_SHOW"] },
        paymentStatus: { not: "PAID" },
        patient: { scheme: "PRIVE" },
      },
      include: { patient: { include: { tarif: true } } },
    })
  ).filter(
    (s) =>
      s.patient !== null &&
      isBillable(s.status) &&
      payeurDe(s.patient.scheme) === "PATIENT",
  );
  const parPatient = new Map<string, typeof impayees>();
  for (const s of impayees) {
    const liste = parPatient.get(s.patientId!) ?? [];
    liste.push(s);
    parPatient.set(s.patientId!, liste);
  }
  const maintenant = Date.now();
  return [...parPatient.values()]
    .map((liste) => {
      liste.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
      const p = liste[0].patient!;
      const montant = (s: (typeof liste)[number]) =>
        s.amountCents ?? montantSeanceCents(s.patient) ?? 0;
      const relance: Relance = {
        patientId: p.id,
        nom: nomComplet(p),
        adresses: [
          ...new Set(
            [p.emailMother, p.emailFather, p.email].filter((e): e is string => !!e),
          ),
        ],
        telephone: p.phoneMother ?? p.phoneFather ?? p.phone,
        seances: liste.map((s) => ({
          date: fmtDateCourte.format(s.startsAt),
          montant: euros(montant(s)),
        })),
        total: euros(liste.reduce((n, s) => n + montant(s), 0)),
        depuisJours: Math.floor(
          (maintenant - liste[0].startsAt.getTime()) / (24 * 3600 * 1000),
        ),
      };
      return { relance, depuis: liste[0].startsAt.getTime() };
    })
    .sort((a, b) => a.depuis - b.depuis)
    .map((x) => x.relance);
}

/** Texte de la relance : le même pour l'e-mail, le message WhatsApp et l'envoi. */
export function texteRelance(r: Relance, iban: string | null) {
  return [
    "Bonjour,",
    "",
    `Sauf erreur de ma part, ${r.seances.length > 1 ? "les séances suivantes" : "la séance suivante"} de ${r.nom} ${
      r.seances.length > 1 ? "restent" : "reste"
    } à régler :`,
    "",
    ...r.seances.map((s) => `- ${s.date} : ${s.montant}`),
    "",
    `Total : ${r.total}`,
    ...(iban
      ? ["", `Vous pouvez effectuer le virement sur le compte ${iban}, en mentionnant le nom de ${r.nom}.`]
      : []),
    "",
    "Si le paiement a déjà été fait, merci de ne pas tenir compte de ce message.",
    "",
    "Bien à vous,",
    SITE.nom,
  ].join("\n");
}

export const sujetRelance = (r: Relance) => `Séances à régler : ${r.nom}`;
