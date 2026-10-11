import { adresseCabinet } from "@/lib/format";

/**
 * Reconnaissance d'un patient dans le titre d'un événement Google « à
 * rattacher ». Fonctions pures, sans base de données : la synchronisation
 * (lib/google-sync.ts) les applique, un script peut les éprouver seul.
 *
 * Règles, choisies pour qu'une erreur reste impossible plutôt que rare :
 *
 * 1. Le titre normalisé (minuscules, sans accents, espaces, traits d'union et
 *    apostrophes unifiés, ponctuation retirée) doit être exactement « prénom
 *    nom » ou « nom prénom ». Un suffixe « — lieu » ou « - lieu », le format
 *    que l'app écrit elle-même, est toléré. Aucune correspondance partielle
 *    ni approximative : « Dupont » seul ou « Marie Dupond » ne valent rien.
 * 2. Exactement un patient actif doit correspondre. Aucun, ou plusieurs
 *    (homonymes), et l'événement reste à rattacher à la main.
 * 3. Le cabinet est celui que nomme le lieu de l'événement, s'il n'y en a
 *    qu'un ; sinon celui de la dernière séance du patient ; sinon son cabinet
 *    habituel ; sinon rien. Jamais un lieu facturé à un établissement (ni un
 *    cabinet fermé) : si le lieu en désigne un, l'événement reste à rattacher.
 *
 * Les deux dernières règles — événements à venir seulement, statut « à
 * rattacher » seulement — sont appliquées par l'appelant.
 */

export function normaliser(texte: string) {
  return texte
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[-‐‑‒–—'’‘ʼ`´_]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Un tiret entouré d'espaces sépare le nom du lieu ; celui d'un prénom
 *  composé (« Jean-Pierre ») n'en a pas. */
const SEPARATEUR_LIEU = /\s+[-–—]\s+/;

export type PatientCandidat = { id: string; firstName: string; lastName: string };

function patientsDuNom(nom: string, patients: PatientCandidat[]) {
  const cle = normaliser(nom);
  if (!cle) return [];
  return patients.filter(
    (p) =>
      normaliser(`${p.firstName} ${p.lastName}`) === cle ||
      normaliser(`${p.lastName} ${p.firstName}`) === cle,
  );
}

/**
 * Le patient que désigne le titre, et le lieu éventuellement accolé. Null dès
 * qu'il n'y a pas exactement un patient.
 */
export function patientDuTitre<P extends PatientCandidat>(
  titre: string,
  patients: P[],
): { patient: P; lieu: string | null } | null {
  // Le titre entier d'abord : un nom de famille peut lui-même contenir un
  // tiret espacé. Le découpage nom — lieu ne sert qu'à défaut.
  const entier = patientsDuNom(titre, patients);
  if (entier.length > 0) return entier.length === 1 ? { patient: entier[0] as P, lieu: null } : null;

  const m = SEPARATEUR_LIEU.exec(titre);
  if (!m) return null;
  const nom = titre.slice(0, m.index);
  const lieu = titre.slice(m.index + m[0].length).trim();
  const trouves = patientsDuNom(nom, patients);
  return trouves.length === 1 ? { patient: trouves[0] as P, lieu: lieu || null } : null;
}

export type CabinetCandidat = {
  id: string;
  nom: string;
  addressLine: string;
  postalCode: string;
  city: string;
  actif: boolean;
  factureInstitution: boolean;
};

export function cabinetAutorise(c: Pick<CabinetCandidat, "actif" | "factureInstitution">) {
  return c.actif && !c.factureInstitution;
}

/**
 * Le cabinet que désignent les lieux de l'événement (suffixe du titre, champ
 * « lieu » de Google), par son nom ou par l'adresse que l'app y écrit — Google
 * y ajoute parfois le pays, d'où la comparaison par le début.
 *
 * - `{ cabinet }` : un seul cabinet désigné, et il est permis ;
 * - `"refuse"` : un seul cabinet désigné, mais facturé à un établissement ou
 *   fermé — l'événement ne doit pas être rattaché automatiquement ;
 * - `null` : aucun lieu reconnu, ou ambigu — à l'appelant de se rabattre sur
 *   l'historique du patient.
 */
export function cabinetDesLieux<C extends CabinetCandidat>(
  lieux: (string | null | undefined)[],
  cabinets: C[],
): { cabinet: C } | "refuse" | null {
  const textes = lieux.map((l) => normaliser(l ?? "")).filter(Boolean);
  if (textes.length === 0) return null;
  const designes = cabinets.filter((c) => {
    const nom = normaliser(c.nom);
    const adresse = normaliser(adresseCabinet(c));
    return textes.some((t) => t === nom || (adresse !== "" && t.startsWith(adresse)));
  });
  if (designes.length !== 1) return null;
  return cabinetAutorise(designes[0]) ? { cabinet: designes[0] } : "refuse";
}

/**
 * Suggestion de patient pour un titre qui n'a PAS de correspondance exacte —
 * les cas que `patientDuTitre` laisse volontairement à la main : « Chloé E +
 * parents », « Matéo », « Jeanne M ».
 *
 * Ce n'est jamais un rattachement : la suggestion pré-remplit le champ, et
 * Amandine confirme d'un clic. Elle n'en propose une que s'il n'y a exactement
 * qu'un patient actif possible :
 *
 * - le premier mot du titre est le prénom (au mot près, sans accents) ;
 * - un second mot d'une seule lettre est l'initiale du nom de famille ;
 * - le reste (« parents », « + maman »…) est ignoré.
 *
 * Deux enfants de même prénom, sans initiale pour les départager : aucune
 * suggestion, plutôt qu'un risque de se tromper de dossier.
 */
export function suggererPatient<P extends PatientCandidat>(titre: string, patients: P[]): P | null {
  const cle = normaliser(titre);
  if (!cle) return null;
  const trouves = patients.filter((p) => {
    // Le titre commence par le prénom entier — composé ou non, c'est la
    // normalisation qui unifie « Jean-Pierre » et « Jean Pierre ».
    const prenom = normaliser(p.firstName);
    if (!prenom || (cle !== prenom && !cle.startsWith(`${prenom} `))) return false;
    const reste = cle.slice(prenom.length).trim().split(" ").filter(Boolean);
    const initiale = reste[0] && reste[0].length === 1 ? reste[0] : null;
    return initiale === null || normaliser(p.lastName).startsWith(initiale);
  });
  return trouves.length === 1 ? trouves[0] : null;
}
