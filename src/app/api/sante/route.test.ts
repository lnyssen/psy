import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
const sauvegarde = vi.hoisted(() => ({ statutSauvegarde: vi.fn(), statutRestauration: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/sauvegardes", () => sauvegarde);

import { GET } from "@/app/api/sante/route";

beforeEach(() => {
  vi.resetAllMocks();
  sauvegarde.statutRestauration.mockResolvedValue({ etat: "ok" });
});

async function appeler() {
  const r = await GET();
  return { statut: r.status, corps: await r.json() };
}

describe("/api/sante", () => {
  it("répond 200 quand la base répond et la sauvegarde est récente", async () => {
    db.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    sauvegarde.statutSauvegarde.mockResolvedValue({ etat: "ok" });
    expect(await appeler()).toEqual({ statut: 200, corps: { ok: true, base: "ok", sauvegarde: "ok", restauration: "ok" } });
  });

  it("répond 200 quand le statut de sauvegarde est inconnu (pas une panne)", async () => {
    db.$queryRaw.mockResolvedValue([]);
    sauvegarde.statutSauvegarde.mockResolvedValue({ etat: "inconnu" });
    expect((await appeler()).statut).toBe(200);
  });

  it("répond 503 quand la base ne répond pas", async () => {
    db.$queryRaw.mockRejectedValue(new Error("connexion refusée"));
    sauvegarde.statutSauvegarde.mockResolvedValue({ etat: "ok" });
    const r = await appeler();
    expect(r.statut).toBe(503);
    expect(r.corps).toMatchObject({ ok: false, base: "panne" });
  });

  it("répond 503 quand la dernière sauvegarde date de plus de 36 h", async () => {
    db.$queryRaw.mockResolvedValue([]);
    sauvegarde.statutSauvegarde.mockResolvedValue({ etat: "ancienne" });
    expect((await appeler()).statut).toBe(503);
  });

  it("répond 503 quand le dernier test de restauration a échoué", async () => {
    db.$queryRaw.mockResolvedValue([]);
    sauvegarde.statutSauvegarde.mockResolvedValue({ etat: "ok" });
    sauvegarde.statutRestauration.mockResolvedValue({ etat: "echec", motif: "x" });
    const r = await appeler();
    expect(r.statut).toBe(503);
    expect(r.corps.restauration).toBe("echec");
  });

  it("ne révèle rien d'autre que ces états", async () => {
    db.$queryRaw.mockResolvedValue([]);
    sauvegarde.statutSauvegarde.mockResolvedValue({ etat: "ok", date: new Date(), tailleMo: 3, nombre: 30 });
    expect(Object.keys((await appeler()).corps).sort()).toEqual(["base", "ok", "restauration", "sauvegarde"]);
  });
});
