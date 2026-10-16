import { describe, expect, it, vi } from "vitest";

// quotas.ts importe la base ; ces fonctions-ci sont pures, la base reste à l'écart.
vi.mock("@/lib/db", () => ({ prisma: {} }));

import {
  PLAFONDS_PPL,
  ageAu,
  plafondConventionne,
  reseauPpl,
  seancesHorsQuota,
  seancesSurDouzeMois,
} from "@/lib/quotas";

const d = (iso: string) => new Date(`${iso}T10:00:00Z`);
const seance = (id: string, iso: string, status: "ATTENDED" | "NO_SHOW" | "SCHEDULED" | "CANCELLED_IN_TIME" | "NO_SHOW_ANNULE" = "ATTENDED") => ({
  id,
  status,
  startsAt: d(iso),
});

describe("plafonds de la convention INAMI", () => {
  it("fixe 10 séances de soutien pour les enfants, 8 pour les adultes, 20 en traitement", () => {
    expect(PLAFONDS_PPL.SOUTIEN.ENFANTS).toBe(10);
    expect(PLAFONDS_PPL.SOUTIEN.ADULTES).toBe(8);
    expect(PLAFONDS_PPL.TRAITEMENT.ENFANTS).toBe(20);
    expect(PLAFONDS_PPL.TRAITEMENT.ADULTES).toBe(20);
  });
});

describe("ageAu", () => {
  it("ne compte pas l'année avant l'anniversaire", () => {
    expect(ageAu(d("2000-06-15"), d("2026-06-14"))).toBe(25);
    expect(ageAu(d("2000-06-15"), d("2026-06-15"))).toBe(26);
  });
});

describe("réseau et plafond d'un patient", () => {
  const adulteSoutien = { birthDate: d("1980-01-01"), pplType: "SOUTIEN" as const, pplReseau: null };

  it("choisit le réseau enfants jusqu'à 23 ans compris, adultes ensuite", () => {
    const ref = d("2026-10-12");
    expect(reseauPpl({ ...adulteSoutien, birthDate: d("2003-10-13") }, ref)).toBe("ENFANTS"); // 22 ans
    expect(reseauPpl({ ...adulteSoutien, birthDate: d("2003-10-12") }, ref)).toBe("ENFANTS"); // 23 ans
    expect(reseauPpl({ ...adulteSoutien, birthDate: d("2002-10-12") }, ref)).toBe("ADULTES"); // 24 ans
  });

  it("respecte le réseau choisi à la main, quel que soit l'âge", () => {
    expect(reseauPpl({ ...adulteSoutien, pplReseau: "ENFANTS" })).toBe("ENFANTS");
  });

  it("prend le plafond le plus bas (adultes) sans date de naissance", () => {
    expect(reseauPpl({ ...adulteSoutien, birthDate: null })).toBe("ADULTES");
    expect(plafondConventionne({ ...adulteSoutien, birthDate: null })).toBe(8);
  });

  it("donne 20 en traitement, enfant ou adulte", () => {
    expect(plafondConventionne({ ...adulteSoutien, pplType: "TRAITEMENT" })).toBe(20);
    expect(plafondConventionne({ ...adulteSoutien, pplType: "TRAITEMENT", pplReseau: "ENFANTS" })).toBe(20);
  });
});

describe("séances sur douze mois", () => {
  const fin = d("2026-10-12");

  it("compte les séances honorées, manquées et à venir", () => {
    const l = [
      seance("a", "2026-09-01"),
      seance("b", "2026-08-01", "NO_SHOW"),
      seance("c", "2026-10-01", "SCHEDULED"),
    ];
    expect(seancesSurDouzeMois(l, fin)).toBe(3);
  });

  it("ignore les annulations à temps et les absences non réclamées", () => {
    const l = [
      seance("a", "2026-09-01", "CANCELLED_IN_TIME"),
      seance("b", "2026-09-02", "NO_SHOW_ANNULE"),
    ];
    expect(seancesSurDouzeMois(l, fin)).toBe(0);
  });

  it("ne compte que la fenêtre glissante de douze mois", () => {
    const l = [
      seance("hors", "2025-10-12"), // exactement un an avant : exclue
      seance("dedans", "2025-10-13"),
      seance("futur", "2026-10-13"), // après la fin : exclue
    ];
    expect(seancesSurDouzeMois(l, fin)).toBe(1);
  });
});

describe("séances hors quota", () => {
  const adulte = { birthDate: d("1980-01-01"), pplType: "SOUTIEN" as const, pplReseau: null };

  it("signale la neuvième séance d'un adulte en soutien, pas les huit premières", () => {
    const l = Array.from({ length: 9 }, (_, i) => seance(`s${i + 1}`, `2026-0${i + 1}-10`));
    const hors = seancesHorsQuota(l, adulte);
    expect([...hors]).toEqual(["s9"]);
  });

  it("libère une place quand une séance sort des douze derniers mois", () => {
    // Huit séances rapprochées, puis une neuvième plus d'un an après la première.
    const l = [
      ...Array.from({ length: 8 }, (_, i) => seance(`s${i + 1}`, `2025-0${i + 1}-10`)),
      seance("tard", "2026-03-10"),
    ];
    expect(seancesHorsQuota(l, adulte).size).toBe(0);
  });

  it("applique le plafond de 20 en traitement", () => {
    const traitement = { ...adulte, pplType: "TRAITEMENT" as const };
    const l = Array.from({ length: 21 }, (_, i) => ({
      id: `t${i + 1}`,
      status: "ATTENDED" as const,
      startsAt: new Date(Date.UTC(2026, 0, 1 + i * 10)),
    }));
    expect([...seancesHorsQuota(l, traitement)]).toEqual(["t21"]);
  });

  it("ne compte pas les annulations dans le quota", () => {
    const l = [
      ...Array.from({ length: 8 }, (_, i) => seance(`s${i + 1}`, `2026-0${i + 1}-10`)),
      seance("annulee", "2026-09-10", "CANCELLED_IN_TIME"),
    ];
    expect(seancesHorsQuota(l, adulte).size).toBe(0);
  });
});
