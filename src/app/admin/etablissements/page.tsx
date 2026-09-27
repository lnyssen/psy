import Link from "next/link";
import { prisma } from "@/lib/db";
import { TitreSection } from "@/components/tags";
import {
  annulerFactureEtablissement,
  emettreFactureEtablissement,
  enregistrerFactureEtablissementManuelle,
  marquerFacturePayee,
} from "@/lib/actions";
import { adresseCabinet, euros, fmtDateCourte, formatDuree, partiesJour } from "@/lib/format";
import { heuresFacturablesSemaine } from "@/lib/quotas";
import { IconChevronDroite, IconChevronGauche } from "@/components/icons";
import { OngletsFacturation } from "@/components/OngletsFacturation";

export const dynamic = "force-dynamic";

const champ =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted/60";
const libelleChamp = "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";

function moisDeParam(v: string | undefined) {
  if (v && /^\d{4}-\d{2}$/.test(v)) return v;
  const { annee, mois } = partiesJour(new Date());
  return `${annee}-${String(mois).padStart(2, "0")}`;
}

function decalerMois(iso: string, n: number) {
  const [a, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MOIS_LABEL = new Intl.DateTimeFormat("fr-BE", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const fmtMoisSeul = new Intl.DateTimeFormat("fr-BE", { month: "long", timeZone: "UTC" });
const MOIS_LABEL_COURT = Array.from({ length: 12 }, (_, i) =>
  fmtMoisSeul.format(new Date(Date.UTC(2024, i, 1))),
);

function numeroFacture(annee: number, numero: number) {
  return `${annee}-${String(numero).padStart(3, "0")}`;
}

/**
 * Facturation à un établissement — l'école, aujourd'hui la seule.
 *
 * Une facture, ici, est une pièce comptable réelle : numérotée sans trou ni
 * remise à zéro, figée à l'émission, et conservée — pas un calcul refait à
 * chaque ouverture de la page. Voir le commentaire du modèle
 * FactureEtablissement et de emettreFactureEtablissement.
 */
export default async function Etablissements({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const { mois: moisParam } = await searchParams;
  const mois = moisDeParam(moisParam);
  const [annee, m] = mois.split("-").map(Number);
  const debut = new Date(Date.UTC(annee, m - 1, 1));
  const fin = new Date(Date.UTC(annee, m, 1));

  const [cabinets, factures] = await Promise.all([
    prisma.cabinet.findMany({ where: { factureInstitution: true }, orderBy: { ordre: "asc" } }),
    prisma.factureEtablissement.findMany({
      include: { cabinet: true, seances: { select: { id: true } } },
      orderBy: [{ annee: "desc" }, { numero: "desc" }],
    }),
  ]);

  const aFacturer = await Promise.all(
    cabinets.map(async (c) => {
      const seances = await prisma.session.findMany({
        where: {
          cabinetId: c.id,
          startsAt: { gte: debut, lt: fin },
          status: { in: ["ATTENDED", "NO_SHOW"] },
          factureId: null,
        },
        select: { durationMin: true, status: true },
      });
      const heures = heuresFacturablesSemaine(seances);
      const montant = c.tarifHoraireCents ? Math.round(heures * c.tarifHoraireCents) : null;
      return { cabinet: c, heures, montant, nb: seances.length };
    }),
  );

  const maintenant = new Date();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Établissements</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Facturation à un établissement, hors TVA — les prestations de psychologue en sont
          exonérées (art. 44 du Code de la TVA). Une facture émise est numérotée et ne change plus.
        </p>
        <div className="mt-4">
          <OngletsFacturation actif="etablissements" />
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex items-center gap-1">
            <Link
              href={`/admin/etablissements?mois=${decalerMois(mois, -1)}`}
              aria-label="Mois précédent"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
            >
              <IconChevronGauche />
            </Link>
            <Link
              href={`/admin/etablissements?mois=${decalerMois(mois, 1)}`}
              aria-label="Mois suivant"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
            >
              <IconChevronDroite />
            </Link>
          </div>
          <h2 className="text-lg font-semibold tracking-tight capitalize" data-numeric>
            À facturer — {MOIS_LABEL.format(debut)}
          </h2>
        </div>

        {cabinets.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-muted">
            Aucun lieu n’est réglé « facturé à l’heure à un établissement ». Réglez-le depuis
            Réglages → Lieux.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {aFacturer.map(({ cabinet: c, heures, montant, nb }) => (
              <li key={c.id} className="rounded-[14px] border border-line bg-surface px-5 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{c.nom}</p>
                    <p className="text-xs text-ink-muted">{adresseCabinet(c)}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
                        Heures
                      </p>
                      <p className="font-mono text-lg font-semibold" data-numeric>
                        {formatDuree(heures)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
                        Montant
                      </p>
                      <p className="font-mono text-lg font-semibold text-accent-text" data-numeric>
                        {montant !== null ? euros(montant) : "tarif horaire non réglé"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                  <span className="text-xs text-ink-muted" data-numeric>
                    {nb} acte{nb > 1 ? "s" : ""} non encore facturé{nb > 1 ? "s" : ""}
                  </span>
                  {nb > 0 && montant !== null && (
                    <form action={emettreFactureEtablissement.bind(null, c.id, annee, m)}>
                      <button
                        type="submit"
                        className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
                      >
                        Émettre la facture
                      </button>
                    </form>
                  )}
                  {nb === 0 && (
                    <span className="text-xs text-ink-muted">Tout est déjà facturé ce mois-ci.</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {cabinets.length > 0 && (
        <section className="flex flex-col gap-4">
          <div>
            <TitreSection>Nouvelle facture manuelle</TitreSection>
            <p className="mt-2 text-sm text-ink-muted">
              Pour un supplément ponctuel, une régularisation — tout ce qui ne vient pas d’un
              décompte de séances. Aucun créneau dans l’agenda n’est nécessaire : le montant se
              saisit directement.
            </p>
          </div>
          <form
            action={enregistrerFactureEtablissementManuelle}
            className="flex flex-col gap-4 rounded-[14px] border border-dashed border-line-strong bg-surface px-5 py-4"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="lg:max-w-48">
                <span className={libelleChamp}>Établissement</span>
                <select name="cabinetId" required defaultValue={cabinets[0]?.id} className={`mt-1 ${champ}`}>
                  {cabinets.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lg:max-w-32">
                <span className={libelleChamp}>Mois</span>
                <select name="mois" defaultValue={m} className={`mt-1 ${champ}`}>
                  {MOIS_LABEL_COURT.map((label, i) => (
                    <option key={label} value={i + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lg:max-w-24">
                <span className={libelleChamp}>Année</span>
                <input
                  name="annee"
                  type="number"
                  defaultValue={annee}
                  required
                  className={`mt-1 ${champ}`}
                />
              </label>
              <label>
                <span className={libelleChamp}>Échéance</span>
                <input name="echeance" type="date" className={`mt-1 ${champ}`} />
                <span className="mt-1 block text-[11px] text-ink-muted">
                  Vide : le délai réglé dans Réglages s’applique.
                </span>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="sm:col-span-2">
                <span className={libelleChamp}>Libellé</span>
                <input
                  name="libelle"
                  required
                  placeholder="Supplément octobre"
                  className={`mt-1 ${champ}`}
                />
              </label>
              <label className="lg:max-w-40">
                <span className={libelleChamp}>Montant (€)</span>
                <input name="montant" type="number" step="0.01" min="0" required className={`mt-1 ${champ}`} />
              </label>
            </div>

            <label>
              <span className={libelleChamp}>Commentaire (facultatif, jamais imprimé)</span>
              <textarea
                name="commentaire"
                rows={2}
                placeholder="Pour toi seule — le contexte de cette facture."
                className={`mt-1 ${champ} resize-y rounded-[14px] leading-snug`}
              />
            </label>

            <button
              type="submit"
              className="self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              Émettre
            </button>
          </form>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <TitreSection>Historique des factures</TitreSection>
        {factures.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-muted">
            Aucune facture émise pour l’instant.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
            {factures.map((f) => {
              const enRetard = !f.payeeLe && !f.annuleeLe && f.echeanceLe < maintenant;
              const modifiable = !f.payeeLe && !f.annuleeLe;
              return (
                <li
                  key={f.id}
                  className="flex flex-col gap-2 border-b border-line px-5 py-3.5 last:border-b-0"
                >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="w-20 shrink-0 font-mono text-xs font-semibold" data-numeric>
                    {numeroFacture(f.annee, f.numero)}
                  </span>
                  <span className="min-w-32 flex-1 text-sm">
                    {f.cabinet.nom}
                    {f.manuelle && <span className="ml-1.5 text-xs text-ink-muted">— {f.libelle}</span>}
                  </span>
                  <span className="text-xs text-ink-muted capitalize" data-numeric>
                    {MOIS_LABEL.format(new Date(Date.UTC(f.annee, f.mois - 1, 1)))}
                  </span>
                  <span className="font-mono text-sm font-semibold" data-numeric>
                    {euros(f.montantCents)}
                  </span>
                  <span className="text-xs text-ink-muted" data-numeric>
                    émise le {fmtDateCourte.format(f.emiseLe)}
                  </span>
                  {f.annuleeLe ? (
                    <span className="rounded-full bg-sunken px-2.5 py-0.5 text-[11px] font-semibold text-ink-muted line-through">
                      annulée
                    </span>
                  ) : f.payeeLe ? (
                    <span className="rounded-full bg-paid-soft px-2.5 py-0.5 text-[11px] font-semibold text-paid">
                      payée le {fmtDateCourte.format(f.payeeLe)}
                    </span>
                  ) : (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        enRetard ? "bg-overdue-soft text-overdue" : "bg-due-soft text-due"
                      }`}
                    >
                      {enRetard ? "en retard" : `échéance ${fmtDateCourte.format(f.echeanceLe)}`}
                    </span>
                  )}
                  <a
                    href={`/api/facture-etablissement/${f.id}`}
                    className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:border-accent hover:text-accent-text"
                  >
                    PDF
                  </a>
                  {modifiable && (
                    <form action={marquerFacturePayee.bind(null, f.id)}>
                      <button
                        type="submit"
                        className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:border-accent hover:text-accent-text"
                      >
                        marquer payée
                      </button>
                    </form>
                  )}
                  {modifiable && (
                    <form action={annulerFactureEtablissement}>
                      <input type="hidden" name="id" value={f.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-overdue hover:text-overdue"
                      >
                        annuler
                      </button>
                    </form>
                  )}
                </div>

                {f.commentaire && (
                  <p className="pl-24 text-xs text-ink-muted">{f.commentaire}</p>
                )}

                {modifiable && (
                  <details className="text-xs">
                    <summary className="w-fit cursor-pointer text-ink-muted transition-colors hover:text-accent-text">
                      éditer
                    </summary>
                    <form
                      action={enregistrerFactureEtablissementManuelle}
                      className="mt-2 grid gap-3 rounded-[14px] border border-line bg-sunken px-4 py-3 sm:grid-cols-3"
                    >
                      <input type="hidden" name="id" value={f.id} />
                      <label>
                        <span className={libelleChamp}>Libellé</span>
                        <input
                          name="libelle"
                          defaultValue={f.libelle ?? `Vacations ${MOIS_LABEL.format(new Date(Date.UTC(f.annee, f.mois - 1, 1)))}`}
                          required
                          className={`mt-1 ${champ}`}
                        />
                      </label>
                      <label>
                        <span className={libelleChamp}>Montant (€)</span>
                        <input
                          name="montant"
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={(f.montantCents / 100).toFixed(2)}
                          required
                          className={`mt-1 ${champ}`}
                        />
                      </label>
                      <label>
                        <span className={libelleChamp}>Échéance</span>
                        <input
                          name="echeance"
                          type="date"
                          defaultValue={f.echeanceLe.toISOString().slice(0, 10)}
                          className={`mt-1 ${champ}`}
                        />
                      </label>
                      <label className="sm:col-span-3">
                        <span className={libelleChamp}>Commentaire (facultatif, jamais imprimé)</span>
                        <textarea
                          name="commentaire"
                          rows={2}
                          defaultValue={f.commentaire ?? ""}
                          className={`mt-1 ${champ} resize-y rounded-[14px] leading-snug`}
                        />
                      </label>
                      <button
                        type="submit"
                        className="self-start rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
                      >
                        Enregistrer
                      </button>
                    </form>
                  </details>
                )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
