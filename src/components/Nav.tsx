"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const positionAvant = useRef(0);
  const aRestaurer = useRef<number | null>(null);

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

  /**
   * Ouvrir remonte d'abord la page.
   *
   * Sans ça, le panneau ne fait pas descendre le contenu : une barre collante
   * garde sa place dans le flux tout en haut du document, si bien qu'une fois
   * la page défilée elle est peinte ailleurs qu'elle n'occupe, et les quatre
   * cent cinquante pixels du panneau se posent par-dessus ce qui passe dessous.
   * Mesuré : en haut de page, « main » descendait de 65 à 513 ; défilée, il ne
   * bougeait pas d'un pixel.
   *
   * Remonter d'abord remet la barre à sa place réelle, et le panneau pousse
   * alors le contenu pour de bon. La position est mémorisée et rendue à la
   * fermeture : ouvrir un menu puis se raviser ne doit pas coûter l'endroit où
   * l'on était.
   */
  function ouvrir() {
    positionAvant.current = window.scrollY;
    window.scrollTo({ top: 0, behavior: "instant" });
    setOuvert(true);
  }

  function fermer() {
    aRestaurer.current = positionAvant.current;
    setOuvert(false);
  }

  // La position se rend après le commit, pas dans le gestionnaire de clic.
  // Restaurée trop tôt, elle est écrasée par l'ancrage de défilement du
  // navigateur, qui corrige le défilement au moment où le panneau quitte le
  // document et le raccourcit de quatre cent cinquante pixels. Mesuré : on
  // revenait à 53 au lieu de 500.
  useEffect(() => {
    if (!ouvert && aRestaurer.current !== null) {
      window.scrollTo({ top: aRestaurer.current, behavior: "instant" });
      aRestaurer.current = null;
    }
  }, [ouvert]);

  // L'écoute n'existe que pendant que le panneau est ouvert : hors de là,
  // Échap n'a rien à fermer et ferait sauter la page à une position mémorisée
  // qui ne veut plus rien dire.
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        aRestaurer.current = positionAvant.current;
        setOuvert(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ouvert]);

  return (
    <header className="sans-impression sticky top-0 z-40 border-b border-line bg-paper md:hidden">
      <div className="flex items-center gap-x-4 px-5 py-2.5">
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
          onClick={() => (ouvert ? fermer() : ouvrir())}
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

      {ouvert && (
        <div id="menu-mobile" className="border-t border-line bg-paper px-5 py-4">
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
      )}
    </header>
  );
}
