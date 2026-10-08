import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { demoOuverte } from "@/lib/demo";
import { adresseRetour, echangerCode, googleConfigure } from "@/lib/google-api";
import { enregistrerConnexion, synchroniserApres } from "@/lib/google-sync";
import { COOKIE_SESSION, jetonValide } from "@/lib/session";

/**
 * Retour de Google après le consentement. Trois garde-fous avant d'enregistrer
 * quoi que ce soit : une session valide, un `state` identique à celui posé au
 * départ (contre un retour forgé par un tiers), et jamais en démonstration.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reglages = (code: string) => {
    const res = NextResponse.redirect(`${url.origin}/admin/reglages?google=${code}`);
    res.cookies.delete({ name: "google_state", path: "/api/google" });
    return res;
  };

  const jar = await cookies();
  if (demoOuverte()) return reglages("demo");
  if (!(await jetonValide(jar.get(COOKIE_SESSION)?.value))) {
    return NextResponse.redirect(`${url.origin}/connexion?suite=/admin/reglages`);
  }
  if (!googleConfigure()) return reglages("config");

  const attendu = jar.get("google_state")?.value;
  if (!attendu || attendu !== url.searchParams.get("state")) return reglages("state");
  if (url.searchParams.get("error")) return reglages("refuse");
  const code = url.searchParams.get("code");
  if (!code) return reglages("refuse");

  try {
    const { refreshToken, email } = await echangerCode(code, adresseRetour(req));
    // Pas de jeton de rafraîchissement : Google n'en renvoie qu'à la première
    // autorisation si l'accès n'a pas été retiré entre-temps.
    if (!refreshToken) return reglages("sans-jeton");
    await enregistrerConnexion(email ?? "compte Google", refreshToken);
  } catch {
    return reglages("echec");
  }

  synchroniserApres();
  return reglages("ok");
}
