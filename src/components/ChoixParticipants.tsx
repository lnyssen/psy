"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changerParticipants } from "@/lib/actions";
import { confirmer } from "@/components/Confirmations";
import { PARTICIPANTS } from "@/lib/participants";

/** Qui participe à une séance de l'historique : changeable sur la ligne. */
export function ChoixParticipants({ id, valeur }: { id: string; valeur: string }) {
  const router = useRouter();
  const [choisi, setChoisi] = useState(valeur);
  const [enCours, demarrer] = useTransition();
  const seule = choisi === "INDIVIDUELLE";

  return (
    <select
      aria-label="Qui participe à la séance"
      value={choisi}
      disabled={enCours}
      onChange={(e) => {
        const v = e.currentTarget.value;
        const avant = choisi;
        setChoisi(v);
        demarrer(async () => {
          try {
            await changerParticipants(id, v);
            confirmer("Séance mise à jour.");
            router.refresh();
          } catch {
            setChoisi(avant);
            confirmer("La modification a échoué.", true);
          }
        });
      }}
      className={`rounded-full border py-0.5 pr-1 pl-2.5 text-[11px] font-medium transition-colors disabled:opacity-40 ${
        seule
          ? "border-line-strong text-ink-muted hover:border-accent"
          : "border-accent bg-accent-soft text-accent-text"
      }`}
    >
      {PARTICIPANTS.map((p) => (
        <option key={p.valeur} value={p.valeur}>
          {p.valeur === "INDIVIDUELLE" ? "individuelle" : p.court}
        </option>
      ))}
    </select>
  );
}
