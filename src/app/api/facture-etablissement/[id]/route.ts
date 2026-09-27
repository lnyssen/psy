import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/db";
import { adresseCabinet, euros, fmtJourMoisAn, formatDuree } from "@/lib/format";

const MOIS_LABEL = new Intl.DateTimeFormat("fr-BE", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Facture à un établissement, en PDF — le document tel qu'émis, jamais
 * recalculé. Tout ce qu'il affiche vient de la ligne FactureEtablissement
 * elle-même, pas d'une nouvelle agrégation des séances : c'est précisément ce
 * qui distingue une facture d'un relevé (voir le commentaire du modèle).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const facture = await prisma.factureEtablissement.findUnique({
    where: { id },
    include: { cabinet: true },
  });
  if (!facture) return new Response("Facture introuvable.", { status: 404 });

  const reglages = await prisma.parametres.findUnique({ where: { id: "global" } });

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
  ecrire(
    `AMAPSY SRL — Psychologue${reglages?.numeroEntreprise ? ` — ${reglages.numeroEntreprise}` : ""}`,
    { taille: 9, couleur: gris },
  );
  y -= 11;
  ecrire(`${facture.cabinet.nom} — ${adresseCabinet(facture.cabinet)}`, { taille: 8, couleur: gris });
  y -= 24;
  page.drawRectangle({ x: M, y, width: 483, height: 2, color: violet });

  y -= 36;
  ecrire(`FACTURE N° ${facture.annee}-${String(facture.numero).padStart(3, "0")}`, {
    taille: 14,
    police: gras,
  });
  y -= 18;
  ecrire(`Émise le ${fmtJourMoisAn.format(facture.emiseLe)} — échéance le ${fmtJourMoisAn.format(facture.echeanceLe)}`, {
    taille: 9,
    couleur: gris,
  });

  y -= 40;
  const lignes: [string, string][] = [
    ["Établissement", facture.cabinet.nom],
    ["Période", MOIS_LABEL.format(new Date(Date.UTC(facture.annee, facture.mois - 1, 1)))],
    // Une facture manuelle n'a pas de décompte d'heures : son libellé en
    // tient lieu (voir FactureEtablissement.manuelle).
    ...(facture.heuresTotalesMin !== null && facture.tarifHoraireCents !== null
      ? ([
          ["Total des heures", formatDuree(facture.heuresTotalesMin / 60)],
          ["Tarif horaire", euros(facture.tarifHoraireCents)],
        ] as [string, string][])
      : ([["Détail", facture.libelle ?? "—"]] as [string, string][])),
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
  ecrire(euros(facture.montantCents), { taille: 18, police: gras, couleur: violet, x: M + 330 });

  y -= 50;
  if (reglages?.iban) {
    ecrire(`À verser au compte ${reglages.iban}, avant le ${fmtJourMoisAn.format(facture.echeanceLe)}.`, {
      taille: 9,
      couleur: gris,
    });
    y -= 24;
  }
  ecrire(
    "Les prestations de psychologue sont exonérées de TVA (art. 44 du Code de la TVA).",
    { taille: 8, couleur: gris },
  );
  y -= 13;
  ecrire(
    facture.payeeLe ? `Payée le ${fmtJourMoisAn.format(facture.payeeLe)}.` : "Document de démonstration — données fictives.",
    { taille: 7.5, couleur: gris },
  );

  const octets = await pdf.save();
  const nom = `facture-${facture.annee}-${String(facture.numero).padStart(3, "0")}.pdf`;

  return new Response(octets as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nom}"`,
      "Cache-Control": "no-store",
    },
  });
}
