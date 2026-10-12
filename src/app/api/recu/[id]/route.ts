import { construireRecu } from "@/lib/recu-pdf";
import { refusSansSession } from "@/lib/garde";

/** Reçu d'honoraires en PDF : la mise en page est dans lib/recu-pdf.ts, que
 *  l'envoi par e-mail utilise aussi. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const refus = await refusSansSession();
  if (refus) return refus;
  const { id } = await params;
  const recu = await construireRecu(id);
  if (!recu.ok) return new Response(recu.message, { status: recu.statut });
  return new Response(recu.octets as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${recu.nom}"`,
      "Cache-Control": "no-store",
    },
  });
}
