"use client";

import { useEffect, useRef, useState } from "react";

const EVENEMENT = "amapsy:confirmation";
const DUREE_MS = 3500;
/** Délai entre l'envoi d'un formulaire et la requête de son action serveur. */
const FENETRE_MS = 3000;

type Confirmation = { message: string; erreur?: boolean };

/** Affiche un message de confirmation en bas de l'écran. */
export function confirmer(message: string, erreur = false) {
  window.dispatchEvent(new CustomEvent<Confirmation>(EVENEMENT, { detail: { message, erreur } }));
}

/** Le message d'un formulaire envoyé : celui qu'il demande (data-confirmation,
 *  sur le bouton ou le formulaire), sinon d'après le libellé du bouton. */
function messagePour(form: HTMLFormElement, bouton: HTMLElement | null): string {
  const demande = bouton?.dataset.confirmation ?? form.dataset.confirmation;
  if (demande) return demande;
  const libelle = (bouton?.textContent ?? "").trim().toLowerCase();
  if (/supprim/.test(libelle)) return "Supprimé.";
  if (/archiv/.test(libelle)) return "Dossier archivé.";
  if (/réactiv/.test(libelle)) return "Dossier réactivé.";
  if (/désactiv/.test(libelle)) return "Désactivé.";
  if (/annul/.test(libelle)) return "Annulé.";
  if (/^(créer|ajouter)/.test(libelle)) return "Ajouté.";
  return "Enregistré.";
}

/**
 * Confirmation visible après chaque enregistrement, posée une fois dans
 * l'outil.
 *
 * Plutôt que d'ajouter un message à chacun des formulaires (il y en a des
 * dizaines), on observe le geste lui-même : un formulaire envoyé (hors
 * recherche, en GET) suivi de la requête de son action serveur. Quand le
 * serveur a répondu, « Enregistré. » s'affiche quelques secondes ; une
 * réponse en erreur ou une coupure réseau affichent le contraire, pour qu'un
 * échec ne passe plus jamais inaperçu.
 */
export function Confirmations() {
  const [courante, setCourante] = useState<Confirmation | null>(null);
  const minuteur = useRef<number | null>(null);

  useEffect(() => {
    let attendu: { message: string; t: number } | null = null;

    const envoi = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      if (!form || form.method?.toLowerCase() === "get") return;
      // Un FormulaireAction annonce lui-même son résultat, refus compris.
      if (form.hasAttribute("data-confirmation-propre")) {
        attendu = null;
        return;
      }
      attendu = { message: messagePour(form, e.submitter as HTMLElement | null), t: Date.now() };
    };

    const fetchOrigine = window.fetch;
    const fetchObserve: typeof window.fetch = async (entree, init) => {
      const enTetes = new Headers(init?.headers);
      const action = enTetes.has("next-action");
      const suivi = action && attendu && Date.now() - attendu.t < FENETRE_MS ? attendu : null;
      if (suivi) attendu = null;
      try {
        const reponse = await fetchOrigine(entree, init);
        if (suivi) {
          if (reponse.ok) confirmer(suivi.message);
          else confirmer("L’enregistrement a échoué. Réessayez.", true);
        }
        return reponse;
      } catch (err) {
        if (suivi) confirmer("Pas de connexion : rien n’a été enregistré.", true);
        throw err;
      }
    };
    window.fetch = fetchObserve;

    const ecoute = (e: Event) => {
      setCourante((e as CustomEvent<Confirmation>).detail);
      if (minuteur.current) window.clearTimeout(minuteur.current);
      minuteur.current = window.setTimeout(() => setCourante(null), DUREE_MS);
    };

    document.addEventListener("submit", envoi, true);
    window.addEventListener(EVENEMENT, ecoute);
    return () => {
      document.removeEventListener("submit", envoi, true);
      window.removeEventListener(EVENEMENT, ecoute);
      if (window.fetch === fetchObserve) window.fetch = fetchOrigine;
      if (minuteur.current) window.clearTimeout(minuteur.current);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="sans-impression pointer-events-none fixed inset-x-4 bottom-6 z-[60] flex justify-center md:right-6 md:left-auto"
    >
      {courante && (
        <div
          className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-[14px] border px-4 py-3 text-sm font-medium shadow-[0_16px_32px_-16px_rgba(27,20,100,0.45)] ${
            courante.erreur
              ? "border-overdue/40 bg-overdue-soft text-overdue"
              : "border-paid/40 bg-paid-soft text-paid"
          }`}
        >
          <span aria-hidden className="text-base leading-none">
            {courante.erreur ? "!" : "✓"}
          </span>
          {courante.message}
        </div>
      )}
    </div>
  );
}
