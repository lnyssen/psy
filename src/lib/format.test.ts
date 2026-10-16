import { describe, expect, it } from "vitest";
import {
  ajouterJours,
  conflitsDeTrajet,
  euros,
  formatDuree,
  heuresTotales,
  instantBruxelles,
  isBillable,
  isoJour,
  lundiDe,
  numeroNational,
  partiesJour,
  pourPdf,
} from "@/lib/format";

describe("séance facturable", () => {
  it("l'est si honorée ou manquée, jamais si annulée à temps ou à venir", () => {
    expect(isBillable("ATTENDED")).toBe(true);
    expect(isBillable("NO_SHOW")).toBe(true);
    expect(isBillable("CANCELLED_IN_TIME")).toBe(false);
    expect(isBillable("SCHEDULED")).toBe(false);
    expect(isBillable("NO_SHOW_ANNULE")).toBe(false);
  });
});

describe("heures et durées", () => {
  it("additionne les durées sans les annulations à temps", () => {
    expect(
      heuresTotales([
        { durationMin: 45, status: "ATTENDED" },
        { durationMin: 45, status: "NO_SHOW" },
        { durationMin: 45, status: "CANCELLED_IN_TIME" },
      ]),
    ).toBe(1.5);
  });

  it("écrit une durée comme on la lit", () => {
    expect(formatDuree(0.75)).toBe("45 min");
    expect(formatDuree(3.75)).toBe("3 h 45");
    expect(formatDuree(2)).toBe("2 h");
    expect(formatDuree(1 + 5 / 60)).toBe("1 h 05");
  });
});

describe("numéro national belge", () => {
  // Numéros fabriqués ici, jamais de vrais : la clé est 97 − (base mod 97).
  const cle = (base: string) => String(97 - (Number(base) % 97)).padStart(2, "0");

  it("accepte un numéro dont la clé est bonne, avec ou sans séparateurs", () => {
    const base = "850101123";
    const complet = base + cle(base);
    const attendu = `850101-123.${cle(base)}`;
    expect(numeroNational(complet)).toBe(attendu);
    expect(numeroNational(`85.01.01-123.${cle(base)}`)).toBe(attendu);
    expect(numeroNational(` ${attendu} `)).toBe(attendu);
  });

  it("gère la clé des naissances depuis 2000 (préfixe 2)", () => {
    const base = "050615234";
    const k = String(97 - (Number(`2${base}`) % 97)).padStart(2, "0");
    expect(numeroNational(base + k)).toBe(`050615-234.${k}`);
  });

  it("refuse une clé fausse et toute saisie qui n'a pas onze chiffres", () => {
    const base = "850101123";
    const mauvaise = String((Number(cle(base)) + 1) % 97).padStart(2, "0");
    expect(numeroNational(base + mauvaise)).toBeNull();
    expect(numeroNational("123")).toBeNull();
    expect(numeroNational("")).toBeNull();
    expect(numeroNational("abcdefghijk")).toBeNull();
  });
});

describe("dates à Bruxelles", () => {
  it("lit une heure de Bruxelles en été (UTC+2) et en hiver (UTC+1)", () => {
    expect(instantBruxelles("2026-07-14", "09:00")!.toISOString()).toBe("2026-07-14T07:00:00.000Z");
    expect(instantBruxelles("2026-01-14", "09:00")!.toISOString()).toBe("2026-01-14T08:00:00.000Z");
  });

  it("refuse une date ou une heure mal formée", () => {
    expect(instantBruxelles("14/07/2026", "09:00")).toBeNull();
    expect(instantBruxelles("2026-13-01", "09:00")).toBeNull();
    expect(instantBruxelles("2026-07-14", "25:00")).toBeNull();
    expect(instantBruxelles("2026-07-14", "9h")).toBeNull();
  });

  it("isoJour rend le jour de Bruxelles, pas celui d'UTC (minuit local = la veille en UTC)", () => {
    const minuit = instantBruxelles("2026-07-14", "00:00")!;
    expect(minuit.toISOString().slice(0, 10)).toBe("2026-07-13");
    expect(isoJour(minuit)).toBe("2026-07-14");
  });

  it("ajouterJours tient compte du passage à l'heure d'été (le 29 mars 2026)", () => {
    const veille = instantBruxelles("2026-03-28", "00:00")!;
    const lendemain = ajouterJours(veille, 1);
    expect(isoJour(lendemain)).toBe("2026-03-29");
    expect(partiesJour(lendemain).heure).toBe(0);
    const apres = ajouterJours(veille, 2);
    expect(isoJour(apres)).toBe("2026-03-30");
    expect(partiesJour(apres).heure).toBe(0);
  });

  it("lundiDe ramène au lundi, y compris pour un dimanche", () => {
    expect(isoJour(lundiDe(instantBruxelles("2026-10-12", "10:00")!))).toBe("2026-10-12"); // lundi
    expect(isoJour(lundiDe(instantBruxelles("2026-10-14", "10:00")!))).toBe("2026-10-12");
    expect(isoJour(lundiDe(instantBruxelles("2026-10-18", "23:30")!))).toBe("2026-10-12"); // dimanche
  });
});

describe("conflits de trajet", () => {
  const t = (heure: string, cabinetId: string) => ({
    startsAt: instantBruxelles("2026-10-12", heure)!,
    durationMin: 45,
    cabinetId,
  });

  it("signale la séance qui suit trop vite une séance dans l'autre cabinet", () => {
    // 09:00–09:45 à Uccle, puis 10:00 à Auderghem : 15 min de battement < 30.
    expect([...conflitsDeTrajet([t("09:00", "uccle"), t("10:00", "auderghem")])]).toEqual([1]);
  });

  it("ne signale rien avec assez de temps ou dans le même cabinet", () => {
    expect(conflitsDeTrajet([t("09:00", "uccle"), t("10:30", "auderghem")]).size).toBe(0);
    expect(conflitsDeTrajet([t("09:00", "uccle"), t("09:45", "uccle")]).size).toBe(0);
  });

  it("respecte un temps de trajet réglé autrement", () => {
    expect(conflitsDeTrajet([t("09:00", "a"), t("10:30", "b")], 60).size).toBe(1);
  });
});

describe("montants et PDF", () => {
  it("écrit un montant en euros, ou un tiret quand il manque", () => {
    expect(pourPdf(euros(6500))).toMatch(/^65,00\s?€$/);
    expect(euros(null)).toBe("—");
    expect(euros(undefined)).toBe("—");
  });

  it("remplace les espaces insécables que les polices de PDF ne savent pas écrire", () => {
    expect(pourPdf("65,00 € et 12")).toBe("65,00 € et 12");
  });
});
