import { prisma } from "@/lib/db";
import { refusSansSession } from "@/lib/garde";
import { cleNotesPresente, dechiffrerOctets } from "@/lib/chiffrement";

/** Téléchargement d'un document joint : déchiffré à la volée, jamais mis en cache. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const refus = await refusSansSession();
  if (refus) return refus;
  if (!cleNotesPresente())
    return new Response("Clé de chiffrement absente.", { status: 503 });

  const { id } = await params;
  const d = await prisma.documentPatient.findUnique({ where: { id } });
  if (!d) return new Response("Document introuvable.", { status: 404 });

  let contenu: Buffer;
  try {
    contenu = dechiffrerOctets(d.contenu);
  } catch {
    return new Response("Document illisible.", { status: 500 });
  }
  return new Response(new Uint8Array(contenu), {
    headers: {
      "Content-Type": d.mime,
      // « attachment » : jamais affiché dans la page, même une image ou un PDF.
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(d.nom)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
