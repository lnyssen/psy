"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { verrouiller } from "@/lib/auth-actions";
import { ENTREES, estActif } from "@/components/entrees";
import { Recherche } from "@/components/Recherche";
import { Theme } from "@/components/Theme";
import { IconCadenas, IconFermer, IconMenu, IconReglages } from "@/components/icons";

/**
 * Barre de l'outil sur téléphone, en dessous de 900 px.
 *
 * Fond opaque et sans flou d'arrière-plan, contrairement au site public. Ici on
 * fait défiler des tables longues sous une barre collante : un fond translucide
 * laissait lire le texte de la page au travers, et le flou d'arrière-plan sur
 * un élément collant est en prime ce qui fait décrocher la barre pendant
 * l'inertie du défilement sur iOS. L'effet de verre a sa place sur une bannière
 * qu'on regarde ; pas sur un outil qu'on parcourt.
 *
 * Au-dessus, c'est la barre latérale qui prend le relais : une colonne fixe n'a
 * pas sa place sur la largeur d'un téléphone, où elle mangerait le tiers de
 * l'écran ou se réduirait à un rail qu'on viserait mal au pouce. Tout passe donc
 * derrière un bouton, comme avant.
 */
export function Nav({
  theme,
  demandesEnAttente,
}: {
  theme: "light" | "dark";
  demandesEnAttente: number;
}) {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);

  // Le panneau se referme dès qu'on a navigué : le laisser ouvert masquerait la
  // page qu'on vient d'atteindre. L'ajustement se fait pendant le rendu et non
  // dans un effet, qui provoquerait un rendu en cascade. Pas de retour à la
  // position précédente ici — on arrive sur une autre page, elle commence en
  // haut.
  const [cheminAffiche, setCheminAffiche] = useState(pathname);
  if (cheminAffiche !== pathname) {
    setCheminAffiche(pathname);
    setOuvert(false);
  }

  // Le défilement de la page est retenu par le voile lui-même — touch-action —
  // et non par un overflow:hidden posé sur body. Celui-ci fait du corps de page
  // un conteneur de défilement, ce qui décroche les éléments collants : la
  // barre quittait le haut de l'écran et se retrouvait au milieu, menu ouvert.
  // Le voile couvre tout ce qui n'est pas la barre, et le panneau gère son
  // propre débordement : rien d'autre ne peut être tiré.
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ouvert]);

  return (
    <header className="sans-impression sticky top-0 z-40 border-b border-line bg-paper md:hidden">
      <div className="relative z-20 flex items-center gap-x-4 bg-paper px-5 py-2.5">
        <Link href="/admin" className="flex shrink-0 flex-col">
          <span className="font-display text-[20px] leading-[1.15] tracking-tight">
            Amandine Monsel
          </span>
          <span className="mt-0.5 text-[10px] leading-[1.4] font-semibold tracking-[0.2em] text-accent-text uppercase">
            Amapsy&nbsp;SRL
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
          aria-controls="menu-mobile"
          className="relative ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-contour-nav text-contour-nav transition-colors hover:border-accent hover:text-accent-text"
        >
          <span className="sr-only">{ouvert ? "Fermer le menu" : "Ouvrir le menu"}</span>
          {ouvert ? <IconFermer /> : <IconMenu />}
          {/* Le compteur remonte sur le bouton fermé : sans lui, une demande en
              attente resterait invisible tant que le menu n'est pas ouvert. */}
          {!ouvert && demandesEnAttente > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-overdue px-1 text-[10px] font-bold text-white"
            >
              {demandesEnAttente}
            </span>
          )}
          {demandesEnAttente > 0 && (
            <span className="sr-only">
              — {demandesEnAttente} demande{demandesEnAttente > 1 ? "s" : ""} en attente
            </span>
          )}
        </button>
      </div>

      {/*
        Le panneau est posé en absolu sous la barre, et non ajouté à sa
        hauteur : autrement il allongeait l'en-tête et repoussait la page vers
        le bas. Le voile sombre en dessous ferme le menu au toucher et sépare
        nettement ce qui est actif de ce qui ne l'est plus.
      */}
      {ouvert && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOuvert(false)}
            className="fixed inset-0 z-0 touch-none bg-nuit/35"
          />
          <div
            id="menu-mobile"
            className="absolute inset-x-0 top-full z-10 max-h-[80svh] overflow-y-auto overscroll-contain border-t border-line bg-paper px-5 py-4 shadow-[0_24px_48px_-24px_rgba(27,20,100,0.45)]"
          >
          <Recherche />
          <nav aria-label="Navigation principale" className="mt-4 flex flex-col gap-1">
            {ENTREES.map(({ href, label, Icone }) => {
              const actif = estActif(href, pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={actif ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-colors ${
                    actif
                      ? "bg-accent text-accent-contrast"
                      : "text-ink-muted hover:bg-accent-soft hover:text-accent-text"
                  }`}
                >
                  <Icone className="shrink-0" />
                  {label}
                  {href === "/admin/demandes" && demandesEnAttente > 0 && (
                    <span
                      className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                        actif ? "bg-white/25 text-white" : "bg-overdue text-white"
                      }`}
                    >
                      {demandesEnAttente}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
            <Link
              href="/admin/reglages"
              aria-current={pathname.startsWith("/admin/reglages") ? "page" : undefined}
              title="Réglages"
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                pathname.startsWith("/admin/reglages")
                  ? "border-accent bg-accent text-accent-contrast"
                  : "border-contour-nav text-contour-nav hover:border-accent hover:text-accent-text"
              }`}
            >
              <span className="sr-only">Réglages</span>
              <IconReglages />
            </Link>

            <Theme initial={theme} />

            <form action={verrouiller}>
              <button
                type="submit"
                title="Verrouiller l’écran"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-contour-nav text-contour-nav transition-colors hover:border-accent hover:text-accent-text"
              >
                <span className="sr-only">Verrouiller l’écran</span>
                <IconCadenas />
              </button>
            </form>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
