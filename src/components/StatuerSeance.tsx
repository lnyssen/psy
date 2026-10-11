"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { statuerSeances } from "@/lib/seance-actions";

/** Les deux gestes qui rendent une séance passée facturable : venue, ou
 *  absente sans excuse (voir lib/seance-actions.ts). Avec plusieurs ids, les
 *  libellés passent au pluriel et le geste porte sur toutes. */
export function StatuerSeance({ ids, groupe = false }: { ids: string[]; groupe?: boolean }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  const statuer = (statut: "ATTENDED" | "NO_SHOW") =>
    demarrer(async () => {
      await statuerSeances(ids, statut);
      router.refresh();
    });

  const bouton =
    "rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-40";
  return (
    <span className="inline-flex gap-1">
      <button
        type="button"
        disabled={enCours}
        onClick={() => statuer("ATTENDED")}
        className={`${bouton} hover:border-accent hover:text-accent-text`}
      >
        {groupe ? "toutes honorées" : "honorée"}
      </button>
      {!groupe && (
        <button
          type="button"
          disabled={enCours}
          onClick={() => statuer("NO_SHOW")}
          className={`${bouton} text-ink-muted hover:border-overdue hover:text-overdue`}
        >
          absente
        </button>
      )}
    </span>
  );
}
