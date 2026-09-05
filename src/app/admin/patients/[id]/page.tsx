import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CabinetTag, EtatPaiement, RegimeTag, StatutSeance } from "@/components/tags";
import { Notes } from "@/components/Notes";
import { Encaisser } from "@/components/Encaisser";
import {
  euros,
  fmtDateCourte,
  fmtHeure,
  fmtJourMoisAn,
  formatDuree,
  heuresTotales,
  initiales,
  isBillable,
  nomComplet,
} from "@/lib/format";

export const dynamic = "force-dynamic";

function age(naissance: Date | null) {
  if (!naissance) return null;
  const diff = Date.now() - naissance.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export default async function FichePatient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      sessions: { orderBy: { startsAt: "desc" }, include: { cabinet: true } },
      patientNotes: { orderBy: { createdAt: "desc" } },
      cabinet: true,
    },
  });
  if (!patient) notFound();

  const facturables = patient.sessions.filter((s) => isBillable(s.status));
  const du = facturables
    .filter((s) => s.paymentStatus !== "PAID")
    .reduce((n, s) => n + (s.amountCents ?? 0), 0);
  const encaisse = facturables
    .filter((s) => s.paymentStatus === "PAID")
    .reduce((n, s) => n + (s.amountCents ?? 0), 0);

  const coordonnees = [
    { t: "Téléphone", v: patient.phone, mono: true },
    { t: "Courriel", v: patient.email },
    {
      t: "Adresse",
      v: patient.addressLine
        ? `${patient.addressLine}, ${patient.postalCode ?? ""} ${patient.city ?? ""}`.trim()
        : null,
    },
    {
      t: "Naissance",
      v: patient.birthDate ? `${fmtJourMoisAn.format(patient.birthDate)} (${age(patient.birthDate)} ans)` : null,
      mono: true,
    },
    { t: "Tarif", v: patient.feeCents ? `${euros(patient.feeCents)} la séance` : "tarif INAMI", mono: true },
  ];

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/patients" className="text-sm text-ink-muted transition-colors hover:text-accent-text">
        ← Tous les patients
      </Link>

      <header className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-base font-semibold text-accent-text">
          {initiales(patient.firstName, patient.lastName)}
        </span>
        <div className="flex-1">
          <h1 className="font-display text-3xl tracking-tight">{nomComplet(patient)}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <RegimeTag scheme={patient.scheme} />
            {patient.cabinet && <CabinetTag cabinet={patient.cabinet} />}
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          Nouvelle séance
        </button>
      </header>

      <section className="rounded-[14px] border border-line bg-surface px-5 py-4">
        <h2 className="sr-only">Coordonnées</h2>
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {coordonnees.map((c) => (
            <div key={c.t}>
              <dt className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
                {c.t}
              </dt>
              <dd className={`mt-0.5 text-sm ${c.mono ? "font-mono" : ""}`} data-numeric>
                {c.v || <span className="text-ink-muted">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { t: "Séances", v: String(patient.sessions.length) },
          { t: "Heures", v: formatDuree(heuresTotales(patient.sessions)) },
          { t: "Encaissé", v: euros(encaisse) },
          { t: "Dû", v: du > 0 ? euros(du) : "—", alerte: du > 0 },
        ].map((c) => (
          <div key={c.t} className="rounded-[14px] border border-line bg-surface px-5 py-4">
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

      <section>
        <h2 className="mb-3 text-sm font-semibold">Historique des séances</h2>
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
                <time className="w-36 shrink-0 font-mono text-xs" data-numeric>
                  {fmtDateCourte.format(s.startsAt)} · {fmtHeure.format(s.startsAt)}
                </time>
                <CabinetTag cabinet={s.cabinet} />
                <span className="flex-1">
                  <StatutSeance status={s.status} />
                </span>
                {isBillable(s.status) && (
                  <span className="font-mono text-sm" data-numeric>
                    {euros(s.amountCents)}
                  </span>
                )}
                <EtatPaiement status={s.status} payment={s.paymentStatus} methode={s.paymentMethod} />
                {isBillable(s.status) && s.paymentStatus !== "PAID" && <Encaisser id={s.id} />}
                {s.paymentStatus === "PAID" && (
                  <a
                    href={`/api/recu/${s.id}`}
                    className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:border-accent hover:text-accent-text"
                  >
                    reçu PDF
                  </a>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {patient.jetonRdv && (
        <section className="rounded-[14px] border border-line bg-surface px-5 py-4">
          <h2 className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Lien personnel de réservation
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            À transmettre au patient : il lui permet de réserver un créneau libre sans passer par
            une demande à confirmer. Ce lien vaut reconnaissance — ne le diffusez pas ailleurs.
          </p>
          <code className="mt-2 block overflow-x-auto rounded-[10px] bg-sunken px-4 py-2 text-xs">
            /rendez-vous?p={patient.jetonRdv}
          </code>
        </section>
      )}

      <Notes
        patientId={patient.id}
        notes={patient.patientNotes.map((n) => ({
          id: n.id,
          body: n.body,
          date: fmtDateCourte.format(n.createdAt),
        }))}
      />
    </div>
  );
}
