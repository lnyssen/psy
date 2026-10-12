"use client";

import { useState, useTransition } from "react";
import { envoyerAttestationParCourriel } from "@/lib/attestation-actions";
import { partagerPdf } from "@/lib/partager-pdf";

const champ =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted/60";
const libelle = "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";
const bouton =
  "rounded-full border border-line-strong px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text disabled:opacity-40";

/**
 * Attestation de présence d'un patient : on choisit la période, on dit pour qui
 * elle est, puis on l'ouvre, on l'envoie par e-mail ou on la partage (WhatsApp,
 * SMS…). Elle se compose à chaque fois d'après les séances honorées ; rien n'est
 * enregistré.
 */
export function Attestation({
  patientId,
  prive,
  duInitial,
  auInitial,
}: {
  patientId: string;
  /** Un patient conventionné ne paie rien : pas de montants à mentionner. */
  prive: boolean;
  duInitial: string;
  auInitial: string;
}) {
  const [du, setDu] = useState(duInitial);
  const [au, setAu] = useState(auInitial);
  const [montants, setMontants] = useState(false);
  const [pour, setPour] = useState("");
  const [enCours, demarrer] = useTransition();
  const [occupe, setOccupe] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);

  const adresse = () => {
    const q = new URLSearchParams({ du, au });
    if (montants && prive) q.set("montants", "1");
    if (pour.trim()) q.set("pour", pour.trim());
    return `/api/attestation/${patientId}?${q.toString()}`;
  };
  const valide = Boolean(du && au);

  async function apercu() {
    setOccupe(true);
    setRetour(null);
    try {
      const r = await fetch(adresse());
      if (!r.ok) {
        setRetour({ ok: false, texte: (await r.text()) || "L’attestation n’a pas pu être préparée." });
        return;
      }
      const url = URL.createObjectURL(await r.blob());
      if (!window.open(url, "_blank")) {
        // Fenêtre bloquée : on remplace par un lien explicite.
        setRetour({ ok: true, texte: "Fenêtre bloquée par le navigateur : autorisez-la, puis réessayez." });
      }
    } catch {
      setRetour({ ok: false, texte: "L’attestation n’a pas pu être préparée." });
    } finally {
      setOccupe(false);
    }
  }

  async function partager() {
    setOccupe(true);
    setRetour(null);
    const r = await partagerPdf(adresse(), "Attestation de présence");
    if (!r.ok) setRetour({ ok: false, texte: r.message ?? "Le partage a échoué." });
    setOccupe(false);
  }

  return (
    <details
      id="attestation"
      className="rounded-[14px] open:order-last open:basis-full open:border open:border-line open:bg-surface open:px-5 open:py-4"
    >
      <summary className="w-fit cursor-pointer list-none rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text">
        Attestation
      </summary>
      <div className="mt-4 flex flex-col gap-4">
        <p className="max-w-2xl text-sm text-ink-muted">
          Atteste que le patient a consulté, aux dates de ses séances honorées sur la période
          choisie. Pour une mutuelle, une assurance, un employeur ou une école. Elle ne dit rien du
          contenu des séances.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <span className={libelle}>Du</span>
            <input type="date" value={du} onChange={(e) => setDu(e.target.value)} className={`mt-1 ${champ}`} />
          </label>
          <label>
            <span className={libelle}>Au</span>
            <input type="date" value={au} onChange={(e) => setAu(e.target.value)} className={`mt-1 ${champ}`} />
          </label>
          <label className="sm:col-span-2">
            <span className={libelle}>Pour (facultatif)</span>
            <input
              value={pour}
              onChange={(e) => setPour(e.target.value)}
              maxLength={120}
              list="destinations-attestation"
              placeholder="mutuelle, assurance, école…"
              className={`mt-1 ${champ}`}
            />
            <datalist id="destinations-attestation">
              <option value="la mutuelle" />
              <option value="l’assurance" />
              <option value="l’employeur" />
              <option value="l’école" />
            </datalist>
          </label>
        </div>
        {prive && (
          <label className="flex max-w-2xl items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={montants}
              onChange={(e) => setMontants(e.target.checked)}
              className="mt-1 accent-accent"
            />
            <span>
              Mentionner les montants réglés
              <span className="block text-xs text-ink-muted">
                Seules les séances payées figurent alors sur l’attestation, avec le total réglé.
              </span>
            </span>
          </label>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!valide || occupe} onClick={apercu} className={bouton}>
            Ouvrir le PDF
          </button>
          <button
            type="button"
            disabled={!valide || enCours}
            onClick={() =>
              demarrer(async () => {
                setRetour(null);
                const r = await envoyerAttestationParCourriel(patientId, {
                  du,
                  au,
                  montants: montants && prive,
                  pour: pour.trim(),
                });
                setRetour({ ok: r.ok, texte: r.message });
              })
            }
            className={bouton}
          >
            {enCours ? "Envoi…" : "Envoyer par e-mail"}
          </button>
          <button type="button" disabled={!valide || occupe} onClick={partager} className={bouton}>
            Partager
          </button>
          {retour && (
            <span
              role={retour.ok ? "status" : "alert"}
              className={`text-sm ${retour.ok ? "text-paid" : "text-overdue"}`}
            >
              {retour.texte}
            </span>
          )}
        </div>
      </div>
    </details>
  );
}
