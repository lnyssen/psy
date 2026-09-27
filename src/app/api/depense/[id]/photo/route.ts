import { prisma } from "@/lib/db";

/**
 * Sert la photo d'un reçu de dépense, gardée en base à côté de sa fiche (voir
 * le commentaire du modèle Depense). Même logique que /api/recu : un fichier
 * comptable se sert tel quel, pas par un chemin de stockage public.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const depense = await prisma.depense.findUnique({
    where: { id },
    select: { photo: true, photoMime: true },
  });
  if (!depense?.photo) return new Response("Reçu introuvable.", { status: 404 });

  return new Response(depense.photo as BodyInit, {
    headers: {
      "Content-Type": depense.photoMime ?? "application/octet-stream",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
