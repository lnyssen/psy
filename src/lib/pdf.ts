import { rgb } from "pdf-lib";

/**
 * Charte commune aux documents PDF (facture à un établissement, reçu à un
 * patient) — mêmes couleurs, mêmes proportions, pour qu'ouvrir l'un après
 * l'autre ne dépayse pas. Un seul endroit à corriger si la charte change.
 */
export const PDF_COULEUR = {
  /// Encre du texte courant — proche de --color-ink, mais un peu plus sombre :
  /// à cette taille de police, une encre pâle se lit gris avant de se lire
  /// bleu.
  encre: rgb(0.09, 0.07, 0.3),
  /// Nom des tiers et montants qui comptent — le même violet que l'accent du
  /// site, pour qu'un document imprimé reste reconnaissable.
  violet: rgb(0.498, 0, 1),
  /// Libellés et mentions secondaires.
  gris: rgb(0.42, 0.42, 0.5),
  /// Filets.
  filet: rgb(0.82, 0.8, 0.88),
};

export const PDF_MARGE = 56;
export const PDF_LARGEUR = 595.28;
export const PDF_HAUTEUR = 841.89;
export const PDF_CONTENU = PDF_LARGEUR - 2 * PDF_MARGE;
