import { TitreSection } from "@/components/tags";
import {
  enregistrerConge,
  enregistrerDisponibilite,
  supprimerConge,
  supprimerDisponibilite,
} from "@/lib/actions";
import { fmtJourMoisAn } from "@/lib/format";

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const champ = "rounded-full border border-line bg-surface px-3 py-1.5 text-sm";
/** Même pilule, teintée du lieu : sans elle, jour et heures restaient gris
 *  neutre alors que tout le reste du bloc porte la couleur du cabinet. */
const champCabinet = "rounded-full border border-[var(--cab)]/35 bg-surface px-3 py-1.5 text-sm";
const libelleChamp = "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";

/**
 * Horaires d'ouverture et congés.
 *
 * Ce ne sont pas des informations d'affichage : ce sont elles qui déterminent
 * les créneaux proposés au public. Elles étaient jusqu'ici semées en base et
 * hors de portée — la réservation offrait donc des heures qu'Amandine ne
 * pouvait pas changer.
 */
export function Horaires({
  cabinets,
  disponibilites,
  conges,
}: {
  cabinets: { id: string; nom: string; colorHex: string; publie: boolean }[];
  disponibilites: { id: string; cabinetId: string; jour: number; debutMin: number; finMin: number }[];
  conges: { id: string; debut: Date; fin: Date; motif: string | null }[];
}) {
  return (
    <>
      <section id="horaires" className="flex flex-col gap-4 scroll-mt-6">
        <div>
          <TitreSection>Horaires d’ouverture</TitreSection>
          <p className="mt-1 text-sm text-ink-muted">
            Ces plages déterminent les créneaux proposés sur le site. En dehors, aucun rendez-vous
            n’est offert. Le week-end n’est jamais proposé.
          </p>
        </div>

        {cabinets.map((c) => {
          const siennes = disponibilites
            .filter((d) => d.cabinetId === c.id)
            .sort((a, b) => a.jour - b.jour || a.debutMin - b.debutMin);
          return (
            <div
              key={c.id}
              style={{ "--cab": c.colorHex } as React.CSSProperties}
              className="rounded-[14px] border-2 border-[var(--cab)]/25 bg-surface px-5 py-4"
            >
              <p className="texte-cabinet font-bold">
                {c.nom}
                {!c.publie && (
                  <span className="ml-2 text-xs font-normal text-ink-muted">
                    (non publié — pas de réservation en ligne)
                  </span>
                )}
              </p>

              {siennes.length === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">
                  Aucune plage. Aucun créneau ne sera proposé pour ce lieu.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {siennes.map((d) => (
                    <li key={d.id}>
                      <form action={enregistrerDisponibilite} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="cabinetId" value={c.id} />
                        <label className="sr-only" htmlFor={`j-${d.id}`}>
                          Jour
                        </label>
                        <select id={`j-${d.id}`} name="jour" defaultValue={d.jour} className={`${champCabinet} w-32`}>
                          {JOURS.map((j, i) => (
                            <option key={j} value={i}>
                              {j}
                            </option>
                          ))}
                        </select>
                        <label className="sr-only" htmlFor={`d-${d.id}`}>
                          Début
                        </label>
                        <input
                          id={`d-${d.id}`}
                          name="debut"
                          type="time"
                          defaultValue={hhmm(d.debutMin)}
                          className={`${champCabinet} w-28`}
                        />
                        <span className="text-sm text-ink-muted">→</span>
                        <label className="sr-only" htmlFor={`f-${d.id}`}>
                          Fin
                        </label>
                        <input
                          id={`f-${d.id}`}
                          name="fin"
                          type="time"
                          defaultValue={hhmm(d.finMin)}
                          className={`${champCabinet} w-28`}
                        />
                        <button
                          type="submit"
                          className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-contrast"
                        >
                          Enregistrer
                        </button>
                        <button
                          type="submit"
                          formAction={supprimerDisponibilite}
                          className="rounded-full border border-line-strong px-4 py-1.5 text-xs font-medium text-ink-muted hover:border-overdue hover:text-overdue"
                        >
                          Retirer
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              <form
                action={enregistrerDisponibilite}
                className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3"
              >
                <input type="hidden" name="cabinetId" value={c.id} />
                <select name="jour" defaultValue="0" className={`${champCabinet} w-32`} aria-label="Jour">
                  {JOURS.map((j, i) => (
                    <option key={j} value={i}>
                      {j}
                    </option>
                  ))}
                </select>
                <input name="debut" type="time" defaultValue="09:00" className={`${champCabinet} w-28`} aria-label="Début" />
                <span className="text-sm text-ink-muted">→</span>
                <input name="fin" type="time" defaultValue="18:00" className={`${champCabinet} w-28`} aria-label="Fin" />
                <button
                  type="submit"
                  className="rounded-full border border-accent px-4 py-1.5 text-xs font-medium text-accent-text"
                >
                  Ajouter une plage
                </button>
              </form>
            </div>
          );
        })}
      </section>

      <section id="conges" className="flex flex-col gap-4 scroll-mt-6">
        <div>
          <TitreSection>Congés et absences</TitreSection>
          <p className="mt-1 text-sm text-ink-muted">
            Aucun créneau n’est proposé sur ces périodes, et les heures qu’elles couvrent ne sont
            pas comptées comme travaillées.
          </p>
        </div>

        {conges.length > 0 && (
          <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
            {conges.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3 text-sm last:border-b-0"
              >
                <span data-numeric>
                  {fmtJourMoisAn.format(c.debut)} → {fmtJourMoisAn.format(new Date(c.fin.getTime() - 1))}
                </span>
                <span className="flex-1 text-ink-muted">{c.motif ?? "—"}</span>
                <form action={supprimerConge}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-line-strong px-3 py-1 text-xs text-ink-muted hover:border-overdue hover:text-overdue"
                  >
                    Retirer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={enregistrerConge}
          className="flex flex-wrap items-end gap-3 rounded-[14px] border border-dashed border-line-strong bg-surface px-5 py-4"
        >
          <label>
            <span className={libelleChamp}>Du</span>
            <input name="debut" type="date" required className={`mt-1 ${champ}`} />
          </label>
          <label>
            <span className={libelleChamp}>Au (inclus)</span>
            <input name="fin" type="date" required className={`mt-1 ${champ}`} />
          </label>
          <label className="min-w-40 flex-1">
            <span className={libelleChamp}>Motif (facultatif)</span>
            <input name="motif" placeholder="Congé" className={`mt-1 w-full ${champ}`} />
          </label>
          <button
            type="submit"
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast"
          >
            Ajouter
          </button>
        </form>
      </section>
    </>
  );
}
