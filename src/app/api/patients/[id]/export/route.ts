import { prisma } from "@/lib/db";
import { refusSansSession } from "@/lib/garde";
import { cleNotesPresente, dechiffrer } from "@/lib/chiffrement";

/**
 * Export du dossier d'un patient (droit d'accès, RGPD) : un fichier JSON qui
 * regroupe tout ce que l'outil sait de lui.
 *
 * Les notes de séance sont cliniques et chiffrées : elles n'entrent dans
 * l'export que si on le demande (?notes=1), pour que la praticienne choisisse
 * ce qu'elle remet — certaines notes personnelles n'ont pas à être transmises.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const refus = await refusSansSession();
  if (refus) return refus;

  const { id } = await params;
  const avecNotes = new URL(req.url).searchParams.get("notes") === "1";

  const p = await prisma.patient.findUnique({
    where: { id },
    include: {
      cabinet: { select: { nom: true } },
      tarif: { select: { libelle: true, amountCents: true } },
      patientNotes: { orderBy: { createdAt: "asc" } },
      documents: {
        select: { nom: true, mime: true, taille: true, createdAt: true },
      },
      sessions: {
        orderBy: { startsAt: "asc" },
        include: { cabinet: { select: { nom: true } } },
      },
    },
  });
  if (!p) return new Response("Dossier introuvable.", { status: 404 });

  const cle = avecNotes && cleNotesPresente();
  const dossier = {
    exporteLe: new Date().toISOString(),
    avecNotesDeSeance: Boolean(cle),
    identite: {
      prenom: p.firstName,
      nom: p.lastName,
      dateDeNaissance: p.birthDate?.toISOString().slice(0, 10) ?? null,
      numeroNational: p.nationalNumber,
    },
    coordonnees: {
      telephone: p.phone,
      email: p.email,
      mere: { telephone: p.phoneMother, email: p.emailMother },
      pere: { telephone: p.phoneFather, email: p.emailFather },
      adresse: p.addressLine
        ? { rue: p.addressLine, codePostal: p.postalCode, commune: p.city }
        : null,
    },
    priseEnCharge: {
      regime:
        p.scheme === "CONVENTIONNE"
          ? "conventionné (psychologue de première ligne)"
          : "privé",
      tarif: p.tarif
        ? { libelle: p.tarif.libelle, montantCentimes: p.tarif.amountCents }
        : null,
      cabinetHabituel: p.cabinet?.nom ?? null,
      rappelsParEmail: p.rappelsEmail,
    },
    notesLibres: p.patientNotes.map((n) => ({
      date: n.createdAt.toISOString(),
      texte: n.body,
    })),
    documents: p.documents.map((d) => ({
      nom: d.nom,
      type: d.mime,
      tailleOctets: d.taille,
      ajouteLe: d.createdAt.toISOString(),
    })),
    seances: p.sessions.map((s) => {
      let note: string | null | undefined;
      if (cle && s.note) {
        try {
          note = dechiffrer(s.note, "NOTES_KEY");
        } catch {
          note = "(note illisible)";
        }
      }
      return {
        debut: s.startsAt.toISOString(),
        dureeMinutes: s.durationMin,
        lieu: s.cabinet.nom,
        enVisio: s.visio,
        statut: s.status,
        paiement: s.paymentStatus,
        montantCentimes: s.amountCents,
        ...(cle ? { note: note ?? null } : {}),
      };
    }),
  };

  const nom =
    `${p.lastName}-${p.firstName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "patient";
  return new Response(JSON.stringify(dossier, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dossier-${nom}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
