"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { annulerAbsence } from "@/lib/actions";

/** Annule le caractère facturable d'une absence non excusée : la praticienne
 *  choisit de ne pas réclamer le montant, sans perdre la trace que c'était
 *  une absence (voir SessionStatus.NO_SHOW_ANNULE). */
export function AnnulerAbsence({ id }: { id: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          await annulerAbsence(id);
          router.refresh();
        })
      }
      className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-text disabled:opacity-40"
    >
      annuler l’absence
    </button>
  );
}
