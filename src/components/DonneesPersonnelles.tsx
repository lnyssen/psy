import { anonymiserPatient, supprimerPatient } from "@/lib/dossier-actions";

const MESSAGES: Record<string, { ok: boolean; texte: string }> = {
  ok: {
    ok: true,
    texte:
      "Dossier anonymisé. Il ne reste que les séances et leurs montants, pour la comptabilité.",
  },
  confirmation: {
    ok: false,
    texte: "Pour confirmer, tapez ANONYMISER en capitales dans le champ.",
  },
  avenir: {
    ok: false,
    texte:
      "Ce patient a encore un rendez-vous à venir. Annulez-le d’abord, puis recommencez.",
  },
  "suppr-confirmation": {
    ok: false,
    texte: "Pour confirmer, tapez SUPPRIMER en capitales dans le champ.",
  },
  "suppr-comptable": {
    ok: false,
    texte:
      "Ce patient a des séances passées ou facturées. Supprimez-les d’abord, une à une (menu ⋯ de chaque ligne de l’historique), ou anonymisez le dossier pour garder les montants.",
  },
};

/**
 * Droits RGPD d'un patient : exporter son dossier (accès, portabilité) et
 * l'anonymiser (effacement). Replié par défaut — c'est un geste rare, et le
 * second est irréversible.
 */
export function DonneesPersonnelles({
  id,
  anonymise,
  code,
  suppressible,
  rdvAVenir,
}: {
  id: string;
  anonymise: boolean;
  code?: string;
  /** Aucune séance passée ni facturée : la fiche peut vraiment disparaître. */
  suppressible: boolean;
  rdvAVenir: number;
}) {
  const message = code ? MESSAGES[code] : undefined;
  return (
    <details
      id="donnees"
      className="rounded-[14px] border border-line bg-surface px-5 py-3"
      open={Boolean(message)}
    >
      <summary className="w-fit cursor-pointer text-sm font-medium text-ink-muted transition-colors hover:text-accent-text">
        Données personnelles et suppression
      </summary>
      <div className="mt-4 flex flex-col gap-6">
        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={`rounded-[10px] border px-4 py-2.5 text-sm ${
              message.ok
                ? "border-paid/40 bg-paid-soft text-paid"
                : "border-overdue/40 bg-overdue-soft text-overdue"
            }`}
          >
            {message.texte}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Exporter le dossier</h3>
          <p className="text-xs text-ink-muted">
            Un fichier qui regroupe tout ce que l’outil sait de ce patient :
            identité, coordonnées, séances, paiements, notes libres. Les notes
            de séance, cliniques, n’y figurent que si vous les ajoutez.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`/api/patients/${id}/export`}
              className="rounded-full border border-line-strong px-5 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text"
            >
              Exporter (sans les notes de séance)
            </a>
            <a
              href={`/api/patients/${id}/export?notes=1`}
              className="rounded-full border border-line-strong px-5 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text"
            >
              Exporter avec les notes de séance
            </a>
          </div>
        </div>

        {anonymise ? (
          <p className="text-sm text-ink-muted">
            Ce dossier est déjà anonymisé.
          </p>
        ) : (
          <form
            action={anonymiserPatient}
            className="flex flex-col gap-3 border-t border-line pt-5"
          >
            <input type="hidden" name="id" value={id} />
            <h3 className="text-sm font-semibold">Anonymiser le dossier</h3>
            <p className="text-xs text-ink-muted">
              Efface le nom, les coordonnées, le numéro national, les notes et
              les documents. Les séances et leurs montants restent, rattachés à
              « Dossier anonymisé » : ce sont des pièces comptables à conserver.{" "}
              <strong>Irréversible.</strong> Refusé tant qu’un rendez-vous à
              venir existe.
            </p>
            <label className="max-w-xs">
              <span className="block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
                Tapez ANONYMISER pour confirmer
              </span>
              <input
                name="confirmation"
                autoComplete="off"
                className="mt-1 w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              className="self-start rounded-full border border-line-strong px-5 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-overdue hover:text-overdue"
            >
              Anonymiser ce dossier
            </button>
          </form>
        )}

        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <h3 className="text-sm font-semibold">Supprimer le patient</h3>
          {suppressible ? (
            <form action={supprimerPatient} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={id} />
              <p className="text-xs text-ink-muted">
                Efface la fiche, ses notes et ses documents
                {rdvAVenir > 0 &&
                  `, ainsi que ${rdvAVenir === 1 ? "son rendez-vous" : `ses ${rdvAVenir} rendez-vous`} à venir (retiré${rdvAVenir > 1 ? "s" : ""} aussi de l’agenda Google)`}
                . <strong>Irréversible.</strong> Fait pour une fiche créée par
                erreur, un doublon ou une personne jamais venue.
              </p>
              <label className="max-w-xs">
                <span className="block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
                  Tapez SUPPRIMER pour confirmer
                </span>
                <input
                  name="confirmation"
                  autoComplete="off"
                  className="mt-1 w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm"
                />
              </label>
              <button
                type="submit"
                className="self-start rounded-full border border-line-strong px-5 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-overdue hover:text-overdue"
              >
                Supprimer ce patient
              </button>
            </form>
          ) : (
            <p className="text-xs text-ink-muted">
              Ce patient a des séances passées ou facturées : la fiche ne se
              supprime qu’une fois celles-ci supprimées, une à une, avec le menu
              « ⋯ » de chaque ligne de l’historique. Si ces montants doivent
              rester dans votre comptabilité (conservation de sept ans),
              l’anonymisation ci-dessus efface tout ce qui identifie le patient
              et les garde.
            </p>
          )}
        </div>
      </div>
    </details>
  );
}
