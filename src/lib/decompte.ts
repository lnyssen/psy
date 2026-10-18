/**
 * Montant d'un décompte d'heures, à l'euro-centime près, calculé comme le fait
 * le serveur à l'émission (voir enregistrerFactureEtablissementManuelle) : le
 * tarif est d'abord arrondi au centime, puis multiplié par la durée en heures.
 * Ce qu'affiche le formulaire est donc exactement ce qui sera facturé.
 *
 * Rend null quand il manque la durée ou le tarif : le montant se saisit alors
 * à la main (régularisation ponctuelle).
 */
export function montantDecompteCents(
  heures: number,
  minutes: number,
  tarifHoraireEuros: number,
): number | null {
  if (![heures, minutes, tarifHoraireEuros].every(Number.isFinite)) return null;
  if (heures < 0 || minutes < 0 || tarifHoraireEuros <= 0) return null;
  const totalMin = Math.round(heures * 60 + minutes);
  if (totalMin <= 0) return null;
  return Math.round((totalMin / 60) * Math.round(tarifHoraireEuros * 100));
}

/** Saisie décimale tolérante : « 55,5 » et « 55.5 » valent la même chose. */
export function nombreSaisi(texte: string) {
  const t = texte.trim().replace(",", ".");
  return t === "" ? NaN : Number(t);
}
