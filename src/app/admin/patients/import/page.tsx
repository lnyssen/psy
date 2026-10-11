import Link from "next/link";
import { ImportPatients } from "@/components/ImportPatients";
import { CHAMPS } from "@/lib/import-patients";

export const dynamic = "force-dynamic";

export default function ImporterPatients() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/patients" className="text-sm text-ink-muted transition-colors hover:text-accent-text">
        ← Tous les patients
      </Link>

      <header className="max-w-2xl">
        <h1 className="font-display text-3xl tracking-tight">Importer des patients</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Depuis un fichier Excel (.xlsx). Tu vérifies le résultat avant que quoi que ce soit soit créé, et un patient
          déjà présent n’est jamais écrasé.
        </p>
      </header>

      <section className="flex max-w-2xl flex-col gap-3 rounded-[14px] border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">1. Prépare le fichier</h2>
        <p className="text-sm text-ink-muted">
          Utilise ton fichier tel quel : les intitulés usuels (Prénom, Nom, GSM, Ville…) sont reconnus, et tu peux
          corriger la correspondance à l’étape suivante. Sinon, pars du modèle : menus déroulants pour le régime, le
          tarif et le cabinet, zéros des numéros conservés.
        </p>
        <div>
          <a
            href="/api/patients/modele"
            className="inline-block rounded-full border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-sunken"
          >
            Télécharger le modèle Excel
          </a>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-ink-muted hover:text-ink">Colonnes attendues</summary>
          <table className="mt-3 w-full border-collapse text-left text-xs">
            <tbody>
              {CHAMPS.map((c) => (
                <tr key={c.cle} className="border-t border-line align-top">
                  <th scope="row" className="py-1.5 pr-3 font-medium whitespace-nowrap">
                    {c.libelle}
                    {c.obligatoire && " *"}
                  </th>
                  <td className="py-1.5 text-ink-muted">{c.aide || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <ImportPatients champs={CHAMPS.map(({ cle, libelle, obligatoire }) => ({ cle, libelle, obligatoire }))} />
    </div>
  );
}
