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
 *
 * Deux clés, deux usages : GOOGLE_TOKEN_KEY pour le jeton Google, NOTES_KEY
 * pour les notes de séance. Séparées pour qu'une reconnexion Google (qui peut
 * amener à changer sa clé) ne rende jamais les notes cliniques illisibles.
 * Perdre NOTES_KEY, c'est perdre les notes : elle se garde dans le
 * gestionnaire de mots de passe, comme la clé des sauvegardes.
 */
type NomCle = "GOOGLE_TOKEN_KEY" | "NOTES_KEY";

function cle(nom: NomCle): Buffer {
  const b64 = process.env[nom];
  if (!b64) throw new Error(`${nom} est absente.`);
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32) {
    throw new Error(`${nom} doit contenir 32 octets encodés en base64.`);
  }
  return k;
}

/** Vrai si NOTES_KEY est présente et bien formée : sans elle, l'écran des notes
 *  de séance le dit au lieu de planter. */
export function cleNotesPresente() {
  try {
    cle("NOTES_KEY");
    return true;
  } catch {
    return false;
  }
}

export function chiffrer(clair: string, nom: NomCle = "GOOGLE_TOKEN_KEY"): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cle(nom), iv);
  const chiffre = Buffer.concat([c.update(clair, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return ["v1", iv, tag, chiffre].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function dechiffrer(stocke: string, nom: NomCle = "GOOGLE_TOKEN_KEY"): string {
  const [version, iv, tag, chiffre] = stocke.split(".");
  if (version !== "v1" || !iv || !tag || !chiffre) throw new Error("Secret stocké illisible.");
  const d = createDecipheriv("aes-256-gcm", cle(nom), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(chiffre, "base64url")), d.final()]).toString("utf8");
}
