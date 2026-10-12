import { refusSansSession } from "@/lib/garde";
import { suiviPpl, trimestreCourant } from "@/lib/ppl-trimestre";
import { partiesJour } from "@/lib/format";

/**
 * Export CSV d'un trimestre de première ligne, une ligne par séance. Séparateur
 * point-virgule, virgule décimale, BOM en tête : Excel en français l'ouvre tel
 * quel, accents compris.
 */
export async function GET(req: Request) {
  const refus = await refusSansSession();
  if (refus) return refus;

  const url = new URL(req.url);
  const courant = trimestreCourant();
  const annee = Number(url.searchParams.get("annee")) || courant.annee;
  const t = Number(url.searchParams.get("t")) || courant.trimestre;
  if (![1, 2, 3, 4].includes(t) || annee < 2024 || annee > 2100)
    return new Response("Période invalide.", { status: 400 });

  const suivi = await suiviPpl(annee, t);
  const cellule = (v: string | number) => {
    const s = String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const euro = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const lignes = [
    [
      "Patient",
      "N° national",
      "Date",
      "Heure",
      "Lieu",
      "Durée (min)",
      "Montant (€)",
      "Reçu de l'INAMI",
      "Hors plafond",
    ],
    ...suivi.seances.map((s) => {
      const d = partiesJour(s.debut);
      return [
        s.patientNom,
        s.nationalNumber ?? "",
        `${String(d.jour).padStart(2, "0")}/${String(d.mois).padStart(2, "0")}/${d.annee}`,
        `${String(d.heure).padStart(2, "0")}:${String(d.minute).padStart(2, "0")}`,
        s.cabinet,
        s.dureeMin,
        euro(s.montantCents),
        s.recu ? "oui" : "non",
        s.horsQuota ? "oui" : "non",
      ];
    }),
  ];
  const csv = "﻿" + lignes.map((l) => l.map(cellule).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="premiere-ligne-${annee}-T${t}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
