"use client";

import { useId, useState } from "react";
import { euros } from "@/lib/format";
import { montantDecompteCents, nombreSaisi } from "@/lib/decompte";

const champ =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted/60";
const libelleChamp = "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";

/**
 * Les champs d'un décompte d'heures — heures, minutes, tarif horaire, libellé,
 * montant — avec le calcul en direct : dès que la durée et le tarif sont
 * saisis, le montant s'affiche (et se verrouille : c'est ce que le serveur
 * facturera, au centime). Sans l'un des deux, le montant se saisit à la main.
 *
 * Rend un fragment de labels : à poser dans la grille du formulaire, dans cet
 * ordre. Pour un autre établissement, la clé du composant change et le tarif
 * repart de celui de l'établissement.
 */
export function ChampsDecompte({
  heuresInitiales = "",
  minutesInitiales = "",
  tarifInitial = "",
  libelleInitial = "",
  libellePlaceholder,
  montantInitial = "",
}: {
  heuresInitiales?: string;
  minutesInitiales?: string;
  tarifInitial?: string;
  libelleInitial?: string;
  libellePlaceholder: string;
  /** Montant déjà saisi à la main (euros, deux décimales), s'il n'y a pas de décompte. */
  montantInitial?: string;
}) {
  const [heures, setHeures] = useState(heuresInitiales);
  const [minutes, setMinutes] = useState(minutesInitiales);
  const [tarif, setTarif] = useState(tarifInitial);
  const [montant, setMontant] = useState(montantInitial);
  // Plusieurs décomptes (un par facture à éditer) peuvent coexister sur la page.
  const aide = `aide-montant-${useId()}`;

  const cents = montantDecompteCents(
    nombreSaisi(heures || "0"),
    nombreSaisi(minutes || "0"),
    nombreSaisi(tarif),
  );
  const calcule = cents !== null;

  return (
    <>
      <label>
        <span className={libelleChamp}>Heures</span>
        <input
          name="heures"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          placeholder="0"
          value={heures}
          onChange={(e) => setHeures(e.target.value)}
          className={`mt-1 ${champ}`}
        />
      </label>
      <label>
        <span className={libelleChamp}>Minutes</span>
        <input
          name="minutes"
          type="number"
          inputMode="numeric"
          min="0"
          max="59"
          step="1"
          placeholder="0"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className={`mt-1 ${champ}`}
        />
      </label>
      <label>
        <span className={libelleChamp}>Tarif horaire (€)</span>
        <input
          name="tarifHoraireEuros"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="—"
          value={tarif}
          onChange={(e) => setTarif(e.target.value)}
          className={`mt-1 ${champ}`}
        />
      </label>
      <label>
        <span className={libelleChamp}>Libellé</span>
        <input name="libelle" defaultValue={libelleInitial} placeholder={libellePlaceholder} className={`mt-1 ${champ}`} />
      </label>
      <label>
        <span className={libelleChamp}>Montant (€)</span>
        <input
          name="montant"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          readOnly={calcule}
          aria-describedby={aide}
          placeholder="à saisir"
          value={calcule ? (cents / 100).toFixed(2) : montant}
          onChange={(e) => setMontant(e.target.value)}
          className={`mt-1 ${champ} ${calcule ? "bg-sunken font-semibold" : ""}`}
        />
        <span id={aide} className="mt-1 block text-[11px] text-ink-muted" aria-live="polite">
          {calcule
            ? `Calculé : ${heures || "0"} h ${minutes || "0"} min × ${euros(Math.round(nombreSaisi(tarif) * 100))} l’heure.`
            : "Saisissez la durée et le tarif pour le calculer, ou le montant directement."}
        </span>
      </label>
    </>
  );
}
