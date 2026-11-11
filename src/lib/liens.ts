/**
 * Lien d'un responsable avec le patient. Les deux emplacements de la fiche
 * s'appellent encore mother… et father… en base (colonnes historiques), mais
 * chacun porte le lien qu'on lui donne : deux mères, un tuteur, une famille
 * d'accueil se saisissent comme les autres.
 */
export const LIENS = [
  "mère",
  "père",
  "belle-mère",
  "beau-père",
  "tuteur ou tutrice",
  "grand-parent",
  "famille d’accueil",
  "autre",
] as const;

export const LIEN_PAR_DEFAUT_1 = "mère";
export const LIEN_PAR_DEFAUT_2 = "père";

/** Valeur saisie → lien connu, sinon la valeur par défaut de l'emplacement. */
export function lienValide(v: unknown, parDefaut: string): string {
  return typeof v === "string" && (LIENS as readonly string[]).includes(v) ? v : parDefaut;
}

/** « Mère », « Tuteur ou tutrice » : la majuscule pour un intitulé. */
export function intitule(lien: string): string {
  return lien.charAt(0).toUpperCase() + lien.slice(1);
}
