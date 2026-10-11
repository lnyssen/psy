"use client";

import { useEffect, useRef } from "react";

/**
 * Un disque plein, mauve, qui suit la souris — même geste que sur
 * laurentnyssen.be, sans les étiquettes.
 *
 * Il remplace la flèche, sauf sur les champs de saisie où l'on a besoin de voir
 * le curseur de texte. Il n'intercepte aucun clic (pointer-events: none) et
 * grossit un peu au-dessus de ce qui se clique. Sur un aplat mauve (les
 * boutons d'action), il passe au blanc : du mauve sur du mauve disparaîtrait.
 *
 * Son retard est calculé sur le temps écoulé et non sur le nombre d'images :
 * le mouvement a la même fluidité sur un écran à 60 ou à 120 Hz.
 *
 * Il n'existe que là où il a un sens — un pointeur précis qui survole (souris,
 * pavé tactile), jamais au doigt — et il disparaît pour les personnes qui ont
 * demandé moins d'animations : la flèche reste alors la leur.
 */
export function CurseurRond() {
  const disque = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = disque.current;
    if (!el) return;
    const fin = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fin.matches || calme.matches) return;

    const racine = document.documentElement;
    racine.dataset.curseurRond = "";

    const cible = { x: 0, y: 0 };
    const actuel = { x: 0, y: 0 };
    let vu = false;
    let frame = 0;

    // Constante de temps de 120 ms : le disque rattrape le pointeur en
    // douceur, avec une traîne qu'on sent sans que l'écart gêne au clic — c'est
    // le pointeur réel, invisible, qui atteint la cible.
    let avant = performance.now();
    const suivre = (maintenant: number) => {
      const dt = Math.min(maintenant - avant, 64);
      avant = maintenant;
      const k = 1 - Math.exp(-dt / 120);
      const dx = cible.x - actuel.x;
      const dy = cible.y - actuel.y;
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        actuel.x += dx * k;
        actuel.y += dy * k;
        el.style.transform = `translate3d(${actuel.x}px, ${actuel.y}px, 0) translate(-50%, -50%)`;
      }
      frame = requestAnimationFrame(suivre);
    };

    const bouge = (e: PointerEvent) => {
      cible.x = e.clientX;
      cible.y = e.clientY;
      if (!vu) {
        actuel.x = cible.x;
        actuel.y = cible.y;
        vu = true;
        el.style.opacity = "1";
      }
      const cibleEl = e.target as Element | null;
      el.dataset.actif = cibleEl?.closest(
        "a, button, summary, label, select, [role=button]",
      )
        ? "oui"
        : "non";
      el.dataset.mauve = cibleEl?.closest('[class~="bg-accent"]')
        ? "oui"
        : "non";
    };
    const sort = () => {
      el.style.opacity = "0";
      vu = false;
    };

    window.addEventListener("pointermove", bouge, { passive: true });
    racine.addEventListener("pointerleave", sort);
    frame = requestAnimationFrame(suivre);
    return () => {
      window.removeEventListener("pointermove", bouge);
      racine.removeEventListener("pointerleave", sort);
      cancelAnimationFrame(frame);
      delete racine.dataset.curseurRond;
    };
  }, []);

  return (
    <div
      ref={disque}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[60] opacity-0 transition-opacity duration-200"
    >
      <span className="block h-5 w-5 rounded-full bg-accent transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] [[data-actif=oui]_&]:scale-[1.7] [[data-mauve=oui]_&]:bg-white" />
    </div>
  );
}
