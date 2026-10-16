import { describe, expect, it } from "vitest";
import { ACCENTS, CLES_ACCENT, accentValide, cssAccent } from "@/lib/accent";

function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe("palette d'accent", () => {
  it.each(CLES_ACCENT)("%s : lisible en thème clair", (cle) => {
    const t = ACCENTS[cle].clair;
    expect(contraste("#ffffff", t.accent), "blanc sur le bouton").toBeGreaterThanOrEqual(4.5);
    expect(contraste("#ffffff", t.hover), "blanc sur le survol").toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.text, "#faf8f5"), "texte d'accent sur blanc").toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.text, t.soft), "texte d'accent sur fond doux").toBeGreaterThanOrEqual(4.5);
  });

  it.each(CLES_ACCENT)("%s : lisible en thème sombre", (cle) => {
    const t = ACCENTS[cle].sombre;
    expect(contraste(t.text, t.soft), "texte d'accent sur fond doux").toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.text, "#16141c"), "texte d'accent sur le fond sombre").toBeGreaterThanOrEqual(4.5);
  });

  it("retombe sur le violet pour une clé inconnue ou absente", () => {
    expect(accentValide("rose")).toBe("rose");
    expect(accentValide("fuchsia")).toBe("violet");
    expect(accentValide(null)).toBe("violet");
    expect(accentValide(undefined)).toBe("violet");
  });

  it("produit du CSS pour les deux thèmes", () => {
    const css = cssAccent("bleu");
    expect(css).toContain("html:root{");
    expect(css).toContain('html:root[data-theme="dark"]{');
    expect(css).toContain(ACCENTS.bleu.clair.accent);
    expect(css).toContain(ACCENTS.bleu.sombre.accent);
  });
});
