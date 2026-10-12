"use client";

import { useState, useTransition } from "react";
import { envoyerRecuParCourriel } from "@/lib/recu-actions";
import { partagerPdf } from "@/lib/partager-pdf";

const bouton =
  "rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:border-accent hover:text-accent-text disabled:opacity-40";

/**
 * Remettre le reçu au patient : par e-mail, en pièce jointe, ou à la main —
 * « partager » ouvre la feuille de partage du téléphone (WhatsApp, SMS, Mail…)
 * avec le PDF ; là où elle n'existe pas, le fichier se télécharge.
 */
export function EnvoyerRecu({
  id,
  dejaEnvoye = false,
}: {
  id: string;
  /** Un reçu est déjà parti par e-mail : on le dit, sans empêcher de le renvoyer. */
  dejaEnvoye?: boolean;
}) {
  const [enCours, demarrer] = useTransition();
  const [partage, setPartage] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(
    null,
  );

  async function partager() {
    setPartage(true);
    setRetour(null);
    const r = await partagerPdf(`/api/recu/${id}`, "Reçu d’honoraires");
    if (!r.ok) setRetour({ ok: false, texte: r.message ?? "Le partage a échoué." });
    setPartage(false);
  }

  return (
    <>
      <button
        type="button"
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            setRetour(null);
            const r = await envoyerRecuParCourriel(id);
            setRetour({ ok: r.ok, texte: r.message });
          })
        }
        className={bouton}
      >
        {enCours ? "envoi…" : dejaEnvoye ? "renvoyer par e-mail" : "envoyer par e-mail"}
      </button>
      <button type="button" disabled={partage} onClick={partager} className={bouton}>
        partager
      </button>
      {dejaEnvoye && !retour && (
        <span className="text-[11px] text-ink-muted">déjà envoyé</span>
      )}
      {retour && (
        <span
          role={retour.ok ? "status" : "alert"}
          className={`text-[11px] ${retour.ok ? "text-paid" : "text-overdue"}`}
        >
          {retour.texte}
        </span>
      )}
    </>
  );
}
