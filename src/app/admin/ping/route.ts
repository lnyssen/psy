/**
 * Signal d'activité : la page l'envoie quand quelqu'un travaille sans changer
 * de page (écrire une note, remplir un formulaire). La prolongation de la
 * session est faite par le proxy ; sans session valide, c'est lui qui
 * redirige avant même d'arriver ici.
 */
export function POST() {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
