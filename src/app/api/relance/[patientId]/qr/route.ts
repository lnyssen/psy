import { refusSansSession } from "@/lib/garde";
import { qrVirement } from "@/lib/epc-qr";
import { parametres } from "@/lib/parametres";
import { relancesImpayees } from "@/lib/relance";

/**
 * Code QR de virement pour tout ce qu'un patient doit encore. S'ouvre dans un
 * onglet : on peut le montrer à l'écran, au cabinet, pour que le patient le
 * scanne avec l'application de sa banque.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const refus = await refusSansSession();
  if (refus) return refus;
  const { patientId } = await params;
  const [relance] = await relancesImpayees(patientId);
  if (!relance) return new Response("Rien n’est dû pour ce patient.", { status: 404 });
  const { iban } = await parametres();
  const png = await qrVirement({
    iban,
    montantCents: relance.totalCents,
    communication: `Séances ${relance.nom}`,
  });
  if (!png) return new Response("IBAN absent ou invalide dans les Réglages.", { status: 409 });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
