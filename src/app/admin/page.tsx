import Link from "next/link";
import type { CareScheme } from "@prisma/client";
import { prisma } from "@/lib/db";
import { synchroniserApres } from "@/lib/google-sync";
import { compterAFaire } from "@/lib/google-afaire";
import { parametres } from "@/lib/parametres";
import { ACompleter } from "@/components/ACompleter";
import { ATrancher } from "@/components/ATrancher";
import { configurationACompleter } from "@/lib/configuration-etat";
import { demoOuverte } from "@/lib/demo";
import {
  AlerteTrajet,
  CabinetTag,
  EtatPaiement,
  HorsQuota,
  RegimeTag,
  StatutSeance,
  TagVisio,
} from "@/components/tags";
import { horsQuotaPour } from "@/lib/quotas";
import { GroupeFiltre, type Params } from "@/components/filtres";
import { FiltresMobile } from "@/components/FiltresMobile";
import { StatuerSeance } from "@/components/StatuerSeance";
import { cabinetsActifs, optionsCabinet } from "@/lib/cabinets";
import {
  conflitsDeTrajet,
  debutDeJour,
  euros,
  fmtDateCourte,
  fmtHeure,
  fmtJourLong,
  formatDuree,
  heuresTotales,
  isBillable,
  isoJour,
  minutesDeJour,
  nomSeance,
  partiesJour,
} from "@/lib/format";

export const dynamic = "force-dynamic";

/** « dans 25 min », « dans 1 h 20 » : un délai en clair, jamais en millisecondes. */
function delaiEnClair(ms: number) {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `dans ${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r === 0 ? `dans ${h} h` : `dans ${h} h ${String(r).padStart(2, "0")}`;
}

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
  synchroniserApres(120_000);
  const maintenant = new Date();
  const googleAFaire = await compterAFaire();
  // Pas pendant la démonstration : un visiteur n'a rien à y régler.
  const aCompleter = demoOuverte() ? [] : await configurationACompleter();
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
  // Toutes les séances passées encore « à venir », quel que soit leur jour : une
  // séance oubliée hier ne doit pas sortir du radar à minuit. Tant qu'elle n'est
  // pas statuée, elle ne se facture pas.
  const aStatuer = await prisma.session.findMany({
    where: { status: "SCHEDULED", startsAt: { lt: maintenant } },
    orderBy: { startsAt: "asc" },
    include: { patient: true, cabinet: true },
  });
  const total = heuresTotales(seances);
  // La séance en cours, ou à défaut la prochaine : ce qu'on cherche des yeux en
  // ouvrant l'écran. Seulement pour la journée d'aujourd'hui.
  const enCours = estAujourdhui
    ? seances.find(
        (s) =>
          s.status === "SCHEDULED" &&
          s.startsAt <= maintenant &&
          maintenant.getTime() < s.startsAt.getTime() + s.durationMin * 60_000,
      )
    : undefined;
  const prochaine = estAujourdhui
    ? (enCours ??
      seances.find((s) => s.status === "SCHEDULED" && s.startsAt > maintenant))
    : undefined;
  const horsQuota = await horsQuotaPour(seances.map((s) => s.patientId));

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
        <div className="sans-impression flex flex-wrap items-center gap-3">
          <Link
            href={`/admin/imprimer?jour=${isoJour(debut)}${params.cabinet ? `&cabinet=${params.cabinet}` : ""}`}
            className="hidden rounded-full border border-line-strong px-5 py-2.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text md:inline-block"
          >
            Imprimer la journée
          </Link>
          <Link
            href="/admin/semaine"
            className="rounded-full border border-line-strong px-5 py-2.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text"
          >
            Voir l’agenda
          </Link>
        </div>
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
      </div>

      <ACompleter points={aCompleter} />

      {googleAFaire.lignes > 0 && (
        <Link
          href="/admin/google"
          className="rounded-[14px] border border-accent/40 bg-surface px-5 py-4 text-sm transition-colors hover:border-accent"
        >
          <span className="font-semibold">{googleAFaire.lignes}</span> événement
          {googleAFaire.lignes > 1 ? "s" : ""} de votre Google Agenda
          {googleAFaire.lignes > 1 ? " attendent" : " attend"} une décision : un patient, un créneau
          occupé, ou rien.
        </Link>
      )}

      {aStatuer.length > 0 && (
        <section className="rounded-[14px] border border-due/40 bg-surface px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm">
              <span className="font-semibold">{aStatuer.length}</span> séance
              {aStatuer.length > 1 ? "s" : ""} passée{aStatuer.length > 1 ? "s" : ""} à trancher.
              Sans statut, une séance ne se facture pas.
            </h2>
            {aStatuer.length > 1 && <StatuerSeance ids={aStatuer.map((s) => s.id)} groupe />}
          </div>
          {/* Au-delà de trois, la liste se replie : une longue file de séances
              oubliées repoussait la journée en cours sous la ligne de flottaison.
              La vue scindée (fiche à droite) vit dans ATrancher. */}
          <ATrancher
            replie={aStatuer.length > 3}
            lignes={aStatuer.slice(0, 20).map((s) => ({
              id: s.id,
              patientId: s.patientId,
              quand: `${fmtDateCourte.format(s.startsAt)} · ${fmtHeure.format(s.startsAt)}`,
              nom: nomSeance(s),
              cabinet: <CabinetTag cabinet={s.cabinet} />,
              statuer: <StatuerSeance ids={[s.id]} />,
            }))}
          />
          {aStatuer.length > 20 && (
            <p className="mt-2 text-xs text-ink-muted">
              Et {aStatuer.length - 20} autres, plus récentes : elles apparaîtront ici à mesure.
            </p>
          )}
        </section>
      )}

      {seances.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <p className="font-display text-xl">Journée libre</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            {params.cabinet
              ? `Aucune séance à ${cabinets.find((c) => c.id === params.cabinet)?.nom ?? "ce cabinet"} ce jour-là.`
              : "Aucune séance ce jour-là, dans aucun cabinet."}
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {seances.map((s, i) => (
            <li key={s.id}>
              <Link
                href={s.patientId ? `/admin/patients/${s.patientId}` : "/admin/etablissements"}
                className={`flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[14px] border bg-surface px-5 py-4 transition-colors hover:border-accent ${
                  prochaine?.id === s.id ? "border-accent" : "border-line"
                }`}
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
                  {prochaine?.id === s.id && (
                    <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-accent-text">
                      {s.id === enCours?.id
                        ? "en cours"
                        : `prochaine · ${delaiEnClair(s.startsAt.getTime() - maintenant.getTime())}`}
                    </span>
                  )}
                  <CabinetTag cabinet={s.cabinet} />
                  {s.patient && <RegimeTag scheme={s.patient.scheme} />}
                  {s.visio && <TagVisio />}
                  {horsQuota.has(s.id) && <HorsQuota />}
                  {conflits.has(i) && <AlerteTrajet />}
                </span>
                <span className="flex shrink-0 items-center gap-4">
                  {/* Une séance à venir n'a ni statut ni paiement à dire :
                      « à venir — » sur chaque ligne n'apprenait rien. */}
                  {s.status !== "SCHEDULED" && <StatutSeance status={s.status} />}
                  {isBillable(s.status) && (
                    <>
                      <span className="text-sm" data-numeric>
                        {euros(s.amountCents)}
                      </span>
                      <EtatPaiement
                        status={s.status}
                        payment={s.paymentStatus}
                        methode={s.paymentMethod}
                      />
                    </>
                  )}
                </span>
              </Link>
              {conflits.has(i) && (
                <p className="mt-1.5 pl-5 text-xs text-overdue">
                  Séance précédente à {seances[i - 1].cabinet.nom} : moins de{" "}
                  {reglages.trajetMin} minutes pour rejoindre {s.cabinet.nom}.
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

    </div>
  );
}
