"use client";

import { useId, useState } from "react";

/** Lit un nombre saisi à la française (virgule ou point). Null si ce n'en est pas un. */
function lire(v: string): number | null {
  const t = v.trim().replace(",", ".");
  if (!t || !/^-?\d*\.?\d+$/.test(t)) return null;
  return Number(t);
}

/** Écrit un nombre sans zéros inutiles, avec une virgule : 1.5 → « 1,5 ». */
function ecrire(n: number): string {
  return String(Math.round(n * 1000) / 1000).replace(".", ",");
}

/**
 * Le compteur de l'outil : un champ en pilule, comme les autres, qui se tape
 * librement et s'ajuste avec − et + (ou les flèches du clavier), au pas
 * indiqué. Même dessin que le champ d'heure : un seul modèle de compteur
 * partout (séances déjà faites, périodes INAMI, réglages, décomptes).
 *
 * Le formulaire reçoit un nombre avec un point décimal, par un champ caché :
 * les actions serveur n'ont rien à changer. Contrôlé (value + onChange) ou
 * non (defaultValue), comme un input.
 */
export function ChampNombre({
  name,
  defaultValue = "",
  value,
  onChange,
  min,
  max,
  pas = 1,
  required,
  placeholder,
  readOnly,
  className = "",
  id,
  ...aria
}: {
  name: string;
  defaultValue?: string | number;
  value?: string;
  onChange?: (v: string) => void;
  min?: number;
  max?: number;
  pas?: number;
  required?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  const [interne, setInterne] = useState(String(defaultValue).replace(".", ","));
  const texte = value !== undefined ? value.replace(".", ",") : interne;
  const [erreur, setErreur] = useState("");
  const idErreur = useId();

  const lu = lire(texte);
  const normalise = lu === null ? "" : String(lu);

  function message(v: string) {
    if (!v.trim()) return required ? "Valeur à indiquer." : "";
    const n = lire(v);
    if (n === null) return "Nombre attendu.";
    if (min !== undefined && n < min) return `Au moins ${ecrire(min)}.`;
    if (max !== undefined && n > max) return `Au plus ${ecrire(max)}.`;
    return "";
  }

  function poser(v: string) {
    if (value === undefined) setInterne(v);
    onChange?.(v.replace(",", "."));
  }

  function decaler(sens: 1 | -1) {
    if (readOnly) return;
    const n = lire(texte) ?? (sens > 0 ? (min ?? 0) - pas : (min ?? 0) + pas);
    let suivant = Math.round((n + sens * pas) / pas) * pas;
    if (min !== undefined) suivant = Math.max(min, suivant);
    if (max !== undefined) suivant = Math.min(max, suivant);
    setErreur("");
    poser(ecrire(suivant));
  }

  const n = lu ?? NaN;
  const bouton =
    "grid size-6 shrink-0 place-items-center rounded-full text-base leading-none text-ink-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <span className="block">
      <span
        className={`flex items-center gap-0.5 pr-1.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${className} ${erreur ? "border-overdue" : ""}`}
      >
        {/* Le champ vient en premier : un <label> englobant active son premier
            élément, qui ne doit pas être un bouton. */}
        <input
          id={id}
          type="text"
          inputMode={pas % 1 === 0 ? "numeric" : "decimal"}
          autoComplete="off"
          value={texte}
          placeholder={placeholder}
          readOnly={readOnly}
          required={required}
          aria-label={aria["aria-label"]}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={[aria["aria-describedby"], erreur ? idErreur : ""].filter(Boolean).join(" ") || undefined}
          onChange={(e) => {
            const v = e.currentTarget.value;
            e.currentTarget.setCustomValidity(message(v));
            if (!message(v)) setErreur("");
            poser(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              decaler(e.key === "ArrowUp" ? 1 : -1);
              e.currentTarget.setCustomValidity("");
            }
          }}
          onBlur={(e) => {
            const v = e.currentTarget.value;
            setErreur(v.trim() ? message(v) : "");
          }}
          onInvalid={(e) => setErreur(message(e.currentTarget.value))}
          className="w-full min-w-0 bg-transparent tabular-nums outline-none focus-visible:outline-none"
        />
        {!readOnly && (
          <>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Moins"
              disabled={min !== undefined && n <= min}
              onClick={() => decaler(-1)}
              className={bouton}
            >
              −
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Plus"
              disabled={max !== undefined && n >= max}
              onClick={() => decaler(1)}
              className={bouton}
            >
              +
            </button>
          </>
        )}
      </span>
      <input type="hidden" name={name} value={normalise} />
      {erreur && (
        <span id={idErreur} role="alert" className="mt-1 block text-xs text-overdue">
          {erreur}
        </span>
      )}
    </span>
  );
}
