"use client";

import { useState } from "react";
import { ChampHeure } from "@/components/ChampHeure";

/** Minutes depuis minuit → HH:MM. */
export function hhmm(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Heures de début et de fin d'une séance à créer, modifiables : la case
 *  cliquée ou la durée réglée ne font que les proposer. Déplacer le début
 *  entraîne la fin, durée conservée. Le même bloc sert dans l'agenda et dans
 *  « Nouvelle séance » (semaine, fiche patient). */
export function DebutFin({
  debut: d0,
  fin: f0,
  champ = "w-full rounded-full border border-line bg-surface py-1 pr-1 pl-3 text-sm",
  libelle = "text-[11px] text-ink-muted",
}: {
  debut: string;
  fin: string;
  champ?: string;
  libelle?: string;
}) {
  const [debut, setDebut] = useState(d0);
  const [fin, setFin] = useState(f0);
  const minutes = (v: string) => {
    const [h, m] = v.split(":").map(Number);
    return h * 60 + m;
  };
  const duree = minutes(fin) - minutes(debut);
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <label className={libelle}>
          Début
          <ChampHeure
            name="heure"
            required
            valeur={debut}
            surChangement={(v) => {
              if (duree > 0) setFin(hhmm(Math.min(minutes(v) + duree, 23 * 60 + 59)));
              setDebut(v);
            }}
            className={`mt-0.5 text-ink ${champ}`}
          />
        </label>
        <label className={libelle}>
          Fin
          <ChampHeure name="fin" valeur={fin} surChangement={setFin} className={`mt-0.5 text-ink ${champ}`} />
        </label>
      </div>
      <p className={`mt-1 px-1 text-[11px] ${duree > 0 ? "text-ink-muted" : "text-overdue"}`}>
        {duree > 0 ? `Durée : ${duree} min` : "La fin doit suivre le début."}
      </p>
    </div>
  );
}
