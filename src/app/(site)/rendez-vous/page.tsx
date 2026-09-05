import { prisma } from "@/lib/db";
import { creneauxDisponibles } from "@/lib/creneaux";
import { PriseRdv } from "@/components/PriseRdv";
import { adresseCabinet } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RendezVous({
  searchParams,
}: {
  searchParams: Promise<{ cabinet?: string; p?: string }>;
}) {
  const { cabinet, p } = await searchParams;

  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true, publie: true },
    orderBy: { ordre: "asc" },
  });
  if (cabinets.length === 0) return null;

  const choisi = cabinets.find((c) => c.id === cabinet) ?? cabinets[0];
  const jours = await creneauxDisponibles(choisi.id);

  // Le lien personnel vaut reconnaissance : on ne redemande pas ses
  // coordonnées à quelqu'un dont on a déjà le dossier.
  const patient = p
    ? await prisma.patient.findUnique({
        where: { jetonRdv: p },
        select: { firstName: true, lastName: true },
      })
    : null;

  return (
    <PriseRdv
      cabinets={cabinets.map((c) => ({
        id: c.id,
        nom: c.nom,
        adresse: adresseCabinet(c),
        colorHex: c.colorHex,
        fillHex: c.fillHex,
      }))}
      cabinetChoisi={choisi.id}
      jours={jours}
      jeton={patient ? (p ?? null) : null}
      nomConnu={patient ? `${patient.firstName} ${patient.lastName}` : null}
      lienInvalide={Boolean(p) && !patient}
    />
  );
}
