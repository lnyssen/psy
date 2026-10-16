import { readFile } from "node:fs/promises";

/**
 * Statut de la sauvegarde nocturne de la base.
 *
 * L'application n'a pas accès au dossier des sauvegardes (il appartient à root,
 * et c'est voulu) : le script de sauvegarde dépose, après chaque réussite, un
 * petit fichier de statut lisible par elle. Ici, on ne fait que le lire.
 *
 * Trois états : « ok » (sauvegarde de moins de 36 h), « ancienne » (le script
 * n'a pas réussi depuis plus de 36 h : il faut regarder), « inconnu » (pas de
 * fichier — poste de développement, Vercel, ou serveur dont le script n'a pas
 * encore été mis à jour).
 */
const CHEMIN =
  process.env.STATUT_SAUVEGARDE || "/srv/psy/sauvegarde-statut.json";
const LIMITE_MS = 36 * 3_600_000;

export type StatutSauvegarde =
  | { etat: "inconnu" }
  | { etat: "ok" | "ancienne"; date: Date; tailleMo: number; nombre: number };

/**
 * Dernier test de restauration (deploy/tester-restauration.sh) : une sauvegarde
 * qu'on n'a jamais restaurée n'est qu'une promesse. « ancien » : plus de
 * 40 jours — le test mensuel n'a pas tourné.
 */
const CHEMIN_RESTAURATION =
  process.env.STATUT_RESTAURATION || "/srv/psy/restauration-statut.json";
const LIMITE_RESTAURATION_MS = 40 * 24 * 3_600_000;

export type StatutRestauration =
  | { etat: "inconnu" }
  | { etat: "ok" | "ancien"; date: Date; patients: number; seances: number }
  | { etat: "echec"; date: Date; motif: string };

export async function statutRestauration(): Promise<StatutRestauration> {
  try {
    const brut = JSON.parse(
      await readFile(/* turbopackIgnore: true */ CHEMIN_RESTAURATION, "utf8"),
    ) as { date: string; ok: boolean; patients: number; seances: number; motif: string };
    const date = new Date(brut.date);
    if (Number.isNaN(date.getTime())) return { etat: "inconnu" };
    if (!brut.ok) return { etat: "echec", date, motif: String(brut.motif ?? "") };
    return {
      etat: Date.now() - date.getTime() > LIMITE_RESTAURATION_MS ? "ancien" : "ok",
      date,
      patients: brut.patients,
      seances: brut.seances,
    };
  } catch {
    return { etat: "inconnu" };
  }
}

export async function statutSauvegarde(): Promise<StatutSauvegarde> {
  try {
    const brut = JSON.parse(
      await readFile(/* turbopackIgnore: true */ CHEMIN, "utf8"),
    ) as {
      date: string;
      taille: number;
      nombre: number;
    };
    const date = new Date(brut.date);
    if (Number.isNaN(date.getTime())) return { etat: "inconnu" };
    return {
      etat: Date.now() - date.getTime() > LIMITE_MS ? "ancienne" : "ok",
      date,
      tailleMo: Math.round((brut.taille / 1_048_576) * 10) / 10,
      nombre: brut.nombre,
    };
  } catch {
    return { etat: "inconnu" };
  }
}
