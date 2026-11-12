/**
 * Santé de la synchronisation Google : décide s'il faut prévenir, et comment.
 *
 * L'incident du 11-12 novembre 2026 (rendez-vous effacés, découverts en
 * regardant l'agenda) a montré qu'une synchronisation peut se taire pendant
 * des heures. Ce module ne fait aucun accès : il lit l'état enregistré par
 * `synchroniser()` et dit ce qu'il faut afficher (bandeau) ou envoyer
 * (e-mail). Ainsi les règles se testent sans base ni Google.
 */

/** Message enregistré quand Google a retiré l'accès : rien ne repartira seul. */
export const MESSAGE_REVOQUEE =
  "L’accès à Google a expiré ou a été retiré — reconnectez votre agenda.";

/** Une erreur isolée (réseau, Google qui hoquette) se règle souvent au passage
 *  suivant : on ne dérange qu'à partir de deux échecs d'affilée, ou d'un
 *  problème qui dure depuis plus d'une heure. */
const ECHECS_AVANT_ALERTE = 2;
const DUREE_AVANT_ALERTE_MS = 60 * 60_000;
/** Le passage de secours tourne chaque jour à 5 h, et chaque ouverture de
 *  l'agenda en lance un : au-delà de 26 h sans réussite, quelque chose ne
 *  tourne plus (serveur, tâche planifiée). */
export const RETARD_MS = 26 * 3_600_000;
/** Tant que le problème dure, un rappel par jour, pas un e-mail par passage. */
const RAPPEL_MS = 24 * 3_600_000;

export type EtatSynchro = {
  derniereSynchro: Date | null;
  derniereErreur: string | null;
  echecsConsecutifs: number;
  problemeDepuis: Date | null;
  bloquee: boolean;
  alerteEnvoyeeLe: Date | null;
};

export type Sante =
  | { niveau: "ok" }
  | {
      niveau: "bloquee" | "erreur" | "retard" | "coupee";
      titre: string;
      detail: string;
      depuis: Date | null;
    };

export function santeSynchro(
  c: EtatSynchro | null,
  opts: { configure: boolean; maintenant?: Date },
): Sante {
  // Pas d'agenda connecté : rien à surveiller.
  if (!c) return { niveau: "ok" };
  const maintenant = opts.maintenant ?? new Date();

  // Connecté, mais les identifiants Google ont été retirés du serveur (c'est
  // ainsi qu'on coupe la synchronisation en urgence) : à ne pas oublier.
  if (!opts.configure) {
    return {
      niveau: "coupee",
      titre: "Synchro Google coupée",
      detail:
        "les identifiants Google sont retirés du serveur : l’agenda n’est plus mis à jour dans un sens ni dans l’autre.",
      depuis: null,
    };
  }

  if (c.bloquee) {
    return {
      niveau: "bloquee",
      titre: "Synchro Google retenue par prudence",
      detail: c.derniereErreur ?? "trop de suppressions d’un coup.",
      depuis: c.problemeDepuis,
    };
  }

  if (c.derniereErreur && erreurPersistante(c, maintenant)) {
    return {
      niveau: "erreur",
      titre: "La synchro Google échoue",
      detail: c.derniereErreur,
      depuis: c.problemeDepuis,
    };
  }

  if (c.derniereSynchro && maintenant.getTime() - c.derniereSynchro.getTime() > RETARD_MS) {
    return {
      niveau: "retard",
      titre: "Synchro Google à l’arrêt",
      detail: "aucune synchronisation réussie depuis plus d’une journée.",
      depuis: c.derniereSynchro,
    };
  }

  return { niveau: "ok" };
}

function erreurPersistante(c: EtatSynchro, maintenant: Date) {
  if (c.derniereErreur === MESSAGE_REVOQUEE) return true;
  if (c.echecsConsecutifs >= ECHECS_AVANT_ALERTE) return true;
  return Boolean(
    c.problemeDepuis && maintenant.getTime() - c.problemeDepuis.getTime() > DUREE_AVANT_ALERTE_MS,
  );
}

export type DecisionCourriel = "alerte" | "rappel" | "retablie" | null;

/**
 * Après un passage : faut-il écrire ? Une alerte au premier signe sérieux,
 * un rappel par jour s'il dure, et un mot quand tout est rentré dans l'ordre,
 * pour ne pas laisser un doute derrière soi.
 */
export function decisionCourriel(c: EtatSynchro, maintenant = new Date()): DecisionCourriel {
  const s = santeSynchro(c, { configure: true, maintenant });
  const grave = s.niveau === "bloquee" || s.niveau === "erreur";
  if (grave) {
    if (!c.alerteEnvoyeeLe) return "alerte";
    if (maintenant.getTime() - c.alerteEnvoyeeLe.getTime() > RAPPEL_MS) return "rappel";
    return null;
  }
  if (s.niveau === "ok" && c.alerteEnvoyeeLe && !c.derniereErreur) return "retablie";
  return null;
}
