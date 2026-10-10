"use client";

import { useState } from "react";
import { numeroNational } from "@/lib/format";

/**
 * Saisie du numéro national, vérifiée à la frappe : le serveur refuse une clé
 * fausse sans rien dire, alors autant le savoir avant d'enregistrer. Le
 * message s'affiche sous le champ et bloque l'envoi du formulaire tant qu'il
 * n'est pas corrigé ; le reste de la saisie reste en place.
 */
export function ChampNumeroNational({ defaultValue = "", className }: { defaultValue?: string; className: string }) {
  const [erreur, setErreur] = useState("");

  function verifier(input: HTMLInputElement) {
    const v = input.value.trim();
    const message = !v
      ? ""
      : !/^\d{11}$/.test(v.replace(/[\s.\-]/g, ""))
        ? "Il faut 11 chiffres, au format AAMMJJ-XXX.CC."
        : !numeroNational(v)
          ? "Ce numéro national n'existe pas : la clé de contrôle (les deux derniers chiffres) ne correspond pas."
          : "";
    input.setCustomValidity(message);
    setErreur(message);
  }

  return (
    <>
      <input
        name="nationalNumber"
        defaultValue={defaultValue}
        placeholder="AAMMJJ-XXX.CC"
        inputMode="numeric"
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? "erreur-numero-national" : undefined}
        onChange={(e) => verifier(e.currentTarget)}
        onInvalid={(e) => verifier(e.currentTarget)}
        className={`${className} ${erreur ? "border-overdue" : ""}`}
      />
      {erreur && (
        <span id="erreur-numero-national" role="alert" className="mt-1 block text-xs text-overdue">
          {erreur}
        </span>
      )}
    </>
  );
}
