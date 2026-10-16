import { describe, expect, it } from "vitest";
import { construireInstantane, heureEnClair, nomAbrege, type SeanceSource } from "@/lib/hors-ligne";
import { instantBruxelles } from "@/lib/format";

const cab = { nom: "Uccle", addressLine: "Rue X 1", postalCode: "1180", city: "Uccle" };
const seance = (heure: string, o: Partial<SeanceSource> = {}): SeanceSource => ({
  startsAt: instantBruxelles("2026-10-16", heure)!,
  durationMin: 45,
  status: "SCHEDULED",
  visio: false,
  patient: { firstName: "Zoé", lastName: "martin" },
  cabinet: cab,
  ...o,
});
const debut = instantBruxelles("2026-10-16", "00:00")!;
const maintenant = instantBruxelles("2026-10-16", "07:30")!;

describe("heureEnClair", () => {
  it("écrit l'heure comme on la lit", () => {
    expect(heureEnClair(instantBruxelles("2026-10-16", "13:15")!)).toBe("13 h 15");
    expect(heureEnClair(instantBruxelles("2026-10-16", "09:00")!)).toBe("9 h");
    expect(heureEnClair(instantBruxelles("2026-10-16", "09:05")!)).toBe("9 h 05");
  });
});

describe("nomAbrege", () => {
  it("garde le prénom et l'initiale du nom, en majuscule", () => {
    expect(nomAbrege({ firstName: "Zoé", lastName: "martin" })).toBe("Zoé M.");
    expect(nomAbrege({ firstName: "Zoé", lastName: "" })).toBe("Zoé");
  });
});

describe("construireInstantane", () => {
  const instantane = construireInstantane({
    maintenant,
    accent: "bleu",
    jours: [
      {
        debut,
        seances: [
          seance("14:00"),
          seance("09:00", { visio: true }),
          seance("11:00", { status: "CANCELLED_IN_TIME" }),
          seance("12:00", { patient: null }),
        ],
      },
    ],
  });

  it("range les séances par heure et écarte les annulations à temps", () => {
    expect(instantane.jours[0].seances.map((s) => s.debut)).toEqual(["9 h", "12 h", "14 h"]);
  });

  it("n'emporte que le nécessaire : prénom, initiale, lieu, adresse", () => {
    const s = instantane.jours[0].seances[0];
    expect(Object.keys(s).sort()).toEqual(["adresse", "cabinet", "debut", "fin", "nom", "statut", "visio"]);
    expect(s.nom).toBe("Zoé M.");
    expect(s.adresse).toBe("Rue X 1, 1180 Uccle");
    expect(s.fin).toBe("9 h 45");
    expect(s.visio).toBe(true);
  });

  it("un bloc sans patient prend le nom du lieu", () => {
    expect(instantane.jours[0].seances[1].nom).toBe("Uccle");
  });

  it("ne contient aucun nom de famille complet, e-mail ou montant", () => {
    const brut = JSON.stringify(instantane);
    expect(brut).not.toContain("martin");
    expect(brut).not.toMatch(/@|amount|montant|phone|note/i);
  });

  it("date l'instantané et reprend l'accent du site", () => {
    expect(instantane.jourReference).toBe("2026-10-16");
    expect(instantane.jours[0].iso).toBe("2026-10-16");
    expect(instantane.accent.clair).toBe("#0a70e6");
    expect(instantane.version).toBe(1);
  });
});
