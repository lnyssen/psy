"use client";

import { useState } from "react";
import { rattacherPropositions } from "@/lib/google-actions";

type Proposition = {
  valeur: string;
  titre: string;
  patient: string;
  lieu: string;
  accompagnants: string;
  quand: string;
  occurrences: number;
};

/**
 * Tout ce que l'outil a reconnu, à valider d'un seul clic. Chaque ligne est
 * cochée par défaut et se décoche si la proposition est fausse ; le bouton dit
 * toujours combien de séances il va créer. Les titres validés sont retenus :
 * la prochaine fois, ils seront rattachés sans passer par ici.
 */
export function PropositionsGoogle({ propositions }: { propositions: Proposition[] }) {
  const [cochees, setCochees] = useState(() => new Set(propositions.map((p) => p.valeur)));
  const seances = propositions.filter((p) => cochees.has(p.valeur)).reduce((n, p) => n + p.occurrences, 0);

  function basculer(v: string) {
    setCochees((c) => {
      const n = new Set(c);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });
  }

  return (
    <form action={rattacherPropositions} className="rounded-[14px] border border-accent bg-accent-soft/40 px-5 py-4">
      <h2 className="text-base font-semibold">
        {propositions.length === 1 ? "1 titre reconnu" : `${propositions.length} titres reconnus`}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Décoche ce qui est faux, puis valide. Les titres validés seront ensuite rattachés tout seuls.
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {propositions.map((p) => (
          <li key={p.valeur}>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                name="ligne"
                value={p.valeur}
                checked={cochees.has(p.valeur)}
                onChange={() => basculer(p.valeur)}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">« {p.titre} »</span>
                {` → ${p.patient} · ${p.lieu}`}
                {p.accompagnants ? ` · ${p.accompagnants}` : ""}
                <span className="ml-2 text-xs text-ink-muted" data-numeric>
                  {p.occurrences > 1 ? `${p.occurrences} rendez-vous, dès le ${p.quand}` : p.quand}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="submit"
        disabled={seances === 0}
        className="mt-4 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {seances > 1 ? `Valider : créer ${seances} séances` : seances === 1 ? "Valider : créer 1 séance" : "Rien de coché"}
      </button>
    </form>
  );
}
