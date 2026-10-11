import type { FactureEtablissement, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Séances à relier de nouveau à une facture annulée qu'on rétablit, ou null
 * si la rétablir n'est plus possible sans fausser les comptes.
 *
 * L'annulation a rendu ses séances à factureId nul sans garder la liste :
 * on la retrouve comme l'émission l'avait faite (mêmes cabinet, mois et
 * statuts facturables, encore libres), et on n'accepte que si le total des
 * durées retombe exactement sur les heures figées sur la facture. Sinon, une
 * séance a été refacturée ailleurs, ajoutée ou modifiée entre-temps :
 * rétablir facturerait deux fois, ou autre chose que ce que dit le PDF.
 *
 * Une facture manuelle n'a pas de séances : toujours rétablissable.
 */
export async function seancesARetablir(
  facture: FactureEtablissement,
  client: Prisma.TransactionClient = prisma,
): Promise<{ id: string; durationMin: number }[] | null> {
  if (!facture.annuleeLe || facture.payeeLe) return null;
  if (facture.manuelle) return [];
  if (facture.heuresTotalesMin === null || facture.tarifHoraireCents === null) return null;

  const debut = new Date(Date.UTC(facture.annee, facture.mois - 1, 1));
  const fin = new Date(Date.UTC(facture.annee, facture.mois, 1));
  const seances = await client.session.findMany({
    where: {
      cabinetId: facture.cabinetId,
      startsAt: { gte: debut, lt: fin },
      status: { in: ["ATTENDED", "NO_SHOW"] },
      factureId: null,
    },
    select: { id: true, durationMin: true },
  });
  const total = seances.reduce((n, s) => n + s.durationMin, 0);
  if (seances.length === 0 || total !== facture.heuresTotalesMin) return null;
  return seances;
}
