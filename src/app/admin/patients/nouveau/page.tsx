import Link from "next/link";
import { prisma } from "@/lib/db";
import { creerPatient } from "@/lib/actions";

export const dynamic = "force-dynamic";

const champ =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted/60";
const libelleChamp = "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";

/**
 * Nouveau patient — les mêmes champs que « Modifier la fiche », en création.
 * Rien n'est obligatoire hors nom et prénom : le reste se complète quand on
 * l'a sous la main, au fil de la première prise de contact.
 */
export default async function NouveauPatient() {
  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true, factureInstitution: false },
    orderBy: { ordre: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/patients" className="text-sm text-ink-muted transition-colors hover:text-accent-text">
        ← Tous les patients
      </Link>

      <header>
        <h1 className="font-display text-3xl tracking-tight">Nouveau patient</h1>
      </header>

      <form
        action={creerPatient}
        className="grid gap-3 rounded-[14px] border border-line bg-surface px-5 py-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label>
          <span className={libelleChamp}>Prénom</span>
          <input name="firstName" required autoFocus className={`mt-1 ${champ}`} />
        </label>
        <label>
          <span className={libelleChamp}>Nom</span>
          <input name="lastName" required className={`mt-1 ${champ}`} />
        </label>
        <label>
          <span className={libelleChamp}>Régime</span>
          <select name="scheme" defaultValue="PRIVE" className={`mt-1 ${champ}`}>
            <option value="PRIVE">privé</option>
            <option value="CONVENTIONNE">conventionné</option>
            <option value="INSTITUTION">institution</option>
          </select>
        </label>
        <label>
          <span className={libelleChamp}>Téléphone</span>
          <input name="phone" className={`mt-1 ${champ}`} />
        </label>
        <label>
          <span className={libelleChamp}>E-mail</span>
          <input name="email" type="email" className={`mt-1 ${champ}`} />
        </label>
        <label>
          <span className={libelleChamp}>Naissance</span>
          <input name="birthDate" type="date" className={`mt-1 ${champ}`} />
        </label>
        <label className="sm:col-span-2">
          <span className={libelleChamp}>Rue et numéro</span>
          <input name="addressLine" className={`mt-1 ${champ}`} />
        </label>
        <div className="grid grid-cols-[6rem_1fr] gap-2">
          <label>
            <span className={libelleChamp}>Code</span>
            <input name="postalCode" className={`mt-1 ${champ}`} />
          </label>
          <label>
            <span className={libelleChamp}>Commune</span>
            <input name="city" className={`mt-1 ${champ}`} />
          </label>
        </div>
        <label>
          <span className={libelleChamp}>Tarif (€ — vide si conventionné)</span>
          <input name="feeCents" type="number" step="0.01" min="0" className={`mt-1 ${champ}`} />
        </label>
        <label>
          <span className={libelleChamp}>Cabinet habituel</span>
          <select name="cabinetId" defaultValue="" className={`mt-1 ${champ}`}>
            <option value="">Aucun</option>
            {cabinets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          Créer le dossier
        </button>
      </form>
    </div>
  );
}
