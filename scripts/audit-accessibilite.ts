/**
 * Audit d'accessibilité automatisé (WCAG 2.1 A et AA) avec axe-core, sur le site
 * public et l'outil, tournant sur la base fictive des captures.
 *
 *   npm i --no-save puppeteer-core axe-core
 *   (outil lancé sur le port 3100, voir capturer-documentation.ts)
 *   AUTH_SECRET=… npx tsx scripts/audit-accessibilite.ts
 *
 * Un outil automatique ne voit qu'une partie des défauts (clavier, ordre de
 * lecture, sens des libellés…) : ce rapport complète la relecture, il ne la
 * remplace pas.
 */
import { createHmac } from "node:crypto";
import { createRequire } from "node:module";
import puppeteer, { type Page } from "puppeteer-core";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const require = createRequire(import.meta.url);

function jeton() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET absente (chargez .env.local).");
  const e = String(Date.now() + 3_600_000);
  return `${e}.${createHmac("sha256", secret).update(e).digest("base64url")}`;
}

const PUBLIQUES = ["/", "/en-pratique", "/questions", "/contact", "/rendez-vous", "/confidentialite", "/connexion", "/connexion/oublie"];
const OUTIL = [
  "/admin", "/admin/semaine", "/admin/patients", "/admin/patients/nouveau", "/admin/patients/import", "/admin/patients/doublons",
  "/admin/facturation", "/admin/etablissements", "/admin/depenses", "/admin/finance", "/admin/statistiques", "/admin/ppl",
  "/admin/demandes", "/admin/google", "/admin/reglages", "/admin/documentation", "/admin/documentation/prise-en-main", "/admin/imprimer",
];

type Noeud = { cible: string; html: string };
type Violation = { id: string; impact: string; help: string; nodes: Noeud[] };
const trouvees = new Map<string, { impact: string; help: string; pages: Set<string>; exemples: Noeud[]; total: number }>();

async function auditer(page: Page, chemin: string, contexte: string) {
  await page.goto(`${BASE}${chemin}`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 1500));
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const violations: Violation[] = await page.evaluate(async () => {
    // @ts-expect-error axe est injecté
    const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return r.violations.map((v: { id: string; impact: string; help: string; nodes: { target: unknown[]; html: string }[] }) => ({
      id: v.id, impact: v.impact, help: v.help,
      nodes: v.nodes.map((n) => ({ cible: String(n.target.join(" ")), html: n.html.slice(0, 160) })),
    }));
  });
  const debordement = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (debordement) violations.push({ id: "reflow-debordement", impact: "serious", help: "Défilement horizontal de la page (WCAG 1.4.10)", nodes: [{ cible: "html", html: "" }] });
  for (const v of violations) {
    const e = trouvees.get(v.id) ?? { impact: v.impact, help: v.help, pages: new Set(), exemples: [], total: 0 };
    e.pages.add(`${contexte} ${chemin}`);
    e.total += v.nodes.length;
    for (const n of v.nodes) if (e.exemples.length < 3 && !e.exemples.some((x) => x.cible === n.cible)) e.exemples.push(n);
    trouvees.set(v.id, e);
  }
  return violations.length;
}

async function main() {
  const navigateur = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
  try {
    const contextes: { nom: string; largeur: number; hauteur: number; theme: "light" | "dark"; mobile?: boolean; pages: string[] }[] = [
      { nom: "bureau-clair", largeur: 1280, hauteur: 800, theme: "light", pages: [...PUBLIQUES, ...OUTIL] },
      { nom: "bureau-sombre", largeur: 1280, hauteur: 800, theme: "dark", pages: ["/admin", "/admin/patients", "/admin/facturation", "/admin/reglages", "/connexion"] },
      { nom: "mobile-320", largeur: 320, hauteur: 700, theme: "light", mobile: true, pages: [...PUBLIQUES, ...OUTIL.filter((c) => c !== "/admin/imprimer")] },
    ];
    // La fiche d'un patient fictif.
    const lienFiche = await (async () => {
      const p = await navigateur.newPage();
      await p.setCookie({ name: "amapsy_session", value: jeton(), url: BASE });
      await p.goto(`${BASE}/admin/patients`, { waitUntil: "load" });
      const l = await p.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("Emma Peeters"))?.getAttribute("href"));
      await p.close();
      return l;
    })();
    for (const c of contextes) {
      const page = await navigateur.newPage();
      await page.setCookie({ name: "amapsy_session", value: jeton(), url: BASE }, { name: "theme", value: c.theme, url: BASE });
      await page.setViewport({ width: c.largeur, height: c.hauteur, deviceScaleFactor: 1, isMobile: c.mobile, hasTouch: c.mobile });
      const pages = lienFiche && c.nom !== "bureau-sombre" ? [...c.pages, lienFiche] : c.pages;
      for (const chemin of pages) {
        const n = await auditer(page, chemin, c.nom);
        console.log(`  ${n === 0 ? "✓" : "✗"} ${c.nom} ${chemin}${n ? ` (${n})` : ""}`);
      }
      await page.close();
    }
    // Clavier : le premier Tab doit proposer d'éviter le menu, et Entrée doit
    // poser le focus sur le contenu.
    const clavier = await navigateur.newPage();
    await clavier.setCookie({ name: "amapsy_session", value: jeton(), url: BASE });
    for (const chemin of ["/admin", "/"]) {
      await clavier.goto(`${BASE}${chemin}`, { waitUntil: "load" });
      await clavier.keyboard.press("Tab");
      const premier = await clavier.evaluate(() => document.activeElement?.textContent?.trim());
      await clavier.keyboard.press("Enter");
      const cible = await clavier.evaluate(() => document.activeElement?.id);
      console.log(`  clavier ${chemin} : 1er Tab = « ${premier} », Entrée → focus sur #${cible}`);
    }
  } finally {
    await navigateur.close();
  }
  console.log("\n===== SYNTHÈSE =====");
  const triees = [...trouvees.entries()].sort((a, b) => b[1].pages.size - a[1].pages.size);
  if (triees.length === 0) console.log("Aucune violation détectée.");
  for (const [id, e] of triees) {
    console.log(`\n[${e.impact}] ${id} — ${e.help}\n  ${e.total} élément(s) sur ${e.pages.size} page(s)`);
    for (const x of e.exemples) console.log(`  · ${x.cible}\n    ${x.html}`);
    console.log(`  pages : ${[...e.pages].slice(0, 4).join(" | ")}${e.pages.size > 4 ? " …" : ""}`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
