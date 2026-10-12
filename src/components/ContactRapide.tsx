"use client";

import { useState } from "react";
import { lienWhatsApp } from "@/lib/contact";

const bouton =
  "rounded-full border border-line-strong px-3 py-1 text-xs font-medium transition-colors hover:border-accent hover:text-accent-text";

/**
 * Gestes rapides sur les coordonnées : les copier d'un bloc (pour les coller
 * dans un message ou un événement d'agenda), appeler, ou ouvrir WhatsApp vers
 * chaque numéro connu. Un numéro que WhatsApp ne saurait pas lire n'a pas de
 * lien WhatsApp.
 */
export function ContactRapide({
  texte,
  numeros,
}: {
  texte: string;
  numeros: { libelle: string; tel: string }[];
}) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2000);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : on le dit.
      window.prompt("Copiez les coordonnées :", texte);
    }
  }

  return (
    <div className="sans-impression mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
      <button type="button" onClick={copier} className={bouton}>
        {copie ? "Copié ✓" : "Copier les coordonnées"}
      </button>
      {/* Annonce pour les lecteurs d'écran : le libellé du bouton change sans
          que rien ne le dise (WCAG 4.1.3). */}
      <span role="status" className="sr-only">
        {copie ? "Coordonnées copiées" : ""}
      </span>
      {numeros.map((n) => {
        const wa = lienWhatsApp(n.tel);
        const suffixe = n.libelle ? ` · ${n.libelle}` : "";
        return (
          <span key={n.tel} className="contents">
            <a href={`tel:${n.tel.replace(/[^\d+]/g, "")}`} className={bouton}>
              Appeler{suffixe}
            </a>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={bouton}>
                WhatsApp{suffixe}
              </a>
            )}
          </span>
        );
      })}
    </div>
  );
}
