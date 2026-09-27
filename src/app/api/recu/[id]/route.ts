import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/db";
import {
  METHOD_LABEL,
  SCHEME_LABEL,
  adresseCabinet,
  euros,
  fmtHeure,
  fmtJourMoisAn,
  pourPdf,
} from "@/lib/format";

/**
 * Reçu d'honoraires, en PDF.
 *
 * Composé avec pdf-lib plutôt qu'en imprimant une page : un reçu est une pièce
 * comptable, il doit être identique quel que soit le navigateur qui l'a
 * demandé. Les polices standard du PDF couvrent le latin-1, donc les accents
 * français.
 *
 * Ce n'est pas une facture au sens légal : pas de numérotation séquentielle
 * certifiée, pas de mentions TVA — les prestations de psychologue en sont
 * exonérées en Belgique. Le format exact reste à valider avec la comptable.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seance = await prisma.session.findUnique({
    where: { id },
    include: { patient: true, cabinet: true },
  });
  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true },
    orderBy: { ordre: "asc" },
  });

  if (!seance) return new Response("Séance introuvable.", { status: 404 });
  if (!seance.patient) {
    // Un bloc facturé à un établissement n'a pas de patient : c'est une
    // facture numérotée (/api/facture-etablissement) qu'il lui faut, pas un
    // reçu individuel.
    return new Response("Cette séance ne concerne aucun patient.", { status: 409 });
  }
  if (seance.paymentStatus !== "PAID") {
    return new Response("Le reçu n’est délivré que pour une séance payée.", { status: 409 });
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const gras = await pdf.embedFont(StandardFonts.HelveticaBold);

  const encre = rgb(0.153, 0.153, 0.341); // #272757
  const violet = rgb(0.498, 0, 1); // #7F00FF
  const gris = rgb(0.37, 0.37, 0.5);

  const M = 56;
  let y = 786;

  const ecrire = (
    texte: string,
    opts: { taille?: number; police?: typeof normal; couleur?: typeof encre; x?: number } = {},
  ) => {
    page.drawText(pourPdf(texte), {
      x: opts.x ?? M,
      y,
      size: opts.taille ?? 10,
      font: opts.police ?? normal,
      color: opts.couleur ?? encre,
    });
  };

  ecrire("Amandine Monsel", { taille: 20, police: gras });
  y -= 16;
  ecrire("AMAPSY SRL — Psychologue", { taille: 9, couleur: gris });
  for (const c of cabinets) {
    y -= 11;
    ecrire(`${c.nom} — ${adresseCabinet(c)}`, { taille: 8, couleur: gris });
  }
  y -= 24;
  page.drawRectangle({ x: M, y, width: 483, height: 2, color: violet });

  y -= 42;
  ecrire("REÇU D’HONORAIRES", { taille: 14, police: gras });
  y -= 18;
  ecrire(`Émis le ${fmtJourMoisAn.format(new Date())}`, { taille: 9, couleur: gris });

  y -= 40;
  const p = seance.patient;
  const lignes: [string, string][] = [
    ["Patient", `${p.firstName} ${p.lastName}`],
    ...(p.addressLine
      ? ([["Adresse", `${p.addressLine}, ${p.postalCode ?? ""} ${p.city ?? ""}`.trim()]] as [string, string][])
      : []),
    ["Date de la séance", `${fmtJourMoisAn.format(seance.startsAt)} à ${fmtHeure.format(seance.startsAt)}`],
    ["Durée", `${seance.durationMin} minutes`],
    ["Lieu de la prestation", `${seance.cabinet.nom} — ${adresseCabinet(seance.cabinet)}`],
    ["Régime", SCHEME_LABEL[p.scheme]],
    [
      "Mode de paiement",
      seance.paymentMethod ? METHOD_LABEL[seance.paymentMethod] : "non précisé",
    ],
    ["Payé le", seance.paidAt ? fmtJourMoisAn.format(seance.paidAt) : "—"],
  ];

  for (const [cle, valeur] of lignes) {
    ecrire(cle.toUpperCase(), { taille: 7.5, couleur: gris });
    ecrire(valeur, { taille: 11, x: M + 150 });
    y -= 26;
  }

  y -= 14;
  page.drawRectangle({ x: M, y: y - 10, width: 483, height: 44, color: rgb(0.945, 0.902, 0.996) });
  y += 6;
  ecrire("MONTANT REÇU", { taille: 8, couleur: gris, x: M + 16 });
  ecrire(euros(seance.amountCents), {
    taille: 18,
    police: gras,
    couleur: violet,
    x: M + 330,
  });

  y -= 80;
  ecrire(
    "Les prestations de psychologue sont exonérées de TVA (art. 44 du Code de la TVA).",
    { taille: 8, couleur: gris },
  );
  y -= 13;
  ecrire("Ce document ne constitue pas une attestation de soins.", { taille: 8, couleur: gris });

  y = 60;
  ecrire("Document de démonstration — données fictives.", { taille: 7.5, couleur: gris });

  const octets = await pdf.save();
  const nom = `recu-${p.lastName.toLowerCase().replace(/[^a-z]/g, "")}-${seance.startsAt
    .toISOString()
    .slice(0, 10)}.pdf`;

  return new Response(octets as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nom}"`,
      "Cache-Control": "no-store",
    },
  });
}
