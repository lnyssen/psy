import Link from "next/link";
import { prisma } from "@/lib/db";
import { adresseCabinet } from "@/lib/format";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Accueil.
 *
 * La page avance par bandes pleine largeur qui alternent : papier, violet
 * profond, papier, aplat clair, navy, papier. Ce n'est pas une décoration —
 * c'est ce qui découpe un texte long en moments distincts, là où un fond
 * uniforme les fondrait en une seule coulée.
 *
 * Ni chiffres mis en avant, ni sections numérotées, ni formule inventée pour
 * faire titre : le texte est celui d'Amandine, la mise en page se contente de
 * lui donner de l'air.
 *
 * Les deux aplats sombres ne suivent pas le thème : ce sont des couleurs
 * pleines, lisibles en blanc dans les deux cas (13,5:1 et 13,9:1). Les faire
 * varier aurait cassé l'alternance, qui est le sujet.
 */

/** Titre de section. En grand : ce sont les repères qui permettent de parcourir
 *  la page sans la lire, et une capitale de onze points ne remplit pas ce rôle. */
function Titre({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[2rem] leading-[1.05] tracking-tight md:text-[3rem]">
      {children}
    </h2>
  );
}

/** Surtitre, réservé à la ligne de qualification sous le nom. */
function Surtitre({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold tracking-[0.2em] text-accent-text uppercase">{children}</p>
  );
}

export default async function Accueil() {
  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true, publie: true },
    orderBy: { ordre: "asc" },
  });

  return (
    <>
      {/*
        Portrait pleine image.
        
        La photo occupe toute la largeur, le texte se pose dessus. Un voile
        dégradé, du navy profond en bas à gauche vers presque rien en haut à
        droite, garantit la lisibilité du blanc sans noyer le phare : le point
        lumineux reste dans la partie claire du dégradé, là où il fait son
        effet.
      */}
      <section className="relative isolate flex min-h-[36rem] items-end overflow-hidden md:min-h-[44rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/phare.jpg"
          srcSet="/images/phare-petit.jpg 602w, /images/phare.jpg 1338w"
          sizes="100vw"
          width={1338}
          height={2000}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[62%_38%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(105deg, rgba(28,22,56,0.92) 0%, rgba(28,22,56,0.78) 38%, rgba(28,22,56,0.30) 68%, rgba(28,22,56,0.12) 100%)",
          }}
        />

        <div className="mx-auto w-full max-w-5xl px-6 py-16 text-white md:py-24">
          <p className="text-[11px] font-bold tracking-[0.2em] text-white/70 uppercase">
            {SITE.titre}
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-[3.25rem] leading-[0.95] tracking-[-0.03em] md:text-[5.5rem]">
            Amandine
            <br />
            Monsel
          </h1>
          <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-lg font-semibold">
            {SITE.publics.map((p, i) => (
              <span key={p} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden="true" className="h-1 w-1 rounded-full bg-white/60" />}
                {p}
              </span>
            ))}
          </p>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/80">{SITE.accroche}</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/rendez-vous"
              className="rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              Prendre rendez-vous
            </Link>
            <a
              href={`tel:${SITE.telephoneLien}`}
              className="rounded-full border border-white/40 px-7 py-3.5 text-sm font-semibold transition-colors hover:border-white"
              data-numeric
            >
              {SITE.telephone}
            </a>
          </div>
        </div>
      </section>

      <section className="bg-bande-violette px-6 py-16 text-white md:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="max-w-3xl font-display text-[1.6rem] leading-snug tracking-tight md:text-[2.25rem]">
            Je reçois les enfants dès quatre ans, les adolescents et leurs parents, ainsi que les
            jeunes adultes.
          </p>
          <p className="mt-6 text-white/60">{SITE.langues}</p>
        </div>
      </section>

      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <Titre>Mon approche</Titre>
          <div className="mt-10 grid gap-6 md:grid-cols-2 md:gap-14">
            {SITE.parcours.map((p) => (
              <p key={p.slice(0, 24)} className="text-lg leading-relaxed text-ink-muted">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-bande-claire px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <Titre>Ce que j’accompagne</Titre>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-muted">
            Je propose un espace de parole et d’accompagnement pour de nombreuses problématiques.
          </p>
          <ul className="mt-10 grid gap-px overflow-hidden rounded-[24px] bg-line-strong/50 sm:grid-cols-2">
            {SITE.problematiques.map((p) => (
              <li key={p} className="flex items-start gap-4 bg-paper px-7 py-7">
                <span
                  aria-hidden="true"
                  className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                />
                <span className="text-[17px] leading-snug">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-bande-navy px-6 py-20 text-white md:py-28">
        <div className="mx-auto max-w-5xl">
          <Titre>La première séance</Titre>
          <div className="mt-10 grid gap-8 md:grid-cols-2 md:gap-14">
            <p className="text-lg leading-relaxed text-white/80">
              On prend le temps de faire connaissance. Vous racontez ce qui vous amène, à votre
              rythme, sans avoir à tout dire d’emblée.
            </p>
            <div className="flex flex-col items-start gap-6">
              <p className="text-lg leading-relaxed text-white/80">
                À la fin, nous décidons ensemble s’il y a lieu de continuer, et à quel rythme. Rien
                ne vous engage au-delà.
              </p>
              <Link
                href="/questions"
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold transition-colors hover:border-white"
              >
                Toutes les questions
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <Titre>Où me trouver</Titre>
          {/* Cartes neutres, à dessein. Le code couleur des lieux sert à les
              distinguer d'un coup d'œil dans l'agenda, où ils se croisent vingt
              fois par semaine. Un visiteur, lui, voit deux adresses : la couleur
              n'y apporte rien et fait bariolé. Elle reste dans l'outil. */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {cabinets.map((c) => (
              <div key={c.id} className="rounded-[24px] bg-sunken px-8 py-8">
                <p className="font-display text-2xl">{c.nom}</p>
                <p className="mt-2 text-sm text-ink-muted">{adresseCabinet(c)}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-start gap-6 rounded-[24px] bg-accent px-8 py-10 text-accent-contrast md:flex-row md:items-center md:justify-between md:px-12">
            <div>
              <p className="font-display text-2xl leading-tight md:text-3xl">
                Les créneaux libres sont en ligne.
              </p>
              <p className="mt-2 text-sm text-white/75">
                Un premier rendez-vous se confirme par retour de courriel.
              </p>
            </div>
            <Link
              href="/rendez-vous"
              className="shrink-0 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-accent transition-opacity hover:opacity-90"
            >
              Prendre rendez-vous
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
