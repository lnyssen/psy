import { beforeEach, describe, expect, it, vi } from "vitest";

// La base est remplacée par un double : on contrôle ce que « trouvent » les requêtes
// et on lit les filtres qu'elles reçoivent.
const db = vi.hoisted(() => ({
  patient: { findUnique: vi.fn() },
  session: { findMany: vi.fn(), count: vi.fn() },
  parametres: { findUnique: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));

import { construireAttestation, jourValide } from "@/lib/attestation-pdf";

const base = { patientId: "p1", du: "2026-10-01", au: "2026-10-31", montants: false, pour: "la mutuelle" };
const patient = { id: "p1", firstName: "Zoé", lastName: "Zzz", scheme: "PRIVE", anonymiseAt: null };

beforeEach(() => {
  vi.resetAllMocks();
  db.patient.findUnique.mockResolvedValue(patient);
  db.session.findMany.mockResolvedValue([]);
  db.session.count.mockResolvedValue(0);
  db.parametres.findUnique.mockResolvedValue(null);
});

describe("jourValide", () => {
  it("n'accepte que AAAA-MM-JJ", () => {
    expect(jourValide("2026-10-12")).toBe(true);
    expect(jourValide("12/10/2026")).toBe(false);
    expect(jourValide("2026-13-40")).toBe(false);
    expect(jourValide("")).toBe(false);
  });
});

describe("construireAttestation : refus", () => {
  it("refuse des dates invalides ou inversées avant toute requête", async () => {
    expect(await construireAttestation({ ...base, du: "oups" })).toMatchObject({ ok: false, statut: 400 });
    expect(await construireAttestation({ ...base, du: "2026-10-31", au: "2026-10-01" })).toMatchObject({
      ok: false,
      statut: 400,
    });
    expect(db.patient.findUnique).not.toHaveBeenCalled();
  });

  it("refuse un patient introuvable et un dossier anonymisé", async () => {
    db.patient.findUnique.mockResolvedValueOnce(null);
    expect(await construireAttestation(base)).toMatchObject({ ok: false, statut: 404 });
    db.patient.findUnique.mockResolvedValueOnce({ ...patient, anonymiseAt: new Date() });
    expect(await construireAttestation(base)).toMatchObject({ ok: false, statut: 409 });
  });

  it("dit qu'aucune séance n'est honorée dans la période", async () => {
    const r = await construireAttestation(base);
    expect(r).toMatchObject({ ok: false, statut: 404 });
    expect(r.ok === false && r.message).toContain("Aucune séance honorée");
  });

  it("explique que la séance est honorée mais pas payée quand on demande les montants", async () => {
    db.session.count.mockResolvedValue(1);
    const r = await construireAttestation({ ...base, montants: true });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.message).toContain("1 séance honorée");
    expect(r.ok === false && r.message).toContain("pas marquée payée");
  });

  it("accorde le pluriel quand plusieurs séances honorées ne sont pas payées", async () => {
    db.session.count.mockResolvedValue(3);
    const r = await construireAttestation({ ...base, montants: true });
    expect(r.ok === false && r.message).toContain("3 séances honorées");
    expect(r.ok === false && r.message).toContain("aucune n’est marquée payée");
  });
});

describe("construireAttestation : choix des séances", () => {
  it("ne retient que les séances honorées, dans la période (fin comprise)", async () => {
    await construireAttestation(base);
    const filtre = db.session.findMany.mock.calls[0][0].where;
    expect(filtre.status).toBe("ATTENDED");
    expect(filtre.patientId).toBe("p1");
    expect(filtre.startsAt.gte.toISOString()).toBe("2026-09-30T22:00:00.000Z"); // 1er octobre 00 h à Bruxelles
    expect(filtre.startsAt.lt.toISOString()).toBe("2026-10-31T23:00:00.000Z"); // 1er novembre 00 h : le 31 est inclus
  });

  it("ajoute la condition « payée » seulement avec les montants, pour un patient privé", async () => {
    await construireAttestation({ ...base, montants: true });
    expect(db.session.findMany.mock.calls[0][0].where.paymentStatus).toBe("PAID");
  });

  it("ignore la demande de montants pour un patient conventionné", async () => {
    db.patient.findUnique.mockResolvedValue({ ...patient, scheme: "CONVENTIONNE" });
    await construireAttestation({ ...base, montants: true });
    expect(db.session.findMany.mock.calls[0][0].where.paymentStatus).toBeUndefined();
  });

  it("produit un vrai PDF quand il y a des séances honorées", async () => {
    db.session.findMany.mockResolvedValue([
      {
        id: "s1",
        startsAt: new Date("2026-10-05T08:00:00Z"),
        durationMin: 45,
        amountCents: 6500,
        paymentStatus: "PAID",
        cabinet: { name: "Cabinet", city: "Uccle", addressLine: "Rue X 1", postalCode: "1180" },
      },
    ]);
    const r = await construireAttestation(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.nbSeances).toBe(1);
      expect(Buffer.from(r.octets.subarray(0, 5)).toString()).toBe("%PDF-");
    }
  });
});
