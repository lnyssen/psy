"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { marquerRecuInami } from "@/lib/actions";

/** Séance conventionnée : l'INAMI a versé le tarif conventionné. Pas de mode de
 *  paiement à choisir — c'est un virement, et le patient n'a rien payé. */
export function RecuInami({ id }: { id: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          await marquerRecuInami(id);
          router.refresh();
        })
      }
      className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:border-accent hover:text-accent-text disabled:opacity-40"
    >
      reçu de l’INAMI
    </button>
  );
}
