"use client";

import { useState } from "react";

/**
 * Champ de choix de fichier. Le contrôle natif du navigateur écrit « Aucun
 * fichier choisi » dans une largeur qu'on ne maîtrise pas : dans une colonne
 * étroite il se coupait en « Aucu… choisi ». Ici l'élément natif reste là (il
 * porte le nom, l'obligation, le formulaire, le clavier) mais masqué ; ce qu'on
 * voit est un bouton et le nom du fichier, qui se tronque proprement.
 */
export function ChampFichier({
  name,
  accept,
  required,
  capture,
  libelle,
  onChange,
  className = "",
}: {
  name?: string;
  accept?: string;
  required?: boolean;
  capture?: "user" | "environment";
  /** Nom accessible du champ, quand rien d'autre ne l'étiquette. */
  libelle?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  const [nom, setNom] = useState<string | null>(null);
  return (
    <label
      className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-1.5 py-1 text-xs focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${className}`}
    >
      <input
        type="file"
        name={name}
        accept={accept}
        required={required}
        capture={capture}
        aria-label={libelle}
        className="sr-only"
        onChange={(e) => {
          setNom(e.target.files?.[0]?.name ?? null);
          onChange?.(e);
        }}
      />
      <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 font-medium text-accent-text">
        Choisir un fichier
      </span>
      <span className="min-w-0 truncate text-ink-muted">{nom ?? "Aucun fichier"}</span>
    </label>
  );
}
