"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { basculerVisio } from "@/lib/seance-actions";

/** Passe une séance en visio ou la ramène au cabinet, d'un geste. */
export function BasculeVisio({ id, visio }: { id: string; visio: boolean }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  return (
    <button
      type="button"
      disabled={enCours}
      aria-pressed={visio}
      title={visio ? "Repasser au cabinet" : "Passer en visio"}
      onClick={() =>
        demarrer(async () => {
          await basculerVisio(id);
          router.refresh();
        })
      }
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-40 ${
        visio
          ? "border-accent bg-accent-soft text-accent-text"
          : "border-line-strong text-ink-muted hover:border-accent hover:text-accent-text"
      }`}
    >
      visio
    </button>
  );
}
