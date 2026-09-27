"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { annulerSeance } from "@/lib/actions";

/** Annule un rendez-vous à venir (voir le commentaire de l'action) : passe
 *  la séance en « annulée à temps », sans la supprimer. */
export function AnnulerSeance({ id, className = "" }: { id: string; className?: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          await annulerSeance(id);
          router.refresh();
        })
      }
      className={`rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-overdue hover:text-overdue disabled:opacity-40 ${className}`}
    >
      annuler
    </button>
  );
}
