import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSION, jetonValide } from "@/lib/session";

/**
 * Tout est fermé par défaut. Deux exceptions, et deux seulement :
 *
 * - l'écran de connexion, sans quoi on ne pourrait jamais entrer ;
 * - le flux iCalendar, qui porte sa propre authentification par jeton dans
 *   l'adresse — un agenda abonné ne sait pas présenter de cookie.
 */
const OUVERT = ["/connexion", "/api/agenda"];

export async function middleware(req: NextRequest) {
  const chemin = req.nextUrl.pathname;
  if (OUVERT.some((p) => chemin.startsWith(p))) return NextResponse.next();

  if (await jetonValide(req.cookies.get(COOKIE_SESSION)?.value)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/connexion";
  // On retient la page demandée pour y revenir après déverrouillage.
  url.searchParams.set("suite", chemin + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|favicon.ico).*)"],
};
