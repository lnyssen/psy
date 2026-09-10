import type { MetadataRoute } from "next";

/**
 * Le site public s'indexe, l'outil jamais.
 *
 * Les pages d'admin portaient déjà une balise « noindex », qui demande à un
 * robot de ne pas publier ce qu'il a lu. Ceci lui demande de ne pas le lire :
 * la nuance compte pendant une démonstration sans mot de passe, où la première
 * ligne de défense n'est plus la session mais l'ignorance de l'adresse.
 *
 * Les reçus sont exclus au même titre : ils portent un nom, une adresse et un
 * montant, et n'ont rien à faire dans un index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: ["/admin", "/connexion", "/api/"] },
  };
}
