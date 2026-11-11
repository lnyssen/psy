"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { reserverOuDemander, type ResultatRdv } from "@/lib/rdv-actions";
import { CalendrierRdv } from "@/components/CalendrierRdv";

type CabinetChoix = {
  id: string;
  nom: string;
  adresse: string;
  colorHex: string;
  fillHex: string;
  vividHex: string;
};

import type { Jour } from "@/components/CalendrierRdv";

export function PriseRdv({
  cabinets,
  cabinetChoisi,
  jours,
  jeton,
  nomConnu,
  lienInvalide,
  isoDebut,
  isoFin,
}: {
  cabinets: CabinetChoix[];
  cabinetChoisi: string;
  jours: Jour[];
  isoDebut: string;
  isoFin: string;
  jeton: string | null;
  nomConnu: string | null;
  lienInvalide: boolean;
}) {
  const [creneau, setCreneau] = useState<string | null>(null);
  const [pourQui, setPourQui] = useState<"moi" | "enfant">("moi");
  const [resultat, action, enCours] = useActionState<ResultatRdv, FormData>(
    reserverOuDemander,
    null,
  );

  if (resultat?.ok) {
    return (
      <div className="flex flex-col items-start gap-5">
        <h1 className="font-display text-3xl tracking-tight text-titre">C’est noté</h1>
        <p className="max-w-xl text-lg leading-relaxed text-ink-muted">{resultat.message}</p>
        <Link href="/" className="text-sm font-medium text-accent-text hover:underline">
          Retour à l’accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="font-display text-4xl tracking-tight text-titre">Prendre rendez-vous</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
          {nomConnu
            ? `Bonjour ${nomConnu}. Choisissez le créneau qui vous convient : il sera réservé immédiatement.`
            : "Choisissez un lieu puis un créneau. Amandine vous recontactera pour confirmer votre demande."}
        </p>
        {lienInvalide && (
          <p className="mt-4 rounded-[14px] bg-due-soft px-5 py-3 text-sm text-due">
            Votre lien personnel n’est plus valable. Vous pouvez tout de même déposer une demande
            ci-dessous.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-[11px] font-semibold tracking-[0.12em] text-titre uppercase">
          Lieu
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {cabinets.map((c) => {
            const actif = c.id === cabinetChoisi;
            return (
              <Link
                key={c.id}
                href={`/rendez-vous?cabinet=${c.id}${jeton ? `&p=${jeton}` : ""}`}
                aria-current={actif ? "true" : undefined}
                className={`flex flex-col rounded-[16px] border px-5 py-3 transition-colors ${
                  actif
                    ? "border-accent bg-accent text-accent-contrast"
                    : "border-line-strong hover:border-accent hover:text-accent-text"
                }`}
              >
                <span className="font-semibold">{c.nom}</span>
                <span className="mt-0.5 text-xs">{c.adresse}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <form action={action} className="flex flex-col gap-8">
        <input type="hidden" name="cabinetId" value={cabinetChoisi} />
        {jeton && <input type="hidden" name="jeton" value={jeton} />}
        <input type="hidden" name="creneau" value={creneau ?? ""} />

        <section>
          <h2 className="text-[11px] font-semibold tracking-[0.12em] text-titre uppercase">
            Choisir un créneau
          </h2>
          <div className="mt-5">
            <CalendrierRdv
              jours={jours}
              creneau={creneau}
              onChoisir={setCreneau}
              isoDebut={isoDebut}
              isoFin={isoFin}
            />
          </div>
        </section>

        {!jeton && (
          <section className="flex flex-col gap-4">
            <h2 className="text-[11px] font-semibold tracking-[0.12em] text-titre uppercase">
              Pour qui ?
            </h2>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Le rendez-vous est pour">
              {(
                [
                  ["moi", "Pour moi"],
                  ["enfant", "Pour mon enfant"],
                ] as const
              ).map(([v, t]) => (
                <label
                  key={v}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    pourQui === v
                      ? "border-accent bg-accent text-accent-contrast"
                      : "border-line-strong hover:border-accent hover:text-accent-text"
                  }`}
                >
                  <input
                    type="radio"
                    name="pourQui"
                    value={v}
                    checked={pourQui === v}
                    onChange={() => setPourQui(v)}
                    className="sr-only"
                  />
                  {t}
                </label>
              ))}
            </div>

            {pourQui === "enfant" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Champ nom="enfantPrenom" libelle="Prénom de l’enfant" requis />
                <Champ nom="enfantNom" libelle="Nom de l’enfant, s’il diffère du vôtre" />
                <Champ nom="enfantNaissance" libelle="Date de naissance de l’enfant" type="date" requis />
                <label className="flex flex-col gap-1.5">
                  <span className={libelleChamp}>Vous êtes</span>
                  <select name="lienDemandeur" defaultValue="mère" className={champ}>
                    {VOUS_ETES.map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <h2 className="mt-2 text-[11px] font-semibold tracking-[0.12em] text-titre uppercase">
              {pourQui === "enfant" ? "Vos coordonnées (parent ou responsable)" : "Vos coordonnées"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Champ nom="firstName" libelle="Prénom" auto="given-name" requis />
              <Champ nom="lastName" libelle="Nom" auto="family-name" requis />
              <Champ nom="phone" libelle="Téléphone" type="tel" auto="tel" requis />
              <Champ nom="email" libelle="Adresse électronique (facultatif)" type="email" auto="email" />
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={libelleChamp}>Un mot, si vous le souhaitez (facultatif)</span>
              <textarea
                name="message"
                rows={3}
                className="w-full resize-y rounded-[14px] border border-line bg-surface px-4 py-3 text-sm"
              />
            </label>
            <p className="text-xs leading-relaxed text-ink-muted">
              Ces informations servent uniquement à traiter votre demande. Elles sont conservées en
              Europe, ne sont transmises à personne, et sont effacées si la demande n’aboutit pas.
              N’écrivez rien ici que vous ne voudriez pas voir conservé par écrit : ce qui relève
              du motif se dira en séance.
            </p>
          </section>
        )}

        {resultat && !resultat.ok && (
          <p role="alert" className="text-sm text-overdue">
            {resultat.message}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={!creneau || enCours}
            className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {enCours
              ? "Envoi…"
              : jeton
                ? "Réserver ce créneau"
                : "Envoyer ma demande"}
          </button>
          {!creneau && (
            <p className="mt-2 text-xs text-ink-muted">Choisissez d’abord un créneau.</p>
          )}
        </div>
      </form>
    </div>
  );
}

const champ = "w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm";

const libelleChamp = "text-xs font-medium text-ink-muted";

/** Un champ avec son libellé au-dessus, toujours visible : un texte d'exemple
 *  qui s'efface dès qu'on tape laisse sur téléphone un formulaire muet. */
function Champ({
  nom,
  libelle,
  type = "text",
  auto,
  requis,
}: {
  nom: string;
  libelle: string;
  type?: string;
  auto?: string;
  requis?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={libelleChamp}>{libelle}</span>
      <input name={nom} type={type} autoComplete={auto} required={requis} className={champ} />
    </label>
  );
}

/** Le lien du demandeur avec l'enfant : il devient le lien du responsable 1
 *  de la fiche (voir lib/liens.ts). */
const VOUS_ETES = [
  ["mère", "sa mère"],
  ["père", "son père"],
  ["belle-mère", "sa belle-mère"],
  ["beau-père", "son beau-père"],
  ["tuteur ou tutrice", "son tuteur ou sa tutrice"],
  ["grand-parent", "un grand-parent"],
  ["famille d’accueil", "sa famille d’accueil"],
  ["autre", "autre"],
] as const;
