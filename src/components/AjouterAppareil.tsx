"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  startRegistration,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

/**
 * Enregistre l'appareil en cours (Face ID sur iPhone, Touch ID sur Mac,
 * empreinte sur Android) comme moyen d'ouvrir l'outil. Le navigateur demande
 * lui-même la vérification biométrique : rien de biométrique n'arrive jamais
 * jusqu'au serveur, qui ne reçoit qu'une clé publique.
 */
export function AjouterAppareil({ nomParDefaut }: { nomParDefaut: string }) {
  const router = useRouter();
  const [nom, setNom] = useState(nomParDefaut);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(
    null,
  );
  const [enCours, setEnCours] = useState(false);
  // Inconnu (null) côté serveur, puis vrai ou faux selon le navigateur.
  const pris = useSyncExternalStore<boolean | null>(
    () => () => {},
    () => browserSupportsWebAuthn(),
    () => null,
  );

  async function ajouter() {
    setMessage(null);
    setEnCours(true);
    try {
      const options = await (
        await fetch("/api/passkey/enregistrer/options", { method: "POST" })
      ).json();
      if (options.message) throw new Error(options.message);
      const reponse = await startRegistration({ optionsJSON: options });
      const r = await (
        await fetch("/api/passkey/enregistrer/verifier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: reponse, nom }),
        })
      ).json();
      if (!r.ok) throw new Error(r.message);
      setMessage({
        ok: true,
        texte:
          "Appareil enregistré. Vous pourrez ouvrir l’outil avec Face ID ou Touch ID.",
      });
      router.refresh();
    } catch (e) {
      const annule =
        e instanceof Error &&
        /NotAllowed|cancel|abort/i.test(`${e.name} ${e.message}`);
      setMessage({
        ok: false,
        texte: annule
          ? "Enregistrement annulé."
          : e instanceof Error && e.message
            ? e.message
            : "L’appareil n’a pas pu être enregistré.",
      });
    } finally {
      setEnCours(false);
    }
  }

  if (pris === false) {
    return (
      <p className="text-sm text-ink-muted">
        Ce navigateur ne gère pas la connexion par appareil. Ouvrez cette page
        sur votre iPhone, votre Mac ou votre téléphone Android pour enregistrer
        Face ID, Touch ID ou l’empreinte.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-52 flex-1">
          <span className="block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Nom de cet appareil
          </span>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            maxLength={60}
            className="mt-1 w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={ajouter}
          disabled={enCours || pris === null}
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {enCours ? "En attente de l’appareil…" : "Enregistrer cet appareil"}
        </button>
      </div>
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`text-sm ${message.ok ? "text-paid" : "text-overdue"}`}
        >
          {message.texte}
        </p>
      )}
    </div>
  );
}
