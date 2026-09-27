import type { SessionStatus } from "@prisma/client";
import { isBillable, partiesJour } from "@/lib/format";

/**
 * Plafonds INAMI de la convention de psychologie de première ligne.
 *
 * Une séance remboursée par jour, huit par année civile et par patient — vingt
 * pour les 16-25 ans. Valeurs en vigueur en 2026 ; l'INAMI les révise de temps
 * à autre, à vérifier avec le réseau de santé mentale (107Bru pour Bruxelles)
 * si un patient approche la limite et que le montant semble faux.
 */
export const PLAFOND_CONVENTIONNE = 8;
export const PLAFOND_CONVENTIONNE_JEUNE = 20;
const AGE_JEUNE_MIN = 16;
const AGE_JEUNE_MAX = 25;

/** Âge atteint à la date donnée — par défaut aujourd'hui. */
export function ageAu(naissance: Date, date: Date = new Date()) {
  let age = date.getFullYear() - naissance.getFullYear();
  const avantAnniversaire =
    date.getMonth() < naissance.getMonth() ||
    (date.getMonth() === naissance.getMonth() && date.getDate() < naissance.getDate());
  if (avantAnniversaire) age -= 1;
  return age;
}

/** Le plafond annuel qui s'applique à ce patient, selon son âge à la date
 *  donnée. Un patient sans date de naissance connue reçoit le plafond de
 *  droit commun — le signaler comme un cas à compléter plutôt que de risquer
 *  de sous-compter silencieusement. */
export function plafondConventionne(naissance: Date | null, date: Date = new Date()) {
  if (!naissance) return PLAFOND_CONVENTIONNE;
  const age = ageAu(naissance, date);
  return age >= AGE_JEUNE_MIN && age <= AGE_JEUNE_MAX
    ? PLAFOND_CONVENTIONNE_JEUNE
    : PLAFOND_CONVENTIONNE;
}

/** Nombre de séances facturables d'un patient conventionné pour l'année
 *  civile donnée — la grandeur que compte l'INAMI, pas les séances à venir ni
 *  les annulations. */
export function seancesConventionneAnnee<T extends { status: SessionStatus; startsAt: Date }>(
  seances: T[],
  annee: number,
) {
  return seances.filter((s) => isBillable(s.status) && partiesJour(s.startsAt).annee === annee)
    .length;
}

/**
 * Total d'heures facturables d'un ensemble de séances sur une semaine — sert
 * à surveiller le plafond d'un lieu facturé à un établissement (l'école,
 * vingt-quatre heures). Contrairement à heuresTotales, une séance annulée à
 * temps n'occupe pas le fauteuil et une absence non excusée si : c'est le même
 * calcul que la facturation, pas celui de l'agenda.
 */
export function heuresFacturablesSemaine<T extends { status: SessionStatus; durationMin: number }>(
  seances: T[],
) {
  return (
    seances.filter((s) => isBillable(s.status)).reduce((n, s) => n + s.durationMin, 0) / 60
  );
}
