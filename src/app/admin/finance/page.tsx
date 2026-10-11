import Link from "next/link";
import { prisma } from "@/lib/db";
import { CabinetTag } from "@/components/tags";
import { montantSeanceCents } from "@/lib/tarifs";
import type { Params } from "@/components/filtres";
import {
  FUSEAU,
  SCHEME_LABEL,
  euros,
  isBillable,
  partiesJour,
  type CabinetVue,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const MOIS = Array.from({ length: 12 }, (_, m) =>
  new Intl.DateTimeFormat("fr-BE", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2024, m, 15)),
  ),
);
const MOIS_COURT = Array.from({ length: 12 }, (_, m) =>
  new Intl.DateTimeFormat("fr-BE", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(2024, m, 15)))
    .replace(".", ""),
);

/** Case d'un croisement mois × cabinet. */
type Case_ = { facture: number; encaisse: number; du: number; retard: number; actes: number };
const vide = (): Case_ => ({ facture: 0, encaisse: 0, du: 0, retard: 0, actes: 0 });
const cumuler = (a: Case_, b: Case_): Case_ => ({
  facture: a.facture + b.facture,
  encaisse: a.encaisse + b.encaisse,
  du: a.du + b.du,
  retard: a.retard + b.retard,
  actes: a.actes + b.actes,
});

/**
 * Finance — l'année vue mois par mois, et par cabinet.
 *
 * Le découpage se fait sur les composantes bruxelloises de chaque date, jamais
 * sur des bornes calculées : le serveur tourne en UTC, et une séance du
 * 1er janvier à 00 h 30 à Bruxelles appartient à janvier même si l'horodatage
 * dit 31 décembre 23 h 30. Lire le calendrier plutôt que calculer un intervalle
 * supprime la classe de bug entière.
 *
 * Deux grandeurs cohabitent et ne se confondent pas :
 *   — le facturé, tout acte facturable de la période, payé ou non ;
 *   — l'encaissé, ce qui est effectivement rentré.
 * L'écart entre les deux, c'est le dû et le retard. Le graphique porte le
 * facturé — c'est l'activité ; la table porte les deux, c'est la trésorerie.
 */
export default async function Finance({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;

  const toutes = await prisma.session.findMany({
    include: { patient: { include: { tarif: true } }, cabinet: true },
  });
  // Le montant d'une séance n'est figé qu'à l'encaissement : d'ici là, c'est le
  // tarif de la fiche qui le dit, comme en facturation. Sans ce repli, toute
  // séance non payée comptait pour zéro et le « reste dû » mentait.
  const valeur = (s: (typeof toutes)[number]) => s.amountCents ?? montantSeanceCents(s.patient) ?? 0;
  const seances = toutes.filter((s) => isBillable(s.status));

  const anneesConnues = [...new Set(seances.map((s) => partiesJour(s.startsAt).annee))].sort(
    (a, b) => a - b,
  );
  const anneeCourante = partiesJour(new Date()).annee;
  if (!anneesConnues.includes(anneeCourante)) anneesConnues.push(anneeCourante);
  anneesConnues.sort((a, b) => a - b);

  const demandee = Number(params.annee);
  const annee = anneesConnues.includes(demandee) ? demandee : anneeCourante;

  const cabinets = await prisma.cabinet.findMany({ orderBy: { ordre: "asc" } });
  // Un cabinet fermé garde son historique : le retirer de la colonne ferait
  // disparaître son chiffre des totaux d'une année déjà close.
  const utilises = cabinets.filter(
    (c) =>
      c.actif ||
      seances.some((s) => s.cabinetId === c.id && partiesJour(s.startsAt).annee === annee),
  );

  const delAnnee = seances.filter((s) => partiesJour(s.startsAt).annee === annee);

  // Matrice mois × cabinet.
  const grille: Record<string, Case_[]> = {};
  for (const c of utilises) grille[c.id] = Array.from({ length: 12 }, vide);
  for (const s of delAnnee) {
    const colonne = grille[s.cabinetId];
    if (!colonne) continue;
    const m = partiesJour(s.startsAt).mois - 1;
    const montant = valeur(s);
    const k = colonne[m];
    k.facture += montant;
    k.actes += 1;
    if (s.paymentStatus === "PAID") k.encaisse += montant;
    else if (s.paymentStatus === "OVERDUE") k.retard += montant;
    else k.du += montant;
  }

  const parMois = Array.from({ length: 12 }, (_, m) =>
    utilises.map((c) => grille[c.id][m]).reduce(cumuler, vide()),
  );
  const totalAnnee = parMois.reduce(cumuler, vide());
  const parCabinet = utilises.map((c) => ({
    cabinet: c,
    total: grille[c.id].reduce(cumuler, vide()),
  }));

  const cumulerCas = (parts: typeof delAnnee) =>
    parts.reduce(
      (acc, s) =>
        cumuler(acc, {
          facture: valeur(s),
          encaisse: s.paymentStatus === "PAID" ? valeur(s) : 0,
          du: s.paymentStatus === "DUE" ? valeur(s) : 0,
          retard: s.paymentStatus === "OVERDUE" ? valeur(s) : 0,
          actes: 1,
        }),
      vide(),
    );
  // Une séance sans patient est un bloc facturé à un établissement (voir
  // Cabinet.factureInstitution) : aucun des trois régimes ne s'y applique,
  // elle reçoit sa propre ligne plutôt que de disparaître silencieusement du
  // total.
  const parRegime = [
    ...(["PRIVE", "CONVENTIONNE"] as const).map((r) => ({
      label: SCHEME_LABEL[r],
      total: cumulerCas(delAnnee.filter((s) => s.patient?.scheme === r)),
    })),
    {
      label: "établissement (bloc)",
      total: cumulerCas(delAnnee.filter((s) => !s.patient)),
    },
  ];

  // Résultat : ce qui est facturé (séances des patients et factures aux
  // établissements) moins les dépenses, mois par mois. Les blocs d'un
  // établissement n'ont pas de montant de séance (voir valeur) : ils ne
  // comptent qu'une fois, par leur facture, au mois qu'elle couvre. Une facture
  // annulée ne compte pas.
  const [factures, depenses] = await Promise.all([
    prisma.factureEtablissement.findMany({
      where: { annee, annuleeLe: null },
      select: { mois: true, montantCents: true },
    }),
    prisma.depense.findMany({
      where: {
        date: {
          gte: new Date(Date.UTC(annee - 1, 11, 31)),
          lt: new Date(Date.UTC(annee + 1, 0, 2)),
        },
      },
      select: { date: true, amountCents: true },
    }),
  ]);
  const facturesParMois = Array.from({ length: 12 }, () => 0);
  for (const f of factures) facturesParMois[f.mois - 1] += f.montantCents;
  const depensesParMois = Array.from({ length: 12 }, () => 0);
  for (const d of depenses) {
    const { annee: a, mois } = partiesJour(d.date);
    if (a === annee) depensesParMois[mois - 1] += d.amountCents;
  }
  const resultat = parMois.map((m, i) => ({
    seances: m.facture,
    factures: facturesParMois[i],
    depenses: depensesParMois[i],
    net: m.facture + facturesParMois[i] - depensesParMois[i],
  }));
  const resultatAnnee = resultat.reduce(
    (a, r) => ({
      seances: a.seances + r.seances,
      factures: a.factures + r.factures,
      depenses: a.depenses + r.depenses,
      net: a.net + r.net,
    }),
    { seances: 0, factures: 0, depenses: 0, net: 0 },
  );

  const plafond = Math.max(1, ...parMois.map((m) => m.facture));
  const moisAvecActes = parMois.filter((m) => m.actes > 0).length;

  const cartes = [
    { t: "Facturé", v: euros(totalAnnee.facture) },
    { t: "Encaissé", v: euros(totalAnnee.encaisse), ton: "text-paid" },
    { t: "Reste dû", v: euros(totalAnnee.du + totalAnnee.retard), ton: "text-due" },
    { t: "Actes", v: String(totalAnnee.actes) },
    {
      t: "Moyenne / mois",
      v: euros(moisAvecActes ? Math.round(totalAnnee.facture / moisAvecActes) : 0),
    },
  ];

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Finance</h1>
          <p className="mt-2 text-sm text-ink-muted">
            L’année {annee}, mois par mois et par cabinet. Séances facturables uniquement — heure
            de Bruxelles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/statistiques"
          className="rounded-full border border-line-strong px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text"
        >
          Statistiques d’activité
        </Link>
        <nav aria-label="Année" className="flex items-center gap-1 rounded-full bg-sunken p-1">
          {anneesConnues.map((a) => (
            <Link
              key={a}
              href={`/admin/finance?annee=${a}`}
              aria-current={a === annee ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                a === annee
                  ? "bg-accent text-accent-contrast"
                  : "text-ink-muted hover:text-accent-text"
              }`}
              data-numeric
            >
              {a}
            </Link>
          ))}
        </nav>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cartes.map((c) => (
          <div key={c.t} className="rounded-[14px] border border-line bg-surface px-5 py-4">
            <dt className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
              {c.t}
            </dt>
            <dd className={`mt-1.5 font-mono text-xl font-semibold ${c.ton ?? ""}`} data-numeric>
              {c.v}
            </dd>
          </div>
        ))}
      </dl>

      {/*
        Le graphique est décoratif au sens strict : il ne porte aucune donnée
        que la table qui suit ne donne pas au chiffre près. Il est donc masqué
        aux lecteurs d'écran plutôt que doublé d'une description qui répéterait
        la table mot pour mot.
      */}
      <section className="rounded-[14px] border border-line bg-surface px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Facturé par mois
          </h2>
          <ul className="flex flex-wrap gap-2">
            {utilises.map((c) => (
              <li key={c.id}>
                <CabinetTag cabinet={c} />
              </li>
            ))}
          </ul>
        </div>

        <div
          aria-hidden="true"
          className="mt-5 flex items-end gap-1 border-b border-line-strong/60 pb-2 sm:gap-2"
        >
          {parMois.map((m, i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span
                className="font-mono text-[10px] text-ink-muted tabular-nums"
                data-numeric
              >
                {m.facture > 0 ? Math.round(m.facture / 100) : ""}
              </span>
              {/* Pas de piste grise derrière les barres : un mois sans acte y
                  prenait toute la hauteur en gris et se lisait comme une grande
                  valeur. Il ne reste que la ligne de base. */}
              <div className="flex h-40 w-full flex-col justify-end overflow-hidden rounded-t-[5px]">
                {utilises.map((c) => {
                  const part = grille[c.id][i].facture;
                  if (part === 0) return null;
                  return (
                    <div
                      key={c.id}
                      title={`${MOIS[i]} — ${c.nom} — ${euros(part)}`}
                      style={{
                        height: `${(part / plafond) * 100}%`,
                        background: (c as CabinetVue).vividHex,
                      }}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] text-ink-muted">{MOIS_COURT[i]}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-ink-muted">
          Montants en euros, arrondis à l’unité sur les étiquettes. Hauteur rapportée au meilleur
          mois de l’année ({euros(plafond)}).
        </p>
      </section>

      {/* Sous 900 px : une carte par mois. Douze lignes sur quatre colonnes
          plus une par cabinet ne tiennent pas dans la largeur d'un téléphone,
          et la règle de la maison est qu'aucune vue ne défile de côté. */}
      <ul className="flex flex-col gap-2 md:hidden">
        {parMois.map((m, i) =>
          m.actes === 0 ? null : (
            <li key={i} className="rounded-[14px] border border-line bg-surface px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium capitalize">{MOIS[i]}</p>
                <p className="font-mono text-sm font-semibold" data-numeric>
                  {euros(m.facture)}
                </p>
              </div>
              <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <div className="flex gap-1.5">
                  <dt className="text-ink-muted">encaissé</dt>
                  <dd className="font-mono font-semibold text-paid" data-numeric>
                    {euros(m.encaisse)}
                  </dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="text-ink-muted">reste dû</dt>
                  <dd className="font-mono font-semibold text-due" data-numeric>
                    {euros(m.du + m.retard)}
                  </dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="text-ink-muted">actes</dt>
                  <dd className="font-mono font-semibold" data-numeric>
                    {m.actes}
                  </dd>
                </div>
              </dl>
              <ul className="mt-2.5 flex flex-wrap items-center gap-2">
                {utilises.map((c) =>
                  grille[c.id][i].actes === 0 ? null : (
                    <li key={c.id} className="flex items-center gap-1.5">
                      <CabinetTag cabinet={c} />
                      <span className="font-mono text-xs" data-numeric>
                        {euros(grille[c.id][i].facture)}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </li>
          ),
        )}
      </ul>

      <div className="hidden rounded-[14px] border border-line bg-surface md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Montants facturés et encaissés par mois et par cabinet, année {annee}
          </caption>
          <thead>
            <tr className="border-b border-line bg-sunken text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <th scope="col" className="px-5 py-2.5 text-left font-semibold">
                Mois
              </th>
              {utilises.map((c) => (
                <th key={c.id} scope="col" className="px-3 py-2.5 text-right font-semibold">
                  {c.nom}
                </th>
              ))}
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                Facturé
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                Encaissé
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                Reste dû
              </th>
              <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                Actes
              </th>
            </tr>
          </thead>
          <tbody>
            {parMois.map((m, i) => (
              <tr
                key={i}
                className={`border-b border-line last:border-b-0 ${
                  m.actes === 0 ? "text-ink-muted/60" : "hover:bg-sunken/60"
                }`}
              >
                <th scope="row" className="px-5 py-2.5 text-left font-medium capitalize">
                  {MOIS[i]}
                </th>
                {utilises.map((c) => (
                  <td
                    key={c.id}
                    className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap"
                    data-numeric
                  >
                    {grille[c.id][i].facture > 0 ? euros(grille[c.id][i].facture) : "—"}
                  </td>
                ))}
                <td
                  className="px-3 py-2.5 text-right font-mono whitespace-nowrap"
                  data-numeric
                >
                  {m.facture > 0 ? euros(m.facture) : "—"}
                </td>
                <td
                  className="px-3 py-2.5 text-right font-mono whitespace-nowrap text-paid"
                  data-numeric
                >
                  {m.encaisse > 0 ? euros(m.encaisse) : "—"}
                </td>
                <td
                  className="px-3 py-2.5 text-right font-mono whitespace-nowrap text-due"
                  data-numeric
                >
                  {m.du + m.retard > 0 ? euros(m.du + m.retard) : "—"}
                </td>
                <td className="px-5 py-2.5 text-right font-mono whitespace-nowrap" data-numeric>
                  {m.actes || "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line-strong bg-sunken font-semibold">
              <th scope="row" className="px-5 py-3 text-left">
                Total {annee}
              </th>
              {parCabinet.map(({ cabinet, total }) => (
                <td
                  key={cabinet.id}
                  className="px-3 py-3 text-right font-mono text-xs whitespace-nowrap"
                  data-numeric
                >
                  {euros(total.facture)}
                </td>
              ))}
              <td className="px-3 py-3 text-right font-mono whitespace-nowrap" data-numeric>
                {euros(totalAnnee.facture)}
              </td>
              <td
                className="px-3 py-3 text-right font-mono whitespace-nowrap text-paid"
                data-numeric
              >
                {euros(totalAnnee.encaisse)}
              </td>
              <td
                className="px-3 py-3 text-right font-mono whitespace-nowrap text-due"
                data-numeric
              >
                {euros(totalAnnee.du + totalAnnee.retard)}
              </td>
              <td className="px-5 py-3 text-right font-mono whitespace-nowrap" data-numeric>
                {totalAnnee.actes}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Repartition
          titre="Par cabinet"
          lignes={parCabinet.map(({ cabinet, total }) => ({
            cle: cabinet.id,
            etiquette: <CabinetTag cabinet={cabinet} />,
            total,
            teinte: cabinet.vividHex,
          }))}
          reference={totalAnnee.facture}
        />
        <Repartition
          titre="Par régime"
          lignes={parRegime.map(({ label, total }) => ({
            cle: label,
            etiquette: <span className="text-sm">{label}</span>,
            total,
          }))}
          reference={totalAnnee.facture}
        />
      </div>

      <ResultatNet annee={annee} lignes={resultat} total={resultatAnnee} />

      <p className="text-xs text-ink-muted">
        Une séance pas encore payée compte au tarif de la fiche du patient ; une séance
        conventionnée, au montant versé par l’INAMI. Le fuseau retenu est {FUSEAU} — une séance
        de fin de soirée reste dans son mois.
      </p>
    </div>
  );
}

/** Une répartition : la part de chaque ligne dans le facturé de l'année, en
 *  barre et en pourcentage. La barre reprend la couleur du cabinet quand il y
 *  en a une — c'est la même que dans le graphique juste au-dessus, et deux
 *  codes couleur pour une même donnée sur un même écran se contrediraient. Le
 *  violet d'accent sert de repli pour les répartitions qui n'ont pas de
 *  couleur propre, comme les régimes. */
function Repartition({
  titre,
  lignes,
  reference,
}: {
  titre: string;
  lignes: { cle: string; etiquette: React.ReactNode; total: Case_; teinte?: string }[];
  reference: number;
}) {
  return (
    <section className="rounded-[14px] border border-line bg-surface px-5 py-5">
      <h2 className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
        {titre}
      </h2>
      <ul className="mt-4 flex flex-col gap-3.5">
        {lignes.map(({ cle, etiquette, total, teinte }) => {
          const part = reference > 0 ? total.facture / reference : 0;
          return (
            <li key={cle}>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                {etiquette}
                <p className="text-xs text-ink-muted">
                  <span className="font-mono font-semibold text-ink" data-numeric>
                    {euros(total.facture)}
                  </span>{" "}
                  · {total.actes} acte{total.actes > 1 ? "s" : ""} ·{" "}
                  <span data-numeric>{Math.round(part * 100)} %</span>
                </p>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-sunken">
                <div
                  className={`h-full rounded-full ${teinte ? "" : "bg-accent"}`}
                  style={{
                    width: `${Math.max(part * 100, part > 0 ? 1.5 : 0)}%`,
                    ...(teinte ? { background: teinte } : {}),
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type LigneResultat = { seances: number; factures: number; depenses: number; net: number };

/** Recettes moins dépenses, mois par mois : la vue que demande le comptable.
 *  Les recettes sont celles facturées (pas seulement encaissées), en
 *  séparant les séances des patients des factures aux établissements. */
function ResultatNet({
  annee,
  lignes,
  total,
}: {
  annee: number;
  lignes: LigneResultat[];
  total: LigneResultat;
}) {
  const montant = (n: number) => (n === 0 ? "—" : euros(n));
  const colonnes: { cle: keyof LigneResultat; titre: string; ton?: string }[] = [
    { cle: "seances", titre: "Séances" },
    { cle: "factures", titre: "Établissements" },
    { cle: "depenses", titre: "Dépenses" },
    { cle: "net", titre: "Résultat" },
  ];
  return (
    <section className="rounded-[14px] border border-line bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 pt-5">
        <h2 className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
          Résultat {annee} : recettes facturées moins dépenses
        </h2>
        <p className={`font-mono text-xl font-semibold ${total.net < 0 ? "text-overdue" : ""}`} data-numeric>
          {euros(total.net)}
        </p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Résultat mensuel {annee}</caption>
          <thead>
            <tr className="border-y border-line bg-sunken text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <th scope="col" className="px-5 py-2.5 text-left font-semibold">
                Mois
              </th>
              {colonnes.map((c) => (
                <th key={c.cle} scope="col" className="px-3 py-2.5 text-right font-semibold last:pr-5">
                  {c.titre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => {
              const vide = l.seances === 0 && l.factures === 0 && l.depenses === 0;
              return (
                <tr
                  key={i}
                  className={`border-b border-line ${vide ? "text-ink-muted/60" : "hover:bg-sunken/60"}`}
                >
                  <th scope="row" className="px-5 py-2 text-left font-medium capitalize">
                    {MOIS[i]}
                  </th>
                  {colonnes.map((c) => (
                    <td
                      key={c.cle}
                      className={`px-3 py-2 text-right font-mono text-xs whitespace-nowrap last:pr-5 ${
                        c.cle === "net" && l.net < 0 ? "text-overdue" : ""
                      } ${c.cle === "net" ? "font-semibold" : ""}`}
                      data-numeric
                    >
                      {c.cle === "depenses" && l.depenses > 0 ? `− ${euros(l.depenses)}` : montant(l[c.cle])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line-strong bg-sunken font-semibold">
              <th scope="row" className="px-5 py-3 text-left">
                Total {annee}
              </th>
              {colonnes.map((c) => (
                <td
                  key={c.cle}
                  className={`px-3 py-3 text-right font-mono text-xs whitespace-nowrap last:pr-5 ${
                    c.cle === "net" && total.net < 0 ? "text-overdue" : ""
                  }`}
                  data-numeric
                >
                  {c.cle === "depenses" && total.depenses > 0 ? `− ${euros(total.depenses)}` : montant(total[c.cle])}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
