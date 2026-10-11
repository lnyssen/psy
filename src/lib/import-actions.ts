"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigerSession } from "@/lib/garde";
import {
  CHAMPS,
  MAX_LIGNES,
  clePatient,
  devinerMapping,
  lireClasseur,
  verifierLignes,
  type ChampImport,
  type LigneVerifiee,
} from "@/lib/import-patients";

const TAILLE_MAX = 5 * 1024 * 1024;

export type AnalyseImport =
  | { ok: false; erreur: string }
  | {
      ok: true;
      feuille: string;
      entetes: string[];
      mapping: (ChampImport | "")[];
      lignes: LigneVerifiee[];
      /** Aperçu brut des premières lignes, pour comprendre le fichier à l'écran. */
      total: number;
    };

export type ResultatImport =
  | { ok: false; erreur: string }
  | { ok: true; importes: number; ignores: number; erreurs: number };

async function lire(f: FormData) {
  const fichier = f.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) throw new Error("Choisis d’abord un fichier Excel.");
  if (fichier.size > TAILLE_MAX) throw new Error("Le fichier dépasse 5 Mo. Retire les images ou les feuilles inutiles.");
  if (!/\.xlsx$/i.test(fichier.name)) {
    throw new Error("Seul le format .xlsx est accepté. Dans Excel : Fichier › Enregistrer sous › Classeur Excel (.xlsx).");
  }
  let classeur;
  try {
    classeur = await lireClasseur(await fichier.arrayBuffer());
  } catch (e) {
    throw new Error(
      e instanceof Error && /feuille/i.test(e.message)
        ? e.message
        : "Ce fichier n’a pas pu être lu. Vérifie qu’il s’ouvre bien dans Excel et qu’il n’est pas protégé par un mot de passe.",
    );
  }
  if (classeur.lignes.length === 0) throw new Error("Aucune ligne de patient sous la ligne d’en-tête.");
  if (classeur.lignes.length > MAX_LIGNES) {
    throw new Error(`Le fichier compte ${classeur.lignes.length} lignes ; la limite est ${MAX_LIGNES} par import. Découpe-le en deux.`);
  }
  return classeur;
}

function mappingDe(f: FormData, entetes: string[]): (ChampImport | "")[] {
  const brut = f.get("mapping");
  if (typeof brut === "string" && brut) {
    try {
      const valide = new Set<string>(CHAMPS.map((c) => c.cle));
      const m = JSON.parse(brut) as unknown;
      if (Array.isArray(m) && m.length === entetes.length) {
        const vus = new Set<string>();
        return m.map((x) => {
          if (typeof x !== "string" || !valide.has(x) || vus.has(x)) return "";
          vus.add(x);
          return x as ChampImport;
        });
      }
    } catch {
      /* mapping illisible : on retombe sur la détection */
    }
  }
  return devinerMapping(entetes);
}

async function contexte() {
  const [tarifs, cabinets, patients] = await Promise.all([
    prisma.tarif.findMany({
      select: { id: true, libelle: true, amountCents: true, regime: true, actif: true, parDefaut: true },
    }),
    prisma.cabinet.findMany({
      where: { actif: true, factureInstitution: false },
      select: { id: true, nom: true },
    }),
    prisma.patient.findMany({ select: { firstName: true, lastName: true } }),
  ]);
  return { tarifs, cabinets, existants: new Set(patients.map((p) => clePatient(p.firstName, p.lastName))) };
}

/** Lit le fichier et dit ce qui serait importé. N'écrit rien. */
export async function analyserImport(f: FormData): Promise<AnalyseImport> {
  await exigerSession();
  try {
    const classeur = await lire(f);
    const mapping = mappingDe(f, classeur.entetes);
    if (!mapping.includes("prenom") || !mapping.includes("nom")) {
      return {
        ok: true,
        feuille: classeur.feuille,
        entetes: classeur.entetes,
        mapping,
        lignes: [],
        total: classeur.lignes.length,
      };
    }
    const lignes = verifierLignes(classeur.lignes, classeur.numeros, mapping, await contexte());
    return { ok: true, feuille: classeur.feuille, entetes: classeur.entetes, mapping, lignes, total: classeur.lignes.length };
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : "Lecture impossible." };
  }
}

/** Relit le fichier (rien n'est gardé entre les deux étapes) et crée les patients. */
export async function importerPatients(f: FormData): Promise<ResultatImport> {
  await exigerSession();
  try {
    const classeur = await lire(f);
    const mapping = mappingDe(f, classeur.entetes);
    if (!mapping.includes("prenom") || !mapping.includes("nom")) {
      return { ok: false, erreur: "Il faut au moins une colonne Prénom et une colonne Nom." };
    }
    const lignes = verifierLignes(classeur.lignes, classeur.numeros, mapping, await contexte());
    const aCreer = lignes.flatMap((l) => (l.statut === "ok" && l.patient ? [l.patient] : []));

    if (aCreer.length > 0) {
      await prisma.patient.createMany({
        data: aCreer.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          phone: p.phone,
          phoneMother: p.phoneMother,
          phoneFather: p.phoneFather,
          emailMother: p.emailMother,
          emailFather: p.emailFather,
          nationalNumber: p.nationalNumber,
          addressLine: p.addressLine,
          postalCode: p.postalCode,
          city: p.city,
          birthDate: p.birthDate ? new Date(p.birthDate) : null,
          scheme: p.scheme,
          tarifId: p.tarifId,
          feeCents: p.feeCents,
          cabinetId: p.cabinetId,
          jetonRdv: crypto.randomUUID(),
        })),
      });
    }
    revalidatePath("/admin/patients");
    revalidatePath("/admin");
    return {
      ok: true,
      importes: aCreer.length,
      ignores: lignes.filter((l) => l.statut === "doublon").length,
      erreurs: lignes.filter((l) => l.statut === "erreur").length,
    };
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : "Import impossible." };
  }
}
