import { afterEach, describe, expect, it, vi } from "vitest";
import { DUREE_MS, creerJeton, jetonValide, optionsCookie } from "@/lib/session";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("jeton de session", () => {
  it("est reconnu juste après sa création", async () => {
    expect(await jetonValide(await creerJeton())).toBe(true);
  });

  it("expire après trente minutes sans activité, pas avant", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-12T10:00:00Z"));
    const jeton = await creerJeton();
    vi.setSystemTime(new Date("2026-10-12T10:29:59Z"));
    expect(await jetonValide(jeton)).toBe(true);
    vi.setSystemTime(new Date("2026-10-12T10:30:01Z"));
    expect(await jetonValide(jeton)).toBe(false);
  });

  it("refuse un jeton dont on a prolongé la date sans refaire la signature", async () => {
    const [, signature] = (await creerJeton()).split(".");
    const faux = `${Date.now() + 10 * DUREE_MS}.${signature}`;
    expect(await jetonValide(faux)).toBe(false);
  });

  it("refuse un jeton signé avec une autre clé", async () => {
    const jeton = await creerJeton();
    vi.stubEnv("AUTH_SECRET", "une-autre-cle-qui-n-est-pas-la-bonne");
    expect(await jetonValide(jeton)).toBe(false);
  });

  it("refuse les valeurs vides ou mal formées", async () => {
    for (const v of [undefined, "", "abc", "123.", ".abc", "pas-un-nombre.abc"]) {
      expect(await jetonValide(v)).toBe(false);
    }
  });

  it("a un cookie httpOnly, SameSite=Lax, d'une durée égale à celle du jeton", () => {
    expect(optionsCookie.httpOnly).toBe(true);
    expect(optionsCookie.sameSite).toBe("lax");
    expect(optionsCookie.maxAge).toBe(DUREE_MS / 1000);
  });
});
