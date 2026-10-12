import Link from "next/link";
import { prisma } from "@/lib/db";
import { BoutonImprimer } from "@/components/BoutonImprimer";
import {
  ajouterJours,
  debutDeJour,
  fmtHeure,
  fmtJourLong,
  fmtJourMoisAn,
  isoJour,
  JOURS_OUVRES,
  lundiDe,
  memeJour,
  nomSeance,
} from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Feuille de route imprimable : la journée ou la semaine, séance par séance,
 * en liste simple. Ce n'est pas l'impression de la grille de l'agenda — les
 * navigateurs retirent les fonds de couleur, et les boutons n'ont rien à faire
 * sur papier. Ne figurent que l'heure, le nom, le lieu et la visio : ni
 * téléphone, ni note, ni montant, puisque la feuille peut traîner sur un bureau.
 */
export default async function Imprimer({
  searchParams,
}: {
  searchParams: Promise<{ jour?: string; semaine?: string; cabinet?: string }>;
}) {
  const { jour, semaine, cabinet } = await searchParams;
  const valide = (s?: string) => {
    const d = s ? new Date(s) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };
  const unJour = valide(jour);
  const debut = unJour ? debutDeJour(unJour) : lundiDe(valide(semaine) ?? new Date());
  const nbJours = unJour ? 1 : JOURS_OUVRES;
  const fin = ajouterJours(debut, nbJours);

  const seances = await prisma.session.findMany({
    where: {
      startsAt: { gte: debut, lt: fin },
      status: { not: "CANCELLED_IN_TIME" },
      ...(cabinet ? { cabinetId: cabinet } : {}),
    },
    orderBy: { startsAt: "asc" },
    include: { patient: true, cabinet: true },
  });
  const lieu = cabinet ? seances[0]?.cabinet.nom : null;

  const jours = Array.from({ length: nbJours }, (_, i) => ajouterJours(debut, i));
  const titre = unJour
    ? `Journée du ${fmtJourMoisAn.format(debut)}`
    : `Semaine du ${fmtJourMoisAn.format(debut)} au ${fmtJourMoisAn.format(ajouterJours(debut, JOURS_OUVRES - 1))}`;
  const retour = unJour ? "/admin" : `/admin/semaine?semaine=${isoJour(debut)}`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <style>{"@media print { @page { size: A4; margin: 14mm; } }"}</style>
      <div className="sans-impression flex flex-wrap items-center justify-between gap-3">
        <Link
          href={retour}
          className="text-sm text-ink-muted transition-colors hover:text-accent-text"
        >
          ← Retour
        </Link>
        <BoutonImprimer />
      </div>

      <header>
        <h1 className="font-display text-3xl tracking-tight">{titre}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Amandine Monsel — AMAPSY SRL{lieu ? ` · ${lieu}` : ""}
        </p>
      </header>

      {jours.map((d) => {
        const duJour = seances.filter((s) => memeJour(s.startsAt, d));
        return (
          <section key={d.toISOString()} className="break-inside-avoid">
            <h2 className="border-b border-ink/40 pb-1 text-sm font-semibold first-letter:uppercase">
              {fmtJourLong.format(d)}
            </h2>
            {duJour.length === 0 ? (
              <p className="py-2 text-sm text-ink-muted">Aucune séance.</p>
            ) : (
              <ul className="divide-y divide-line">
                {duJour.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-2 text-sm"
                  >
                    <span className="w-28 shrink-0 font-mono" data-numeric>
                      {fmtHeure.format(s.startsAt)}–
                      {fmtHeure.format(new Date(s.startsAt.getTime() + s.durationMin * 60_000))}
                    </span>
                    <span className="min-w-40 flex-1 font-medium">{nomSeance(s)}</span>
                    <span className="text-ink-muted">
                      {s.cabinet.nom}
                      {s.visio ? " · visio" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
