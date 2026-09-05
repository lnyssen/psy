import Link from "next/link";
import { prisma } from "@/lib/db";
import { GrilleSemaine, type JourGrille, type SeanceGrille } from "@/components/GrilleSemaine";
import { GroupeFiltre, avecParam, type Params } from "@/components/filtres";
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

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-1">
          <Link
            href={decalage(-1)}
            aria-label="Semaine précédente"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            ‹
          </Link>
          <Link
            href={decalage(1)}
            aria-label="Semaine suivante"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            ›
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
        <span className="ml-auto text-sm text-ink-muted" data-numeric>
          {seances.length} séance{seances.length > 1 ? "s" : ""} · {formatDuree(totalSemaine)}
        </span>
      </header>

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
