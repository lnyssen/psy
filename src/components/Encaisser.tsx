"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { marquerPaye } from "@/lib/actions";

/** Encaissement : le mode de paiement est demandé au moment du geste, parce
 *  que le reçu doit le mentionner. */
export function Encaisser({ id }: { id: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  const payer = (methode: "CASH" | "ELECTRONIC") =>
    demarrer(async () => {
      await marquerPaye(id, methode);
      router.refresh();
    });

  return (
    <span className="inline-flex gap-1">
      <button
        type="button"
        disabled={enCours}
        onClick={() => payer("CASH")}
        className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:border-accent hover:text-accent-text disabled:opacity-40"
      >
        espèces
      </button>
      <button
        type="button"
        disabled={enCours}
        onClick={() => payer("ELECTRONIC")}
        className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:border-accent hover:text-accent-text disabled:opacity-40"
      >
        carte
      </button>
    </span>
  );
}
