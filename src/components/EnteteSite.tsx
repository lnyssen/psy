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
      propres marges intérieures (64rem + 2 × 40 px). C'est ce qui remet le logo
      exactement sur la gouttière du contenu — 128 px — au lieu de l'en décaler
      de la valeur du rembourrage. Sur téléphone le compte ne tombe plus juste :
      il fallait choisir entre un nom collé au bord arrondi et un alignement au
      pixel avec le texte du dessous, et c'est l'air dans la pastille qui l'a
      emporté. Les vingt-huit pixels de retrait n'y tiennent d'ailleurs qu'une
      fois l'appel à l'action resserré : à 375 px, le nom, le bouton et le
      bouton de menu occupent déjà toute la largeur disponible, et chaque pixel
      donné au retrait est un pixel repris à l'un des trois.

      Pas d'ombre portée : la pastille se détache par sa transparence et le flou
      de ce qui passe dessous, pas par une ombre. Un filet d'un pixel suffit à
      en tenir le bord.

      La hauteur est fixée par --entete plutôt que déduite du contenu :
      l'accueil s'en sert en marge négative pour faire passer la photo derrière,
      et une hauteur variable aurait laissé un liseré.
    */
    <header className="sticky top-0 z-40 h-[var(--entete)] px-3 pt-4 md:px-6">
      <div className="mx-auto flex h-full max-w-[69rem] items-center gap-2 rounded-full bg-paper/72 px-7 ring-1 ring-line/70 ring-inset backdrop-blur-2xl md:gap-4 md:px-10">
        <Link href="/" className="flex shrink-0 flex-col">
          <span className="font-display text-[17px] leading-[1.15] tracking-tight md:text-[20px]">
            Amandine Monsel
          </span>
          <span className="mt-0.5 text-[9px] leading-[1.4] font-semibold tracking-[0.16em] text-accent-text uppercase md:text-[10px] md:tracking-[0.2em]">
            Psychologue clinicienne
          </span>
        </Link>

        {/*
          Les liens ne sont pas encadrés : une pastille dans la pastille faisait
          deux contours pour une seule barre. Seule la page courante reçoit un
          fond, et c'est ce qui la désigne.

          Ils sont à l'encre pleine et non en gris atténué. Mesuré sur le rendu
          réel — photo, voile, puis papier à 72 % —, le gris tombait à 3,46:1
          au-dessus du ciel clair, sous le seuil. La transparence voulue se paie
          quelque part : ici, sur la couleur du texte plutôt que sur le verre.
        */}
        <nav aria-label="Navigation du site" className="ml-8 hidden items-center gap-1 md:flex">
          {PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              aria-current={pathname === p.href ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-[15px] transition-colors ${
                pathname === p.href
                  ? "bg-accent-soft font-semibold text-accent-text"
                  : "text-ink hover:bg-accent-soft/60 hover:text-accent-text"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/rendez-vous"
          className="ml-auto shrink-0 rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap text-accent-contrast transition-colors hover:bg-accent-hover md:px-5 md:py-2.5 md:text-sm"
        >
          <span className="md:hidden">Rendez-vous</span>
          <span className="hidden md:inline">Prendre rendez-vous</span>
        </Link>

        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
          aria-controls="menu-site"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/35 text-ink transition-colors hover:border-ink md:hidden"
        >
          <span className="sr-only">{ouvert ? "Fermer le menu" : "Ouvrir le menu"}</span>
          {ouvert ? <IconFermer /> : <IconMenu />}
        </button>
      </div>

      {/*
        L'en-tête ayant une hauteur fixe, le menu déplié ne peut plus pousser
        quoi que ce soit : il devient un panneau qui flotte sous la pastille,
        au même retrait qu'elle.

        Toujours dans le DOM plutôt qu'en rendu conditionnel : c'est ce qui
        permet une fermeture animée plutôt qu'une disparition sèche. La rangée
        de grille passe de 0fr à 1fr — la bonne façon d'animer une hauteur qui
        dépend du contenu, sans jamais toucher `height` elle-même. `inert`
        retire le panneau du clavier et des lecteurs d'écran tant qu'il est
        refermé, ce que le rendu conditionnel garantissait avant sans y penser.
      */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden ${
          ouvert ? "mt-2 grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <nav
          id="menu-site"
          aria-label="Navigation du site"
          aria-hidden={!ouvert}
          inert={!ouvert}
          className={`flex flex-col overflow-hidden rounded-[24px] transition-opacity duration-200 ${
            ouvert
              ? "bg-paper/88 px-5 py-2 opacity-100 ring-1 ring-line/70 ring-inset backdrop-blur-2xl"
              : "opacity-0"
          }`}
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
      </div>
    </header>
  );
}
