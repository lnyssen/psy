"use client";

import Link from "next/link";
import { useActionState } from "react";
import { demanderReinitialisation } from "@/lib/auth-actions";

/** Demande d'un lien de réinitialisation, envoyé à l'adresse de récupération. */
export function OublieMotDePasse() {
  const [message, action, enCours] = useActionState(
    async () => demanderReinitialisation(),
    null,
  );

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-6">
      <h1 className="font-display text-3xl tracking-tight">
        Mot de passe oublié
      </h1>
      <p className="max-w-sm text-center text-sm text-ink-muted">
        Un lien pour choisir un nouveau mot de passe sera envoyé à l’adresse de
        récupération enregistrée dans les réglages. Il est valable 30 minutes.
      </p>
      <form action={action} className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {enCours ? "Envoi…" : "Envoyer le lien"}
        </button>
        {message && (
          <p role="status" className="text-center text-sm text-ink-muted">
            {message}
          </p>
        )}
      </form>
      <Link
        href="/connexion"
        className="py-2 text-sm text-ink-muted underline underline-offset-4 hover:text-accent-text"
      >
        Retour à la connexion
      </Link>
    </div>
  );
}
