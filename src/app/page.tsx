import Link from "next/link";
import { prisma } from "@/lib/db";
import { CabinetTag, EtatPaiement, RegimeTag, StatutSeance, AlerteTrajet } from "@/components/tags";
import {
  OFFICE_LABEL,
  conflitsDeTrajet,
  debutDeJour,
  euros,
  fmtHeure,
  fmtJourLong,
  initiales,
  isBillable,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Aujourdhui() {
  const debut = debutDeJour(new Date());
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 1);

  const seances = await prisma.session.findMany({
    where: { startsAt: { gte: debut, lt: fin } },
    orderBy: { startsAt: "asc" },
    include: { patient: true },
  });

  const conflits = conflitsDeTrajet(seances);
  const cabinets = [...new Set(seances.map((s) => s.office))];
  const aStatuer = seances.filter((s) => s.status === "SCHEDULED" && s.startsAt < new Date());

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight first-letter:uppercase">
            {fmtJourLong.format(debut)}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            {seances.length === 0
              ? "Aucune séance"
              : `${seances.length} séance${seances.length > 1 ? "s" : ""}`}
            {cabinets.map((c) => (
              <CabinetTag key={c} office={c} />
            ))}
          </p>
        </div>
        <Link
          href="/semaine"
          className="rounded-full border border-line-strong px-5 py-2.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
        >
          Voir la semaine
        </Link>
      </header>

      {aStatuer.length > 0 && (
        <p className="rounded-[14px] border border-line bg-surface px-5 py-4 text-sm">
          <span className="font-semibold">{aStatuer.length}</span> séance
          {aStatuer.length > 1 ? "s" : ""} passée{aStatuer.length > 1 ? "s" : ""} attend
          {aStatuer.length > 1 ? "ent" : ""} un statut.
        </p>
      )}

      {seances.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <p className="font-display text-xl">Journée libre</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            Aucune séance n’est prévue aujourd’hui, dans aucun des deux cabinets.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {seances.map((s, i) => (
            <li key={s.id}>
              <Link
                href={`/patients/${s.patientId}`}
                className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[14px] border border-line bg-surface px-5 py-4 transition-colors hover:border-accent"
              >
                <time
                  dateTime={s.startsAt.toISOString()}
                  className="w-14 shrink-0 text-base font-semibold"
                >
                  {fmtHeure.format(s.startsAt)}
                </time>
                <span className="w-14 shrink-0 text-base">
                  {initiales(s.patient.firstName, s.patient.lastName)}
                </span>
                <span className="flex flex-1 flex-wrap items-center gap-2">
                  <CabinetTag office={s.office} />
                  <RegimeTag scheme={s.patient.scheme} />
                  {conflits.has(i) && <AlerteTrajet />}
                </span>
                <span className="flex shrink-0 items-center gap-4">
                  <StatutSeance status={s.status} />
                  {isBillable(s.status) && (
                    <span className="text-sm" data-numeric>
                      {euros(s.amountCents)}
                    </span>
                  )}
                  <EtatPaiement status={s.status} payment={s.paymentStatus} />
                </span>
              </Link>
              {conflits.has(i) && (
                <p className="mt-1.5 pl-5 text-xs text-overdue">
                  Séance précédente à {OFFICE_LABEL[seances[i - 1].office]} : moins de trente
                  minutes pour rejoindre {OFFICE_LABEL[s.office]}.
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
