import Link from "next/link";
import { prisma } from "@/lib/db";
import { CabinetTag } from "@/components/tags";
import { fmtDateCourte, fmtJourMoisAn, formatDuree, lundiDe, nomComplet } from "@/lib/format";

export const dynamic = "force-dynamic";

const JOUR_MS = 24 * 3600 * 1000;
const NB_SEMAINES = 12;
const SEUILS = [4, 6, 8, 12];

/**
 * Statistiques d'activité : ce que ni l'agenda ni la finance ne montrent.
 *
 * - les heures par cabinet et par semaine, sur les douze dernières ;
 * - le taux d'absence par patient, sur douze mois glissants ;
 * - les patients suivis qui n'ont plus de séance depuis un moment et rien de
 *   prévu : à recontacter, ou à clôturer.
 *
 * Une séance annulée à temps ne compte pas dans les heures (le fauteuil est
 * libre), une absence si (le créneau était bloqué).
 */
export default async function Statistiques({
  searchParams,
}: {
  searchParams: Promise<{ semaines?: string }>;
}) {
  const { semaines: semainesParam } = await searchParams;
  const seuil = SEUILS.includes(Number(semainesParam)) ? Number(semainesParam) : 6;
  const maintenant = new Date();

  // Douze lundis, du plus ancien au plus récent. Chaque lundi est recalculé à
  // partir d'un instant en milieu de semaine : soustraire sept fois vingt-
  // quatre heures tomberait à côté au passage à l'heure d'été.
  const lundiCourant = lundiDe(maintenant);
  const lundis = Array.from({ length: NB_SEMAINES }, (_, i) =>
    lundiDe(new Date(lundiCourant.getTime() - (NB_SEMAINES - 1 - i) * 7 * JOUR_MS + 3 * JOUR_MS)),
  );
  const finPeriode = new Date(lundiCourant.getTime() + 7 * JOUR_MS + 3 * JOUR_MS);
  const ilYaUnAn = new Date(maintenant.getTime() - 365 * JOUR_MS);

  const [cabinets, seancesSemaines, seancesAnnee, patients] = await Promise.all([
    prisma.cabinet.findMany({ orderBy: { ordre: "asc" } }),
    prisma.session.findMany({
      where: {
        startsAt: { gte: lundis[0], lt: lundiDe(finPeriode) },
        status: { in: ["SCHEDULED", "ATTENDED", "NO_SHOW", "NO_SHOW_ANNULE"] },
      },
      select: { startsAt: true, durationMin: true, cabinetId: true },
    }),
    prisma.session.findMany({
      where: {
        patientId: { not: null },
        startsAt: { gte: ilYaUnAn, lte: maintenant },
        status: { in: ["ATTENDED", "NO_SHOW", "NO_SHOW_ANNULE", "CANCELLED_IN_TIME"] },
      },
      select: { patientId: true, status: true },
    }),
    prisma.patient.findMany({
      where: { active: true },
      include: {
        sessions: {
          where: { status: { not: "CANCELLED_IN_TIME" } },
          orderBy: { startsAt: "desc" },
          take: 1,
          select: { startsAt: true },
        },
        cabinet: true,
      },
    }),
  ]);

  // Heures par semaine × cabinet.
  const heures = new Map<string, number>();
  for (const s of seancesSemaines) {
    const cle = `${lundiDe(s.startsAt).getTime()}|${s.cabinetId}`;
    heures.set(cle, (heures.get(cle) ?? 0) + s.durationMin / 60);
  }
  const cabinetsUtilises = cabinets.filter(
    (c) => c.actif || seancesSemaines.some((s) => s.cabinetId === c.id),
  );
  const lignesSemaines = lundis.map((l) => {
    const parCabinet = cabinetsUtilises.map((c) => heures.get(`${l.getTime()}|${c.id}`) ?? 0);
    return { lundi: l, parCabinet, total: parCabinet.reduce((a, b) => a + b, 0) };
  });
  const semainesPassees = lignesSemaines.slice(0, -1).filter((l) => l.total > 0);
  const moyenne = semainesPassees.length
    ? semainesPassees.reduce((n, l) => n + l.total, 0) / semainesPassees.length
    : 0;

  // Absences par patient, douze mois glissants.
  const compte = new Map<string, { venues: number; absences: number; annulations: number }>();
  for (const s of seancesAnnee) {
    const c = compte.get(s.patientId!) ?? { venues: 0, absences: 0, annulations: 0 };
    if (s.status === "ATTENDED") c.venues += 1;
    else if (s.status === "CANCELLED_IN_TIME") c.annulations += 1;
    else c.absences += 1;
    compte.set(s.patientId!, c);
  }
  const nomDe = new Map(patients.map((p) => [p.id, nomComplet(p)]));
  const absences = [...compte.entries()]
    .map(([id, c]) => ({ id, ...c, taux: c.absences / Math.max(1, c.venues + c.absences) }))
    .filter((a) => a.absences > 0)
    .sort((a, b) => b.taux - a.taux || b.absences - a.absences);
  const totalVenues = [...compte.values()].reduce((n, c) => n + c.venues, 0);
  const totalAbsences = [...compte.values()].reduce((n, c) => n + c.absences, 0);
  const tauxGlobal = totalAbsences / Math.max(1, totalVenues + totalAbsences);

  // Patients sans séance récente ni prévue. Un dossier sans aucune séance
  // compte depuis sa création.
  const limite = new Date(maintenant.getTime() - seuil * 7 * JOUR_MS);
  const endormis = patients
    .map((p) => ({ p, derniere: p.sessions[0]?.startsAt ?? null }))
    .filter(({ p, derniere }) => (derniere ?? p.createdAt) < limite)
    .sort((a, b) => (a.derniere?.getTime() ?? 0) - (b.derniere?.getTime() ?? 0));

  const pourcent = (x: number) => `${Math.round(x * 100)} %`;
  const cartes = [
    { t: "Heures / semaine", v: moyenne > 0 ? formatDuree(moyenne) : "—", aide: `moyenne des semaines travaillées, sur ${NB_SEMAINES}` },
    { t: "Taux d’absence", v: pourcent(tauxGlobal), aide: "absences non excusées, 12 mois" },
    { t: "Annulations à temps", v: String([...compte.values()].reduce((n, c) => n + c.annulations, 0)), aide: "12 mois" },
    { t: "Sans séance", v: String(endormis.length), aide: `depuis ${seuil} semaines, rien de prévu` },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link href="/admin/finance" className="text-sm text-ink-muted transition-colors hover:text-accent-text">
          ← Finance
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight">Statistiques d’activité</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Les heures comptent les séances prévues, honorées ou manquées ; pas les annulations à temps.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cartes.map((c) => (
          <div key={c.t} className="rounded-[14px] border border-line bg-surface px-5 py-4">
            <dt className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">{c.t}</dt>
            <dd className="mt-1.5 font-mono text-xl font-semibold" data-numeric>
              {c.v}
            </dd>
            <dd className="mt-1 text-[11px] text-ink-muted">{c.aide}</dd>
          </div>
        ))}
      </dl>

      <section className="rounded-[14px] border border-line bg-surface">
        <h2 className="px-5 pt-5 text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
          Heures par semaine et par cabinet
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Heures de séance par semaine et par cabinet</caption>
            <thead>
              <tr className="border-y border-line bg-sunken text-[11px] tracking-[0.1em] text-ink-muted uppercase">
                <th scope="col" className="px-5 py-2.5 text-left font-semibold">
                  Semaine du
                </th>
                {cabinetsUtilises.map((c) => (
                  <th key={c.id} scope="col" className="px-3 py-2.5 text-right font-semibold">
                    {c.nom}
                  </th>
                ))}
                <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {lignesSemaines.map((l, i) => (
                <tr
                  key={l.lundi.getTime()}
                  className={`border-b border-line last:border-b-0 ${l.total === 0 ? "text-ink-muted/60" : ""}`}
                >
                  <th scope="row" className="px-5 py-2 text-left font-mono text-xs font-medium" data-numeric>
                    {fmtJourMoisAn.format(l.lundi)}
                    {i === lignesSemaines.length - 1 && (
                      <span className="ml-2 font-sans text-ink-muted">en cours</span>
                    )}
                  </th>
                  {l.parCabinet.map((h, j) => (
                    <td key={j} className="px-3 py-2 text-right font-mono text-xs" data-numeric>
                      {h > 0 ? formatDuree(h) : "—"}
                    </td>
                  ))}
                  <td className="px-5 py-2 text-right font-mono text-xs font-semibold" data-numeric>
                    {l.total > 0 ? formatDuree(l.total) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Sans séance depuis plus de {seuil} semaines, rien de prévu</h2>
          <nav aria-label="Délai" className="flex items-center gap-1 rounded-full bg-sunken p-1">
            {SEUILS.map((n) => (
              <Link
                key={n}
                href={`/admin/statistiques?semaines=${n}`}
                aria-current={n === seuil ? "page" : undefined}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  n === seuil ? "bg-accent text-accent-contrast" : "text-ink-muted hover:text-accent-text"
                }`}
              >
                {n} sem.
              </Link>
            ))}
          </nav>
        </div>
        {endormis.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-10 text-center text-sm text-ink-muted">
            Tous les patients suivis ont une séance récente ou prévue.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
            {endormis.map(({ p, derniere }) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-5 py-3 last:border-b-0"
              >
                <Link href={`/admin/patients/${p.id}`} className="min-w-40 flex-1 text-sm font-medium hover:text-accent-text">
                  {nomComplet(p)}
                </Link>
                {p.cabinet && <CabinetTag cabinet={p.cabinet} />}
                <span className="font-mono text-xs text-ink-muted" data-numeric>
                  {derniere ? `dernière séance le ${fmtDateCourte.format(derniere)}` : "aucune séance"}
                </span>
                <span className="font-mono text-xs" data-numeric>
                  {[p.phoneMother, p.phoneFather, p.phone].find(Boolean) ?? ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Absences non excusées par patient, sur douze mois</h2>
        {absences.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-10 text-center text-sm text-ink-muted">
            Aucune absence non excusée sur les douze derniers mois.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
            {absences.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-5 py-3 last:border-b-0"
              >
                <Link href={`/admin/patients/${a.id}`} className="min-w-40 flex-1 text-sm font-medium hover:text-accent-text">
                  {nomDe.get(a.id) ?? "Patient archivé"}
                </Link>
                <span className="text-xs text-ink-muted" data-numeric>
                  {a.absences} absence{a.absences > 1 ? "s" : ""} sur {a.venues + a.absences} séance
                  {a.venues + a.absences > 1 ? "s" : ""}
                  {a.annulations > 0 ? ` · ${a.annulations} annulée${a.annulations > 1 ? "s" : ""} à temps` : ""}
                </span>
                <span
                  className={`font-mono text-sm font-semibold ${a.taux >= 0.25 ? "text-overdue" : ""}`}
                  data-numeric
                >
                  {pourcent(a.taux)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
