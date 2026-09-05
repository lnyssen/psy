import Link from "next/link";
import { prisma } from "@/lib/db";
import { GrilleSemaine, type JourGrille, type SeanceGrille } from "@/components/GrilleSemaine";
import { GroupeFiltre, avecParam, type Params } from "@/components/filtres";
import { IconChevronDroite, IconChevronGauche } from "@/components/icons";
import {
  JOURS_OUVRES,
  PAYMENT_LABEL,
  conflitsDeTrajet,
  fmtJourMois,
  fmtJourMoisAn,
  fmtNomJour,
  formatDuree,
  heuresTotales,
  isBillable,
  lundiDe,
  memeJour,
  minutesDeJour,
  nomComplet,
  partiesJour,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const HEURE_DEBUT = 8;
const HEURE_FIN = 19;

export default async function Semaine({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const ancre = params.semaine ? new Date(params.semaine) : new Date();
  const lundi = lundiDe(Number.isNaN(ancre.getTime()) ? new Date() : ancre);

  const finSemaine = new Date(lundi);
  finSemaine.setDate(finSemaine.getDate() + JOURS_OUVRES);

  const seances = await prisma.session.findMany({
    where: {
      startsAt: { gte: lundi, lt: finSemaine },
      ...(params.cabinet ? { office: params.cabinet as "UCCLE" | "AUDERGHEM" } : {}),
      ...(params.regime ? { patient: { scheme: params.regime as "CONVENTIONNE" | "PRIVE" } } : {}),
    },
    orderBy: { startsAt: "asc" },
    include: { patient: true },
  });

  const conflits = conflitsDeTrajet(seances);
  const maintenant = new Date();

  const jours: JourGrille[] = Array.from({ length: JOURS_OUVRES }, (_, i) => {
    const d = new Date(lundi);
    d.setDate(d.getDate() + i);
    const duJour = seances.filter((s) => memeJour(s.startsAt, d));
    return {
      iso: d.toISOString(),
      nom: fmtNomJour.format(d).replace(".", ""),
      numero: String(partiesJour(d).jour),
      total: duJour.length ? formatDuree(heuresTotales(duJour)) : "—",
      aujourdhui: memeJour(d, maintenant),
    };
  });

  const pourGrille: SeanceGrille[] = seances.map((s, i) => ({
    id: s.id,
    patientId: s.patientId,
    nom: nomComplet(s.patient),
    isoDebut: s.startsAt.toISOString(),
    minutes: minutesDeJour(s.startsAt),
    duree: s.durationMin,
    jour: jours.findIndex((j) => memeJour(new Date(j.iso), s.startsAt)),
    office: s.office,
    paiement: isBillable(s.status) ? s.paymentStatus : null,
    libellePaiement: isBillable(s.status) ? PAYMENT_LABEL[s.paymentStatus] : null,
    conflit: conflits.has(i),
  }));

  const decalage = (semaines: number) => {
    const d = new Date(lundi);
    d.setDate(d.getDate() + semaines * 7);
    return avecParam("/semaine", params, "semaine", d.toISOString().slice(0, 10));
  };

  const vendredi = new Date(lundi);
  vendredi.setDate(vendredi.getDate() + JOURS_OUVRES - 1);
  const totalSemaine = heuresTotales(seances);

  // Période libre : deux dates au choix, pour un décompte de séances et
  // d'heures sur autre chose qu'une semaine calendaire — un mois, un trimestre,
  // ou la portion d'année qu'on prépare pour la comptable.
  const duBrut = params.du ? new Date(params.du) : null;
  const auBrut = params.au ? new Date(params.au) : null;
  const periodeValide =
    duBrut && auBrut && !Number.isNaN(duBrut.getTime()) && !Number.isNaN(auBrut.getTime());
  const finPeriode = periodeValide ? new Date(auBrut!) : null;
  if (finPeriode) finPeriode.setDate(finPeriode.getDate() + 1);

  const seancesPeriode = periodeValide
    ? await prisma.session.findMany({
        where: {
          startsAt: { gte: duBrut!, lt: finPeriode! },
          ...(params.cabinet ? { office: params.cabinet as "UCCLE" | "AUDERGHEM" } : {}),
          ...(params.regime
            ? { patient: { scheme: params.regime as "CONVENTIONNE" | "PRIVE" } }
            : {}),
        },
        select: { durationMin: true, status: true },
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-1">
          <Link
            href={decalage(-1)}
            aria-label="Semaine précédente"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            <IconChevronGauche />
          </Link>
          <Link
            href={decalage(1)}
            aria-label="Semaine suivante"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            <IconChevronDroite />
          </Link>
        </div>
        <h1 className="font-mono text-xl tracking-tight" data-numeric>
          {fmtJourMois.format(lundi)} – {fmtJourMoisAn.format(vendredi)}
        </h1>
        <Link
          href={avecParam("/semaine", params, "semaine")}
          className="rounded-full border border-line-strong px-3.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
        >
          Cette semaine
        </Link>
      </header>

      {/* Le volume de la semaine est la première chose qu'on vient chercher :
          il passe en chiffres pleins plutôt qu'en mention de coin. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr]">
        <div className="rounded-[14px] border border-line bg-surface px-5 py-4">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Séances cette semaine
          </p>
          <p className="mt-1 text-3xl font-bold" data-numeric>
            {seances.length}
          </p>
        </div>
        <div className="rounded-[14px] border border-line bg-surface px-5 py-4">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Heures de séance
          </p>
          <p className="mt-1 text-3xl font-bold text-accent-text" data-numeric>
            {formatDuree(totalSemaine)}
          </p>
        </div>

        <form
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-[14px] border border-line bg-surface px-5 py-4"
        >
          {params.cabinet && <input type="hidden" name="cabinet" value={params.cabinet} />}
          {params.regime && <input type="hidden" name="regime" value={params.regime} />}
          <div>
            <label
              htmlFor="du"
              className="block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase"
            >
              Du
            </label>
            <input
              type="date"
              id="du"
              name="du"
              defaultValue={params.du ?? ""}
              className="mt-1 rounded-full border border-line px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="au"
              className="block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase"
            >
              Au
            </label>
            <input
              type="date"
              id="au"
              name="au"
              defaultValue={params.au ?? ""}
              className="mt-1 rounded-full border border-line px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            Calculer
          </button>
          {seancesPeriode && (
            <p className="w-full text-sm" data-numeric>
              <span className="text-2xl font-bold">{seancesPeriode.length}</span>{" "}
              <span className="text-ink-muted">séance{seancesPeriode.length > 1 ? "s" : ""} ·</span>{" "}
              <span className="text-2xl font-bold text-accent-text">
                {formatDuree(heuresTotales(seancesPeriode))}
              </span>
            </p>
          )}
        </form>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <GroupeFiltre
          base="/semaine"
          params={params}
          cle="cabinet"
          libelle="Cabinet"
          options={[
            { valeur: "UCCLE", label: "Uccle" },
            { valeur: "AUDERGHEM", label: "Auderghem" },
          ]}
        />
        <GroupeFiltre
          base="/semaine"
          params={params}
          cle="regime"
          libelle="Régime"
          options={[
            { valeur: "PRIVE", label: "privé" },
            { valeur: "CONVENTIONNE", label: "conventionné" },
          ]}
        />
      </div>

      <GrilleSemaine
        seances={pourGrille}
        jours={jours}
        heureDebut={HEURE_DEBUT}
        heureFin={HEURE_FIN}
      />

      <p className="text-xs text-ink-muted">
        Glissez une séance pour la déplacer, au quart d’heure près. Au clavier, les deux flèches
        qui apparaissent sur un bloc la décalent d’un quart d’heure. Le week-end est refusé.
      </p>
    </div>
  );
}
