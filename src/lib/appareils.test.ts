import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
const entetes = vi.hoisted(() => ({ valeur: new Headers() }));
const db = vi.hoisted(() => ({
  appareilConnu: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  acces: { findUnique: vi.fn() },
}));
const courriel = vi.hoisted(() => ({ envoyerCourriel: vi.fn(), creneauEnClair: () => "lundi 12 octobre à 10 h" }));
const apres = vi.hoisted(() => ({ taches: [] as (() => unknown)[] }));

vi.mock("next/headers", () => ({ cookies: async () => jar, headers: async () => entetes.valeur }));
vi.mock("next/server", () => ({ after: (f: () => unknown) => apres.taches.push(f) }));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/courriel", () => courriel);

import { COOKIE_APPAREIL, empreinteAppareil, libelleAppareil, noterConnexion } from "@/lib/appareils";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const EDGE_WIN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0";

beforeEach(() => {
  vi.resetAllMocks();
  apres.taches.length = 0;
  entetes.valeur = new Headers({ "user-agent": IPHONE, "x-forwarded-for": "203.0.113.7" });
  db.acces.findUnique.mockResolvedValue({ recoveryEmail: "a@example.be" });
  courriel.envoyerCourriel.mockResolvedValue(true);
});

describe("libelleAppareil", () => {
  it("nomme le navigateur et le système sans montrer le user-agent brut", () => {
    expect(libelleAppareil(IPHONE)).toBe("Safari sur iPhone");
    expect(libelleAppareil(CHROME_MAC)).toBe("Chrome sur Mac");
    expect(libelleAppareil(EDGE_WIN)).toBe("Edge sur Windows");
    expect(libelleAppareil(null)).toBe("Appareil inconnu");
    expect(libelleAppareil("curl/8.0")).toBe("Appareil inconnu");
  });
});

describe("noterConnexion", () => {
  it("sans cookie : enregistre l'appareil, pose le cookie et prévient par e-mail", async () => {
    jar.get.mockReturnValue(undefined);
    await noterConnexion("mot de passe");

    expect(db.appareilConnu.create).toHaveBeenCalledOnce();
    const [nom, empreinte] = [db.appareilConnu.create.mock.calls[0][0].data.nom, db.appareilConnu.create.mock.calls[0][0].data.empreinte];
    expect(nom).toBe("Safari sur iPhone");
    const [, valeur, options] = jar.set.mock.calls[0];
    expect(jar.set.mock.calls[0][0]).toBe(COOKIE_APPAREIL);
    expect(empreinteAppareil(valeur)).toBe(empreinte); // on ne stocke que l'empreinte
    expect(valeur).not.toBe(empreinte);
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", maxAge: 365 * 24 * 3600 });

    expect(apres.taches).toHaveLength(1);
    await apres.taches[0]();
    const m = courriel.envoyerCourriel.mock.calls[0][0];
    expect(m.a).toBe("a@example.be");
    expect(m.sujet).toBe("Nouvelle connexion à votre outil");
    expect(m.texte).toContain("Safari sur iPhone");
    expect(m.texte).toContain("203.0.113.7");
    expect(m.texte).toContain("mot de passe");
  });

  it("cookie connu : met à jour l'appareil et n'envoie rien", async () => {
    jar.get.mockReturnValue({ value: "identifiant-connu" });
    db.appareilConnu.findUnique.mockResolvedValue({ id: "a1" });
    await noterConnexion("mot de passe");

    expect(db.appareilConnu.findUnique.mock.calls[0][0].where.empreinte).toBe(empreinteAppareil("identifiant-connu"));
    expect(db.appareilConnu.update).toHaveBeenCalledOnce();
    expect(db.appareilConnu.create).not.toHaveBeenCalled();
    expect(apres.taches).toHaveLength(0);
  });

  it("cookie présent mais inconnu de la base (copié, base restaurée) : nouvel appareil, alerte", async () => {
    jar.get.mockReturnValue({ value: "identifiant-inconnu" });
    db.appareilConnu.findUnique.mockResolvedValue(null);
    await noterConnexion("Face ID, Touch ID ou empreinte");
    expect(db.appareilConnu.create).toHaveBeenCalledOnce();
    expect(apres.taches).toHaveLength(1);
  });

  it("sans adresse de récupération : pas d'e-mail, et la connexion n'est pas gênée", async () => {
    jar.get.mockReturnValue(undefined);
    db.acces.findUnique.mockResolvedValue({ recoveryEmail: null });
    await noterConnexion("mot de passe");
    await apres.taches[0]();
    expect(courriel.envoyerCourriel).not.toHaveBeenCalled();
  });

  it("ne lève jamais, même si la base est en panne ou la table absente", async () => {
    jar.get.mockReturnValue(undefined);
    db.appareilConnu.create.mockRejectedValue(new Error("relation absente"));
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(noterConnexion("mot de passe")).resolves.toBeUndefined();
    erreur.mockRestore();
  });
});
