import { describe, expect, it } from "vitest";
import { creneauxLesPlusProches } from "@/lib/creneaux-proches";

const jour = (iso: string, heures: string[]) => ({
  iso: `${iso}T00:00:00Z`,
  creneaux: heures.map((h) => ({ iso: `${iso}T${h}:00Z`, minutes: 0 })),
});

describe("creneauxLesPlusProches", () => {
  const jours = [
    jour("2026-10-19", ["09:00", "10:00", "15:00"]),
    jour("2026-10-20", ["09:00", "14:00"]),
    jour("2026-10-22", ["09:00"]),
  ];
  const origine = new Date("2026-10-20T14:00:00Z");

  it("rend les plus proches avant ou après, rangés du plus tôt au plus tard", () => {
    expect(creneauxLesPlusProches(jours, origine, 3)).toEqual([
      "2026-10-20T09:00:00Z",
      "2026-10-19T15:00:00Z",
      "2026-10-19T10:00:00Z",
    ].sort());
  });

  it("n'offre jamais l'heure qu'on quitte", () => {
    expect(creneauxLesPlusProches(jours, origine, 10)).not.toContain("2026-10-20T14:00:00.000Z");
    const avecOrigine = [jour("2026-10-20", ["14:00", "15:00"])];
    expect(creneauxLesPlusProches(avecOrigine, new Date("2026-10-20T14:00:00Z"))).toEqual(["2026-10-20T15:00:00Z"]);
  });

  it("ne rend rien quand il n'y a aucun créneau", () => {
    expect(creneauxLesPlusProches([], origine)).toEqual([]);
  });

  it("se limite au nombre demandé, six par défaut", () => {
    const beaucoup = [jour("2026-10-21", ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"])];
    expect(creneauxLesPlusProches(beaucoup, origine)).toHaveLength(6);
  });
});
