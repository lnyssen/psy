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

export const fmtHeure = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit" });
export const fmtJourLong = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
});
export const fmtJourCourt = new Intl.DateTimeFormat(LOCALE, { weekday: "short", day: "2-digit" });
export const fmtDateCourte = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

export function euros(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function memeJour(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function debutDeJour(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Lundi de la semaine contenant la date donnée. */
export function lundiDe(d: Date) {
  const x = debutDeJour(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
