"use client";

import { useMemo, useState } from "react";
import { IconChevronDroite, IconChevronGauche } from "@/components/icons";

export type Jour = { iso: string; creneaux: { iso: string; minutes: number }[] };

const fmtMois = new Intl.DateTimeFormat("fr-BE", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Brussels",
});
const fmtJourLong = new Intl.DateTimeFormat("fr-BE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Brussels",
});
const JOURS_COURTS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Clé « 2026-09-08 » calculée sur l'heure de Bruxelles, pour rapprocher un
 *  jour de calendrier d'un jour de disponibilité sans dépendre du fuseau du
 *  navigateur. */
function cle(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Calendrier de prise de rendez-vous.
 *
 * Une liste de jours à la suite obligeait à faire défiler pour savoir si le
 * mardi suivant était libre. Un calendrier montre d'un coup d'œil où il reste
 * de la place, ce qui est la question qu'on se pose.
 *
 * Il n'invente aucune disponibilité : chaque jour ouvrable y est marqué libre
 * ou non selon les créneaux calculés côté serveur, lesquels tiennent déjà
 * compte des horaires d'ouverture, des séances déjà prises dans tous les lieux,
 * des congés, des demandes en attente et du temps de trajet.
 */
export function CalendrierRdv({
  jours,
  creneau,
  onChoisir,
  isoDebut,
  isoFin,
}: {
  jours: Jour[];
  creneau: string | null;
  onChoisir: (iso: string | null) => void;
  /** Bornes de la période ouverte à la réservation. Les mois se parcourent
   *  jusqu'à ces bornes, et non jusqu'au dernier jour qui a des créneaux :
   *  sinon un congé en fin de période bloquait la navigation, ce qui donnait
   *  des flèches inertes sans qu'on comprenne pourquoi. */
  isoDebut: string;
  isoFin: string;
}) {
  const parJour = useMemo(() => new Map(jours.map((j) => [cle(new Date(j.iso)), j])), [jours]);

  const borneDebut = new Date(isoDebut);
  const borneFin = new Date(isoFin);
  const premier = jours[0] ? new Date(jours[0].iso) : borneDebut;

  const [mois, setMois] = useState(() => new Date(premier.getFullYear(), premier.getMonth(), 1));
  const [jourChoisi, setJourChoisi] = useState<string | null>(jours[0] ? cle(premier) : null);

  const moisMin = new Date(borneDebut.getFullYear(), borneDebut.getMonth(), 1);
  const moisMax = new Date(borneFin.getFullYear(), borneFin.getMonth(), 1);

  // Grille du mois, commençant un lundi et complétée jusqu'à la fin de semaine.
  const grille = useMemo(() => {
    const debut = new Date(mois);
    debut.setDate(1 - ((debut.getDay() + 6) % 7));
    const cases: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(debut);
      d.setDate(d.getDate() + i);
      cases.push(d);
      if (i >= 34 && d.getMonth() !== mois.getMonth() && (i + 1) % 7 === 0) break;
    }
    return cases;
  }, [mois]);

  const jourActif = jourChoisi ? parJour.get(jourChoisi) : undefined;

  function changerMois(pas: number) {
    const m = new Date(mois.getFullYear(), mois.getMonth() + pas, 1);
    if (m < moisMin || m > moisMax) return;
    setMois(m);
  }

  if (jours.length === 0) {
    return (
      <p className="rounded-[16px] border border-dashed border-line-strong px-6 py-10 text-center text-sm text-ink-muted">
        Aucun créneau libre dans ce lieu pour les prochaines semaines. Essayez un autre cabinet, ou
        écrivez-nous depuis la page contact.
      </p>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-10">
      <div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => changerMois(-1)}
            disabled={new Date(mois.getFullYear(), mois.getMonth() - 1, 1) < moisMin}
            aria-label="Mois précédent"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text disabled:opacity-30 disabled:hover:border-line-strong disabled:hover:text-ink-muted"
          >
            <IconChevronGauche />
          </button>
          <p className="font-semibold first-letter:uppercase" aria-live="polite">
            {fmtMois.format(mois)}
          </p>
          <button
            type="button"
            onClick={() => changerMois(1)}
            disabled={new Date(mois.getFullYear(), mois.getMonth() + 1, 1) > moisMax}
            aria-label="Mois suivant"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent-text disabled:opacity-30 disabled:hover:border-line-strong disabled:hover:text-ink-muted"
          >
            <IconChevronDroite />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center">
          {JOURS_COURTS.map((j) => (
            <div key={j} className="pb-2 text-[11px] font-semibold text-ink-muted uppercase">
              {j}
            </div>
          ))}

          {grille.map((d) => {
            const k = cle(d);
            const dispo = parJour.get(k);
            const dansLeMois = d.getMonth() === mois.getMonth();
            const actif = k === jourChoisi;

            if (!dansLeMois) return <div key={k} aria-hidden="true" />;

            return (
              <button
                key={k}
                type="button"
                disabled={!dispo}
                aria-pressed={actif}
                aria-label={`${fmtJourLong.format(d)}${dispo ? `, ${dispo.creneaux.length} créneaux libres` : ", aucun créneau"}`}
                onClick={() => {
                  setJourChoisi(k);
                  onChoisir(null);
                }}
                className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors ${
                  actif
                    ? "bg-accent font-bold text-accent-contrast"
                    : dispo
                      ? "bg-accent-soft font-semibold text-accent-text hover:bg-accent hover:text-accent-contrast"
                      : "text-ink-muted/35"
                }`}
                data-numeric
              >
                {d.getDate()}
                {dispo && !actif && (
                  <span aria-hidden="true" className="mt-0.5 h-1 w-1 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>

        <label className="mt-5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span className="font-semibold">Aller à une date</span>
          <input
            type="date"
            min={cle(borneDebut)}
            max={cle(borneFin)}
            value={jourChoisi ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              const [a, m, j] = v.split("-").map(Number);
              setMois(new Date(a, m - 1, 1));
              setJourChoisi(v);
              onChoisir(null);
            }}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm"
          />
        </label>

        <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
          <span aria-hidden="true" className="h-3 w-3 rounded bg-accent-soft" />
          jours avec des créneaux libres
        </p>
      </div>

      <div>
        {jourActif ? (
          <>
            <p className="text-sm font-semibold first-letter:uppercase">
              {fmtJourLong.format(new Date(jourActif.iso))}
            </p>
            <p className="mt-1 text-xs text-ink-muted" data-numeric>
              {jourActif.creneaux.length} créneau{jourActif.creneaux.length > 1 ? "x" : ""} libre
              {jourActif.creneaux.length > 1 ? "s" : ""}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {jourActif.creneaux.map((c) => (
                <button
                  key={c.iso}
                  type="button"
                  onClick={() => onChoisir(c.iso)}
                  aria-pressed={creneau === c.iso}
                  className={`rounded-full border py-2.5 text-sm transition-colors ${
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
          </>
        ) : jourChoisi ? (
          <p className="rounded-[16px] border border-dashed border-line-strong px-6 py-10 text-center text-sm text-ink-muted">
            Aucun créneau libre ce jour-là. Les jours qui en ont sont teintés dans le calendrier.
          </p>
        ) : (
          <p className="rounded-[16px] border border-dashed border-line-strong px-6 py-10 text-center text-sm text-ink-muted">
            Choisissez un jour dans le calendrier.
          </p>
        )}
      </div>
    </div>
  );
}
