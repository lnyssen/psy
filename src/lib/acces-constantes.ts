/** Longueur minimale d'un mot de passe : partagée entre le serveur et les formulaires. */
export const LONGUEUR_MINIMALE = 12;

/**
 * Où aller une fois connectée. Seul un chemin interne est accepté — une valeur
 * venue de l'URL ne doit jamais pouvoir emmener ailleurs —, et sans page
 * d'origine (verrouillage, expiration, réinitialisation), « / » compris, on
 * rouvre l'outil : sur le domaine principal, « / » est le site public.
 */
export function cibleApresConnexion(suite: string | null | undefined) {
  if (!suite || suite === "/" || !suite.startsWith("/") || suite.startsWith("//"))
    return "/admin";
  return suite;
}
