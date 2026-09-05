"use client";

import { useState } from "react";
import { IconLune, IconSoleil } from "@/components/icons";

/**
 * Bascule clair / sombre.
 *
 * La préférence est écrite dans un cookie plutôt que dans le stockage local :
 * le serveur la lit au rendu et pose l'attribut sur la racine dès la première
 * réponse. Un choix conservé côté navigateur seulement obligerait à corriger le
 * thème après coup, avec un éclair blanc à chaque chargement.
 */
export function Theme({ initial }: { initial: "light" | "dark" }) {
  const [theme, setTheme] = useState(initial);

  function basculer() {
    const suivant = theme === "dark" ? "light" : "dark";
    setTheme(suivant);
    document.documentElement.dataset.theme = suivant;
    // Un an : c'est une préférence, pas une session.
    document.cookie = `theme=${suivant}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={basculer}
      aria-pressed={theme === "dark"}
      title={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text md:h-9 md:w-9"
    >
      <span className="sr-only">
        {theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
      </span>
      {theme === "dark" ? <IconSoleil /> : <IconLune />}
    </button>
  );
}
