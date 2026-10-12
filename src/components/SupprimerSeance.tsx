"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { supprimerSeance } from "@/lib/seance-actions";

/**
 * Supprimer une séance, en deux temps : un premier clic qui dit ce qui va
 * disparaître, un second qui le fait. Pas de retour possible, d'où ce détour
 * (le geste est rangé dans le menu « ⋯ », loin des boutons de tous les jours).
 */
export function SupprimerSeance({
  id,
  quand,
  montant,
  payee,
}: {
  id: string;
  /** « 06/10/26 · 12:00 » */
  quand: string;
  /** « 75,00 € », s'il y a un montant. */
  montant: string | null;
  payee: boolean;
}) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  if (!confirmer)
    return (
      <button
        type="button"
        onClick={() => setConfirmer(true)}
        className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-overdue hover:text-overdue"
      >
        supprimer la séance
      </button>
    );

  return (
    <div role="alertdialog" aria-label="Confirmer la suppression" className="flex max-w-64 flex-col gap-2">
      <p className="text-xs leading-relaxed">
        Supprimer définitivement la séance du <strong>{quand}</strong>
        {montant ? ` (${montant}${payee ? ", payée" : ""})` : ""} ? Elle disparaît de
        l’historique, de la facturation, des chiffres de l’année et de l’agenda.{" "}
        <strong>Irréversible.</strong>
        {payee && " Un reçu déjà remis au patient n’aura plus de séance derrière lui."}
      </p>
      {erreur && (
        <p role="alert" className="text-xs text-overdue">
          {erreur}
        </p>
      )}
      <span className="flex gap-2">
        <button
          type="button"
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              const r = await supprimerSeance(id);
              if (!r.ok) setErreur(r.message);
              else router.refresh();
            })
          }
          className="rounded-full bg-overdue px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {enCours ? "Suppression…" : "Supprimer"}
        </button>
        <button
          type="button"
          disabled={enCours}
          onClick={() => {
            setConfirmer(false);
            setErreur(null);
          }}
          className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium transition-colors hover:border-accent hover:text-accent-text"
        >
          Garder
        </button>
      </span>
    </div>
  );
}
