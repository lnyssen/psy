"use client";

import { useId, useRef, useState } from "react";
import { dateIsoVersFr, dateSaisieFr } from "@/lib/format";

/**
 * Champ de date toujours affiché à la française, jj/mm/aaaa.
 *
 * Un input[type=date] prend le format de la langue du navigateur, pas celle de
 * la page : un navigateur réglé en anglais affiche 10/11/2026 pour le
 * 11 octobre, et l'attribut lang n'y change rien. On saisit donc dans un champ
 * texte, et le calendrier natif ne sert plus qu'à choisir, ouvert par le
 * bouton. Le formulaire reçoit toujours AAAA-MM-JJ, par un champ caché : les
 * actions serveur n'ont rien à changer.
 *
 * Contrôlé (value + onChange) ou non (defaultValue), comme un input.
 */
export function ChampDate({
  name,
  defaultValue = "",
  value,
  onChange,
  required,
  min,
  max,
  className = "",
  id,
  ...aria
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (iso: string) => void;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const [interne, setInterne] = useState(defaultValue);
  const iso = value ?? interne;
  const [texte, setTexte] = useState(dateIsoVersFr(iso));
  const [dernierIso, setDernierIso] = useState(iso);
  const calendrier = useRef<HTMLInputElement>(null);
  const idErreur = useId();
  const [erreur, setErreur] = useState("");

  // Valeur changée de l'extérieur (champ contrôlé, calendrier) : le texte suit.
  if (iso !== dernierIso) {
    setDernierIso(iso);
    if (dateSaisieFr(texte) !== iso) setTexte(dateIsoVersFr(iso));
  }

  function poser(nouveau: string) {
    setDernierIso(nouveau);
    if (value === undefined) setInterne(nouveau);
    onChange?.(nouveau);
  }

  function message(v: string, lu: string | null) {
    if (!v.trim()) return required ? "Date à indiquer." : "";
    if (!lu) return "Date attendue au format jj/mm/aaaa.";
    if (min && lu < min) return `Au plus tôt le ${dateIsoVersFr(min)}.`;
    if (max && lu > max) return `Au plus tard le ${dateIsoVersFr(max)}.`;
    return "";
  }

  function saisir(input: HTMLInputElement) {
    const v = input.value;
    setTexte(v);
    const lu = dateSaisieFr(v);
    const m = message(v, lu);
    input.setCustomValidity(m);
    if (!m || !v.trim()) setErreur("");
    if (lu && !m) poser(lu);
    else if (!v.trim()) poser("");
  }

  function quitter(input: HTMLInputElement) {
    const lu = dateSaisieFr(input.value);
    const m = message(input.value, lu);
    input.setCustomValidity(m);
    setErreur(input.value.trim() ? m : "");
    if (lu && !m) setTexte(dateIsoVersFr(lu));
  }

  return (
    <span className="relative block">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="jj/mm/aaaa"
        value={texte}
        required={required}
        aria-label={aria["aria-label"]}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? idErreur : undefined}
        onChange={(e) => saisir(e.currentTarget)}
        onBlur={(e) => quitter(e.currentTarget)}
        onInvalid={(e) => setErreur(message(e.currentTarget.value, dateSaisieFr(e.currentTarget.value)))}
        className={`${className} pr-10 ${erreur ? "border-overdue" : ""}`}
      />
      {name && <input type="hidden" name={name} value={iso} />}
      <input
        ref={calendrier}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={iso}
        min={min}
        max={max}
        onChange={(e) => {
          const v = e.currentTarget.value;
          setTexte(dateIsoVersFr(v));
          setErreur("");
          poser(v);
        }}
        className="pointer-events-none absolute right-3 bottom-0 h-0 w-0 opacity-0"
      />
      <button
        type="button"
        aria-label="Choisir dans le calendrier"
        onClick={() => {
          const c = calendrier.current;
          if (!c) return;
          try {
            c.showPicker();
          } catch {
            c.focus();
          }
        }}
        className="absolute top-1/2 right-1 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-accent-text"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
          <rect x="2" y="3" width="12" height="11" rx="2" />
          <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
        </svg>
      </button>
      {erreur && (
        <span id={idErreur} role="alert" className="mt-1 block text-xs text-overdue">
          {erreur}
        </span>
      )}
    </span>
  );
}
