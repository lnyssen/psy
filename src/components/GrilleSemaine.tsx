"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { deplacerSeance } from "@/lib/actions";
import { IconFlecheBas, IconFlecheHaut } from "@/components/icons";

export type SeanceGrille = {
  id: string;
  patientId: string;
  nom: string;
  isoDebut: string;
  /** Minutes écoulées depuis minuit, heure de Bruxelles. */
  minutes: number;
  duree: number;
  jour: number; // 0 = lundi
  cabinetNom: string;
  cabinetColor: string;
  cabinetFill: string;
  paiement: "DUE" | "PAID" | "OVERDUE" | null;
  libellePaiement: string | null;
  conflit: boolean;
};

export type JourGrille = { iso: string; nom: string; numero: string; total: string; aujourdhui: boolean };

// 92 px l'heure : à 68, un bloc de 45 minutes ne laissait pas assez de hauteur
// au nom du patient, que le flex écrasait à zéro sous la pastille de paiement.
const PX_PAR_HEURE = 104;
const PAS_MINUTES = 15;
// Respiration en haut de grille, sans quoi le premier libellé d'heure, centré
// sur son filet, se retrouvait coupé par le bord.
const MARGE_HAUT = 10;

/**
 * Grille hebdomadaire : les blocs sont positionnés à l'heure réelle et
 * dimensionnés à leur durée, plutôt que rangés dans des cellules d'une heure.
 * Sans quoi une séance de 45 minutes à 10 h 30 serait indiscernable d'une
 * séance d'une heure à 10 h.
 *
 * Le déplacement se fait au glisser-déposer, calé sur le quart d'heure. Le
 * glisser-déposer natif est retenu plutôt qu'une bibliothèque : il ne pèse
 * rien. Il ne peut pas être le seul moyen, cela exclurait le clavier — d'où
 * les deux boutons de décalage qui apparaissent au survol et au focus.
 */
export function GrilleSemaine({
  seances,
  jours,
  heureDebut,
  heureFin,
}: {
  seances: SeanceGrille[];
  jours: JourGrille[];
  heureDebut: number;
  heureFin: number;
}) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [saisie, setSaisie] = useState<string | null>(null);
  const [apercu, setApercu] = useState<{ jour: number; minutes: number } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const colonnes = useRef<(HTMLDivElement | null)[]>([]);

  const heures = Array.from({ length: heureFin - heureDebut + 1 }, (_, i) => heureDebut + i);
  const hauteur = (heureFin - heureDebut) * PX_PAR_HEURE + MARGE_HAUT;

  function minutesDepuisY(ji: number, clientY: number) {
    const el = colonnes.current[ji];
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const brut = ((clientY - rect.top - MARGE_HAUT) / PX_PAR_HEURE) * 60 + heureDebut * 60;
    const cale = Math.round(brut / PAS_MINUTES) * PAS_MINUTES;
    return Math.min(Math.max(cale, heureDebut * 60), heureFin * 60 - PAS_MINUTES);
  }

  function deplacer(id: string, jourIso: string, minutes: number) {
    const d = new Date(jourIso);
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    setErreur(null);
    demarrer(async () => {
      const r = await deplacerSeance(id, d.toISOString());
      if (!r.ok) setErreur(r.message);
      else router.refresh();
    });
  }

  return (
    <>
      {erreur && (
        <p role="alert" className="rounded-full bg-overdue-soft px-4 py-2 text-sm text-overdue">
          {erreur}
        </p>
      )}

      {/* Aucun défilement interne : la grille tient dans la largeur et c'est la
          page qui défile. Sous 900 px elle cède la place à une liste par jour,
          plutôt que d'être comprimée à l'illisible. */}
      <div className="hidden rounded-[14px] border border-line bg-surface md:block">
        <div>
          {/* En-têtes de jours */}
          <div className="grid grid-cols-[3rem_repeat(5,1fr)] border-b border-line">
            <div />
            {jours.map((j) => (
              <div key={j.iso} className="border-l border-line px-2 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
                    {j.nom}
                  </span>
                  <span
                    className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-sm font-bold ${
                      j.aujourdhui ? "bg-accent text-accent-contrast" : ""
                    }`}
                    data-numeric
                  >
                    {j.numero}
                  </span>
                </div>
                <div
                  className={`mt-1 text-[12px] font-semibold ${
                    j.total === "—" ? "text-ink-muted/60" : "text-accent-text"
                  }`}
                  data-numeric
                >
                  {j.total}
                </div>
              </div>
            ))}
          </div>

          {/* Corps */}
          <div className="grid grid-cols-[3rem_repeat(5,1fr)]">
            {/* Colonne des heures : les libellés sont calés sur le filet, pas
                centrés dans la bande. */}
            <div className="relative" style={{ height: hauteur }}>
              {heures.map((h, i) => (
                <span
                  key={h}
                  className="absolute right-1.5 -translate-y-1/2 text-[11px] font-semibold text-ink"
                  style={{ top: i * PX_PAR_HEURE + MARGE_HAUT }}
                  data-numeric
                >
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
              {/* Demi-heures : plus discrètes que les heures pleines, mais
                  présentes — un créneau se cale au quart d'heure, il faut
                  pouvoir viser sans compter. */}
              {heures.slice(0, -1).map((h, i) => (
                <span
                  key={`${h}-30`}
                  className="absolute right-1.5 -translate-y-1/2 text-[10px] text-ink-muted/70"
                  style={{ top: i * PX_PAR_HEURE + PX_PAR_HEURE / 2 + MARGE_HAUT }}
                  data-numeric
                >
                  {String(h).padStart(2, "0")}:30
                </span>
              ))}
            </div>

            {jours.map((j, ji) => {
              const duJour = seances.filter((s) => s.jour === ji);
              const places = repartirEnColonnes(duJour);
              return (
                <div
                  key={j.iso}
                  ref={(el) => {
                    colonnes.current[ji] = el;
                  }}
                  className={`relative border-l border-line ${j.aujourdhui ? "bg-accent-soft/20" : ""}`}
                  style={{ height: hauteur }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    const m = minutesDepuisY(ji, e.clientY);
                    if (m !== null) setApercu({ jour: ji, minutes: m });
                  }}
                  onDragLeave={() => setApercu((a) => (a?.jour === ji ? null : a))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const m = minutesDepuisY(ji, e.clientY);
                    setApercu(null);
                    const id = e.dataTransfer.getData("text/plain");
                    if (id && m !== null) deplacer(id, j.iso, m);
                  }}
                >
                  {heures.slice(1).map((h, i) => (
                    <div
                      key={h}
                      className="absolute right-0 left-0 border-t border-line"
                      style={{ top: (i + 1) * PX_PAR_HEURE + MARGE_HAUT }}
                    />
                  ))}
                  {heures.slice(0, -1).map((h, i) => (
                    <div
                      key={`${h}-30`}
                      className="absolute right-0 left-0 border-t border-line/45"
                      style={{ top: i * PX_PAR_HEURE + PX_PAR_HEURE / 2 + MARGE_HAUT }}
                    />
                  ))}

                  {apercu?.jour === ji && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute right-1 left-1 rounded-md border-2 border-dashed border-accent bg-accent-soft/60"
                      style={{
                        top: ((apercu.minutes - heureDebut * 60) / 60) * PX_PAR_HEURE + MARGE_HAUT,
                        height: (45 / 60) * PX_PAR_HEURE,
                      }}
                    />
                  )}

                  {places.map(({ seance, voie, voies }) => (
                    <Bloc
                      key={seance.id}
                      seance={seance}
                      saisie={saisie === seance.id}
                      onSaisir={setSaisie}
                      onDecaler={(pas) => deplacer(seance.id, j.iso, seance.minutes + pas)}
                      style={{
                        top: ((seance.minutes - heureDebut * 60) / 60) * PX_PAR_HEURE + MARGE_HAUT,
                        height: Math.max((seance.duree / 60) * PX_PAR_HEURE - 3, 34),
                        left: `calc(${(voie / voies) * 100}% + 3px)`,
                        width: `calc(${100 / voies}% - 6px)`,
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 md:hidden">
        {jours.map((j, ji) => {
          const duJour = seances.filter((s) => s.jour === ji).sort((a, b) => a.minutes - b.minutes);
          return (
            <section key={j.iso}>
              <h2 className="mb-2 flex items-baseline gap-2">
                <span
                  className={`font-mono text-sm font-semibold ${j.aujourdhui ? "text-accent-text" : ""}`}
                >
                  {j.nom} {j.numero}
                </span>
                <span className="font-mono text-[11px] text-ink-muted" data-numeric>
                  {j.total}
                </span>
              </h2>
              {duJour.length === 0 ? (
                <p className="rounded-[14px] border border-dashed border-line-strong px-4 py-5 text-center text-xs text-ink-muted">
                  Journée libre
                </p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {duJour.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/patients/${s.patientId}`}
                        className={`flex items-center gap-3 rounded-[14px] border bg-surface py-3 pr-4 pl-3 ${
                          s.conflit ? "border-overdue/50" : "border-line"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          style={{ "--cab": s.cabinetColor } as React.CSSProperties}
                          className="filet-cabinet h-9 w-[3px] shrink-0 rounded-full"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{s.nom}</span>
                          <span className="font-mono text-[11px] text-ink-muted" data-numeric>
                            {String(Math.floor(s.minutes / 60)).padStart(2, "0")}:
                            {String(s.minutes % 60).padStart(2, "0")} · {s.cabinetNom}
                          </span>
                        </span>
                        {s.libellePaiement && (
                          <span className="shrink-0 text-[11px] text-ink-muted">
                            {s.libellePaiement}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

/** Répartit les séances qui se chevauchent sur des colonnes parallèles, par
 *  grappes : deux séances qui ne se croisent pas gardent toute la largeur. */
function repartirEnColonnes(seances: SeanceGrille[]) {
  const tri = [...seances].sort((a, b) => a.minutes - b.minutes);
  const resultat: { seance: SeanceGrille; voie: number; voies: number }[] = [];
  let grappe: SeanceGrille[] = [];
  let finGrappe = -1;

  const vider = () => {
    if (!grappe.length) return;
    const finVoies: number[] = [];
    const attribution = grappe.map((s) => {
      let v = finVoies.findIndex((fin) => fin <= s.minutes);
      if (v === -1) v = finVoies.length;
      finVoies[v] = s.minutes + s.duree;
      return { seance: s, voie: v };
    });
    for (const a of attribution) resultat.push({ ...a, voies: finVoies.length });
    grappe = [];
    finGrappe = -1;
  };

  for (const s of tri) {
    if (grappe.length && s.minutes >= finGrappe) vider();
    grappe.push(s);
    finGrappe = Math.max(finGrappe, s.minutes + s.duree);
  }
  vider();
  return resultat;
}

function Bloc({
  seance,
  saisie,
  onSaisir,
  onDecaler,
  style,
}: {
  seance: SeanceGrille;
  saisie: boolean;
  onSaisir: (id: string | null) => void;
  onDecaler: (pas: number) => void;
  style: React.CSSProperties;
}) {
  const hhmm = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  /*
   * Carte d'agenda repensée. Trois informations, dans l'ordre où on les
   * cherche : quand, qui, où. L'heure passe en tête et gagne en taille — c'est
   * ce qu'on lit en diagonale dans une grille.
   *
   * Le cabinet est porté par un filet vertical épais, la teinte du fond et son
   * nom écrit : trois canaux pour une information qui doit se lire d'un coup
   * d'œil sur deux sites. L'état de paiement, lui, est ramené à une mention
   * discrète — dans le calendrier il est accessoire, et il garde sa couleur
   * pleine là où il est le sujet, dans la facturation.
   */
  return (
    <div
      draggable
      data-glisse={saisie ? "true" : undefined}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", seance.id);
        e.dataTransfer.effectAllowed = "move";
        onSaisir(seance.id);
      }}
      onDragEnd={() => onSaisir(null)}
      style={
        {
          ...style,
          "--cab": seance.cabinetColor,
          "--cab-fill": seance.cabinetFill,
          borderColor: "color-mix(in srgb, var(--cab) 25%, transparent)",
        } as React.CSSProperties
      }
      className={`teinte-cabinet group absolute flex cursor-grab overflow-hidden rounded-lg border transition-shadow hover:shadow-[0_2px_8px_rgba(39,39,87,0.10)] active:cursor-grabbing ${
        seance.conflit ? "ring-2 ring-overdue/70" : ""
      }`}
    >
      <span aria-hidden="true" className="filet-cabinet w-[4px] shrink-0" />
      <Link
        href={`/patients/${seance.patientId}`}
        className="flex min-w-0 flex-1 flex-col gap-[3px] overflow-hidden px-2 py-1.5"
      >
        <span className="shrink-0 truncate text-[12.5px] leading-[1.25] font-bold" data-numeric>
          {hhmm(seance.minutes)}–{hhmm(seance.minutes + seance.duree)}
        </span>
        <span className="shrink-0 truncate text-[12px] leading-tight font-medium">
          {seance.nom}
        </span>
        {/* Cabinet, alerte et paiement sur une seule ligne : un bloc de
            quarante-cinq minutes n'a pas la hauteur pour quatre lignes, et la
            pastille de paiement s'y trouvait coupée. Le nom du cabinet cède le
            premier à l'étroitesse, le paiement ne se tronque jamais. */}
        <span className="flex min-w-0 shrink-0 items-center gap-1">
          <span className="texte-cabinet min-w-0 truncate text-[10.5px] leading-[1.45] font-semibold">
            {seance.cabinetNom}
          </span>
          {seance.conflit && (
            <span
              className="shrink-0 text-overdue"
              title="Trajet trop court depuis l’autre cabinet"
            >
              <span className="sr-only">Trajet trop court depuis l’autre cabinet</span>
              <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="M6 1 11.2 10.5H0.8L6 1Z M6 4.6v2.6 M6 8.6v.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </span>
          )}
          {seance.paiement && seance.libellePaiement && (
            <span
              className={`ml-auto shrink-0 rounded px-1.5 text-[10px] leading-[1.45] font-semibold ${
                {
                  DUE: "bg-due-soft text-due",
                  PAID: "bg-paid-soft text-paid",
                  OVERDUE: "bg-overdue-soft text-overdue",
                }[seance.paiement]
              }`}
            >
              {seance.libellePaiement}
            </span>
          )}
        </span>
      </Link>

      <span className="pointer-events-none absolute top-1 right-1 flex gap-0.5 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onDecaler(-15)}
          aria-label={`Avancer la séance de ${seance.nom} d’un quart d’heure`}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-line bg-surface text-ink-muted shadow-sm transition-colors hover:border-accent hover:text-accent-text"
        >
          <IconFlecheHaut className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onDecaler(15)}
          aria-label={`Retarder la séance de ${seance.nom} d’un quart d’heure`}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-line bg-surface text-ink-muted shadow-sm transition-colors hover:border-accent hover:text-accent-text"
        >
          <IconFlecheBas className="h-3 w-3" />
        </button>
      </span>
    </div>
  );
}
