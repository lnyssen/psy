import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { SCHEME_LABEL, adresseCabinet, fmtDateCourte, isBillable } from "@/lib/format";

/**
 * Export comptable d'un mois : un classeur avec trois onglets — recettes,
 * dépenses, résumé — prêt à donner à la comptable. Les montants sont en
 * centimes en base ; ce fichier est le seul endroit où ils repassent en
 * euros décimaux, format qu'un tableur attend.
 *
 * Les séances d'un bloc facturé à un établissement (l'école) n'ont pas de
 * patient : la colonne porte alors le nom du lieu, jamais un nom inventé.
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

  const [seances, depenses] = await Promise.all([
    prisma.session.findMany({
      where: { startsAt: { gte: debut, lt: fin } },
      include: { patient: true, cabinet: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.depense.findMany({
      where: { date: { gte: debut, lt: fin } },
      include: { categorie: true, cabinet: true },
      orderBy: { date: "asc" },
    }),
  ]);
  const recettes = seances.filter((s) => isBillable(s.status));

  const classeur = new ExcelJS.Workbook();
  classeur.creator = "Amapsy SRL";
  classeur.created = new Date();

  const euros = (cents: number | null) => (cents ?? 0) / 100;
  const enTete = (feuille: ExcelJS.Worksheet) => {
    feuille.getRow(1).font = { bold: true };
    feuille.getRow(1).eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E1DA" } };
    });
  };

  // --- Recettes ---
  const fRecettes = classeur.addWorksheet("Recettes");
  fRecettes.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Patient", key: "patient", width: 24 },
    { header: "Cabinet", key: "cabinet", width: 14 },
    { header: "Adresse", key: "adresse", width: 34 },
    { header: "Régime", key: "regime", width: 14 },
    { header: "Statut", key: "statut", width: 12 },
    { header: "Montant (€)", key: "montant", width: 12 },
  ];
  for (const s of recettes) {
    fRecettes.addRow({
      date: fmtDateCourte.format(s.startsAt),
      patient: s.patient ? `${s.patient.lastName} ${s.patient.firstName}` : s.cabinet.nom,
      cabinet: s.cabinet.nom,
      adresse: adresseCabinet(s.cabinet),
      regime: s.patient ? SCHEME_LABEL[s.patient.scheme] : "établissement",
      statut: s.paymentStatus,
      montant: euros(s.amountCents),
    });
  }
  fRecettes.getColumn("montant").numFmt = "#,##0.00 €";
  enTete(fRecettes);

  // --- Dépenses ---
  const fDepenses = classeur.addWorksheet("Dépenses");
  fDepenses.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Libellé", key: "libelle", width: 30 },
    { header: "Catégorie", key: "categorie", width: 18 },
    { header: "Fournisseur", key: "fournisseur", width: 22 },
    { header: "Cabinet", key: "cabinet", width: 14 },
    { header: "Montant (€)", key: "montant", width: 12 },
    { header: "Reçu joint", key: "recu", width: 10 },
  ];
  for (const d of depenses) {
    fDepenses.addRow({
      date: fmtDateCourte.format(d.date),
      libelle: d.libelle,
      categorie: d.categorie.libelle,
      fournisseur: d.fournisseur ?? "",
      cabinet: d.cabinet?.nom ?? "commun",
      montant: euros(d.amountCents),
      recu: d.photoMime ? "oui" : "non",
    });
  }
  fDepenses.getColumn("montant").numFmt = "#,##0.00 €";
  enTete(fDepenses);

  // --- Résumé ---
  const fResume = classeur.addWorksheet("Résumé");
  const totalRecettes = recettes.reduce((n, s) => n + (s.amountCents ?? 0), 0);
  const totalDepenses = depenses.reduce((n, d) => n + d.amountCents, 0);
  fResume.columns = [
    { header: "Poste", key: "poste", width: 28 },
    { header: "Montant (€)", key: "montant", width: 14 },
  ];
  fResume.addRows([
    { poste: "Total recettes", montant: euros(totalRecettes) },
    { poste: "Total dépenses", montant: euros(totalDepenses) },
    { poste: "Résultat du mois", montant: euros(totalRecettes - totalDepenses) },
  ]);
  fResume.getColumn("montant").numFmt = "#,##0.00 €";
  fResume.getRow(4).font = { bold: true };
  enTete(fResume);

  const octets = await classeur.xlsx.writeBuffer();
  const nom = `comptable-${annee}-${String(mois).padStart(2, "0")}.xlsx`;

  return new Response(octets as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nom}"`,
      "Cache-Control": "no-store",
    },
  });
}
