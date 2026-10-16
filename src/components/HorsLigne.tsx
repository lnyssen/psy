"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { TitreSection } from "@/components/tags";
import {
  activerHorsLigne,
  desactiverHorsLigne,
  horsLigneActive,
  horsLigneDisponible,
  synchroniserHorsLigne,
} from "@/lib/hors-ligne-client";

const rien = () => () => {};

/**
 * Réglages › Utiliser sans connexion. Une option par appareil : on l'active
 * sur le téléphone qu'on emporte, pas sur le Mac du cabinet. Elle dit ce qui
 * est gardé, où, et quand cela s'efface — il s'agit de données de patients.
 */
export function HorsLigne() {
  const disponible = useSyncExternalStore(rien, horsLigneDisponible, () => false);
  const [active, setActive] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // L'état vit dans le stockage local de l'appareil : on le lit après l'affichage.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(horsLigneActive());
  }, []);

  async function activer() {
    setOccupe(true);
    setMessage(null);
    try {
      const ok = await activerHorsLigne();
      setActive(true);
      setMessage(
        ok
          ? "C’est activé : la journée est gardée sur cet appareil et se met à jour à chaque ouverture de l’outil."
          : "Activé, mais la journée n’a pas pu être téléchargée. Réessayez avec une connexion.",
      );
    } catch {
      setMessage("Ce navigateur n’a pas pu activer l’option. L’outil doit être ouvert en HTTPS.");
    } finally {
      setOccupe(false);
    }
  }

  async function desactiver() {
    setOccupe(true);
    await desactiverHorsLigne();
    setActive(false);
    setMessage("Désactivé : plus rien n’est gardé sur cet appareil.");
    setOccupe(false);
  }

  async function actualiser() {
    setOccupe(true);
    const ok = await synchroniserHorsLigne(true);
    setMessage(ok ? "Journée mise à jour." : "Mise à jour impossible pour l’instant.");
    setOccupe(false);
  }

  const bouton =
    "rounded-full border border-line-strong px-5 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text disabled:opacity-50";

  return (
    <section id="hors-ligne" className="flex flex-col gap-3 scroll-mt-6">
      <TitreSection>Voir la journée sans connexion</TitreSection>
      <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface px-5 py-4 text-sm">
        <p className="text-ink-muted">
          Dans un cabinet sans couverture, l’outil ne s’ouvre pas. Cette option garde sur{" "}
          <strong>cet appareil</strong> la liste de la journée (et de la suivante) pour la consulter
          sans réseau.
        </p>
        <ul className="flex flex-col gap-1.5 text-xs text-ink-muted">
          <li>
            <strong className="text-ink">Ce qui est gardé</strong> : l’heure, le prénom, l’initiale du
            nom, le lieu et son adresse. Ni téléphone, ni montant, ni note.
          </li>
          <li>
            <strong className="text-ink">Quand cela s’efface</strong> : à la fin de la journée, au
            verrouillage de l’outil, quand vous désactivez l’option, ou avec le bouton « Effacer » de
            la page hors connexion.
          </li>
          <li>
            <strong className="text-ink">Le point à connaître</strong> : hors connexion, la page ne
            demande pas de mot de passe. Quiconque tient votre téléphone déverrouillé peut la lire :
            n’activez l’option que sur un appareil protégé par un code ou Face ID.
          </li>
        </ul>

        {!disponible ? (
          <p className="text-ink-muted">Ce navigateur ne sait pas garder de données hors connexion.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {active ? (
              <>
                <span className="rounded-full bg-paid-soft px-3 py-1 text-xs font-semibold text-paid">
                  Activé sur cet appareil
                </span>
                <button type="button" onClick={actualiser} disabled={occupe} className={bouton}>
                  Mettre à jour maintenant
                </button>
                <button type="button" onClick={desactiver} disabled={occupe} className={bouton}>
                  Désactiver et effacer
                </button>
              </>
            ) : (
              <button type="button" onClick={activer} disabled={occupe} className={bouton}>
                Activer sur cet appareil
              </button>
            )}
          </div>
        )}
        <p role="status" className="min-h-5 text-xs text-ink-muted">
          {message}
        </p>
      </div>
    </section>
  );
}
