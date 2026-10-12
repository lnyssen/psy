"use client";

import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";
import {
  browserSupportsWebAuthn,
  startAuthentication,
} from "@simplewebauthn/browser";
import { seConnecter } from "@/lib/auth-actions";
import { cibleApresConnexion } from "@/lib/acces-constantes";
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
export function Connexion({
  suite,
  verrouille,
  reinit = false,
}: {
  suite: string;
  verrouille: boolean;
  reinit?: boolean;
}) {
  const [erreur, action, enCours] = useActionState(seConnecter, null);
  // Faux côté serveur, vrai ou faux côté navigateur selon ce qu'il sait faire.
  const appareil = useSyncExternalStore(
    () => () => {},
    () => browserSupportsWebAuthn(),
    () => false,
  );
  const [erreurAppareil, setErreurAppareil] = useState<string | null>(null);
  const [verifie, setVerifie] = useState(false);

  // Face ID, Touch ID, empreinte : l'appareil enregistré signe un défi, le
  // serveur vérifie la signature et ouvre la session. Aucun mot de passe.
  async function ouvrirParAppareil() {
    setErreurAppareil(null);
    setVerifie(true);
    try {
      const options = await (
        await fetch("/api/passkey/connexion/options", { method: "POST" })
      ).json();
      if (options.message) throw new Error(options.message);
      const reponse = await startAuthentication({ optionsJSON: options });
      const r = await (
        await fetch("/api/passkey/connexion/verifier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reponse),
        })
      ).json();
      if (!r.ok) throw new Error(r.message);
      window.location.href = cibleApresConnexion(suite);
    } catch (e) {
      const annule =
        e instanceof Error &&
        /NotAllowed|cancel|abort/i.test(`${e.name} ${e.message}`);
      setErreurAppareil(
        annule
          ? null
          : e instanceof Error && e.message
            ? e.message
            : "La connexion par appareil a échoué.",
      );
      setVerifie(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-display text-4xl tracking-tight">
          Amandine Monsel
        </span>
        <span className="text-sm font-semibold tracking-[0.22em] text-accent-text uppercase">
          Amapsy&nbsp;SRL
        </span>
      </div>

      <p className="max-w-xs text-center text-sm text-ink-muted">
        {reinit
          ? "Mot de passe changé. Entrez le nouveau pour ouvrir le dossier."
          : verrouille
            ? "Session verrouillée. Rien n’est affiché tant que vous n’avez pas repris la main."
            : "Entrez votre mot de passe pour ouvrir le dossier."}
      </p>

      {appareil && (
        <div className="flex w-full max-w-xs flex-col gap-2">
          <button
            type="button"
            onClick={ouvrirParAppareil}
            disabled={verifie}
            className="flex items-center justify-center gap-2 rounded-full border border-ink/35 px-6 py-2.5 text-sm font-medium transition-colors hover:border-ink disabled:opacity-50"
          >
            {verifie
              ? "En attente de l’appareil…"
              : "Ouvrir avec Face ID ou Touch ID"}
          </button>
          {erreurAppareil && (
            <p role="alert" className="text-center text-sm text-overdue">
              {erreurAppareil}
            </p>
          )}
          <p className="text-center text-xs text-ink-muted">
            ou avec le mot de passe
          </p>
        </div>
      )}

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
        <Link
          href="/connexion/oublie"
          className="py-2 text-center text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-accent-text"
        >
          Mot de passe oublié ?
        </Link>
      </form>
    </div>
  );
}
