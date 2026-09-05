import type { Office, PaymentStatus, SessionStatus, CareScheme } from "@prisma/client";

export const OFFICE_LABEL: Record<Office, string> = {
  UCCLE: "Uccle",
  AUDERGHEM: "Auderghem",
};

export const SCHEME_LABEL: Record<CareScheme, string> = {
  CONVENTIONNE: "conventionné",
  PRIVE: "privé",
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
 * Temps de trajet minimal entre les deux cabinets, en minutes. Uccle et
 * Auderghem sont aux deux extrémités du sud de Bruxelles : trente minutes est
 * une hypothèse prudente, à confirmer avec l'utilisatrice.
 */
export const TRAJET_MIN = 30;

export type SeanceLike = { startsAt: Date; durationMin: number; office: Office };

/**
 * Signale, pour chaque séance, qu'elle suit immédiatement une séance dans
 * l'autre cabinet sans temps de trajet suffisant. C'est le principal risque
 * d'agenda d'une pratique sur deux sites, et le seul avertissement que porte
 * l'écran : en ajouter d'autres le banaliserait.
 */
export function conflitsDeTrajet<T extends SeanceLike>(seances: T[]): Set<number> {
  const conflits = new Set<number>();
  const tri = [...seances].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  for (let i = 1; i < tri.length; i++) {
    const avant = tri[i - 1];
    const apres = tri[i];
    if (avant.office === apres.office) continue;
    const finAvant = avant.startsAt.getTime() + avant.durationMin * 60_000;
    const battement = (apres.startsAt.getTime() - finAvant) / 60_000;
    if (battement < TRAJET_MIN) {
      const idx = seances.indexOf(apres);
      if (idx >= 0) conflits.add(idx);
    }
  }
  return conflits;
}

/** Principe de discrétion : les vues d'ensemble n'affichent pas les noms
 *  complets. L'écran est potentiellement visible depuis le fauteuil. */
export function initiales(firstName: string, lastName: string) {
  return `${firstName[0]}.${lastName[0]}.`;
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
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return {
    annee: Number(parts.year),
    mois: Number(parts.month),
    jour: Number(parts.day),
    heure: Number(parts.hour) % 24,
  };
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
