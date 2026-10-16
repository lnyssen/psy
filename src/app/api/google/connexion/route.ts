import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { demoOuverte } from "@/lib/demo";
import { adresseRetour, googleConfigure, urlAutorisation } from "@/lib/google-api";
import { COOKIE_SESSION, jetonValide } from "@/lib/session";

/**
 * Début de l'autorisation Google : renvoie vers l'écran de consentement.
 *
 * Cette route est hors de /admin et échappe donc au proxy : la session
 * se vérifie ici, à la main. Sans cela, n'importe qui pourrait brancher son
 * propre compte Google sur l'outil.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const origine = new URL(req.url).origin;
  const reglages = (code: string) => NextResponse.redirect(`${origine}/admin/reglages?google=${code}`);

  if (!(await jetonValide((await cookies()).get(COOKIE_SESSION)?.value)) && !demoOuverte()) {
    return NextResponse.redirect(`${origine}/connexion?suite=/admin/reglages`);
  }
  // Même en démonstration ouverte : l'outil y est public, l'agenda d'Amandine
  // ne doit pas s'y brancher.
  if (demoOuverte()) return reglages("demo");
  if (!googleConfigure()) return reglages("config");

  const state = randomUUID();
  const res = NextResponse.redirect(urlAutorisation(adresseRetour(req), state));
  res.cookies.set("google_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/google",
    maxAge: 600,
  });
  return res;
}
