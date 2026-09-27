"use client";

import { useState } from "react";

const champ =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted/60";
const libelleChamp = "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";

/**
 * Photo du reçu, avec lecture automatique du montant, de la date et du
 * fournisseur — locale, dans le navigateur (Tesseract.js), rien envoyé
 * dehors. Un reçu de dépense n'est pas une donnée de santé, mais l'OCR local
 * a été préféré à un service dans le cloud pour ne pas dépendre d'une clé API
 * ni d'un coût récurrent pour ce premier jet.
 *
 * La lecture reste une aide, pas une saisie : les champs se préremplissent
 * mais restent modifiables, et rien ne s'y remplace si elle a déjà tapé
 * quelque chose — un reçu froissé ou mal cadré se corrige à la main.
 */
export function DepensePhotoOCR() {
  const [statut, setStatut] = useState<"repos" | "lecture" | "fait" | "echec">("repos");

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    setStatut("repos");
    if (!fichier || !fichier.type.startsWith("image/")) return;

    const form = e.target.form;
    if (!form) return;

    setStatut("lecture");
    try {
      // Chargé à la demande : la plupart des visites de cette page ne
      // photographient rien, ça ne vaut pas d'alourdir le chargement initial.
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("fra");
      const {
        data: { text },
      } = await worker.recognize(fichier);
      await worker.terminate();
      remplir(form, text);
      setStatut("fait");
    } catch {
      setStatut("echec");
    }
  }

  return (
    <label>
      <span className={libelleChamp}>Photo du reçu</span>
      {/* capture="environment" ouvre directement l'appareil photo arrière sur
          téléphone plutôt que la pellicule : photographier au comptoir, pas
          retrouver une image plus tard. */}
      <input
        name="photo"
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        onChange={onChange}
        className={`mt-1 ${champ} file:mr-3 file:rounded-full file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:text-xs file:font-medium file:text-accent-text`}
      />
      {statut === "lecture" && (
        <span className="mt-1.5 block text-xs text-ink-muted">Lecture du reçu…</span>
      )}
      {statut === "fait" && (
        <span className="mt-1.5 block text-xs text-ink-muted">
          Montant, date et fournisseur préremplis quand ils ont été reconnus — à vérifier.
        </span>
      )}
      {statut === "echec" && (
        <span className="mt-1.5 block text-xs text-ink-muted">
          Lecture impossible : les champs restent à remplir à la main.
        </span>
      )}
    </label>
  );
}

/** Ne remplit un champ que s'il est encore vide : ce que la praticienne a
 *  déjà tapé prime toujours sur ce que l'OCR croit lire. */
function poser(form: HTMLFormElement, nom: string, valeur: string | null) {
  if (!valeur) return;
  const champ = form.elements.namedItem(nom);
  if (champ instanceof HTMLInputElement && !champ.value) champ.value = valeur;
}

function remplir(form: HTMLFormElement, texte: string) {
  poser(form, "montant", extraireMontant(texte));
  poser(form, "date", extraireDate(texte));
  poser(form, "fournisseur", extraireFournisseur(texte));
}

/**
 * Le plus grand nombre à deux décimales du ticket — c'est presque toujours le
 * total, plus grand que la TVA et que les lignes de détail. Imparfait sur un
 * ticket à un seul article, mais c'est justement le cas le plus facile.
 */
function extraireMontant(texte: string): string | null {
  const trouves = [...texte.matchAll(/(\d{1,4})[.,](\d{2})(?!\d)/g)].map(
    (m) => Number(m[1]) + Number(m[2]) / 100,
  );
  if (trouves.length === 0) return null;
  return Math.max(...trouves).toFixed(2);
}

/** Une date JJ/MM/AAAA, JJ-MM-AAAA ou JJ.MM.AAAA quelconque, ramenée au format
 *  AAAA-MM-JJ qu'attend un input[type=date]. Deux chiffres d'année valent
 *  20xx : aucun reçu de cette pratique ne date d'avant 2000. */
function extraireDate(texte: string): string | null {
  const m = /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/.exec(texte);
  if (!m) return null;
  const jour = Number(m[1]);
  const mois = Number(m[2]);
  let annee = Number(m[3]);
  if (annee < 100) annee += 2000;
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return null;
  return `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

/** La première ligne qui ressemble à un nom plutôt qu'à un numéro ou une
 *  ligne de ponctuation isolée — sur la plupart des tickets, l'enseigne
 *  s'imprime en tête. */
function extraireFournisseur(texte: string): string | null {
  const ligne = texte
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length >= 3 && /[a-zA-ZÀ-ÿ]{3}/.test(l) && !/^\d+$/.test(l));
  return ligne ?? null;
}
