import Link from "next/link";
import { trouverDoublons } from "@/lib/doublons";
import { fusionnerPatients } from "@/lib/doublons-actions";
import { fmtDateCourte, nomComplet } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Doublons() {
  const groupes = await trouverDoublons();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/patients"
        className="text-sm text-ink-muted transition-colors hover:text-accent-text"
      >
        ← Tous les patients
      </Link>

      <header className="max-w-2xl">
        <h1 className="font-display text-3xl tracking-tight">
          Doublons possibles
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Des fiches qui ressemblent à une même personne : même nom, même numéro
          national, ou même téléphone. Deux personnes différentes peuvent porter
          le même nom : à vous de juger. Fusionner conserve la fiche choisie et
          lui rattache les séances, notes et documents des autres, puis supprime
          ces dernières.
        </p>
      </header>

      {groupes.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-muted">
          Aucun doublon détecté.
        </p>
      ) : (
        <ul className="flex flex-col gap-5">
          {groupes.map((g) => (
            <li
              key={g[0].id}
              className="rounded-[14px] border border-line bg-surface px-5 py-5"
            >
              <h2 className="text-sm font-semibold">
                {nomComplet(g[0])} · {g.length} fiches
              </h2>
              <ul className="mt-3 flex flex-col gap-3">
                {g.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[12px] bg-sunken px-4 py-3 text-sm"
                  >
                    <span className="min-w-44 flex-1">
                      <Link
                        href={`/admin/patients/${p.id}`}
                        className="font-medium hover:text-accent-text"
                      >
                        {nomComplet(p)}
                      </Link>
                      <span
                        className="mt-0.5 block text-xs text-ink-muted"
                        data-numeric
                      >
                        {[
                          p.phone,
                          p.email,
                          p.nationalNumber,
                          p.birthDate
                            ? fmtDateCourte.format(p.birthDate)
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "aucune coordonnée"}
                      </span>
                    </span>
                    <span className="text-xs text-ink-muted" data-numeric>
                      {p.seances} séance{p.seances > 1 ? "s" : ""}
                      {p.derniere
                        ? ` · dernière le ${fmtDateCourte.format(p.derniere)}`
                        : ""}
                    </span>
                    <form action={fusionnerPatients}>
                      <input type="hidden" name="garder" value={p.id} />
                      <input
                        type="hidden"
                        name="autres"
                        value={g
                          .filter((x) => x.id !== p.id)
                          .map((x) => x.id)
                          .join(",")}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-line-strong px-4 py-1.5 text-xs font-medium transition-colors hover:border-accent hover:text-accent-text"
                      >
                        Garder cette fiche
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
