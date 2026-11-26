"use client";

import { useRef, useState } from "react";
import { PartageRefuse, preparerPdf, remettrePdf } from "@/lib/partager-pdf";

const bouton =
  "rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:border-accent hover:text-accent-text disabled:opacity-40";

/**
 * Un PDF à consulter et à envoyer, sans jamais rester coincé dessus.
 *
 * « Voir » ouvre le PDF dans un nouvel onglet ; dans l'app installée, c'est
 * une fenêtre par-dessus, avec son bouton « OK » / « Fermer » pour revenir,
 * au lieu d'un PDF plein écran sans issue.
 *
 * « Envoyer » ouvre la feuille de partage du téléphone ou du Mac (Mail,
 * WhatsApp, Messages, AirDrop…) avec le fichier en pièce jointe. Ailleurs, le
 * PDF se télécharge, à joindre à un e-mail. Si Safari refuse le partage après
 * la préparation du fichier (voir lib/partager-pdf), le fichier est gardé et
 * un second toucher le partage tout de suite.
 */
export function EnvoyerPdf({
  url,
  titre,
  voir = "PDF",
  envoyer = "envoyer",
}: {
  url: string;
  titre: string;
  /** Texte du lien de consultation ; null pour ne garder que l'envoi. */
  voir?: string | null;
  envoyer?: string;
}) {
  const fichier = useRef<File | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);

  async function partager() {
    setOccupe(true);
    setRetour(null);
    try {
      fichier.current ??= await preparerPdf(url);
      const r = await remettrePdf(fichier.current, titre);
      if (r === "telecharge") {
        setRetour({ ok: true, texte: "PDF téléchargé : joignez-le à votre e-mail." });
      }
    } catch (e) {
      if (e instanceof PartageRefuse) {
        setRetour({ ok: true, texte: `PDF prêt : touchez encore « ${envoyer} ».` });
      } else {
        fichier.current = null;
        setRetour({
          ok: false,
          texte: e instanceof Error && e.message ? e.message : "L’envoi a échoué.",
        });
      }
    } finally {
      setOccupe(false);
    }
  }

  return (
    <>
      {voir && (
        <a href={url} target="_blank" rel="noopener" className={bouton}>
          {voir}
        </a>
      )}
      <button type="button" disabled={occupe} onClick={partager} className={bouton}>
        {occupe ? "préparation…" : envoyer}
      </button>
      {retour && (
        <span
          role={retour.ok ? "status" : "alert"}
          className={`text-[11px] ${retour.ok ? "text-ink-muted" : "text-overdue"}`}
        >
          {retour.texte}
        </span>
      )}
    </>
  );
}
