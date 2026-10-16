import Link from "next/link";
import type { PointAcompleter } from "@/lib/configuration";

/**
 * Ce qu'il reste à régler dans l'installation, sur « Aujourd'hui ». Rien du tout
 * quand tout est en ordre. Replié tant que rien n'est urgent : un manque de
 * confort (un n° de visa) ne doit pas pousser la journée sous la ligne de
 * flottaison.
 */
export function ACompleter({ points }: { points: PointAcompleter[] }) {
  if (points.length === 0) return null;
  const urgent = points.some((p) => p.urgent);
  return (
    <details
      open={urgent}
      className={`sans-impression rounded-[14px] border bg-surface px-5 py-4 ${
        urgent ? "border-overdue/40" : "border-line"
      }`}
    >
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-2 text-sm font-semibold">
        <span className={urgent ? "text-overdue" : ""}>
          À compléter · {points.length} point{points.length > 1 ? "s" : ""}
        </span>
        {!urgent && (
          <span className="text-xs font-normal text-ink-muted">
            Réglages à finir pour que tout fonctionne
          </span>
        )}
      </summary>
      <ul className="mt-3 flex flex-col divide-y divide-line">
        {points.map((p) => (
          <li key={p.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5">
            <div className="min-w-56 flex-1">
              <p className={`text-sm font-medium ${p.urgent ? "text-overdue" : ""}`}>{p.titre}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{p.detail}</p>
            </div>
            <Link
              href={p.href}
              className="shrink-0 rounded-full border border-line-strong px-4 py-1.5 text-xs font-medium transition-colors hover:border-accent hover:text-accent-text"
            >
              Régler
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
