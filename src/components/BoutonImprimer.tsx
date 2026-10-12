"use client";

/** Ouvre la boîte d'impression du navigateur (ou « Enregistrer en PDF »). */
export function BoutonImprimer() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
    >
      Imprimer
    </button>
  );
}
