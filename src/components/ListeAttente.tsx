"use client";

import { useActionState } from "react";
import { rejoindreListeAttente, type ResultatRdv } from "@/lib/rdv-actions";

const champ =
  "w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm";

/** Formulaire de la liste d'attente, affiché quand les nouveaux patients ne sont pas acceptés. */
export function ListeAttente() {
  const [etat, action, enCours] = useActionState<ResultatRdv, FormData>(
    rejoindreListeAttente,
    null,
  );

  if (etat?.ok) {
    return (
      <p role="status" className="rounded-[16px] bg-surface px-6 py-5 text-lg">
        {etat.message}
      </p>
    );
  }

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="firstName"
          placeholder="Prénom"
          aria-label="Prénom"
          autoComplete="given-name"
          required
          className={champ}
        />
        <input
          name="lastName"
          placeholder="Nom"
          aria-label="Nom"
          autoComplete="family-name"
          required
          className={champ}
        />
        <input
          name="phone"
          type="tel"
          placeholder="Téléphone"
          aria-label="Téléphone"
          autoComplete="tel"
          required
          className={champ}
        />
        <input
          name="email"
          type="email"
          placeholder="Adresse électronique (facultatif)"
          aria-label="Adresse électronique (facultatif)"
          autoComplete="email"
          className={champ}
        />
      </div>
      <textarea
        name="message"
        rows={3}
        placeholder="Un mot, si vous le souhaitez (facultatif). Ne décrivez pas de problème de santé ici."
        aria-label="Un mot, si vous le souhaitez (facultatif)"
        className="w-full resize-y rounded-[14px] border border-line bg-surface px-4 py-3 text-sm"
      />
      <p className="text-xs leading-relaxed text-ink-muted">
        Ces informations servent uniquement à vous rappeler si une place se
        libère. Elles ne sont transmises à personne.
      </p>
      {etat && !etat.ok && (
        <p role="alert" className="text-sm text-overdue">
          {etat.message}
        </p>
      )}
      <button
        type="submit"
        disabled={enCours}
        className="self-start rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {enCours ? "Envoi…" : "Me mettre sur la liste d’attente"}
      </button>
    </form>
  );
}
