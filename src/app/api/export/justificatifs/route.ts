import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/db";
import { euros, fmtDateCourte, pourPdf } from "@/lib/format";

const MOIS_LABEL = new Intl.DateTimeFormat("fr-BE", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Rassemble en un seul PDF tous les reçus de dépenses d'un mois : une page
 * de sommaire, puis chaque reçu — photo ou PDF déjà scanné — sur sa propre
 * page. C'est le second document de l'export comptable, à côté du classeur
 * Excel : ensemble, ils remplacent la reconstitution à la main d'un dossier
 * pour la comptable.
 *
 * Une dépense sans reçu joint (photo facultative, voir le modèle Depense)
 * apparaît quand même dans le sommaire, marquée comme telle — l'absence de
 * preuve est une information, pas une raison de disparaître du mois.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const annee = Number(url.searchParams.get("annee"));
  const mois = Number(url.searchParams.get("mois"));
  if (!Number.isInteger(annee) || !Number.isInteger(mois) || mois < 1 || mois > 12) {
    return new Response("Période invalide.", { status: 400 });
  }

  const debut = new Date(Date.UTC(annee, mois - 1, 1));
  const fin = new Date(Date.UTC(annee, mois, 1));
  const depenses = await prisma.depense.findMany({
    where: { date: { gte: debut, lt: fin } },
    include: { categorie: true },
    orderBy: { date: "asc" },
  });
  if (depenses.length === 0) {
    return new Response("Aucune dépense sur cette période.", { status: 404 });
  }

  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const gras = await pdf.embedFont(StandardFonts.HelveticaBold);
  const encre = rgb(0.153, 0.153, 0.341);
  const violet = rgb(0.498, 0, 1);
  const gris = rgb(0.37, 0.37, 0.5);
  const M = 56;

  // --- Page de sommaire ---
  const sommaire = pdf.addPage([595.28, 841.89]);
  let y = 786;
  const ecrire = (
    texte: string,
    opts: { taille?: number; police?: typeof normal; couleur?: typeof encre } = {},
  ) => {
    sommaire.drawText(pourPdf(texte), {
      x: M,
      y,
      size: opts.taille ?? 10,
      font: opts.police ?? normal,
      color: opts.couleur ?? encre,
    });
  };
  ecrire("Amandine Monsel — Justificatifs de dépenses", { taille: 16, police: gras });
  y -= 20;
  ecrire(`Amapsy SRL — ${MOIS_LABEL.format(debut)}`, { taille: 10, couleur: gris });
  y -= 30;
  const total = depenses.reduce((n, d) => n + d.amountCents, 0);
  ecrire(`${depenses.length} dépense${depenses.length > 1 ? "s" : ""} — total ${euros(total)}`, {
    taille: 11,
    police: gras,
    couleur: violet,
  });
  y -= 30;
  for (const d of depenses) {
    if (y < 60) break; // au-delà, la page de sommaire déborderait ; rare à ce volume.
    ecrire(
      `${fmtDateCourte.format(d.date)}  ${d.libelle} (${d.categorie.libelle}) — ${euros(d.amountCents)}${
        d.photoMime ? "" : "  [sans reçu joint]"
      }`,
      { taille: 9 },
    );
    y -= 16;
  }

  // --- Un reçu par page ---
  for (const d of depenses) {
    if (!d.photo || !d.photoMime) continue;

    if (d.photoMime === "application/pdf") {
      try {
        const source = await PDFDocument.load(d.photo);
        const pages = await pdf.copyPages(source, source.getPageIndices());
        for (const p of pages) pdf.addPage(p);
      } catch {
        // Un PDF illisible ne doit pas faire échouer tout l'export.
      }
      continue;
    }

    let image;
    try {
      if (d.photoMime === "image/png") image = await pdf.embedPng(d.photo);
      else image = await pdf.embedJpg(d.photo); // le plus courant depuis un appareil photo.
    } catch {
      continue;
    }

    const page = pdf.addPage([595.28, 841.89]);
    const marge = 40;
    const largeurDispo = 595.28 - marge * 2;
    const hauteurDispo = 841.89 - marge * 2 - 60;
    const echelle = Math.min(largeurDispo / image.width, hauteurDispo / image.height, 1);
    const largeur = image.width * echelle;
    const hauteur = image.height * echelle;

    page.drawText(`${fmtDateCourte.format(d.date)} — ${d.libelle} — ${euros(d.amountCents)}`, {
      x: marge,
      y: 841.89 - marge,
      size: 10,
      font: gras,
      color: encre,
    });
    page.drawImage(image, {
      x: (595.28 - largeur) / 2,
      y: (841.89 - 60 - hauteur) / 2,
      width: largeur,
      height: hauteur,
    });
  }

  const octets = await pdf.save();
  const nom = `justificatifs-${annee}-${String(mois).padStart(2, "0")}.pdf`;

  return new Response(octets as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nom}"`,
      "Cache-Control": "no-store",
    },
  });
}
