"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { CareScheme, PaymentMethod, PaymentStatus, SessionStatus } from "@prisma/client";
import { CabinetTag, EtatPaiement, RegimeTag } from "@/components/tags";
import { Encaisser } from "@/components/Encaisser";
import { AnnulerAbsence } from "@/components/AnnulerAbsence";
import { EnTeteTri, type Params } from "@/components/filtres";
import { euros, fmtDateCourte, nomComplet, type CabinetVue } from "@/lib/format";
import { marquerPayeLot } from "@/lib/actions";

export type LigneFacture = {
  id: string;
  patientId: string;
  patient: { firstName: string; lastName: string; scheme: CareScheme };
  cabinet: CabinetVue;
  startsAt: Date;
  status: SessionStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  amountCents: number | null;
  /** Ce que vaudrait la séance si on l'encaissait maintenant : le montant déjà
   *  posé, sinon le tarif du patient. C'est exactement ce que fige l'action
   *  serveur, et donc le seul total honnête à afficher avant de cliquer. */
  montantPrevuCents: number;
  /** Faux pour une séance sans tarif — le conventionné. Elle compte pour zéro
   *  dans le total, ce qui se dit plutôt que de se deviner. */
  montantConnu: boolean;
};

/**
 * Table de facturation avec sélection multiple.
 *
 * La sélection ne porte que sur les lignes impayées : cocher une séance déjà
 * encaissée n'offrirait rien à faire, et le seul geste de lot qui ait un sens
 * ici est l'encaissement.
 *
 * Le mode de paiement est demandé au moment du geste, comme pour une ligne
 * seule — le reçu doit le mentionner, et il n'y a pas de valeur par défaut
 * raisonnable entre espèces et carte.
 */
export function TableFacturation({
  lignes,
  params,
}: {
  lignes: LigneFacture[];
  params: Params;
}) {
  const router = useRouter();
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  const encaissables = useMemo(
    () => lignes.filter((l) => l.paymentStatus !== "PAID"),
    [lignes],
  );

  // La sélection se nettoie d'elle-même : une ligne encaissée entre-temps
  // disparaît de la liste des encaissables et ne doit plus compter dans le
  // total ni dans le compteur.
  const retenus = useMemo(
    () => encaissables.filter((l) => choisis.has(l.id)),
    [encaissables, choisis],
  );
  const total = retenus.reduce((n, l) => n + l.montantPrevuCents, 0);
  const sansMontant = retenus.filter((l) => !l.montantConnu).length;

  const basculer = (id: string) =>
    setChoisis((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toutCocher = (coche: boolean) =>
    setChoisis(coche ? new Set(encaissables.map((l) => l.id)) : new Set());

  const tousCoches = encaissables.length > 0 && retenus.length === encaissables.length;

  const encaisserLot = (methode: "CASH" | "ELECTRONIC") =>
    demarrer(async () => {
      const r = await marquerPayeLot(
        retenus.map((l) => l.id),
        methode,
      );
      if (!r.ok) {
        setErreur(r.message);
        return;
      }
      setErreur(null);
      setChoisis(new Set());
      router.refresh();
    });

  return (
    <>
      {/* Sous 900 px, la table cède la place à des cartes empilées. Six colonnes
          ne tiennent pas dans la largeur d'un téléphone, et un tableau qui
          défile de côté fait défiler la page entière. */}
      <ul className="flex flex-col gap-2 md:hidden">
        {lignes.map((l) => (
          <li
            key={l.id}
            className={`rounded-[14px] border bg-surface px-4 py-3.5 transition-colors ${
              choisis.has(l.id) ? "border-accent bg-accent-soft/40" : "border-line"
            }`}
          >
            <div className="flex items-start gap-3">
              {l.paymentStatus !== "PAID" ? (
                <input
                  type="checkbox"
                  checked={choisis.has(l.id)}
                  onChange={() => basculer(l.id)}
                  aria-label={`Sélectionner la séance de ${nomComplet(l.patient)} du ${fmtDateCourte.format(l.startsAt)}`}
                  className="mt-1 h-4.5 w-4.5 shrink-0 accent-[var(--color-accent)]"
                />
              ) : (
                <span aria-hidden="true" className="mt-1 h-4.5 w-4.5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <Link href={`/admin/patients/${l.patientId}`} className="font-medium">
                    {nomComplet(l.patient)}
                  </Link>
                  <span className="text-sm font-semibold whitespace-nowrap" data-numeric>
                    {euros(l.amountCents)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-ink-muted" data-numeric>
                    {fmtDateCourte.format(l.startsAt)}
                  </span>
                  <CabinetTag cabinet={l.cabinet} />
                  <RegimeTag scheme={l.patient.scheme} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <EtatPaiement
                    status={l.status}
                    payment={l.paymentStatus}
                    methode={l.paymentMethod}
                  />
                  {l.paymentStatus === "PAID" ? (
                    <a
                      href={`/api/recu/${l.id}`}
                      className="rounded-full border border-line-strong px-3 py-1 text-[11px] font-medium"
                    >
                      reçu PDF
                    </a>
                  ) : (
                    <>
                      <Encaisser id={l.id} />
                      {l.status === "NO_SHOW" && <AnnulerAbsence id={l.id} />}
                    </>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden rounded-[14px] border border-line bg-surface md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Séances facturables</caption>
          <thead>
            <tr className="border-b border-line bg-sunken text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <th scope="col" className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={tousCoches}
                  disabled={encaissables.length === 0}
                  onChange={(e) => toutCocher(e.target.checked)}
                  aria-label="Sélectionner toutes les séances impayées"
                  className="h-4 w-4 align-middle accent-[var(--color-accent)] disabled:opacity-30"
                />
              </th>
              <EnTeteTri base="/admin/facturation" params={params} champ="date">Date</EnTeteTri>
              <EnTeteTri base="/admin/facturation" params={params} champ="patient">Patient</EnTeteTri>
              <EnTeteTri base="/admin/facturation" params={params} champ="cabinet">Cabinet</EnTeteTri>
              <EnTeteTri base="/admin/facturation" params={params} champ="regime">Régime</EnTeteTri>
              <EnTeteTri base="/admin/facturation" params={params} champ="montant" aDroite>Montant</EnTeteTri>
              <EnTeteTri base="/admin/facturation" params={params} champ="paiement" aDroite>Paiement</EnTeteTri>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr
                key={l.id}
                className={`border-b border-line last:border-b-0 ${
                  choisis.has(l.id) ? "bg-accent-soft/50" : "hover:bg-sunken/60"
                }`}
              >
                <td className="px-4 py-3">
                  {l.paymentStatus !== "PAID" && (
                    <input
                      type="checkbox"
                      checked={choisis.has(l.id)}
                      onChange={() => basculer(l.id)}
                      aria-label={`Sélectionner la séance de ${nomComplet(l.patient)} du ${fmtDateCourte.format(l.startsAt)}`}
                      className="h-4 w-4 align-middle accent-[var(--color-accent)]"
                    />
                  )}
                </td>
                <td className="px-3 py-3 font-mono text-xs whitespace-nowrap" data-numeric>
                  {fmtDateCourte.format(l.startsAt)}
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/admin/patients/${l.patientId}`}
                    className="font-medium hover:text-accent-text"
                  >
                    {nomComplet(l.patient)}
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <CabinetTag cabinet={l.cabinet} />
                </td>
                <td className="px-3 py-3">
                  <RegimeTag scheme={l.patient.scheme} />
                </td>
                <td className="px-3 py-3 text-right font-mono whitespace-nowrap" data-numeric>
                  {euros(l.amountCents)}
                </td>
                <td className="px-5 py-3">
                  <span className="flex flex-wrap items-center justify-end gap-2">
                    <EtatPaiement
                      status={l.status}
                      payment={l.paymentStatus}
                      methode={l.paymentMethod}
                    />
                    {l.paymentStatus === "PAID" ? (
                      <a
                        href={`/api/recu/${l.id}`}
                        className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:border-accent hover:text-accent-text"
                      >
                        reçu PDF
                      </a>
                    ) : (
                      <>
                        <Encaisser id={l.id} />
                        {l.status === "NO_SHOW" && <AnnulerAbsence id={l.id} />}
                      </>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lignes.length === 0 && (
          <p className="px-6 py-12 text-center text-sm text-ink-muted">
            Aucun acte ne correspond à ces filtres.
          </p>
        )}
      </div>

      {/*
        Barre de lot. Collée en bas de la fenêtre plutôt qu'en haut de la table :
        on coche en descendant la liste, et le geste doit rester sous le pouce
        comme sous la souris, sans avoir à remonter.

        Elle n'existe que s'il y a une sélection — une barre vide en permanence
        prendrait une bande d'écran pour ne rien dire.
      */}
      {retenus.length > 0 && (
        <div className="sans-impression sticky bottom-4 z-30 mx-auto w-full max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-full bg-surface px-5 py-3 shadow-[0_12px_36px_-12px_rgba(27,20,100,0.55)] ring-1 ring-line-strong ring-inset">
            <p className="text-sm">
              <span className="font-semibold" data-numeric>
                {retenus.length}
              </span>{" "}
              séance{retenus.length > 1 ? "s" : ""}
              <span className="text-ink-muted"> · </span>
              <span className="font-mono font-semibold" data-numeric>
                {euros(total)}
              </span>
              {sansMontant > 0 && (
                <span className="text-ink-muted">
                  {" "}
                  · {sansMontant} sans montant
                </span>
              )}
            </p>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setChoisis(new Set())}
                className="rounded-full px-3 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:text-accent-text"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={enCours}
                onClick={() => encaisserLot("CASH")}
                className="rounded-full border border-line-strong px-4 py-1.5 text-[12px] font-semibold transition-colors hover:border-accent hover:text-accent-text disabled:opacity-40"
              >
                Payé en espèces
              </button>
              <button
                type="button"
                disabled={enCours}
                onClick={() => encaisserLot("ELECTRONIC")}
                className="rounded-full bg-accent px-4 py-1.5 text-[12px] font-semibold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-40"
              >
                Payé par carte
              </button>
            </div>
          </div>
          {erreur && (
            <p role="alert" className="mt-2 text-center text-xs font-medium text-overdue">
              {erreur}
            </p>
          )}
        </div>
      )}
    </>
  );
}
