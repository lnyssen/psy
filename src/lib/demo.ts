/**
 * Démonstration ouverte.
 *
 * Le temps de faire visiter l'outil, la variable DEMO_OUVERTE=1 lève le mot de
 * passe. Le code d'authentification reste entier : on ne l'arrache pas pour le
 * remettre ensuite, on le contourne par un interrupteur, et le retour en
 * arrière tient en une commande.
 *
 * Trois conséquences, qu'il vaut mieux avoir en tête que découvrir :
 *
 *   — l'outil devient lisible et modifiable par quiconque connaît l'adresse.
 *     L'instance ne doit donc porter que des données fictives, ce qui est le
 *     cas de celle-ci et doit le rester ;
 *   — les reçus de /api/recu/… étaient déjà atteignables sans session ; ils le
 *     restent, et le sujet ne devient pas moins urgent ;
 *   — un bandeau le dit à l'écran et robots.txt interdit l'exploration de
 *     /admin, pour qu'aucun moteur n'en garde une copie.
 *
 * La valeur est lue à chaque appel plutôt que figée à l'import : l'intergiciel
 * s'exécute en périphérie, où une constante de module peut survivre au
 * déploiement suivant.
 */
export function demoOuverte() {
  return process.env.DEMO_OUVERTE === "1";
}
