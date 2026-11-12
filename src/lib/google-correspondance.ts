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
  const parPrenom = patients.filter((p) => {
    // Le titre commence par le prénom entier — composé ou non, c'est la
    // normalisation qui unifie « Jean-Pierre » et « Jean Pierre ».
    const prenom = normaliser(p.firstName);
    if (!prenom || (cle !== prenom && !cle.startsWith(`${prenom} `))) return false;
    const reste = cle.slice(prenom.length).trim().split(" ").filter(Boolean);
    const initiale = reste[0] && reste[0].length === 1 ? reste[0] : null;
    return initiale === null || normaliser(p.lastName).startsWith(initiale);
  });
  if (parPrenom.length === 1) return parPrenom[0];
  if (parPrenom.length > 1) return null;
  // Aucun prénom ne colle : le nom de famille seul (« Dupont », « Dupont +
  // maman »), s'il n'y a qu'une famille de ce nom.
  const parNom = patients.filter((p) => {
    const nom = normaliser(p.lastName);
    return nom.length >= 3 && (cle === nom || cle.startsWith(`${nom} `));
  });
  return parNom.length === 1 ? parNom[0] : null;
}

// --- Mémoire des titres -----------------------------------------------------

/**
 * Clé sous laquelle un titre est retenu : normalisé, sans le suffixe « — lieu ».
 * « Anas », « anas » et « Anas — Uccle » ne font qu'un.
 */
export function cleAlias(titre: string, nomsLieux: string[] = []) {
  return separerLieu(titre, nomsLieux).nom;
}

/**
 * Sépare le nom du lieu dans un titre : « Anas — Uccle », « Anas - Uccle »,
 * ou simplement « Anas Uccle » / « Anas Uccle + parents » quand un mot après
 * le premier est le nom d'un lieu. Le nom rendu est normalisé.
 */
export function separerLieu(titre: string, nomsLieux: string[] = []): { nom: string; lieu: string | null } {
  const m = SEPARATEUR_LIEU.exec(titre);
  if (m) {
    return { nom: normaliser(titre.slice(0, m.index)), lieu: titre.slice(m.index + m[0].length).trim() || null };
  }
  const cle = normaliser(titre);
  for (const brut of nomsLieux) {
    const lieu = normaliser(brut);
    if (!lieu || cle === lieu || cle.startsWith(`${lieu} `)) continue;
    const i = ` ${cle} `.indexOf(` ${lieu} `);
    if (i > 0) {
      const nom = `${cle.slice(0, i - 1)} ${cle.slice(i + lieu.length)}`.replace(/\s+/g, " ").trim();
      return { nom, lieu: brut };
    }
  }
  return { nom: cle, lieu: null };
}

/** Le lieu accolé au titre (« Anas — Uccle » → « Uccle »), s'il y en a un. */
export function lieuDuTitre(titre: string, nomsLieux: string[] = []) {
  return separerLieu(titre, nomsLieux).lieu;
}

/**
 * Vrai si le titre contient le prénom ou le nom du patient, au mot près. Garde
 * de la mémoire : un événement « Bilan » rattaché une fois à Anas ne doit pas
 * faire de tous les « Bilan » à venir des séances d'Anas.
 */
export function titreDesignePatient(titre: string, p: Pick<PatientCandidat, "firstName" | "lastName">) {
  const mots = new Set(cleAlias(titre).split(" "));
  const noms = [...normaliser(p.firstName).split(" "), ...normaliser(p.lastName).split(" ")];
  return noms.some((n) => n.length >= 2 && mots.has(n));
}

export type ValeurParticipants = "INDIVIDUELLE" | "AVEC_PERE" | "AVEC_MERE" | "AVEC_PARENTS";

/**
 * Qui accompagne le patient, d'après le titre : « Delhia + parents »,
 * « Tom avec maman », « Léa (papa) ». Le premier mot n'est jamais lu — c'est
 * le nom du patient, et un nom de famille peut s'écrire « Pere ».
 */
export function participantsDuTitre(titre: string): ValeurParticipants {
  const mots = cleAlias(titre).split(" ").slice(1);
  const a = (...m: string[]) => mots.some((x) => m.includes(x));
  if (a("parents", "parent")) return "AVEC_PARENTS";
  const mere = a("maman", "mere", "mama", "mum", "mom");
  const pere = a("papa", "pere", "dad");
  if (mere && pere) return "AVEC_PARENTS";
  if (mere) return "AVEC_MERE";
  if (pere) return "AVEC_PERE";
  return "INDIVIDUELLE";
}

// --- Proposition complète ---------------------------------------------------

export type AliasCandidat = {
  patientId: string;
  cabinetId: string | null;
  participants: ValeurParticipants;
};

export type Referentiel<P extends PatientCandidat, C extends CabinetCandidat> = {
  patients: P[];
  cabinets: C[];
  /** Titres retenus, par clé (cleAlias). */
  alias: Map<string, AliasCandidat>;
  /** Cabinet de la dernière séance de chaque patient (lieu permis seulement). */
  dernierCabinet: Map<string, string>;
};

export type Proposition<P> = {
  patient: P;
  /** Null : aucun lieu sûr, à choisir à la main. */
  cabinetId: string | null;
  participants: ValeurParticipants;
  /** D'où vient le patient : nom complet exact, titre déjà rattaché par
   *  Amandine, ou ressemblance (prénom, initiale, nom seul). Seules les deux
   *  premières permettent un rattachement sans clic. */
  source: "nom" | "memoire" | "ressemblance";
};

/**
 * Ce que l'outil propose pour un événement : patient, lieu, accompagnants.
 * `"refuse"` : le lieu désigne un établissement facturé à l'heure ou un
 * cabinet fermé — jamais de rattachement automatique.
 */
export function proposer<P extends PatientCandidat & { cabinetId?: string | null }, C extends CabinetCandidat>(
  ev: { titre: string; lieu: string | null },
  ref: Referentiel<P, C>,
): Proposition<P> | "refuse" | null {
  let patient: P | null = null;
  let lieuTitre: string | null = null;
  let source: Proposition<P>["source"] = "nom";
  let memoire: AliasCandidat | undefined;

  const noms = ref.cabinets.map((c) => c.nom);
  const separe = separerLieu(ev.titre, noms);
  const exact = patientDuTitre(ev.titre, ref.patients) ?? (separe.lieu ? patientDuTitre(separe.nom, ref.patients) : null);
  if (exact) {
    patient = exact.patient;
    lieuTitre = exact.lieu ?? separe.lieu;
  } else {
    memoire = ref.alias.get(separe.nom);
    const retenu = memoire && ref.patients.find((p) => p.id === memoire!.patientId);
    if (retenu) {
      patient = retenu;
      source = "memoire";
    } else {
      memoire = undefined;
      patient = suggererPatient(separe.nom, ref.patients);
      source = "ressemblance";
    }
    lieuTitre = separe.lieu;
  }
  if (!patient) return null;

  const parId = new Map(ref.cabinets.map((c) => [c.id, c]));
  const permis = (id: string | null | undefined) => {
    const c = id ? parId.get(id) : undefined;
    return c && cabinetAutorise(c) ? c.id : null;
  };

  let cabinetId: string | null;
  const duLieu = cabinetDesLieux([lieuTitre, ev.lieu], ref.cabinets);
  if (duLieu === "refuse") return "refuse";
  if (duLieu) cabinetId = duLieu.cabinet.id;
  else
    cabinetId =
      permis(memoire?.cabinetId) ?? permis(ref.dernierCabinet.get(patient.id)) ?? permis(patient.cabinetId);

  const duTitre = participantsDuTitre(ev.titre);
  const participants = duTitre !== "INDIVIDUELLE" ? duTitre : (memoire?.participants ?? "INDIVIDUELLE");
  return { patient, cabinetId, participants, source };
}
