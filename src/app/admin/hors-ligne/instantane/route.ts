import { prisma } from "@/lib/db";
import { refusSansSession } from "@/lib/garde";
import { parametres } from "@/lib/parametres";
import { ajouterJours, debutDeJour, partiesJour } from "@/lib/format";
import { construireInstantane } from "@/lib/hors-ligne";

export const dynamic = "force-dynamic";

/** Prochain jour ouvré à partir de la date donnée, elle comprise. */
function prochainJourOuvre(d: Date) {
  let x = d;
  for (let i = 0; i < 7; i++) {
    const { annee, mois, jour } = partiesJour(x);
    const semaine = new Date(Date.UTC(annee, mois - 1, jour)).getUTCDay();
    if (semaine !== 0 && semaine !== 6) return x;
    x = ajouterJours(x, 1);
  }
  return x;
}

/**
 * L'instantané de la journée pour l'affichage hors connexion — voir
 * lib/hors-ligne.ts pour ce qu'il contient. Demandé par l'appareil qui a activé
 * l'option, tant qu'il est connecté ; jamais mis en cache par le navigateur.
 */
export async function GET() {
  const refus = await refusSansSession();
  if (refus) return refus;
  const maintenant = new Date();
  const premier = debutDeJour(prochainJourOuvre(maintenant));
  const second = debutDeJour(prochainJourOuvre(ajouterJours(premier, 1)));

  const [seances, reglages] = await Promise.all([
    prisma.session.findMany({
      where: { startsAt: { gte: premier, lt: ajouterJours(second, 1) } },
      include: { patient: true, cabinet: true },
      orderBy: { startsAt: "asc" },
    }),
    parametres(),
  ]);
  const duJour = (debut: Date) =>
    seances.filter((s) => s.startsAt >= debut && s.startsAt < ajouterJours(debut, 1));

  const corps = construireInstantane({
    maintenant,
    accent: reglages.accent,
    jours: [
      { debut: premier, seances: duJour(premier) },
      ...(second.getTime() !== premier.getTime() ? [{ debut: second, seances: duJour(second) }] : []),
    ],
  });
  return Response.json(corps, { headers: { "Cache-Control": "no-store" } });
}
