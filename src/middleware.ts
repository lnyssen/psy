import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSION, jetonValide } from "@/lib/session";
import { demoOuverte } from "@/lib/demo";

/**
 * Deux domaines, une seule application.
 *
 * Le site public vit à la racine ; l'outil vit sous /admin et n'est jamais
 * atteignable sans session. Quand la requête arrive sur le sous-domaine
 * « admin. », elle est réécrite vers /admin : l'adresse publique et l'adresse
 * de travail ne se recouvrent donc jamais, et rien du site ne trahit
 * l'existence de l'outil.
 *
 * Le flux iCalendar reste ouvert : il porte sa propre authentification par
 * jeton dans l'adresse, un agenda abonné ne sachant pas présenter de cookie.
 */
export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const chemin = url.pathname;
  const hote = req.headers.get("host") ?? "";
  const surSousDomaineAdmin = hote.startsWith("admin.");

  if (chemin.startsWith("/api/agenda")) return NextResponse.next();

  // Sur admin.…, la racine est l'outil.
  if (surSousDomaineAdmin && !chemin.startsWith("/admin") && chemin !== "/connexion") {
    const vers = url.clone();
    vers.pathname = `/admin${chemin === "/" ? "" : chemin}`;
    return NextResponse.rewrite(vers);
  }

  const protege = chemin.startsWith("/admin");
  if (!protege) return NextResponse.next();

  // Démonstration ouverte : la garde est levée, pas retirée. Voir lib/demo.ts.
  if (demoOuverte()) return NextResponse.next();

  if (await jetonValide(req.cookies.get(COOKIE_SESSION)?.value)) return NextResponse.next();

  const vers = url.clone();
  vers.pathname = "/connexion";
  vers.searchParams.set("suite", chemin + url.search);
  return NextResponse.redirect(vers);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|favicon.ico).*)"],
};
