import { prisma } from "@/lib/db";
import { parametres } from "@/lib/parametres";
import { debutDeJour, minutesDeJour, partiesJour } from "@/lib/format";

/**
 * Calcul des créneaux proposables au public.
 *
 * Un créneau n'est offert que s'il franchit tous ces filtres : il tombe dans
 * une plage d'ouverture du lieu, il n'est pas passé, il ne chevauche aucune
 * séance déjà prise — dans aucun lieu, elle ne peut pas être à deux endroits —,
 * il ne tombe pas dans un congé, il ne chevauche aucune demande en attente, il
 * laisse le battement voulu avant et après une séance du même lieu, et il
 * laisse le temps de rejoindre le lieu depuis une séance ailleurs.
 *
 * Deux familles de candidats, et c'est la seconde qui compte :
 *
 * - la grille régulière, au pas choisi depuis les réglages ;
 * - les créneaux qui se raccrochent aux séances déjà posées, c'est-à-dire
 *   commençant exactement à la fin de l'une d'elles, battement compris.
 *
 * Sans cette seconde famille, une séance finissant à 10 h 45 laisserait la
 * grille reprendre à 11 h 00 et perdrait un quart d'heure à chaque fois. Avec
 * elle, la journée se tasse d'elle-même autour de ce qui est déjà pris — c'est
 * la différence entre un agenda calculé sur une grille et un agenda calculé sur
 * la journée réelle.
 */

export type Creneau = { iso: string; minutes: number };
export type JourCreneaux = { iso: string; creneaux: Creneau[] };

export async function creneauxDisponibles(
  cabinetId: string,
  semaines?: number,
): Promise<JourCreneaux[]> {
  const p = await parametres();
  const portee = semaines ?? p.horizonSemaines;

  const maintenant = new Date();
  const debut = debutDeJour(maintenant);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + portee * 7);

  const [ouvertures, seances, conges, demandes] = await Promise.all([
    prisma.disponibilite.findMany({ where: { cabinetId } }),
    prisma.session.findMany({
      where: { startsAt: { gte: debut, lt: fin }, status: { not: "CANCELLED_IN_TIME" } },
      select: { startsAt: true, durationMin: true, cabinetId: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.indisponibilite.findMany({ where: { fin: { gte: debut }, debut: { lt: fin } } }),
    prisma.demandeRdv.findMany({
      where: { statut: "EN_ATTENTE", souhaite: { gte: debut, lt: fin } },
      select: { souhaite: true },
    }),
  ]);

  if (ouvertures.length === 0) return [];

  const duree = p.dureeSeanceMin;
  const jours: JourCreneaux[] = [];

  for (let d = 0; d < portee * 7; d++) {
    const jour = new Date(debut);
    jour.setDate(jour.getDate() + d);
    const { annee, mois, jour: numero } = partiesJour(jour);
    const semaine = new Date(Date.UTC(annee, mois - 1, numero)).getUTCDay();
    const index = (semaine + 6) % 7; // 0 = lundi
    if (index > 4) continue; // pas de séance le week-end

    const plages = ouvertures.filter((o) => o.jour === index);
    if (plages.length === 0) continue;

    const duJour = seances.filter((s) => {
      const m = minutesDeJour(s.startsAt);
      return (
        partiesJour(s.startsAt).jour === numero &&
        partiesJour(s.startsAt).mois === mois &&
        partiesJour(s.startsAt).annee === annee &&
        m >= 0
      );
    });

    const candidats = new Set<number>();
    for (const plage of plages) {
      for (let m = plage.debutMin; m + duree <= plage.finMin; m += p.pasMin) candidats.add(m);

      // Créneaux raccrochés aux séances du jour : juste après l'une d'elles,
      // battement compris, et juste avant la suivante.
      if (p.chainerSeances) {
        for (const s of duJour) {
          const debutS = minutesDeJour(s.startsAt);
          const finS = debutS + s.durationMin;
          const apres = finS + p.battementMin;
          if (apres >= plage.debutMin && apres + duree <= plage.finMin) candidats.add(apres);
          const avant = debutS - p.battementMin - duree;
          if (avant >= plage.debutMin && avant + duree <= plage.finMin) candidats.add(avant);
        }
      }
    }

    const creneaux: Creneau[] = [];

    for (const m of [...candidats].sort((a, b) => a - b)) {
      const dateCreneau = new Date(jour);
      dateCreneau.setHours(Math.floor(m / 60), m % 60, 0, 0);
      const finCreneau = new Date(dateCreneau.getTime() + duree * 60_000);

      if (dateCreneau <= maintenant) continue;
      if (conges.some((c) => dateCreneau < c.fin && finCreneau > c.debut)) continue;

      if (
        demandes.some((dm) => {
          const f = new Date(dm.souhaite.getTime() + duree * 60_000);
          return dateCreneau < f && finCreneau > dm.souhaite;
        })
      )
        continue;

      const impossible = seances.some((s) => {
        const debutS = s.startsAt;
        const finS = new Date(s.startsAt.getTime() + s.durationMin * 60_000);
        // Chevauchement franc, quel que soit le lieu.
        if (dateCreneau < finS && finCreneau > debutS) return true;

        // Écart requis : le battement dans le même lieu, le trajet ailleurs.
        const requis = s.cabinetId === cabinetId ? p.battementMin : p.trajetMin;
        if (requis === 0) return false;
        const apres = (dateCreneau.getTime() - finS.getTime()) / 60_000;
        const avant = (debutS.getTime() - finCreneau.getTime()) / 60_000;
        return (apres >= 0 && apres < requis) || (avant >= 0 && avant < requis);
      });
      if (impossible) continue;

      creneaux.push({ iso: dateCreneau.toISOString(), minutes: m });
    }

    if (creneaux.length > 0) jours.push({ iso: jour.toISOString(), creneaux });
  }

  return jours;
}

/** Vérifie qu'un créneau demandé est toujours libre au moment de valider. Le
 *  calcul d'affichage ne suffit pas : quelques minutes peuvent s'écouler entre
 *  l'affichage et l'envoi du formulaire. */
export async function creneauEncoreLibre(cabinetId: string, iso: string) {
  const jours = await creneauxDisponibles(cabinetId);
  return jours.some((j) => j.creneaux.some((c) => c.iso === iso));
}
