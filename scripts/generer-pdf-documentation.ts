/**
 * PDF de la documentation, à partir de la page imprimable de l'outil
 * (/admin/documentation/complete) tournant sur la base fictive des captures.
 *
 *   npm i --no-save puppeteer-core
 *   DATABASE_URL=postgresql://docs@localhost:5544/docs … next start -p 3100
 *   AUTH_SECRET=… npx tsx scripts/generer-pdf-documentation.ts
 *
 * Écrit exports/Documentation-Amapsy.pdf (ignoré par git : il se régénère).
 */
import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SORTIE = "exports/Documentation-Amapsy.pdf";

function jeton() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET absente (chargez .env.local).");
  const e = String(Date.now() + 3_600_000);
  return `${e}.${createHmac("sha256", secret).update(e).digest("base64url")}`;
}

async function main() {
  mkdirSync("exports", { recursive: true });
  const navigateur = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
  try {
    const page = await navigateur.newPage();
    await page.setCookie({ name: "amapsy_session", value: jeton(), url: BASE });
    // Les captures sont des WebP : Chrome les réécrit sans perte dans le PDF
    // (près de 13 Mo). Servies en JPEG, elles y entrent telles quelles.
    await page.setRequestInterception(true);
    page.on("request", async (req) => {
      const chemin = new URL(req.url()).pathname;
      if (chemin.startsWith("/documentation/") && chemin.endsWith(".webp")) {
        try {
          const corps = await sharp(await readFile(`public${chemin}`)).flatten({ background: "#ffffff" }).jpeg({ quality: 80 }).toBuffer();
          await req.respond({ status: 200, contentType: "image/jpeg", body: corps });
          return;
        } catch {
          /* à défaut, l'image d'origine */
        }
      }
      await req.continue();
    });
    await page.goto(`${BASE}/admin/documentation/complete`, { waitUntil: "load" });
    // Toutes les captures doivent être décodées avant d'imprimer.
    await page.evaluate(async () => {
      await Promise.all(
        [...document.images].map((i) => (i.complete ? Promise.resolve() : new Promise((r) => { i.onload = i.onerror = () => r(null); }))),
      );
    });
    await page.emulateMediaType("print");
    await page.pdf({
      path: SORTIE,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="width:100%;font-size:8px;color:#5f5f80;text-align:center;font-family:Helvetica,Arial,sans-serif;">Documentation Amapsy — page <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      preferCSSPageSize: true,
    });
    console.log("  ✓", SORTIE);
  } finally {
    await navigateur.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
