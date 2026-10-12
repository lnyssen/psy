/**
 * Absences non excusées d'un patient sur les douze derniers mois, comptées
 * comme la page Statistiques : l'absence facturée (NO_SHOW) et celle qu'Amandine
 * a choisi de ne pas réclamer (NO_SHOW_ANNULE) sont toutes deux des absences.
 * Une annulation dans les temps n'en est pas une.
 */
export const SEUIL_ABSENCES = 2;

export function compterAbsences(
  seances: { status: string; startsAt: Date }[],
  maintenant = new Date(),
) {
  const limite = maintenant.getTime() - 365 * 24 * 3600 * 1000;
  return seances.filter(
    (s) =>
      (s.status === "NO_SHOW" || s.status === "NO_SHOW_ANNULE") &&
      s.startsAt.getTime() >= limite &&
      s.startsAt.getTime() <= maintenant.getTime(),
  ).length;
}
