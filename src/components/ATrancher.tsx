"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type LigneATrancher = {
  id: string;
  patientId: string | null;
  quand: string;
  nom: string;
  cabinet: React.ReactNode;
  statuer: React.ReactNode;
};

/**
 * Les séances passées à trancher, avec une vue scindée : à partir de 1024 px,
 * « Voir la fiche » ouvre le dossier du patient à droite, sans quitter la liste.
 * On valide une séance, on lit la fiche voisine, on passe à la suivante — sans
 * aller-retour de page en page. Plus étroit, le même bouton est un simple lien.
 *
 * La fiche est la vraie page /admin/patients/…, chargée dans un cadre : tout ce
 * qu'elle sait faire marche. Le cadre est de même origine (voir next.config.ts)
 * et l'outil, reconnaissant qu'il est dans un cadre, n'y remet pas sa barre de
 * navigation (voir app/admin/layout.tsx).
 */
export function ATrancher({ lignes, replie }: { lignes: LigneATrancher[]; replie: boolean }) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const titre = useRef<HTMLHeadingElement | null>(null);
  const declencheur = useRef<HTMLElement | null>(null);

  const index = ouvert ? lignes.findIndex((l) => l.id === ouvert) : -1;
  const courante = index >= 0 ? lignes[index] : null;
  // La séance ouverte a pu être tranchée, donc disparaître de la liste : sans
  // ligne courante, le panneau ne s'affiche tout simplement plus.
  const id = courante?.id ?? null;

  function fermer() {
    setOuvert(null);
    declencheur.current?.focus();
  }

  useEffect(() => {
    if (!id) return;
    titre.current?.focus();
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOuvert(null);
        declencheur.current?.focus();
      }
    };
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [id]);

  function voir(e: React.MouseEvent<HTMLElement>, l: LigneATrancher) {
    // Écran étroit : le lien fait son travail ordinaire.
    if (!window.matchMedia("(min-width: 1024px)").matches || !l.patientId) return;
    e.preventDefault();
    declencheur.current = e.currentTarget;
    setOuvert(l.id);
  }

  const liste = (
    <ul className="flex flex-col divide-y divide-line">
      {lignes.map((l) => (
        <li
          key={l.id}
          className={`flex flex-wrap items-center gap-x-4 gap-y-2 py-2 ${
            l.id === ouvert ? "bg-accent-soft/40" : ""
          }`}
        >
          <time className="w-32 shrink-0 font-mono text-xs" data-numeric>
            {l.quand}
          </time>
          {l.patientId ? (
            <Link
              href={`/admin/patients/${l.patientId}`}
              onClick={(e) => voir(e, l)}
              aria-current={l.id === ouvert ? "true" : undefined}
              className="min-w-32 flex-1 text-sm font-medium hover:text-accent-text"
            >
              {l.nom}
            </Link>
          ) : (
            <Link href="/admin/etablissements" className="min-w-32 flex-1 text-sm font-medium hover:text-accent-text">
              {l.nom}
            </Link>
          )}
          {l.cabinet}
          {l.statuer}
        </li>
      ))}
    </ul>
  );

  const corps = courante ? (
    <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="min-w-0">{liste}</div>
      <section
        aria-labelledby="titre-fiche-voisine"
        className="sticky top-4 flex h-[calc(100vh-2rem)] min-h-96 min-w-0 flex-col overflow-hidden rounded-[14px] border border-line-strong bg-paper"
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
          <h3
            id="titre-fiche-voisine"
            ref={titre}
            tabIndex={-1}
            className="min-w-0 flex-1 truncate text-sm font-semibold outline-none"
          >
            Fiche de {courante.nom}
          </h3>
          <button
            type="button"
            onClick={() => setVersion((v) => v + 1)}
            className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-ink-muted hover:border-accent hover:text-accent-text"
          >
            Actualiser
          </button>
          {lignes.length > 1 && (
            <button
              type="button"
              onClick={() => setOuvert(lignes[(index + 1) % lignes.length].id)}
              className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium hover:border-accent hover:text-accent-text"
            >
              Séance suivante
            </button>
          )}
          <Link
            href={`/admin/patients/${courante.patientId}`}
            className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-ink-muted hover:border-accent hover:text-accent-text"
          >
            Pleine page
          </Link>
          <button
            type="button"
            onClick={fermer}
            className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium hover:border-accent hover:text-accent-text"
          >
            Fermer
          </button>
        </div>
        <iframe
          key={`${courante.patientId}-${version}`}
          src={`/admin/patients/${courante.patientId}`}
          title={`Fiche de ${courante.nom}`}
          className="min-h-0 w-full flex-1 bg-paper"
        />
      </section>
    </div>
  ) : null;

  // Au-delà de trois, la liste se replie (sauf panneau ouvert). En dessous, pas
  // de <details> : sans <summary>, le navigateur afficherait un « Détails ».
  if (replie) {
    return (
      <details className="mt-3" open={courante ? true : undefined}>
        <summary className="w-fit cursor-pointer text-xs font-medium text-accent-text">
          Voir les {lignes.length} séances
        </summary>
        {corps ?? <div className="mt-2">{liste}</div>}
      </details>
    );
  }
  return corps ?? <div className="mt-3">{liste}</div>;
}
