"use client";

import { useState } from "react";
import { ChampsDecompte } from "@/components/ChampsDecompte";

const champ =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted/60";
const libelleChamp = "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";

/**
 * Nouvelle facture manuelle : ce qui se déduit est prérempli. Le tarif horaire
 * est celui de l'établissement choisi (il change avec lui), l'échéance est la
 * date du jour plus le délai de paiement des Réglages, le mois et l'année sont
 * ceux de l'écran. Le montant se calcule en direct (voir ChampsDecompte).
 */
export function FormulaireFactureManuelle({
  action,
  cabinets,
  mois,
  annee,
  moisLabels,
  echeanceParDefaut,
  delaiJours,
}: {
  action: (f: FormData) => void | Promise<void>;
  cabinets: { id: string; nom: string; tarifHoraireCents: number | null }[];
  mois: number;
  annee: number;
  moisLabels: string[];
  /** AAAA-MM-JJ : aujourd'hui + le délai de paiement. */
  echeanceParDefaut: string;
  delaiJours: number;
}) {
  const [cabinetId, setCabinetId] = useState(cabinets[0]?.id ?? "");
  const cabinet = cabinets.find((c) => c.id === cabinetId);
  const moisChoisi = moisLabels[mois - 1] ?? "";
  const [moisSaisi, setMoisSaisi] = useState(mois);

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-[14px] border border-dashed border-line-strong bg-surface px-5 py-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="lg:max-w-48">
          <span className={libelleChamp}>Établissement</span>
          <select
            name="cabinetId"
            required
            value={cabinetId}
            onChange={(e) => setCabinetId(e.target.value)}
            className={`mt-1 ${champ}`}
          >
            {cabinets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="lg:max-w-32">
          <span className={libelleChamp}>Mois</span>
          <select
            name="mois"
            value={moisSaisi}
            onChange={(e) => setMoisSaisi(Number(e.target.value))}
            className={`mt-1 ${champ}`}
          >
            {moisLabels.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="lg:max-w-24">
          <span className={libelleChamp}>Année</span>
          <input name="annee" type="number" defaultValue={annee} required className={`mt-1 ${champ}`} />
        </label>
        <label>
          <span className={libelleChamp}>Échéance</span>
          <input name="echeance" type="date" defaultValue={echeanceParDefaut} className={`mt-1 ${champ}`} />
          <span className="mt-1 block text-[11px] text-ink-muted">
            Aujourd’hui + {delaiJours} jours (délai réglé dans Réglages). Modifiable.
          </span>
        </label>
      </div>

      {/* Heures et tarif, comme un décompte de séances. Facultatif : une
          régularisation ponctuelle n'a besoin que du libellé et du montant. */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <ChampsDecompte
          key={cabinetId}
          tarifInitial={cabinet?.tarifHoraireCents ? (cabinet.tarifHoraireCents / 100).toFixed(2) : ""}
          libellePlaceholder={`Facultatif — ex. Supplément ${moisLabels[moisSaisi - 1] ?? moisChoisi}`}
        />
      </div>

      <label>
        <span className={libelleChamp}>Commentaire (facultatif, jamais imprimé)</span>
        <textarea
          name="commentaire"
          rows={2}
          placeholder="Pour vous seule — le contexte de cette facture."
          className={`mt-1 ${champ.replace("rounded-full", "rounded-[14px]")} resize-y leading-snug`}
        />
      </label>

      <button
        type="submit"
        className="self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
      >
        Émettre
      </button>
    </form>
  );
}
