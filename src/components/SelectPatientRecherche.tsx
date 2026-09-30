"use client";

import { useEffect, useId, useRef, useState } from "react";

const champ =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted/60";

/**
 * Choix d'un patient par la recherche plutôt qu'un menu déroulant à faire
 * défiler — devenu long dès que la patientèle dépasse une poignée de noms.
 *
 * Liste maison plutôt que <datalist> : la liste native ne se laisse pas
 * styler — elle apparaît avec les couleurs et la police du système
 * d'exploitation, parfois même mal positionnée sous le champ, ce qui
 * détonnait dans une page par ailleurs entièrement à la charte du site.
 * Celle-ci reprend les mêmes coins arrondis, la même bordure, la même
 * ombre que les autres panneaux flottants de l'outil.
 */
export function SelectPatientRecherche({
  patients,
  name = "patientId",
  defaultId,
}: {
  patients: { id: string; firstName: string; lastName: string }[];
  name?: string;
  defaultId?: string;
}) {
  const listeId = useId();
  const libelle = (p: { firstName: string; lastName: string }) => `${p.lastName} ${p.firstName}`;
  const patientInitial = patients.find((p) => p.id === defaultId);

  const [texte, setTexte] = useState(patientInitial ? libelle(patientInitial) : "");
  const [id, setId] = useState(defaultId ?? "");
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const conteneur = useRef<HTMLDivElement>(null);

  const recherche = texte.trim().toLowerCase();
  const filtres = recherche
    ? patients.filter((p) => libelle(p).toLowerCase().includes(recherche))
    : patients;

  useEffect(() => {
    function onClicAilleurs(e: MouseEvent) {
      if (conteneur.current && !conteneur.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", onClicAilleurs);
    return () => document.removeEventListener("mousedown", onClicAilleurs);
  }, []);

  function choisir(p: { id: string; firstName: string; lastName: string }) {
    setTexte(libelle(p));
    setId(p.id);
    setOuvert(false);
  }

  return (
    <div ref={conteneur} className="relative">
      <input type="hidden" name={name} value={id} />
      <input
        value={texte}
        onChange={(e) => {
          setTexte(e.target.value);
          setId("");
          setOuvert(true);
          setActif(0);
        }}
        onFocus={() => setOuvert(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOuvert(true);
            setActif((a) => Math.min(a + 1, filtres.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActif((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            if (ouvert && filtres[actif]) {
              e.preventDefault();
              choisir(filtres[actif]);
            }
          } else if (e.key === "Escape") {
            setOuvert(false);
          }
        }}
        placeholder="Nom du patient…"
        autoComplete="off"
        role="combobox"
        aria-expanded={ouvert}
        aria-autocomplete="list"
        aria-controls={listeId}
        aria-activedescendant={ouvert && filtres[actif] ? `${listeId}-${actif}` : undefined}
        className={champ}
      />
      {ouvert && (
        <ul id={listeId} role="listbox" className="absolute z-40 mt-1.5 max-h-56 w-full overflow-auto rounded-[14px] border border-line bg-surface py-1.5 shadow-[0_8px_24px_rgba(39,39,87,0.14)]">
          {filtres.length === 0 ? (
            <li className="px-4 py-2 text-sm text-ink-muted">Aucun patient ne correspond.</li>
          ) : (
            filtres.map((p, i) => (
              <li key={p.id} role="option" id={`${listeId}-${i}`} aria-selected={i === actif}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choisir(p)}
                  onMouseEnter={() => setActif(i)}
                  className={`block w-full px-4 py-2 text-left text-sm ${
                    i === actif ? "bg-accent-soft text-accent-text" : "hover:bg-sunken"
                  }`}
                >
                  {libelle(p)}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
