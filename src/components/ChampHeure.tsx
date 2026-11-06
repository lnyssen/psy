"use client";

import { useId, useState } from "react";
import { heureSaisieFr } from "@/lib/format";

/** Quarts d'heure de 7 h à 21 h, proposés à la frappe. */
const QUARTS = Array.from({ length: (21 - 7) * 4 + 1 }, (_, i) => {
  const min = 7 * 60 + i * 15;
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
});

/**
 * Champ d'heure sur 24 heures, quelle que soit la langue du navigateur : un
 * input[type=time] passe en AM/PM dans un navigateur réglé en anglais. Se tape
 * librement (9h30, 0930, 14.15) et propose les quarts d'heure ; le formulaire
 * reçoit toujours HH:MM.
 */
export function ChampHeure({
  name,
  defaultValue = "",
  required,
  className = "",
  id,
  ...aria
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const [texte, setTexte] = useState(defaultValue);
  const [valeur, setValeur] = useState(defaultValue);
  const [erreur, setErreur] = useState("");
  const idListe = useId();
  const idErreur = useId();

  function message(v: string) {
    if (!v.trim()) return required ? "Heure à indiquer." : "";
    return heureSaisieFr(v) ? "" : "Heure attendue sur 24 heures, par exemple 14:30.";
  }

  return (
    <span className="block">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="hh:mm"
        list={idListe}
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
          setValeur(heureSaisieFr(v) ?? "");
        }}
        onBlur={(e) => {
          const v = e.currentTarget.value;
          setErreur(v.trim() ? message(v) : "");
          const lu = heureSaisieFr(v);
          if (lu) setTexte(lu);
        }}
        onInvalid={(e) => setErreur(message(e.currentTarget.value))}
        className={`${className} ${erreur ? "border-overdue" : ""}`}
      />
      <datalist id={idListe}>
        {QUARTS.map((q) => (
          <option key={q} value={q} />
        ))}
      </datalist>
      <input type="hidden" name={name} value={valeur} />
      {erreur && (
        <span id={idErreur} role="alert" className="mt-1 block text-xs text-overdue">
          {erreur}
        </span>
      )}
    </span>
  );
}
