import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from "@simplewebauthn/server";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { adresseDuSite, consommerDefi } from "@/lib/acces";
import { adresseDe, tropd } from "@/lib/limite";
import { COOKIE_SESSION, creerJeton, optionsCookie } from "@/lib/session";
import { noterConnexion } from "@/lib/appareils";

/** Fin de la connexion par appareil : si la signature est bonne, la session s'ouvre. */
export async function POST(req: Request) {
  if (tropd(`passkey-v:${adresseDe(await headers())}`, 30, 15 * 60_000)) {
    return Response.json({ ok: false, message: "Trop d’essais. Réessayez dans un quart d’heure." }, { status: 429 });
  }
  const reponse = (await req.json().catch(() => null)) as AuthenticationResponseJSON | null;
  const defi = await consommerDefi();
  if (!reponse?.id || !defi) {
    return Response.json({ ok: false, message: "La demande a expiré. Recommencez." }, { status: 400 });
  }

  const cle = await prisma.passkey.findUnique({ where: { credentialId: reponse.id } });
  if (!cle) {
    return Response.json({ ok: false, message: "Cet appareil n’est pas enregistré." }, { status: 401 });
  }

  const { origine, rpID } = await adresseDuSite();
  try {
    const verification = await verifyAuthenticationResponse({
      response: reponse,
      expectedChallenge: defi,
      expectedOrigin: [origine, origine.replace("://", "://admin.")],
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: cle.credentialId,
        publicKey: new Uint8Array(cle.publicKey),
        counter: cle.counter,
        transports: cle.transports ? cle.transports.split(",") : undefined,
      },
    });
    if (!verification.verified) {
      return Response.json({ ok: false, message: "La vérification a échoué." }, { status: 401 });
    }
    await prisma.passkey.update({
      where: { id: cle.id },
      data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() },
    });
    (await cookies()).set(COOKIE_SESSION, await creerJeton(), optionsCookie);
    await noterConnexion("Face ID, Touch ID ou empreinte");
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Connexion par appareil impossible :", e);
    return Response.json({ ok: false, message: "La vérification a échoué." }, { status: 401 });
  }
}
