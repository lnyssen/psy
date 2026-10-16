/**
 * Où en est un patient conventionné de son plafond INAMI sur douze mois.
 * Les seuils (60 % et 80 %) sont ceux que la jauge repère : à 60 %, il est
 * temps d'en parler ; à 80 %, de décider de la suite (nouvelle prescription,
 * fin de suivi, passage au privé).
 */
export type NiveauQuota = "ok" | "attention" | "proche" | "atteint";

export const SEUIL_ATTENTION = 0.6;
export const SEUIL_PROCHE = 0.8;

export function niveauQuota(utilisees: number, plafond: number): NiveauQuota {
  if (plafond <= 0) return "ok";
  if (utilisees >= plafond) return "atteint";
  const part = utilisees / plafond;
  if (part >= SEUIL_PROCHE) return "proche";
  if (part >= SEUIL_ATTENTION) return "attention";
  return "ok";
}

/** Part remplie, bornée à 0–100, en pourcentage entier. */
export function partQuota(utilisees: number, plafond: number) {
  if (plafond <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((utilisees / plafond) * 100)));
}

/** Ce que dit la jauge en toutes lettres : la couleur seule ne porte jamais le sens. */
export function texteQuota(utilisees: number, plafond: number) {
  const reste = plafond - utilisees;
  switch (niveauQuota(utilisees, plafond)) {
    case "atteint":
      return utilisees > plafond
        ? `Plafond dépassé de ${utilisees - plafond} séance${utilisees - plafond > 1 ? "s" : ""}`
        : "Plafond atteint";
    case "proche":
      return `Bientôt le plafond : plus que ${reste} séance${reste > 1 ? "s" : ""}`;
    case "attention":
      return `Plus de 60 % utilisés : ${reste} séance${reste > 1 ? "s" : ""} restante${reste > 1 ? "s" : ""}`;
    default:
      return `${reste} séance${reste > 1 ? "s" : ""} restante${reste > 1 ? "s" : ""}`;
  }
}
