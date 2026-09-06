"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconFermer, IconMenu } from "@/components/icons";

const PAGES = [
  { href: "/en-pratique", label: "En pratique" },
  { href: "/questions", label: "Questions fréquentes" },
  { href: "/contact", label: "Contact" },
];

/**
 * En-tête du site public.
 *
 * Sur téléphone, les trois liens et le bouton d'appel à l'action s'empilaient
 * sur trois lignes sans jamais se replier : l'en-tête occupait le tiers de
 * l'écran avant le premier mot, et l'on n'y reconnaissait plus un menu. Tout
 * passe désormais derrière un bouton, le seul appel à l'action restant visible.
 */
export function EnteteSite() {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const [cheminAffiche, setCheminAffiche] = useState(pathname);

  if (cheminAffiche !== pathname) {
    setCheminAffiche(pathname);
    setOuvert(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    /*
      L'en-tête est une pastille détachée : du jeu au-dessus, du jeu sur les
      côtés, et rien qui touche le bord de l'écran.

      Sa largeur n'est pas celle de la colonne de texte mais celle-ci plus ses
      propres marges intérieures. C'est ce qui remet le logo exactement sur la
      gouttière du contenu — 128 px sur grand écran, 24 px sur téléphone — au
      lieu de l'en décaler de la valeur du rembourrage.

      La hauteur est fixée par --entete plutôt que déduite du contenu :
      l'accueil s'en sert en marge négative pour faire passer la photo derrière,
      et une hauteur variable aurait laissé un liseré.
    */
    <header className="sticky top-0 z-40 h-[var(--entete)] px-3 pt-4 md:px-6">
      <div className="mx-auto flex h-full max-w-[66.5rem] items-center gap-3 rounded-full bg-paper/92 px-3 shadow-[0_10px_30px_-14px_rgba(19,28,68,0.45)] ring-1 ring-line ring-inset backdrop-blur-xl md:gap-4 md:px-5">
        <Link href="/" className="flex shrink-0 flex-col">
          <span className="font-display text-[17px] leading-[1.15] tracking-tight md:text-[20px]">
            Amandine Monsel
          </span>
          <span className="mt-0.5 text-[9px] leading-[1.4] font-semibold tracking-[0.16em] text-accent-text uppercase md:text-[10px] md:tracking-[0.2em]">
            Psychologue clinicienne
          </span>
        </Link>

        {/*
          Les liens vivent dans une pastille au fond transparent : seul un filet
          la dessine, le papier de l'en-tête reste visible au travers. La page
          courante est la seule à recevoir un fond — c'est ce qui la désigne,
          sans que la pastille elle-même pèse.
        */}
        <nav
          aria-label="Navigation du site"
          className="ml-8 hidden items-center gap-1 rounded-full border border-line-strong/70 p-1 md:flex"
        >
          {PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              aria-current={pathname === p.href ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-[15px] transition-colors ${
                pathname === p.href
                  ? "bg-accent-soft font-semibold text-accent-text"
                  : "text-ink-muted hover:bg-accent-soft/60 hover:text-accent-text"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/rendez-vous"
          className="ml-auto shrink-0 rounded-full bg-accent px-3.5 py-2 text-[12px] font-semibold whitespace-nowrap text-accent-contrast transition-colors hover:bg-accent-hover md:px-5 md:py-2.5 md:text-sm"
        >
          <span className="md:hidden">Rendez-vous</span>
          <span className="hidden md:inline">Prendre rendez-vous</span>
        </Link>

        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
          aria-controls="menu-site"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-muted md:hidden"
        >
          <span className="sr-only">{ouvert ? "Fermer le menu" : "Ouvrir le menu"}</span>
          {ouvert ? <IconFermer /> : <IconMenu />}
        </button>
      </div>

      {ouvert && (
        /*
          L'en-tête ayant une hauteur fixe, le menu déplié ne peut plus pousser
          quoi que ce soit : il devient un panneau qui flotte sous la pastille,
          au même retrait qu'elle.
        */
        <nav
          id="menu-site"
          aria-label="Navigation du site"
          className="mt-2 flex flex-col rounded-[24px] border border-line bg-paper/97 px-5 py-2 shadow-[0_16px_40px_-16px_rgba(19,28,68,0.5)] backdrop-blur-xl md:hidden"
        >
          {PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              aria-current={pathname === p.href ? "page" : undefined}
              className={`border-b border-line py-3.5 text-base last:border-b-0 ${
                pathname === p.href ? "font-semibold text-accent-text" : ""
              }`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
