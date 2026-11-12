import Link from "next/link";
import { prisma } from "@/lib/db";
import { alertesQuota } from "@/lib/quotas";
import { LigneGoogle } from "@/components/LigneGoogle";
import { Pagination, pageDe, tailleDePage } from "@/components/Pagination";
import type { Params } from "@/components/filtres";
import { fmtHeure, fmtJourMois } from "@/lib/format";
import { grouperEnLignes } from "@/lib/google-afaire";
import { chargerReferentiel, etatGoogle, synchroniser } from "@/lib/google-sync";
import { oublierTitre, synchroniserMaintenant, traiterSansTitre } from "@/lib/google-actions";
import { cabinetAutorise, proposer } from "@/lib/google-correspondance";
import { PropositionsGoogle } from "@/components/PropositionsGoogle";
import { mentionParticipants } from "@/lib/participants";

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

  const [ref, titresRetenus, sansTitre, alertes] = await Promise.all([
    chargerReferentiel(),
    prisma.aliasGoogle.findMany({
      orderBy: { cle: "asc" },
      select: {
        id: true,
        cle: true,
        participants: true,
        patient: { select: { firstName: true, lastName: true } },
        cabinet: { select: { nom: true } },
      },
    }),
    voir
      ? 0
      : prisma.evenementGoogle.count({
          where: { statut: "A_RATTACHER", fin: { gte: maintenant }, titre: "(sans titre)" },
        }),
    alertesQuota(),
  ]);
  const patients = ref.patients.map((p) => ({ ...p, alerte: alertes.get(p.id) }));
  const cabinetsActifs = ref.cabinets.filter((c) => c.actif);
  const nomCabinet = new Map(ref.cabinets.map((c) => [c.id, c.nom]));

  // Lieu habituel de chaque patient : celui de sa dernière séance, sinon celui
  // de sa fiche. Le choix d'un patient dans une ligne y met le lieu.
  const lieuParPatient: Record<string, string> = {};
  for (const p of ref.patients) {
    const fiche = ref.cabinets.find((c) => c.id === p.cabinetId);
    const lieu = ref.dernierCabinet.get(p.id) ?? (fiche && cabinetAutorise(fiche) ? fiche.id : undefined);
    if (lieu) lieuParPatient[p.id] = lieu;
  }

  const quand = (e: { debut: Date; fin: Date }) =>
    `${fmtJourMois.format(e.debut)} · ${fmtHeure.format(e.debut)}–${fmtHeure.format(e.fin)}`;

  // Ce que l'outil propose pour chaque ligne (patient, lieu, accompagnants).
  const propositions = new Map(
    lignes.map(({ tete }) => {
      const p = tete.statut === "A_RATTACHER" ? proposer(tete, ref) : null;
      return [tete.id, p && p !== "refuse" ? p : null] as const;
    }),
  );
  const aValider = voir
    ? []
    : lignes.flatMap(({ tete, occurrences }) => {
        const p = propositions.get(tete.id);
        if (!p || !p.cabinetId) return [];
        return [
          {
            valeur: `${tete.id}|${p.patient.id}|${p.cabinetId}|${p.participants}`,
            titre: tete.titre,
            patient: `${p.patient.firstName} ${p.patient.lastName}`,
            lieu: nomCabinet.get(p.cabinetId) ?? "",
            accompagnants: mentionParticipants(p.participants),
            quand: quand(tete),
            occurrences: occurrences.length,
          },
        ];
      });

  // Compte rendu d'un rattachement qui vient d'avoir lieu.
  const fait = params.fait !== undefined ? Number(params.fait) : null;
  const patientFait = params.p ? patients.find((p) => p.id === params.p) : null;
  const cabinetFait = params.c ? cabinetsActifs.find((c) => c.id === params.c) : null;

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
          <form action={synchroniserMaintenant} className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span data-numeric>
              {etat.derniereSynchro
                ? `Synchronisé avec Google à ${fmtHeure.format(etat.derniereSynchro)}`
                : "Jamais synchronisé"}
            </span>
            <button type="submit" className="font-medium text-accent-text underline">
              Synchroniser maintenant
            </button>
          </form>
          {etat.derniereErreur && (
            <p role="alert" className="mt-2 max-w-xl rounded-[10px] border border-overdue/40 px-3 py-2 text-xs text-overdue">
              {etat.derniereErreur}
            </p>
          )}
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

      {(params.auto || params.lot) && (
        <p role="status" className="rounded-[14px] bg-paid-soft px-5 py-3 text-sm text-paid" data-numeric>
          {params.lot &&
            `${params.lot} séance${Number(params.lot) > 1 ? "s" : ""} créée${Number(params.lot) > 1 ? "s" : ""} (${params.lignes ?? 0} titre${Number(params.lignes) > 1 ? "s" : ""}). `}
          {params.auto &&
            `${params.auto} autre${Number(params.auto) > 1 ? "s" : ""} rendez-vous du même titre rattaché${Number(params.auto) > 1 ? "s" : ""} automatiquement. `}
          Tout est dans le calendrier.
        </p>
      )}

      {aValider.length > 0 && <PropositionsGoogle propositions={aValider} />}

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
              proposition={(() => {
                const p = propositions.get(tete.id);
                return p
                  ? {
                      patientId: p.patient.id,
                      nom: `${p.patient.firstName} ${p.patient.lastName}`,
                      cabinetId: p.cabinetId ?? lieuParPatient[p.patient.id] ?? null,
                      participants: p.participants,
                    }
                  : null;
              })()}
              lieuParPatient={lieuParPatient}
              patients={patients}
              cabinets={cabinetsActifs}
            />
          ))}
        </ul>
      )}

      {!voir && <Pagination base="/admin/google" params={params} total={lignes.length} taille={taille} />}

      {!voir && titresRetenus.length > 0 && (
        <details className="rounded-[14px] border border-line px-5 py-3">
          <summary className="cursor-pointer text-sm font-medium">
            {`Titres retenus (${titresRetenus.length})`}
          </summary>
          <p className="mt-2 max-w-2xl text-xs text-ink-muted">
            Un rendez-vous ajouté dans Google avec l’un de ces titres devient tout seul une séance du
            patient indiqué. Ajouter le nom d’un lieu au titre (« Anas Auderghem ») change le lieu pour
            ce rendez-vous-là. « Oublier » ne touche pas aux séances déjà créées.
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-line text-sm">
            {titresRetenus.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-semibold">« {t.cle} »</span>
                  {` → ${t.patient.firstName} ${t.patient.lastName}`}
                  <span className="text-ink-muted">
                    {t.cabinet ? ` · ${t.cabinet.nom}` : ""}
                    {mentionParticipants(t.participants) ? ` · ${mentionParticipants(t.participants)}` : ""}
                  </span>
                </span>
                <form action={oublierTitre.bind(null, t.id)}>
                  <button type="submit" className="text-xs text-ink-muted underline hover:text-overdue">
                    Oublier
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
