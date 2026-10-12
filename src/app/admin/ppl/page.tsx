import Link from "next/link";
import {
  bornesTrimestre,
  suiviPpl,
  trimestreCourant,
} from "@/lib/ppl-trimestre";
import { euros, fmtJourMoisAn } from "@/lib/format";

export const dynamic = "force-dynamic";

const NOMS = [
  "",
  "1er trimestre",
  "2e trimestre",
  "3e trimestre",
  "4e trimestre",
];

/**
 * Suivi trimestriel de la psychologie de première ligne : ce qui a été fait ce
 * trimestre, ce que l'INAMI doit verser, ce qui est déjà arrivé, et ce qui
 * dépasse le plafond et ne sera pas remboursé. Un export CSV donne la liste
 * séance par séance, pour la déclaration.
 */
export default async function SuiviPpl({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; t?: string }>;
}) {
  const { annee: a, t: tt } = await searchParams;
  const courant = trimestreCourant();
  const annee =
    Number(a) >= 2024 && Number(a) <= 2100 ? Number(a) : courant.annee;
  const t = [1, 2, 3, 4].includes(Number(tt)) ? Number(tt) : courant.trimestre;
  const suivi = await suiviPpl(annee, t);
  const { debut, fin } = bornesTrimestre(annee, t);
  const precedent = t === 1 ? { annee: annee - 1, t: 4 } : { annee, t: t - 1 };
  const suivant = t === 4 ? { annee: annee + 1, t: 1 } : { annee, t: t + 1 };
  const lien = (x: { annee: number; t: number }) =>
    `/admin/ppl?annee=${x.annee}&t=${x.t}`;
  const tot = suivi.totaux;

  const cartes = [
    { t: "Séances", v: String(tot.seances) },
    { t: "À verser par l’INAMI", v: euros(tot.recuCents + tot.aRecevoirCents) },
    { t: "Déjà reçu", v: euros(tot.recuCents) },
    {
      t: "À recevoir",
      v: tot.aRecevoirCents > 0 ? euros(tot.aRecevoirCents) : "—",
      alerte: tot.aRecevoirCents > 0,
    },
    ...(tot.horsQuota > 0
      ? [
          {
            t: "Hors plafond (non remboursées)",
            v: String(tot.horsQuota),
            alerte: true,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/finance"
        className="text-sm text-ink-muted transition-colors hover:text-accent-text"
      >
        ← Finance
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">
            Première ligne — suivi trimestriel
          </h1>
          <p className="mt-2 text-sm text-ink-muted" data-numeric>
            {NOMS[t]} {annee} · du {fmtJourMoisAn.format(debut)} au{" "}
            {fmtJourMoisAn.format(new Date(fin.getTime() - 1))}
          </p>
        </div>
        <nav aria-label="Trimestre" className="flex items-center gap-2">
          <Link
            href={lien(precedent)}
            className="rounded-full border border-line-strong px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text"
          >
            ← {NOMS[precedent.t]} {precedent.annee}
          </Link>
          <Link
            href={lien(suivant)}
            className="rounded-full border border-line-strong px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text"
          >
            {NOMS[suivant.t]} {suivant.annee} →
          </Link>
        </nav>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cartes.map((c) => (
          <div
            key={c.t}
            className="rounded-[14px] border border-line bg-surface px-5 py-4"
          >
            <dt className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
              {c.t}
            </dt>
            <dd
              className={`mt-1.5 font-mono text-xl font-semibold ${c.alerte ? "text-due" : ""}`}
              data-numeric
            >
              {c.v}
            </dd>
          </div>
        ))}
      </dl>

      {suivi.lignes.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-muted">
          Aucune séance conventionnée honorée ce trimestre.
        </p>
      ) : (
        <>
          <div
            className="overflow-x-auto rounded-[14px] border border-line bg-surface"
            tabIndex={0}
            role="region"
            aria-label="Suivi trimestriel (tableau défilant)"
          >
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-sunken text-[11px] tracking-[0.1em] text-ink-muted uppercase">
                  <th
                    scope="col"
                    className="px-5 py-2.5 text-left font-semibold"
                  >
                    Patient
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left font-semibold"
                  >
                    Convention
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right font-semibold"
                  >
                    Séances
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right font-semibold"
                  >
                    Plafond (12 mois)
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right font-semibold"
                  >
                    À verser
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right font-semibold"
                  >
                    Reçu
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right font-semibold"
                  >
                    À recevoir
                  </th>
                </tr>
              </thead>
              <tbody>
                {suivi.lignes.map((l) => (
                  <tr
                    key={l.patientId}
                    className="border-b border-line last:border-b-0"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/patients/${l.patientId}`}
                        className="font-medium hover:text-accent-text"
                      >
                        {l.nom}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-muted">
                      {l.type}, {l.reseau}
                    </td>
                    <td className="px-3 py-3 text-right font-mono" data-numeric>
                      {l.seances}
                      {l.horsQuota > 0 && (
                        <span className="text-due">
                          {" "}
                          ({l.horsQuota} hors plafond)
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-mono ${l.utilisees12Mois >= l.plafond ? "text-due" : ""}`}
                      data-numeric
                    >
                      {l.utilisees12Mois} / {l.plafond}
                    </td>
                    <td className="px-3 py-3 text-right font-mono" data-numeric>
                      {euros(l.recuCents + l.aRecevoirCents)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono" data-numeric>
                      {l.recuCents > 0 ? euros(l.recuCents) : "—"}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-mono ${l.aRecevoirCents > 0 ? "text-due" : ""}`}
                      data-numeric
                    >
                      {l.aRecevoirCents > 0 ? euros(l.aRecevoirCents) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <a
              href={`/api/export/ppl?annee=${annee}&t=${t}`}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              Exporter le trimestre (CSV)
            </a>
            <p className="max-w-xl text-xs text-ink-muted">
              Une ligne par séance : patient, numéro national, date, lieu,
              durée, montant, reçu ou non, hors plafond ou non. Les séances à
              recevoir se marquent « reçues » dans Facturation.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
