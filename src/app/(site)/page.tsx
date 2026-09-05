import Link from "next/link";
import { prisma } from "@/lib/db";
import { adresseCabinet } from "@/lib/format";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Accueil.
 *
 * La page avance par bandes pleine largeur qui alternent : papier, aplat clair,
 * papier, violet profond. Le rythme sert à découper un texte long en moments
 * distincts — parcours, publics, lieux — là où un fond uniforme les aurait
 * fondus en une seule coulée.
 *
 * Les deux aplats sombres ne changent pas avec le thème : ce sont des couleurs
 * pleines, lisibles en blanc dans les deux cas (13,5:1 et 13,9:1). Les faire
 * varier aurait cassé l'alternance.
 */
export default async function Accueil() {
  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true, publie: true },
    orderBy: { ordre: "asc" },
  });

  return (
    <>
      <section className="px-6 py-14 md:py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-14">
          <div className="order-2 md:order-1">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-accent-text uppercase">
              {SITE.titre}
            </p>
            <h1 className="mt-4 font-display text-[2.75rem] leading-[1.05] font-bold tracking-tight md:text-6xl">
              {SITE.nom}
            </h1>
            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-lg font-medium">
              {SITE.publics.map((p, i) => (
                <span key={p} className="flex items-center gap-3">
                  {i > 0 && <span aria-hidden="true" className="h-1 w-1 rounded-full bg-accent" />}
                  {p}
                </span>
              ))}
            </p>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-muted">{SITE.accroche}</p>
            <p className="mt-3 text-sm text-ink-muted">{SITE.langues}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/rendez-vous"
                className="rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
              >
                Prendre rendez-vous
              </Link>
              <a
                href={`tel:${SITE.telephoneLien}`}
                className="rounded-full border border-line-strong px-7 py-3.5 text-sm font-semibold transition-colors hover:border-accent hover:text-accent-text"
                data-numeric
              >
                {SITE.telephone}
              </a>
            </div>
          </div>

          <div className="order-1 md:order-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/phare.jpg"
              srcSet="/images/phare-petit.jpg 602w, /images/phare.jpg 1338w"
              sizes="(max-width: 900px) 100vw, 42vw"
              width={1338}
              height={2000}
              alt="Un phare allumé au crépuscule, sous un ciel étoilé"
              className="h-[20rem] w-full rounded-[20px] object-cover object-center md:h-[34rem]"
            />
          </div>
        </div>
      </section>

      <section className="bg-bande-claire px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[0.75fr_1.25fr] md:gap-14">
          <h2 className="font-display text-3xl leading-tight font-bold tracking-tight md:text-4xl">
            Mon parcours,
            <br />
            mon approche
          </h2>
          <div className="flex max-w-xl flex-col gap-5 text-lg leading-relaxed text-ink-muted">
            {SITE.parcours.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 md:grid-cols-[0.75fr_1.25fr] md:gap-14">
            <h2 className="font-display text-3xl leading-tight font-bold tracking-tight md:text-4xl">
              Pour qui,
              <br />
              pour quoi
            </h2>
            <p className="max-w-xl text-lg leading-relaxed text-ink-muted">{SITE.pourQui}</p>
          </div>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-[20px] bg-line sm:grid-cols-2">
            {SITE.problematiques.map((p, i) => (
              <li key={p} className="flex items-start gap-4 bg-paper px-6 py-6">
                <span
                  aria-hidden="true"
                  className="mt-0.5 text-sm font-bold text-accent-text"
                  data-numeric
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="leading-snug">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-bande-violette px-6 py-16 text-white md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl leading-tight font-bold tracking-tight md:text-4xl">
            Deux cabinets à Bruxelles
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70">
            Les créneaux libres des prochaines semaines sont visibles en ligne. Un premier
            rendez-vous se confirme par retour de courriel.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {cabinets.map((c) => (
              <div key={c.id} className="rounded-[16px] bg-white/10 px-6 py-5">
                <p className="text-lg font-bold">{c.nom}</p>
                <p className="mt-1 text-sm text-white/70">{adresseCabinet(c)}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/rendez-vous"
              className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-bande-violette transition-opacity hover:opacity-90"
            >
              Voir les créneaux libres
            </Link>
            <a href={`mailto:${SITE.email}`} className="text-sm font-medium text-white/80 hover:text-white">
              {SITE.email}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
