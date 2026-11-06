import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESSION, creerJeton } from "@/lib/session";

// Un faux client par adresse de base : chaque requête dit sur quelle base elle
// est partie.
vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: class {
    constructor(public o: { connectionString: string }) {}
  },
}));
vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    url: string;
    constructor(o: { adapter: { o: { connectionString: string } } }) {
      this.url = o.adapter.o.connectionString;
    }
    patient = {
      findMany: (args?: unknown) => {
        const p = Promise.resolve({ base: this.url, args });
        return Object.assign(p, { lot: { base: this.url, args } });
      },
    };
    $transaction = async (arg: { lot: unknown }[]) => ({ base: this.url, lot: arg.map((p) => p.lot) });
  },
}));

let jeton: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nom: string) => (nom === COOKIE_SESSION && jeton ? { value: jeton } : undefined) }),
}));

const { prisma } = await import("@/lib/db");

describe("choix de la base", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://reelle";
    process.env.DATABASE_URL_DEMO = "postgresql://fictive";
    jeton = undefined;
  });

  it("sans session, ou en session praticienne, interroge la base réelle", async () => {
    expect(await prisma.patient.findMany()).toMatchObject({ base: "postgresql://reelle" });
    jeton = await creerJeton();
    expect(await prisma.patient.findMany()).toMatchObject({ base: "postgresql://reelle" });
  });

  it("en session développeur, interroge la base fictive", async () => {
    jeton = await creerJeton("developpeur");
    expect(await prisma.patient.findMany({ take: 1 })).toEqual({
      base: "postgresql://fictive",
      args: { take: 1 },
    });
  });

  it("refuse plutôt que de retomber sur la base réelle si la base fictive manque", async () => {
    delete process.env.DATABASE_URL_DEMO;
    jeton = await creerJeton("developpeur");
    await expect(prisma.patient.findMany()).rejects.toThrow(/DATABASE_URL_DEMO/);
  });

  it("reconstruit une transaction sur la base de la session", async () => {
    jeton = await creerJeton("developpeur");
    const r = (await prisma.$transaction([prisma.patient.findMany({ a: 1 } as never)])) as unknown as {
      base: string;
      lot: { base: string }[];
    };
    expect(r.base).toBe("postgresql://fictive");
    expect(r.lot[0].base).toBe("postgresql://fictive");
  });

  it("ne lance rien tant qu'on n'attend pas", () => {
    const appel = vi.fn();
    const d = prisma.patient.findMany();
    expect(appel).not.toHaveBeenCalled();
    expect(typeof d.then).toBe("function");
  });
});
