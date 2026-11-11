import Link from "next/link";
import type { CareScheme } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parametres } from "@/lib/parametres";
import { etatPaiement, payeurDe } from "@/lib/tarifs";
import { GrilleSemaine, type JourGrille, type SeanceGrille } from "@/components/GrilleSemaine";
import { GroupeFiltre, avecParam, type Params } from "@/components/filtres";
import { FiltresMobile } from "@/components/FiltresMobile";
import { IconChevronDroite, IconChevronGauche } from "@/components/icons";
import { cabinetsActifs, optionsCabinet } from "@/lib/cabinets";
import { alertesQuota, heuresFacturablesSemaine, horsQuotaPour } from "@/lib/quotas";
import { FormulaireNouvelleSeance } from "@/components/FormulaireNouvelleSeance";
import { mentionParticipants } from "@/lib/participants";
import { synchroniser } from "@/lib/google-sync";
import { compterAFaire } from "@/lib/google-afaire";
import {
  ajouterJours,
  isoJour,
  JOURS_OUVRES,
  PAYMENT_LABEL,
  conflitsDeTrajet,
  fmtJourMois,
  fmtJourMoisAn,
  fmtNomJour,
  fmtMoisCourt,
  formatDuree,
  heuresTotales,
  isBillable,
  lundiDe,
  memeJour,
  minutesDeJour,
  nomSeance,
  partiesJour,
} from "@/lib/format";
import { ChampDate } from "@/components/ChampDate";

export const dynamic = "force-dynamic";

const HEURE_DEBUT = 8;
const HEURE_FIN = 20;


export default async function Semaine({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;

  // Ce qui a été ajouté dans Google doit être là dès l'ouverture de l'agenda.
  // Passage incrémental, donc rapide ; on n'attend de toute façon pas au-delà
  // de quelques secondes, et un échec ne doit jamais empêcher d'afficher.
  await Promise.race([
    synchroniser({ maxAgeMs: 30_000 }).catch(() => null),
    new Promise((r) => setTimeout(r, 4500)),
  ]);

  const ancre = params.semaine ? new Date(params.semaine) : new Date();
  const lundi = lundiDe(Number.isNaN(ancre.getTime()) ? new Date() : ancre);

  const finSemaine = ajouterJours(lundi, JOURS_OUVRES);

  const seances = await prisma.session.findMany({
    where: {
      startsAt: { gte: lundi, lt: finSemaine },
      ...(params.cabinet ? { cabinetId: params.cabinet } : {}),
      ...(params.regime ? { patient: { scheme: params.regime as CareScheme } } : {}),
    },
    orderBy: { startsAt: "asc" },
    include: { patient: true, cabinet: true },
  });
  const cabinets = await cabinetsActifs();
  const cabinetsPatients = cabinets.filter((c) => !c.factureInstitution);
  const externes = await prisma.evenementGoogle.findMany({
    where: { statut: { in: ["A_RATTACHER", "OCCUPE"] }, debut: { gte: lundi, lt: finSemaine } },
    orderBy: { debut: "asc" },
  });
  const aFaire = await compterAFaire();
  const alertes = await alertesQuota();
  const patients = (
    await prisma.patient.findMany({
      where: { active: true },
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    })
  ).map((p) => ({ ...p, alerte: alertes.get(p.id) }));
  const horsQuota = await horsQuotaPour(seances.map((s) => s.patientId));

  const reglages = await parametres();
  const conflits = conflitsDeTrajet(seances, reglages.trajetMin);
  const maintenant = new Date();

  const jours: JourGrille[] = Array.from({ length: JOURS_OUVRES }, (_, i) => {
    const d = ajouterJours(lundi, i);
    const duJour = seances.filter((s) => memeJour(s.startsAt, d));
    return {
      iso: d.toISOString(),
      nom: fmtNomJour.format(d).replace(".", ""),
      numero: String(partiesJour(d).jour),
      mois: fmtMoisCourt.format(d),
      // Un tiret plutôt qu'un « 0 min » : une journée dont la seule séance est
      // annulée à temps n'a pas zéro heure de travail, elle n'en a pas.
      total: heuresTotales(duJour) > 0 ? formatDuree(heuresTotales(duJour)) : "—",
      aujourdhui: memeJour(d, maintenant),
    };
  });

  // Une séance annulée à temps n'est plus un rendez-vous : elle reste dans
  // l'historique du patient, mais n'a rien à faire dans le calendrier. La laisser
  // dessinée, comme un bloc ordinaire, donnait l'impression que l'annulation
  // n'avait pas eu lieu. `i` reste l'indice dans `seances`, celui de `conflits`.
  const etatAffiche = (s: (typeof seances)[number]) =>
    s.patient
      ? etatPaiement(s, payeurDe(s.patient.scheme), reglages.retardPaiementJours)
      : s.paymentStatus;
  const pourGrille: SeanceGrille[] = seances.flatMap((s, i) => s.status === "CANCELLED_IN_TIME" ? [] : [{
    id: s.id,
    patientId: s.patientId,
    nom: nomSeance(s),
    isoDebut: s.startsAt.toISOString(),
    minutes: minutesDeJour(s.startsAt),
    duree: s.durationMin,
    jour: jours.findIndex((j) => memeJour(new Date(j.iso), s.startsAt)),
    cabinetNom: s.cabinet.nom,
    cabinetColor: s.cabinet.colorHex,
    cabinetFill: s.cabinet.fillHex,
    cabinetVif: s.cabinet.vividHex,
    paiement: isBillable(s.status) ? etatAffiche(s) : null,
    libellePaiement: isBillable(s.status) ? PAYMENT_LABEL[etatAffiche(s)] : null,
    conflit: conflits.has(i),
    aVenir: s.status === "SCHEDULED",
    visio: s.visio,
    participants: mentionParticipants(s.participants),
    horsQuota: horsQuota.has(s.id),
  }]);
  // Rendez-vous Google : mêmes colonnes, mais ni séance ni facturables.
  for (const e of externes) {
    const jour = jours.findIndex((j) => memeJour(new Date(j.iso), e.debut));
    if (jour < 0) continue;
    pourGrille.push({
      id: `google-${e.id}`,
      patientId: null,
      nom: e.titre,
      isoDebut: e.debut.toISOString(),
      minutes: minutesDeJour(e.debut),
      duree: Math.max(5, Math.round((e.fin.getTime() - e.debut.getTime()) / 60_000)),
      jour,
      cabinetNom: "Google",
      cabinetColor: "#5f5f80",
      cabinetFill: "#eeeef4",
      cabinetVif: "#9a9ab5",
      paiement: null,
      libellePaiement: null,
      conflit: false,
      aVenir: false,
      externe: e.statut === "A_RATTACHER" ? "A_RATTACHER" : "OCCUPE",
    });
  }

  // Le lien porte la date lue à Bruxelles, pas la découpe d'un horodatage UTC.
  // Minuit à Bruxelles vaut 22 h UTC la veille : toISOString() rendait donc le
  // dimanche de la semaine affichée, que lundiDe ramenait aussitôt au lundi
  // qu'on regardait déjà. Le bouton « suivant » ne pouvait rien faire, et le
  // bouton « précédent » reculait de deux semaines au lieu d'une.
  const decalage = (semaines: number) =>
    avecParam("/admin/semaine", params, "semaine", isoJour(ajouterJours(lundi, semaines * 7)));

  const vendredi = ajouterJours(lundi, JOURS_OUVRES - 1);
  const totalSemaine = heuresTotales(seances);

  // Plafond hebdomadaire d'un lieu facturé à un tiers (l'école, 24 h) : sans
  // filtre, sur la semaine entière, quels que soient les filtres affichés —
  // le quota ne se négocie pas avec ce qu'on choisit de regarder.
  const cabinetsAQuota = await prisma.cabinet.findMany({
    where: { quotaHebdoMin: { not: null } },
  });
  const quotas = await Promise.all(
    cabinetsAQuota.map(async (c) => {
      const seancesCabinet = await prisma.session.findMany({
        where: { cabinetId: c.id, startsAt: { gte: lundi, lt: finSemaine } },
        select: { durationMin: true, status: true },
      });
      const heures = heuresFacturablesSemaine(seancesCabinet);
      return { cabinet: c, heures, plafond: c.quotaHebdoMin! / 60 };
    }),
  );

  // Période libre : deux dates au choix, pour un décompte de séances et
  // d'heures sur autre chose qu'une semaine calendaire — un mois, un trimestre,
  // ou la portion d'année qu'on prépare pour la comptable.
  const duBrut = params.du ? new Date(params.du) : null;
  const auBrut = params.au ? new Date(params.au) : null;
  const periodeValide =
    duBrut && auBrut && !Number.isNaN(duBrut.getTime()) && !Number.isNaN(auBrut.getTime());
  let finPeriode = periodeValide ? new Date(auBrut!) : null;
  if (finPeriode) finPeriode = ajouterJours(finPeriode, 1);

  const seancesPeriode = periodeValide
    ? await prisma.session.findMany({
        where: {
          startsAt: { gte: duBrut!, lt: finPeriode! },
          ...(params.cabinet ? { cabinetId: params.cabinet } : {}),
          ...(params.regime ? { patient: { scheme: params.regime as CareScheme } } : {}),
        },
        select: { durationMin: true, status: true },
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
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
          <h1 className="text-xl font-semibold tracking-tight" data-numeric>
            {fmtJourMois.format(lundi)} – {fmtJourMoisAn.format(vendredi)}
          </h1>
          <Link
            href={avecParam("/admin/semaine", params, "semaine")}
            className="rounded-full border border-line-strong px-3.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            Cette semaine
          </Link>
          <Link
            href={`/admin/imprimer?semaine=${isoJour(lundi)}${params.cabinet ? `&cabinet=${params.cabinet}` : ""}`}
            className="rounded-full border border-line-strong px-3.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            Imprimer
          </Link>
        </header>

        <details className="rounded-[14px] open:border open:border-dashed open:border-line-strong open:bg-surface open:px-5 open:py-3">
          <summary className="w-fit cursor-pointer list-none rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover">
            Nouvelle séance
          </summary>
          <FormulaireNouvelleSeance
            patients={patients}
            cabinets={cabinetsPatients}
            dateInitiale={isoJour(lundi)}
            dureeMin={reglages.dureeSeanceMin}
          />
        </details>
      </div>

      {/* Le volume de la semaine tient en une ligne : l'agenda vient d'abord,
          surtout sur téléphone où des cartes repoussaient la première séance
          très bas. Le calcul sur une autre période se déplie à la demande. */}
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-muted" data-numeric>
          <span className="font-semibold text-ink">
            {seances.filter((s) => s.status !== "CANCELLED_IN_TIME").length} séances
          </span>{" "}
          ·{" "}
          <span className="font-semibold text-accent-text">{formatDuree(totalSemaine)}</span> cette
          semaine
        </p>
        <details open={Boolean(params.du || params.au)} className="group">
          <summary className="w-fit cursor-pointer list-none text-xs font-medium text-accent-text hover:underline">
            Compter sur une autre période
          </summary>
        <form
          method="get"
          className="mt-2 flex flex-wrap items-end gap-3 rounded-[14px] border border-line bg-surface px-5 py-4"
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
            <ChampDate
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
            <ChampDate
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
        </details>
      </div>

      {quotas.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {quotas.map(({ cabinet: c, heures, plafond }) => {
            const ratio = heures / plafond;
            const ton = ratio >= 1 ? "text-overdue bg-overdue-soft" : ratio >= 0.9 ? "text-due bg-due-soft" : "bg-sunken text-ink-muted";
            return (
              <li
                key={c.id}
                className={`rounded-full px-4 py-1.5 text-xs font-medium ${ton}`}
                data-numeric
              >
                {c.nom} : {formatDuree(heures)} / {formatDuree(plafond)} cette semaine
                {ratio >= 1 && ", plafond dépassé"}
              </li>
            );
          })}
        </ul>
      )}

      <FiltresMobile
        base="/admin/semaine"
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
          base="/admin/semaine"
          params={params}
          cle="cabinet"
          libelle="Cabinet"
          options={optionsCabinet(cabinets)}
        />
      </div>

      {aFaire.lignes > 0 && (
        <Link
          href="/admin/google"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-accent/40 bg-surface px-5 py-3 text-sm transition-colors hover:border-accent"
        >
          <span>
            <span className="font-semibold">Google Agenda</span> :{" "}
            <span data-numeric>
              {aFaire.lignes} à traiter ({aFaire.rendezVous} rendez-vous)
            </span>
          </span>
          <span className="font-medium text-accent-text">Traiter →</span>
        </Link>
      )}

      <GrilleSemaine
        seances={pourGrille}
        jours={jours}
        heureDebut={HEURE_DEBUT}
        heureFin={HEURE_FIN}
        patients={patients}
        cabinets={cabinetsPatients}
        dureeSeance={reglages.dureeSeanceMin}
      />

      <p className="text-xs text-ink-muted">
        Cliquez une case vide pour y créer une séance, au quart d’heure près. Glissez une séance
        existante pour la déplacer. Au clavier, les deux flèches qui apparaissent sur un bloc la
        décalent d’un quart d’heure. Le week-end est refusé.
      </p>
    </div>
  );
}
