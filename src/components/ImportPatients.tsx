"use client";

import { ChampFichier } from "@/components/ChampFichier";
import Link from "next/link";
import { useState, useTransition } from "react";
import { analyserImport, importerPatients, type AnalyseImport, type ResultatImport } from "@/lib/import-actions";
import type { ChampImport } from "@/lib/import-patients";

type Champ = { cle: ChampImport; libelle: string; obligatoire: boolean };

const bouton =
  "rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50";
const select =
  "w-full rounded-full border border-line bg-surface px-3 py-1.5 text-xs";

export function ImportPatients({ champs }: { champs: Champ[] }) {
  const [cleChamp, setCleChamp] = useState(0);
  const [fichier, setFichier] = useState<File | null>(null);
  const [analyse, setAnalyse] = useState<Extract<AnalyseImport, { ok: true }> | null>(null);
  const [mapping, setMapping] = useState<(ChampImport | "")[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<Extract<ResultatImport, { ok: true }> | null>(null);
  const [enCours, demarrer] = useTransition();

  const formulaire = (m: (ChampImport | "")[] | null) => {
    const f = new FormData();
    if (fichier) f.set("fichier", fichier);
    if (m) f.set("mapping", JSON.stringify(m));
    return f;
  };

  function analyser(m: (ChampImport | "")[] | null) {
    setErreur(null);
    setResultat(null);
    demarrer(async () => {
      const r = await analyserImport(formulaire(m));
      if (!r.ok) {
        setAnalyse(null);
        setErreur(r.erreur);
        return;
      }
      setAnalyse(r);
      setMapping(r.mapping);
    });
  }

  function importer() {
    setErreur(null);
    demarrer(async () => {
      const r = await importerPatients(formulaire(mapping));
      if (!r.ok) {
        setErreur(r.erreur);
        return;
      }
      setResultat(r);
      setAnalyse(null);
      setFichier(null);
      setCleChamp((k) => k + 1);
    });
  }

  function changerColonne(i: number, valeur: ChampImport | "") {
    const suivant = mapping.map((m, k) => (k === i ? valeur : valeur !== "" && m === valeur ? "" : m));
    setMapping(suivant);
    analyser(suivant);
  }

  const aImporter = analyse?.lignes.filter((l) => l.statut === "ok").length ?? 0;
  const doublons = analyse?.lignes.filter((l) => l.statut === "doublon").length ?? 0;
  const enErreur = analyse?.lignes.filter((l) => l.statut === "erreur").length ?? 0;
  const colonnesOk = mapping.includes("prenom") && mapping.includes("nom");

  return (
    <div className="flex flex-col gap-6">
      <section className="flex max-w-2xl flex-col gap-3 rounded-[14px] border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">2. Choisis le fichier</h2>
        <ChampFichier
          key={cleChamp}
          libelle="Fichier Excel des patients (.xlsx)"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            setFichier(e.target.files?.[0] ?? null);
            setAnalyse(null);
            setResultat(null);
            setErreur(null);
          }}
        />
        <div>
          <button type="button" disabled={!fichier || enCours} onClick={() => analyser(null)} className={bouton}>
            {enCours && !analyse ? "Lecture…" : "Vérifier le fichier"}
          </button>
        </div>
        <p className="text-xs text-ink-muted">Le fichier n’est pas conservé : il sert à lire les lignes, puis il est oublié.</p>
      </section>

      {erreur && (
        <p role="alert" className="max-w-2xl rounded-[14px] border border-due/40 bg-due/10 px-4 py-3 text-sm text-due">
          {erreur}
        </p>
      )}

      {resultat && (
        <div role="status" className="max-w-2xl rounded-[14px] border border-line bg-surface p-5 text-sm">
          <p className="font-medium" data-numeric>
            {resultat.importes} patient{resultat.importes > 1 ? "s" : ""} importé{resultat.importes > 1 ? "s" : ""}.
          </p>
          {(resultat.ignores > 0 || resultat.erreurs > 0) && (
            <p className="mt-1 text-ink-muted" data-numeric>
              {resultat.ignores > 0 && `${resultat.ignores} déjà présent${resultat.ignores > 1 ? "s" : ""}, ignoré${resultat.ignores > 1 ? "s" : ""}. `}
              {resultat.erreurs > 0 && `${resultat.erreurs} ligne${resultat.erreurs > 1 ? "s" : ""} sans prénom ou sans nom, non importée${resultat.erreurs > 1 ? "s" : ""}.`}
            </p>
          )}
          <Link href="/admin/patients" className="mt-3 inline-block text-accent-text underline">
            Voir les patients
          </Link>
        </div>
      )}

      {analyse && (
        <>
          <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold">3. Vérifie les colonnes</h2>
            <p className="text-sm text-ink-muted">
              Feuille « {analyse.feuille} », {analyse.total} ligne{analyse.total > 1 ? "s" : ""}. Corrige la
              correspondance si une colonne a été mal reconnue.
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              {analyse.entetes.map((e, i) =>
                e || mapping[i] ? (
                  <label key={i} className="flex flex-col gap-1">
                    <span className="truncate text-xs font-medium" title={e}>
                      {e || `Colonne ${i + 1}`}
                    </span>
                    <select
                      className={select}
                      value={mapping[i] ?? ""}
                      disabled={enCours}
                      onChange={(ev) => changerColonne(i, ev.target.value as ChampImport | "")}
                    >
                      <option value="">— ignorer —</option>
                      {champs.map((c) => (
                        <option key={c.cle} value={c.cle}>
                          {c.libelle}
                          {c.obligatoire ? " *" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null,
              )}
            </div>
            {!colonnesOk && (
              <p role="alert" className="text-sm text-due">
                Il manque une colonne {!mapping.includes("prenom") && "Prénom"}
                {!mapping.includes("prenom") && !mapping.includes("nom") && " et une colonne "}
                {!mapping.includes("nom") && "Nom"} : choisis-la dans les menus ci-dessus.
              </p>
            )}
          </section>

          {colonnesOk && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">4. Importe</h2>
              <p className="text-sm" data-numeric>
                <strong>{aImporter}</strong> à importer
                {doublons > 0 && <> · {doublons} déjà présent{doublons > 1 ? "s" : ""} (ignoré{doublons > 1 ? "s" : ""})</>}
                {enErreur > 0 && <> · <span className="text-due">{enErreur} à corriger</span></>}
              </p>
              <div>
                <button type="button" disabled={enCours || aImporter === 0} onClick={importer} className={bouton}>
                  {enCours ? "Import…" : `Importer ${aImporter} patient${aImporter > 1 ? "s" : ""}`}
                </button>
              </div>

              <div
                className="overflow-x-auto rounded-[14px] border border-line bg-surface"
                tabIndex={0}
                role="region"
                aria-label="Aperçu de l’import (tableau défilant)"
              >
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line bg-sunken text-[11px] tracking-[0.1em] text-ink-muted uppercase">
                      <th className="px-3 py-2.5 text-left font-semibold">Ligne</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Patient</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Résultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyse.lignes.map((l) => (
                      <tr key={l.numero} className="border-b border-line align-top last:border-b-0">
                        <td className="px-3 py-2 font-mono text-xs text-ink-muted" data-numeric>
                          {l.numero}
                        </td>
                        <td className="px-3 py-2 font-medium">{l.nom}</td>
                        <td className="px-3 py-2 text-xs">
                          {l.statut === "ok" && !l.avertissements.length && <span className="text-ink-muted">Prêt</span>}
                          {l.statut === "doublon" && <span className="text-ink-muted">{l.avertissements.join(" ; ")}</span>}
                          {l.statut === "erreur" && <span className="text-due">{l.erreurs.join(" ; ")}</span>}
                          {l.statut === "ok" && l.avertissements.length > 0 && (
                            <span className="text-ink-muted">Prêt — {l.avertissements.join(" ; ")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
