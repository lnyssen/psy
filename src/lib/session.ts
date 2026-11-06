/**
 * Session : un cookie signé, rien de plus.
 *
 * L'application n'a qu'une utilisatrice. Une base d'utilisateurs, des rôles et
 * un fournisseur d'identité seraient une machinerie sans objet ; ce qu'il faut,
 * c'est que personne d'autre n'entre.
 *
 * Le cookie ne porte qu'une date d'expiration et sa signature. Il ne contient
 * aucune donnée exploitable, il est httpOnly, SameSite=Lax et Secure hors
 * développement. La signature passe par Web Crypto plutôt que par le module
 * node:crypto : l'ancien « middleware » tournait sur le runtime Edge, où ce
 * dernier n'existe pas. Le proxy actuel tourne sous Node et accepterait les
 * deux ; Web Crypto est conservé, il marche partout.
 */
const NOM_COOKIE = "amapsy_session";
// Une session ne vit que trente minutes, mais se prolonge à chaque activité :
// le proxy renouvelle le cookie à chaque requête de l'outil, et la page
// signale elle-même les gestes qui n'en produisent pas (taper une note).
// Trente minutes sans rien : la session est caduque, côté serveur aussi.
export const DUREE_MS = 30 * 60 * 1000;

export const COOKIE_SESSION = NOM_COOKIE;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET est absente.");
  return s;
}

async function cle() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function versBase64Url(octets: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(octets)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Qui est connecté : la praticienne, sur les vraies données, ou le
 * développeur, sur une base fictive à part (voir lib/db.ts). Le rôle est signé
 * avec l'expiration : il ne se change pas à la main dans le cookie.
 */
export type Role = "praticienne" | "developpeur";
const MARQUE_DEV = "~dev";

export async function creerJeton(role: Role = "praticienne") {
  const charge = `${Date.now() + DUREE_MS}${role === "developpeur" ? MARQUE_DEV : ""}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await cle(),
    new TextEncoder().encode(charge),
  );
  return `${charge}.${versBase64Url(signature)}`;
}

/** Le rôle d'une session valide, ou null (absente, expirée, falsifiée). */
export async function roleDuJeton(jeton: string | undefined): Promise<Role | null> {
  if (!jeton) return null;
  const [charge, signature] = jeton.split(".");
  if (!charge || !signature) return null;
  const developpeur = charge.endsWith(MARQUE_DEV);
  const expiration = developpeur ? charge.slice(0, -MARQUE_DEV.length) : charge;
  if (!/^\d+$/.test(expiration) || Number(expiration) < Date.now()) return null;

  const attendue = versBase64Url(
    await crypto.subtle.sign("HMAC", await cle(), new TextEncoder().encode(charge)),
  );
  // Comparaison à durée constante.
  if (attendue.length !== signature.length) return null;
  let diff = 0;
  for (let i = 0; i < attendue.length; i++) diff |= attendue.charCodeAt(i) ^ signature.charCodeAt(i);
  if (diff !== 0) return null;
  return developpeur ? "developpeur" : "praticienne";
}

export async function jetonValide(jeton: string | undefined) {
  return (await roleDuJeton(jeton)) !== null;
}

export const optionsCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: DUREE_MS / 1000,
};
