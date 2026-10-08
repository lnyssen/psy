import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Chiffrement d'un secret avant son stockage en base (AES-256-GCM).
 *
 * Sert au jeton de rafraîchissement Google : il donne accès à l'agenda
 * d'Amandine, donc à des données de santé. La clé vit dans l'environnement,
 * jamais dans la base — une copie de la base seule ne livre rien.
 *
 * Format stocké : v1.<iv>.<tag>.<texte chiffré>, chaque morceau en base64url.
 * Le préfixe de version permet de changer d'algorithme sans casser l'existant.
 */
function cle(): Buffer {
  const b64 = process.env.GOOGLE_TOKEN_KEY;
  if (!b64) throw new Error("GOOGLE_TOKEN_KEY est absente.");
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32) {
    throw new Error("GOOGLE_TOKEN_KEY doit contenir 32 octets encodés en base64.");
  }
  return k;
}

export function chiffrer(clair: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cle(), iv);
  const chiffre = Buffer.concat([c.update(clair, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return ["v1", iv, tag, chiffre].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function dechiffrer(stocke: string): string {
  const [version, iv, tag, chiffre] = stocke.split(".");
  if (version !== "v1" || !iv || !tag || !chiffre) throw new Error("Secret stocké illisible.");
  const d = createDecipheriv("aes-256-gcm", cle(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(chiffre, "base64url")), d.final()]).toString("utf8");
}
