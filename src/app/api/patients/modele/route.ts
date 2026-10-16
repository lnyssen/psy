import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { refusSansSession } from "@/lib/garde";
import { CHAMPS } from "@/lib/import-patients";

/**
 * Le modèle Excel à remplir : une feuille « Patients » (une ligne par patient),
 * une feuille « Mode d'emploi », une feuille « Listes » masquée qui alimente
 * les menus déroulants (régime, tarif, cabinet) avec les valeurs réelles de
 * l'outil. Les colonnes de numéros sont au format texte : Excel y garde les
 * zéros initiaux, qu'il avale sinon.
 */
export async function GET() {
  const refus = await refusSansSession();
  if (refus) return refus;

  const [tarifs, cabinets] = await Promise.all([
    prisma.tarif.findMany({ where: { actif: true }, orderBy: [{ regime: "asc" }, { ordre: "asc" }] }),
    prisma.cabinet.findMany({ where: { actif: true, factureInstitution: false }, orderBy: { ordre: "asc" } }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Pratique Psy";
  const feuille = wb.addWorksheet("Patients", { views: [{ state: "frozen", ySplit: 1 }] });
  const listes = wb.addWorksheet("Listes", { state: "veryHidden" });

  listes.getColumn(1).values = ["Régime", "privé", "conventionné"];
  const tarifsPrives = tarifs.filter((t) => t.regime === "PRIVE");
  listes.getColumn(2).values = ["Tarif", ...tarifsPrives.map((t) => t.libelle)];
  listes.getColumn(3).values = ["Cabinet", ...cabinets.map((c) => c.nom)];

  const TEXTE = new Set(["numeroNational", "telephone", "telephoneMere", "telephonePere", "codePostal"]);
  feuille.columns = CHAMPS.map((c) => ({
    header: c.obligatoire ? `${c.libelle} *` : c.libelle,
    key: c.cle,
    width: Math.max(16, c.libelle.length + 6),
    style: TEXTE.has(c.cle) ? { numFmt: "@" } : c.cle === "naissance" ? { numFmt: "dd/mm/yyyy" } : {},
  }));
  feuille.getColumn("adresse").width = 30;
  feuille.getColumn("email").width = 28;
  feuille.getColumn("emailMere").width = 28;
  feuille.getColumn("emailPere").width = 28;

  const entete = feuille.getRow(1);
  entete.height = 22;
  entete.eachCell((cell, i) => {
    const champ = CHAMPS[i - 1];
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: champ.obligatoire ? "FF1F4E5F" : "FF5B7C8A" } };
    cell.alignment = { vertical: "middle" };
    if (champ.aide) cell.note = champ.aide;
  });

  const LIGNES = 1000;
  const colonne = (cle: string) => CHAMPS.findIndex((c) => c.cle === cle) + 1;
  const validation = (cle: string, formule: string) => {
    for (let r = 2; r <= LIGNES; r++) {
      feuille.getCell(r, colonne(cle)).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [formule],
        showErrorMessage: false, // un menu qui aide, jamais qui bloque
      };
    }
  };
  validation("regime", "Listes!$A$2:$A$3");
  if (tarifsPrives.length) validation("tarif", `Listes!$B$2:$B$${tarifsPrives.length + 1}`);
  if (cabinets.length) validation("cabinet", `Listes!$C$2:$C$${cabinets.length + 1}`);
  for (let r = 2; r <= LIGNES; r++) {
    for (const cle of TEXTE) feuille.getCell(r, colonne(cle)).numFmt = "@";
    feuille.getCell(r, colonne("naissance")).numFmt = "dd/mm/yyyy";
  }

  const mode = wb.addWorksheet("Mode d'emploi", { properties: { tabColor: { argb: "FFE0A458" } } });
  mode.getColumn(1).width = 24;
  mode.getColumn(2).width = 90;
  mode.addRow(["Importer des patients"]).font = { bold: true, size: 14 };
  mode.addRow([]);
  [
    "1. Remplissez la feuille « Patients » : une ligne par patient, à partir de la ligne 2.",
    "2. Seuls le prénom et le nom sont obligatoires (colonnes marquées d’une *). Laissez vide ce que vous ne savez pas.",
    "3. Enregistrez en .xlsx, puis dans l’outil : Patients › Importer. Vous verrez ce qui sera créé avant de valider.",
    "4. Un patient déjà présent (même prénom et même nom) est ignoré, jamais écrasé : vous pouvez ré-importer sans risque.",
    "",
    "Vous avez déjà un fichier ? Pas besoin de le recopier dans ce modèle : l’outil reconnaît les intitulés usuels",
    "(Prénom, Nom, GSM, Date de naissance, Ville…) et vous laisse corriger la correspondance des colonnes.",
  ].forEach((t) => mode.addRow([t]));
  mode.addRow([]);
  const tete = mode.addRow(["Colonne", "Ce qu’on attend"]);
  tete.font = { bold: true };
  for (const c of CHAMPS) {
    const ligne = mode.addRow([c.obligatoire ? `${c.libelle} *` : c.libelle, [c.aide, c.exemple ? `Exemple : ${c.exemple}` : ""].filter(Boolean).join(" ")]);
    ligne.alignment = { vertical: "top", wrapText: true };
  }

  const tampon = await wb.xlsx.writeBuffer();
  return new Response(tampon as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modele-patients.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
