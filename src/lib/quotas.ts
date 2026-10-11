import type { PplReseau, PplType, SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isBillable } from "@/lib/format";

/**
 * Plafonds INAMI de la convention de psychologie de première ligne, en
 * vigueur depuis le 1er avril 2024 (inami.fgov.be, « Dispenser des soins
 * psychologiques de première ligne via un réseau de santé mentale ») :
 *
 *   - soutien : 10 séances individuelles (réseau enfants et adolescents,
 *     jusqu'à 23 ans compris), 8 (réseau adultes, à partir de 15 ans) ;
 *   - traitement : 20 séances au plus, dans les deux réseaux.
 *
 * Le plafond porte sur « une période de 12 mois ». La page ne dit pas d'où
 * part cette période : on compte en glissant, les douze mois qui précèdent
 * chaque séance. C'est la lecture la plus prudente — elle alerte au plus tôt.
 *
 * Les séances de groupe ne sont pas plafonnées ; l'outil ne connaît que des
 * séances individuelles.
 */
export const PLAFONDS_PPL: Record<PplType, Record<PplReseau, number>> = {
  SOUTIEN: { ENFANTS: 10, ADULTES: 8 },
  TRAITEMENT: { ENFANTS: 20, ADULTES: 20 },
};
const AGE_MAX_RESEAU_ENFANTS = 23;

export type PatientPpl = {
  birthDate: Date | null;
  pplType: PplType;
  pplReseau: PplReseau | null;
};

/** Âge atteint à la date donnée — par défaut aujourd'hui. */
export function ageAu(naissance: Date, date: Date = new Date()) {
  let age = date.getFullYear() - naissance.getFullYear();
  const avantAnniversaire =
    date.getMonth() < naissance.getMonth() ||
    (date.getMonth() === naissance.getMonth() && date.getDate() < naissance.getDate());
  if (avantAnniversaire) age -= 1;
  return age;
}

/** Le réseau choisi, sinon celui de l'âge. Sans date de naissance : adultes,
 *  le plafond le plus bas — mieux vaut une alerte de trop qu'une séance non
 *  remboursée. */
export function reseauPpl(p: PatientPpl, date: Date = new Date()): PplReseau {
  if (p.pplReseau) return p.pplReseau;
  if (!p.birthDate) return "ADULTES";
  return ageAu(p.birthDate, date) <= AGE_MAX_RESEAU_ENFANTS ? "ENFANTS" : "ADULTES";
}

export function plafondConventionne(p: PatientPpl, date: Date = new Date()) {
  return PLAFONDS_PPL[p.pplType][reseauPpl(p, date)];
}

/** Une séance occupe le quota si elle est honorée, manquée sans excuse, ou
 *  encore à venir (elle l'occupera). Les annulations n'en prennent pas. */
function compteAuQuota(status: SessionStatus) {
  return isBillable(status) || status === "SCHEDULED";
}

function ilYaDouzeMois(d: Date) {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() - 1);
  return x;
}

type SeanceQuota = { id: string; status: SessionStatus; startsAt: Date };

/** Séances qui comptent dans les douze mois qui se terminent à `fin`
 *  (comprise). */
export function seancesSurDouzeMois<T extends SeanceQuota>(seances: T[], fin: Date = new Date()) {
  const debut = ilYaDouzeMois(fin);
  return seances.filter((s) => compteAuQuota(s.status) && s.startsAt > debut && s.startsAt <= fin).length;
}

/**
 * Les séances d'un patient conventionné qui dépassent son plafond : celles
 * qui, comptées avec les précédentes des douze mois écoulés, passent au-delà.
 * Sert à marquer « hors quota » partout où une séance s'affiche.
 */
export function seancesHorsQuota<T extends SeanceQuota>(seances: T[], p: PatientPpl): Set<string> {
  const hors = new Set<string>();
  const comptees = seances
    .filter((s) => compteAuQuota(s.status))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  comptees.forEach((s, i) => {
    const debut = ilYaDouzeMois(s.startsAt);
    let n = 0;
    for (let j = i; j >= 0 && comptees[j].startsAt > debut; j--) n++;
    if (n > plafondConventionne(p, s.startsAt)) hors.add(s.id);
  });
  return hors;
}

/**
 * Pour une liste de séances de plusieurs patients (journée, semaine) : les
 * ids hors quota. Charge l'historique des patients conventionnés concernés.
 */
export async function horsQuotaPour(patientIds: (string | null)[]): Promise<Set<string>> {
  const ids = [...new Set(patientIds.filter((x): x is string => !!x))];
  if (ids.length === 0) return new Set();
  const patients = await prisma.patient.findMany({
    where: { id: { in: ids }, scheme: "CONVENTIONNE" },
    select: {
      birthDate: true,
      pplType: true,
      pplReseau: true,
      sessions: { select: { id: true, status: true, startsAt: true } },
    },
  });
  const hors = new Set<string>();
  for (const p of patients) for (const id of seancesHorsQuota(p.sessions, p)) hors.add(id);
  return hors;
}

/**
 * Total d'heures facturables d'un ensemble de séances sur une semaine — sert
 * à surveiller le plafond d'un lieu facturé à un établissement (l'école,
 * vingt-quatre heures). Contrairement à heuresTotales, une séance annulée à
 * temps n'occupe pas le fauteuil et une absence non excusée si : c'est le même
 * calcul que la facturation, pas celui de l'agenda.
 */
export function heuresFacturablesSemaine<T extends { status: SessionStatus; durationMin: number }>(
  seances: T[],
) {
  return (
    seances.filter((s) => isBillable(s.status)).reduce((n, s) => n + s.durationMin, 0) / 60
  );
}

/**
 * Patients conventionnés dont le quota est déjà rempli, en comptant les
 * séances des douze derniers mois et celles déjà prévues : une séance de plus
 * ne serait pas remboursée. Sert aux formulaires de création de séance, pour
 * prévenir avant le clic plutôt qu'après.
 */
export async function alertesQuota(): Promise<Map<string, string>> {
  const maintenant = new Date();
  const patients = await prisma.patient.findMany({
    where: { active: true, scheme: "CONVENTIONNE" },
    select: {
      id: true,
      birthDate: true,
      pplType: true,
      pplReseau: true,
      sessions: { select: { id: true, status: true, startsAt: true } },
    },
  });
  const alertes = new Map<string, string>();
  for (const p of patients) {
    const plafond = plafondConventionne(p, maintenant);
    const faites = seancesSurDouzeMois(p.sessions, maintenant);
    const prevues = p.sessions.filter((s) => s.status === "SCHEDULED" && s.startsAt > maintenant).length;
    if (faites + prevues >= plafond) {
      alertes.set(
        p.id,
        `Plafond INAMI atteint : ${faites} séance${faites > 1 ? "s" : ""} sur douze mois et ${prevues} prévue${
          prevues > 1 ? "s" : ""
        }, pour ${plafond} remboursées.`,
      );
    }
  }
  return alertes;
}
