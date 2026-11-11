"use client";

import { useEffect, useState } from "react";

const QUESTION = "Des modifications ne sont pas enregistrées. Quitter la page quand même ?";

/** Un formulaire qu'on enregistre par un bouton : c'est lui qu'il faut garder.
 *  Les recherches (GET) et les formulaires marqués data-sans-garde en sont
 *  exclus. */
function aGarder(form: HTMLFormElement | null): form is HTMLFormElement {
  if (!form || form.method?.toLowerCase() === "get") return false;
  if (form.hasAttribute("data-sans-garde")) return false;
  return Boolean(form.querySelector('button[type="submit"], button:not([type])'));
}

/**
 * Garde contre la saisie perdue, posée une fois dans l'outil, comme
 * Confirmations.
 *
 * Un formulaire modifié et pas encore envoyé est marqué (data-modifie, que
 * globals.css souligne sur son bouton), un bandeau le rappelle, et quitter la
 * page (lien, rechargement, fermeture de l'onglet) demande confirmation. Le
 * cas visé d'abord : Réglages, où chaque bloc a son propre bouton et où l'on
 * pouvait modifier deux blocs, n'en enregistrer qu'un et perdre l'autre sans
 * un mot.
 */
export function GardeSaisie() {
  const [nb, setNb] = useState(0);

  useEffect(() => {
    const modifies = new Set<HTMLFormElement>();
    const actifs = () => {
      for (const f of modifies) if (!f.isConnected) modifies.delete(f);
      return modifies.size;
    };
    const maj = () => setNb(actifs());

    const saisie = (e: Event) => {
      const cible = e.target as HTMLElement | null;
      const form = (cible as HTMLInputElement | null)?.form ?? cible?.closest?.("form") ?? null;
      if (!aGarder(form)) return;
      if (!modifies.has(form)) {
        modifies.add(form);
        form.setAttribute("data-modifie", "");
        maj();
      }
    };
    const liberer = (e: Event) => {
      const form = e.target as HTMLFormElement | null;
      if (form && modifies.delete(form)) {
        form.removeAttribute("data-modifie");
        maj();
      }
    };
    const quitter = (e: BeforeUnloadEvent) => {
      if (actifs() === 0) return;
      e.preventDefault();
      // Chrome exige encore une valeur de retour pour afficher la question.
      e.returnValue = "";
    };
    // Les liens de Next naviguent sans recharger : beforeunload ne les voit
    // pas. On les arrête avant React, en phase de capture.
    const clic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const lien = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!lien || lien.target === "_blank" || lien.hasAttribute("download")) return;
      if (lien.origin !== window.location.origin) return;
      if (lien.pathname === window.location.pathname && lien.hash) return;
      if (actifs() === 0) return;
      if (window.confirm(QUESTION)) {
        for (const f of modifies) f.removeAttribute("data-modifie");
        modifies.clear();
        maj();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener("input", saisie, true);
    document.addEventListener("change", saisie, true);
    document.addEventListener("submit", liberer, true);
    document.addEventListener("reset", liberer, true);
    document.addEventListener("click", clic, true);
    window.addEventListener("beforeunload", quitter);
    return () => {
      document.removeEventListener("input", saisie, true);
      document.removeEventListener("change", saisie, true);
      document.removeEventListener("submit", liberer, true);
      document.removeEventListener("reset", liberer, true);
      document.removeEventListener("click", clic, true);
      window.removeEventListener("beforeunload", quitter);
    };
  }, []);

  if (nb === 0) return null;
  return (
    <div
      role="status"
      className="sans-impression pointer-events-none fixed bottom-6 left-4 z-[55] rounded-full border border-due/40 bg-due-soft px-4 py-2 text-xs font-medium text-due shadow-[0_12px_24px_-16px_rgba(27,20,100,0.45)] md:left-auto md:right-6 md:bottom-24"
    >
      {nb > 1 ? `${nb} blocs modifiés, pas encore enregistrés` : "Modification pas encore enregistrée"}
    </div>
  );
}
