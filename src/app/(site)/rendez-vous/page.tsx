import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { creneauxDisponibles } from "@/lib/creneaux";
import { parametres } from "@/lib/parametres";
import { SITE } from "@/lib/site";
import { ListeAttente } from "@/components/ListeAttente";
import { debutDeJour } from "@/lib/format";
import { synchroniser } from "@/lib/google-sync";
import { PriseRdv } from "@/components/PriseRdv";
import { adresseCabinet } from "@/lib/format";

export const metadata: Metadata = {
  title: "Prendre rendez-vous",
  description:
    "Choisissez un cabinet et un créneau libre pour demander un rendez-vous avec Amandine Monsel, psychologue à Uccle et Auderghem.",
};

export const dynamic = "force-dynamic";

export default async function RendezVous({
  searchParams,
}: {
  searchParams: Promise<{ cabinet?: string; p?: string }>;
}) {
  const { cabinet, p } = await searchParams;

  // Les rendez-vous ajoutés dans Google Agenda doivent bloquer les créneaux
  // proposés. Au plus un passage toutes les deux minutes, et jamais plus de
  // quelques secondes d'attente : le public n'a pas à pâtir d'un Google lent.
  await Promise.race([
    synchroniser({ maxAgeMs: 120_000 }).catch(() => null),
    new Promise((r) => setTimeout(r, 3000)),
  ]);

  const reglagesRdv = await parametres();
  if (!reglagesRdv.rdvEnLigne) {
    return (
      <div className="px-6 py-14 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl tracking-tight text-titre">
            Prendre rendez-vous
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed">
            {reglagesRdv.rdvMessage ||
              "La prise de rendez-vous en ligne est fermée pour le moment."}
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-muted">
            Vous pouvez joindre le cabinet par téléphone ou par e-mail.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`tel:${SITE.telephoneLien}`}
              className="rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
              data-numeric
            >
              {SITE.telephone}
            </a>
            <a
              href={`mailto:${SITE.email}`}
              className="rounded-full border border-ink/35 px-7 py-3.5 text-sm font-semibold transition-colors hover:border-ink"
            >
              {SITE.email}
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Nouveaux patients fermés : seuls ceux qui arrivent avec un lien personnel
  // valable voient les créneaux ; les autres voient la liste d'attente.
  if (!reglagesRdv.nouveauxPatients) {
    const connu = p
      ? await prisma.patient.findUnique({
          where: { jetonRdv: p },
          select: { id: true },
        })
      : null;
    if (!connu) {
      return (
        <div className="px-6 py-14 md:px-10 md:py-20 lg:px-14">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-display text-4xl tracking-tight text-titre">
              Prendre rendez-vous
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed">
              {reglagesRdv.nouveauxPatientsMessage ||
                "Je ne prends pas de nouveaux patients pour le moment. Laissez vos coordonnées : je vous rappellerai si une place se libère."}
            </p>
            <div className="mt-8">
              <ListeAttente />
            </div>
            <p className="mt-8 text-sm text-ink-muted">
              Vous êtes déjà suivi(e) ? Utilisez le lien personnel qui vous a
              été transmis, ou téléphonez au{" "}
              <a
                href={`tel:${SITE.telephoneLien}`}
                className="underline underline-offset-4"
                data-numeric
              >
                {SITE.telephone}
              </a>
              .
            </p>
          </div>
        </div>
      );
    }
  }

  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true, publie: true },
    orderBy: { ordre: "asc" },
  });
  if (cabinets.length === 0) return null;

  const choisi = cabinets.find((c) => c.id === cabinet) ?? cabinets[0];
  const jours = await creneauxDisponibles(choisi.id);

  // Bornes de la période ouverte : elles viennent des paramètres, pas des jours
  // qui ont des créneaux. Un congé en fin de période bloquait sinon la
  // navigation entre mois.
  const reglages = await parametres();
  const debut = debutDeJour(new Date());
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + reglages.horizonSemaines * 7);

  // Le lien personnel vaut reconnaissance : on ne redemande pas ses
  // coordonnées à quelqu'un dont on a déjà le dossier.
  const patient = p
    ? await prisma.patient.findUnique({
        where: { jetonRdv: p },
        select: { firstName: true, lastName: true },
      })
    : null;

  return (
    <div className="px-6 py-14 md:py-20">
      <div className="mx-auto max-w-5xl">
        <PriseRdv
          cabinets={cabinets.map((c) => ({
            id: c.id,
            nom: c.nom,
            adresse: adresseCabinet(c),
            colorHex: c.colorHex,
            fillHex: c.fillHex,
            vividHex: c.vividHex,
          }))}
          cabinetChoisi={choisi.id}
          jours={jours}
          jeton={patient ? (p ?? null) : null}
          nomConnu={patient ? `${patient.firstName} ${patient.lastName}` : null}
          lienInvalide={Boolean(p) && !patient}
          isoDebut={debut.toISOString()}
          isoFin={fin.toISOString()}
        />
      </div>
    </div>
  );
}
