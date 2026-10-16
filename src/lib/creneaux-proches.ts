import type { JourCreneaux } from "@/lib/creneaux";

/**
 * Les créneaux libres les plus proches d'un rendez-vous qu'on veut déplacer,
 * dans le temps d'abord (avant ou après), puis du plus tôt au plus tard.
 *
 * `origine` est exclu : proposer l'heure qu'on quitte n'aide personne. On rend
 * peu de choix — six — parce qu'une liste de trente créneaux n'en propose
 * aucun : le but est de décider vite, pas de refaire l'agenda.
 */
export function creneauxLesPlusProches(
  jours: JourCreneaux[],
  origine: Date,
  combien = 6,
): string[] {
  const o = origine.getTime();
  return jours
    .flatMap((j) => j.creneaux.map((c) => c.iso))
    .filter((iso) => new Date(iso).getTime() !== o)
    .map((iso) => ({ iso, ecart: Math.abs(new Date(iso).getTime() - o) }))
    .sort((a, b) => a.ecart - b.ecart || a.iso.localeCompare(b.iso))
    .slice(0, combien)
    .sort((a, b) => a.iso.localeCompare(b.iso))
    .map((x) => x.iso);
}
