"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ENTREES = [
  { href: "/", label: "Aujourd’hui" },
  { href: "/semaine", label: "Semaine" },
  { href: "/patients", label: "Patients" },
  { href: "/facturation", label: "Facturation" },
];

export function Nav() {
  const pathname = usePathname();
  const [verrouille, setVerrouille] = useState(false);

  // Raccourci clavier : le verrouillage doit rester atteignable sans viser un
  // bouton à la souris quand quelqu'un entre dans la pièce.
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
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 md:px-8">
          <Link href="/" className="flex shrink-0 flex-col leading-none">
            <span className="font-display text-[17px] tracking-tight">Amandine Monsel</span>
            <span className="mt-1 text-[9px] font-semibold tracking-[0.18em] text-ink-muted uppercase">
              Amapsy&nbsp;SRL
            </span>
          </Link>

          {/* Sous 900 px la navigation passe sur sa propre ligne : coincée
              entre la signature et le bouton de verrouillage, elle était
              écrasée au point de tronquer ses libellés. */}
          <nav
            aria-label="Navigation principale"
            className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 md:order-none md:mx-0 md:w-auto md:flex-1 md:px-0"
          >
            {ENTREES.map((e) => {
              const actif = e.href === "/" ? pathname === "/" : pathname.startsWith(e.href);
              return (
                <Link
                  key={e.href}
                  href={e.href}
                  aria-current={actif ? "page" : undefined}
                  className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                    actif
                      ? "bg-accent text-accent-contrast"
                      : "text-ink-muted hover:bg-accent-soft hover:text-accent"
                  }`}
                >
                  {e.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setVerrouille(true)}
            title="Verrouiller l’écran (⌘⇧L)"
            className="ml-auto shrink-0 rounded-full border border-line-strong px-4 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent md:ml-0"
          >
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
 * rien lire, et reste posé : ni écran noir brutal, ni message anxiogène. Dans
 * l'application réelle, la sortie exigera le mot de passe.
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
        <span className="font-display text-2xl tracking-tight">Amandine Monsel</span>
        <span className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">
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
        className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
      >
        Reprendre
      </button>
    </div>
  );
}
