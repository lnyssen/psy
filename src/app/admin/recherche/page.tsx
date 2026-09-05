import Link from "next/link";
import { prisma } from "@/lib/db";
import { CabinetTag, RegimeTag } from "@/components/tags";
import { adresseCabinet, fmtDateCourte, initiales, nomComplet } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Recherche globale : patients, notes de dossier et lieux, dans une seule vue.
 *
 * Trois requêtes séparées plutôt qu'un index de recherche : à l'échelle d'une
 * pratique individuelle, quelques centaines de dossiers, un LIKE insensible à
 * la casse répond en quelques millisecondes. Un index plein texte serait une
 * machinerie à entretenir sans bénéfice mesurable.
 */
export default async function Recherche({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const terme = (q ?? "").trim();

  if (terme.length < 2) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-3xl tracking-tight">Recherche</h1>
        <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-muted">
          Tapez au moins deux caractères. La recherche porte sur les patients, leurs coordonnées,
          les notes de dossier et les lieux.
        </p>
      </div>
    );
  }

  const contient = { contains: terme, mode: "insensitive" as const };

  const [patients, notes, cabinets] = await Promise.all([
    prisma.patient.findMany({
      where: {
        OR: [
          { firstName: contient },
          { lastName: contient },
          { email: contient },
          { phone: contient },
          { city: contient },
          { addressLine: contient },
        ],
      },
      include: { cabinet: true, sessions: { orderBy: { startsAt: "desc" }, take: 1 } },
      orderBy: [{ lastName: "asc" }],
      take: 30,
    }),
    prisma.note.findMany({
      where: { body: contient },
      include: { patient: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.cabinet.findMany({
      where: { OR: [{ nom: contient }, { city: contient }, { addressLine: contient }] },
      orderBy: { ordre: "asc" },
    }),
  ]);

  const total = patients.length + notes.length + cabinets.length;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl tracking-tight">
          « {terme} »
        </h1>
        <p className="mt-2 text-sm text-ink-muted" data-numeric>
          {total} résultat{total > 1 ? "s" : ""}.
        </p>
      </header>

      {total === 0 && (
        <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-muted">
          Rien ne correspond. La recherche porte sur les noms, coordonnées, notes de dossier et
          lieux.
        </p>
      )}

      {patients.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Patients</h2>
          <ul className="flex flex-col gap-2">
            {patients.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/patients/${p.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-line bg-surface px-5 py-3.5 transition-colors hover:border-accent"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-text">
                    {initiales(p.firstName, p.lastName)}
                  </span>
                  <span className="flex-1 font-medium">{nomComplet(p)}</span>
                  <RegimeTag scheme={p.scheme} />
                  {p.cabinet && <CabinetTag cabinet={p.cabinet} />}
                  {p.phone && (
                    <span className="text-xs text-ink-muted" data-numeric>
                      {p.phone}
                    </span>
                  )}
                  {p.sessions[0] && (
                    <span className="text-xs text-ink-muted" data-numeric>
                      dernière séance {fmtDateCourte.format(p.sessions[0].startsAt)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Notes de dossier</h2>
          <ul className="flex flex-col gap-2">
            {notes.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/admin/patients/${n.patientId}`}
                  className="flex flex-col gap-1 rounded-[14px] border border-line bg-surface px-5 py-3.5 transition-colors hover:border-accent"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="text-sm font-medium">{nomComplet(n.patient)}</span>
                    <span className="text-xs text-ink-muted" data-numeric>
                      {fmtDateCourte.format(n.createdAt)}
                    </span>
                  </span>
                  <span className="text-sm text-ink-muted">{n.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cabinets.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Lieux</h2>
          <ul className="flex flex-col gap-2">
            {cabinets.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-line bg-surface px-5 py-3.5"
              >
                <CabinetTag cabinet={c} />
                <span className="flex-1 text-sm text-ink-muted">{adresseCabinet(c)}</span>
                <Link
                  href={`/admin/semaine?cabinet=${c.id}`}
                  className="text-xs font-medium text-accent-text hover:underline"
                >
                  voir l’agenda
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
