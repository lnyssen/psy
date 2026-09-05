"use client";

import { useActionState } from "react";
import { seConnecter } from "@/lib/auth-actions";
import { IconCadenas } from "@/components/icons";

/**
 * Écran de connexion, qui fait aussi office d'écran verrouillé.
 *
 * Les deux ne sont volontairement qu'un : verrouiller détruit la session, et
 * reprendre la main exige donc le mot de passe. Un écran seulement masqué
 * aurait laissé la session ouverte derrière lui.
 *
 * Rien d'autre que la signature n'y figure : ni nom de patient, ni compteur, ni
 * prochain rendez-vous. C'est l'écran que voit quelqu'un d'autre.
 */
export function Connexion({ suite, verrouille }: { suite: string; verrouille: boolean }) {
  const [erreur, action, enCours] = useActionState(seConnecter, null);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-display text-4xl tracking-tight">Amandine Monsel</span>
        <span className="text-sm font-semibold tracking-[0.22em] text-accent-text uppercase">
          Amapsy&nbsp;SRL
        </span>
      </div>

      <p className="max-w-xs text-center text-sm text-ink-muted">
        {verrouille
          ? "Session verrouillée. Rien n’est affiché tant que vous n’avez pas repris la main."
          : "Entrez votre mot de passe pour ouvrir le dossier."}
      </p>

      <form action={action} className="flex w-full max-w-xs flex-col gap-3">
        <input type="hidden" name="suite" value={suite} />
        <label htmlFor="motDePasse" className="sr-only">
          Mot de passe
        </label>
        <input
          id="motDePasse"
          name="motDePasse"
          type="password"
          autoFocus
          autoComplete="current-password"
          required
          className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-center text-sm"
        />
        <button
          type="submit"
          disabled={enCours}
          className="flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          <IconCadenas />
          {enCours ? "Vérification…" : verrouille ? "Reprendre" : "Ouvrir"}
        </button>
        {erreur && (
          <p role="alert" className="text-center text-sm text-overdue">
            {erreur}
          </p>
        )}
      </form>
    </div>
  );
}
