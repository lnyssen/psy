import Link from "next/link";
import { prisma } from "@/lib/db";
import { CabinetTag, RegimeTag } from "@/components/tags";
import { euros, initiales, isBillable } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Patients() {
  const patients = await prisma.patient.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { sessions: true },
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Patients</h1>
          <p className="mt-2 text-sm text-ink-muted">{patients.length} dossiers actifs.</p>
        </div>
        <button
          type="button"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          Nouveau patient
        </button>
      </header>

      {/* Liste, et non tableau : ici les noms complets sont admis, la page
          s'ouvre intentionnellement. Les vues d'ensemble, elles, restent aux
          initiales. */}
      <ul className="flex flex-col gap-3">
        {patients.map((p) => {
          const du = p.sessions
            .filter((s) => isBillable(s.status) && s.paymentStatus !== "PAID")
            .reduce((n, s) => n + (s.amountCents ?? 0), 0);
          return (
            <li key={p.id}>
              <Link
                href={`/patients/${p.id}`}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[14px] border border-line bg-surface px-5 py-4 transition-colors hover:border-accent"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                  {initiales(p.firstName, p.lastName)}
                </span>
                <span className="flex-1 text-base font-medium">
                  {p.firstName} {p.lastName}
                </span>
                <RegimeTag scheme={p.scheme} />
                {p.usualOffice && <CabinetTag office={p.usualOffice} />}
                <span className="w-24 text-right text-sm text-ink-muted" data-numeric>
                  {p.sessions.length} séance{p.sessions.length > 1 ? "s" : ""}
                </span>
                <span
                  className={`w-20 text-right text-sm font-semibold ${du > 0 ? "text-due" : "text-ink-muted"}`}
                  data-numeric
                >
                  {du > 0 ? euros(du) : "—"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
