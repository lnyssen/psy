/** Qui assiste à une séance, en plus du patient (enum Participants). */
export const PARTICIPANTS = [
  { valeur: "INDIVIDUELLE", libelle: "Individuelle", court: "" },
  { valeur: "AVEC_PERE", libelle: "Avec le père", court: "avec père" },
  { valeur: "AVEC_MERE", libelle: "Avec la mère", court: "avec mère" },
  { valeur: "AVEC_PARENTS", libelle: "Avec les parents", court: "avec parents" },
] as const;

export type ValeurParticipants = (typeof PARTICIPANTS)[number]["valeur"];

/** La valeur reçue d'un formulaire, ramenée à une valeur connue. */
export function participantsDepuis(v: unknown): ValeurParticipants {
  return PARTICIPANTS.find((p) => p.valeur === v)?.valeur ?? "INDIVIDUELLE";
}

/** Mention courte pour l'agenda et l'historique (vide pour une séance seule). */
export function mentionParticipants(v: string | null | undefined): string {
  return PARTICIPANTS.find((p) => p.valeur === v)?.court ?? "";
}
