"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

/**
 * Bouton d'enregistrement d'un formulaire posé dans un <details> repliable
 * (« Modifier la fiche », « éditer » une facture...) : une fois la
 * soumission passée, il referme le panneau tout seul plutôt que de le
 * laisser ouvert après un enregistrement réussi.
 *
 * useFormStatus n'existe que pour le <form> ancêtre le plus proche — ce
 * bouton doit donc être posé à l'intérieur de ce formulaire, jamais à côté.
 */
export function BoutonEnregistrer({
  children = "Enregistrer",
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const enCours = useRef(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pending) {
      enCours.current = true;
      return;
    }
    if (enCours.current) {
      enCours.current = false;
      ref.current?.closest("details")?.removeAttribute("open");
    }
  }, [pending]);

  return (
    <button
      ref={ref}
      type="submit"
      disabled={pending}
      className={`rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-60 ${className}`}
    >
      {pending ? "Enregistrement…" : children}
    </button>
  );
}
