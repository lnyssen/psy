import { describe, expect, it } from "vitest";
import { cibleApresConnexion } from "@/lib/acces-constantes";

describe("cibleApresConnexion", () => {
  it("rouvre l'outil quand il n'y a pas de page d'origine", () => {
    for (const v of [null, undefined, "", "/"]) expect(cibleApresConnexion(v)).toBe("/admin");
  });

  it("revient à la page d'origine quand elle est interne", () => {
    expect(cibleApresConnexion("/admin/patients/42")).toBe("/admin/patients/42");
  });

  it("n'emmène jamais hors du site (redirection ouverte)", () => {
    expect(cibleApresConnexion("//evil.example")).toBe("/admin");
    expect(cibleApresConnexion("https://evil.example")).toBe("/admin");
    expect(cibleApresConnexion("evil.example")).toBe("/admin");
  });
});
