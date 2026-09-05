import Link from "next/link";
import type { CareScheme } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CabinetTag, RegimeTag } from "@/components/tags";
import { EnTeteTri, GroupeFiltre, type Params } from "@/components/filtres";
import { cabinetsActifs, optionsCabinet } from "@/lib/cabinets";
import { euros, initiales, isBillable, nomComplet } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Patients({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;

  const patients = await prisma.patient.findMany({
    where: {
      ...(params.cabinet ? { cabinetId: params.cabinet } : {}),
      ...(params.regime ? { scheme: params.regime as CareScheme } : {}),
    },
    include: { sessions: true, patientNotes: true, cabinet: true },
  });
  const cabinets = await cabinetsActifs();

  // Le tri se fait ici plutôt qu'en base : deux des colonnes triables (nombre
  // de séances, solde dû) sont calculées et n'existent pas comme champs.
  const enrichis = patients.map((p) => ({
    p,
    seances: p.sessions.length,
    du: p.sessions
      .filter((s) => isBillable(s.status) && s.paymentStatus !== "PAID")
      .reduce((n, s) => n + (s.amountCents ?? 0), 0),
  }));

  const sens = params.sens === "desc" ? -1 : 1;
  const comparateurs: Record<string, (a: typeof enrichis[number], b: typeof enrichis[number]) => number> = {
    nom: (a, b) => a.p.lastName.localeCompare(b.p.lastName, "fr"),
    seances: (a, b) => a.seances - b.seances,
    du: (a, b) => a.du - b.du,
    cabinet: (a, b) => (a.p.cabinet?.nom ?? "").localeCompare(b.p.cabinet?.nom ?? "", "fr"),
    regime: (a, b) => a.p.scheme.localeCompare(b.p.scheme),
  };
  const tri = comparateurs[params.tri ?? "nom"] ?? comparateurs.nom;
  enrichis.sort((a, b) => tri(a, b) * sens);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Patients</h1>
          <p className="mt-2 text-sm text-ink-muted" data-numeric>
            {enrichis.length} dossier{enrichis.length > 1 ? "s" : ""}.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          Nouveau patient
        </button>
      </header>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <GroupeFiltre
          base="/admin/patients"
          params={params}
          cle="cabinet"
          libelle="Cabinet"
          options={optionsCabinet(cabinets)}
        />
        <GroupeFiltre
          base="/admin/patients"
          params={params}
          cle="regime"
          libelle="Régime"
          options={[
            { valeur: "PRIVE", label: "privé" },
            { valeur: "CONVENTIONNE", label: "conventionné" },
            { valeur: "INSTITUTION", label: "institution" },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-line bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-sunken text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <EnTeteTri base="/admin/patients" params={params} champ="nom">
                Patient
              </EnTeteTri>
              <EnTeteTri base="/admin/patients" params={params} champ="cabinet">
                Cabinet
              </EnTeteTri>
              <EnTeteTri base="/admin/patients" params={params} champ="regime">
                Régime
              </EnTeteTri>
              <th scope="col" className="px-3 py-2.5 text-left font-semibold">
                Téléphone
              </th>
              <EnTeteTri base="/admin/patients" params={params} champ="seances" aDroite>
                Séances
              </EnTeteTri>
              <EnTeteTri base="/admin/patients" params={params} champ="du" aDroite>
                Dû
              </EnTeteTri>
            </tr>
          </thead>
          <tbody>
            {enrichis.map(({ p, seances, du }) => (
              <tr key={p.id} className="border-b border-line last:border-b-0 hover:bg-sunken/60">
                <td className="px-5 py-3">
                  <Link href={`/admin/patients/${p.id}`} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-[11px] font-semibold text-accent-text">
                      {initiales(p.firstName, p.lastName)}
                    </span>
                    <span className="font-medium">{nomComplet(p)}</span>
                  </Link>
                </td>
                <td className="px-3 py-3">
                  {p.cabinet ? <CabinetTag cabinet={p.cabinet} /> : "—"}
                </td>
                <td className="px-3 py-3">
                  <RegimeTag scheme={p.scheme} />
                </td>
                <td className="px-3 py-3 font-mono text-xs whitespace-nowrap text-ink-muted">
                  {p.phone ?? "—"}
                </td>
                <td className="px-3 py-3 text-right" data-numeric>
                  {seances}
                </td>
                <td
                  className={`px-5 py-3 text-right font-semibold ${du > 0 ? "text-due" : "text-ink-muted"}`}
                  data-numeric
                >
                  {du > 0 ? euros(du) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {enrichis.length === 0 && (
        <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-muted">
          Aucun patient ne correspond à ces filtres.
        </p>
      )}
    </div>
  );
}
