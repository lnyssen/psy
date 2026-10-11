import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { headers } from "next/headers";
import { adresseDuSite, poserDefi } from "@/lib/acces";
import { adresseDe, tropd } from "@/lib/limite";

/**
 * Début d'une connexion par appareil (Face ID…). Publique, puisqu'on n'est pas
 * encore connecté : elle ne révèle rien — le défi est aléatoire et aucune liste
 * d'appareils n'est envoyée, l'appareil retrouve lui-même sa clé.
 */
export async function POST() {
  if (tropd(`passkey:${adresseDe(await headers())}`, 30, 15 * 60_000)) {
    return Response.json({ message: "Trop d’essais. Réessayez dans un quart d’heure." }, { status: 429 });
  }
  const { rpID } = await adresseDuSite();
  const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
  await poserDefi(options.challenge);
  return Response.json(options);
}
