import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { refusSansSession } from "@/lib/garde";
import { adresseDuSite, consommerDefi } from "@/lib/acces";

/** Fin de l'enregistrement : vérifie la réponse de l'appareil et garde sa clé publique. */
export async function POST(req: Request) {
  const refus = await refusSansSession();
  if (refus) return refus;

  const corps = (await req.json().catch(() => null)) as { response?: RegistrationResponseJSON; nom?: string } | null;
  const defi = await consommerDefi();
  if (!corps?.response || !defi) {
    return Response.json({ ok: false, message: "La demande a expiré. Recommencez." }, { status: 400 });
  }

  const { origine, rpID } = await adresseDuSite();
  try {
    const verification = await verifyRegistrationResponse({
      response: corps.response,
      expectedChallenge: defi,
      expectedOrigin: [origine, origine.replace("://", "://admin.")],
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!verification.verified) {
      return Response.json({ ok: false, message: "L’appareil n’a pas pu être vérifié." }, { status: 400 });
    }
    const { credential } = verification.registrationInfo;
    const nom = String(corps.nom ?? "").trim().slice(0, 60) || "Mon appareil";
    await prisma.passkey.create({
      data: {
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports?.join(",") ?? null,
        nom,
      },
    });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Enregistrement d’appareil impossible :", e);
    return Response.json({ ok: false, message: "L’appareil n’a pas pu être enregistré." }, { status: 400 });
  }
}
