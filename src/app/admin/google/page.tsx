import Link from "next/link";
import { prisma } from "@/lib/db";
import { alertesQuota } from "@/lib/quotas";
import { LigneGoogle } from "@/components/LigneGoogle";
import { Pagination, pageDe, tailleDePage } from "@/components/Pagination";
import type { Params } from "@/components/filtres";
import { fmtHeure, fmtJourMois } from "@/lib/format";
import { grouperEnLignes } from "@/lib/google-afaire";
import { etatGoogle, synchroniser } from "@/lib/google-sync";
import { traiterSansTitre } from "@/lib/google-actions";
import { suggererPatient } from "@/lib/google-correspondance";

export const dynamic = "force-dynamic";

/**
 * Tri des événements Google Agenda « à rattacher ».
 *
 * Une page à part, et non un panneau sur la semaine : le calendrier est ce
 * qu'on vient y chercher chaque jour, le tri est une tâche ponctuelle. Posé
 * au-dessus de la grille, il la repoussait de plusieurs écrans dès que
 * l'agenda importé comptait quelques dizaines de lignes.
 */
export default async function GoogleATraiter({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;

  // L'agenda doit être frais à l'ouverture. Passage incrémental, donc court ;
  // on n'attend jamais plus de quelques secondes, et un échec n'empêche pas
  // d'afficher.
  await Promise.race([
    synchroniser({ maxAgeMs: 30_000 }).catch(() => null),
    new Promise((r) => setTimeout(r, 4500)),
  ]);

  const etat = await etatGoogle();
  if (!etat.connecte) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl tracking-tight">Google Agenda</h1>
        <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-muted">
          Ton Google Agenda n’est pas connecté.{" "}
          <Link href="/admin/reglages#google" className="font-medium text-accent-text underline">
            Le connecter dans les réglages
          </Link>
          .
        </p>
      </div>
    );
  }

  const maintenant = new Date();
  const voir = params.voir ? await prisma.evenementGoogle.findUnique({ where: { id: params.voir } }) : null;
  const q = (params.q ?? "").trim();

  // « Voir » : un seul événement ou une seule série, quel que soit son statut —
  // c'est le lien d'un bloc du calendrier, y compris un créneau déjà marqué
  // occupé qu'on voudrait finalement rattacher.
  const lignesBrutes = voir
    ? await prisma.evenementGoogle.findMany({
        where: voir.serieId ? { serieId: voir.serieId } : { id: voir.id },
        orderBy: { debut: "asc" },
      })
    : await prisma.evenementGoogle.findMany({
        where: {
          statut: "A_RATTACHER",
          fin: { gte: maintenant },
          ...(q ? { titre: { contains: q, mode: "insensitive" as const } } : {}),
        },
        orderBy: { debut: "asc" },
      });

  const lignes = grouperEnLignes(lignesBrutes);
  const taille = tailleDePage(params);
  const page = Math.min(pageDe(params), Math.max(1, Math.ceil(lignes.length / taille)));
  const affichees = lignes.slice((page - 1) * taille, page * taille);

  const [patientsBruts, cabinetsActifs, sansTitre, alertes] = await Promise.all([
    prisma.patient.findMany({
      where: { active: true },
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.cabinet.findMany({
      where: { actif: true },
      orderBy: { ordre: "asc" },
      select: { id: true, nom: true, factureInstitution: true },
    }),
    voir
      ? 0
      : prisma.evenementGoogle.count({
          where: { statut: "A_RATTACHER", fin: { gte: maintenant }, titre: "(sans titre)" },
        }),
    alertesQuota(),
  ]);
  const patients = patientsBruts.map((p) => ({ ...p, alerte: alertes.get(p.id) }));

  // Compte rendu d'un rattachement qui vient d'avoir lieu.
  const fait = params.fait !== undefined ? Number(params.fait) : null;
  const patientFait = params.p ? patients.find((p) => p.id === params.p) : null;
  const cabinetFait = params.c ? cabinetsActifs.find((c) => c.id === params.c) : null;

  const quand = (e: { debut: Date; fin: Date }) =>
    `${fmtJourMois.format(e.debut)} · ${fmtHeure.format(e.debut)}–${fmtHeure.format(e.fin)}`;
  const libelleStatut = { A_RATTACHER: null, OCCUPE: "Marqué occupé", IGNORE: "Ignoré" } as const;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Google Agenda</h1>
          <p className="mt-2 text-sm text-ink-muted" data-numeric>
            {voir
              ? "Un seul événement, ou une seule série."
              : lignes.length === 0
                ? "Rien à traiter."
                : `${lignes.length} à traiter · ${lignesBrutes.length} rendez-vous au total`}
          </p>
        </div>
        <span className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/admin/semaine"
            className="rounded-full border border-line-strong px-4 py-1.5 font-medium transition-colors hover:border-accent hover:text-accent-text"
          >
            ← Agenda
          </Link>
          <Link
            href="/admin/reglages#google"
            className="rounded-full border border-line-strong px-4 py-1.5 font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            Réglages Google
          </Link>
        </span>
      </header>

      {fait !== null && (
        <p role="status" className="rounded-[14px] bg-paid-soft px-5 py-3 text-sm text-paid">
          {fait === 0 ? (
            "Rien n’a été créé : ces événements étaient déjà rattachés."
          ) : (
            <>
              {fait} séance{fait > 1 ? "s" : ""} créée{fait > 1 ? "s" : ""}{" "}
              {patientFait ? (
                <>
                  pour{" "}
                  <Link href={`/admin/patients/${patientFait.id}`} className="font-semibold underline">
                    {patientFait.firstName} {patientFait.lastName}
                  </Link>
                </>
              ) : (
                <>à {cabinetFait?.nom ?? "l’établissement"}</>
              )}
              . Elles sont dans le calendrier.
              {patientFait && alertes.has(patientFait.id) && (
                <span className="mt-1 block font-semibold text-due">{alertes.get(patientFait.id)}</span>
              )}
            </>
          )}
        </p>
      )}

      {voir && (
        <p className="text-sm">
          <Link href="/admin/google" className="font-medium text-accent-text underline">
            Voir tout ce qui est à traiter
          </Link>
        </p>
      )}

      {!voir && (
        <div className="flex flex-wrap items-center gap-3">
          <form method="get" className="flex items-center gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Chercher un titre…"
              aria-label="Chercher un titre"
              className="w-56 rounded-full border border-line bg-surface px-3.5 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-full border border-line-strong px-4 py-1.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text"
            >
              Filtrer
            </button>
            {q && (
              <Link href="/admin/google" className="text-sm text-ink-muted underline">
                Effacer
              </Link>
            )}
          </form>
          {sansTitre > 0 && (
            <details className="group rounded-[14px] open:border open:border-dashed open:border-line-strong open:bg-surface open:px-4 open:py-3">
              <summary className="w-fit cursor-pointer list-none rounded-full border border-line-strong px-4 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-text">
                Traiter les {sansTitre} sans titre…
              </summary>
              <p className="mt-3 max-w-xl text-sm text-ink-muted">
                Ces événements n’ont pas de titre : impossible de savoir s’ils concernent un patient.
                Que faire de tous les {sansTitre} ?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={traiterSansTitre.bind(null, "OCCUPE")}>
                  <button
                    type="submit"
                    className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
                  >
                    Les marquer occupés
                  </button>
                </form>
                <form action={traiterSansTitre.bind(null, "IGNORE")}>
                  <button
                    type="submit"
                    className="rounded-full border border-line-strong px-4 py-1.5 text-sm font-medium transition-colors hover:border-overdue hover:text-overdue"
                  >
                    Les ignorer
                  </button>
                </form>
              </div>
              <p className="mt-2 max-w-xl text-xs text-ink-muted">
                « Occupés » : ils restent dans le calendrier et empêchent la réservation en ligne sur
                ces créneaux. « Ignorés » : ils disparaissent des deux.
              </p>
            </details>
          )}
        </div>
      )}

      {lignes.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-muted">
          {q
            ? "Aucun événement à traiter ne correspond à cette recherche."
            : "Tout est traité. Les nouveaux rendez-vous ajoutés dans Google apparaîtront ici ; ceux qui portent le prénom et le nom d’un patient deviennent ses séances d’eux-mêmes."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {affichees.map(({ tete, occurrences }) => (
            <LigneGoogle
              key={tete.id}
              id={tete.id}
              ancres={occurrences.map((o) => o.id)}
              titre={tete.titre}
              lieu={tete.lieu}
              quand={quand(tete)}
              occurrences={occurrences.length}
              jusquau={
                occurrences.length > 1 ? fmtJourMois.format(occurrences[occurrences.length - 1].debut) : null
              }
              statut={libelleStatut[tete.statut]}
              suggestion={(() => {
                const p = suggererPatient(tete.titre, patients);
                return p ? { id: p.id, nom: `${p.firstName} ${p.lastName}` } : null;
              })()}
              patients={patients}
              cabinets={cabinetsActifs}
            />
          ))}
        </ul>
      )}

      {!voir && <Pagination base="/admin/google" params={params} total={lignes.length} taille={taille} />}
    </div>
  );
}
