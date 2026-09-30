"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fait entrer une section quand elle atteint le tiers inférieur de l'écran,
 * une fois pour toutes — pas à chaque passage. Réservé au site public : c'est
 * le prolongement de la cascade du hero, pas un effet à part.
 *
 * `IntersectionObserver` plutôt que `animation-timeline: view()` (les
 * animations pilotées par le défilement, en CSS pur) : Safari ne les prend en
 * charge que partiellement, or une bonne partie de la visite se fait sur
 * iPhone.
 */
export function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          setVisible(true);
          observateur.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${className} reveal ${visible ? "reveal-visible" : ""}`}>
      {children}
    </div>
  );
}
