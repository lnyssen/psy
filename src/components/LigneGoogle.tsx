"use client";

import { useState } from "react";
import { SelectPatientRecherche } from "@/components/SelectPatientRecherche";
import { PARTICIPANTS } from "@/lib/participants";
import {
  ignorerEvenementGoogle,
  marquerEvenementOccupe,
  rattacherEvenementGoogle,
} from "@/lib/google-actions";

const champ = "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm";
const bouton =
  "rounded-full border border-line-strong px-4 py-1.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text";

/**
 * Une décision à prendre : un événement isolé, ou une série d'événements
 * récurrents traitée d'un seul geste.
 *
 * Client, pour deux raisons : le bouton principal doit dire combien de
 * séances il va créer (« Toute la série » est cochée par défaut, un libellé
 * fixe laisserait un clic créer neuf séances sans l'annoncer) ; et le lieu
 * suit le patient choisi — celui de sa dernière séance — pour qu'il n'y ait
 * presque jamais rien d'autre à toucher que « Rattacher ».
 */
export function LigneGoogle({
  id,
  ancres,
  titre,
  lieu,
  quand,
  occurrences,
  jusquau,
  statut,
  proposition,
  lieuParPatient,
  patients,
  cabinets,
}: {
  id: string;
  /** Identifiants de chaque occurrence : autant d'ancres, pour qu'un lien depuis
   *  le calendrier retombe sur la bonne ligne. */
  ancres: string[];
  titre: string;
  lieu: string | null;
  quand: string;
  occurrences: number;
  jusquau: string | null;
  /** Texte si l'événement n'est plus « à traiter » (occupé, ignoré). */
  statut: string | null;
  proposition: { patientId: string; nom: string; cabinetId: string | null; participants: string } | null;
  /** Lieu habituel de chaque patient (dernière séance, sinon fiche). */
  lieuParPatient: Record<string, string>;
  patients: { id: string; firstName: string; lastName: string; alerte?: string }[];
  cabinets: { id: string; nom: string; factureInstitution: boolean }[];
}) {
  const serie = occurrences > 1;
  const [toutelaSerie, setToutelaSerie] = useState(true);
  const [cabinetId, setCabinetId] = useState(proposition?.cabinetId ?? cabinets[0]?.id ?? "");
  const nombre = serie && toutelaSerie ? occurrences : 1;
  const sansPatient = cabinets.find((c) => c.id === cabinetId)?.factureInstitution ?? false;

  return (
    <li className="rounded-[14px] border border-accent/40 bg-surface px-5 py-4">
      {ancres.map((a) => (
        <span key={a} id={`evt-${a}`} className="scroll-mt-24" />
      ))}
      <p className="text-sm">
        <span className="font-semibold">{titre}</span>
        <span className="ml-2 text-ink-muted" data-numeric>
          {quand}
        </span>
        {serie && (
          <span className="ml-2 text-xs text-ink-muted" data-numeric>
            {`série répétée dans Google · ${occurrences} rendez-vous${jusquau ? ` jusqu’au ${jusquau}` : ""}`}
          </span>
        )}
        {lieu && <span className="ml-2 text-xs text-ink-muted">{lieu}</span>}
        {statut && (
          <span className="ml-2 rounded-full bg-sunken px-2.5 py-0.5 text-[11px] font-semibold text-ink-muted">
            {statut}
          </span>
        )}
      </p>

      <form
        action={rattacherEvenementGoogle}
        className="mt-3 grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]"
      >
        <input type="hidden" name="id" value={id} />
        <div>
          <SelectPatientRecherche
            patients={patients}
            defaultId={proposition?.patientId}
            onChange={(p) => {
              const habituel = p ? lieuParPatient[p] : undefined;
              if (habituel) setCabinetId(habituel);
            }}
          />
          {proposition && (
            <p className="mt-1 pl-3.5 text-[11px] text-ink-muted">
              Proposé d’après le titre : {proposition.nom}.
            </p>
          )}
        </div>
        <select
          name="cabinetId"
          required
          value={cabinetId}
          onChange={(e) => setCabinetId(e.target.value)}
          aria-label="Lieu"
          className={champ}
        >
          {cabinets.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
              {c.factureInstitution ? " (sans patient)" : ""}
            </option>
          ))}
        </select>
        <select
          name="participants"
          defaultValue={proposition?.participants ?? "INDIVIDUELLE"}
          disabled={sansPatient}
          aria-label="Qui est présent"
          className={champ}
        >
          {PARTICIPANTS.map((p) => (
            <option key={p.valeur} value={p.valeur}>
              {p.libelle}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            {nombre > 1 ? `Rattacher les ${nombre} séances` : "Rattacher"}
          </button>
          <button type="submit" formAction={marquerEvenementOccupe} className={bouton}>
            Créneau occupé
          </button>
          <button type="submit" formAction={ignorerEvenementGoogle} className={`${bouton} text-ink-muted`}>
            Ignorer
          </button>
        </div>
        {serie && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
            <input
              type="checkbox"
              name="serie"
              checked={toutelaSerie}
              onChange={(e) => setToutelaSerie(e.target.checked)}
            />
            {`Toute la série (${occurrences} rendez-vous${jusquau ? `, jusqu’au ${jusquau}` : ""})`}
          </label>
        )}
        {proposition && !sansPatient && (
          <p className="text-[11px] text-ink-muted sm:col-span-2 lg:col-span-3">
            {`Les prochains « ${titre} » ajoutés dans Google seront rattachés à ce patient d’eux-mêmes.`}
          </p>
        )}
      </form>
    </li>
  );
}
