import Link from "next/link";
import { prisma } from "@/lib/db";
import { creerPatient } from "@/lib/actions";
import { FormulairePatient } from "@/components/FormulairePatient";

export const dynamic = "force-dynamic";


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

  const tarifs = await prisma.tarif.findMany({
    where: { actif: true },
    orderBy: { ordre: "asc" },
    select: {
      id: true,
      libelle: true,
      amountCents: true,
      regime: true,
      parDefaut: true,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/patients"
        className="text-sm text-ink-muted transition-colors hover:text-accent-text"
      >
        ← Tous les patients
      </Link>

      <header>
        <h1 className="font-display text-3xl tracking-tight">
          Nouveau patient
        </h1>
      </header>

      <div className="max-w-3xl rounded-[14px] border border-line bg-surface px-6 py-6">
        <FormulairePatient
          action={creerPatient}
          tarifs={tarifs}
          cabinets={cabinets}
          libelleBouton="Créer le dossier"
        />
      </div>
    </div>
  );
}
