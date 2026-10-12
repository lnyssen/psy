import { enregistrerParametres } from "@/lib/actions";
import { TitreSection } from "@/components/tags";
import type { Parametres as ParametresType } from "@/lib/parametres";

const champCourt =
  "w-24 rounded-full border border-line bg-surface px-3 py-1.5 text-sm";
const champLarge =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm";
const libelleChamp =
  "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";
const aide = "mt-1.5 block text-xs leading-relaxed text-ink-muted";
const bouton =
  "self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover";

/**
 * Interrupteur des rendez-vous en ligne.
 *
 * Fermé, la page publique ne propose plus de créneaux et n'accepte plus aucune
 * demande ; le message ci-dessous la remplace. C'est le seul réglage qui agit
 * immédiatement sur ce que voient les visiteurs, d'où sa place en tête de page.
 */
export function RendezVousEnLigne({ valeurs }: { valeurs: ParametresType }) {
  return (
    <section id="ouverture" className="flex flex-col gap-4 scroll-mt-6">
      <div>
        <TitreSection>Rendez-vous en ligne</TitreSection>
        <p className="mt-1 text-sm text-ink-muted">
          Ouvre ou ferme la prise de rendez-vous sur le site. Fermée, les
          visiteurs voient un message et les moyens de te joindre ; les patients
          ayant un lien personnel ne peuvent pas réserver non plus.
        </p>
      </div>

      <form
        action={enregistrerParametres}
        className="flex flex-col gap-5 rounded-[14px] border border-line bg-surface px-5 py-5"
      >
        <input type="hidden" name="groupe" value="rdv" />

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="rdvEnLigne"
            defaultChecked={valeurs.rdvEnLigne}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="font-medium">Rendez-vous en ligne ouverts</span>
            <span className={aide}>
              Actuellement :{" "}
              <strong
                className={valeurs.rdvEnLigne ? "text-paid" : "text-overdue"}
              >
                {valeurs.rdvEnLigne ? "ouverts" : "fermés"}
              </strong>
              . Décoche la case et enregistre pour fermer ; coche-la pour
              rouvrir.
            </span>
          </span>
        </label>

        <label>
          <span className={libelleChamp}>
            Message affiché quand c’est fermé (facultatif)
          </span>
          <textarea
            name="rdvMessage"
            defaultValue={valeurs.rdvMessage ?? ""}
            rows={2}
            placeholder="Je ne prends pas de nouveaux rendez-vous pour le moment."
            className={`mt-1 ${champLarge.replace("rounded-full", "rounded-[14px]")} resize-y leading-snug`}
          />
          <span className={aide}>
            Sans texte, le site dit : « La prise de rendez-vous en ligne est
            fermée pour le moment. »
          </span>
        </label>

        <div className="flex flex-col gap-4 border-t border-line pt-5">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="nouveauxPatients"
              defaultChecked={valeurs.nouveauxPatients}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="font-medium">
                J’accepte de nouveaux patients
              </span>
              <span className={aide}>
                Décochée, les personnes que l’outil ne connaît pas ne peuvent
                plus demander de rendez-vous : elles laissent leurs coordonnées
                sur une liste d’attente, que vous retrouvez dans « Demandes ».
                Les patients qui ont leur lien personnel réservent comme avant.
              </span>
            </span>
          </label>
          <label>
            <span className={libelleChamp}>
              Message affiché sur la liste d’attente (facultatif)
            </span>
            <textarea
              name="nouveauxPatientsMessage"
              defaultValue={valeurs.nouveauxPatientsMessage ?? ""}
              rows={2}
              placeholder="Je ne prends pas de nouveaux patients pour le moment. Laissez vos coordonnées : je vous rappellerai si une place se libère."
              className={`mt-1 ${champLarge.replace("rounded-full", "rounded-[14px]")} resize-y leading-snug`}
            />
          </label>
        </div>

        <button type="submit" className={bouton}>
          Enregistrer
        </button>
      </form>
    </section>
  );
}

/**
 * Rythme des séances : les valeurs qui décident, à elles seules, des créneaux
 * proposés au public. Chaque champ est expliqué à côté de lui.
 */
export function Parametres({ valeurs }: { valeurs: ParametresType }) {
  const nombre = (
    nom: string,
    libelle: string,
    unite: string,
    valeur: number,
    min: number,
    max: number,
    explication?: string,
    pas?: number,
  ) => (
    <label key={nom}>
      <span className={libelleChamp}>{libelle}</span>
      <span className="mt-1 flex items-center gap-2">
        <input
          name={nom}
          type="number"
          min={min}
          max={max}
          step={pas}
          defaultValue={valeur}
          className={champCourt}
        />
        <span className="text-sm text-ink-muted">{unite}</span>
      </span>
      {explication && <span className={aide}>{explication}</span>}
    </label>
  );

  return (
    <section id="rythme" className="flex flex-col gap-4 scroll-mt-6">
      <div>
        <TitreSection>Rythme des séances</TitreSection>
        <p className="mt-1 text-sm text-ink-muted">
          Ces valeurs, combinées aux horaires d’ouverture et à l’agenda déjà
          rempli, décident des créneaux proposés au public.
        </p>
      </div>

      <form
        action={enregistrerParametres}
        className="flex flex-col gap-6 rounded-[14px] border border-line bg-surface px-5 py-5"
      >
        <input type="hidden" name="groupe" value="rythme" />

        <div className="grid gap-6 sm:grid-cols-2">
          {nombre(
            "dureeSeanceMin",
            "Durée d’une séance",
            "minutes",
            valeurs.dureeSeanceMin,
            15,
            240,
            undefined,
            5,
          )}
          {nombre(
            "pasMin",
            "Heures proposées toutes les",
            "minutes",
            valeurs.pasMin,
            5,
            120,
            "Les créneaux tombent sur des heures rondes : toutes les 15 minutes, toutes les 30…",
            5,
          )}
          {nombre(
            "battementMin",
            "Pause entre deux séances",
            "minutes",
            valeurs.battementMin,
            0,
            120,
            "Le temps qu’il te faut entre deux patients dans le même lieu : noter, souffler, accueillir.",
            5,
          )}
          {nombre(
            "trajetMin",
            "Trajet entre deux lieux",
            "minutes",
            valeurs.trajetMin,
            0,
            180,
            "Sert aussi à signaler dans l’agenda deux séances impossibles à enchaîner.",
            5,
          )}
          {nombre(
            "horizonSemaines",
            "Réservation ouverte sur",
            "semaines",
            valeurs.horizonSemaines,
            1,
            26,
            "Jusqu’à quelle date à l’avance on peut demander un rendez-vous.",
          )}
        </div>

        <label className="flex items-start gap-3 border-t border-line pt-5 text-sm">
          <input
            type="checkbox"
            name="chainerSeances"
            defaultChecked={valeurs.chainerSeances}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="font-medium">
              Coller les créneaux aux séances existantes
            </span>
            <span className={aide}>
              Un créneau est aussi proposé juste après une séance déjà prise,
              pause comprise, même s’il ne tombe pas sur une heure ronde. Sans
              cela, une séance qui finit à 10 h 45 laisse la grille reprendre à
              11 h 00 et perd un quart d’heure à chaque fois.
            </span>
          </span>
        </label>

        <button type="submit" className={bouton}>
          Enregistrer le rythme
        </button>
      </form>
    </section>
  );
}

/**
 * Identité professionnelle et facturation : ce qui figure sur le site public
 * (mentions légales), sur le reçu du patient et sur la facture d'un
 * établissement. Un formulaire à part du rythme : les deux n'ont rien à voir.
 */
export function Identite({ valeurs }: { valeurs: ParametresType }) {
  const texte = (
    nom: string,
    libelle: string,
    valeur: string | null,
    exemple: string,
    aideTexte?: string,
  ) => (
    <label key={nom}>
      <span className={libelleChamp}>{libelle}</span>
      <input
        name={nom}
        defaultValue={valeur ?? ""}
        placeholder={exemple}
        className={`mt-1 ${champLarge}`}
      />
      {aideTexte && <span className={aide}>{aideTexte}</span>}
    </label>
  );

  return (
    <section id="identite" className="flex flex-col gap-4 scroll-mt-6">
      <div>
        <TitreSection>Identité et facturation</TitreSection>
        <p className="mt-1 text-sm text-ink-muted">
          Repris dans les mentions légales du site, sur le reçu remis au patient
          (numéros) et sur la facture émise à un établissement (tout, y compris
          l’IBAN et le délai de paiement).
        </p>
      </div>

      <form
        action={enregistrerParametres}
        className="flex flex-col gap-6 rounded-[14px] border border-line bg-surface px-5 py-5"
      >
        <input type="hidden" name="groupe" value="identite" />

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold">
            Numéros professionnels
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {texte(
              "numeroEntreprise",
              "N° d’entreprise (BCE)",
              valeurs.numeroEntreprise,
              "BE 0000.000.000",
            )}
            {texte("numeroInami", "N° INAMI", valeurs.numeroInami, "000000-00")}
            {texte(
              "numeroVisa",
              "Visa SPF Santé publique",
              valeurs.numeroVisa,
              "000000",
            )}
            {texte(
              "numeroCommission",
              "N° Commission des psychologues",
              valeurs.numeroCommission,
              "000000000",
            )}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3 border-t border-line pt-5">
          <legend className="text-sm font-semibold">Société</legend>
          <label>
            <span className={libelleChamp}>
              Adresse du siège — une ligne par ligne
            </span>
            <textarea
              name="adresseSiege"
              defaultValue={valeurs.adresseSiege ?? ""}
              rows={2}
              placeholder={"Rue Victor Allard 191\n1180 Uccle"}
              className={`mt-1 ${champLarge.replace("rounded-full", "rounded-[14px]")} resize-y leading-snug`}
            />
          </label>
          {texte(
            "mentionLegale",
            "Mention légale (RPM…)",
            valeurs.mentionLegale,
            "RPM Bruxelles — Francophone",
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-3 border-t border-line pt-5">
          <legend className="text-sm font-semibold">
            Facturation à un établissement
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {texte("iban", "IBAN", valeurs.iban, "BE00 0000 0000 0000")}
            <label>
              <span className={libelleChamp}>Délai de paiement</span>
              <span className="mt-1 flex items-center gap-2">
                <input
                  name="delaiPaiementJours"
                  type="number"
                  min={0}
                  max={180}
                  defaultValue={valeurs.delaiPaiementJours}
                  className={champCourt}
                />
                <span className="text-sm text-ink-muted">jours</span>
              </span>
            </label>
          </div>
        </fieldset>

        <button type="submit" className={bouton}>
          Enregistrer l’identité
        </button>
      </form>
    </section>
  );
}
