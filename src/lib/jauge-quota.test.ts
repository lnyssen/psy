import { describe, expect, it } from "vitest";
import { niveauQuota, partQuota, texteQuota } from "@/lib/jauge-quota";

describe("niveauQuota", () => {
  it("franchit les repères à 60 % et à 80 %", () => {
    // Plafond de 10 : 5 = 50 %, 6 = 60 %, 7 = 70 %, 8 = 80 %, 10 = 100 %.
    expect(niveauQuota(5, 10)).toBe("ok");
    expect(niveauQuota(6, 10)).toBe("attention");
    expect(niveauQuota(7, 10)).toBe("attention");
    expect(niveauQuota(8, 10)).toBe("proche");
    expect(niveauQuota(9, 10)).toBe("proche");
    expect(niveauQuota(10, 10)).toBe("atteint");
    expect(niveauQuota(12, 10)).toBe("atteint");
  });

  it("suit le plafond de 8 des adultes en soutien", () => {
    // 8 : 4/8 = 50 %, 5/8 = 62,5 %, 7/8 = 87,5 %.
    expect(niveauQuota(4, 8)).toBe("ok");
    expect(niveauQuota(5, 8)).toBe("attention");
    expect(niveauQuota(7, 8)).toBe("proche");
    expect(niveauQuota(8, 8)).toBe("atteint");
  });

  it("ne plante pas sans plafond", () => {
    expect(niveauQuota(3, 0)).toBe("ok");
    expect(partQuota(3, 0)).toBe(0);
  });
});

describe("partQuota", () => {
  it("rend un pourcentage entier, borné à 100", () => {
    expect(partQuota(4, 10)).toBe(40);
    expect(partQuota(1, 3)).toBe(33);
    expect(partQuota(15, 10)).toBe(100);
    expect(partQuota(-1, 10)).toBe(0);
  });
});

describe("texteQuota", () => {
  it("dit la situation en mots, avec les bons pluriels", () => {
    expect(texteQuota(4, 10)).toBe("6 séances restantes");
    expect(texteQuota(7, 8)).toBe("Bientôt le plafond : plus que 1 séance");
    expect(texteQuota(8, 10)).toBe("Bientôt le plafond : plus que 2 séances");
    expect(texteQuota(6, 10)).toBe("Plus de 60 % utilisés : 4 séances restantes");
    expect(texteQuota(10, 10)).toBe("Plafond atteint");
    expect(texteQuota(12, 10)).toBe("Plafond dépassé de 2 séances");
  });
});
