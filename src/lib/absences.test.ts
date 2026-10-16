import { describe, expect, it } from "vitest";
import { compterAbsences } from "@/lib/absences";

const MAINTENANT = new Date("2026-10-12T12:00:00Z");
const s = (status: string, iso: string) => ({ status, startsAt: new Date(`${iso}T10:00:00Z`) });

describe("compterAbsences", () => {
  it("compte les absences facturées et celles qu'on ne réclame pas", () => {
    expect(compterAbsences([s("NO_SHOW", "2026-09-01"), s("NO_SHOW_ANNULE", "2026-08-01")], MAINTENANT)).toBe(2);
  });

  it("ignore les annulations à temps et les séances honorées", () => {
    expect(compterAbsences([s("CANCELLED_IN_TIME", "2026-09-01"), s("ATTENDED", "2026-09-02")], MAINTENANT)).toBe(0);
  });

  it("ne remonte pas au-delà de douze mois et ne compte pas l'avenir", () => {
    expect(
      compterAbsences([s("NO_SHOW", "2025-10-01"), s("NO_SHOW", "2026-11-01"), s("NO_SHOW", "2025-10-20")], MAINTENANT),
    ).toBe(1);
  });
});
