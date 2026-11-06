"use client";

import { useId, useState } from "react";
import { heureSaisieFr } from "@/lib/format";

const PAS = 15;

/** HH:MM décalé d'un quart d'heure, calé sur le quart : 08:50 + → 09:00. */
function decaler(hhmm: string, sens: 1 | -1): string {
  const [h, m] = hhmm.split(":").map(Number);
  const min = h * 60 + m;
  const cale = sens > 0 ? Math.floor(min / PAS) * PAS + PAS : Math.ceil(min / PAS) * PAS - PAS;
  const borne = Math.min(23 * 60 + 45, Math.max(0, cale));
  return `${String(Math.floor(borne / 60)).padStart(2, "0")}:${String(borne % 60).padStart(2, "0")}`;
}

/**
 * Champ d'heure sur 24 heures, quelle que soit la langue du navigateur : un
 * input[type=time] passe en AM/PM dans un navigateur réglé en anglais. Se tape
 * librement (9h30, 0930, 14.15) ; les boutons − et +, comme les flèches du
 * clavier, avancent ou reculent d'un quart d'heure. Le formulaire reçoit
 * toujours HH:MM.
 *
 * `valeur` permet au parent de déplacer l'heure (la fin qui suit le début) ;
 * `surChangement` lui signale chaque heure valide.
 */
export function ChampHeure({
  name,
  defaultValue = "",
  valeur: imposee,
  surChangement,
  required,
  className = "",
  id,
  ...aria
}: {
  name: string;
  defaultValue?: string;
  valeur?: string;
  surChangement?: (hhmm: string) => void;
  required?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const [texte, setTexte] = useState(imposee ?? defaultValue);
  const [valeur, setValeur] = useState(imposee ?? defaultValue);
  const [erreur, setErreur] = useState("");
  const idErreur = useId();

  // Une heure imposée par le parent (la fin qui suit le début) remplace la
  // saisie : ajustement pendant le rendu, comme le recommande React.
  const [vue, setVue] = useState(imposee);
  if (imposee !== vue) {
    setVue(imposee);
    if (imposee !== undefined && imposee !== valeur) {
      setTexte(imposee);
      setValeur(imposee);
      setErreur("");
    }
  }

  function message(v: string) {
    if (!v.trim()) return required ? "Heure à indiquer." : "";
    return heureSaisieFr(v) ? "" : "Heure attendue sur 24 heures, par exemple 14:30.";
  }

  function poser(v: string) {
    setTexte(v);
    setValeur(v);
    setErreur("");
    surChangement?.(v);
  }

  function pas(sens: 1 | -1) {
    poser(decaler(heureSaisieFr(texte) ?? (sens > 0 ? "08:45" : "09:15"), sens));
  }

  const bouton =
    "grid size-5 shrink-0 place-items-center rounded-full text-base leading-none text-ink-muted transition-colors hover:bg-sunken hover:text-ink";

  return (
    <span className="block">
      <span
        className={`flex items-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${className} ${erreur ? "border-overdue" : ""}`}
      >
        {/* Le champ vient en premier : un <label> englobant active son premier
            élément, qui ne doit pas être un bouton. */}
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="hh:mm"
          value={texte}
          required={required}
          aria-label={aria["aria-label"]}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? idErreur : undefined}
          onChange={(e) => {
            const v = e.currentTarget.value;
            setTexte(v);
            e.currentTarget.setCustomValidity(message(v));
            if (!message(v)) setErreur("");
            const lu = heureSaisieFr(v);
            setValeur(lu ?? "");
            if (lu) surChangement?.(lu);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              pas(e.key === "ArrowUp" ? 1 : -1);
              e.currentTarget.setCustomValidity("");
            }
          }}
          onBlur={(e) => {
            const v = e.currentTarget.value;
            setErreur(v.trim() ? message(v) : "");
            const lu = heureSaisieFr(v);
            if (lu) setTexte(lu);
          }}
          onInvalid={(e) => setErreur(message(e.currentTarget.value))}
          className="w-full min-w-0 bg-transparent tabular-nums outline-none focus-visible:outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Un quart d’heure plus tôt"
          onClick={() => pas(-1)}
          className={bouton}
        >
          −
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Un quart d’heure plus tard"
          onClick={() => pas(1)}
          className={bouton}
        >
          +
        </button>
      </span>
      <input type="hidden" name={name} value={valeur} />
      {erreur && (
        <span id={idErreur} role="alert" className="mt-1 block text-xs text-overdue">
          {erreur}
        </span>
      )}
    </span>
  );
}
