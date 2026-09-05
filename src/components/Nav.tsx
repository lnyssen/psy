"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { verrouiller } from "@/lib/auth-actions";
import { Recherche } from "@/components/Recherche";
import { Theme } from "@/components/Theme";
import {
  IconCadenas,
  IconDemandes,
  IconFacturation,
  IconFermer,
  IconJour,
  IconMenu,
  IconPatients,
  IconReglages,
  IconSemaine,
} from "@/components/icons";

const ENTREES = [
  { href: "/admin", label: "Aujourd’hui", Icone: IconJour },
  { href: "/admin/semaine", label: "Semaine", Icone: IconSemaine },
  { href: "/admin/patients", label: "Patients", Icone: IconPatients },
  { href: "/admin/facturation", label: "Facturation", Icone: IconFacturation },
  { href: "/admin/demandes", label: "Demandes", Icone: IconDemandes },
];

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
  // dans un effet, qui provoquerait un rendu en cascade.
  const [cheminAffiche, setCheminAffiche] = useState(pathname);
  if (cheminAffiche !== pathname) {
    setCheminAffiche(pathname);
    setOuvert(false);
  }

  // Le raccourci déclenche le même formulaire que le bouton : verrouiller
  // détruit la session côté serveur, ce qu'un état local ne saurait faire.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "l" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        document.getElementById("verrouiller")?.click();
      }
      if (e.key === "Escape") setOuvert(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (pathname === "/connexion") return null;

  const estActif = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <header className="sans-impression sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-x-4 px-5 py-2.5 md:px-8">
        <Link href="/admin" className="flex shrink-0 flex-col">
          <span className="font-display text-[20px] leading-[1.15] tracking-tight md:text-[22px]">
            Amandine Monsel
          </span>
          <span className="mt-0.5 text-[10px] leading-[1.4] font-semibold tracking-[0.2em] text-accent-text uppercase md:text-[11px]">
            Amapsy&nbsp;SRL
          </span>
        </Link>

        {/* Au-dessus de 900 px : tout tient sur une ligne. En dessous, tout se
            replie derrière un bouton — la version précédente entassait sept
            cibles sur la largeur d'un téléphone et les débordait à droite. */}
        <nav aria-label="Navigation principale" className="hidden flex-1 gap-1 md:flex">
          {ENTREES.map(({ href, label, Icone }) => (
            <Link
              key={href}
              href={href}
              aria-current={estActif(href) ? "page" : undefined}
              title={label}
              className={`flex shrink-0 items-center justify-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors xl:px-4 ${
                estActif(href)
                  ? "bg-accent text-accent-contrast"
                  : "text-ink-muted hover:bg-accent-soft hover:text-accent-text"
              }`}
            >
              <span className="relative shrink-0">
                <Icone />
                {href === "/admin/demandes" && demandesEnAttente > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-overdue px-1 text-[9px] font-bold text-white"
                  >
                    {demandesEnAttente}
                  </span>
                )}
              </span>
              {/* Le libellé n'apparaît qu'à partir de 1280 px. En dessous, cinq
                  entrées plus la recherche et trois outils ne tiennent pas, et
                  un libellé coupé en deux vaut moins qu'une icône seule. */}
              <span className="hidden xl:inline">{label}</span>
              {href === "/admin/demandes" && demandesEnAttente > 0 && (
                <span className="sr-only">
                  {demandesEnAttente} demande{demandesEnAttente > 1 ? "s" : ""} en attente
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <Recherche />
          <Outils theme={theme} pathname={pathname} />
        </div>

        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
          aria-controls="menu-mobile"
          className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text md:hidden"
        >
          <span className="sr-only">{ouvert ? "Fermer le menu" : "Ouvrir le menu"}</span>
          {ouvert ? <IconFermer /> : <IconMenu />}
        </button>
      </div>

      {ouvert && (
        <div id="menu-mobile" className="border-t border-line bg-paper px-5 py-4 md:hidden">
          <Recherche />
          <nav aria-label="Navigation principale" className="mt-4 flex flex-col gap-1">
            {ENTREES.map(({ href, label, Icone }) => (
              <Link
                key={href}
                href={href}
                aria-current={estActif(href) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-colors ${
                  estActif(href)
                    ? "bg-accent text-accent-contrast"
                    : "text-ink-muted hover:bg-accent-soft hover:text-accent-text"
                }`}
              >
                <Icone className="shrink-0" />
                {label}
                {href === "/admin/demandes" && demandesEnAttente > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-overdue px-1.5 text-[11px] font-bold text-white">
                    {demandesEnAttente}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
            <Outils theme={theme} pathname={pathname} />
          </div>
        </div>
      )}
    </header>
  );
}

/** Réglages, thème et verrouillage : les mêmes trois outils dans la barre sur
 *  écran large et dans le panneau sur téléphone. */
function Outils({ theme, pathname }: { theme: "light" | "dark"; pathname: string }) {
  const actif = pathname.startsWith("/admin/reglages");
  return (
    <>
      <Link
        href="/admin/reglages"
        aria-current={actif ? "page" : undefined}
        title="Réglages"
        className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors md:h-9 md:w-9 ${
          actif
            ? "border-accent bg-accent text-accent-contrast"
            : "border-line-strong text-ink-muted hover:border-accent hover:text-accent-text"
        }`}
      >
        <span className="sr-only">Réglages</span>
        <IconReglages />
      </Link>

      <Theme initial={theme} />

      <form action={verrouiller}>
        <button
          id="verrouiller"
          type="submit"
          title="Verrouiller l’écran (⌘⇧L)"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text md:h-9 md:w-9"
        >
          <span className="sr-only">Verrouiller l’écran</span>
          <IconCadenas />
        </button>
      </form>
    </>
  );
}
