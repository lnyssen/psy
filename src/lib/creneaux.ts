import { prisma } from "@/lib/db";
import { DUREE_SEANCE, TRAJET_MIN, debutDeJour, minutesDeJour, partiesJour } from "@/lib/format";

/**
 * Calcul des créneaux proposables au public.
 *
 * Un créneau n'est offert que s'il franchit tous ces filtres, dans cet ordre :
 * il tombe dans une plage d'ouverture du lieu, il n'est pas passé, il ne
 * chevauche aucune séance déjà prise (dans aucun lieu — elle ne peut pas être
 * à deux endroits), il ne tombe pas dans un congé, il ne chevauche aucune
 * demande en attente, et il laisse le temps de rejoindre le lieu depuis la
 * séance précédente si celle-ci est ailleurs.
 *
 * Ce dernier filtre est le même que celui qui signale les conflits dans
 * l'agenda. Il vaut mieux ne pas proposer un créneau intenable que d'avoir à
 * le refuser ensuite.
 */

export type Creneau = { iso: string; minutes: number };
export type JourCreneaux = { iso: string; creneaux: Creneau[] };

/** Pas de proposition : les créneaux tombent tous les quarts d'heure. */
const PAS = 15;

export async function creneauxDisponibles(cabinetId: string, semaines = 4): Promise<JourCreneaux[]> {
  const maintenant = new Date();
  const debut = debutDeJour(maintenant);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + semaines * 7);

  const [ouvertures, seances, conges, demandes] = await Promise.all([
    prisma.disponibilite.findMany({ where: { cabinetId } }),
    // Toutes les séances, tous lieux confondus : une occupation ailleurs
    // bloque le créneau ici.
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

  const jours: JourCreneaux[] = [];

  for (let d = 0; d < semaines * 7; d++) {
    const jour = new Date(debut);
    jour.setDate(jour.getDate() + d);
    const { annee, mois, jour: numero } = partiesJour(jour);
    const semaine = new Date(Date.UTC(annee, mois - 1, numero)).getUTCDay();
    const index = (semaine + 6) % 7; // 0 = lundi
    if (index > 4) continue; // pas de séance le week-end

    const plages = ouvertures.filter((o) => o.jour === index);
    if (plages.length === 0) continue;

    const creneaux: Creneau[] = [];

    for (const plage of plages) {
      for (let m = plage.debutMin; m + DUREE_SEANCE <= plage.finMin; m += PAS) {
        const dateCreneau = new Date(jour);
        dateCreneau.setHours(Math.floor(m / 60), m % 60, 0, 0);
        const finCreneau = new Date(dateCreneau.getTime() + DUREE_SEANCE * 60_000);

        if (dateCreneau <= maintenant) continue;

        if (conges.some((c) => dateCreneau < c.fin && finCreneau > c.debut)) continue;

        if (
          demandes.some((dm) => {
            const f = new Date(dm.souhaite.getTime() + DUREE_SEANCE * 60_000);
            return dateCreneau < f && finCreneau > dm.souhaite;
          })
        )
          continue;

        const chevauche = seances.some((s) => {
          const f = new Date(s.startsAt.getTime() + s.durationMin * 60_000);
          return dateCreneau < f && finCreneau > s.startsAt;
        });
        if (chevauche) continue;

        // Temps de trajet : on regarde la séance qui précède et celle qui suit.
        const trajetImpossible = seances.some((s) => {
          if (s.cabinetId === cabinetId) return false;
          const finS = new Date(s.startsAt.getTime() + s.durationMin * 60_000);
          const avant = (dateCreneau.getTime() - finS.getTime()) / 60_000;
          const apres = (s.startsAt.getTime() - finCreneau.getTime()) / 60_000;
          return (avant >= 0 && avant < TRAJET_MIN) || (apres >= 0 && apres < TRAJET_MIN);
        });
        if (trajetImpossible) continue;

        creneaux.push({ iso: dateCreneau.toISOString(), minutes: minutesDeJour(dateCreneau) });
      }
    }

    if (creneaux.length > 0) {
      creneaux.sort((a, b) => a.minutes - b.minutes);
      jours.push({ iso: jour.toISOString(), creneaux });
    }
  }

  return jours;
}

/** Vérifie qu'un créneau demandé est toujours libre au moment de valider. Le
 *  calcul d'affichage ne suffit pas : quelques minutes peuvent s'écouler entre
 *  l'affichage et l'envoi du formulaire. */
export async function creneauEncoreLibre(cabinetId: string, iso: string) {
  const jours = await creneauxDisponibles(cabinetId, 8);
  return jours.some((j) => j.creneaux.some((c) => c.iso === iso));
}
