"use client";

import { useState } from "react";
import { ChampDate } from "@/components/ChampDate";
import { ChampNumeroNational } from "@/components/ChampNumeroNational";
import { naissanceDuNumeroNational } from "@/lib/format";

/**
 * Date de naissance et numéro national côte à côte : le numéro commence par
 * la date (AAMMJJ), elle se remplit donc d'elle-même dès qu'il est complet.
 * Une date déjà saisie à la main qui ne correspond pas n'est pas écrasée ;
 * celle que le numéro avait remplie, si.
 */
export function NaissanceEtNumeroNational({
  naissanceInitiale,
  numeroInitial,
  libelle,
  champ,
}: {
  naissanceInitiale: string;
  numeroInitial: string;
  libelle: string;
  champ: string;
}) {
  const [naissance, setNaissance] = useState(naissanceInitiale);
  const [deduite, setDeduite] = useState<string | null>(null);

  function numeroValide(numero: string) {
    const d = naissanceDuNumeroNational(numero);
    if (!d) return;
    const iso = d.toISOString().slice(0, 10);
    if (!naissance || naissance === deduite) {
      setNaissance(iso);
      setDeduite(iso);
    }
  }

  return (
    <>
      <label>
        <span className={libelle}>Date de naissance</span>
        <ChampDate name="birthDate" value={naissance} onChange={setNaissance} className={`mt-1 ${champ}`} />
        {deduite && deduite === naissance && (
          <span className="mt-1 block text-[11px] text-ink-muted">Déduite du numéro national.</span>
        )}
      </label>
      <label>
        <span className={libelle}>Numéro national</span>
        <ChampNumeroNational defaultValue={numeroInitial} onValide={numeroValide} className={`mt-1 ${champ}`} />
      </label>
    </>
  );
}
