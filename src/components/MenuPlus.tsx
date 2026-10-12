"use client";

import { useEffect, useRef } from "react";

/**
 * Menu « ⋯ » des actions secondaires d'une ligne. Une séance payée cumulait
 * cinq petits boutons côte à côte : l'état et l'action principale restent
 * visibles, le reste (reçu, envoi, partage…) se range ici. Se referme d'un clic
 * à côté ou d'Échap.
 */
export function MenuPlus({
  children,
  libelle = "Autres actions",
}: {
  children: React.ReactNode;
  libelle?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const dehors = (e: Event) => {
      const d = ref.current;
      if (d?.open && !d.contains(e.target as Node)) d.open = false;
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current) ref.current.open = false;
    };
    document.addEventListener("pointerdown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("pointerdown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary
        aria-label={libelle}
        title={libelle}
        className="flex h-7 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text [&::-webkit-details-marker]:hidden"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <circle cx="4.5" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="15.5" cy="10" r="1.5" />
        </svg>
      </summary>
      <div className="absolute top-full right-0 z-20 mt-1.5 flex min-w-52 flex-col items-start gap-2 rounded-[14px] border border-line bg-surface p-3 shadow-[0_16px_32px_-16px_rgba(27,20,100,0.35)]">
        {children}
      </div>
    </details>
  );
}
