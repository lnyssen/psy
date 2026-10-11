import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  CabinetTag,
  EtatPaiement,
  RegimeTag,
  StatutSeance,
} from "@/components/tags";
import { BoutonEnregistrer } from "@/components/BoutonEnregistrer";
import { Notes } from "@/components/Notes";
import { Encaisser } from "@/components/Encaisser";
import { RecuInami } from "@/components/RecuInami";
import { FormulairePatient } from "@/components/FormulairePatient";
import { montantSeanceCents, payeurDe } from "@/lib/tarifs";
import { AnnulerAbsence } from "@/components/AnnulerAbsence";
import { AnnulerSeance } from "@/components/AnnulerSeance";
import { StatuerSeance } from "@/components/StatuerSeance";
import { NoteSeance } from "@/components/NoteSeance";
import { cleNotesPresente, dechiffrer } from "@/lib/chiffrement";
import { creerSeanceDepuisFormulaire, enregistrerPatient } from "@/lib/actions";
import { plafondConventionne, seancesConventionneAnnee } from "@/lib/quotas";
import {
  euros,
  fmtDateCourte,
  fmtHeure,
  fmtJourMoisAn,
  formatDuree,
  heuresTotales,
  isBillable,
  nomComplet,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const champ =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted/60";
const libelleChamp =
  "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";

function age(naissance: Date | null) {
  if (!naissance) return null;
  const diff = Date.now() - naissance.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export default async function FichePatient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      sessions: { orderBy: { startsAt: "desc" }, include: { cabinet: true } },
      patientNotes: { orderBy: { createdAt: "desc" } },
      cabinet: true,
      tarif: true,
    },
  });
  if (!patient) notFound();

  // Les tarifs offerts dans la fiche : ceux de la grille encore actifs, et celui
  // déjà choisi pour ce patient même s'il a été désactivé depuis.
  const tarifs = await prisma.tarif.findMany({
    where: { OR: [{ actif: true }, { id: patient.tarifId ?? "aucun" }] },
    orderBy: { ordre: "asc" },
    select: {
      id: true,
      libelle: true,
      amountCents: true,
      regime: true,
      parDefaut: true,
    },
  });
  const montant = montantSeanceCents(patient);
  const payeur = payeurDe(patient.scheme);

  // Un lieu facturé à un établissement (l'école) n'a pas de patientèle propre
  // (voir /admin/patients) : pas la peine de le proposer ici non plus.
  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true, factureInstitution: false },
    orderBy: { ordre: "asc" },
  });

  const facturables = patient.sessions.filter((s) => isBillable(s.status));
  // Le montant d'une séance impayée n'est figé qu'à l'encaissement : d'ici là, c'est
  // le tarif de la fiche qui le dit.
  const valeur = (s: { amountCents: number | null }) =>
    s.amountCents ?? montant ?? 0;
  const du = facturables
    .filter((s) => s.paymentStatus !== "PAID")
    .reduce((n, s) => n + valeur(s), 0);
  const encaisse = facturables
    .filter((s) => s.paymentStatus === "PAID")
    .reduce((n, s) => n + valeur(s), 0);

  // Plafond INAMI de la convention de première ligne : huit séances par
  // année civile, vingt pour les 16-25 ans. Ne s'affiche que pour un patient
  // conventionné — un patient privé n'y est pas soumis.
  const anneeCourante = new Date().getFullYear();
  const plafondInami =
    patient.scheme === "CONVENTIONNE"
      ? plafondConventionne(patient.birthDate)
      : null;
  const utiliseesInami =
    plafondInami !== null
      ? seancesConventionneAnnee(patient.sessions, anneeCourante)
      : null;
  // L'alerte se lève avant de créer la séance de trop, pas après : on compte
  // aussi les rendez-vous déjà posés pour le reste de l'année.
  const maintenant = new Date();
  const prevuesInami =
    plafondInami !== null
      ? patient.sessions.filter(
          (s) =>
            s.status === "SCHEDULED" &&
            s.startsAt.getFullYear() === anneeCourante,
        ).length
      : 0;
  const quotaAtteint =
    plafondInami !== null &&
    (utiliseesInami ?? 0) + prevuesInami >= plafondInami;

  // Notes de séance : déchiffrées ici, côté serveur, pour ne jamais faire
  // voyager la clé. Une note illisible (clé changée) n'empêche pas la page de
  // s'afficher : elle est signalée sur sa ligne.
  const notesDisponibles = cleNotesPresente();
  const notesSeances = new Map<string, string | null>();
  for (const s of patient.sessions) {
    if (!s.note) continue;
    try {
      notesSeances.set(
        s.id,
        notesDisponibles ? dechiffrer(s.note, "NOTES_KEY") : null,
      );
    } catch {
      notesSeances.set(s.id, null);
    }
  }

  const coordonnees = [
    { t: "Téléphone", v: patient.phone, mono: true },
    {
      t: "Mère",
      v: [patient.phoneMother, patient.emailMother].filter(Boolean).join(" · "),
    },
    {
      t: "Père",
      v: [patient.phoneFather, patient.emailFather].filter(Boolean).join(" · "),
    },
    { t: "E-mail", v: patient.email },
    {
      t: "Adresse",
      v: patient.addressLine
        ? `${patient.addressLine}, ${patient.postalCode ?? ""} ${patient.city ?? ""}`.trim()
        : null,
    },
    {
      t: "Naissance",
      v: patient.birthDate
        ? `${fmtJourMoisAn.format(patient.birthDate)} (${age(patient.birthDate)} ans)`
        : null,
      mono: true,
    },
    { t: "N° national", v: patient.nationalNumber, mono: true },
    {
      t: patient.scheme === "CONVENTIONNE" ? "Tarif conventionné" : "Tarif",
      v:
        montant === null
          ? "aucun tarif choisi"
          : patient.scheme === "CONVENTIONNE"
            ? `${euros(montant)} reçus de l’INAMI · patient : 0 €`
            : `${euros(montant)} la séance`,
      mono: true,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/admin/patients"
        className="text-sm text-ink-muted transition-colors hover:text-accent-text"
      >
        ← Tous les patients
      </Link>

      <header className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex-1">
          <h1 className="font-display text-3xl tracking-tight">
            {nomComplet(patient)}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <RegimeTag scheme={patient.scheme} />
            {patient.cabinet && <CabinetTag cabinet={patient.cabinet} />}
          </p>
        </div>
      </header>

      <details className="rounded-[14px] border border-dashed border-line-strong bg-surface px-5 py-3">
        <summary className="w-fit cursor-pointer list-none rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover">
          Nouvelle séance
        </summary>
        <form
          action={creerSeanceDepuisFormulaire}
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input type="hidden" name="patientId" value={patient.id} />
          <label>
            <span className={libelleChamp}>Cabinet</span>
            <select
              name="cabinetId"
              required
              defaultValue={patient.cabinetId ?? ""}
              className={`mt-1 ${champ}`}
            >
              <option value="" disabled>
                Choisir…
              </option>
              {cabinets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={libelleChamp}>Date</span>
            <input
              name="date"
              type="date"
              required
              className={`mt-1 ${champ}`}
            />
          </label>
          <label>
            <span className={libelleChamp}>Heure</span>
            <input
              name="heure"
              type="time"
              required
              defaultValue="09:00"
              className={`mt-1 ${champ}`}
            />
          </label>
          <label>
            <span className={libelleChamp}>Jusqu’au (optionnel)</span>
            <input name="jusquau" type="date" className={`mt-1 ${champ}`} />
            <span className="mt-1 block text-[11px] text-ink-muted">
              Répète chaque semaine, même jour et même heure.
            </span>
          </label>
          <BoutonEnregistrer className="self-end">Créer</BoutonEnregistrer>
          {quotaAtteint && (
            <p className="rounded-[10px] border border-due/40 bg-due-soft px-4 py-2.5 text-sm text-due sm:col-span-2 lg:col-span-4">
              Plafond INAMI {anneeCourante} atteint : {utiliseesInami} séance
              {(utiliseesInami ?? 0) > 1 ? "s" : ""} faite
              {(utiliseesInami ?? 0) > 1 ? "s" : ""} et {prevuesInami} prévue
              {prevuesInami > 1 ? "s" : ""}, pour {plafondInami} remboursées.
              Une séance de plus ne sera pas prise en charge par la convention.
            </p>
          )}
        </form>
      </details>

      <section className="rounded-[14px] border border-line bg-surface px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="sr-only">Coordonnées</h2>
          <dl className="grid flex-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {coordonnees.map((c) => (
              <div key={c.t}>
                <dt className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
                  {c.t}
                </dt>
                <dd
                  className={`mt-0.5 text-sm ${c.mono ? "font-mono" : ""}`}
                  data-numeric
                >
                  {c.v || <span className="text-ink-muted">—</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <details className="mt-4 border-t border-line pt-4">
          <summary className="w-fit cursor-pointer list-none rounded-full border border-line-strong px-5 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text">
            Modifier la fiche
          </summary>
          <div className="mt-5">
            <FormulairePatient
              action={enregistrerPatient}
              patient={patient}
              tarifs={tarifs}
              cabinets={cabinets}
              libelleBouton="Enregistrer la fiche"
            />
          </div>
        </details>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { t: "Séances", v: String(patient.sessions.length) },
          { t: "Heures", v: formatDuree(heuresTotales(patient.sessions)) },
          // En conventionné, l'argent qui compte vient de l'INAMI : le patient, lui,
          // ne doit jamais rien.
          {
            t: payeur === "INAMI" ? "Reçu de l’INAMI" : "Encaissé",
            v: euros(encaisse),
          },
          {
            t: payeur === "INAMI" ? "À recevoir de l’INAMI" : "Dû",
            v: du > 0 ? euros(du) : "—",
            alerte: payeur === "PATIENT" && du > 0,
          },
          ...(plafondInami !== null
            ? [
                {
                  t: `Séances INAMI ${anneeCourante}`,
                  v: `${utiliseesInami} / ${plafondInami}`,
                  alerte: (utiliseesInami ?? 0) >= plafondInami,
                },
              ]
            : []),
        ].map((c) => (
          <div
            key={c.t}
            className="rounded-[14px] border border-line bg-surface px-5 py-4"
          >
            <dt className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
              {c.t}
            </dt>
            <dd
              className={`mt-1.5 font-mono text-xl font-semibold ${c.alerte ? "text-due" : ""}`}
              data-numeric
            >
              {c.v}
            </dd>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Historique des séances</h2>
        {patient.sessions.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-muted">
            Aucune séance enregistrée pour ce dossier.
          </p>
        ) : (
          <ol className="overflow-hidden rounded-[14px] border border-line bg-surface">
            {patient.sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-5 py-3.5 last:border-b-0"
              >
                <time className="w-36 shrink-0 font-mono text-xs" data-numeric>
                  {fmtDateCourte.format(s.startsAt)} ·{" "}
                  {fmtHeure.format(s.startsAt)}
                </time>
                <CabinetTag cabinet={s.cabinet} />
                <span className="flex-1">
                  <StatutSeance status={s.status} />
                </span>
                {isBillable(s.status) && (
                  <span className="font-mono text-sm" data-numeric>
                    {euros(s.amountCents ?? montant)}
                  </span>
                )}
                <EtatPaiement
                  status={s.status}
                  payment={s.paymentStatus}
                  methode={s.paymentMethod}
                  payeur={payeur}
                />
                {isBillable(s.status) &&
                  s.paymentStatus !== "PAID" &&
                  (payeur === "INAMI" ? (
                    <RecuInami id={s.id} />
                  ) : (
                    <Encaisser id={s.id} />
                  ))}
                {s.status === "NO_SHOW" && <AnnulerAbsence id={s.id} />}
                {s.status === "SCHEDULED" &&
                  (s.startsAt <= maintenant ? (
                    <StatuerSeance ids={[s.id]} />
                  ) : (
                    <AnnulerSeance id={s.id} />
                  ))}
                {s.paymentStatus === "PAID" && payeur === "PATIENT" && (
                  <a
                    href={`/api/recu/${s.id}`}
                    className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:border-accent hover:text-accent-text"
                  >
                    reçu PDF
                  </a>
                )}
                {(s.status === "ATTENDED" || s.note) && (
                  <NoteSeance
                    id={s.id}
                    note={notesSeances.get(s.id) ?? null}
                    disponible={
                      notesDisponibles &&
                      !(s.note && notesSeances.get(s.id) === null)
                    }
                  />
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {patient.jetonRdv && (
        <section className="rounded-[14px] border border-line bg-surface px-5 py-4">
          <h2 className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Lien personnel de réservation
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            À transmettre au patient : il lui permet de réserver un créneau
            libre sans passer par une demande à confirmer. Ce lien vaut
            reconnaissance — ne le diffusez pas ailleurs.
          </p>
          <code className="mt-2 block overflow-x-auto rounded-[10px] bg-sunken px-4 py-2 text-xs">
            /rendez-vous?p={patient.jetonRdv}
          </code>
        </section>
      )}

      <Notes
        patientId={patient.id}
        notes={patient.patientNotes.map((n) => ({
          id: n.id,
          body: n.body,
          date: fmtDateCourte.format(n.createdAt),
        }))}
      />
    </div>
  );
}
