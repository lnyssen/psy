"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { verrouiller } from "@/lib/auth-actions";
import { ENTREES, estActif } from "@/components/entrees";
import { Recherche } from "@/components/Recherche";
import { Theme } from "@/components/Theme";
import {
  IconCadenas,
  IconChevronDroite,
  IconChevronGauche,
  IconRecherche,
  IconReglages,
} from "@/components/icons";

/**
 * Barre latérale de l'outil, à partir de 900 px.
 *
 * Elle remplace la barre du haut pour une raison mesurée : à six entrées
 * libellées, le logo, les liens et les trois outils réclamaient 1195 px de
 * large. La barre du haut n'en offrait que 1088 et débordait ; à cinq entrées,
 * elle tenait à un pixel près. La phase comptabilité en ajoutera d'autres — le
 * haut n'était pas extensible, le côté l'est.
 *
 * Repliable, parce que la largeur est justement ce que coûte une barre
 * latérale, et que les tables de facturation et de finance en manquent. Le
 * choix se conserve dans un cookie et non dans le stockage local : le serveur
 * le lit au rendu et sert la bonne largeur dès la première réponse, sans le
 * sursaut d'une barre qui se replierait après coup.
 */
export function BarreLaterale({
  theme,
  demandesEnAttente,
  replieeInitial,
}: {
  theme: "light" | "dark";
  demandesEnAttente: number;
  replieeInitial: boolean;
}) {
  const pathname = usePathname();
  const [repliee, setRepliee] = useState(replieeInitial);
  const boutonVerrou = useRef<HTMLButtonElement>(null);

  // Le raccourci déclenche le vrai formulaire plutôt qu'un état local :
  // verrouiller détruit la session côté serveur, ce qu'aucun état de composant
  // ne saurait faire. La référence évite d'aller chercher le bouton par un
  // identifiant — il en existerait deux, celui-ci et celui du panneau mobile.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "l" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        boutonVerrou.current?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function basculer() {
    const suivant = !repliee;
    setRepliee(suivant);
    // Un an : c'est une préférence, pas une session.
    document.cookie = `nav=${suivant ? "replie" : "deploye"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <aside
      className={`sans-impression sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-paper transition-[width] duration-200 md:flex ${
        repliee ? "w-[4.75rem]" : "w-[15rem]"
      }`}
    >
      <div
        className={`flex items-center gap-2 px-3 pt-4 pb-3 ${repliee ? "justify-center" : ""}`}
      >
        {!repliee && (
          <Link href="/admin" className="flex min-w-0 flex-col px-1">
            <span className="truncate font-display text-[19px] leading-[1.15] tracking-tight">
              Amandine Monsel
            </span>
            <span className="mt-0.5 text-[10px] leading-[1.4] font-semibold tracking-[0.2em] text-accent-text uppercase">
              Amapsy&nbsp;SRL
            </span>
          </Link>
        )}

        <button
          type="button"
          onClick={basculer}
          aria-pressed={repliee}
          title={repliee ? "Déplier la navigation" : "Replier la navigation"}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text ${
            repliee ? "" : "ml-auto"
          }`}
        >
          <span className="sr-only">
            {repliee ? "Déplier la navigation" : "Replier la navigation"}
          </span>
          {repliee ? <IconChevronDroite /> : <IconChevronGauche />}
        </button>
      </div>

      <div className="px-3 pb-1">
        {repliee ? (
          // Repliée, la barre n'a pas la place d'un champ. Le bouton la déplie
          // plutôt que d'ouvrir une fenêtre : la recherche est juste en dessous
          // une fois dépliée, et deux mécaniques pour un même geste se
          // contrediraient. Le raccourci ⌘K reste, lui, toujours disponible.
          <button
            type="button"
            onClick={basculer}
            title="Rechercher (⌘K)"
            className="flex h-10 w-full items-center justify-center rounded-full border border-line bg-surface text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            <span className="sr-only">Rechercher</span>
            <IconRecherche className="h-4 w-4" />
          </button>
        ) : (
          <Recherche />
        )}
      </div>

      <nav
        aria-label="Navigation principale"
        className="mt-3 flex flex-1 flex-col gap-1 overflow-y-auto px-3"
      >
        {ENTREES.map(({ href, label, Icone }) => {
          const actif = estActif(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={actif ? "page" : undefined}
              title={label}
              className={`flex items-center gap-3 rounded-full py-2.5 text-[14px] font-medium whitespace-nowrap transition-colors ${
                repliee ? "justify-center px-0" : "px-3.5"
              } ${
                actif
                  ? "bg-accent text-accent-contrast"
                  : "text-ink-muted hover:bg-accent-soft hover:text-accent-text"
              }`}
            >
              <span className="relative shrink-0">
                <Icone />
                {href === "/admin/demandes" && demandesEnAttente > 0 && repliee && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-overdue px-1 text-[9px] font-bold text-white"
                  >
                    {demandesEnAttente}
                  </span>
                )}
              </span>

              {!repliee && <span className="truncate">{label}</span>}

              {href === "/admin/demandes" && demandesEnAttente > 0 && !repliee && (
                <span
                  aria-hidden="true"
                  className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                    actif ? "bg-white/25 text-white" : "bg-overdue text-white"
                  }`}
                >
                  {demandesEnAttente}
                </span>
              )}
              {href === "/admin/demandes" && demandesEnAttente > 0 && (
                <span className="sr-only">
                  {demandesEnAttente} demande{demandesEnAttente > 1 ? "s" : ""} en attente
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div
        className={`flex gap-2 border-t border-line p-3 ${
          repliee ? "flex-col items-center" : "items-center"
        }`}
      >
        <Link
          href="/admin/reglages"
          aria-current={pathname.startsWith("/admin/reglages") ? "page" : undefined}
          title="Réglages"
          className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
            pathname.startsWith("/admin/reglages")
              ? "border-accent bg-accent text-accent-contrast"
              : "border-line-strong text-ink-muted hover:border-accent hover:text-accent-text"
          }`}
        >
          <span className="sr-only">Réglages</span>
          <IconReglages />
        </Link>

        <Theme initial={theme} />

        <form action={verrouiller} className={repliee ? "" : "ml-auto"}>
          <button
            ref={boutonVerrou}
            type="submit"
            title="Verrouiller l’écran (⌘⇧L)"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            <span className="sr-only">Verrouiller l’écran</span>
            <IconCadenas />
          </button>
        </form>
      </div>
    </aside>
  );
}
