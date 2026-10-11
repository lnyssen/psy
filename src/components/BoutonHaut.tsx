"use client";

import { useEffect, useState } from "react";

/**
 * Retour en haut de page : un rond discret, qui n'apparaît qu'après un bon bout
 * de défilement. Même famille que le bouton de menu de l'en-tête (rond, filet
 * d'encre) pour ne pas introduire un second style de bouton.
 *
 * Le défilement est animé sauf si la personne a demandé le contraire.
 */
export function BoutonHaut() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const maj = () => setVisible(window.scrollY > 700);
    maj();
    window.addEventListener("scroll", maj, { passive: true });
    return () => window.removeEventListener("scroll", maj);
  }, []);

  function remonter() {
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduit ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={remonter}
      aria-label="Retour en haut de la page"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`fixed right-4 bottom-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-ink/35 bg-paper/90 text-ink backdrop-blur-xl transition-[opacity,transform] duration-300 hover:border-ink md:right-6 md:bottom-6 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}
