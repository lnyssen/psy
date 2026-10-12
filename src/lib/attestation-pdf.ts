import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { prisma } from "@/lib/db";
import { demoOuverte } from "@/lib/demo";
import {
  adresseCabinet,
  ajouterJours,
  euros,
  fmtHeure,
  fmtJourMoisAn,
  instantBruxelles,
  pourPdf,
} from "@/lib/format";
import { PDF_COULEUR, PDF_CONTENU, PDF_HAUTEUR, PDF_LARGEUR, PDF_MARGE } from "@/lib/pdf";

/**
 * Attestation de présence, en PDF : ce que demandent une mutuelle, une
 * assurance, un employeur ou une école — « cette personne a consulté tel jour,
 * à telle heure ». Aucune information sur le contenu des séances : seulement les
 * dates, les heures et le lieu, et, si on le demande, les montants acquittés.
 *
 * Mise en page dans la charte du reçu (voir lib/pdf.ts) : on reconnaît
 * d'un coup d'œil que les deux pièces sortent du même outil.
 */
export type ParamsAttestation = {
  patientId: string;
  /** « AAAA-MM-JJ », jours compris. */
  du: string;
  au: string;
  /** Mentionner les montants : alors seules les séances payées figurent. */
  montants: boolean;
  /** Pour qui ou pour quoi, en toutes lettres (« la mutuelle », « l'école »). */
  pour: string;
};

export type AttestationPdf =
  | { ok: true; octets: Uint8Array; nom: string; nbSeances: number }
  | { ok: false; statut: number; message: string };

/** Ce que Helvetica sait écrire : le reste (émoji, flèches…) est écarté plutôt que de faire échouer le PDF. */
function ecrivable(police: PDFFont, t: string) {
  const connus = new Set(police.getCharacterSet());
  return [...pourPdf(t)]
    .filter((c) => connus.has(c.codePointAt(0)!))
    .join("")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1");
}

/** Coupe un texte en lignes qui tiennent dans la largeur donnée. */
function lignes(police: PDFFont, t: string, taille: number, largeur: number) {
  const sortie: string[] = [];
  let courante = "";
  for (const mot of t.split(/\s+/).filter(Boolean)) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (police.widthOfTextAtSize(essai, taille) <= largeur) courante = essai;
    else {
      if (courante) sortie.push(courante);
      courante = mot;
    }
  }
  if (courante) sortie.push(courante);
  return sortie;
}

export function jourValide(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && instantBruxelles(s, "00:00") !== null;
}

export async function construireAttestation(p: ParamsAttestation): Promise<AttestationPdf> {
  if (!jourValide(p.du) || !jourValide(p.au))
    return { ok: false, statut: 400, message: "Dates invalides." };
  const debut = instantBruxelles(p.du, "00:00")!;
  const fin = ajouterJours(instantBruxelles(p.au, "00:00")!, 1);
  if (fin <= debut)
    return { ok: false, statut: 400, message: "La date de fin précède la date de début." };

  const patient = await prisma.patient.findUnique({ where: { id: p.patientId } });
  if (!patient) return { ok: false, statut: 404, message: "Patient introuvable." };
  if (patient.anonymiseAt)
    return { ok: false, statut: 409, message: "Ce dossier est anonymisé." };
  // Les montants n'ont de sens que pour ce que le patient a payé lui-même.
  const avecMontants = p.montants && patient.scheme === "PRIVE";

  const seances = await prisma.session.findMany({
    where: {
      patientId: patient.id,
      status: "ATTENDED",
      startsAt: { gte: debut, lt: fin },
      ...(avecMontants ? { paymentStatus: "PAID" as const } : {}),
    },
    orderBy: { startsAt: "asc" },
    include: { cabinet: true },
  });
  if (seances.length === 0)
    return {
      ok: false,
      statut: 404,
      message: avecMontants
        ? "Aucune séance honorée et payée sur cette période."
        : "Aucune séance honorée sur cette période.",
    };

  const reglages = await prisma.parametres.findUnique({ where: { id: "global" } });
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const gras = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { encre, violet, gris, filet } = PDF_COULEUR;
  const M = PDF_MARGE;
  const X_DROITE = M + PDF_CONTENU;

  let page!: PDFPage;
  let y = 0;
  const t = (txt: string) => ecrivable(normal, txt);

  const texte = (
    s: string,
    x: number,
    o: { taille?: number; police?: PDFFont; couleur?: typeof encre } = {},
  ) =>
    page.drawText(t(s), {
      x,
      y,
      size: o.taille ?? 10,
      font: o.police ?? normal,
      color: o.couleur ?? encre,
    });
  const texteDroite = (
    s: string,
    xDroite: number,
    o: { taille?: number; police?: PDFFont; couleur?: typeof encre } = {},
  ) => {
    const police = o.police ?? normal;
    texte(s, xDroite - police.widthOfTextAtSize(t(s), o.taille ?? 10), o);
  };
  const regle = (epaisseur = 1, couleur = filet) =>
    page.drawRectangle({ x: M, y, width: PDF_CONTENU, height: epaisseur, color: couleur });
  const paragraphe = (s: string, o: { taille?: number; interligne?: number; police?: PDFFont } = {}) => {
    const taille = o.taille ?? 10.5;
    for (const l of lignes(o.police ?? normal, t(s), taille, PDF_CONTENU)) {
      texte(l, M, { taille, police: o.police });
      y -= o.interligne ?? 15;
    }
  };

  // --- Première page : en-tête --------------------------------------------
  page = pdf.addPage([PDF_LARGEUR, PDF_HAUTEUR]);
  y = 780;
  texte("Amandine Monsel", M, { taille: 23, police: gras, couleur: violet });
  const yTitre = y;
  texteDroite("Attestation de présence", X_DROITE, { taille: 15, police: gras, couleur: violet });
  y = yTitre - 30;
  texte("ÉMISE LE", M + 300, { taille: 7.5, couleur: gris });
  texteDroite(fmtJourMoisAn.format(new Date()), X_DROITE, { taille: 10.5, police: gras });
  y = yTitre - 52;
  regle(2, violet);

  // --- Qui atteste, de qui --------------------------------------------------
  y -= 22;
  texte("PSYCHOLOGUE", M, { taille: 7.5, couleur: gris });
  texte("PERSONNE CONCERNÉE", M + 300, { taille: 7.5, couleur: gris });
  y -= 16;
  texte("Amandine Monsel", M, { taille: 12, police: gras, couleur: violet });
  texte(`${patient.firstName} ${patient.lastName}`, M + 300, { taille: 12, police: gras, couleur: violet });
  y -= 15;
  texte("AMAPSY SRL — Psychologue", M, { taille: 9.5 });
  if (patient.birthDate)
    texte(`né(e) le ${fmtJourMoisAn.format(patient.birthDate)}`, M + 300, { taille: 9.5 });
  const mentions = [
    reglages?.numeroEntreprise && `N° d’entreprise : ${reglages.numeroEntreprise}`,
    reglages?.numeroInami && `N° INAMI : ${reglages.numeroInami}`,
    reglages?.numeroVisa && `Visa SPF Santé publique : ${reglages.numeroVisa}`,
    reglages?.numeroCommission && `Commission des psychologues : ${reglages.numeroCommission}`,
  ].filter((m): m is string => Boolean(m));
  y -= 6;
  for (const m of mentions) {
    y -= 13;
    texte(m, M, { taille: 9.5 });
  }
  y -= 14;
  regle(1, filet);

  // --- Corps ------------------------------------------------------------------
  y -= 30;
  const n = seances.length;
  paragraphe(
    `Je soussignée, Amandine Monsel, psychologue, atteste que ${patient.firstName} ${patient.lastName} a été reçu(e) en consultation à ${n} reprise${n > 1 ? "s" : ""} entre le ${fmtJourMoisAn.format(debut)} et le ${fmtJourMoisAn.format(instantBruxelles(p.au, "00:00")!)}, aux dates suivantes :`,
  );
  y -= 8;

  const X_HEURE = M + 110;
  const X_LIEU = M + 210;
  const enTete = () => {
    texte("DATE", M, { taille: 7.5, couleur: gris });
    texte("HEURE", X_HEURE, { taille: 7.5, couleur: gris });
    texte("LIEU", X_LIEU, { taille: 7.5, couleur: gris });
    if (avecMontants) texteDroite("MONTANT RÉGLÉ", X_DROITE, { taille: 7.5, couleur: gris });
    y -= 8;
    regle(1, filet);
    y -= 17;
  };
  enTete();

  let total = 0;
  for (const s of seances) {
    // Une liste longue passe à la page suivante, avec son en-tête.
    if (y < 150) {
      page = pdf.addPage([PDF_LARGEUR, PDF_HAUTEUR]);
      y = 790;
      texte("Attestation de présence — suite", M, { taille: 11, police: gras, couleur: violet });
      y -= 22;
      enTete();
    }
    texte(fmtJourMoisAn.format(s.startsAt), M, { taille: 10.5 });
    texte(
      `${fmtHeure.format(s.startsAt)}–${fmtHeure.format(new Date(s.startsAt.getTime() + s.durationMin * 60_000))}`,
      X_HEURE,
      { taille: 10.5 },
    );
    // « Uccle, Uccle » quand le cabinet porte le nom de sa commune : une seule fois.
    texte(
      s.visio
        ? "Visio"
        : s.cabinet.nom === s.cabinet.city
          ? s.cabinet.nom
          : `${s.cabinet.nom}, ${s.cabinet.city}`,
      X_LIEU,
      { taille: 10 },
    );
    if (avecMontants) {
      total += s.amountCents ?? 0;
      texteDroite(euros(s.amountCents), X_DROITE, { taille: 10.5 });
    }
    y -= 20;
  }
  y += 6;
  regle(1, filet);

  // --- Total, mention, signature ----------------------------------------------
  const besoin = (avecMontants ? 30 : 0) + (p.pour ? 40 : 0) + 150;
  if (y < besoin) {
    page = pdf.addPage([PDF_LARGEUR, PDF_HAUTEUR]);
    y = 790;
  }
  if (avecMontants) {
    y -= 22;
    texte("TOTAL RÉGLÉ", M, { taille: 10, police: gras, couleur: violet });
    texteDroite(euros(total), X_DROITE, { taille: 15, police: gras, couleur: violet });
    y -= 10;
    regle(1.5, violet);
  }
  y -= 28;
  const pour = p.pour.trim();
  if (pour) {
    paragraphe(`Attestation établie à la demande de l’intéressé(e), pour : ${pour}.`);
  }
  paragraphe("Elle confirme la présence aux consultations ; elle ne dit rien de leur contenu.", {
    taille: 9,
    interligne: 13,
  });
  y -= 22;
  texte(`Fait le ${fmtJourMoisAn.format(new Date())}.`, M, { taille: 10.5 });
  // De la place pour signer, puis le nom sous le trait.
  y -= 58;
  page.drawRectangle({ x: M, y, width: 170, height: 0.75, color: filet });
  y -= 14;
  texte("Amandine Monsel", M, { taille: 10.5, police: gras });
  y -= 12;
  texte("Signature", M, { taille: 8, couleur: gris });

  // --- Pied de page, sur chaque page ----------------------------------------------
  const cabinet = seances[0].cabinet;
  for (const [i, pg] of pdf.getPages().entries()) {
    page = pg;
    y = 70;
    regle(1, filet);
    y -= 16;
    texte(`Amandine Monsel — AMAPSY SRL · ${adresseCabinet(cabinet)}`, M, { taille: 8, couleur: gris });
    texteDroite(`Page ${i + 1} / ${pdf.getPageCount()}`, X_DROITE, { taille: 8, couleur: gris });
    // Sur l'instance de démonstration seulement : sur une pièce remise à un
    // vrai patient, la mention serait fausse et gênante.
    if (demoOuverte()) {
      y -= 12;
      texteDroite("Document de démonstration — données fictives.", X_DROITE, { taille: 8, couleur: gris });
    }
  }

  const octets = await pdf.save();
  const nom = `attestation-${patient.lastName.toLowerCase().replace(/[^a-z]/g, "")}-${p.du}-${p.au}.pdf`;
  return { ok: true, octets, nom, nbSeances: n };
}
