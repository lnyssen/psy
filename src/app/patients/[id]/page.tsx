import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CabinetTag, EtatPaiement, RegimeTag, StatutSeance } from "@/components/tags";
import { euros, fmtDateCourte, fmtHeure, isBillable, initiales } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FichePatient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: { sessions: { orderBy: { startsAt: "desc" } } },
  });
  if (!patient) notFound();

  const facturables = patient.sessions.filter((s) => isBillable(s.status));
  const du = facturables
    .filter((s) => s.paymentStatus !== "PAID")
    .reduce((n, s) => n + (s.amountCents ?? 0), 0);
  const encaisse = facturables
    .filter((s) => s.paymentStatus === "PAID")
    .reduce((n, s) => n + (s.amountCents ?? 0), 0);

  return (
    <div className="flex flex-col gap-8">
      <Link href="/patients" className="text-sm text-ink-muted transition-colors hover:text-accent">
        ← Tous les patients
      </Link>

      <header className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
          {initiales(patient.firstName, patient.lastName)}
        </span>
        <div className="flex-1">
          <h1 className="font-display text-3xl tracking-tight">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <RegimeTag scheme={patient.scheme} />
            {patient.usualOffice && <CabinetTag office={patient.usualOffice} />}
            {patient.feeCents && (
              <span className="text-sm text-ink-muted" data-numeric>
                {euros(patient.feeCents)} la séance
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          Nouvelle séance
        </button>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { t: "Séances", v: String(patient.sessions.length) },
          { t: "Encaissé", v: euros(encaisse) },
          { t: "Dû", v: du > 0 ? euros(du) : "—", alerte: du > 0 },
        ].map((c) => (
          <div key={c.t} className="rounded-[14px] border border-line bg-surface px-5 py-4">
            <dt className="text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
              {c.t}
            </dt>
            <dd
              className={`mt-1.5 font-display text-2xl ${c.alerte ? "text-due" : ""}`}
              data-numeric
            >
              {c.v}
            </dd>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Historique</h2>
        {patient.sessions.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-muted">
            Aucune séance enregistrée pour ce dossier.
          </p>
        ) : (
          <ol className="overflow-hidden rounded-[14px] border border-line bg-surface">
            {patient.sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-5 py-3.5 last:border-b-0"
              >
                <time className="w-32 shrink-0 text-sm" data-numeric>
                  {fmtDateCourte.format(s.startsAt)} · {fmtHeure.format(s.startsAt)}
                </time>
                <CabinetTag office={s.office} />
                <span className="flex-1">
                  <StatutSeance status={s.status} />
                </span>
                {isBillable(s.status) && (
                  <span className="text-sm" data-numeric>
                    {euros(s.amountCents)}
                  </span>
                )}
                <EtatPaiement status={s.status} payment={s.paymentStatus} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
