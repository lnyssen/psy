import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { demoOuverte } from "@/lib/demo";
import { COOKIE_SESSION, jetonValide } from "@/lib/session";

/**
 * La garde au plus près des données.
 *
 * Le proxy ne protège que les pages sous /admin. Les routes /api qui
 * servent reçus, factures, exports et photos n'y passent pas, et une action
 * serveur s'appelle par un simple POST portant son identifiant, quelle que soit
 * la page d'où il part : la documentation de Next demande de les traiter comme
 * des points d'API publics. Chacune vérifie donc la session elle-même.
 *
 * Le mode démonstration lève cette garde comme il lève celle de le proxy
 * (voir lib/demo.ts) : un seul interrupteur, pas deux.
 *
 * Fichier séparé de lib/session.ts : celui-ci tourne aussi en périphérie, où
 * next/headers n'a rien à faire.
 */
export async function sessionValide() {
  if (demoOuverte()) return true;
  return jetonValide((await cookies()).get(COOKIE_SESSION)?.value);
}

/** Pour les actions serveur : sans session, retour à l'écran de connexion. */
export async function exigerSession() {
  if (!(await sessionValide())) redirect("/connexion");
}

/** Pour les routes : un 401 plutôt qu'une redirection, le client est souvent un téléchargement. */
export async function refusSansSession() {
  return (await sessionValide()) ? null : new Response("Non autorisé.", { status: 401 });
}
