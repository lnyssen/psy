"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { IconFermer, IconMenu } from "@/components/icons";

const PAGES = [
  { href: "/#approche", label: "Approche" },
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

  // La pastille de la page courante glisse d'un lien à l'autre. Elle est
  // placée directement sur l'élément (pas d'état) : mesurer puis rendre à
  // nouveau décalerait d'une image ce qui doit être immédiat.
  const liens = useRef(new Map<string, HTMLAnchorElement>());
  const pastille = useRef<HTMLSpanElement>(null);
  const dejaPlacee = useRef(false);
  useLayoutEffect(() => {
    const placer = () => {
      const el = pastille.current;
      if (!el) return;
      const actif = liens.current.get(pathname);
      if (!actif || actif.offsetWidth === 0) {
        el.style.opacity = "0";
        return;
      }
      // Le premier placement se fait sans transition : la pastille ne doit pas
      // arriver en glissant depuis le bord au chargement de la page.
      el.style.transition = dejaPlacee.current ? "" : "none";
      el.style.width = `${actif.offsetWidth}px`;
      el.style.transform = `translateX(${actif.offsetLeft}px)`;
      el.style.opacity = "1";
      dejaPlacee.current = true;
    };
    placer();
    window.addEventListener("resize", placer);
    return () => window.removeEventListener("resize", placer);
  }, [pathname]);
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
    <header className="sticky top-0 z-40 h-[var(--entete)] px-3 pt-4 md:px-6 lg:px-4">
      <div className="relative z-10 mx-auto flex h-full max-w-[calc(100rem+5rem)] items-center gap-2 rounded-full bg-paper/72 px-7 ring-1 ring-line/70 ring-inset backdrop-blur-2xl max-[359px]:px-4 max-md:pr-3.5 md:gap-4 md:px-10">
        <Link href="/" className="flex shrink-0 flex-col">
          <span className="font-display text-[17px] leading-[1.15] tracking-tight md:text-[20px]">
            Amandine Monsel
          </span>
          <span className="mt-0.5 text-[9px] leading-[1.4] max-[359px]:hidden font-semibold tracking-[0.16em] text-accent-text uppercase md:text-[10px] md:tracking-[0.2em]">
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
        <nav
          aria-label="Navigation du site"
          className="relative ml-auto hidden items-center gap-1 md:flex"
        >
          {/* Même graisse pour tous les liens : une graisse qui change à la
              sélection élargit le lien et pousse ses voisins. Seule la couleur
              et la pastille désignent la page courante. */}
          <span
            ref={pastille}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 h-full rounded-full bg-accent-soft opacity-0 transition-[transform,width,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          />
          {PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              ref={(el) => {
                if (el) liens.current.set(p.href, el);
                else liens.current.delete(p.href);
              }}
              aria-current={pathname === p.href ? "page" : undefined}
              className={`relative rounded-full px-4 py-1.5 text-[15px] font-medium transition-colors duration-300 ${
                pathname === p.href
                  ? "text-accent-text"
                  : "text-ink hover:text-accent-text"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/rendez-vous"
          className="ml-auto flex min-h-11 shrink-0 items-center rounded-full bg-accent px-3.5 md:ml-3 text-[11px] font-semibold whitespace-nowrap text-accent-contrast transition-colors hover:bg-accent-hover max-[359px]:hidden md:min-h-0 md:px-5 md:py-2.5 md:text-sm"
        >
          <span className="md:hidden">Rendez-vous</span>
          <span className="hidden md:inline">Prendre rendez-vous</span>
        </Link>

        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
          aria-controls="menu-site"
          className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/35 text-ink transition-colors hover:border-ink min-[360px]:ml-0 md:hidden"
        >
          <span className="sr-only">
            {ouvert ? "Fermer le menu" : "Ouvrir le menu"}
          </span>
          {ouvert ? <IconFermer /> : <IconMenu />}
        </button>
      </div>

      {/*
        Le menu ouvert occupe tout l'écran, sous la pastille qui reste en haut
        (elle porte le bouton de fermeture). Toujours dans le DOM, pour une
        fermeture en fondu ; `inert` le retire du clavier et des lecteurs
        d'écran tant qu'il est refermé.
      */}
      <div
        className={`fixed inset-0 z-0 overflow-y-auto bg-paper px-6 pt-[calc(var(--entete)+1.5rem)] pb-10 transition-opacity duration-200 md:hidden ${
          ouvert ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <nav
          id="menu-site"
          aria-label="Navigation du site"
          aria-hidden={!ouvert}
          inert={!ouvert}
          className="mx-auto flex max-w-md flex-col"
        >
          {[
            ...PAGES,
            { href: "/rendez-vous", label: "Prendre rendez-vous" },
          ].map((p) => (
            <Link
              key={p.href}
              href={p.href}
              aria-current={pathname === p.href ? "page" : undefined}
              className={`border-b border-line py-4 font-display text-2xl tracking-tight last:border-b-0 ${
                pathname === p.href ? "text-accent-text" : ""
              } ${p.href === "/rendez-vous" ? "min-[360px]:hidden" : ""}`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
