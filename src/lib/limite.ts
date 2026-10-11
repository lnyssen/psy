/**
 * Garde-fou contre les essais en rafale (mot de passe, réinitialisation).
 *
 * En mémoire, par processus : l'application tourne en un seul exemplaire, et un
 * redémarrage remet les compteurs à zéro — c'est acceptable pour freiner un
 * robot, pas pour arrêter un adversaire patient. La clé est l'adresse du
 * demandeur : bloquer tout le monde après N essais verrouillerait aussi la
 * praticienne.
 */
const essais = new Map<string, number[]>();

/** Enregistre un essai et dit si le plafond est dépassé. */
export function tropd(cle: string, max: number, fenetreMs: number) {
  const maintenant = Date.now();
  const recents = (essais.get(cle) ?? []).filter((t) => maintenant - t < fenetreMs);
  if (recents.length >= max) {
    essais.set(cle, recents);
    return true;
  }
  recents.push(maintenant);
  essais.set(cle, recents);
  return false;
}

export function adresseDe(h: Headers) {
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "inconnue";
}
