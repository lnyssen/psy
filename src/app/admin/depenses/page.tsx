import Link from "next/link";
import { prisma } from "@/lib/db";
import { CabinetTag } from "@/components/tags";
import { cabinetsActifs } from "@/lib/cabinets";
import { enregistrerDepense, supprimerDepense } from "@/lib/actions";
import { euros, fmtDateCourte, partiesJour } from "@/lib/format";
import { IconChevronDroite, IconChevronGauche } from "@/components/icons";
import { DepensePhotoOCR } from "@/components/DepensePhotoOCR";

export const dynamic = "force-dynamic";

const champ =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted/60";
const libelleChamp = "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";

/** Le mois affiché, au format AAAA-MM. Par défaut, le mois en cours. */
function moisDeParam(v: string | undefined) {
  if (v && /^\d{4}-\d{2}$/.test(v)) return v;
  const { annee, mois } = partiesJour(new Date());
  return `${annee}-${String(mois).padStart(2, "0")}`;
}

function decalerMois(iso: string, n: number) {
  const [a, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MOIS_LABEL = new Intl.DateTimeFormat("fr-BE", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Dépenses professionnelles, reçu photographié à l'appui.
 *
 * Symétrique de Facturation : là on encaisse ce que les patients doivent, ici
 * on consigne ce que la pratique dépense — loyer, assurance, formation,
 * matériel — avec la preuve jointe plutôt qu'un tas de papier à reconstituer
 * en fin d'année pour la comptable.
 */
export default async function Depenses({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const { mois: moisParam } = await searchParams;
  const mois = moisDeParam(moisParam);
  const [annee, m] = mois.split("-").map(Number);
  const debut = new Date(Date.UTC(annee, m - 1, 1));
  const fin = new Date(Date.UTC(annee, m, 1));

  const [depenses, cabinets, categories] = await Promise.all([
    prisma.depense.findMany({
      where: { date: { gte: debut, lt: fin } },
      include: { cabinet: true, categorie: true },
      orderBy: { date: "desc" },
    }),
    cabinetsActifs(),
    prisma.categorieDepense.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }),
  ]);

  const total = depenses.reduce((n, d) => n + d.amountCents, 0);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Dépenses</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Photographiez le reçu au comptoir plutôt que de le garder pour plus tard : la preuve part
          avec la dépense, et le mois se donne d’un bloc à la comptable.
        </p>
      </header>

      <form
        action={enregistrerDepense}
        className="flex flex-col gap-3 rounded-[14px] border border-dashed border-line-strong bg-surface px-5 py-4"
      >
        <p className="text-sm font-semibold">Nouvelle dépense</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <span className={libelleChamp}>Date</span>
            <input
              name="date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={`mt-1 ${champ}`}
            />
          </label>
          <label className="lg:col-span-2">
            <span className={libelleChamp}>Libellé</span>
            <input name="libelle" required placeholder="Assurance RC pro" className={`mt-1 ${champ}`} />
          </label>
          <label className="w-32">
            <span className={libelleChamp}>Montant (€)</span>
            <input name="montant" type="number" step="0.01" min="0" required className={`mt-1 ${champ}`} />
          </label>
          <label>
            <span className={libelleChamp}>Catégorie</span>
            <select name="categorieId" required defaultValue="" className={`mt-1 ${champ}`}>
              <option value="" disabled>
                Choisir…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={libelleChamp}>Fournisseur</span>
            <input name="fournisseur" className={`mt-1 ${champ}`} />
          </label>
          <label>
            <span className={libelleChamp}>Lieu concerné</span>
            <select name="cabinetId" defaultValue="" className={`mt-1 ${champ}`}>
              <option value="">Commun aux deux</option>
              {cabinets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </label>
          <DepensePhotoOCR />
        </div>
        <button
          type="submit"
          className="self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          Enregistrer
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/depenses?mois=${decalerMois(mois, -1)}`}
            aria-label="Mois précédent"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            <IconChevronGauche />
          </Link>
          <Link
            href={`/admin/depenses?mois=${decalerMois(mois, 1)}`}
            aria-label="Mois suivant"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            <IconChevronDroite />
          </Link>
        </div>
        <h2 className="text-lg font-semibold tracking-tight capitalize" data-numeric>
          {MOIS_LABEL.format(debut)}
        </h2>
        <p className="text-sm text-ink-muted">
          Total du mois : <span className="font-mono text-base font-semibold text-ink" data-numeric>{euros(total)}</span>
        </p>
        <span className="ml-auto flex flex-wrap gap-2">
          <a
            href={`/api/export/comptable?annee=${annee}&mois=${m}`}
            className="rounded-full border border-line-strong px-3.5 py-1.5 text-xs font-medium transition-colors hover:border-accent hover:text-accent-text"
          >
            Export Excel
          </a>
          <a
            href={`/api/export/justificatifs?annee=${annee}&mois=${m}`}
            className="rounded-full border border-line-strong px-3.5 py-1.5 text-xs font-medium transition-colors hover:border-accent hover:text-accent-text"
          >
            Reçus en PDF
          </a>
        </span>
      </div>
      <p className="text-xs text-ink-muted">
        Le classeur reprend les recettes et les dépenses du mois ; le PDF rassemble les photos des
        reçus, pour donner les deux à la comptable d’un bloc.
      </p>

      {depenses.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-muted">
          Aucune dépense enregistrée ce mois-ci.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
          {depenses.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3.5 last:border-b-0"
            >
              <time className="w-24 shrink-0 font-mono text-xs" data-numeric>
                {fmtDateCourte.format(d.date)}
              </time>
              <span className="min-w-40 flex-1 text-sm">{d.libelle}</span>
              <span className="rounded-full bg-sunken px-2.5 py-0.5 text-[11px] font-medium text-ink-muted">
                {d.categorie.libelle}
              </span>
              {d.cabinet && <CabinetTag cabinet={d.cabinet} />}
              {d.fournisseur && (
                <span className="text-xs text-ink-muted">{d.fournisseur}</span>
              )}
              <span className="font-mono text-sm font-semibold" data-numeric>
                {euros(d.amountCents)}
              </span>
              {d.photoMime ? (
                <a
                  href={`/api/depense/${d.id}/photo`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:border-accent hover:text-accent-text"
                >
                  reçu
                </a>
              ) : (
                <span className="text-[11px] text-ink-muted">sans reçu</span>
              )}
              <form action={supprimerDepense}>
                <input type="hidden" name="id" value={d.id} />
                <button
                  type="submit"
                  className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-overdue hover:text-overdue"
                >
                  supprimer
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
