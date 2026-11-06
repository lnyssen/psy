import Link from "next/link";
import type { CareScheme } from "@prisma/client";
import { prisma } from "@/lib/db";
import { trouverDoublons } from "@/lib/doublons";
import { AbsencesTag, CabinetTag, RegimeTag } from "@/components/tags";
import { SEUIL_ABSENCES, compterAbsences } from "@/lib/absences";
import {
  EnTeteTri,
  GroupeFiltre,
  TriMobile,
  type Params,
} from "@/components/filtres";
import { FiltresMobile } from "@/components/FiltresMobile";
import { cabinetsActifs, optionsCabinet } from "@/lib/cabinets";
import { euros, isBillable, nomComplet } from "@/lib/format";
import { montantSeanceCents, payeurDe } from "@/lib/tarifs";
import { Pagination, pageDe, tailleDePage } from "@/components/Pagination";
import { archiverPlusieurs } from "@/lib/archive-actions";

export const dynamic = "force-dynamic";

export default async function Patients({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  // « supprime » n'est pas un filtre : il ne doit pas suivre dans les liens.
  const { supprime, ...params } = await searchParams;
  const vueArchives = params.archives === "1";

  const nbDoublons = (await trouverDoublons()).length;
  const patients = await prisma.patient.findMany({
    where: {
      active: !vueArchives,
      ...(params.cabinet ? { cabinetId: params.cabinet } : {}),
      ...(params.regime ? { scheme: params.regime as CareScheme } : {}),
    },
    include: { sessions: true, patientNotes: true, cabinet: true, tarif: true },
  });
  // Un lieu facturé à un établissement (l'école) n'a pas de patientèle propre
  // depuis que ses séances ne tiennent plus à un patient : le filtrer ici
  // plutôt que proposer un cabinet qui ne ramènera jamais un dossier.
  const cabinets = (await cabinetsActifs()).filter(
    (c) => !c.factureInstitution,
  );

  // Le tri se fait ici plutôt qu'en base : deux des colonnes triables (nombre
  // de séances, solde dû) sont calculées et n'existent pas comme champs.
  const enrichis = patients.map((p) => ({
    p,
    seances: p.sessions.length,
    absences: compterAbsences(p.sessions),
    // Ce que DOIT le patient : jamais une séance conventionnée, que paie l'INAMI.
    du:
      payeurDe(p.scheme) === "INAMI"
        ? 0
        : p.sessions
            .filter((s) => isBillable(s.status) && s.paymentStatus !== "PAID")
            .reduce(
              (n, s) => n + (s.amountCents ?? montantSeanceCents(p) ?? 0),
              0,
            ),
  }));

  // Dormant : aucune séance depuis six mois ni à venir, et un dossier ouvert
  // depuis plus longtemps que ça (un nouveau patient sans séance n'en est pas
  // un). Proposés à l'archive, jamais archivés d'office.
  const maintenant = new Date();
  const ilYaSixMois = new Date(maintenant);
  ilYaSixMois.setMonth(ilYaSixMois.getMonth() - 6);
  const dormants = vueArchives
    ? []
    : enrichis.filter(
        ({ p }) =>
          p.createdAt < ilYaSixMois &&
          !p.sessions.some((s) => s.startsAt >= ilYaSixMois),
      );
  const nbArchives = vueArchives
    ? enrichis.length
    : await prisma.patient.count({ where: { active: false, anonymiseAt: null } });
  if (params.dormants === "1" && !vueArchives) {
    const ids = new Set(dormants.map((d) => d.p.id));
    enrichis.splice(0, enrichis.length, ...enrichis.filter((e) => ids.has(e.p.id)));
  }

  const sens = params.sens === "desc" ? -1 : 1;
  const comparateurs: Record<
    string,
    (a: (typeof enrichis)[number], b: (typeof enrichis)[number]) => number
  > = {
    nom: (a, b) => a.p.lastName.localeCompare(b.p.lastName, "fr"),
    seances: (a, b) => a.seances - b.seances,
    du: (a, b) => a.du - b.du,
    cabinet: (a, b) =>
      (a.p.cabinet?.nom ?? "").localeCompare(b.p.cabinet?.nom ?? "", "fr"),
    regime: (a, b) => a.p.scheme.localeCompare(b.p.scheme),
  };
  const tri = comparateurs[params.tri ?? "nom"] ?? comparateurs.nom;
  enrichis.sort((a, b) => tri(a, b) * sens);

  const taille = tailleDePage(params);
  const page = Math.min(
    pageDe(params),
    Math.max(1, Math.ceil(enrichis.length / taille)),
  );
  const pageActuelle = enrichis.slice((page - 1) * taille, page * taille);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">
            {vueArchives ? "Patients archivés" : "Patients"}
          </h1>
          <p className="mt-2 flex flex-wrap gap-x-3 text-sm text-ink-muted" data-numeric>
            <span>
              {enrichis.length} dossier{enrichis.length > 1 ? "s" : ""}.
            </span>
            {vueArchives ? (
              <Link href="/admin/patients" className="underline-offset-2 hover:text-accent-text hover:underline">
                ← Patients actifs
              </Link>
            ) : (
              nbArchives > 0 && (
                <Link
                  href="/admin/patients?archives=1"
                  className="underline-offset-2 hover:text-accent-text hover:underline"
                >
                  {nbArchives} archivé{nbArchives > 1 ? "s" : ""}
                </Link>
              )
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {nbDoublons > 0 && (
            <Link
              href="/admin/patients/doublons"
              className="rounded-full border border-due/50 bg-due-soft px-5 py-2.5 text-sm font-medium text-due transition-colors hover:border-due"
            >
              {nbDoublons} doublon{nbDoublons > 1 ? "s" : ""} possible
              {nbDoublons > 1 ? "s" : ""}
            </Link>
          )}
          <Link
            href="/admin/patients/import"
            className="rounded-full border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:bg-sunken"
          >
            Importer (Excel)
          </Link>
          <Link
            href="/admin/patients/nouveau"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            Nouveau patient
          </Link>
        </div>
      </header>

      {supprime === "1" && (
        <p
          role="status"
          className="rounded-[10px] border border-paid/40 bg-paid-soft px-4 py-2.5 text-sm text-paid"
        >
          Le patient a été supprimé.
        </p>
      )}

      {!vueArchives && dormants.length > 0 && params.dormants !== "1" && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] border border-line bg-sunken px-4 py-2.5 text-sm text-ink-muted">
          {dormants.length} patient{dormants.length > 1 ? "s" : ""} sans séance depuis six mois.
          <Link
            href="/admin/patients?dormants=1"
            className="font-medium text-ink underline-offset-2 hover:text-accent-text hover:underline"
          >
            Les voir pour archiver
          </Link>
        </p>
      )}
      {params.dormants === "1" && !vueArchives && (
        <form
          action={archiverPlusieurs}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] border border-line bg-sunken px-4 py-2.5 text-sm text-ink-muted"
        >
          {dormants.map((d) => (
            <input key={d.p.id} type="hidden" name="id" value={d.p.id} />
          ))}
          <span>
            Sans séance depuis six mois. Archiver les retire de la liste et de l’agenda, sans rien
            effacer ; chaque dossier se réactive depuis sa fiche.
          </span>
          {dormants.length > 0 && (
            <button
              type="submit"
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              Archiver les {dormants.length}
            </button>
          )}
          <Link href="/admin/patients" className="text-xs hover:text-accent-text">
            Annuler
          </Link>
        </form>
      )}

      <FiltresMobile
        base="/admin/patients"
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
            ],
          },
        ]}
      />

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <GroupeFiltre
          base="/admin/patients"
          params={params}
          cle="cabinet"
          libelle="Cabinet"
          options={optionsCabinet(cabinets)}
        />
        <GroupeFiltre
          base="/admin/patients"
          params={params}
          cle="regime"
          libelle="Régime"
          options={[
            { valeur: "PRIVE", label: "privé" },
            { valeur: "CONVENTIONNE", label: "conventionné" },
          ]}
        />
      </div>

      <TriMobile
        base="/admin/patients"
        params={params}
        champs={[
          { champ: "nom", label: "nom" },
          { champ: "seances", label: "séances" },
          { champ: "du", label: "dû" },
        ]}
      />

      {/* Cartes empilées sous 900 px, pour la même raison que la facturation. */}
      <ul className="flex flex-col gap-2 md:hidden">
        {pageActuelle.map(({ p, seances, du, absences }) => (
          <li key={p.id}>
            <Link
              href={`/admin/patients/${p.id}`}
              className="flex flex-col gap-2 rounded-[14px] border border-line bg-surface px-4 py-3.5"
            >
              <span className="flex items-center gap-3">
                <span className="flex-1 font-medium">{nomComplet(p)}</span>
                <span
                  className={`text-sm font-semibold ${du > 0 ? "text-due" : "text-ink-muted"}`}
                  data-numeric
                >
                  {du > 0 ? euros(du) : ""}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {p.cabinet && <CabinetTag cabinet={p.cabinet} />}
                <RegimeTag scheme={p.scheme} />
                {absences >= SEUIL_ABSENCES && <AbsencesTag n={absences} />}
                <span className="text-xs text-ink-muted" data-numeric>
                  {seances} séance{seances > 1 ? "s" : ""}
                </span>
                {p.phone && (
                  <span className="text-xs text-ink-muted" data-numeric>
                    {p.phone}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-[14px] border border-line bg-surface md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-sunken text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <EnTeteTri base="/admin/patients" params={params} champ="nom">
                Patient
              </EnTeteTri>
              <EnTeteTri base="/admin/patients" params={params} champ="cabinet">
                Cabinet
              </EnTeteTri>
              <EnTeteTri base="/admin/patients" params={params} champ="regime">
                Régime
              </EnTeteTri>
              <th scope="col" className="px-3 py-2.5 text-left font-semibold">
                Téléphone
              </th>
              <EnTeteTri
                base="/admin/patients"
                params={params}
                champ="seances"
                aDroite
              >
                Séances
              </EnTeteTri>
              <EnTeteTri
                base="/admin/patients"
                params={params}
                champ="du"
                aDroite
              >
                Dû
              </EnTeteTri>
            </tr>
          </thead>
          <tbody>
            {pageActuelle.map(({ p, seances, du, absences }) => (
              <tr
                key={p.id}
                className="border-b border-line last:border-b-0 hover:bg-sunken/60"
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/patients/${p.id}`}
                    className="font-medium"
                  >
                    {nomComplet(p)}
                  </Link>
                  {absences >= SEUIL_ABSENCES && (
                    <span className="ml-2 align-middle">
                      <AbsencesTag n={absences} />
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {p.cabinet ? <CabinetTag cabinet={p.cabinet} /> : "—"}
                </td>
                <td className="px-3 py-3">
                  <RegimeTag scheme={p.scheme} />
                </td>
                <td className="px-3 py-3 font-mono text-xs whitespace-nowrap text-ink-muted">
                  {p.phone ?? "—"}
                </td>
                <td className="px-3 py-3 text-right" data-numeric>
                  {seances}
                </td>
                <td
                  className={`px-5 py-3 text-right font-semibold ${du > 0 ? "text-due" : "text-ink-muted"}`}
                  data-numeric
                >
                  {du > 0 ? euros(du) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {enrichis.length === 0 && (
        <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-muted">
          Aucun patient ne correspond à ces filtres.
        </p>
      )}

      <Pagination
        base="/admin/patients"
        params={params}
        total={enrichis.length}
        taille={taille}
      />
    </div>
  );
}
