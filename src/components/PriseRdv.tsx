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
}: {
  cabinets: CabinetChoix[];
  cabinetChoisi: string;
  jours: Jour[];
  jeton: string | null;
  nomConnu: string | null;
  lienInvalide: boolean;
}) {
  const [creneau, setCreneau] = useState<string | null>(null);
  const [resultat, action, enCours] = useActionState<ResultatRdv, FormData>(
    reserverOuDemander,
    null,
  );

  if (resultat?.ok) {
    return (
      <div className="flex flex-col items-start gap-5">
        <h1 className="font-display text-3xl tracking-tight">C’est noté</h1>
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
        <h1 className="font-display text-4xl tracking-tight">Prendre rendez-vous</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
          {nomConnu
            ? `Bonjour ${nomConnu}. Choisissez le créneau qui vous convient : il sera réservé immédiatement.`
            : "Choisissez un lieu puis un créneau. Votre demande sera confirmée par retour de courriel."}
        </p>
        {lienInvalide && (
          <p className="mt-4 rounded-[14px] bg-due-soft px-5 py-3 text-sm text-due">
            Votre lien personnel n’est plus valable. Vous pouvez tout de même déposer une demande
            ci-dessous.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
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
                style={
                  {
                    "--cab": c.colorHex,
                    "--cab-vif": c.vividHex,
                    ...(actif
                      ? { backgroundColor: "var(--cab)", borderColor: "var(--cab)", color: "#fff" }
                      : { borderColor: "color-mix(in srgb, var(--cab-vif) 55%, transparent)" }),
                  } as unknown as React.CSSProperties
                }
                className={`flex flex-col rounded-[14px] border px-5 py-3 transition-colors ${
                  actif ? "" : "texte-cabinet"
                }`}
              >
                <span className="font-semibold">{c.nom}</span>
                <span className="mt-0.5 text-xs opacity-80">{c.adresse}</span>
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
          <h2 className="text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
            Choisir un créneau
          </h2>
          <div className="mt-5">
            <CalendrierRdv jours={jours} creneau={creneau} onChoisir={setCreneau} />
          </div>
        </section>

        {!jeton && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
              Vos coordonnées
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="firstName" placeholder="Prénom" required className={champ} />
              <input name="lastName" placeholder="Nom" required className={champ} />
              <input name="email" type="email" placeholder="Adresse électronique" required className={champ} />
              <input name="phone" type="tel" placeholder="Téléphone (facultatif)" className={champ} />
            </div>
            <textarea
              name="message"
              rows={3}
              placeholder="Un mot, si vous le souhaitez (facultatif)"
              className="w-full resize-y rounded-[14px] border border-line bg-surface px-4 py-3 text-sm"
            />
            <p className="text-xs leading-relaxed text-ink-muted">
              Ces informations servent uniquement à traiter votre demande. Elles sont conservées en
              Europe, ne sont transmises à personne, et sont effacées si la demande n’aboutit pas.
              N’écrivez rien ici que vous ne souhaiteriez pas voir passer par courriel : ce qui
              relève du motif se dira en séance.
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
