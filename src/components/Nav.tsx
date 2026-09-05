"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconCadenas,
  IconFacturation,
  IconJour,
  IconPatients,
  IconSemaine,
} from "@/components/icons";

const ENTREES = [
  { href: "/", label: "Aujourd’hui", Icone: IconJour },
  { href: "/semaine", label: "Semaine", Icone: IconSemaine },
  { href: "/patients", label: "Patients", Icone: IconPatients },
  { href: "/facturation", label: "Facturation", Icone: IconFacturation },
];

export function Nav() {
  const pathname = usePathname();
  const [verrouille, setVerrouille] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "l" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setVerrouille(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sans-impression sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 md:px-8">
          <Link href="/" className="flex shrink-0 flex-col leading-none">
            <span className="font-display text-[22px] leading-none font-bold tracking-tight">
              Amandine Monsel
            </span>
            <span className="mt-1.5 text-[11px] font-semibold tracking-[0.2em] text-accent-text uppercase">
              Amapsy&nbsp;SRL
            </span>
          </Link>

          {/* Sous 900 px la navigation passe sur sa propre ligne : coincée entre
              la signature et le bouton de verrouillage, elle était écrasée au
              point de tronquer ses libellés. */}
          <nav
            aria-label="Navigation principale"
            className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 md:order-none md:mx-0 md:w-auto md:flex-1 md:px-0"
          >
            {ENTREES.map(({ href, label, Icone }) => {
              const actif = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={actif ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                    actif
                      ? "bg-accent text-accent-contrast"
                      : "text-ink-muted hover:bg-accent-soft hover:text-accent-text"
                  }`}
                >
                  <Icone />
                  {label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setVerrouille(true)}
            title="Verrouiller l’écran (⌘⇧L)"
            className="ml-auto flex shrink-0 items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-text md:ml-0"
          >
            <IconCadenas />
            Verrouiller
          </button>
        </div>
      </header>

      {verrouille && <EcranVerrouille onDeverrouiller={() => setVerrouille(false)} />}
    </>
  );
}

/**
 * Ce que voit quelqu'un qui regarde l'écran une fois verrouillé. Il ne laisse
 * rien lire, et reste posé : ni écran noir brutal, ni message anxiogène.
 *
 * Il porte désormais seul la confidentialité de l'écran : les vues d'ensemble
 * affichent les noms complets, sur décision explicite de la praticienne.
 */
function EcranVerrouille({ onDeverrouiller }: { onDeverrouiller: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Écran verrouillé"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-paper px-6"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-display text-4xl font-bold tracking-tight">Amandine Monsel</span>
        <span className="text-sm font-semibold tracking-[0.22em] text-accent-text uppercase">
          Amapsy&nbsp;SRL
        </span>
      </div>
      <p className="max-w-xs text-center text-sm text-ink-muted">
        Session verrouillée. Rien n’est affiché tant que vous n’avez pas repris la main.
      </p>
      <button
        type="button"
        autoFocus
        onClick={onDeverrouiller}
        className="flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
      >
        <IconCadenas />
        Reprendre
      </button>
    </div>
  );
}
