import Link from "next/link";
import { prisma } from "@/lib/db";
import { CabinetTag, EtatPaiement, RegimeTag } from "@/components/tags";
import { euros, fmtDateCourte, initiales, isBillable } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Facturation() {
  const seances = await prisma.session.findMany({
    orderBy: { startsAt: "desc" },
    include: { patient: true },
  });
  const facturables = seances.filter((s) => isBillable(s.status));

  const somme = (f: (typeof facturables)[number][]) =>
    f.reduce((n, s) => n + (s.amountCents ?? 0), 0);
  const du = facturables.filter((s) => s.paymentStatus === "DUE");
  const retard = facturables.filter((s) => s.paymentStatus === "OVERDUE");
  const paye = facturables.filter((s) => s.paymentStatus === "PAID");

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Facturation</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {facturables.length} séances facturables. Les annulations à temps et les séances à
            venir n’y figurent pas.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          Marquer payé
        </button>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { t: "Encaissé", v: euros(somme(paye)) },
          { t: "Dû", v: euros(somme(du)), ton: "text-due" },
          { t: "En retard", v: euros(somme(retard)), ton: "text-overdue" },
          { t: "Conventionné", v: `${facturables.filter((s) => s.patient.scheme === "CONVENTIONNE").length} séances` },
        ].map((c) => (
          <div key={c.t} className="rounded-[14px] border border-line bg-surface px-5 py-4">
            <dt className="text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
              {c.t}
            </dt>
            <dd className={`mt-1.5 font-display text-2xl ${c.ton ?? ""}`} data-numeric>
              {c.v}
            </dd>
          </div>
        ))}
      </dl>

      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Séances facturables, de la plus récente à la plus ancienne</caption>
          <thead>
            <tr className="border-b border-line bg-sunken text-left text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <th scope="col" className="px-5 py-2.5 font-semibold">Date</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Patient</th>
              <th scope="col" className="hidden px-3 py-2.5 font-semibold sm:table-cell">Cabinet</th>
              <th scope="col" className="hidden px-3 py-2.5 font-semibold sm:table-cell">Régime</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Montant</th>
              <th scope="col" className="px-5 py-2.5 text-right font-semibold">Paiement</th>
            </tr>
          </thead>
          <tbody>
            {facturables.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-b-0">
                <td className="px-5 py-3 whitespace-nowrap" data-numeric>
                  {fmtDateCourte.format(s.startsAt)}
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/patients/${s.patientId}`}
                    className="transition-colors hover:text-accent"
                  >
                    {initiales(s.patient.firstName, s.patient.lastName)}
                  </Link>
                </td>
                <td className="hidden px-3 py-3 sm:table-cell">
                  <CabinetTag office={s.office} />
                </td>
                <td className="hidden px-3 py-3 sm:table-cell">
                  <RegimeTag scheme={s.patient.scheme} />
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap" data-numeric>
                  {euros(s.amountCents)}
                </td>
                <td className="px-5 py-3 text-right">
                  <EtatPaiement status={s.status} payment={s.paymentStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-muted">
        Les séances conventionnées n’affichent pas de montant : le circuit de facturation au
        réseau reste à établir avec l’utilisatrice.
      </p>
    </div>
  );
}
