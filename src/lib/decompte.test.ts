import { describe, expect, it } from "vitest";
import { montantDecompteCents, nombreSaisi } from "@/lib/decompte";

describe("montantDecompteCents", () => {
  it("multiplie la durée par le tarif horaire", () => {
    expect(montantDecompteCents(2, 0, 55)).toBe(11000);
    expect(montantDecompteCents(3, 30, 55)).toBe(19250);
    expect(montantDecompteCents(0, 45, 60)).toBe(4500);
  });

  it("arrondit au centime comme le serveur : tarif d'abord, puis durée", () => {
    // 20 min à 55,55 € : 5555 c × 1/3 = 1851,67 → 1852.
    expect(montantDecompteCents(0, 20, 55.55)).toBe(1852);
  });

  it("rend null sans durée ou sans tarif (le montant se saisit alors à la main)", () => {
    expect(montantDecompteCents(0, 0, 55)).toBeNull();
    expect(montantDecompteCents(2, 0, 0)).toBeNull();
    expect(montantDecompteCents(NaN, 0, 55)).toBeNull();
    expect(montantDecompteCents(2, 0, NaN)).toBeNull();
    expect(montantDecompteCents(-1, 0, 55)).toBeNull();
  });
});

describe("nombreSaisi", () => {
  it("accepte la virgule et le point, et rend NaN pour un champ vide", () => {
    expect(nombreSaisi("55,5")).toBe(55.5);
    expect(nombreSaisi(" 55.5 ")).toBe(55.5);
    expect(nombreSaisi("")).toBeNaN();
    expect(nombreSaisi("abc")).toBeNaN();
  });
});
