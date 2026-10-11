"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enregistrerNoteSeance } from "@/lib/seance-actions";

const GABARIT = "Motif / thème :\n\nObservations :\n\nPistes de travail :\n\nPour la prochaine séance :\n";

/**
 * Note clinique d'une séance. Contrairement aux notes de dossier, elle est
 * chiffrée en base (NOTES_KEY) : c'est ici, et seulement ici, que le
 * contenu clinique a sa place. Le texte arrive déjà déchiffré du serveur.
 */
export function NoteSeance({
  id,
  note,
  disponible,
}: {
  id: string;
  note: string | null;
  /** Faux quand NOTES_KEY manque ou qu'une note existante n'a pas pu être lue. */
  disponible: boolean;
}) {
  const router = useRouter();
  const [texte, setTexte] = useState(note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function enregistrer() {
    demarrer(async () => {
      const r = await enregistrerNoteSeance(id, texte);
      setMessage(r.ok ? "Enregistrée." : r.message);
      if (r.ok) router.refresh();
    });
  }

  return (
    <details className="w-full">
      <summary className="w-fit cursor-pointer list-none rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-text">
        {note ? "note de séance" : "+ note"}
      </summary>
      {!disponible ? (
        <p className="mt-2 text-xs text-overdue">
          Notes de séance indisponibles : la clé NOTES_KEY est absente ou ne correspond pas.
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={texte}
            onChange={(e) => {
              setTexte(e.target.value);
              setMessage(null);
            }}
            rows={6}
            className="w-full resize-y rounded-[14px] border border-line bg-surface px-4 py-3 text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={enCours}
              onClick={enregistrer}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-40"
            >
              Enregistrer
            </button>
            {!texte.trim() && (
              <button
                type="button"
                onClick={() => setTexte(GABARIT)}
                className="rounded-full border border-line-strong px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
              >
                Partir du gabarit
              </button>
            )}
            <span className="text-xs text-ink-muted">
              {message ?? "Chiffrée avant d’être enregistrée."}
            </span>
          </div>
        </div>
      )}
    </details>
  );
}
