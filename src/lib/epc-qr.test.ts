import { describe, expect, it } from "vitest";
import { BENEFICIAIRE, chaineEpc, ibanValide, qrVirement } from "@/lib/epc-qr";

// IBAN belge d'exemple, à clé correcte (publié dans la documentation de la norme).
const IBAN = "BE68 5390 0754 7034";

describe("ibanValide", () => {
  it("accepte un IBAN correct, avec ou sans espaces et en minuscules", () => {
    expect(ibanValide(IBAN)).toBe(true);
    expect(ibanValide("be68539007547034")).toBe(true);
  });

  it("refuse une clé fausse, un format absurde ou une valeur vide", () => {
    expect(ibanValide("BE68 5390 0754 7035")).toBe(false);
    expect(ibanValide("BE68")).toBe(false);
    expect(ibanValide("pas un iban")).toBe(false);
    expect(ibanValide("")).toBe(false);
    expect(ibanValide(null)).toBe(false);
    expect(ibanValide(undefined)).toBe(false);
  });
});

describe("chaineEpc", () => {
  it("respecte l'ordre et le contenu des lignes de la norme EPC069-12", () => {
    const l = chaineEpc({ iban: IBAN, montantCents: 6500, communication: "Séance du 12/10" })!.split("\n");
    expect(l[0]).toBe("BCD");
    expect(l[1]).toBe("002");
    expect(l[2]).toBe("1");
    expect(l[3]).toBe("SCT");
    expect(l[4]).toBe(""); // BIC facultatif
    expect(l[5]).toBe(BENEFICIAIRE);
    expect(l[6]).toBe("BE68539007547034");
    expect(l[7]).toBe("EUR65.00");
    expect(l[10]).toBe("Séance du 12/10");
  });

  it("écrit les centimes sur deux décimales", () => {
    const c = chaineEpc({ iban: IBAN, montantCents: 1205, communication: "x" })!;
    expect(c.split("\n")[7]).toBe("EUR12.05");
  });

  it("refuse un IBAN invalide et les montants nuls, négatifs, fractionnaires ou démesurés", () => {
    const base = { iban: IBAN, communication: "x" };
    expect(chaineEpc({ ...base, iban: "BE00 0000 0000 0000", montantCents: 1000 })).toBeNull();
    expect(chaineEpc({ ...base, montantCents: 0 })).toBeNull();
    expect(chaineEpc({ ...base, montantCents: -100 })).toBeNull();
    expect(chaineEpc({ ...base, montantCents: 10.5 })).toBeNull();
    expect(chaineEpc({ ...base, montantCents: 100_000_000_000 })).toBeNull();
  });

  it("ne laisse pas un retour à la ligne de la communication décaler les lignes", () => {
    const c = chaineEpc({ iban: IBAN, montantCents: 1000, communication: "ligne 1\nligne 2\r\nligne 3" })!;
    expect(c.split("\n")).toHaveLength(11);
  });

  it("tronque la communication à 140 caractères", () => {
    const c = chaineEpc({ iban: IBAN, montantCents: 1000, communication: "a".repeat(300) })!;
    expect(c.split("\n")[10]).toHaveLength(140);
  });
});

describe("qrVirement", () => {
  it("produit une image PNG quand tout est valide", async () => {
    const png = await qrVirement({ iban: IBAN, montantCents: 6500, communication: "Séance" });
    expect(png).not.toBeNull();
    expect(png!.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });

  it("ne produit rien sans IBAN ou avec un montant impossible", async () => {
    expect(await qrVirement({ iban: null, montantCents: 6500, communication: "x" })).toBeNull();
    expect(await qrVirement({ iban: IBAN, montantCents: 0, communication: "x" })).toBeNull();
  });
});
