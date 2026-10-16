import { afterEach, describe, expect, it, vi } from "vitest";
import { seanceAVenir, seancePieceComptable } from "@/lib/suppression-patient";

const MAINTENANT = new Date("2026-10-12T12:00:00Z");
const hier = new Date("2026-10-11T12:00:00Z");
const demain = new Date("2026-10-13T12:00:00Z");

const vierge = { amountCents: null, paidAt: null, receiptAt: null, factureId: null };

afterEach(() => vi.useRealTimers());
function maintenant() {
  vi.useFakeTimers();
  vi.setSystemTime(MAINTENANT);
}

describe("séance qui interdit de supprimer le patient", () => {
  it("laisse partir un rendez-vous à venir sans aucun montant", () => {
    maintenant();
    expect(seancePieceComptable({ ...vierge, status: "SCHEDULED", startsAt: demain })).toBe(false);
  });

  it("laisse partir une annulation dans les temps sans montant", () => {
    maintenant();
    expect(seancePieceComptable({ ...vierge, status: "CANCELLED_IN_TIME", startsAt: hier })).toBe(false);
  });

  it("garde une séance passée, même sans montant", () => {
    maintenant();
    expect(seancePieceComptable({ ...vierge, status: "SCHEDULED", startsAt: hier })).toBe(true);
    expect(seancePieceComptable({ ...vierge, status: "ATTENDED", startsAt: hier })).toBe(true);
    expect(seancePieceComptable({ ...vierge, status: "NO_SHOW", startsAt: hier })).toBe(true);
  });

  it("garde toute séance qui porte un montant, un paiement, un reçu ou une facture", () => {
    maintenant();
    const base = { status: "SCHEDULED", startsAt: demain };
    expect(seancePieceComptable({ ...vierge, ...base, amountCents: 6500 })).toBe(true);
    expect(seancePieceComptable({ ...vierge, ...base, paidAt: hier })).toBe(true);
    expect(seancePieceComptable({ ...vierge, ...base, receiptAt: hier })).toBe(true);
    expect(seancePieceComptable({ ...vierge, ...base, factureId: "f1" })).toBe(true);
    expect(seancePieceComptable({ ...vierge, status: "CANCELLED_IN_TIME", startsAt: hier, paidAt: hier })).toBe(true);
  });

  it("une séance à montant zéro reste une pièce (0 n'est pas « sans montant »)", () => {
    maintenant();
    expect(seancePieceComptable({ ...vierge, amountCents: 0, status: "SCHEDULED", startsAt: demain })).toBe(true);
  });
});

describe("seanceAVenir", () => {
  it("ne retient que les rendez-vous programmés dans le futur", () => {
    maintenant();
    expect(seanceAVenir({ status: "SCHEDULED", startsAt: demain })).toBe(true);
    expect(seanceAVenir({ status: "SCHEDULED", startsAt: hier })).toBe(false);
    expect(seanceAVenir({ status: "ATTENDED", startsAt: demain })).toBe(false);
  });
});
