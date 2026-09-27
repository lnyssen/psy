"use client";

import { useId, useState } from "react";

const champ =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted/60";

/**
 * Choix d'un patient par la recherche plutôt qu'un menu déroulant à faire
 * défiler — devenu long dès que la patientèle dépasse une poignée de noms.
 *
 * <datalist> plutôt qu'un composant de recherche sur mesure : le filtrage à
 * la frappe est natif, sans dépendance ni requête. La difficulté qu'il pose
 * d'ordinaire — retrouver l'identifiant derrière le texte choisi — se
 * résout ici par une simple correspondance de libellé, tenue à jour dans un
 * champ caché à chaque frappe.
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
  const parLibelle = new Map(patients.map((p) => [libelle(p), p.id]));

  const patientInitial = patients.find((p) => p.id === defaultId);
  const [texte, setTexte] = useState(patientInitial ? libelle(patientInitial) : "");
  const [id, setId] = useState(defaultId ?? "");

  return (
    <>
      <input type="hidden" name={name} value={id} />
      <input
        list={listeId}
        value={texte}
        onChange={(e) => {
          const saisie = e.target.value;
          setTexte(saisie);
          setId(parLibelle.get(saisie) ?? "");
        }}
        placeholder="Nom du patient…"
        autoComplete="off"
        className={champ}
      />
      <datalist id={listeId}>
        {patients.map((p) => (
          <option key={p.id} value={libelle(p)} />
        ))}
      </datalist>
    </>
  );
}
