import { describe, expect, it } from "vitest";
import { etatPaiement } from "./tarifs";

const maintenant = new Date("2026-11-20T12:00:00Z");
const il = (jours: number) => new Date(maintenant.getTime() - jours * 86_400_000);

describe("etatPaiement", () => {
  it("passe en retard une séance privée due au-delà du délai", () => {
    expect(etatPaiement({ paymentStatus: "DUE", startsAt: il(15) }, "PATIENT", 14, maintenant)).toBe("OVERDUE");
  });
  it("laisse due une séance privée dans le délai", () => {
    expect(etatPaiement({ paymentStatus: "DUE", startsAt: il(3) }, "PATIENT", 14, maintenant)).toBe("DUE");
  });
  it("ne touche ni au payé ni à l'INAMI", () => {
    expect(etatPaiement({ paymentStatus: "PAID", startsAt: il(90) }, "PATIENT", 14, maintenant)).toBe("PAID");
    expect(etatPaiement({ paymentStatus: "DUE", startsAt: il(90) }, "INAMI", 14, maintenant)).toBe("DUE");
  });
});
