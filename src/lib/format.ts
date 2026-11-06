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
};

export const STATUS_LABEL: Record<SessionStatus, string> = {
  SCHEDULED: "à venir",
  ATTENDED: "honorée",
  CANCELLED_IN_TIME: "annulée à temps",
  NO_SHOW: "absence non excusée",
  NO_SHOW_ANNULE: "absence annulée",
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

/**
 * Ce qu'on affiche à la place d'un nom quand la séance n'a pas de patient —
 * un bloc facturé à un établissement (voir Cabinet.factureInstitution).
 * Le nom du lieu porte alors l'information : « École », pas un nom inventé.
 */
export function nomSeance(s: {
  patient: { firstName: string; lastName: string } | null;
  cabinet: { nom: string };
}) {
  return s.patient ? nomComplet(s.patient) : s.cabinet.nom;
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
export const fmtMoisCourt = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: FUSEAU });
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

/**
 * Les polices standard d'un PDF (WinAnsi) n'encodent pas toutes les espaces
 * qu'Intl produit — l'espace insécable fine placée avant l'euro, entre
 * autres, selon la version d'ICU du serveur qui l'exécute. Un texte destiné
 * à pdf-lib passe par ici, jamais directement une valeur d'Intl.
 */
export function pourPdf(texte: string) {
  return texte.replace(/[   -​  　﻿]/g, " ");
}

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
 * L'instant qui correspond à une date (AAAA-MM-JJ) et une heure (HH:MM) lues à
 * Bruxelles. À préférer à `new Date("2026-10-13T09:00:00")`, qui lit l'heure
 * dans le fuseau du serveur : juste sur un poste bruxellois, décalée de une ou
 * deux heures sur Vercel, qui tourne en UTC.
 */
export function instantBruxelles(date: string, heure: string) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const h = /^(\d{1,2}):(\d{2})$/.exec(heure);
  if (!d || !h) return null;
  const [annee, mois, jour, hh, mm] = [d[1], d[2], d[3], h[1], h[2]].map(Number);
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31 || hh > 23 || mm > 59) return null;
  const vise = Date.UTC(annee, mois - 1, jour, hh, mm);
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

/**
 * Numéro national belge, remis au format AAMMJJ-XXX.CC. Accepte la saisie
 * avec ou sans séparateurs (y compris celle de la carte, AA.MM.JJ-XXX.CC).
 * Rend null si la clé ne correspond pas : 97 moins le reste de la division
 * par 97 des neuf premiers chiffres, précédés d'un 2 pour les naissances
 * depuis 2000.
 */
export function numeroNational(saisie: string): string | null {
  const chiffres = saisie.replace(/[\s.\-]/g, "");
  if (!/^\d{11}$/.test(chiffres)) return null;
  const base = chiffres.slice(0, 9);
  const cle = Number(chiffres.slice(9));
  const valide = [base, `2${base}`].some((b) => 97 - (Number(b) % 97) === cle);
  if (!valide) return null;
  return `${chiffres.slice(0, 6)}-${chiffres.slice(6, 9)}.${chiffres.slice(9)}`;
}

/**
 * La date de naissance que porte un numéro national valide : ses six premiers
 * chiffres (AAMMJJ). Le siècle se lit dans la clé, calculée avec un « 2 »
 * devant pour les naissances depuis 2000. Un numéro bis (étranger sans
 * registre) ajoute 20 ou 40 au mois ; un mois ou un jour à 00 veut dire que
 * la date était inconnue à l'inscription : rien n'est déduit.
 */
export function naissanceDuNumeroNational(saisie: string): Date | null {
  const chiffres = saisie.replace(/[\s.\-]/g, "");
  if (!numeroNational(chiffres)) return null;
  const base = chiffres.slice(0, 9);
  const cle = Number(chiffres.slice(9));
  const siecle = 97 - (Number(`2${base}`) % 97) === cle ? 2000 : 1900;
  const annee = siecle + Number(chiffres.slice(0, 2));
  let mois = Number(chiffres.slice(2, 4));
  if (mois > 40) mois -= 40;
  else if (mois > 20) mois -= 20;
  const jour = Number(chiffres.slice(4, 6));
  if (mois < 1 || mois > 12 || jour < 1) return null;
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  return d.getUTCMonth() === mois - 1 ? d : null;
}

/** Une date saisie à la française (jj/mm/aaaa, jj.mm.aa, jjmmaaaa…), au
 *  format AAAA-MM-JJ des formulaires. Null si elle n'existe pas. */
export function dateSaisieFr(saisie: string): string | null {
  const v = saisie.trim();
  let morceaux = v.split(/[^\d]+/).filter(Boolean);
  if (morceaux.length === 1 && /^\d{6}$|^\d{8}$/.test(morceaux[0])) {
    const c = morceaux[0];
    morceaux = [c.slice(0, 2), c.slice(2, 4), c.slice(4)];
  }
  if (morceaux.length !== 3) return null;
  const [j, m] = morceaux.map(Number);
  let a = Number(morceaux[2]);
  if (morceaux[2].length === 2) a += 2000;
  else if (morceaux[2].length !== 4) return null;
  const d = new Date(Date.UTC(a, m - 1, j));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
}

/** AAAA-MM-JJ → jj/mm/aaaa, pour l'affichage d'un champ. */
export function dateIsoVersFr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** Une heure saisie librement (9h, 9h30, 0930, 9:30, 14.15), au format HH:MM
 *  sur 24 heures. Null si elle n'existe pas. */
export function heureSaisieFr(saisie: string): string | null {
  const v = saisie.trim().toLowerCase();
  let h: number;
  let min: number;
  const separe = /^(\d{1,2})\s*[:h.]\s*(\d{0,2})$/.exec(v);
  if (separe) {
    h = Number(separe[1]);
    min = separe[2] ? Number(separe[2]) : 0;
    if (separe[2].length === 1) return null;
  } else if (/^\d{1,2}$/.test(v)) {
    h = Number(v);
    min = 0;
  } else if (/^\d{3,4}$/.test(v)) {
    h = Number(v.slice(0, -2));
    min = Number(v.slice(-2));
  } else return null;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

// Ordre alphabétique français : « Électricité » se range avec les E, et la
// casse ne compte pas.
const collationFr = new Intl.Collator("fr", { sensitivity: "base", numeric: true });
export const parLibelle = (a: { libelle: string }, b: { libelle: string }) =>
  collationFr.compare(a.libelle, b.libelle);
