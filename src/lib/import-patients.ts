import ExcelJS from "exceljs";
import { numeroNational } from "@/lib/format";
import { normaliser } from "@/lib/google-correspondance";

/**
 * Import de patients depuis un classeur Excel : lecture, reconnaissance des
 * colonnes et validation. Aucune base de données ici — la logique se teste
 * seule, et les actions serveur (lib/import-actions.ts) lui fournissent le
 * contexte (tarifs, lieux, patients déjà présents).
 *
 * Principe : un fichier ne doit jamais être perdu ni abîmé en silence. Seules
 * deux choses bloquent une ligne — un prénom ou un nom manquant. Tout le reste
 * (e-mail invalide, numéro national faux, lieu inconnu…) est écarté avec un
 * avertissement lisible : mieux vaut un patient importé sans son e-mail qu'une
 * ligne refusée, et mieux vaut une donnée absente qu'une donnée fausse.
 */

export type ChampImport =
  | "prenom"
  | "nom"
  | "regime"
  | "tarif"
  | "naissance"
  | "numeroNational"
  | "telephone"
  | "telephoneMere"
  | "telephonePere"
  | "email"
  | "emailMere"
  | "emailPere"
  | "adresse"
  | "codePostal"
  | "commune"
  | "cabinet";

export const CHAMPS: {
  cle: ChampImport;
  libelle: string;
  obligatoire: boolean;
  aide: string;
  exemple: string;
  /** Intitulés reconnus dans un fichier existant, une fois normalisés. */
  synonymes: string[];
}[] = [
  { cle: "prenom", libelle: "Prénom", obligatoire: true, aide: "Texte.", exemple: "Camille", synonymes: ["prenom", "prenoms", "first name", "firstname", "given name"] },
  { cle: "nom", libelle: "Nom", obligatoire: true, aide: "Nom de famille.", exemple: "Dubois", synonymes: ["nom", "nom de famille", "nom famille", "last name", "lastname", "family name", "famille"] },
  { cle: "regime", libelle: "Régime", obligatoire: false, aide: "« privé » ou « conventionné » (psychologue de première ligne). Vide : privé.", exemple: "privé", synonymes: ["regime", "type", "convention", "conventionne", "ppl", "statut", "mutuelle", "prise en charge"] },
  { cle: "tarif", libelle: "Tarif", obligatoire: false, aide: "Le nom ou le montant d’un tarif de la grille (« Tarif 1 », « 70 »). Vide : le tarif par défaut du régime. Un patient conventionné prend toujours le tarif conventionné.", exemple: "Tarif 1", synonymes: ["tarif", "prix", "montant", "honoraires", "tarif seance", "prix seance"] },
  { cle: "naissance", libelle: "Date de naissance", obligatoire: false, aide: "Une vraie date Excel, ou jj/mm/aaaa. Sert au plafond INAMI des 16-25 ans.", exemple: "17/04/1988", synonymes: ["date de naissance", "naissance", "ne le", "nee le", "ne(e) le", "ddn", "date naissance", "birth date", "birthdate"] },
  { cle: "numeroNational", libelle: "N° national", obligatoire: false, aide: "11 chiffres, avec ou sans points. La clé est contrôlée : un numéro faux est écarté plutôt que gardé.", exemple: "88.04.17-123.45", synonymes: ["numero national", "n national", "no national", "n° national", "registre national", "rn", "niss", "nn", "numero de registre national", "numero registre national"] },
  { cle: "telephone", libelle: "Téléphone", obligatoire: false, aide: "Texte, avec ou sans espaces.", exemple: "0475 12 34 56", synonymes: ["telephone", "tel", "gsm", "mobile", "portable", "telephone patient", "tel patient", "gsm patient", "numero de telephone"] },
  { cle: "telephoneMere", libelle: "Téléphone mère", obligatoire: false, aide: "Pour un enfant ou un adolescent.", exemple: "0478 11 22 33", synonymes: ["telephone mere", "tel mere", "gsm mere", "telephone maman", "gsm maman", "tel maman"] },
  { cle: "telephonePere", libelle: "Téléphone père", obligatoire: false, aide: "Pour un enfant ou un adolescent.", exemple: "0479 44 55 66", synonymes: ["telephone pere", "tel pere", "gsm pere", "telephone papa", "gsm papa", "tel papa"] },
  { cle: "email", libelle: "E-mail", obligatoire: false, aide: "Une adresse valide ; sinon elle est écartée.", exemple: "camille.dubois@example.be", synonymes: ["email", "e mail", "mail", "courriel", "adresse mail", "adresse email", "adresse e mail", "email patient"] },
  { cle: "emailMere", libelle: "E-mail mère", obligatoire: false, aide: "", exemple: "", synonymes: ["email mere", "e mail mere", "mail mere", "courriel mere", "mail maman"] },
  { cle: "emailPere", libelle: "E-mail père", obligatoire: false, aide: "", exemple: "", synonymes: ["email pere", "e mail pere", "mail pere", "courriel pere", "mail papa"] },
  { cle: "adresse", libelle: "Adresse", obligatoire: false, aide: "Rue et numéro, dans une seule colonne.", exemple: "12 rue du Doyenné", synonymes: ["adresse", "rue", "rue et numero", "adresse rue", "adresse postale", "rue numero", "voie"] },
  { cle: "codePostal", libelle: "Code postal", obligatoire: false, aide: "", exemple: "1180", synonymes: ["code postal", "cp", "postal", "code"] },
  { cle: "commune", libelle: "Commune", obligatoire: false, aide: "", exemple: "Uccle", synonymes: ["commune", "ville", "localite", "city"] },
  { cle: "cabinet", libelle: "Cabinet", obligatoire: false, aide: "Le nom d’un de tes lieux (Uccle, Auderghem…). Vide ou inconnu : aucun cabinet habituel.", exemple: "Uccle", synonymes: ["cabinet", "lieu", "site", "consultation", "cabinet habituel"] },
];

const parCle = new Map(CHAMPS.map((c) => [c.cle, c]));

// --- Lecture du classeur -------------------------------------------------------

export const MAX_LIGNES = 2000;

/** Une cellule Excel en texte, quelle qu'en soit la nature (texte riche, formule,
 *  lien, date, nombre). Une date devient AAAA-MM-JJ : c'est une vraie date Excel,
 *  sans ambiguïté jour/mois. */
function texteCellule(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return "";
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v);
  if (typeof v === "boolean") return v ? "oui" : "non";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((r) => r.text).join("").trim();
    if ("result" in o) return texteCellule(o.result as ExcelJS.CellValue);
    if (typeof o.text === "string") return o.text.trim();
    if (typeof o.hyperlink === "string") return o.hyperlink.replace(/^mailto:/i, "").trim();
  }
  return "";
}

export type ClasseurLu = { feuille: string; entetes: string[]; lignes: string[][]; numeros: number[] };

export function champDeLEntete(entete: string): ChampImport | null {
  const n = normaliser(entete);
  if (!n) return null;
  for (const c of CHAMPS) if (c.synonymes.includes(n)) return c.cle;
  // « Téléphone de la mère », « GSM du papa »… : on reconnaît le parent à son mot.
  const parent = /\b(mere|maman)\b/.test(n) ? "Mere" : /\b(pere|papa)\b/.test(n) ? "Pere" : null;
  if (parent) {
    if (/\b(tel|telephone|gsm|mobile|portable)\b/.test(n)) return `telephone${parent}` as ChampImport;
    if (/\b(mail|email|courriel)\b/.test(n)) return `email${parent}` as ChampImport;
  }
  return null;
}

/** Devine la colonne de chaque champ, sans jamais en attribuer deux fois le même. */
export function devinerMapping(entetes: string[]): (ChampImport | "")[] {
  const pris = new Set<ChampImport>();
  return entetes.map((e) => {
    const c = champDeLEntete(e);
    if (!c || pris.has(c)) return "";
    pris.add(c);
    return c;
  });
}

export async function lireClasseur(tampon: ArrayBuffer): Promise<ClasseurLu> {
  const classeur = new ExcelJS.Workbook();
  await classeur.xlsx.load(tampon);

  // La feuille « Patients » du modèle, sinon la première qui contient des lignes.
  const feuille =
    classeur.worksheets.find((f) => normaliser(f.name) === "patients") ??
    classeur.worksheets.find((f) => f.actualRowCount > 0);
  if (!feuille) throw new Error("Le classeur ne contient aucune feuille avec des données.");

  const toutes: { numero: number; cellules: string[] }[] = [];
  feuille.eachRow({ includeEmpty: false }, (row, numero) => {
    const cellules: string[] = [];
    const max = Math.min(row.cellCount, 60);
    for (let c = 1; c <= max; c++) cellules.push(texteCellule(row.getCell(c).value));
    toutes.push({ numero, cellules });
  });
  if (toutes.length === 0) throw new Error("La feuille est vide.");

  // L'en-tête est la ligne, parmi les quinze premières, qui reconnaît le plus de
  // colonnes : un fichier peut commencer par un titre ou une ligne vide.
  let meilleure = 0;
  let score = -1;
  toutes.slice(0, 15).forEach((l, i) => {
    const s = l.cellules.filter((c) => champDeLEntete(c)).length;
    if (s > score) {
      score = s;
      meilleure = i;
    }
  });
  if (score <= 0) meilleure = 0; // rien de reconnu : la première ligne sert d'en-tête

  const largeur = Math.max(...toutes.map((l) => l.cellules.length));
  const entetes = Array.from({ length: largeur }, (_, i) => toutes[meilleure].cellules[i] ?? "");
  const corps = toutes.slice(meilleure + 1).filter((l) => l.cellules.some((c) => c !== ""));
  return {
    feuille: feuille.name,
    entetes,
    lignes: corps.map((l) => Array.from({ length: largeur }, (_, i) => l.cellules[i] ?? "")),
    numeros: corps.map((l) => l.numero),
  };
}

// --- Validation ------------------------------------------------------------------

export type ContexteImport = {
  tarifs: { id: string; libelle: string; amountCents: number; regime: "PRIVE" | "CONVENTIONNE"; actif: boolean; parDefaut: boolean }[];
  cabinets: { id: string; nom: string }[];
  /** Clés normalisées « prénom nom » des patients déjà dans la base. */
  existants: Set<string>;
};

export type DonneesPatient = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  phoneMother: string | null;
  phoneFather: string | null;
  emailMother: string | null;
  emailFather: string | null;
  nationalNumber: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  /** AAAA-MM-JJ. */
  birthDate: string | null;
  scheme: "PRIVE" | "CONVENTIONNE";
  tarifId: string | null;
  /** Montant hors grille conservé quand le fichier en donne un qu'aucun tarif ne porte. */
  feeCents: number | null;
  cabinetId: string | null;
};

export type LigneVerifiee = {
  /** Numéro de ligne dans Excel, pour que l'on retrouve la ligne à corriger. */
  numero: number;
  statut: "ok" | "doublon" | "erreur";
  nom: string;
  avertissements: string[];
  erreurs: string[];
  patient: DonneesPatient | null;
};

const cleDoublon = (prenom: string, nom: string) => normaliser(`${prenom} ${nom}`);

/** « DUPONT » devient « Dupont », « DE SMET » « De Smet » ; un nom déjà en casse
 *  mixte n'est jamais touché. */
function casseNom(t: string) {
  if (!t || t !== t.toUpperCase() || t === t.toLowerCase()) return t;
  return t.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toUpperCase());
}

function dateISO(texte: string): string | null {
  const t = texte.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  let a: number, mo: number, j: number;
  if (m) [a, mo, j] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else {
    m = /^(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{4})$/.exec(t);
    if (!m) return null;
    [j, mo, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  const d = new Date(Date.UTC(a, mo - 1, j));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j) return null;
  if (a < 1900 || d.getTime() > Date.now()) return null;
  return `${a}-${String(mo).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function verifierLignes(
  lignes: string[][],
  numeros: number[],
  mapping: (ChampImport | "")[],
  ctx: ContexteImport,
): LigneVerifiee[] {
  const col = (c: ChampImport) => {
    const i = mapping.indexOf(c);
    return i === -1 ? null : i;
  };
  const vusDansLeFichier = new Set<string>();

  return lignes.map((cells, i) => {
    const v = (c: ChampImport) => {
      const k = col(c);
      return k === null ? "" : (cells[k] ?? "").trim();
    };
    const avertissements: string[] = [];
    const erreurs: string[] = [];

    const prenom = v("prenom");
    const nom = v("nom");
    if (!prenom) erreurs.push("prénom manquant");
    if (!nom) erreurs.push("nom manquant");
    const resume = `${prenom} ${nom}`.trim() || "(sans nom)";
    const numero = numeros[i] ?? i + 2;
    if (erreurs.length) return { numero, statut: "erreur" as const, nom: resume, avertissements, erreurs, patient: null };

    const cle = cleDoublon(prenom, nom);
    if (ctx.existants.has(cle)) {
      return { numero, statut: "doublon" as const, nom: resume, avertissements: ["déjà dans l’outil — ignoré"], erreurs, patient: null };
    }
    if (vusDansLeFichier.has(cle)) {
      return { numero, statut: "doublon" as const, nom: resume, avertissements: ["déjà plus haut dans le fichier — ignoré"], erreurs, patient: null };
    }
    vusDansLeFichier.add(cle);

    // Régime
    const regimeTexte = normaliser(v("regime"));
    let scheme: "PRIVE" | "CONVENTIONNE" = "PRIVE";
    if (regimeTexte) {
      if (/(conv|ppl|inami|premiere ligne|1ere ligne)/.test(regimeTexte)) scheme = "CONVENTIONNE";
      else if (/(prive|priv)/.test(regimeTexte)) scheme = "PRIVE";
      else avertissements.push(`régime « ${v("regime")} » non reconnu — privé retenu`);
    }

    // Tarif : par nom, puis par montant ; le tarif conventionné s'impose en conventionné.
    const actifs = ctx.tarifs.filter((t) => t.actif && t.regime === scheme);
    const defaut = actifs.find((t) => t.parDefaut) ?? actifs[0] ?? null;
    let tarifId: string | null = defaut?.id ?? null;
    let feeCents: number | null = null;
    const tarifTexte = v("tarif");
    if (tarifTexte && scheme === "PRIVE") {
      const ntexte = normaliser(tarifTexte);
      const parNom = actifs.find((t) => normaliser(t.libelle) === ntexte);
      const montant = /^\s*(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur|euros?)?\s*$/i.exec(tarifTexte.replace(/ /g, " "));
      const cents = montant ? Math.round(Number(montant[1].replace(",", ".")) * 100) : null;
      const parMontant = cents !== null ? actifs.find((t) => t.amountCents === cents) : undefined;
      const trouve = parNom ?? parMontant;
      if (trouve) tarifId = trouve.id;
      else if (cents !== null && cents > 0) {
        tarifId = null;
        feeCents = cents;
        avertissements.push(`montant ${(cents / 100).toFixed(2).replace(".", ",")} € hors de la grille — conservé tel quel`);
      } else avertissements.push(`tarif « ${tarifTexte} » inconnu — tarif par défaut retenu`);
    }
    if (tarifId === null && feeCents === null) avertissements.push("aucun tarif trouvé pour ce régime");

    // Date de naissance
    let birthDate: string | null = null;
    const naissance = v("naissance");
    if (naissance) {
      birthDate = dateISO(naissance);
      if (!birthDate) avertissements.push(`date de naissance « ${naissance} » illisible — ignorée`);
    }

    // N° national
    let nationalNumber: string | null = null;
    const nn = v("numeroNational");
    if (nn) {
      nationalNumber = numeroNational(nn);
      if (!nationalNumber) avertissements.push("n° national invalide — ignoré");
    }

    // Téléphones : Excel avale le zéro initial d'un numéro saisi comme un nombre.
    const tel = (c: ChampImport) => {
      const brut = v(c);
      if (!brut) return null;
      if (/^[1-9]\d{7,8}$/.test(brut)) {
        avertissements.push(`téléphone ${brut} : zéro initial rétabli`);
        return `0${brut}`;
      }
      if (brut.replace(/\D/g, "").length < 6) {
        avertissements.push(`téléphone « ${brut} » trop court — ignoré`);
        return null;
      }
      return brut;
    };
    const mail = (c: ChampImport) => {
      const brut = v(c);
      if (!brut) return null;
      if (!EMAIL.test(brut)) {
        avertissements.push(`e-mail « ${brut} » invalide — ignoré`);
        return null;
      }
      return brut.toLowerCase();
    };

    // Cabinet
    let cabinetId: string | null = null;
    const cab = v("cabinet");
    if (cab) {
      const trouve = ctx.cabinets.find((c) => normaliser(c.nom) === normaliser(cab));
      if (trouve) cabinetId = trouve.id;
      else avertissements.push(`cabinet « ${cab} » inconnu — aucun cabinet habituel`);
    }

    const cp = v("codePostal");
    return {
      numero,
      statut: "ok" as const,
      nom: `${prenom} ${casseNom(nom)}`,
      avertissements,
      erreurs,
      patient: {
        firstName: prenom,
        lastName: casseNom(nom),
        email: mail("email"),
        phone: tel("telephone"),
        phoneMother: tel("telephoneMere"),
        phoneFather: tel("telephonePere"),
        emailMother: mail("emailMere"),
        emailFather: mail("emailPere"),
        nationalNumber,
        addressLine: v("adresse") || null,
        postalCode: cp ? cp.replace(/\.0+$/, "") : null,
        city: v("commune") || null,
        birthDate,
        scheme,
        tarifId,
        feeCents,
        cabinetId,
      },
    };
  });
}

export const clePatient = cleDoublon;
export const libelleChamp = (c: ChampImport) => parCle.get(c)!.libelle;
