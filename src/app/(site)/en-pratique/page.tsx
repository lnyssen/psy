import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { adresseCabinet } from "@/lib/format";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "En pratique : cabinets, accès et remboursement",
  description:
    "Adresses des cabinets d’Uccle et d’Auderghem, accès en transports et plan, remboursement et convention INAMI.",
};

export const dynamic = "force-dynamic";

export default async function Praticalites() {
  // Les tarifs ne figurent pas sur le site : ils se disent au téléphone ou en
  // séance, comme le veut la praticienne. Ils restent gérés dans l'outil.
  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true, publie: true },
    orderBy: { ordre: "asc" },
  });

  return (
    <>
      <section className="px-6 md:px-10 lg:px-14 py-14 md:py-20">
        <div className="mx-auto max-w-[100rem]">
          <h1 className="font-display text-4xl tracking-tight text-titre md:text-5xl">
            En pratique
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
            Où me trouver, et comment se faire rembourser.
          </p>
        </div>
      </section>

      <section className="bg-bande-claire px-6 md:px-10 lg:px-14 py-16 md:py-20">
        <div className="mx-auto max-w-[100rem]">
          <h2 className="font-display text-2xl tracking-tight text-titre md:text-3xl">
            Les cabinets
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {cabinets.map((c) => (
              <div key={c.id} className="rounded-[16px] bg-paper px-6 py-5">
                <p className="font-display text-xl">{c.nom}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {adresseCabinet(c)}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresseCabinet(c))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-accent-text underline underline-offset-4"
                >
                  Voir sur Google Maps
                </a>
                {/* Une ligne du champ « accès » par ligne affichée : c'est du
                  texte libre saisi dans les réglages, et le retour à la ligne
                  y a un sens — un moyen de transport par ligne. */}
                {c.acces.trim() ? (
                  <>
                    {/* Un intitulé, sinon la liste de noms sous l'adresse ne dit
                      pas ce qu'elle est. Volontairement neutre : le champ
                      accueille aussi le stationnement ou l'étage. */}
                    <p className="mt-4 border-t border-line pt-4 text-[11px] font-semibold tracking-[0.12em] text-titre uppercase">
                      Accès
                    </p>
                    <ul className="mt-2.5 flex flex-col gap-1.5">
                      {c.acces
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((l) => (
                          <li
                            key={l}
                            className="flex gap-2.5 text-sm leading-snug text-ink-muted"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-accent"
                            />
                            <span>{l}</span>
                          </li>
                        ))}
                    </ul>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-10 lg:px-14 py-16 md:py-20">
        <div className="mx-auto max-w-[100rem]">
          <h2 className="font-display text-2xl tracking-tight text-titre md:text-3xl">
            Remboursement
          </h2>
          <div className="mt-4 flex max-w-2xl flex-col gap-4 leading-relaxed text-ink-muted">
            <p>
              La plupart des mutuelles belges interviennent partiellement dans
              le coût des séances de psychologie. Le montant et le nombre de
              séances varient d’une mutuelle à l’autre : renseignez-vous auprès
              de la vôtre.
            </p>
            <p>
              Une partie des consultations relève par ailleurs de la{" "}
              <span className="text-ink">
                convention INAMI de psychologie de première ligne
              </span>
              , qui rend la séance nettement moins chère. L’accès en est
              encadré.
            </p>
            <p>
              Ma fiche figure également sur{" "}
              <a
                href={SITE.psybru}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-accent-text underline underline-offset-4"
              >
                PsyBru
              </a>
              , l’annuaire des psychologues cliniciens de la Région bruxelloise.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
