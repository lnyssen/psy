/**
 * Palette des cabinets.
 *
 * Une liste fermée plutôt qu'un sélecteur de couleur libre : un choix libre
 * produirait tôt ou tard un cabinet illisible, ou d'une teinte confondue avec
 * un état de paiement. Chaque entrée a été vérifiée sur ses trois usages —
 * texte sur le fond de page, texte sur son propre aplat, blanc sur la couleur
 * pleine — et tenue à au moins 47° de teinte des couleurs qui portent déjà du
 * sens : le dû, le payé, le retard et le violet de marque.
 *
 * Trois teintes ont été essayées puis écartées, et il vaut mieux le noter que
 * de les réessayer plus tard : l'indigo (24° du violet), l'aubergine (6°) et la
 * brique (5° du rouge « en retard »). Elles passaient toutes le contraste ;
 * c'est leur teinte qui les disqualifiait.
 *
 * Une limite à connaître : au-delà de quatre ou cinq lieux, la couleur cesse
 * d'être ce qui les distingue — l'œil ne tient pas dix teintes en mémoire. Le
 * nom du lieu, écrit partout à côté de sa couleur, reste alors le seul repère
 * fiable. C'est pourquoi il n'est jamais omis.
 */
export type TeinteCabinet = {
  cle: string;
  nom: string;
  colorHex: string;
  fillHex: string;
  /** Pire des trois rapports de contraste mesurés. */
  contraste: number;
};

export const PALETTE_CABINETS: TeinteCabinet[] = [
  { cle: "teal", nom: "Teal", colorHex: "#0B7285", fillHex: "#E0F1F3", contraste: 4.8 },
  { cle: "pourpre", nom: "Pourpre", colorHex: "#A61E78", fillHex: "#FBE4F2", contraste: 5.68 },
  { cle: "bleu", nom: "Bleu", colorHex: "#1B4F9C", fillHex: "#E5ECF8", contraste: 6.69 },
  { cle: "ardoise", nom: "Ardoise", colorHex: "#3F4A57", fillHex: "#ECEEF1", contraste: 7.76 },
  { cle: "cyan", nom: "Cyan", colorHex: "#0E6E9E", fillHex: "#E2EFF6", contraste: 4.79 },
  { cle: "turquoise", nom: "Turquoise", colorHex: "#0F766E", fillHex: "#DFF1EE", contraste: 4.68 },
  { cle: "marine", nom: "Marine", colorHex: "#1E3A6E", fillHex: "#E5E9F2", contraste: 9.16 },
  { cle: "prune", nom: "Prune", colorHex: "#6B2D6B", fillHex: "#F2E6F2", contraste: 7.85 },
  { cle: "framboise", nom: "Framboise", colorHex: "#B5195C", fillHex: "#FCE4EE", contraste: 5.36 },
  { cle: "olive", nom: "Olive", colorHex: "#55631C", fillHex: "#EEF1DF", contraste: 5.74 },
];

export function teintePar(colorHex: string) {
  return PALETTE_CABINETS.find((t) => t.colorHex.toLowerCase() === colorHex.toLowerCase());
}
