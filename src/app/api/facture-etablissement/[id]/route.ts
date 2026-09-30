import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "@/lib/db";
import { SITE } from "@/lib/site";
import { euros, fmtJourMoisAn, formatDuree, pourPdf } from "@/lib/format";
import { PDF_COULEUR, PDF_CONTENU, PDF_HAUTEUR, PDF_LARGEUR, PDF_MARGE } from "@/lib/pdf";

const MOIS_LABEL = new Intl.DateTimeFormat("fr-BE", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Facture à un établissement, en PDF — le document tel qu'émis, jamais
 * recalculé. Tout ce qu'il affiche vient de la ligne FactureEtablissement
 * elle-même, pas d'une nouvelle agrégation des séances (voir le commentaire
 * du modèle).
 *
 * La mise en page reprend un modèle d'agence (deux colonnes DE/FACTURÉ À,
 * tableau désignation/prix/quantité/montant, bloc de paiement à trois
 * colonnes) plutôt que la simple liste clé-valeur d'avant — une facture, à
 * la différence d'un reçu, se lit souvent par quelqu'un d'autre qu'Amandine,
 * dans une compta, et doit se comprendre à la même vitesse qu'un modèle
 * qu'on connaît déjà.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const facture = await prisma.factureEtablissement.findUnique({
    where: { id },
    include: { cabinet: true },
  });
  if (!facture) return new Response("Facture introuvable.", { status: 404 });

  const reglages = await prisma.parametres.findUnique({ where: { id: "global" } });
  const c = facture.cabinet;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PDF_LARGEUR, PDF_HAUTEUR]);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const gras = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { encre, violet, gris, filet } = PDF_COULEUR;
  const M = PDF_MARGE;
  const L = PDF_CONTENU;
  const X_DROITE = M + L; // bord droit du contenu

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
  /** Texte aligné à droite sur `xDroite` : la largeur vient de la police, pas
   *  d'une estimation — un montant à quatre chiffres ne doit pas déraper. */
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
  texte("AMAPSY SRL", M, { taille: 23, police: gras, couleur: violet });
  const yTitre = y;
  texteDroite(`Facture ${facture.annee}-${String(facture.numero).padStart(3, "0")}`, X_DROITE, {
    taille: 15,
    police: gras,
    couleur: violet,
  });
  y = yTitre - 30;
  texte("DATE", X_DROITE_BLOC, { taille: 7.5, couleur: gris });
  texteDroite(fmtJourMoisAn.format(facture.emiseLe), X_DROITE, { taille: 10.5, police: gras });
  y -= 25;
  texte("ÉCHÉANCE", X_DROITE_BLOC, { taille: 7.5, couleur: gris });
  texteDroite(fmtJourMoisAn.format(facture.echeanceLe), X_DROITE, { taille: 10.5, police: gras });

  y = yTitre - 68;
  regle(2, violet);

  // --- De / Facturé à, deux colonnes sur un filet vertical ----------------
  const yBlocTiers = y;
  y -= 22;
  texte("DE", M, { taille: 7.5, couleur: gris });
  texte("FACTURÉ À", X_DROITE_BLOC, { taille: 7.5, couleur: gris });
  y -= 16;
  texte("AMAPSY SRL", M, { taille: 12, police: gras, couleur: violet });
  texte(c.raisonSociale || c.nom, X_DROITE_BLOC, { taille: 12, police: gras, couleur: violet });
  y -= 15;
  texte(reglages?.adresseSiege?.split("\n")[0] ?? "", M, { taille: 9.5 });
  texte(c.addressLine, X_DROITE_BLOC, { taille: 9.5 });
  y -= 13;
  texte(reglages?.adresseSiege?.split("\n")[1] ?? "", M, { taille: 9.5 });
  texte(`${c.postalCode} ${c.city}`, X_DROITE_BLOC, { taille: 9.5 });
  y -= 20;
  if (reglages?.numeroEntreprise) texte(`N° d’entreprise : ${reglages.numeroEntreprise}`, M, { taille: 9.5 });
  if (c.mentionLegaleClient) texte(c.mentionLegaleClient, X_DROITE_BLOC, { taille: 9.5 });
  y -= 13;
  if (reglages?.mentionLegale) texte(reglages.mentionLegale, M, { taille: 9.5 });
  const yBasBloc = y - 6;
  regleV(M + 260, yBlocTiers, yBasBloc);
  y = yBasBloc - 10;
  regle(1, filet);

  // --- Tableau désignation / prix / quantité / montant --------------------
  const X_PRIX = M + 250;
  const X_QTE = M + 340;
  y -= 20;
  texte("DÉSIGNATION", M, { taille: 7.5, couleur: gris });
  texte("PRIX UNITAIRE", X_PRIX, { taille: 7.5, couleur: gris });
  texte("QUANTITÉ", X_QTE, { taille: 7.5, couleur: gris });
  texteDroite("MONTANT", X_DROITE, { taille: 7.5, couleur: gris });
  y -= 8;
  regle(1, filet);

  y -= 20;
  // Le décompte d'heures s'affiche dès que l'un et l'autre sont connus, que la
  // facture vienne de l'agenda ou d'une saisie manuelle — voir
  // enregistrerFactureEtablissementManuelle, qui accepte les deux mêmes
  // champs pour reconstituer une facture à la main.
  if (facture.heuresTotalesMin !== null && facture.tarifHoraireCents !== null) {
    texte(
      facture.libelle ||
        `Prestations du mois de ${MOIS_LABEL.format(new Date(Date.UTC(facture.annee, facture.mois - 1, 1)))}`,
      M,
      { taille: 11, police: gras, couleur: violet },
    );
    texte(euros(facture.tarifHoraireCents), X_PRIX, { taille: 10.5 });
    texte(formatDuree(facture.heuresTotalesMin / 60), X_QTE, { taille: 10.5 });
    texteDroite(euros(facture.montantCents), X_DROITE, { taille: 10.5 });
    if (!facture.manuelle) {
      y -= 15;
      texte("Suivant convention.", M, { taille: 9, couleur: gris });
    }
  } else {
    texte(facture.libelle ?? "Prestation", M, { taille: 11, police: gras, couleur: violet });
    texteDroite(euros(facture.montantCents), X_DROITE, { taille: 10.5 });
  }
  y -= 24;
  regle(1, filet);

  // --- Totaux, alignés à droite --------------------------------------------
  y -= 22;
  texte("TOTAL HORS TVA", X_QTE, { taille: 8, couleur: gris });
  texteDroite(euros(facture.montantCents), X_DROITE, { taille: 10.5, police: gras });
  y -= 18;
  texte("TVA 0 %", X_QTE, { taille: 8, couleur: gris });
  texteDroite("0,00 €", X_DROITE, { taille: 10.5, police: gras });
  y -= 10;
  regle(1, filet);
  y -= 26;
  // Aligné avec DÉSIGNATION, pas avec les deux sous-totaux au-dessus : à cette
  // taille de police, un montant court (deux chiffres) laisserait « TOTAL À
  // PAYER » le chevaucher si le libellé partait du même x qu'eux.
  texte("TOTAL À PAYER", M, { taille: 10, police: gras, couleur: violet });
  texteDroite(euros(facture.montantCents), X_DROITE, { taille: 19, police: gras, couleur: violet });
  y -= 12;
  regle(1.5, violet);
  y -= 16;
  texte("Exempté de TVA selon l’art. 44, § 2 du Code de la TVA.", M, { taille: 8.5, couleur: gris });

  // --- Paiement, trois colonnes --------------------------------------------
  y -= 26;
  const yPaiementHaut = y;
  const X_REF = M + 175;
  const X_ECH = M + 345;
  texte("COMPTE", M, { taille: 7.5, couleur: gris });
  texte("RÉFÉRENCE", X_REF, { taille: 7.5, couleur: gris });
  texte("ÉCHÉANCE", X_ECH, { taille: 7.5, couleur: gris });
  y -= 15;
  if (reglages?.iban) texte(reglages.iban, M, { taille: 10.5, police: gras });
  const reference = `${c.prefixeReference || "FACT"}${facture.annee}/${String(facture.numero).padStart(3, "0")}`;
  texte(reference, X_REF, { taille: 10.5, police: gras });
  texte(fmtJourMoisAn.format(facture.echeanceLe), X_ECH, { taille: 10.5, police: gras });
  y -= 13;
  texte("à rappeler dans le virement", X_REF, { taille: 8, couleur: gris });
  texte(`paiement dans les ${reglages?.delaiPaiementJours ?? 30} jours`, X_ECH, { taille: 8, couleur: gris });
  const yPaiementBas = y - 5;
  regleV(X_REF - 20, yPaiementHaut, yPaiementBas);
  regleV(X_ECH - 20, yPaiementHaut, yPaiementBas);
  y = yPaiementBas - 8;
  regle(1, filet);

  y -= 18;
  texte(`Pour toute question relative à cette facture : ${SITE.telephone}.`, M, { taille: 9, couleur: gris });

  // --- Pied de page ---------------------------------------------------------
  y = 70;
  regle(1, filet);
  y -= 16;
  const gauche1 = reglages?.adresseSiege
    ? `AMAPSY SRL · ${reglages.adresseSiege.replace("\n", ", ")}`
    : "AMAPSY SRL";
  texte(gauche1, M, { taille: 8, couleur: gris });
  texteDroite(reglages?.iban ? `IBAN ${reglages.iban}` : "Document de démonstration — données fictives.", X_DROITE, {
    taille: 8,
    couleur: gris,
  });
  y -= 13;
  const mentions = [
    reglages?.numeroEntreprise ? `N° d’entreprise ${reglages.numeroEntreprise}` : null,
    reglages?.mentionLegale,
  ]
    .filter(Boolean)
    .join(" · ");
  if (mentions) texte(mentions, M, { taille: 8, couleur: gris });
  texteDroite(
    facture.payeeLe ? `Payée le ${fmtJourMoisAn.format(facture.payeeLe)}.` : SITE.telephone,
    X_DROITE,
    { taille: 8, couleur: gris },
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
