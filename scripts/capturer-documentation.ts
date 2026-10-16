/**
 * Captures d'écran de la documentation, à partir de l'application tournant sur
 * une base fictive (voir seed-documentation.ts) : jamais de données réelles.
 *
 *   npm i --no-save puppeteer-core
 *   DATABASE_URL=postgresql://docs@localhost:5544/docs DIRECT_URL=$DATABASE_URL SMTP_HOST= … next start -p 3100
 *   (SMTP_HOST vide : `next start` charge .env.production et ses vrais
 *   identifiants SMTP ; vide, aucun e-mail ne peut partir pendant les essais.)
 *   (Le serveur lit aussi STATUT_SAUVEGARDE=/tmp/docs-sauvegarde.json et
 *   STATUT_RESTAURATION=/tmp/docs-restauration.json, que ce script écrit avec des
 *   dates du jour, et SMTP_HOST=smtp.example.invalid : « .invalid » ne se résout
 *   jamais, rien ne peut partir, mais l'envoi d'e-mails paraît branché.)
 *   npx tsx scripts/capturer-documentation.ts
 *
 * Les images sont converties en WebP dans public/documentation/.
 */
import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
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
async function capturer(page: Page, nom: string, chemin: string, opts: { selecteur?: string; ouvrir?: string; pleine?: boolean; hauteurMax?: number } = {}) {
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
    // Un élément très haut (un long formulaire) se coupe en haut : une capture
    // de 3 600 px de haut est illisible, réduite à la largeur d'une page.
    if (opts.hauteurMax) {
      await el.evaluate((e) => e.scrollIntoView({ block: "start" }));
      await attendre(500);
      const boite = await el.boundingBox();
      if (boite) {
        const image = await page.screenshot({
          type: "png",
          captureBeyondViewport: true,
          clip: { x: boite.x, y: boite.y + (await page.evaluate(() => window.scrollY)), width: boite.width, height: Math.min(boite.height, opts.hauteurMax) },
        });
        await enregistrer(image, nom);
        return;
      }
    }
    await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await attendre(500);
    await enregistrer(await el.screenshot({ type: "png" }), nom);
    return;
  }
  await enregistrer(await page.screenshot({ type: "png", fullPage: opts.pleine ?? false }), nom);
}

/** Statuts de sauvegarde et de restauration fictifs, datés de ce matin. */
function ecrireStatuts() {
  const maintenant = new Date().toISOString();
  writeFileSync("/tmp/docs-sauvegarde.json", JSON.stringify({ date: maintenant, fichier: "psy-docs.dump.gpg", taille: 3_400_000, nombre: 30 }));
  writeFileSync("/tmp/docs-restauration.json", JSON.stringify({ date: maintenant, ok: true, fichier: "psy-docs.dump.gpg", patients: 9, seances: 36, motif: "réussi" }));
}

/** Une requête SQL sur la base jetable, jamais sur une autre. */
function sql(requete: string) {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@localhost:5544\/docs$/.test(url)) throw new Error("Refusé : base non jetable.");
  execFileSync("psql", [url, "-X", "-q", "-c", requete]);
}

async function main() {
  ecrireStatuts();
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

    // La carte « À compléter » : on retire un instant l'adresse de récupération
    // et l'IBAN pour qu'elle ait quelque chose à dire, puis on les remet.
    sql(`UPDATE acces SET recovery_email = NULL; UPDATE parametres SET iban = NULL`);
    try {
      await capturer(page, "a-completer", "/admin", { selecteur: "details:has(summary)" });
    } finally {
      sql(`UPDATE acces SET recovery_email = 'praticienne@example.invalid'; UPDATE parametres SET iban = 'BE68 5390 0754 7034'`);
    }

    // Vue scindée : « Voir la fiche » d'une séance à trancher, à droite de la liste.
    const large = await navigateur.newPage();
    await large.setCookie({ name: "amapsy_session", value: jeton(), url: BASE });
    await large.setViewport({ width: 1400, height: 940, deviceScaleFactor: 2 });
    await large.goto(`${BASE}/admin`, { waitUntil: "load" });
    await attendre(1500);
    await large.evaluate(() => {
      const d = [...document.querySelectorAll("details")].find((x) => x.textContent?.includes("Voir les"));
      if (d) d.open = true;
    });
    const ligne = await large.$("section ul li a[href^='/admin/patients/']");
    if (ligne) {
      await ligne.click();
      await attendre(2500);
      await enregistrer(await large.screenshot({ type: "png" }), "aujourdhui-scindee");
    } else console.log("  ✗ aujourdhui-scindee (aucune séance à trancher)");

    // Créneaux libres proposés pour déplacer une séance : semaine prochaine.
    const lundiProchain = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    await large.goto(`${BASE}/admin/semaine?semaine=${lundiProchain}`, { waitUntil: "load" });
    await attendre(1500);
    const proposer = await large.$("button[aria-label^='Proposer d’autres créneaux']");
    if (proposer) {
      await proposer.evaluate((b) => (b as HTMLElement).click());
      await attendre(2500);
      await large.evaluate(() => window.scrollTo(0, 0));
      await enregistrer(await large.screenshot({ type: "png", clip: { x: 240, y: 0, width: 1160, height: 640 } }), "agenda-creneaux");
    } else console.log("  ✗ agenda-creneaux (aucune séance à venir la semaine prochaine)");
    await large.close();
    await capturer(page, "agenda", "/admin/semaine");
    await capturer(page, "agenda-nouvelle-seance", "/admin/semaine", { ouvrir: "Nouvelle séance", selecteur: "details" });

    await capturer(page, "patients", "/admin/patients");
    // La fiche d'un patient fictif, repérée par son nom dans la liste.
    await page.goto(`${BASE}/admin/patients`, { waitUntil: "load" });
    const lien = await page.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("Emma Peeters"))?.getAttribute("href"));
    if (lien) {
      await capturer(page, "patient-fiche", lien, { pleine: true });
      await capturer(page, "patient-modifier", lien, { ouvrir: "Modifier la fiche", selecteur: "#modifier-fiche", hauteurMax: 900 });
      await capturer(page, "patient-documents", lien, { selecteur: "#documents" });
      await capturer(page, "patient-rgpd", lien, { ouvrir: "Données personnelles", selecteur: "#donnees" });
    }
    // L'attestation, sur un patient privé : la case « montants » y figure.
    await page.goto(`${BASE}/admin/patients`, { waitUntil: "load" });
    const lienPrive = await page.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("Lucas Martin"))?.getAttribute("href"));
    if (lienPrive) await capturer(page, "patient-attestation", lienPrive, { ouvrir: "Attestation", selecteur: "#attestation" });
    await capturer(page, "patient-nouveau", "/admin/patients/nouveau", { pleine: true });
    await capturer(page, "import", "/admin/patients/import");
    await capturer(page, "doublons", "/admin/patients/doublons");

    await capturer(page, "demandes", "/admin/demandes");
    await capturer(page, "facturation", "/admin/facturation");
    await capturer(page, "facturation-relances", "/admin/facturation", { selecteur: "#relances" });
    await capturer(page, "etablissements", "/admin/etablissements");
    await capturer(page, "depenses", "/admin/depenses");
    await capturer(page, "finance", "/admin/finance");
    await capturer(page, "ppl", "/admin/ppl");
    await capturer(page, "statistiques", "/admin/statistiques");
    await capturer(page, "google", "/admin/google");

    for (const [nom, id] of [
      ["reglages-ouverture", "ouverture"], ["reglages-rythme", "rythme"], ["reglages-horaires", "horaires"], ["reglages-tarifs", "tarifs"],
      ["reglages-identite", "identite"], ["reglages-apparence", "apparence"], ["reglages-securite", "securite"], ["reglages-navigateurs", "navigateurs"], ["reglages-sauvegardes", "sauvegardes"], ["reglages-hors-ligne", "hors-ligne"], ["reglages-lieux", "lieux"],
    ] as const) {
      await capturer(page, nom, "/admin/reglages", { selecteur: `#${id}`, hauteurMax: nom === "reglages-lieux" ? 1400 : undefined });
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
