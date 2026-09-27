import Link from "next/link";
import type { CareScheme } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parametres } from "@/lib/parametres";
import { AlerteTrajet, CabinetTag, EtatPaiement, RegimeTag, StatutSeance } from "@/components/tags";
import { GroupeFiltre, type Params } from "@/components/filtres";
import { FiltresMobile } from "@/components/FiltresMobile";
import { cabinetsActifs, optionsCabinet } from "@/lib/cabinets";
import {
  conflitsDeTrajet,
  debutDeJour,
  euros,
  fmtHeure,
  fmtJourLong,
  formatDuree,
  heuresTotales,
  isBillable,
  minutesDeJour,
  nomSeance,
  partiesJour,
} from "@/lib/format";

export const dynamic = "force-dynamic";

/** Prochain jour ouvré à partir de la date donnée, elle comprise. */
function prochainJourOuvre(d: Date) {
  const x = new Date(d);
  for (let i = 0; i < 7; i++) {
    const { annee, mois, jour } = partiesJour(x);
    const semaine = new Date(Date.UTC(annee, mois - 1, jour)).getUTCDay();
    if (semaine !== 0 && semaine !== 6) return x;
    x.setDate(x.getDate() + 1);
  }
  return x;
}

export default async function Aujourdhui({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const maintenant = new Date();
  // Le week-end, l'écran montre la prochaine journée travaillée plutôt qu'un
  // vide : c'est ce qu'on vient y chercher un samedi.
  const cible = prochainJourOuvre(maintenant);
  const estAujourdhui = debutDeJour(cible).getTime() === debutDeJour(maintenant).getTime();

  const debut = debutDeJour(cible);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 1);

  const seances = await prisma.session.findMany({
    where: {
      startsAt: { gte: debut, lt: fin },
      ...(params.cabinet ? { cabinetId: params.cabinet } : {}),
      ...(params.regime ? { patient: { scheme: params.regime as CareScheme } } : {}),
    },
    orderBy: { startsAt: "asc" },
    include: { patient: true, cabinet: true },
  });
  const cabinets = await cabinetsActifs();

  const reglages = await parametres();
  const conflits = conflitsDeTrajet(seances, reglages.trajetMin);
  const lieuxDuJour = [...new Map(seances.map((s) => [s.cabinetId, s.cabinet])).values()];
  const aStatuer = seances.filter((s) => s.status === "SCHEDULED" && s.startsAt < maintenant);
  const total = heuresTotales(seances);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {!estAujourdhui && (
            <p className="mb-1 text-xs font-semibold tracking-[0.1em] text-accent-text uppercase">
              Prochaine journée travaillée
            </p>
          )}
          <h1 className="font-display text-3xl tracking-tight first-letter:uppercase">
            {fmtJourLong.format(debut)}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <span data-numeric>
              {seances.length === 0
                ? "Aucune séance"
                : `${seances.length} séance${seances.length > 1 ? "s" : ""} · ${formatDuree(total)}`}
            </span>
            {lieuxDuJour.map((c) => (
              <CabinetTag key={c.id} cabinet={c} />
            ))}
          </p>
        </div>
        <Link
          href="/admin/semaine"
          className="rounded-full border border-line-strong px-5 py-2.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text"
        >
          Voir la semaine
        </Link>
      </header>

      <FiltresMobile
        base="/admin"
        params={params}
        groupes={[
            {
              cle: "cabinet",
              libelle: "Cabinet",
              tout: "Tous les lieux",
              options: optionsCabinet(cabinets),
            },
            {
              cle: "regime",
              libelle: "Régime",
              tout: "Tous les régimes",
              options: [
                { valeur: "PRIVE", label: "privé" },
                { valeur: "CONVENTIONNE", label: "conventionné" },
                { valeur: "INSTITUTION", label: "institution" },
              ],
            },
          ]}
      />

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <GroupeFiltre
          base="/admin"
          params={params}
          cle="cabinet"
          libelle="Cabinet"
          options={optionsCabinet(cabinets)}
        />
        <GroupeFiltre
          base="/admin"
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

      {aStatuer.length > 0 && (
        <p className="rounded-[14px] border border-line bg-surface px-5 py-4 text-sm">
          <span className="font-semibold">{aStatuer.length}</span> séance
          {aStatuer.length > 1 ? "s" : ""} passée{aStatuer.length > 1 ? "s" : ""} attend
          {aStatuer.length > 1 ? "ent" : ""} un statut.
        </p>
      )}

      {seances.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <p className="font-display text-xl">Journée libre</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            Aucune séance ne correspond, dans aucun des deux cabinets.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {seances.map((s, i) => (
            <li key={s.id}>
              <Link
                href={s.patientId ? `/admin/patients/${s.patientId}` : "/admin/etablissements"}
                className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[14px] border border-line bg-surface px-5 py-4 transition-colors hover:border-accent"
              >
                <time
                  dateTime={s.startsAt.toISOString()}
                  className="w-28 shrink-0 font-mono text-sm font-semibold"
                >
                  {fmtHeure.format(s.startsAt)}
                  <span className="font-normal text-ink-muted">
                    –
                    {`${String(Math.floor((minutesDeJour(s.startsAt) + s.durationMin) / 60)).padStart(2, "0")}:${String((minutesDeJour(s.startsAt) + s.durationMin) % 60).padStart(2, "0")}`}
                  </span>
                </time>
                <span className="min-w-40 flex-1 text-base font-medium">
                  {nomSeance(s)}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <CabinetTag cabinet={s.cabinet} />
                  {s.patient && <RegimeTag scheme={s.patient.scheme} />}
                  {conflits.has(i) && <AlerteTrajet />}
                </span>
                <span className="flex shrink-0 items-center gap-4">
                  <StatutSeance status={s.status} />
                  {isBillable(s.status) && (
                    <span className="text-sm" data-numeric>
                      {euros(s.amountCents)}
                    </span>
                  )}
                  <EtatPaiement
                    status={s.status}
                    payment={s.paymentStatus}
                    methode={s.paymentMethod}
                  />
                </span>
              </Link>
              {conflits.has(i) && (
                <p className="mt-1.5 pl-5 text-xs text-overdue">
                  Séance précédente à {seances[i - 1].cabinet.nom} : moins de trente minutes
                  pour rejoindre {s.cabinet.nom}.
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-ink-muted" data-numeric>
        Une séance dure {reglages.dureeSeanceMin} minutes.
      </p>
    </div>
  );
}
