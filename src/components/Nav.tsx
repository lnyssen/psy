"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { verrouiller } from "@/lib/auth-actions";
import { Recherche } from "@/components/Recherche";
import { Theme } from "@/components/Theme";
import {
  IconCadenas,
  IconFacturation,
  IconJour,
  IconPatients,
  IconReglages,
  IconSemaine,
} from "@/components/icons";

const ENTREES = [
  { href: "/", label: "Aujourd’hui", Icone: IconJour },
  { href: "/semaine", label: "Semaine", Icone: IconSemaine },
  { href: "/patients", label: "Patients", Icone: IconPatients },
  { href: "/facturation", label: "Facturation", Icone: IconFacturation },
];

export function Nav({ theme }: { theme: "light" | "dark" }) {
  const pathname = usePathname();
  // Le raccourci déclenche le même formulaire que le bouton : verrouiller
  // détruit la session côté serveur, ce qu'un état local ne saurait faire.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "l" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        document.getElementById("verrouiller")?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // L'écran verrouillé ne montre rien d'autre que la signature : ni navigation,
  // ni recherche, ni bascule de thème. C'est l'écran que voit quelqu'un
  // d'autre.
  if (pathname === "/connexion") return null;

  return (
    <header className="sans-impression sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5 md:px-8">
        {/* Rangée du haut sur téléphone : signature à gauche, outils à droite.
            La navigation passe en dessous. Aucun défilement horizontal nulle
            part — les libellés s'effacent au profit des seules icônes quand la
            place manque, plutôt que de déborder. */}
        <Link href="/" className="flex shrink-0 flex-col">
          <span className="font-display text-[22px] leading-[1.15] font-bold tracking-tight">
            Amandine Monsel
          </span>
          <span className="mt-0.5 text-[11px] leading-[1.4] font-semibold tracking-[0.2em] text-accent-text uppercase">
            Amapsy&nbsp;SRL
          </span>
        </Link>

        <nav
          aria-label="Navigation principale"
          className="order-last flex w-full min-w-0 flex-1 gap-1 md:order-none md:w-auto"
        >
          {ENTREES.map(({ href, label, Icone }) => {
            const actif = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={actif ? "page" : undefined}
                title={label}
                className={`flex min-w-0 shrink items-center justify-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium transition-colors md:justify-start md:px-4 ${
                  actif
                    ? "bg-accent text-accent-contrast"
                    : "text-ink-muted hover:bg-accent-soft hover:text-accent-text"
                }`}
              >
                <Icone className="shrink-0" />
                <span className="hidden truncate lg:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Recherche />

          <Link
            href="/reglages"
            aria-current={pathname.startsWith("/reglages") ? "page" : undefined}
            title="Réglages"
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
              pathname.startsWith("/reglages")
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
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
            >
              <span className="sr-only">Verrouiller l’écran</span>
              <IconCadenas />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
