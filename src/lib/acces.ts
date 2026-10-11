import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/**
 * Accès à l'outil : mot de passe, appareils enregistrés, récupération.
 *
 * Le mot de passe d'origine est une empreinte bcrypt dans l'environnement (voir
 * l'ancien commentaire de lib/auth-actions.ts : encodée en base64 pour que les
 * chargeurs de .env ne la tronquent pas). Dès que le mot de passe est changé
 * depuis les réglages, l'empreinte vit en base et prend le pas ; l'environnement
 * reste le recours si la ligne est vidée.
 */
function empreinteEnvironnement() {
  const b64 = process.env.AUTH_PASSWORD_HASH_B64;
  if (b64) return Buffer.from(b64, "base64").toString("utf8");
  return process.env.AUTH_PASSWORD_HASH ?? "";
}

export async function empreinteAttendue() {
  const acces = await prisma.acces.findUnique({ where: { id: "global" } });
  return acces?.passwordHash || empreinteEnvironnement();
}

export async function motDePasseValide(motDePasse: string) {
  const empreinte = await empreinteAttendue();
  if (!empreinte) return false;
  // Délai constant, même quand le mot de passe est vide.
  return bcrypt.compare(motDePasse, empreinte);
}

export async function definirMotDePasse(motDePasse: string) {
  const passwordHash = await bcrypt.hash(motDePasse, 12);
  await prisma.acces.upsert({
    where: { id: "global" },
    update: { passwordHash },
    create: { id: "global", passwordHash },
  });
}

// --- Adresse du site, sans croire l'en-tête Host -------------------------------

/**
 * Un lien de réinitialisation envoyé par e-mail ne doit jamais être construit
 * d'après l'en-tête Host de la requête : un tiers pourrait le falsifier, et le
 * lien — jeton valide compris — pointerait vers son propre site. Seuls les
 * hôtes de la liste sont reconnus ; tout autre retombe sur le domaine du site.
 */
const HOTES_CONNUS = [
  "amandinemonsel.be",
  "admin.amandinemonsel.be",
  "localhost",
  "pratique-psy.vercel.app",
];
const HOTE_PAR_DEFAUT = "amandinemonsel.be";

export async function adresseDuSite() {
  const h = await headers();
  const brut = (h.get("x-forwarded-host") ?? h.get("host") ?? "")
    .split(",")[0]
    .trim();
  const sansPort = brut.replace(/:\d+$/, "");
  const connu = HOTES_CONNUS.includes(sansPort);
  const hote = connu ? brut : HOTE_PAR_DEFAUT;
  const local = hote.startsWith("localhost");
  const protocole = local ? "http" : "https";
  return {
    origine: `${protocole}://${hote}`,
    // Les appareils enregistrés valent pour le domaine et son sous-domaine admin.
    rpID: (connu ? sansPort : HOTE_PAR_DEFAUT).replace(/^admin\./, ""),
  };
}

// --- Défi WebAuthn : un cookie signé, valable cinq minutes ----------------------

const COOKIE_DEFI = "amapsy_defi";

function signer(valeur: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET est absente.");
  return createHmac("sha256", secret).update(valeur).digest("base64url");
}

export async function poserDefi(defi: string) {
  const charge = Buffer.from(
    JSON.stringify({ d: defi, e: Date.now() + 5 * 60_000 }),
  ).toString("base64url");
  (await cookies()).set(COOKIE_DEFI, `${charge}.${signer(charge)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/passkey",
    maxAge: 300,
  });
}

/** Lit le défi et le consomme : un défi ne sert qu'une fois. */
export async function consommerDefi(): Promise<string | null> {
  const jar = await cookies();
  const valeur = jar.get(COOKIE_DEFI)?.value;
  jar.delete({ name: COOKIE_DEFI, path: "/api/passkey" });
  if (!valeur) return null;
  const [charge, signature] = valeur.split(".");
  if (!charge || !signature) return null;
  const attendue = signer(charge);
  if (attendue.length !== signature.length) return null;
  if (!timingSafeEqual(Buffer.from(attendue), Buffer.from(signature)))
    return null;
  try {
    const { d, e } = JSON.parse(
      Buffer.from(charge, "base64url").toString("utf8"),
    ) as { d: string; e: number };
    return e > Date.now() ? d : null;
  } catch {
    return null;
  }
}

export function empreinteJeton(jeton: string) {
  return createHash("sha256").update(jeton).digest("hex");
}
