import { generateRegistrationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { refusSansSession } from "@/lib/garde";
import { adresseDuSite, poserDefi } from "@/lib/acces";

/**
 * Début de l'enregistrement d'un appareil (Face ID, Touch ID…). Réservé à une
 * session ouverte : on n'ajoute pas un appareil sans être déjà dedans.
 *
 * L'authentificateur demandé est celui de l'appareil lui-même, avec une clé
 * « résidente » : c'est elle qui permet d'ouvrir l'outil d'un geste, sans taper
 * ni nom ni mot de passe.
 */
export async function POST() {
  const refus = await refusSansSession();
  if (refus) return refus;

  const { rpID } = await adresseDuSite();
  const existants = await prisma.passkey.findMany({ select: { credentialId: true, transports: true } });

  const options = await generateRegistrationOptions({
    rpName: "Amandine Monsel",
    rpID,
    userName: "amandine",
    userDisplayName: "Amandine Monsel",
    userID: new TextEncoder().encode("amapsy-utilisatrice"),
    attestationType: "none",
    excludeCredentials: existants.map((p) => ({
      id: p.credentialId,
      transports: p.transports ? p.transports.split(",") : undefined,
    })),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      userVerification: "required",
    },
  });
  await poserDefi(options.challenge);
  return Response.json(options);
}
