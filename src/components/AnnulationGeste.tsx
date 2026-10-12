"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { etatsDe, restaurerSeances, type EtatSeance } from "@/lib/annulation-actions";

const EVENEMENT = "amapsy:annulation";
const DUREE_MS = 8000;

type Proposition = { message: string; avant: EtatSeance[] };

/**
 * Un geste qu'on peut défaire. L'appelant lit l'état des séances avant d'agir,
 * agit, puis annonce le résultat : un message « … · Annuler » reste quelques
 * secondes en haut de l'écran.
 *
 *   const avant = await etatsDe(ids);
 *   await statuerSeances(ids, "ATTENDED");
 *   proposerAnnulation("Séance marquée honorée", avant);
 */
export function proposerAnnulation(message: string, avant: EtatSeance[]) {
  window.dispatchEvent(new CustomEvent<Proposition>(EVENEMENT, { detail: { message, avant } }));
}

/** Lit l'état, exécute le geste, annonce l'annulation possible. */
export async function avecAnnulation<T>(
  ids: string[],
  message: string,
  geste: () => Promise<T>,
  reussi: (r: T) => boolean = () => true,
) {
  const avant = await etatsDe(ids);
  const r = await geste();
  if (reussi(r)) proposerAnnulation(message, avant);
  return r;
}

/**
 * Zone des messages d'annulation, posée une fois dans l'outil. Le message
 * s'efface seul au bout de huit secondes, mais reste tant qu'on le survole ou
 * qu'il a le focus : le temps de lire n'est pas celui du minuteur. Il est
 * annoncé aux lecteurs d'écran (role=status).
 */
export function ZoneAnnulation() {
  const router = useRouter();
  const [courante, setCourante] = useState<Proposition | null>(null);
  const [retour, setRetour] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const minuteur = useRef<number | null>(null);

  const armer = () => {
    if (minuteur.current) window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => setCourante(null), DUREE_MS);
  };
  const suspendre = () => {
    if (minuteur.current) window.clearTimeout(minuteur.current);
  };

  useEffect(() => {
    const ecoute = (e: Event) => {
      setRetour(null);
      setCourante((e as CustomEvent<Proposition>).detail);
      armer();
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCourante(null);
    };
    window.addEventListener(EVENEMENT, ecoute);
    window.addEventListener("keydown", echap);
    return () => {
      window.removeEventListener(EVENEMENT, ecoute);
      window.removeEventListener("keydown", echap);
      suspendre();
    };
  }, []);

  function annuler() {
    if (!courante) return;
    const { avant } = courante;
    suspendre();
    demarrer(async () => {
      await restaurerSeances(avant);
      setCourante(null);
      setRetour("Rétabli.");
      window.setTimeout(() => setRetour(null), 3000);
      router.refresh();
    });
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="sans-impression pointer-events-none fixed inset-x-4 top-20 z-50 flex justify-center md:top-5 md:right-5 md:left-auto"
    >
      {(courante || retour) && (
        <div
          onMouseEnter={suspendre}
          onMouseLeave={() => courante && armer()}
          onFocus={suspendre}
          className="pointer-events-auto flex max-w-md items-center gap-4 rounded-[14px] border border-line bg-surface px-4 py-3 text-sm shadow-[0_16px_32px_-16px_rgba(27,20,100,0.45)]"
        >
          <span>{courante ? courante.message : retour}</span>
          {courante && (
            <button
              type="button"
              disabled={enCours}
              onClick={annuler}
              className="rounded-full border border-line-strong px-3.5 py-1 text-sm font-semibold text-accent-text transition-colors hover:border-accent disabled:opacity-40"
            >
              Annuler
            </button>
          )}
        </div>
      )}
    </div>
  );
}
