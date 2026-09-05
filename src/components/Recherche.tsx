"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { IconRecherche } from "@/components/icons";

/**
 * Recherche globale. Un simple formulaire GET : la requête vit dans l'URL, donc
 * un résultat se partage, se met en favori et survit au retour arrière.
 *
 * Le raccourci ⌘K y amène le curseur depuis n'importe quel écran — c'est le
 * geste attendu, et il évite d'avoir à viser un champ à la souris entre deux
 * consultations.
 */
export function Recherche({ defaut }: { defaut?: string }) {
  const champ = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        champ.current?.focus();
        champ.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = champ.current?.value.trim() ?? "";
        router.push(q ? `/recherche?q=${encodeURIComponent(q)}` : "/recherche");
      }}
      className="relative min-w-0 flex-1 md:max-w-56"
    >
      <label htmlFor="recherche" className="sr-only">
        Rechercher un patient, une note, un lieu
      </label>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted">
        <IconRecherche className="h-4 w-4" />
      </span>
      <input
        ref={champ}
        id="recherche"
        name="q"
        type="search"
        defaultValue={defaut}
        placeholder="Rechercher…"
        className="w-full rounded-full border border-line bg-surface py-2 pr-3 pl-9 text-[13px] placeholder:text-ink-muted/70"
      />
    </form>
  );
}
