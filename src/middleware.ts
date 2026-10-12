import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSION, creerJeton, jetonValide, optionsCookie } from "@/lib/session";
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

  // Le flux iCalendar a son jeton ; les routes Google vérifient elles-mêmes la
  // session (le retour d'autorisation arrive de chez Google, sans réécriture
  // possible vers /admin).
  if (chemin.startsWith("/api/agenda") || chemin.startsWith("/api/google")) return NextResponse.next();

  // Sur admin.…, la racine est l'outil.
  if (
    surSousDomaineAdmin &&
    !chemin.startsWith("/admin") &&
    !chemin.startsWith("/connexion") &&
    !chemin.startsWith("/api/passkey")
  ) {
    const vers = url.clone();
    vers.pathname = `/admin${chemin === "/" ? "" : chemin}`;
    return NextResponse.rewrite(vers);
  }

  const protege = chemin.startsWith("/admin");
  if (!protege) return NextResponse.next();

  // Démonstration ouverte : la garde est levée, pas retirée. Voir lib/demo.ts.
  if (demoOuverte()) return NextResponse.next();

  if (await jetonValide(req.cookies.get(COOKIE_SESSION)?.value)) {
    const reponse = NextResponse.next();
    // Session glissante : seuls les gestes réels la prolongent — une page
    // chargée en entier, un envoi (action serveur, signal d'activité). Pas les
    // requêtes GET que le navigateur lance seul, comme le préchargement des
    // liens : Next retire ses en-têtes de préchargement avant l'intergiciel,
    // on ne peut donc pas les reconnaître, mais elles n'acceptent jamais du
    // HTML. Une page laissée ouverte ne doit pas rester vivante parce qu'elle
    // précharge. Les changements de page sans rechargement, eux, sont couverts
    // par le signal que la page envoie toutes les cinq minutes d'activité.
    const geste =
      req.method !== "GET" ||
      (req.headers.get("accept") ?? "").includes("text/html");
    if (geste)
      reponse.cookies.set(COOKIE_SESSION, await creerJeton(), optionsCookie);
    return reponse;
  }

  const vers = url.clone();
  vers.pathname = "/connexion";
  vers.searchParams.set("suite", chemin + url.search);
  return NextResponse.redirect(vers);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|favicon.ico).*)"],
};
