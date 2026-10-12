"use client";

import { useState, useTransition } from "react";
import { envoyerRelance } from "@/lib/relance-actions";

/** Envoi direct de la relance. Une confirmation d'abord : un e-mail d'argent
 *  adressé à une famille ne se rattrape pas. */
export function EnvoyerRelance({
  patientId,
  nom,
  adresses,
}: {
  patientId: string;
  nom: string;
  adresses: string[];
}) {
  const [enCours, demarrer] = useTransition();
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={enCours}
        onClick={() => {
          if (!window.confirm(`Envoyer la relance pour ${nom} à ${adresses.join(", ")} ?`))
            return;
          demarrer(async () => {
            const r = await envoyerRelance(patientId);
            setRetour({ ok: r.ok, texte: r.message });
          });
        }}
        className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium transition-colors hover:border-accent hover:text-accent-text disabled:opacity-40"
      >
        {enCours ? "envoi…" : "envoyer"}
      </button>
      {retour && (
        <span
          role={retour.ok ? "status" : "alert"}
          className={`basis-full text-xs ${retour.ok ? "text-paid" : "text-overdue"}`}
        >
          {retour.texte}
        </span>
      )}
    </>
  );
}
