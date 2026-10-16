"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { verrouiller } from "@/lib/auth-actions";

const DELAI_MS = 30 * 60 * 1000;
/** On prévient une minute avant. */
const AVERTIR_MS = DELAI_MS - 60 * 1000;
/** Au plus un signal au serveur toutes les cinq minutes. */
const PING_MS = 5 * 60 * 1000;

/**
 * Verrouille l'outil après trente minutes sans aucun geste.
 *
 * Le serveur applique la même règle de son côté (le cookie de session expire
 * au bout de trente minutes sans requête) : ceci n'est que ce qui la rend
 * visible — l'écran se verrouille, au lieu de se révéler périmé au prochain
 * clic — et ce qui prolonge la session pendant qu'on écrit sans changer de
 * page.
 *
 * L'échéance se calcule d'après l'horloge (Date.now), pas d'après un
 * compte à rebours : un onglet en arrière-plan ou un téléphone en veille
 * suspend les minuteurs, et l'écran doit être verrouillé au réveil, pas
 * trente minutes plus tard.
 */
export function VerrouInactivite() {
  const router = useRouter();
  const dernierGeste = useRef(0);
  const dernierPing = useRef(0);
  const [avertir, setAvertir] = useState(false);

  useEffect(() => {
    const maintenant = Date.now();
    dernierGeste.current = maintenant;
    dernierPing.current = maintenant;

    function ping() {
      dernierPing.current = Date.now();
      fetch("/admin/ping", { method: "POST", credentials: "same-origin" })
        .then((r) => {
          // Session déjà expirée côté serveur : le proxy a redirigé.
          if (r.redirected) router.push("/connexion?verrouille=1");
        })
        .catch(() => {});
    }

    function geste() {
      const t = Date.now();
      if (t - dernierGeste.current >= DELAI_MS) {
        verrouiller();
        return;
      }
      dernierGeste.current = t;
      setAvertir(false);
      if (t - dernierPing.current >= PING_MS) ping();
    }

    function verifier() {
      const inactif = Date.now() - dernierGeste.current;
      if (inactif >= DELAI_MS) verrouiller();
      else setAvertir(inactif >= AVERTIR_MS);
    }

    const evenements = ["pointerdown", "keydown", "wheel", "touchstart"];
    for (const e of evenements)
      window.addEventListener(e, geste, { passive: true, capture: true });
    // Le défilement d'un long dossier est aussi du travail.
    window.addEventListener("scroll", geste, { passive: true, capture: true });
    const minuteur = window.setInterval(verifier, 15_000);
    const reveil = () => {
      if (document.visibilityState === "visible") verifier();
    };
    document.addEventListener("visibilitychange", reveil);

    return () => {
      for (const e of evenements)
        window.removeEventListener(e, geste, { capture: true });
      window.removeEventListener("scroll", geste, { capture: true });
      window.clearInterval(minuteur);
      document.removeEventListener("visibilitychange", reveil);
    };
  }, [router]);

  if (!avertir) return null;
  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Verrouillage imminent"
      className="sans-impression fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-[14px] border border-due/40 bg-surface px-4 py-3 text-sm shadow-lg"
    >
      <span className="flex-1">
        Pas d’activité : l’outil se verrouille dans une minute.
      </span>
      <button
        type="button"
        autoFocus
        onClick={() => {
          dernierGeste.current = Date.now();
          setAvertir(false);
          fetch("/admin/ping", { method: "POST", credentials: "same-origin" }).catch(
            () => {},
          );
        }}
        className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
      >
        Rester connecté
      </button>
    </div>
  );
}
