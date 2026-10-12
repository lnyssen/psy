import Link from "next/link";
import { PAGES_DOC } from "@/lib/documentation";

export default function Documentation() {
  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl tracking-tight">Documentation</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Comment fonctionne chaque partie de l’outil, pas à pas, avec des
          captures d’écran. Les noms de boutons et de champs y sont en gras,
          tels qu’ils s’affichent à l’écran. Toutes les personnes montrées sur
          les captures sont fictives.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {PAGES_DOC.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/admin/documentation/${p.slug}`}
              className="flex h-full flex-col gap-2 rounded-[14px] border border-line bg-surface px-6 py-5 transition-colors hover:border-accent"
            >
              <span className="font-display text-xl">{p.titre}</span>
              <span className="text-sm text-ink-muted">{p.resume}</span>
              <span className="mt-1 text-xs text-ink-muted">
                {p.sections.map((s) => s.titre).join(" · ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
