"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ajouterNote, supprimerNote } from "@/lib/actions";

export type NoteVue = { id: string; body: string; date: string };

/**
 * Notes de dossier : empilées et datées plutôt que réécrites, parce qu'un
 * dossier se lit dans le temps.
 *
 * Le champ n'est pas chiffré à ce stade. Tant qu'il ne l'est pas, l'aide sous
 * le formulaire le rappelle : rien de clinique ne doit y être saisi.
 */
export function Notes({
  patientId,
  notes,
}: {
  patientId: string;
  notes: NoteVue[];
}) {
  const router = useRouter();
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const valeur = texte.trim();
    if (!valeur) return;
    demarrer(async () => {
      const r = await ajouterNote(patientId, valeur);
      if (!r.ok) setErreur(r.message);
      else {
        setTexte("");
        setErreur(null);
        router.refresh();
      }
    });
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold">Notes de dossier</h2>

      <form onSubmit={envoyer} className="mb-4 flex flex-col gap-2">
        <label htmlFor="note" className="sr-only">
          Nouvelle note
        </label>
        <textarea
          id="note"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={3}
          placeholder="Disponibilités, préférences de contact, rappels administratifs…"
          className="w-full resize-y rounded-[14px] border border-line bg-surface px-4 py-3 text-sm placeholder:text-ink-muted/70"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-muted">
            Notes administratives seulement. Le chiffrement des contenus cliniques n’est pas
            encore en place.
          </p>
          <button
            type="submit"
            disabled={enCours || !texte.trim()}
            className="shrink-0 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {enCours ? "Enregistrement…" : "Ajouter"}
          </button>
        </div>
        {erreur && (
          <p role="alert" className="text-xs text-overdue">
            {erreur}
          </p>
        )}
      </form>

      {notes.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-10 text-center text-sm text-ink-muted">
          Aucune note sur ce dossier.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="group flex items-start gap-4 rounded-[14px] border border-line bg-surface px-4 py-3"
            >
              <time className="w-20 shrink-0 pt-0.5 font-mono text-[11px] text-ink-muted" data-numeric>
                {n.date}
              </time>
              <p className="flex-1 text-sm whitespace-pre-wrap">{n.body}</p>
              <button
                type="button"
                onClick={() =>
                  demarrer(async () => {
                    await supprimerNote(n.id, patientId);
                    router.refresh();
                  })
                }
                aria-label="Supprimer cette note"
                className="shrink-0 rounded-full px-2 py-0.5 text-xs text-ink-muted opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-overdue"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
