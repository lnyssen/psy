"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { reserverOuDemander, type ResultatRdv } from "@/lib/rdv-actions";

type CabinetChoix = {
  id: string;
  nom: string;
  adresse: string;
  colorHex: string;
  fillHex: string;
};

type Jour = { iso: string; creneaux: { iso: string; minutes: number }[] };

const fmtJour = new Intl.DateTimeFormat("fr-BE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Brussels",
});

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

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
        <h1 className="font-display text-3xl font-bold tracking-tight">C’est noté</h1>
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
        <h1 className="font-display text-4xl font-bold tracking-tight">Prendre rendez-vous</h1>
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
                    ...(actif
                      ? { backgroundColor: "var(--cab)", borderColor: "var(--cab)", color: "#fff" }
                      : { borderColor: "color-mix(in srgb, var(--cab) 35%, transparent)" }),
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
            Créneaux libres
          </h2>
          {jours.length === 0 ? (
            <p className="mt-3 rounded-[14px] border border-dashed border-line-strong px-6 py-10 text-center text-sm text-ink-muted">
              Aucun créneau libre dans ce lieu pour les prochaines semaines. Essayez l’autre
              cabinet, ou écrivez-nous depuis la page contact.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-5">
              {jours.slice(0, 12).map((j) => (
                <div key={j.iso}>
                  <p className="text-sm font-semibold first-letter:uppercase">
                    {fmtJour.format(new Date(j.iso))}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {j.creneaux.map((c) => (
                      <button
                        key={c.iso}
                        type="button"
                        onClick={() => setCreneau(c.iso)}
                        aria-pressed={creneau === c.iso}
                        className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                          creneau === c.iso
                            ? "border-accent bg-accent font-semibold text-accent-contrast"
                            : "border-line-strong hover:border-accent hover:text-accent-text"
                        }`}
                        data-numeric
                      >
                        {hhmm(c.minutes)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
