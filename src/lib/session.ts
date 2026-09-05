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
 * node:crypto : le middleware s'exécute sur le runtime Edge, où ce dernier
 * n'existe pas.
 */
const NOM_COOKIE = "amapsy_session";
const DUREE_MS = 8 * 60 * 60 * 1000; // une journée de consultation

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

export async function creerJeton() {
  const expiration = String(Date.now() + DUREE_MS);
  const signature = await crypto.subtle.sign(
    "HMAC",
    await cle(),
    new TextEncoder().encode(expiration),
  );
  return `${expiration}.${versBase64Url(signature)}`;
}

export async function jetonValide(jeton: string | undefined) {
  if (!jeton) return false;
  const [expiration, signature] = jeton.split(".");
  if (!expiration || !signature) return false;
  if (Number(expiration) < Date.now()) return false;

  const attendue = versBase64Url(
    await crypto.subtle.sign("HMAC", await cle(), new TextEncoder().encode(expiration)),
  );
  // Comparaison à durée constante.
  if (attendue.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < attendue.length; i++) diff |= attendue.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

export const optionsCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: DUREE_MS / 1000,
};
