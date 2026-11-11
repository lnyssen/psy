import type { CareScheme } from "@prisma/client";

/**
 * Montant d'une séance et qui le règle.
 *
 * Deux régimes, deux sens du même chiffre :
 *
 * - PRIVE : c'est ce que le patient paie ;
 * - CONVENTIONNE (psychologue de première ligne) : c'est ce que reçoit
 *   Amandine de l'INAMI. Le patient, lui, ne paie rien.
 *
 * D'où le test de `payeurDe` à chaque endroit qui parle d'argent « dû » : un
 * séance conventionnée n'est jamais une dette du patient.
 */
export type PatientTarifie = {
  scheme: CareScheme;
  /** Ancien montant libre, d'avant la grille de tarifs. */
  feeCents: number | null;
  tarif?: { amountCents: number } | null;
};

export type Payeur = "PATIENT" | "INAMI";

export function payeurDe(scheme: CareScheme): Payeur {
  return scheme === "CONVENTIONNE" ? "INAMI" : "PATIENT";
}

/** Le tarif choisi dans la grille fait foi ; l'ancien montant libre ne sert que
 *  tant qu'aucun tarif n'a été choisi. Null : aucun montant connu. */
export function montantSeanceCents(p: PatientTarifie | null | undefined): number | null {
  if (!p) return null;
  return p.tarif?.amountCents ?? p.feeCents ?? null;
}

/** Libellé d'un état de paiement, selon qui paie : le patient « doit », l'INAMI
 *  est « à recevoir ». */
export function libellePaiement(
  etat: "DUE" | "PAID" | "OVERDUE",
  payeur: Payeur,
): string {
  if (payeur === "INAMI") {
    return { DUE: "à recevoir", PAID: "reçu", OVERDUE: "en retard" }[etat];
  }
  return { DUE: "dû", PAID: "payé", OVERDUE: "en retard" }[etat];
}

export type EtatPaiement = "DUE" | "PAID" | "OVERDUE";

/**
 * L'état de paiement tel qu'on l'affiche. « En retard » n'est jamais écrit en
 * base : une séance privée encore due le devient d'elle-même passé le délai
 * réglé (Réglages > Identité et facturation). Le stocker voudrait dire une
 * tâche planifiée pour le poser, et un chiffre faux le jour où elle ne passe
 * pas. L'INAMI n'est jamais « en retard » ici : ses délais ne dépendent pas
 * du patient.
 */
export function etatPaiement(
  s: { paymentStatus: EtatPaiement; startsAt: Date },
  payeur: Payeur,
  retardJours: number,
  maintenant: Date = new Date(),
): EtatPaiement {
  if (s.paymentStatus !== "DUE" || payeur !== "PATIENT") return s.paymentStatus;
  const limite = maintenant.getTime() - retardJours * 24 * 3600 * 1000;
  return s.startsAt.getTime() < limite ? "OVERDUE" : "DUE";
}
