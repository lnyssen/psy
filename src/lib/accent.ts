/**
 * Couleurs d'accent proposables dans Réglages › Apparence.
 *
 * Une palette plutôt qu'un sélecteur libre, parce que l'accent porte du texte et
 * des boutons : une couleur au hasard peut rendre un libellé illisible. Chaque
 * teinte a ses quatre valeurs (le fond d'un bouton, son survol, la couleur d'un
 * texte ou d'un lien, un fond doux) dans les deux thèmes, et chacune est
 * vérifiée :
 *   clair  — blanc sur l'accent ≥ 4,5:1 ; blanc sur le survol ≥ 6:1 ;
 *            texte d'accent sur le papier ≥ 7:1 et sur le fond doux ≥ 6,5:1 ;
 *            bleu nuit sur la bande du site ≥ 9:1.
 *   sombre — texte sombre sur l'accent ≥ 5:1 ; texte d'accent sur les fonds ≥ 7:1.
 * Le violet est la couleur de marque, telle qu'elle était avant ce réglage.
 *
 * Ce qui ne change jamais : les couleurs des cabinets et des états de paiement
 * (vert payé, ambre dû, rouge en retard), qui ont un sens. Une teinte proche de
 * l'une d'elles peut s'y confondre : c'est dit à l'écran.
 */
export type TeinteAccent = { accent: string; hover: string; text: string; soft: string };

export const ACCENTS = {
  violet: {
    nom: "Violet",
    clair: { accent: "#7f00ff", hover: "#6b00d6", text: "#6002be", soft: "#f1e6fe", bande: "#d3d3ff" },
    sombre: { accent: "#a566ff", hover: "#b583ff", text: "#c39bff", soft: "#2a1d45" },
  },
  indigo: {
    nom: "Indigo",
    clair: { accent: "#585de4", hover: "#353bde", text: "#3137dd", soft: "#eaebfb", bande: "#d2d3f4" },
    sombre: { accent: "#7b7ee8", hover: "#9da0ee", text: "#a4a6ef", soft: "#181a39" },
  },
  bleu: {
    nom: "Bleu",
    clair: { accent: "#0a70e6", hover: "#085dbf", text: "#0751a6", soft: "#e8f2fd", bande: "#d2e2f4" },
    sombre: { accent: "#328aee", hover: "#589ff1", text: "#74b0f4", soft: "#182839" },
  },
  turquoise: {
    nom: "Turquoise",
    clair: { accent: "#03817d", hover: "#025a57", text: "#025c59", soft: "#e7fdfc", bande: "#d2f4f3" },
    sombre: { accent: "#29a39f", hover: "#31c4bf", text: "#30c0bb", soft: "#183938" },
  },
  vert: {
    nom: "Vert",
    clair: { accent: "#1f8449", hover: "#176337", text: "#165f35", soft: "#ebf9f1", bande: "#d2f4e0" },
    sombre: { accent: "#349b5f", hover: "#3eba71", text: "#47c27a", soft: "#183926" },
  },
  rose: {
    nom: "Rose",
    clair: { accent: "#db1f70", hover: "#b71a5e", text: "#9e1751", soft: "#fbeaf1", bande: "#f4d2e1" },
    sombre: { accent: "#e65393", hover: "#ec77a9", text: "#ef8fb9", soft: "#391827" },
  },
  corail: {
    nom: "Corail",
    clair: { accent: "#cf4217", hover: "#aa3613", text: "#973011", soft: "#fbede9", bande: "#f4dad2" },
    sombre: { accent: "#e85d33", hover: "#ec7a57", text: "#f09478", soft: "#392018" },
  },
  ardoise: {
    nom: "Ardoise",
    clair: { accent: "#5b75a2", hover: "#4c6287", text: "#415474", soft: "#eff1f5", bande: "#dbe1eb" },
    sombre: { accent: "#728ab3", hover: "#8da0c1", text: "#9daeca", soft: "#1d2635" },
  },
} as const satisfies Record<
  string,
  { nom: string; clair: TeinteAccent & { bande: string }; sombre: TeinteAccent }
>;

export type CleAccent = keyof typeof ACCENTS;
export const CLES_ACCENT = Object.keys(ACCENTS) as CleAccent[];
export const ACCENT_PAR_DEFAUT: CleAccent = "violet";

/** Une clé inconnue ou absente retombe sur le violet : jamais d'écran sans accent. */
export function accentValide(cle: string | null | undefined): CleAccent {
  return cle && cle in ACCENTS ? (cle as CleAccent) : ACCENT_PAR_DEFAUT;
}

/**
 * Les variables d'accent d'une teinte, en CSS. `html:root` est plus spécifique
 * que le `:root` de globals.css : la règle l'emporte sans dépendre de l'ordre
 * des feuilles. La bande du site (lavande) ne change pas d'un thème à l'autre,
 * comme dans globals.css ; le texte posé dessus reste bleu nuit.
 */
export function cssAccent(cle: CleAccent) {
  const { clair, sombre } = ACCENTS[cle];
  return (
    `html:root{--color-accent:${clair.accent};--color-accent-hover:${clair.hover};--color-accent-text:${clair.text};--color-accent-soft:${clair.soft};--color-bande-violette:${clair.bande}}` +
    `html:root[data-theme="dark"]{--color-accent:${sombre.accent};--color-accent-hover:${sombre.hover};--color-accent-text:${sombre.text};--color-accent-soft:${sombre.soft}}`
  );
}
