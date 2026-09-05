import Link from "next/link";
import { prisma } from "@/lib/db";
import { adresseCabinet } from "@/lib/format";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function Accueil() {
  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true, publie: true },
    orderBy: { ordre: "asc" },
  });

  return (
    <div className="flex flex-col gap-24 md:gap-32">
      {/*
        Le phare porte la page. C'est une image de repère dans le noir, pas de
        performance : elle dit ce que fait le métier sans le mettre en scène.
        Elle occupe une colonne entière sur écran large plutôt qu'un bandeau
        rogné, sa force tenant à sa verticalité.
      */}
      <section className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-14">
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
                {i > 0 && (
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-accent" />
                )}
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
          {/*
            Balise <img> ordinaire plutôt que le composant optimisant de Next :
            la photo est déjà servie en deux tailles préparées à la main, et le
            service d'optimisation ne rendait rien ici. Une pièce en moins dans
            la chaîne pour une seule image de couverture.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/phare.jpg"
            srcSet="/images/phare-petit.jpg 602w, /images/phare.jpg 1338w"
            sizes="(max-width: 900px) 100vw, 42vw"
            width={1338}
            height={2000}
            alt="Un phare allumé au crépuscule, sous un ciel étoilé"
            className="h-[22rem] w-full rounded-[20px] object-cover object-center md:h-[34rem]"
          />
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-14">
        <h2 className="font-display text-3xl leading-tight font-bold tracking-tight">
          Mon parcours,<br />mon approche
        </h2>
        <div className="flex max-w-xl flex-col gap-5 text-lg leading-relaxed text-ink-muted">
          {SITE.parcours.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      </section>

      <section>
        <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-14">
          <h2 className="font-display text-3xl leading-tight font-bold tracking-tight">
            Pour qui,<br />pour quoi
          </h2>
          <p className="max-w-xl text-lg leading-relaxed text-ink-muted">{SITE.pourQui}</p>
        </div>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {SITE.problematiques.map((p, i) => (
            <li
              key={p}
              className="flex items-start gap-4 rounded-[16px] border border-line bg-surface px-6 py-5"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 text-sm font-semibold text-accent-text"
                data-numeric
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="leading-snug">{p}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[20px] bg-sunken px-8 py-10 md:px-12 md:py-14">
        <h2 className="font-display text-3xl leading-tight font-bold tracking-tight">
          Deux cabinets à Bruxelles
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {cabinets.map((c) => (
            <div
              key={c.id}
              style={{ "--cab": c.colorHex } as React.CSSProperties}
              className="rounded-[16px] bg-surface px-6 py-5"
            >
              <p className="texte-cabinet text-lg font-bold">{c.nom}</p>
              <p className="mt-1 text-sm text-ink-muted">{adresseCabinet(c)}</p>
            </div>
          ))}
        </div>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/rendez-vous"
            className="rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            Voir les créneaux libres
          </Link>
          <a
            href={`mailto:${SITE.email}`}
            className="text-sm font-medium text-accent-text hover:underline"
          >
            {SITE.email}
          </a>
        </div>
      </section>
    </div>
  );
}
