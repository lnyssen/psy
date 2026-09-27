import type { CareScheme } from "@prisma/client";
import { prisma } from "@/lib/db";
import { GroupeFiltre, TriMobile, type Params } from "@/components/filtres";
import { FiltresMobile } from "@/components/FiltresMobile";
import { TableFacturation, type LigneFacture } from "@/components/TableFacturation";
import { OngletsFacturation } from "@/components/OngletsFacturation";
import { cabinetsActifs, optionsCabinet } from "@/lib/cabinets";
import { euros, isBillable } from "@/lib/format";
import { Pagination, pageDe, tailleDePage } from "@/components/Pagination";

export const dynamic = "force-dynamic";

export default async function Facturation({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;

  const toutes = await prisma.session.findMany({
    where: {
      // Un bloc facturé à un établissement n'a pas de patient et ne se
      // facture pas ici : il relève de /admin/etablissements, son propre
      // onglet, avec sa propre logique de facture numérotée.
      patientId: { not: null },
      ...(params.cabinet ? { cabinetId: params.cabinet } : {}),
      ...(params.regime ? { patient: { scheme: params.regime as CareScheme } } : {}),
      ...(params.paiement
        ? { paymentStatus: params.paiement as "DUE" | "PAID" | "OVERDUE" }
        : {}),
    },
    include: { patient: true, cabinet: true },
  });
  const cabinets = await cabinetsActifs();

  // Une séance à venir ou annulée à temps n'est pas un acte facturable : elle
  // n'a rien à faire dans cette table. Le filtre patientId ci-dessus garantit
  // déjà que patient n'est jamais nul ici.
  const seances = toutes.filter(
    (s): s is typeof s & { patient: NonNullable<typeof s.patient> } => isBillable(s.status) && s.patient !== null,
  );

  const sens = params.sens === "desc" ? -1 : 1;
  const comparateurs: Record<string, (a: (typeof seances)[number], b: (typeof seances)[number]) => number> = {
    date: (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
    patient: (a, b) => a.patient.lastName.localeCompare(b.patient.lastName, "fr"),
    cabinet: (a, b) => a.cabinet.nom.localeCompare(b.cabinet.nom, "fr"),
    regime: (a, b) => a.patient.scheme.localeCompare(b.patient.scheme),
    montant: (a, b) => (a.amountCents ?? 0) - (b.amountCents ?? 0),
    paiement: (a, b) => a.paymentStatus.localeCompare(b.paymentStatus),
  };
  const tri = comparateurs[params.tri ?? "date"] ?? comparateurs.date;
  seances.sort((a, b) => tri(a, b) * (params.tri ? sens : -1));

  const somme = (f: typeof seances) => f.reduce((n, s) => n + (s.amountCents ?? 0), 0);
  const cartes = [
    { t: "Encaissé", v: euros(somme(seances.filter((s) => s.paymentStatus === "PAID"))) },
    { t: "Dû", v: euros(somme(seances.filter((s) => s.paymentStatus === "DUE"))), ton: "text-due" },
    {
      t: "En retard",
      v: euros(somme(seances.filter((s) => s.paymentStatus === "OVERDUE"))),
      ton: "text-overdue",
    },
    { t: "Actes", v: String(seances.length) },
  ];

  // Ce que la table reçoit : le strict nécessaire, à plat. Le montant prévu est
  // celui que figerait un encaissement — montant déjà posé, sinon tarif du
  // patient — pour que le total de la sélection dise la vérité avant le clic.
  const lignes: LigneFacture[] = seances.map((s) => ({
    id: s.id,
    // Non nul : le filtre patientId ci-dessus l'a déjà garanti.
    patientId: s.patientId!,
    patient: {
      firstName: s.patient.firstName,
      lastName: s.patient.lastName,
      scheme: s.patient.scheme,
    },
    cabinet: s.cabinet,
    startsAt: s.startsAt,
    status: s.status,
    paymentStatus: s.paymentStatus,
    paymentMethod: s.paymentMethod,
    amountCents: s.amountCents,
    montantPrevuCents: s.amountCents ?? s.patient.feeCents ?? 0,
    // Une séance conventionnée n'a pas de tarif : l'encaisser ne pose aucun
    // montant. Le signaler plutôt que de la compter pour zéro en silence.
    montantConnu: (s.amountCents ?? s.patient.feeCents) !== null,
  }));

  return (
    <div className="flex flex-col gap-7">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Facturation</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Séances facturables uniquement. Les annulations à temps et les séances à venir n’y
          figurent pas.
        </p>
        <div className="mt-4">
          <OngletsFacturation actif="patients" />
        </div>
      </header>

      <FiltresMobile
        base="/admin/facturation"
        params={params}
        groupes={[
            {
              cle: "paiement",
              libelle: "Paiement",
              tout: "Tous les paiements",
              options: [
                { valeur: "DUE", label: "dû" },
                { valeur: "OVERDUE", label: "en retard" },
                { valeur: "PAID", label: "payé" },
              ],
            },
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
          base="/admin/facturation"
          params={params}
          cle="paiement"
          libelle="Paiement"
          options={[
            { valeur: "DUE", label: "dû" },
            { valeur: "OVERDUE", label: "en retard" },
            { valeur: "PAID", label: "payé" },
          ]}
        />
        <GroupeFiltre
          base="/admin/facturation"
          params={params}
          cle="cabinet"
          libelle="Cabinet"
          options={optionsCabinet(cabinets)}
        />
        <GroupeFiltre
          base="/admin/facturation"
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

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      <TriMobile
        base="/admin/facturation"
        params={params}
        champs={[
          { champ: "date", label: "date" },
          { champ: "patient", label: "patient" },
          { champ: "montant", label: "montant" },
          { champ: "paiement", label: "paiement" },
        ]}
      />

      <TableFacturation lignes={lignes} params={params} />

      <p className="text-xs text-ink-muted">
        Les séances conventionnées n’affichent pas de montant : le circuit de facturation au
        réseau reste à établir. Le reçu n’est pas une attestation de soins, et les prestations de
        psychologue sont exonérées de TVA.
      </p>
    </div>
  );
}
