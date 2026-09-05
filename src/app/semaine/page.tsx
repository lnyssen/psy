import Link from "next/link";
import { prisma } from "@/lib/db";
import { CabinetTag, EtatPaiement } from "@/components/tags";
import {
  OFFICE_LABEL,
  conflitsDeTrajet,
  fmtHeure,
  fmtJourCourt,
  initiales,
  lundiDe,
  memeJour,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const HEURE_DEBUT = 8;
const HEURE_FIN = 19;

export default async function Semaine() {
  const lundi = lundiDe(new Date());
  const fin = new Date(lundi);
  fin.setDate(fin.getDate() + 7);

  const seances = await prisma.session.findMany({
    where: { startsAt: { gte: lundi, lt: fin } },
    orderBy: { startsAt: "asc" },
    include: { patient: true },
  });

  const conflits = conflitsDeTrajet(seances);
  // Six colonnes, lundi à samedi : une pratique libérale reçoit couramment le
  // samedi. Le dimanche est exclu — à confirmer avec l'utilisatrice, c'est
  // l'un des points ouverts du plan de recherche.
  const jours = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(lundi);
    d.setDate(d.getDate() + i);
    return d;
  });
  const heures = Array.from({ length: HEURE_FIN - HEURE_DEBUT }, (_, i) => HEURE_DEBUT + i);
  const aujourdhui = new Date();
  // Le compteur ne doit annoncer que ce que la grille montre réellement.
  const affichees = seances.filter((s) => jours.some((j) => memeJour(s.startsAt, j)));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Semaine</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {affichees.length} séance{affichees.length > 1 ? "s" : ""} du{" "}
          {fmtJourCourt.format(jours[0])} au {fmtJourCourt.format(jours[5])}.
        </p>
      </header>

      {/* Sur écran large : la matrice. En dessous de 900 px, elle cède la place
          à une liste chronologique — pas à un tableau qui défile de côté. */}
      <div className="hidden overflow-hidden rounded-[14px] border border-line bg-surface md:block">
        <div className="grid grid-cols-[3.5rem_repeat(6,1fr)]">
          <div className="border-b border-line bg-sunken" />
          {jours.map((j) => (
            <div
              key={j.toISOString()}
              className={`border-b border-l border-line px-3 py-2.5 text-center text-xs font-semibold first-letter:uppercase ${
                memeJour(j, aujourdhui) ? "bg-accent-soft text-accent" : "bg-sunken text-ink-muted"
              }`}
            >
              {fmtJourCourt.format(j)}
            </div>
          ))}

          {heures.map((h) => (
            <div key={h} className="contents">
              <div className="border-b border-line px-2 py-1 text-right text-[11px] text-ink-muted">
                {String(h).padStart(2, "0")}h
              </div>
              {jours.map((j) => {
                const cellules = seances.filter(
                  (s) => memeJour(s.startsAt, j) && s.startsAt.getHours() === h,
                );
                return (
                  <div
                    key={`${h}-${j.toISOString()}`}
                    className={`min-h-[3.25rem] border-b border-l border-line p-1 ${
                      memeJour(j, aujourdhui) ? "bg-accent-soft/30" : ""
                    }`}
                  >
                    {cellules.map((s) => {
                      const i = seances.indexOf(s);
                      return (
                        <Link
                          key={s.id}
                          href={`/patients/${s.patientId}`}
                          className={`mb-1 block rounded-lg border px-2 py-1.5 text-[11px] leading-tight transition-colors last:mb-0 ${
                            conflits.has(i)
                              ? "border-overdue/50 bg-overdue-soft"
                              : "border-line bg-paper hover:border-accent"
                          }`}
                        >
                          <span className="flex items-baseline justify-between gap-1">
                            <span className="font-semibold">
                              {initiales(s.patient.firstName, s.patient.lastName)}
                            </span>
                            <span className="text-ink-muted">{fmtHeure.format(s.startsAt)}</span>
                          </span>
                          <span className="mt-0.5 block text-ink-muted">
                            {OFFICE_LABEL[s.office]}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Téléphone : même périmètre, forme séquentielle. */}
      <div className="flex flex-col gap-6 md:hidden">
        {jours.map((j) => {
          const duJour = seances.filter((s) => memeJour(s.startsAt, j));
          return (
            <section key={j.toISOString()}>
              <h2
                className={`mb-2 text-sm font-semibold first-letter:uppercase ${
                  memeJour(j, aujourdhui) ? "text-accent" : ""
                }`}
              >
                {fmtJourCourt.format(j)}
              </h2>
              {duJour.length === 0 ? (
                <p className="rounded-[14px] border border-dashed border-line-strong px-4 py-5 text-center text-xs text-ink-muted">
                  Journée libre
                </p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {duJour.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/patients/${s.patientId}`}
                        className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3"
                      >
                        <time className="w-12 shrink-0 text-sm font-semibold">
                          {fmtHeure.format(s.startsAt)}
                        </time>
                        <span className="w-12 shrink-0 text-sm">
                          {initiales(s.patient.firstName, s.patient.lastName)}
                        </span>
                        <span className="flex-1">
                          <CabinetTag office={s.office} />
                        </span>
                        <EtatPaiement status={s.status} payment={s.paymentStatus} />
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
