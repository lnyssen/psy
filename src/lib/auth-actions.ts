"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { COOKIE_SESSION, creerJeton, optionsCookie } from "@/lib/session";

/**
 * Le mot de passe n'est pas stocké, seulement son empreinte bcrypt, tenue dans
 * une variable d'environnement plutôt qu'en base : c'est le seul secret qui
 * n'a aucune raison de vivre à côté des données qu'il protège.
 *
 * Elle y est encodée en base64. Une empreinte bcrypt commence par « $2b$12$ »,
 * et les chargeurs de fichiers .env — celui de Next comme les autres — voient
 * dans « $2b » une référence de variable et la remplacent par du vide.
 * L'empreinte arrivait donc tronquée, et toute comparaison échouait. Encoder
 * supprime la classe de bug entière plutôt que de l'échapper au cas par cas.
 */
function empreinteAttendue() {
  const b64 = process.env.AUTH_PASSWORD_HASH_B64;
  if (b64) return Buffer.from(b64, "base64").toString("utf8");
  return process.env.AUTH_PASSWORD_HASH ?? "";
}
export async function seConnecter(_etat: string | null, f: FormData): Promise<string | null> {
  const empreinte = empreinteAttendue();
  if (!empreinte) return "L’authentification n’est pas configurée sur ce serveur.";

  const motDePasse = String(f.get("motDePasse") ?? "");
  const suite = String(f.get("suite") ?? "/");

  // Délai constant, même quand le mot de passe est vide : ne rien révéler par
  // le temps de réponse.
  const bon = await bcrypt.compare(motDePasse, empreinte);
  if (!bon) return "Mot de passe incorrect.";

  const jar = await cookies();
  jar.set(COOKIE_SESSION, await creerJeton(), optionsCookie);

  // Ne rediriger que vers un chemin interne : une valeur venue de l'URL ne doit
  // jamais pouvoir emmener ailleurs.
  redirect(suite.startsWith("/") && !suite.startsWith("//") ? suite : "/admin");
}

/**
 * Verrouiller, c'est détruire la session — pas la masquer. Un écran seulement
 * caché resterait déverrouillé pour qui rouvre l'onglet ou lit la mémoire du
 * navigateur.
 */
export async function verrouiller() {
  const jar = await cookies();
  jar.delete(COOKIE_SESSION);
  redirect("/connexion?verrouille=1");
}
