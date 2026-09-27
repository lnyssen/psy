import Link from "next/link";
import { prisma } from "@/lib/db";
import { marquerMoisEtabli } from "@/lib/actions";
import { adresseCabinet, euros, formatDuree, partiesJour } from "@/lib/format";
import { heuresFacturablesSemaine } from "@/lib/quotas";
import { IconChevronDroite, IconChevronGauche } from "@/components/icons";

export const dynamic = "force-dynamic";

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
 * Facturation à un établissement — l'école, aujourd'hui la seule.
 *
 * Elle ne se facture pas comme un patient : ce n'est pas un acte payé par
 * séance, mais un relevé mensuel d'heures à un tarif convenu. Cette page ne
 * reprend donc pas Facturation, elle en est le pendant côté institution.
 */
export default async function Etablissements({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const { mois: moisParam } = await searchParams;
  const mois = moisDeParam(moisParam);
  const [annee, m] = mois.split("-").map(Number);
  const debut = new Date(Date.UTC(annee, m - 1, 1));
  const fin = new Date(Date.UTC(annee, m, 1));

  const cabinets = await prisma.cabinet.findMany({
    where: { factureInstitution: true },
    orderBy: { ordre: "asc" },
  });

  const lignes = await Promise.all(
    cabinets.map(async (c) => {
      const seances = await prisma.session.findMany({
        where: {
          cabinetId: c.id,
          startsAt: { gte: debut, lt: fin },
          status: { in: ["ATTENDED", "NO_SHOW"] },
        },
        select: { durationMin: true, status: true, paymentStatus: true },
      });
      const heures = heuresFacturablesSemaine(seances);
      const montant = c.tarifHoraireCents ? Math.round(heures * c.tarifHoraireCents) : null;
      const encaisse = seances.length > 0 && seances.every((s) => s.paymentStatus === "PAID");
      return { cabinet: c, heures, montant, nb: seances.length, encaisse };
    }),
  );

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Établissements</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Ce que doit un établissement pour un mois de vacations, hors TVA — les prestations de
          psychologue en sont exonérées (art. 44 du Code de la TVA).
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/etablissements?mois=${decalerMois(mois, -1)}`}
            aria-label="Mois précédent"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            <IconChevronGauche />
          </Link>
          <Link
            href={`/admin/etablissements?mois=${decalerMois(mois, 1)}`}
            aria-label="Mois suivant"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            <IconChevronDroite />
          </Link>
        </div>
        <h2 className="text-lg font-semibold tracking-tight capitalize" data-numeric>
          {MOIS_LABEL.format(debut)}
        </h2>
      </div>

      {cabinets.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-muted">
          Aucun lieu n’est réglé « facturé à l’heure à un établissement ». Réglez-le depuis
          Réglages → Lieux.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {lignes.map(({ cabinet: c, heures, montant, nb, encaisse }) => (
            <li key={c.id} className="rounded-[14px] border border-line bg-surface px-5 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{c.nom}</p>
                  <p className="text-xs text-ink-muted">{adresseCabinet(c)}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
                      Heures
                    </p>
                    <p className="font-mono text-lg font-semibold" data-numeric>
                      {formatDuree(heures)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
                      Montant
                    </p>
                    <p className="font-mono text-lg font-semibold text-accent-text" data-numeric>
                      {montant !== null ? euros(montant) : "tarif horaire non réglé"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <span className="text-xs text-ink-muted" data-numeric>
                  {nb} acte{nb > 1 ? "s" : ""} facturable{nb > 1 ? "s" : ""}
                </span>
                {nb > 0 && (
                  <a
                    href={`/api/facture-etablissement/${c.id}?annee=${annee}&mois=${m}`}
                    className="rounded-full border border-line-strong px-4 py-1.5 text-xs font-medium transition-colors hover:border-accent hover:text-accent-text"
                  >
                    Télécharger la facture PDF
                  </a>
                )}
                {nb > 0 && !encaisse && (
                  <form action={marquerMoisEtabli.bind(null, c.id, annee, m)}>
                    <button
                      type="submit"
                      className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
                    >
                      Marquer le mois encaissé
                    </button>
                  </form>
                )}
                {nb > 0 && encaisse && (
                  <span className="rounded-full bg-paid-soft px-3 py-1 text-xs font-semibold text-paid">
                    Mois encaissé
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
