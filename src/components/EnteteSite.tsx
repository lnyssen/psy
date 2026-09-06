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
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 px-6 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-3 py-3 md:gap-4 md:py-4">
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
        <nav
          id="menu-site"
          aria-label="Navigation du site"
          className="-mx-6 flex flex-col border-t border-line bg-paper px-6 py-3 md:hidden"
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
