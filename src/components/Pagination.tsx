import Link from "next/link";
import { avecParam, type Params } from "@/components/filtres";

/** Choix de taille de page, en dur : trois valeurs suffisent, une liste
 *  libre n'apporterait rien qu'un menu déroulant coûterait à construire. */
export const TAILLES_PAGE = [25, 50, 100] as const;

export function tailleDePage(params: Params, defaut: (typeof TAILLES_PAGE)[number] = 25) {
  const n = Number(params.taille);
  return (TAILLES_PAGE as readonly number[]).includes(n) ? n : defaut;
}

export function pageDe(params: Params) {
  const n = Number(params.page);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/**
 * Pagination par l'URL, comme les filtres et les tris : la page est
 * partageable, le retour arrière fonctionne, rien ne dépend de JavaScript.
 *
 * Change la taille de page en revenant à la page 1 — sans quoi passer de 25 à
 * 100 depuis la page 3 pourrait afficher une tranche qui n'existe plus.
 */
export function Pagination({
  base,
  params,
  total,
  taille,
}: {
  base: string;
  params: Params;
  total: number;
  taille: number;
}) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / taille));
  const page = Math.min(pageDe(params), totalPages);

  const hrefPage = (p: number) => avecParam(base, params, "page", p > 1 ? String(p) : undefined);
  const hrefTaille = (t: number) =>
    avecParam(base, { ...params, page: undefined }, "taille", t === 25 ? undefined : String(t));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
      <span data-numeric>
        {total} résultat{total > 1 ? "s" : ""}
      </span>
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex items-center gap-1.5">
          par page
          {TAILLES_PAGE.map((t) => (
            <Link
              key={t}
              href={hrefTaille(t)}
              aria-current={t === taille ? "true" : undefined}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                t === taille
                  ? "border-accent bg-accent text-accent-contrast"
                  : "border-line-strong hover:border-accent hover:text-accent-text"
              }`}
            >
              {t}
            </Link>
          ))}
        </span>
        {totalPages > 1 && (
          <span className="flex items-center gap-2" data-numeric>
            <Link
              href={hrefPage(Math.max(1, page - 1))}
              aria-label="Page précédente"
              className={`flex h-7 w-7 items-center justify-center rounded-full border border-line-strong transition-colors hover:border-accent hover:text-accent-text ${
                page <= 1 ? "pointer-events-none opacity-30" : ""
              }`}
            >
              ‹
            </Link>
            Page {page} / {totalPages}
            <Link
              href={hrefPage(Math.min(totalPages, page + 1))}
              aria-label="Page suivante"
              className={`flex h-7 w-7 items-center justify-center rounded-full border border-line-strong transition-colors hover:border-accent hover:text-accent-text ${
                page >= totalPages ? "pointer-events-none opacity-30" : ""
              }`}
            >
              ›
            </Link>
          </span>
        )}
      </div>
    </div>
  );
}
