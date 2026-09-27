import { enregistrerParametres } from "@/lib/actions";
import { TitreSection } from "@/components/tags";
import type { Parametres as ParametresType } from "@/lib/parametres";

const champ = "w-24 rounded-full border border-line bg-surface px-3 py-1.5 text-sm";
const libelleChamp = "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";

/**
 * Réglages du calcul des créneaux.
 *
 * Ces six valeurs décident, à elles seules, de ce que le site propose. Elles
 * méritent donc d'être expliquées à côté du champ plutôt que dans une
 * documentation que personne ne lira.
 */
export function Parametres({ valeurs }: { valeurs: ParametresType }) {
  return (
    <section id="rythme" className="flex flex-col gap-4 scroll-mt-6">
      <div>
        <TitreSection>Rythme des séances</TitreSection>
        <p className="mt-1 text-sm text-ink-muted">
          Ces valeurs décident de ce que le site propose. Elles se combinent aux horaires
          d’ouverture et à l’agenda déjà rempli.
        </p>
      </div>

      <form
        action={enregistrerParametres}
        className="flex flex-col gap-5 rounded-[14px] border border-line bg-surface px-5 py-5"
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <label>
            <span className={libelleChamp}>Durée d’une séance</span>
            <span className="mt-1 flex items-center gap-2">
              <input
                name="dureeSeanceMin"
                type="number"
                min={15}
                max={240}
                step={5}
                defaultValue={valeurs.dureeSeanceMin}
                className={champ}
              />
              <span className="text-sm text-ink-muted">minutes</span>
            </span>
          </label>

          <label>
            <span className={libelleChamp}>Battement entre deux séances</span>
            <span className="mt-1 flex items-center gap-2">
              <input
                name="battementMin"
                type="number"
                min={0}
                max={120}
                step={5}
                defaultValue={valeurs.battementMin}
                className={champ}
              />
              <span className="text-sm text-ink-muted">minutes</span>
            </span>
            <span className="mt-1.5 block text-xs text-ink-muted">
              Le temps qu’il vous faut entre deux patients dans le même lieu : noter, souffler,
              accueillir.
            </span>
          </label>

          <label>
            <span className={libelleChamp}>Trajet entre deux lieux</span>
            <span className="mt-1 flex items-center gap-2">
              <input
                name="trajetMin"
                type="number"
                min={0}
                max={180}
                step={5}
                defaultValue={valeurs.trajetMin}
                className={champ}
              />
              <span className="text-sm text-ink-muted">minutes</span>
            </span>
            <span className="mt-1.5 block text-xs text-ink-muted">
              Sert aussi à signaler dans l’agenda deux séances impossibles à enchaîner.
            </span>
          </label>

          <label>
            <span className={libelleChamp}>Pas des créneaux</span>
            <span className="mt-1 flex items-center gap-2">
              <input
                name="pasMin"
                type="number"
                min={5}
                max={120}
                step={5}
                defaultValue={valeurs.pasMin}
                className={champ}
              />
              <span className="text-sm text-ink-muted">minutes</span>
            </span>
            <span className="mt-1.5 block text-xs text-ink-muted">
              Les heures rondes proposées : toutes les quinze minutes, toutes les demi-heures…
            </span>
          </label>

          <label>
            <span className={libelleChamp}>Réservation ouverte sur</span>
            <span className="mt-1 flex items-center gap-2">
              <input
                name="horizonSemaines"
                type="number"
                min={1}
                max={26}
                defaultValue={valeurs.horizonSemaines}
                className={champ}
              />
              <span className="text-sm text-ink-muted">semaines</span>
            </span>
          </label>
        </div>

        <label className="flex items-start gap-3 border-t border-line pt-4 text-sm">
          <input
            type="checkbox"
            name="chainerSeances"
            defaultChecked={valeurs.chainerSeances}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Coller les créneaux aux séances existantes</span>
            <span className="mt-1 block text-xs text-ink-muted">
              Un créneau est aussi proposé juste après une séance déjà prise, battement compris,
              même s’il ne tombe pas sur le pas régulier. Sans cela, une séance finissant à 10 h 45
              laisse la grille reprendre à 11 h 00 et perd un quart d’heure à chaque fois.
            </span>
          </span>
        </label>

        <div className="border-t border-line pt-4">
          <h3 className="text-sm font-semibold">Mentions légales de facturation</h3>
          <p className="mt-1 text-xs text-ink-muted">
            Reprises sur toute facture émise à un établissement — une pièce comptable numérotée,
            à la différence du reçu remis à un patient.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label>
              <span className={libelleChamp}>N° d’entreprise (BCE)</span>
              <input
                name="numeroEntreprise"
                defaultValue={valeurs.numeroEntreprise ?? ""}
                placeholder="BE 0000.000.000"
                className={`mt-1 ${champ} w-full`}
              />
            </label>
            <label>
              <span className={libelleChamp}>IBAN</span>
              <input
                name="iban"
                defaultValue={valeurs.iban ?? ""}
                placeholder="BE00 0000 0000 0000"
                className={`mt-1 ${champ} w-full`}
              />
            </label>
            <label>
              <span className={libelleChamp}>Délai de paiement</span>
              <span className="mt-1 flex items-center gap-2">
                <input
                  name="delaiPaiementJours"
                  type="number"
                  min={0}
                  max={180}
                  defaultValue={valeurs.delaiPaiementJours}
                  className={champ}
                />
                <span className="text-sm text-ink-muted">jours</span>
              </span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          Enregistrer
        </button>
      </form>
    </section>
  );
}
