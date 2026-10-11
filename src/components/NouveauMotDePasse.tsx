"use client";

import { useActionState } from "react";
import { reinitialiserMotDePasse } from "@/lib/auth-actions";
import { LONGUEUR_MINIMALE } from "@/lib/acces-constantes";

/** Choix du nouveau mot de passe, depuis le lien reçu par e-mail. */
export function NouveauMotDePasse({ jeton }: { jeton: string }) {
  const [erreur, action, enCours] = useActionState(
    reinitialiserMotDePasse,
    null,
  );
  const champ =
    "w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm";

  return (
    <form action={action} className="flex w-full max-w-xs flex-col gap-3">
      <input type="hidden" name="jeton" value={jeton} />
      <label>
        <span className="sr-only">Nouveau mot de passe</span>
        <input
          name="nouveau"
          type="password"
          placeholder="Nouveau mot de passe"
          autoComplete="new-password"
          minLength={LONGUEUR_MINIMALE}
          required
          autoFocus
          className={champ}
        />
      </label>
      <label>
        <span className="sr-only">Le même, une seconde fois</span>
        <input
          name="confirmation"
          type="password"
          placeholder="Le même, une seconde fois"
          autoComplete="new-password"
          minLength={LONGUEUR_MINIMALE}
          required
          className={champ}
        />
      </label>
      <p className="text-center text-xs text-ink-muted">
        Au moins {LONGUEUR_MINIMALE} caractères.
      </p>
      <button
        type="submit"
        disabled={enCours}
        className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {enCours ? "Enregistrement…" : "Choisir ce mot de passe"}
      </button>
      {erreur && (
        <p role="alert" className="text-center text-sm text-overdue">
          {erreur}
        </p>
      )}
    </form>
  );
}
