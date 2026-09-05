import Link from "next/link";
import { prisma } from "@/lib/db";
import { CabinetTag, EtatPaiement, RegimeTag } from "@/components/tags";
import { Encaisser } from "@/components/Encaisser";
import { EnTeteTri, GroupeFiltre, type Params } from "@/components/filtres";
import { euros, fmtDateCourte, isBillable, nomComplet } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Facturation({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;

  const toutes = await prisma.session.findMany({
    where: {
      ...(params.cabinet ? { office: params.cabinet as "UCCLE" | "AUDERGHEM" } : {}),
      ...(params.regime ? { patient: { scheme: params.regime as "CONVENTIONNE" | "PRIVE" } } : {}),
      ...(params.paiement
        ? { paymentStatus: params.paiement as "DUE" | "PAID" | "OVERDUE" }
        : {}),
    },
    include: { patient: true },
  });

  // Une séance à venir ou annulée à temps n'est pas un acte facturable : elle
  // n'a rien à faire dans cette table.
  const seances = toutes.filter((s) => isBillable(s.status));

  const sens = params.sens === "desc" ? -1 : 1;
  const comparateurs: Record<string, (a: (typeof seances)[number], b: (typeof seances)[number]) => number> = {
    date: (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
    patient: (a, b) => a.patient.lastName.localeCompare(b.patient.lastName, "fr"),
    cabinet: (a, b) => a.office.localeCompare(b.office),
    regime: (a, b) => a.patient.scheme.localeCompare(b.patient.scheme),
    montant: (a, b) => (a.amountCents ?? 0) - (b.amountCents ?? 0),
    paiement: (a, b) => a.paymentStatus.localeCompare(b.paymentStatus),
  };
  const tri = comparateurs[params.tri ?? "date"] ?? comparateurs.date;
  seances.sort((a, b) => tri(a, b) * (params.tri ? sens : -1));

  const somme = (f: typeof seances) => f.reduce((n, s) => n + (s.amountCents ?? 0), 0);
  const cartes = [
    { t: "Encaissé", v: euros(somme(seances.filter((s) => s.paymentStatus === "PAID"))) },
    { t: "Dû", v: euros(somme(seances.filter((s) => s.paymentStatus === "DUE"))), ton: "text-due" },
    {
      t: "En retard",
      v: euros(somme(seances.filter((s) => s.paymentStatus === "OVERDUE"))),
      ton: "text-overdue",
    },
    { t: "Actes", v: String(seances.length) },
  ];

  return (
    <div className="flex flex-col gap-7">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Facturation</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Séances facturables uniquement. Les annulations à temps et les séances à venir n’y
          figurent pas.
        </p>
      </header>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <GroupeFiltre
          base="/facturation"
          params={params}
          cle="paiement"
          libelle="Paiement"
          options={[
            { valeur: "DUE", label: "dû" },
            { valeur: "OVERDUE", label: "en retard" },
            { valeur: "PAID", label: "payé" },
          ]}
        />
        <GroupeFiltre
          base="/facturation"
          params={params}
          cle="cabinet"
          libelle="Cabinet"
          options={[
            { valeur: "UCCLE", label: "Uccle" },
            { valeur: "AUDERGHEM", label: "Auderghem" },
          ]}
        />
        <GroupeFiltre
          base="/facturation"
          params={params}
          cle="regime"
          libelle="Régime"
          options={[
            { valeur: "PRIVE", label: "privé" },
            { valeur: "CONVENTIONNE", label: "conventionné" },
          ]}
        />
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cartes.map((c) => (
          <div key={c.t} className="rounded-[14px] border border-line bg-surface px-5 py-4">
            <dt className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
              {c.t}
            </dt>
            <dd className={`mt-1.5 font-mono text-xl font-semibold ${c.ton ?? ""}`} data-numeric>
              {c.v}
            </dd>
          </div>
        ))}
      </dl>

      <div className="rounded-[14px] border border-line bg-surface">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Séances facturables</caption>
          <thead>
            <tr className="border-b border-line bg-sunken text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <EnTeteTri base="/facturation" params={params} champ="date">Date</EnTeteTri>
              <EnTeteTri base="/facturation" params={params} champ="patient">Patient</EnTeteTri>
              <EnTeteTri base="/facturation" params={params} champ="cabinet">Cabinet</EnTeteTri>
              <EnTeteTri base="/facturation" params={params} champ="regime">Régime</EnTeteTri>
              <EnTeteTri base="/facturation" params={params} champ="montant" aDroite>Montant</EnTeteTri>
              <EnTeteTri base="/facturation" params={params} champ="paiement" aDroite>Paiement</EnTeteTri>
            </tr>
          </thead>
          <tbody>
            {seances.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-b-0 hover:bg-sunken/60">
                <td className="px-5 py-3 font-mono text-xs whitespace-nowrap" data-numeric>
                  {fmtDateCourte.format(s.startsAt)}
                </td>
                <td className="px-3 py-3">
                  <Link href={`/patients/${s.patientId}`} className="font-medium hover:text-accent-text">
                    {nomComplet(s.patient)}
                  </Link>
                </td>
                <td className="px-3 py-3"><CabinetTag office={s.office} /></td>
                <td className="px-3 py-3"><RegimeTag scheme={s.patient.scheme} /></td>
                <td className="px-3 py-3 text-right font-mono whitespace-nowrap" data-numeric>
                  {euros(s.amountCents)}
                </td>
                <td className="px-5 py-3">
                  <span className="flex flex-wrap items-center justify-end gap-2">
                    <EtatPaiement
                      status={s.status}
                      payment={s.paymentStatus}
                      methode={s.paymentMethod}
                    />
                    {s.paymentStatus === "PAID" ? (
                      <a
                        href={`/api/recu/${s.id}`}
                        className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:border-accent hover:text-accent-text"
                      >
                        reçu PDF
                      </a>
                    ) : (
                      <Encaisser id={s.id} />
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {seances.length === 0 && (
          <p className="px-6 py-12 text-center text-sm text-ink-muted">
            Aucun acte ne correspond à ces filtres.
          </p>
        )}
      </div>

      <p className="text-xs text-ink-muted">
        Les séances conventionnées n’affichent pas de montant : le circuit de facturation au
        réseau reste à établir. Le reçu n’est pas une attestation de soins, et les prestations de
        psychologue sont exonérées de TVA.
      </p>
    </div>
  );
}
