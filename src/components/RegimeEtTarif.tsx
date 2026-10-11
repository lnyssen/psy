"use client";

import { useState } from "react";
import { euros } from "@/lib/format";

type Regime = "PRIVE" | "CONVENTIONNE";
type TarifChoix = { id: string; libelle: string; amountCents: number; regime: Regime; parDefaut: boolean };

const champ =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted/60";
const libelleChamp = "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";

/**
 * Régime et tarif d'un patient, qui n'ont de sens qu'ensemble : le régime
 * décide des tarifs proposés, et ce que le tarif signifie.
 *
 * - Privé : le patient paie le tarif choisi (deux tarifs possibles) ;
 * - Conventionné (psychologue de première ligne) : le patient ne paie rien, et
 *   le montant est celui que verse l'INAMI à Amandine.
 *
 * Client pour une seule raison : changer le régime doit changer, tout de suite,
 * la liste des tarifs offerts — sans quoi on pourrait choisir un tarif privé
 * pour un patient conventionné, et le serveur le refuserait en silence.
 */
export function RegimeEtTarif({
  tarifs,
  regimeInitial = "PRIVE",
  tarifInitial = null,
  ancienMontantCents = null,
  pplTypeInitial = "SOUTIEN",
  pplReseauInitial = null,
}: {
  tarifs: TarifChoix[];
  regimeInitial?: Regime;
  /** Identifiant du tarif déjà choisi pour ce patient, s'il y en a un. */
  tarifInitial?: string | null;
  /** Ancien montant libre, d'avant la grille : proposé tant qu'aucun tarif n'est choisi. */
  ancienMontantCents?: number | null;
  /** Convention de première ligne : soutien ou traitement (plafond INAMI). */
  pplTypeInitial?: "SOUTIEN" | "TRAITEMENT";
  /** Réseau choisi ; vide, il se déduit de l'âge. */
  pplReseauInitial?: "ENFANTS" | "ADULTES" | null;
}) {
  const parDefaut = (r: Regime) =>
    (tarifs.find((t) => t.regime === r && t.parDefaut) ?? tarifs.find((t) => t.regime === r))?.id ?? "";

  const [regime, setRegime] = useState<Regime>(regimeInitial);
  const [tarif, setTarif] = useState<string>(
    tarifInitial && tarifs.some((t) => t.id === tarifInitial && t.regime === regimeInitial)
      ? tarifInitial
      : ancienMontantCents !== null && regimeInitial === "PRIVE" && !tarifInitial
        ? "ancien"
        : parDefaut(regimeInitial),
  );

  const offerts = tarifs.filter((t) => t.regime === regime);
  const choisi = offerts.find((t) => t.id === tarif);

  return (
    <>
      <label>
        <span className={libelleChamp}>Régime</span>
        <select
          name="scheme"
          value={regime}
          onChange={(e) => {
            const r = e.target.value as Regime;
            setRegime(r);
            setTarif(parDefaut(r));
          }}
          className={`mt-1 ${champ}`}
        >
          <option value="PRIVE">privé — payé par le patient</option>
          <option value="CONVENTIONNE">conventionné — psychologue de première ligne</option>
        </select>
      </label>
      <label>
        <span className={libelleChamp}>
          {regime === "CONVENTIONNE" ? "Tarif conventionné (reçu de l’INAMI)" : "Tarif"}
        </span>
        <select
          name="tarifId"
          value={tarif}
          onChange={(e) => setTarif(e.target.value)}
          className={`mt-1 ${champ}`}
        >
          {regime === "PRIVE" && ancienMontantCents !== null && !tarifInitial && (
            <option value="ancien">Montant actuel — {euros(ancienMontantCents)} (hors grille)</option>
          )}
          {offerts.length === 0 && <option value="">Aucun tarif — à créer dans les réglages</option>}
          {offerts.map((t) => (
            <option key={t.id} value={t.id}>
              {t.libelle} — {euros(t.amountCents)}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[11px] text-ink-muted">
          {regime === "CONVENTIONNE"
            ? `Le patient ne paie rien : l’INAMI verse ${choisi ? euros(choisi.amountCents) : "ce montant"} à Amandine par séance.`
            : "Ce que paie le patient à chaque séance."}
        </span>
      </label>
      {regime === "CONVENTIONNE" && (
        <>
          <label>
            <span className={libelleChamp}>Prise en charge</span>
            <select name="pplType" defaultValue={pplTypeInitial} className={`mt-1 ${champ}`}>
              <option value="SOUTIEN">soutien psychologique</option>
              <option value="TRAITEMENT">traitement psychologique</option>
            </select>
            <span className="mt-1 block text-[11px] text-ink-muted">
              Soutien : 10 séances sur 12 mois (enfants et ados), 8 (adultes). Traitement : 20.
            </span>
          </label>
          <label>
            <span className={libelleChamp}>Réseau INAMI</span>
            <select name="pplReseau" defaultValue={pplReseauInitial ?? ""} className={`mt-1 ${champ}`}>
              <option value="">selon l’âge (23 ans compris : enfants)</option>
              <option value="ENFANTS">enfants et adolescents</option>
              <option value="ADULTES">adultes</option>
            </select>
            <span className="mt-1 block text-[11px] text-ink-muted">
              De 15 à 23 ans, le patient peut relever de l’un ou l’autre.
            </span>
          </label>
        </>
      )}
    </>
  );
}
