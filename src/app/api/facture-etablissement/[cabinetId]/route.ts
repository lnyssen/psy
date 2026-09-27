import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/db";
import { adresseCabinet, euros, formatDuree } from "@/lib/format";
import { heuresFacturablesSemaine } from "@/lib/quotas";

const MOIS_LABEL = new Intl.DateTimeFormat("fr-BE", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Facture récapitulative mensuelle à un établissement, en PDF.
 *
 * Pendant de /api/recu, mais dans l'autre logique : l'école ne paie pas par
 * patient ni par séance, elle règle un relevé d'heures pour tout le mois. Pas
 * de mention de patient ici — le document part chez un tiers qui n'a pas à
 * connaître les noms suivis, seulement le volume presté.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ cabinetId: string }> },
) {
  const { cabinetId } = await params;
  const url = new URL(req.url);
  const annee = Number(url.searchParams.get("annee"));
  const mois = Number(url.searchParams.get("mois"));
  if (!Number.isInteger(annee) || !Number.isInteger(mois) || mois < 1 || mois > 12) {
    return new Response("Période invalide.", { status: 400 });
  }

  const cabinet = await prisma.cabinet.findUnique({ where: { id: cabinetId } });
  if (!cabinet?.factureInstitution || !cabinet.tarifHoraireCents) {
    return new Response("Ce lieu n'est pas facturé à l'heure à un établissement.", { status: 409 });
  }

  const debut = new Date(Date.UTC(annee, mois - 1, 1));
  const fin = new Date(Date.UTC(annee, mois, 1));
  const seances = await prisma.session.findMany({
    where: { cabinetId, startsAt: { gte: debut, lt: fin }, status: { in: ["ATTENDED", "NO_SHOW"] } },
    select: { durationMin: true, status: true },
  });
  if (seances.length === 0) {
    return new Response("Aucun acte facturable sur cette période.", { status: 404 });
  }

  const heures = heuresFacturablesSemaine(seances);
  const montant = Math.round(heures * cabinet.tarifHoraireCents);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const gras = await pdf.embedFont(StandardFonts.HelveticaBold);

  const encre = rgb(0.153, 0.153, 0.341);
  const violet = rgb(0.498, 0, 1);
  const gris = rgb(0.37, 0.37, 0.5);

  const M = 56;
  let y = 786;
  const ecrire = (
    texte: string,
    opts: { taille?: number; police?: typeof normal; couleur?: typeof encre; x?: number } = {},
  ) => {
    page.drawText(texte, {
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
  y -= 11;
  ecrire(`${cabinet.nom} — ${adresseCabinet(cabinet)}`, { taille: 8, couleur: gris });
  y -= 24;
  page.drawRectangle({ x: M, y, width: 483, height: 2, color: violet });

  y -= 42;
  ecrire("FACTURE — RELEVÉ MENSUEL", { taille: 14, police: gras });
  y -= 18;
  ecrire(`Période : ${MOIS_LABEL.format(debut)}`, { taille: 9, couleur: gris });

  y -= 40;
  const lignes: [string, string][] = [
    ["Établissement", cabinet.nom],
    ["Nombre d'actes", String(seances.length)],
    ["Total des heures", formatDuree(heures)],
    ["Tarif horaire", euros(cabinet.tarifHoraireCents)],
  ];
  for (const [cle, valeur] of lignes) {
    ecrire(cle.toUpperCase(), { taille: 7.5, couleur: gris });
    ecrire(valeur, { taille: 11, x: M + 200 });
    y -= 26;
  }

  y -= 14;
  page.drawRectangle({ x: M, y: y - 10, width: 483, height: 44, color: rgb(0.945, 0.902, 0.996) });
  y += 6;
  ecrire("MONTANT DÛ", { taille: 8, couleur: gris, x: M + 16 });
  ecrire(euros(montant), { taille: 18, police: gras, couleur: violet, x: M + 330 });

  y -= 80;
  ecrire(
    "Les prestations de psychologue sont exonérées de TVA (art. 44 du Code de la TVA).",
    { taille: 8, couleur: gris },
  );
  y -= 13;
  ecrire("Document de démonstration — données fictives.", { taille: 7.5, couleur: gris });

  const octets = await pdf.save();
  const nom = `facture-${cabinet.nom.toLowerCase().replace(/[^a-z]/g, "")}-${annee}-${String(mois).padStart(2, "0")}.pdf`;

  return new Response(octets as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nom}"`,
      "Cache-Control": "no-store",
    },
  });
}
