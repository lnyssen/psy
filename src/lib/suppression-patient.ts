/**
 * Une séance qui interdit de supprimer le patient : passée (donc tenue ou
 * manquée, ou à statuer), ou qui porte un montant, un paiement, un reçu ou une
 * facture. Ce sont des pièces comptables ; elles ne partent pas avec la fiche.
 * Il ne reste alors que l'anonymisation. Ne restent supprimables que les
 * rendez-vous à venir et les annulations dans les temps sans aucun montant —
 * une fiche créée par erreur, un doublon, un patient qui n'est jamais venu.
 */
export function seancePieceComptable(s: {
  status: string;
  startsAt: Date;
  amountCents: number | null;
  paidAt: Date | null;
  receiptAt: Date | null;
  factureId: string | null;
}) {
  const sansTrace =
    s.amountCents === null && !s.paidAt && !s.receiptAt && !s.factureId;
  if (!sansTrace) return true;
  if (s.status === "CANCELLED_IN_TIME") return false;
  return !(s.status === "SCHEDULED" && s.startsAt.getTime() >= Date.now());
}

/** Rendez-vous encore à venir : ils partent avec la fiche. */
export function seanceAVenir(s: { status: string; startsAt: Date }) {
  return s.status === "SCHEDULED" && s.startsAt.getTime() >= Date.now();
}
