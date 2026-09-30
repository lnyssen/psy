import { PDFDocument, StandardFonts } from "pdf-lib";
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
import { PDF_COULEUR, PDF_CONTENU, PDF_HAUTEUR, PDF_LARGEUR, PDF_MARGE } from "@/lib/pdf";

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
 * exonérées en Belgique. La mise en page reprend cependant la même charte que
 * la facture à un établissement (voir /api/facture-etablissement) : même
 * palette, même traitement des filets et des blocs, pour que les deux pièces
 * sortent visiblement du même outil.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seance = await prisma.session.findUnique({
    where: { id },
    include: { patient: true, cabinet: true },
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
  const p = seance.patient;

  const reglages = await prisma.parametres.findUnique({ where: { id: "global" } });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PDF_LARGEUR, PDF_HAUTEUR]);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const gras = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { encre, violet, gris, filet } = PDF_COULEUR;
  const M = PDF_MARGE;
  const L = PDF_CONTENU;
  const X_DROITE = M + L;

  let y = 780;

  const texte = (
    t: string,
    x: number,
    opts: { taille?: number; police?: typeof normal; couleur?: typeof encre } = {},
  ) => {
    page.drawText(pourPdf(t), {
      x,
      y,
      size: opts.taille ?? 10,
      font: opts.police ?? normal,
      color: opts.couleur ?? encre,
    });
  };
  const texteDroite = (
    t: string,
    xDroite: number,
    opts: { taille?: number; police?: typeof normal; couleur?: typeof encre } = {},
  ) => {
    const police = opts.police ?? normal;
    const taille = opts.taille ?? 10;
    const largeur = police.widthOfTextAtSize(pourPdf(t), taille);
    texte(t, xDroite - largeur, opts);
  };
  const regle = (epaisseur = 1, couleur = filet, x1 = M, x2 = X_DROITE) =>
    page.drawRectangle({ x: x1, y, width: x2 - x1, height: epaisseur, color: couleur });
  const regleV = (x: number, yHaut: number, yBas: number, couleur = filet) =>
    page.drawRectangle({ x, y: yBas, width: 0.75, height: yHaut - yBas, color: couleur });

  // --- En-tête -------------------------------------------------------------
  const X_DROITE_BLOC = M + 300;
  texte("Amandine Monsel", M, { taille: 23, police: gras, couleur: violet });
  const yTitre = y;
  texteDroite("Reçu d’honoraires", X_DROITE, { taille: 15, police: gras, couleur: violet });
  y = yTitre - 30;
  texte("ÉMIS LE", X_DROITE_BLOC, { taille: 7.5, couleur: gris });
  texteDroite(fmtJourMoisAn.format(new Date()), X_DROITE, { taille: 10.5, police: gras });
  y -= 25;
  texte("SÉANCE DU", X_DROITE_BLOC, { taille: 7.5, couleur: gris });
  texteDroite(fmtJourMoisAn.format(seance.startsAt), X_DROITE, { taille: 10.5, police: gras });

  y = yTitre - 68;
  regle(2, violet);

  // --- De / Reçu de, deux colonnes sur un filet vertical -------------------
  const yBlocTiers = y;
  y -= 22;
  texte("DE", M, { taille: 7.5, couleur: gris });
  texte("REÇU DE", X_DROITE_BLOC, { taille: 7.5, couleur: gris });
  y -= 16;
  texte("Amandine Monsel", M, { taille: 12, police: gras, couleur: violet });
  texte(`${p.firstName} ${p.lastName}`, X_DROITE_BLOC, { taille: 12, police: gras, couleur: violet });
  y -= 15;
  texte("AMAPSY SRL — Psychologue", M, { taille: 9.5 });
  if (p.addressLine) texte(p.addressLine, X_DROITE_BLOC, { taille: 9.5 });
  y -= 13;
  texte(adresseCabinet(seance.cabinet), M, { taille: 9.5, couleur: gris });
  if (p.addressLine) texte(`${p.postalCode ?? ""} ${p.city ?? ""}`.trim(), X_DROITE_BLOC, { taille: 9.5 });
  if (reglages?.numeroEntreprise) {
    y -= 20;
    texte(`N° d’entreprise : ${reglages.numeroEntreprise}`, M, { taille: 9.5 });
  }
  const yBasBloc = y - 6;
  regleV(M + 260, yBlocTiers, yBasBloc);
  y = yBasBloc - 10;
  regle(1, filet);

  // --- Désignation ----------------------------------------------------------
  y -= 20;
  texte("DÉSIGNATION", M, { taille: 7.5, couleur: gris });
  texteDroite("MONTANT", X_DROITE, { taille: 7.5, couleur: gris });
  y -= 8;
  regle(1, filet);

  y -= 20;
  texte(`Séance du ${fmtJourMoisAn.format(seance.startsAt)} à ${fmtHeure.format(seance.startsAt)}`, M, {
    taille: 11,
    police: gras,
    couleur: violet,
  });
  texteDroite(euros(seance.amountCents), X_DROITE, { taille: 10.5 });
  y -= 15;
  texte(
    `${seance.durationMin} minutes · ${seance.cabinet.nom} · régime ${SCHEME_LABEL[p.scheme]}`,
    M,
    { taille: 9, couleur: gris },
  );
  y -= 24;
  regle(1, filet);

  // --- Montant reçu, aligné à droite --------------------------------------
  y -= 26;
  texte("MONTANT REÇU", M, { taille: 10, police: gras, couleur: violet });
  texteDroite(euros(seance.amountCents), X_DROITE, { taille: 19, police: gras, couleur: violet });
  y -= 12;
  regle(1.5, violet);
  y -= 16;
  texte("Les prestations de psychologue sont exonérées de TVA (art. 44 du Code de la TVA).", M, {
    taille: 8.5,
    couleur: gris,
  });
  y -= 13;
  texte("Ce document ne constitue pas une attestation de soins.", M, { taille: 8.5, couleur: gris });

  // --- Paiement, deux colonnes ----------------------------------------------
  y -= 26;
  const yPaiementHaut = y;
  const X_PAYE = M + 260;
  texte("MODE DE PAIEMENT", M, { taille: 7.5, couleur: gris });
  texte("PAYÉ LE", X_PAYE, { taille: 7.5, couleur: gris });
  y -= 15;
  texte(seance.paymentMethod ? METHOD_LABEL[seance.paymentMethod] : "non précisé", M, {
    taille: 10.5,
    police: gras,
  });
  texte(seance.paidAt ? fmtJourMoisAn.format(seance.paidAt) : "—", X_PAYE, { taille: 10.5, police: gras });
  const yPaiementBas = y - 8;
  regleV(X_PAYE - 20, yPaiementHaut, yPaiementBas);
  y = yPaiementBas - 8;
  regle(1, filet);

  // --- Pied de page ---------------------------------------------------------
  y = 70;
  regle(1, filet);
  y -= 16;
  texte(`Amandine Monsel — AMAPSY SRL · ${adresseCabinet(seance.cabinet)}`, M, { taille: 8, couleur: gris });
  texteDroite("Document de démonstration — données fictives.", X_DROITE, { taille: 8, couleur: gris });

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
