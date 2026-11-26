"use client";

import { useId, useState } from "react";
import { euros } from "@/lib/format";
import { ChampNombre } from "@/components/ChampNombre";
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
  libelleParDefaut,
  montantInitial = "",
}: {
  heuresInitiales?: string;
  minutesInitiales?: string;
  tarifInitial?: string;
  libelleInitial?: string;
  libellePlaceholder: string;
  /** Ce que le PDF imprimera à la place d'un libellé vide, quand il y a un décompte complet. */
  libelleParDefaut: string;
  /** Montant déjà saisi à la main (euros, deux décimales), s'il n'y a pas de décompte. */
  montantInitial?: string;
}) {
  const [heures, setHeures] = useState(heuresInitiales);
  const [minutes, setMinutes] = useState(minutesInitiales);
  const [tarif, setTarif] = useState(tarifInitial);
  const [montant, setMontant] = useState(montantInitial);
  const [libelle, setLibelle] = useState(libelleInitial);
  // Plusieurs décomptes (un par facture à éditer) peuvent coexister sur la page.
  const aide = `aide-montant-${useId()}`;

  const cents = montantDecompteCents(
    nombreSaisi(heures || "0"),
    nombreSaisi(minutes || "0"),
    nombreSaisi(tarif),
  );
  const calcule = cents !== null;
  const aideLibelle = `aide-libelle-${useId()}`;

  // Sans libellé, le serveur refuse une facture sans heures (rien ne dirait
  // de quoi il s'agit) et le PDF imprime un intitulé par défaut sinon — voir
  // enregistrerFactureEtablissementManuelle et la route PDF. On le dit avant
  // l'envoi plutôt que de laisser le formulaire ne rien faire en silence.
  const aDesHeures =
    (nombreSaisi(heures || "0") || 0) > 0 || (nombreSaisi(minutes || "0") || 0) > 0;
  const sansLibelle = libelle.trim() === "";
  const avertissement = !sansLibelle
    ? null
    : !aDesHeures
      ? "Libellé obligatoire\u00a0: sans heures, rien d’autre ne dit sur la facture de quoi il s’agit."
      : calcule
        ? `Pas de libellé\u00a0: la facture affichera «\u00a0${libelleParDefaut}\u00a0».`
        : "Pas de libellé\u00a0: la facture affichera seulement «\u00a0Prestation\u00a0».";

  return (
    <>
      <label>
        <span className={libelleChamp}>Heures</span>
        <ChampNombre
          name="heures"
          min={0}
          placeholder="0"
          value={heures}
          onChange={setHeures}
          className={`mt-1 ${champ}`}
        />
      </label>
      <label>
        <span className={libelleChamp}>Minutes</span>
        <ChampNombre
          name="minutes"
          min={0}
          max={59}
          pas={5}
          placeholder="0"
          value={minutes}
          onChange={setMinutes}
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
        <input
          name="libelle"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          placeholder={libellePlaceholder}
          required={!aDesHeures}
          aria-invalid={avertissement !== null && !aDesHeures}
          aria-describedby={aideLibelle}
          className={`mt-1 ${champ} ${avertissement ? "border-due" : ""}`}
        />
        <span
          id={aideLibelle}
          role={avertissement ? "alert" : undefined}
          className={`mt-1 block text-[11px] ${!aDesHeures ? "text-overdue" : "text-due"}`}
        >
          {avertissement ? `⚠\u00a0${avertissement}` : null}
        </span>
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
