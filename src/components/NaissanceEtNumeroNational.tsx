"use client";

import { useState } from "react";
import { ChampDate } from "@/components/ChampDate";
import { ChampNumeroNational } from "@/components/ChampNumeroNational";
import { dateIsoVersFr, debutNumeroNational, naissanceDesSixChiffres } from "@/lib/format";

/**
 * Date de naissance et numéro national côte à côte. Les six premiers chiffres
 * du numéro sont la date de naissance à l'envers (AAMMJJ : 81 07 24 → le
 * 24/07/1981) : la date se remplit dès qu'ils sont tapés, sans attendre le
 * numéro complet. Une date déjà saisie qui ne correspond pas n'est pas
 * écrasée en silence : un bouton propose de la remplacer.
 *
 * Dans l'autre sens, une date connue et un numéro vide : le champ du numéro
 * affiche ses six premiers chiffres en indication.
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
  const [proposee, setProposee] = useState<string | null>(null);
  const [numeroVide, setNumeroVide] = useState(!numeroInitial);

  function saisieNumero(numero: string) {
    setNumeroVide(!numero.trim());
    const d = naissanceDesSixChiffres(numero);
    if (!d) {
      setProposee(null);
      return;
    }
    const iso = d.toISOString().slice(0, 10);
    if (!naissance || naissance === deduite) {
      setNaissance(iso);
      setDeduite(iso);
      setProposee(null);
    } else {
      setProposee(iso === naissance ? null : iso);
    }
  }

  const debut = debutNumeroNational(naissance);

  return (
    <>
      <label>
        <span className={libelle}>Date de naissance</span>
        <ChampDate
          name="birthDate"
          value={naissance}
          onChange={(v) => {
            setNaissance(v);
            setProposee(null);
          }}
          className={`mt-1 ${champ}`}
        />
        {deduite && deduite === naissance && (
          <span className="mt-1 block text-[11px] text-ink-muted">Déduite du numéro national.</span>
        )}
        {proposee && (
          <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-due">
            Le numéro national indique le {dateIsoVersFr(proposee)}.
            <button
              type="button"
              onClick={() => {
                setNaissance(proposee);
                setDeduite(proposee);
                setProposee(null);
              }}
              className="rounded-full border border-line-strong px-2 py-0.5 font-medium text-ink transition-colors hover:border-accent hover:text-accent-text"
            >
              Utiliser cette date
            </button>
          </span>
        )}
      </label>
      <label>
        <span className={libelle}>Numéro national</span>
        <ChampNumeroNational
          defaultValue={numeroInitial}
          onSaisie={saisieNumero}
          placeholder={numeroVide && debut ? `${debut}-XXX.CC` : "AAMMJJ-XXX.CC"}
          className={`mt-1 ${champ}`}
        />
        <span className="mt-1 block text-[11px] text-ink-muted">
          Les six premiers chiffres sont la date de naissance à l’envers : 81 07 24 → 24/07/1981.
        </span>
      </label>
    </>
  );
}
