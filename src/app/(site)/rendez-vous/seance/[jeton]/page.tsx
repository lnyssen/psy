import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { creneauEnClair } from "@/lib/courriel";
import { DELAI_ANNULATION_H } from "@/lib/rappels";
import { annulerParLien } from "@/lib/seance-publique-actions";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Où en est le rendez-vous par rapport à maintenant : passé, et s'il reste assez de temps pour l'annuler. */
function delais(debut: Date) {
  const reste = debut.getTime() - Date.now();
  return {
    passee: reste < 0,
    delaiOk: reste >= DELAI_ANNULATION_H * 3_600_000,
  };
}
export const metadata: Metadata = {
  title: "Votre rendez-vous",
  robots: { index: false },
};

/**
 * Page du lien reçu par e-mail : le patient y voit son rendez-vous et peut
 * l'annuler ou le déplacer, jusqu'à vingt-quatre heures avant. Elle n'affiche ni
 * nom ni donnée de santé, seulement le créneau et le lieu.
 */
export default async function PageSeance({
  params,
  searchParams,
}: {
  params: Promise<{ jeton: string }>;
  searchParams: Promise<{ annule?: string; erreur?: string }>;
}) {
  const { jeton } = await params;
  const { annule, erreur } = await searchParams;
  const s = await prisma.session.findUnique({
    where: { jetonPublic: jeton },
    include: { cabinet: true },
  });

  const cadre = (enfants: React.ReactNode) => (
    <div className="px-6 py-14 md:px-10 md:py-20 lg:px-14">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-4xl tracking-tight text-titre">
          Votre rendez-vous
        </h1>
        <div className="mt-8 flex flex-col gap-5">{enfants}</div>
      </div>
    </div>
  );
  const telephone = (
    <a
      href={`tel:${SITE.telephoneLien}`}
      className="font-semibold text-accent-text underline underline-offset-4"
      data-numeric
    >
      {SITE.telephone}
    </a>
  );

  if (!s)
    return cadre(
      <p className="text-lg text-ink-muted">Ce lien n’est pas valable.</p>,
    );

  const lieu = s.visio
    ? "En visio"
    : `${s.cabinet.nom}, ${s.cabinet.addressLine}, ${s.cabinet.postalCode} ${s.cabinet.city}`;
  const detail = (
    <div className="rounded-[20px] bg-surface px-7 py-6">
      <p className="font-display text-2xl leading-snug">
        {creneauEnClair(s.startsAt)}
      </p>
      <p className="mt-2 text-ink-muted">{lieu}</p>
    </div>
  );

  if (annule === "1" || s.status === "CANCELLED_IN_TIME") {
    return cadre(
      <>
        <p className="text-lg">Ce rendez-vous est annulé.</p>
        {detail}
        <p className="text-ink-muted">
          Pour reprendre rendez-vous, vous pouvez me joindre au {telephone}.
        </p>
      </>,
    );
  }
  const { passee, delaiOk } = delais(s.startsAt);
  if (s.status !== "SCHEDULED" || passee) {
    return cadre(
      <p className="text-lg text-ink-muted">
        Ce rendez-vous n’est plus à venir.
      </p>,
    );
  }

  return cadre(
    <>
      {detail}
      {erreur === "trop" && (
        <p role="alert" className="text-sm text-overdue">
          Trop de tentatives. Réessayez plus tard, ou téléphonez au {telephone}.
        </p>
      )}
      {delaiOk ? (
        <form action={annulerParLien} className="flex flex-col gap-4">
          <input type="hidden" name="jeton" value={jeton} />
          <p className="text-ink-muted">
            Vous pouvez annuler ou déplacer ce rendez-vous jusqu’à{" "}
            {DELAI_ANNULATION_H} heures avant.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              name="mode"
              value="deplacer"
              className="rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              Choisir un autre créneau
            </button>
            <button
              type="submit"
              name="mode"
              value="annuler"
              className="rounded-full border border-ink/35 px-7 py-3.5 text-sm font-semibold transition-colors hover:border-ink"
            >
              Annuler ce rendez-vous
            </button>
          </div>
        </form>
      ) : (
        <p className="text-ink-muted">
          Il reste moins de {DELAI_ANNULATION_H} heures : pour annuler ou
          déplacer, merci de me joindre au {telephone}.
        </p>
      )}
    </>,
  );
}
