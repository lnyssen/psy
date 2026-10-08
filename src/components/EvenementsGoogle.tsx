import { SelectPatientRecherche } from "@/components/SelectPatientRecherche";
import {
  ignorerEvenementGoogle,
  marquerEvenementOccupe,
  rattacherEvenementGoogle,
} from "@/lib/google-actions";
import { fmtHeure, fmtJourMois } from "@/lib/format";

type Evenement = {
  id: string;
  titre: string;
  lieu: string | null;
  debut: Date;
  fin: Date;
  serieId: string | null;
};

const champ = "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm";
const bouton =
  "rounded-full border border-line-strong px-4 py-1.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text";

/**
 * Rendez-vous créés dans Google Agenda, en attente d'une décision.
 *
 * L'outil ne devine rien : le titre d'un événement est du texte libre, et se
 * tromper de patient dans une facturation coûte plus cher qu'un clic. Chaque
 * ligne propose donc les trois issues — séance (avec son patient, ou sans
 * patient pour un lieu facturé à l'heure), simple créneau occupé, ou rien.
 *
 * Une série récurrente se traite d'un seul geste : un rendez-vous hebdomadaire
 * créé dans Google donnerait sinon des dizaines de lignes identiques.
 */
export function EvenementsGoogle({
  evenements,
  patients,
  cabinets,
}: {
  evenements: Evenement[];
  patients: { id: string; firstName: string; lastName: string }[];
  cabinets: { id: string; nom: string; factureInstitution: boolean }[];
}) {
  if (evenements.length === 0) return null;

  // Une ligne par série, une par événement isolé.
  const lignes: { ev: Evenement; occurrences: Evenement[] }[] = [];
  const series = new Map<string, Evenement[]>();
  for (const ev of evenements) {
    if (ev.serieId) {
      const groupe = series.get(ev.serieId) ?? [];
      groupe.push(ev);
      series.set(ev.serieId, groupe);
    } else {
      lignes.push({ ev, occurrences: [ev] });
    }
  }
  for (const groupe of series.values()) lignes.push({ ev: groupe[0], occurrences: groupe });
  lignes.sort((a, b) => a.ev.debut.getTime() - b.ev.debut.getTime());

  const quand = (e: Evenement) =>
    `${fmtJourMois.format(e.debut)} · ${fmtHeure.format(e.debut)}–${fmtHeure.format(e.fin)}`;

  return (
    <section id="google" className="flex scroll-mt-6 flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">
          Google Agenda — à rattacher{" "}
          <span className="font-mono text-sm text-accent-text" data-numeric>
            ({evenements.length})
          </span>
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Ces rendez-vous viennent de ton Google Agenda. Rattache-les à un patient pour en faire des
          séances ; pour l’école, laisse le patient vide.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {lignes.map(({ ev, occurrences }) => {
          const serie = occurrences.length > 1;
          return (
            <li key={ev.id} className="rounded-[14px] border border-accent/40 bg-surface px-5 py-4">
              <p className="text-sm">
                <span className="font-semibold">{ev.titre}</span>
                <span className="ml-2 text-ink-muted" data-numeric>
                  {quand(ev)}
                </span>
                {ev.lieu && <span className="ml-2 text-xs text-ink-muted">{ev.lieu}</span>}
              </p>
              <form action={rattacherEvenementGoogle} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_auto]">
                <input type="hidden" name="id" value={ev.id} />
                <div className="sm:col-span-1">
                  <SelectPatientRecherche patients={patients} />
                </div>
                <select name="cabinetId" required defaultValue={cabinets[0]?.id} className={champ}>
                  {cabinets.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                      {c.factureInstitution ? " (sans patient)" : ""}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-1">
                  <button
                    type="submit"
                    className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
                  >
                    Rattacher
                  </button>
                  <button type="submit" formAction={marquerEvenementOccupe} className={bouton}>
                    Créneau occupé
                  </button>
                  <button
                    type="submit"
                    formAction={ignorerEvenementGoogle}
                    className={`${bouton} text-ink-muted`}
                  >
                    Ignorer
                  </button>
                </div>
                {serie && (
                  <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
                    <input type="checkbox" name="serie" defaultChecked />
                    {`Toute la série (${occurrences.length} occurrences, jusqu’au ${fmtJourMois.format(occurrences[occurrences.length - 1].debut)})`}
                  </label>
                )}
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
