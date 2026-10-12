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
