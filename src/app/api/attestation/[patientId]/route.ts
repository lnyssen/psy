import { construireAttestation } from "@/lib/attestation-pdf";
import { refusSansSession } from "@/lib/garde";

/** Attestation de présence en PDF : ?du=AAAA-MM-JJ&au=AAAA-MM-JJ&montants=1&pour=… */
export async function GET(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const refus = await refusSansSession();
  if (refus) return refus;
  const { patientId } = await params;
  const q = new URL(req.url).searchParams;
  const resultat = await construireAttestation({
    patientId,
    du: q.get("du") ?? "",
    au: q.get("au") ?? "",
    montants: q.get("montants") === "1",
    pour: (q.get("pour") ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, 120),
  });
  if (!resultat.ok) return new Response(resultat.message, { status: resultat.statut });
  return new Response(resultat.octets as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${resultat.nom}"`,
      "Cache-Control": "no-store",
    },
  });
}
