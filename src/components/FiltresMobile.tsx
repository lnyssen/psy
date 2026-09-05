"use client";

import { useRouter } from "next/navigation";
import type { Params } from "@/components/filtres";

export type GroupeMobile = {
  cle: string;
  libelle: string;
  /** Intitulé de l'option « aucun filtre », par exemple « Tous les cabinets ».
   *  Écrit en toutes lettres plutôt que « Cabinet : tout » : une fois une
   *  valeur choisie, la liste n'affiche plus que cette valeur, et c'est elle
   *  qui doit se suffire. */
  tout: string;
  options: { valeur: string; label: string; ton?: { colorHex: string } }[];
};

/**
 * Filtres sur téléphone.
 *
 * Trois groupes de pilules occupaient quatre lignes avant même le premier
 * résultat. Des listes déroulantes natives tiennent sur une, et le sélecteur du
 * système reste ce qu'un téléphone sait faire de mieux : liste plein écran,
 * défilement au pouce, aucune réimplémentation à maintenir.
 *
 * L'état continue de vivre dans l'URL, comme sur écran large : la vue reste
 * partageable et le retour arrière fonctionne.
 */
export function FiltresMobile({
  base,
  params,
  groupes,
}: {
  base: string;
  params: Params;
  groupes: GroupeMobile[];
}) {
  const router = useRouter();

  function changer(cle: string, valeur: string) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== cle) p.set(k, v);
    if (valeur) p.set(cle, valeur);
    const q = p.toString();
    router.push(q ? `${base}?${q}` : base);
  }

  const actifs = groupes.filter((g) => params[g.cle]).length;

  return (
    <div className="flex flex-col gap-2 md:hidden">
      <div className="flex flex-wrap gap-2">
        {groupes.map((g) => {
          const valeur = params[g.cle] ?? "";
          const choisi = g.options.find((o) => o.valeur === valeur);
          return (
            <span key={g.cle} className="relative min-w-[9.5rem] flex-1">
              <label htmlFor={`f-${g.cle}`} className="sr-only">
                {g.libelle}
              </label>
              <select
                id={`f-${g.cle}`}
                value={valeur}
                onChange={(e) => changer(g.cle, e.target.value)}
                style={
                  choisi?.ton
                    ? ({
                        "--cab": choisi.ton.colorHex,
                        borderColor: "var(--cab)",
                        color: "var(--cab)",
                      } as unknown as React.CSSProperties)
                    : undefined
                }
                className={`w-full appearance-none rounded-full border px-3.5 py-2.5 pr-8 text-[13px] font-medium ${
                  valeur && !choisi?.ton
                    ? "border-accent text-accent-text"
                    : valeur
                      ? ""
                      : "border-line-strong text-ink-muted"
                }`}
              >
                <option value="">{g.tout}</option>
                {g.options.map((o) => (
                  <option key={o.valeur} value={o.valeur}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path
                    d="m2.5 4.5 3.5 3.5 3.5-3.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </span>
          );
        })}
      </div>

      {actifs > 0 && (
        <button
          type="button"
          onClick={() => {
            const p = new URLSearchParams();
            for (const [k, v] of Object.entries(params)) {
              if (v && !groupes.some((g) => g.cle === k)) p.set(k, v);
            }
            const q = p.toString();
            router.push(q ? `${base}?${q}` : base);
          }}
          className="self-start text-xs font-medium text-accent-text"
        >
          Tout afficher
        </button>
      )}
    </div>
  );
}
