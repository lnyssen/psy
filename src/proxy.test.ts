import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";
import { COOKIE_SESSION, creerJeton } from "@/lib/session";

afterEach(() => vi.unstubAllEnvs());

function requete(chemin: string, o: { methode?: string; cookie?: string; accept?: string; hote?: string } = {}) {
  const h = new Headers({ host: o.hote ?? "exemple.test" });
  if (o.cookie) h.set("cookie", `${COOKIE_SESSION}=${o.cookie}`);
  if (o.accept) h.set("accept", o.accept);
  return new NextRequest(`http://${o.hote ?? "exemple.test"}${chemin}`, { method: o.methode ?? "GET", headers: h });
}

describe("proxy : protection de l'outil", () => {
  it("laisse passer le site public sans session", async () => {
    const r = await proxy(requete("/"));
    expect(r.status).toBe(200);
    expect(r.headers.get("location")).toBeNull();
  });

  it("renvoie vers la connexion, en gardant la page demandée, quand il n'y a pas de session", async () => {
    const r = await proxy(requete("/admin/patients?q=a"));
    expect(r.status).toBe(307);
    const vers = new URL(r.headers.get("location")!);
    expect(vers.pathname).toBe("/connexion");
    expect(vers.searchParams.get("suite")).toBe("/admin/patients?q=a");
  });

  it("renvoie vers la connexion quand le cookie est falsifié", async () => {
    const r = await proxy(requete("/admin", { cookie: "9999999999999.signature-bidon" }));
    expect(r.status).toBe(307);
  });

  it("laisse entrer avec une session valide", async () => {
    const r = await proxy(requete("/admin", { cookie: await creerJeton(), accept: "text/html" }));
    expect(r.status).toBe(200);
    expect(r.headers.get("location")).toBeNull();
  });

  it("lève la garde seulement si DEMO_OUVERTE=1", async () => {
    vi.stubEnv("DEMO_OUVERTE", "1");
    expect((await proxy(requete("/admin"))).status).toBe(200);
    vi.stubEnv("DEMO_OUVERTE", "0");
    expect((await proxy(requete("/admin"))).status).toBe(307);
  });

  it("n'applique pas la garde au flux d'agenda ni aux routes Google (elles ont la leur)", async () => {
    expect((await proxy(requete("/api/agenda/abc.ics"))).status).toBe(200);
    expect((await proxy(requete("/api/google/connexion"))).status).toBe(200);
  });
});

describe("proxy : session glissante", () => {
  it("prolonge la session pour une page chargée en entier", async () => {
    const r = await proxy(requete("/admin", { cookie: await creerJeton(), accept: "text/html,application/xhtml+xml" }));
    expect(r.cookies.get(COOKIE_SESSION)).toBeDefined();
  });

  it("la prolonge pour un envoi (action serveur, signal d'activité)", async () => {
    const r = await proxy(requete("/admin/ping", { methode: "POST", cookie: await creerJeton() }));
    expect(r.cookies.get(COOKIE_SESSION)).toBeDefined();
  });

  it("ne la prolonge pas pour une requête GET que le navigateur lance seul (préchargement)", async () => {
    const r = await proxy(requete("/admin", { cookie: await creerJeton(), accept: "*/*" }));
    expect(r.cookies.get(COOKIE_SESSION)).toBeUndefined();
  });
});

describe("proxy : sous-domaine admin", () => {
  it("réécrit la racine d'admin.… vers l'outil", async () => {
    const r = await proxy(requete("/patients", { hote: "admin.exemple.test" }));
    // Réécrite vers /admin/patients, donc soumise à la garde : pas de session → connexion.
    // La réécriture elle-même se lit dans l'en-tête interne de Next.
    expect(r.headers.get("x-middleware-rewrite")).toContain("/admin/patients");
  });

  it("laisse la connexion et les passkeys à leur place", async () => {
    const c = await proxy(requete("/connexion", { hote: "admin.exemple.test" }));
    expect(c.headers.get("x-middleware-rewrite")).toBeNull();
    const p = await proxy(requete("/api/passkey/options", { hote: "admin.exemple.test" }));
    expect(p.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
