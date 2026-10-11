import { prisma } from "@/lib/db";

/**
 * Ce qui attend une décision d'Amandine côté Google Agenda.
 *
 * Un rendez-vous hebdomadaire créé dans Google donne des dizaines
 * d'occurrences, mais une seule décision : on compte donc des LIGNES (une par
 * série, une par événement isolé), et on garde le nombre de rendez-vous à
 * part. Compter les occurrences comme des tâches ferait croire à un travail
 * dix fois plus lourd qu'il ne l'est.
 */
export type Ligne<T extends { serieId: string | null }> = { tete: T; occurrences: T[] };

/** Regroupe en lignes, dans l'ordre de la prochaine date de chacune. `evenements`
 *  doit déjà être trié par date croissante. */
export function grouperEnLignes<T extends { id: string; serieId: string | null }>(
  evenements: T[],
): Ligne<T>[] {
  const lignes: Ligne<T>[] = [];
  const parSerie = new Map<string, Ligne<T>>();
  for (const ev of evenements) {
    if (!ev.serieId) {
      lignes.push({ tete: ev, occurrences: [ev] });
      continue;
    }
    const existante = parSerie.get(ev.serieId);
    if (existante) existante.occurrences.push(ev);
    else {
      const ligne = { tete: ev, occurrences: [ev] };
      parSerie.set(ev.serieId, ligne);
      lignes.push(ligne);
    }
  }
  return lignes;
}

export async function compterAFaire() {
  const lignes = await prisma.evenementGoogle.findMany({
    where: { statut: "A_RATTACHER", fin: { gte: new Date() } },
    select: { id: true, serieId: true },
    orderBy: { debut: "asc" },
  });
  return { lignes: grouperEnLignes(lignes).length, rendezVous: lignes.length };
}
