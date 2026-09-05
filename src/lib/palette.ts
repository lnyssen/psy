/**
 * Palette des lieux.
 *
 * Chaque teinte porte trois valeurs, et c'est la raison d'être de ce fichier :
 *
 * - `vividHex`, la couleur vive, pour les filets et les pastilles — tout ce qui
 *   ne porte pas de texte. C'est elle qu'on voit et qui identifie le lieu.
 * - `colorHex`, une version foncée du même ton, pour le texte. Contrainte par
 *   le contraste, elle est forcément plus sourde.
 * - `fillHex`, l'aplat sur lequel ce texte se pose.
 *
 * Les avoir confondues rendait la palette terne : une seule couleur devait à la
 * fois claquer et rester lisible en corps de dix points, ce qu'aucune couleur
 * ne fait. Les séparer libère les vives.
 *
 * Chaque entrée est vérifiée sur ses deux usages textuels — texte sur le fond
 * de page, texte sur son propre aplat — et tenue à au moins 25° de teinte des
 * couleurs qui portent déjà du sens : le dû, le payé, le retard, le violet de
 * marque. Le fuchsia, essayé, a été écarté : 23° du violet, il s'y confondait.
 */
export type TeinteCabinet = {
  cle: string;
  nom: string;
  vividHex: string;
  colorHex: string;
  fillHex: string;
  /** Pire des deux rapports de contraste mesurés. */
  contraste: number;
};

export const PALETTE_CABINETS: TeinteCabinet[] = [
  { cle: "cyan", nom: "Cyan", vividHex: "#00C8D4", colorHex: "#056A73", fillHex: "#C6F4F8", contraste: 5.34 },
  { cle: "magenta", nom: "Magenta", vividHex: "#FF2D8F", colorHex: "#A8005A", fillHex: "#FFD6EA", contraste: 5.71 },
  { cle: "electrique", nom: "Électrique", vividHex: "#2B6BFF", colorHex: "#1A45B8", fillHex: "#D9E4FF", contraste: 6.37 },
  { cle: "azur", nom: "Azur", vividHex: "#00A3FF", colorHex: "#00588F", fillHex: "#CCEBFF", contraste: 6.05 },
  { cle: "turquoise", nom: "Turquoise", vividHex: "#00D9B0", colorHex: "#00695C", fillHex: "#C7F7EE", contraste: 5.66 },
  { cle: "rose", nom: "Rose", vividHex: "#FF5FB8", colorHex: "#B01372", fillHex: "#FFDCF0", contraste: 5.26 },
  { cle: "lime", nom: "Lime", vividHex: "#9BE000", colorHex: "#4F6B00", fillHex: "#ECF9C6", contraste: 5.51 },
];

export function teintePar(colorHex: string) {
  return PALETTE_CABINETS.find((t) => t.colorHex.toLowerCase() === colorHex.toLowerCase());
}
