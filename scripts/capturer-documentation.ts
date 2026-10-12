/**
 * Captures d'écran de la documentation, à partir de l'application tournant sur
 * une base fictive (voir seed-documentation.ts) : jamais de données réelles.
 *
 *   npm i --no-save puppeteer-core
 *   DATABASE_URL=postgresql://docs@localhost:5544/docs … next start -p 3100
 *   npx tsx scripts/capturer-documentation.ts
 *
 * Les images sont converties en WebP dans public/documentation/.
 */
import { createHmac } from "node:crypto";
import puppeteer, { type Page } from "puppeteer-core";
import sharp from "sharp";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const SORTIE = "public/documentation";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function jeton() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET absente (chargez .env.local).");
  const e = String(Date.now() + 3_600_000);
  return `${e}.${createHmac("sha256", secret).update(e).digest("base64url")}`;
}

async function enregistrer(buffer: Uint8Array | Buffer, nom: string, largeurMax = 1600) {
  await sharp(Buffer.from(buffer)).resize({ width: largeurMax, withoutEnlargement: true }).webp({ quality: 84 }).toFile(`${SORTIE}/${nom}.webp`);
  console.log("  ✓", nom);
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Photographie la page entière visible (fenêtre) ou un élément. */
async function capturer(page: Page, nom: string, chemin: string, opts: { selecteur?: string; ouvrir?: string; pleine?: boolean } = {}) {
  await page.goto(`${BASE}${chemin}`, { waitUntil: "load" });
  await attendre(1800); // chargement et animations d'entrée
  if (opts.ouvrir) {
    await page.evaluate((texte) => {
      const d = [...document.querySelectorAll("details")].find((x) => x.textContent?.includes(texte));
      if (d) d.open = true;
    }, opts.ouvrir);
    await attendre(300);
  }
  if (opts.selecteur) {
    const el = await page.$(opts.selecteur);
    if (!el) {
      console.log("  ✗", nom, "(sélecteur introuvable :", opts.selecteur, ")");
      return;
    }
    await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await attendre(500);
    await enregistrer(await el.screenshot({ type: "png" }), nom);
    return;
  }
  await enregistrer(await page.screenshot({ type: "png", fullPage: opts.pleine ?? false }), nom);
}

async function main() {
  const navigateur = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
  try {
    // Écran de connexion : sans session.
    const anonyme = await navigateur.newPage();
    await anonyme.setViewport({ width: 1100, height: 700, deviceScaleFactor: 2 });
    await capturer(anonyme, "connexion", "/connexion");
    await capturer(anonyme, "public-rendez-vous", "/rendez-vous");
    await capturer(anonyme, "public-annulation", "/rendez-vous/seance/demo-seance-0001");
    await anonyme.close();

    const page = await navigateur.newPage();
    await page.setCookie({ name: "amapsy_session", value: jeton(), url: BASE });
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });

    await capturer(page, "aujourdhui", "/admin");
    await capturer(page, "agenda", "/admin/semaine");
    await capturer(page, "agenda-nouvelle-seance", "/admin/semaine", { ouvrir: "Nouvelle séance", selecteur: "details" });

    await capturer(page, "patients", "/admin/patients");
    // La fiche d'un patient fictif, repérée par son nom dans la liste.
    await page.goto(`${BASE}/admin/patients`, { waitUntil: "load" });
    const lien = await page.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("Emma Peeters"))?.getAttribute("href"));
    if (lien) {
      await capturer(page, "patient-fiche", lien, { pleine: true });
      await capturer(page, "patient-modifier", lien, { ouvrir: "Modifier la fiche", selecteur: "details:has(form)" });
      await capturer(page, "patient-documents", lien, { selecteur: "#documents" });
      await capturer(page, "patient-rgpd", lien, { ouvrir: "Données personnelles", selecteur: "details:last-of-type" });
    }
    await capturer(page, "patient-nouveau", "/admin/patients/nouveau", { pleine: true });
    await capturer(page, "import", "/admin/patients/import");
    await capturer(page, "doublons", "/admin/patients/doublons");

    await capturer(page, "demandes", "/admin/demandes");
    await capturer(page, "facturation", "/admin/facturation");
    await capturer(page, "etablissements", "/admin/etablissements");
    await capturer(page, "depenses", "/admin/depenses");
    await capturer(page, "finance", "/admin/finance");
    await capturer(page, "ppl", "/admin/ppl");
    await capturer(page, "statistiques", "/admin/statistiques");
    await capturer(page, "google", "/admin/google");

    for (const [nom, id] of [
      ["reglages-ouverture", "ouverture"], ["reglages-rythme", "rythme"], ["reglages-horaires", "horaires"], ["reglages-tarifs", "tarifs"],
      ["reglages-identite", "identite"], ["reglages-securite", "securite"], ["reglages-sauvegardes", "sauvegardes"], ["reglages-lieux", "lieux"],
    ] as const) {
      await capturer(page, nom, "/admin/reglages", { selecteur: `#${id}` });
    }
    await capturer(page, "reglages", "/admin/reglages");

    const mobile = await navigateur.newPage();
    await mobile.setCookie({ name: "amapsy_session", value: jeton(), url: BASE });
    await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await capturer(mobile, "mobile-aujourdhui", "/admin");
    await capturer(mobile, "mobile-agenda", "/admin/semaine");
    await mobile.close();
  } finally {
    await navigateur.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
