import type { PaymentStatus, SessionStatus, CareScheme } from "@prisma/client";

/**
 * Vue minimale d'un cabinet, telle que les composants d'affichage en ont
 * besoin. Nom, adresse et couleurs viennent désormais de la base : ce ne sont
 * plus des constantes, et aucun composant ne doit les redéduire.
 */
export type CabinetVue = {
  id: string;
  nom: string;
  addressLine: string;
  postalCode: string;
  city: string;
  colorHex: string;
  fillHex: string;
  vividHex: string;
};

export function adresseCabinet(c: Pick<CabinetVue, "addressLine" | "postalCode" | "city">) {
  return `${c.addressLine}, ${c.postalCode} ${c.city}`;
}

export const SCHEME_LABEL: Record<CareScheme, string> = {
  CONVENTIONNE: "conventionné",
  PRIVE: "privé",
  INSTITUTION: "institution",
};

export const STATUS_LABEL: Record<SessionStatus, string> = {
  SCHEDULED: "à venir",
  ATTENDED: "honorée",
  CANCELLED_IN_TIME: "annulée à temps",
  NO_SHOW: "absence non excusée",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  DUE: "dû",
  PAID: "payé",
  OVERDUE: "en retard",
};

export const METHOD_LABEL: Record<"CASH" | "ELECTRONIC", string> = {
  CASH: "espèces",
  ELECTRONIC: "électronique",
};

/** Durée d'une séance — valeur de repli seulement. La vraie se règle dans les
 *  paramètres de la pratique, et c'est elle qui fait foi partout. */
export const DUREE_SEANCE = 45;

/** Pas de séance le week-end : la grille s'arrête au vendredi, et un créneau
 *  déplacé ne peut pas y atterrir. */
export const JOURS_OUVRES = 5;

/**
 * Le brief pose que le statut de la séance détermine mécaniquement sa
 * facturabilité : c'est une propriété dérivée, jamais stockée. Une annulation
 * à temps ne porte aucun état de paiement ; une absence non excusée en porte
 * un, puisqu'elle reste due.
 */
export function isBillable(status: SessionStatus) {
  return status === "ATTENDED" || status === "NO_SHOW";
}

/**
 * Temps de trajet minimal entre deux cabinets, en minutes — valeur de repli
 * seulement : la vraie se règle dans les paramètres de la pratique.
 *
 * Valeur unique et
 * prudente plutôt qu'une matrice de trajets : tant que les lieux se comptent
 * sur une main et se trouvent tous dans le sud de Bruxelles, une matrice
 * coûterait plus à tenir qu'elle ne rapporterait. À confirmer avec
 * l'utilisatrice.
 */
export const TRAJET_MIN = 30;

/** Total des heures de séance d'un ensemble, en heures décimales. Les séances
 *  annulées à temps n'y comptent pas : elles n'occupent plus le fauteuil. */
export function heuresTotales(seances: { durationMin: number; status: SessionStatus }[]) {
  const minutes = seances
    .filter((s) => s.status !== "CANCELLED_IN_TIME")
    .reduce((n, s) => n + s.durationMin, 0);
  return minutes / 60;
}

/** « 3 h 45 » plutôt que « 3,75 h » : c'est ainsi qu'on lit une journée. */
export function formatDuree(heures: number) {
  const total = Math.round(heures * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export type SeanceLike = { startsAt: Date; durationMin: number; cabinetId: string };

/**
 * Signale, pour chaque séance, qu'elle suit immédiatement une séance dans
 * l'autre cabinet sans temps de trajet suffisant. C'est le principal risque
 * d'agenda d'une pratique sur deux sites, et le seul avertissement que porte
 * l'écran : en ajouter d'autres le banaliserait.
 */
export function conflitsDeTrajet<T extends SeanceLike>(
  seances: T[],
  trajetMin: number = TRAJET_MIN,
): Set<number> {
  const conflits = new Set<number>();
  const tri = [...seances].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  for (let i = 1; i < tri.length; i++) {
    const avant = tri[i - 1];
    const apres = tri[i];
    if (avant.cabinetId === apres.cabinetId) continue;
    const finAvant = avant.startsAt.getTime() + avant.durationMin * 60_000;
    const battement = (apres.startsAt.getTime() - finAvant) / 60_000;
    if (battement < trajetMin) {
      const idx = seances.indexOf(apres);
      if (idx >= 0) conflits.add(idx);
    }
  }
  return conflits;
}

/**
 * Les noms complets sont affichés partout, y compris dans l'agenda : décision
 * explicite de la praticienne, qui prime sur la retenue prévue au brief. La
 * confidentialité repose donc désormais sur le verrouillage rapide de l'écran,
 * et non sur ce que les vues d'ensemble laissent lire.
 *
 * Les initiales restent utilisées là où la place manque : pastilles, listes
 * compactes.
 */
export function nomComplet(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`;
}

export function initiales(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`;
}

const LOCALE = "fr-BE";

/**
 * Fuseau imposé explicitement, jamais déduit de la machine.
 *
 * Le serveur de production tourne en UTC : sans cette contrainte, une séance
 * de 9 h s'affichait à 7 h en ligne alors qu'elle était juste en local. Pour
 * un agenda, l'heure est la donnée, pas une décoration — elle ne peut pas
 * dépendre de l'endroit où le code s'exécute.
 *
 * Le même fuseau gouverne les calculs de dates plus bas. On aurait pu se
 * contenter de fixer la variable d'environnement TZ, mais Vercel en réserve le
 * nom et refuse silencieusement de l'enregistrer : rien dans le code ne doit
 * donc dépendre du fuseau de la machine qui l'exécute.
 */
export const FUSEAU = "Europe/Brussels";

export const fmtHeure = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSEAU,
});
export const fmtJourLong = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: FUSEAU,
});
export const fmtJourCourt = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "2-digit",
  timeZone: FUSEAU,
});
export const fmtNomJour = new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: FUSEAU });
export const fmtJourMois = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  timeZone: FUSEAU,
});
export const fmtJourMoisAn = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: FUSEAU,
});
export const fmtDateCourte = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  timeZone: FUSEAU,
});

export function euros(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" }).format(cents / 100);
}

/*
 * Arithmétique de dates — tout passe par le fuseau ci-dessus.
 *
 * Les accesseurs natifs (getHours, getDate…) lisent le fuseau du processus :
 * justes sur un poste bruxellois, faux de deux heures sur un serveur en UTC.
 * Un agenda ne peut pas se le permettre — une séance de 00 h 30 basculerait de
 * jour, et la grille horaire placerait tout sur la mauvaise ligne.
 */

/** Décalage du fuseau par rapport à UTC, à l'instant donné (heure d'été comprise). */
function decalageMs(d: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: FUSEAU,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const commeUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return commeUtc - d.getTime();
}

/** Année, mois, jour et heure tels qu'ils se lisent à Bruxelles. */
export function partiesJour(d: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: FUSEAU,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return {
    annee: Number(parts.year),
    mois: Number(parts.month),
    jour: Number(parts.day),
    heure: Number(parts.hour) % 24,
    minute: Number(parts.minute),
  };
}

/** Minutes écoulées depuis minuit, heure de Bruxelles. */
export function minutesDeJour(d: Date) {
  const { heure, minute } = partiesJour(d);
  return heure * 60 + minute;
}

/** Heure bruxelloise d'une séance, pour la placer dans la grille. */
export function heureDe(d: Date) {
  return partiesJour(d).heure;
}

/** L'instant qui correspond à minuit, heure de Bruxelles, ce jour-là. La
 *  seconde passe absorbe les nuits de changement d'heure. */
function minuit(annee: number, mois: number, jour: number) {
  const vise = Date.UTC(annee, mois - 1, jour);
  let t = vise - decalageMs(new Date(vise));
  t = vise - decalageMs(new Date(t));
  return new Date(t);
}

/**
 * La date telle qu'on la lit à Bruxelles, au format AAAA-MM-JJ.
 *
 * À ne jamais remplacer par toISOString().slice(0, 10) : minuit à Bruxelles
 * vaut 22 h ou 23 h UTC la veille, et cette découpe rendrait donc le jour
 * précédent. C'est exactement ce qui rendait le bouton « semaine suivante »
 * inerte — le lien portait le dimanche de la semaine affichée, et lundiDe
 * ramenait au lundi qu'on regardait déjà.
 */
export function isoJour(d: Date) {
  const { annee, mois, jour } = partiesJour(d);
  return `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

/**
 * Décale de n jours sur le calendrier bruxellois, et non de n × 24 heures.
 *
 * La nuance compte deux fois l'an : au passage à l'heure d'été, ajouter
 * vingt-quatre heures à minuit donne une heure du matin. Ici le calcul se fait
 * sur les composantes de la date — Date.UTC normalise les débordements de mois
 * et d'année — puis minuit() replace l'instant sur le bon décalage.
 */
export function ajouterJours(d: Date, n: number) {
  const { annee, mois, jour } = partiesJour(d);
  return minuit(annee, mois, jour + n);
}

export function memeJour(a: Date, b: Date) {
  const x = partiesJour(a);
  const y = partiesJour(b);
  return x.annee === y.annee && x.mois === y.mois && x.jour === y.jour;
}

export function debutDeJour(d: Date) {
  const { annee, mois, jour } = partiesJour(d);
  return minuit(annee, mois, jour);
}

/** Lundi de la semaine contenant la date donnée, à minuit heure de Bruxelles. */
export function lundiDe(d: Date) {
  const { annee, mois, jour } = partiesJour(d);
  const reference = new Date(Date.UTC(annee, mois - 1, jour));
  reference.setUTCDate(reference.getUTCDate() - ((reference.getUTCDay() + 6) % 7));
  return minuit(reference.getUTCFullYear(), reference.getUTCMonth() + 1, reference.getUTCDate());
}
