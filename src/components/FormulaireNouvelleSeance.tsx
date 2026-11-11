"use client";

import { creerSeanceDepuisFormulaire } from "@/lib/actions";
import { FormulaireAction } from "@/components/FormulaireAction";
import { BoutonEnregistrer } from "@/components/BoutonEnregistrer";
import { ChampDate } from "@/components/ChampDate";
import { ChampParticipants } from "@/components/ChampParticipants";
import { DebutFin, hhmm } from "@/components/DebutFin";
import { SelectPatientRecherche } from "@/components/SelectPatientRecherche";

const champ =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted/60";
const libelleChamp = "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";

/**
 * « Nouvelle séance » hors de la grille (semaine, fiche patient) : les mêmes
 * champs que la création dans l'agenda — début et fin, qui participe, visio —
 * plus la répétition chaque semaine.
 */
export function FormulaireNouvelleSeance({
  patientId,
  patients,
  cabinets,
  cabinetParDefaut,
  dateInitiale = "",
  dureeMin,
}: {
  /** Patient déjà connu (fiche patient) ; sinon on le choisit dans `patients`. */
  patientId?: string;
  patients?: { id: string; firstName: string; lastName: string; alerte?: string }[];
  cabinets: { id: string; nom: string }[];
  cabinetParDefaut?: string | null;
  dateInitiale?: string;
  dureeMin: number;
}) {
  return (
    <FormulaireAction
      action={creerSeanceDepuisFormulaire}
      confirmation="Séance créée."
      className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {patientId ? (
        <input type="hidden" name="patientId" value={patientId} />
      ) : (
        <label className="sm:col-span-2">
          <span className={libelleChamp}>Patient</span>
          <div className="mt-1">
            <SelectPatientRecherche patients={patients ?? []} />
          </div>
        </label>
      )}
      <label>
        <span className={libelleChamp}>Cabinet</span>
        <select
          name="cabinetId"
          required
          defaultValue={cabinetParDefaut ?? cabinets[0]?.id ?? ""}
          className={`mt-1 ${champ}`}
        >
          <option value="" disabled>
            Choisir…
          </option>
          {cabinets.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={libelleChamp}>Date</span>
        <ChampDate name="date" required defaultValue={dateInitiale} className={`mt-1 ${champ}`} />
      </label>
      <div className="sm:col-span-2 lg:col-span-1">
        <DebutFin
          debut="09:00"
          fin={hhmm(9 * 60 + dureeMin)}
          champ={`${champ} pr-1`}
          libelle={libelleChamp}
        />
      </div>
      <label>
        <span className={libelleChamp}>Séance</span>
        <ChampParticipants className={`mt-1 ${champ}`} />
      </label>
      <label>
        <span className={libelleChamp}>Jusqu’au (optionnel)</span>
        <ChampDate name="jusquau" className={`mt-1 ${champ}`} />
        <span className="mt-1 block text-[11px] text-ink-muted">
          Répète chaque semaine, même jour et même heure.
        </span>
      </label>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="visio" className="accent-accent" />
        En visio
      </label>
      <BoutonEnregistrer className="self-end">Créer</BoutonEnregistrer>
    </FormulaireAction>
  );
}
