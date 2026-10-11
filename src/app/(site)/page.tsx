import Link from "next/link";
import { prisma } from "@/lib/db";
import { adresseCabinet } from "@/lib/format";
import { SITE } from "@/lib/site";
import { Reveal } from "@/components/Reveal";
import { parametres } from "@/lib/parametres";

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
 * pleines, lisibles en blanc dans les deux cas (9,4:1 et 13,9:1). Les faire
 * varier aurait cassé l'alternance, qui est le sujet.
 */

/** Titre de section. En grand : ce sont les repères qui permettent de parcourir
 *  la page sans la lire, et une capitale de onze points ne remplit pas ce rôle.
 *
 *  Une seule couleur pour tous les titres du site, le bleu nuit — sauf sur les
 *  aplats sombres, où elle serait illisible et où le blanc prend le relais. */
function Titre({ children, surAplat }: { children: React.ReactNode; surAplat?: boolean }) {
  return (
    <h2
      className={`font-display text-[2rem] leading-[1.05] tracking-tight md:text-[3rem] ${
        surAplat ? "text-white" : "text-titre"
      }`}
    >
      {children}
    </h2>
  );
}

export default async function Accueil() {
  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true, publie: true },
    orderBy: { ordre: "asc" },
  });
  const reglages = await parametres();

  return (
    <>
      {/*
        Photo pleine largeur, remontée sous l'en-tête.

        La marge négative annule la hauteur réservée à la pastille : la photo
        part du haut de la fenêtre et la pastille flotte dessus. Le texte, lui,
        reste calé en bas et sur la même gouttière que le logo — la section
        porte la gouttière, le bloc intérieur n'en ajoute pas. C'est ce doublon
        qui décalait le titre de vingt-quatre pixels vers la droite.
      */}
      <section className="relative isolate -mt-[var(--entete)] flex min-h-[36rem] items-end overflow-hidden px-6 md:min-h-[44rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/phare.jpg"
          srcSet="/images/phare-petit.jpg 800w, /images/phare.jpg 1600w"
          sizes="100vw"
          width={1600}
          height={1263}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[78%_88%] md:object-[65%_85%]"
        />
        {/*
          Le voile n'est pas le même selon la largeur, et il ne pouvait pas
          l'être. Sur un écran large, le texte occupe la gauche et la photo la
          droite : un dégradé diagonal assombrit l'un sans toucher l'autre, et
          le phare reste dans la partie faible. Sur un téléphone, la colonne
          fait toute la largeur et cette diagonale ne couvre plus rien — le
          sur-titre tombait à 2,3:1 et l'accroche à 3,1:1 sur le ciel clair.
          D'où un second voile, vertical, qui remonte du bas.

          Mesuré sur le rendu réel (photo composée puis dégradés appliqués, pire
          pixel sous chaque ligne de texte), pas estimé.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 md:hidden"
          style={{
            background:
              "linear-gradient(to top, rgba(24,18,50,0.95) 0%, rgba(24,18,50,0.88) 42%, rgba(24,18,50,0.70) 72%, rgba(24,18,50,0.52) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 hidden md:block"
          style={{
            background:
              "linear-gradient(72deg, rgba(24,18,50,0.86) 0%, rgba(24,18,50,0.66) 34%, rgba(24,18,50,0.24) 66%, rgba(24,18,50,0.04) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 hidden h-2/3 md:block"
          style={{
            background: "linear-gradient(to top, rgba(24,18,50,0.5) 0%, rgba(24,18,50,0) 100%)",
          }}
        />

        {/* Le haut du bloc réserve la hauteur de la pastille : sur téléphone le
            texte dépasse la hauteur minimale de la section et remontait sinon
            sous l'en-tête, qui coupait le sur-titre. */}
        <div className="hero-cascade mx-auto w-full max-w-5xl pt-[calc(var(--entete)+2rem)] pb-16 text-white md:pt-[calc(var(--entete)+3rem)] md:pb-24">
          <p className="text-[11px] font-bold tracking-[0.2em] text-white/85 uppercase">
            {SITE.titre}
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-[3.25rem] leading-[0.95] tracking-[-0.03em] md:text-[5.5rem]">
            Amandine
            <br />
            Monsel
          </h1>
          <p className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-lg font-semibold sm:gap-x-3">
            {SITE.publics.map((p, i) => (
              <span key={p} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden="true" className="hidden h-1 w-1 rounded-full bg-white/60 sm:block" />}
                {p}
              </span>
            ))}
          </p>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/90">{SITE.accroche}</p>
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

      {/* En bref : trois faits qui répondent d'emblée à « est-ce pour moi ? ». */}
      <section aria-label="En bref" className="bg-bande-violette px-6 py-9 text-nuit">
        <Reveal className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {[
            ["20 ans", "d’expérience clinique"],
            ["FR · EN", "consultations en français et en anglais"],
            [`${cabinets.length} cabinets`, cabinets.map((c) => c.nom).join(" et ")],
          ].map(([gros, petit]) => (
            <p key={gros} className="flex flex-col">
              <span className="font-display text-[2rem] leading-tight">{gros}</span>
              <span className="text-[15px] text-nuit/80">{petit}</span>
            </p>
          ))}
        </Reveal>
      </section>

      <section id="pour-qui" className="px-6 py-20 md:py-28">
        <Reveal className="mx-auto max-w-5xl">
          <Titre>Pour qui ?</Titre>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {SITE.publicsDetail.map((p) => (
              <article key={p.nom} className="flex flex-col gap-3 rounded-[24px] bg-surface px-8 py-8">
                <span className="text-sm font-semibold text-accent-text">{p.repere}</span>
                <h3 className="font-display text-[2rem] leading-tight">{p.nom}</h3>
                <p className="text-ink-muted">{p.texte}</p>
              </article>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="seance" className="px-6 pb-20 md:pb-28">
        <Reveal className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-12 rounded-[32px] bg-bande-navy px-8 py-12 text-white md:flex-row md:gap-14 md:px-14 md:py-16">
            <div className="flex flex-col items-start gap-4 md:w-1/3">
              <h2 className="font-display text-[2rem] leading-[1.05] tracking-tight md:text-[3rem]">
                La première séance
              </h2>
              <p className="text-white/80">Rien ne vous engage au-delà.</p>
              <Link
                href="/questions"
                className="mt-2 inline-flex min-h-11 items-center rounded-full border border-white/40 px-5 text-sm font-semibold transition-colors hover:border-white"
              >
                Toutes les questions →
              </Link>
            </div>
            <ol className="grid flex-1 gap-8 sm:grid-cols-3">
              {[
                ["On fait connaissance", "On prend le temps, sans pression."],
                ["Vous racontez", "Ce qui vous amène, à votre rythme, sans avoir à tout dire d’emblée."],
                ["On décide ensemble", "S’il y a lieu de continuer, et à quel rythme."],
              ].map(([titre, texte], i) => (
                <li key={titre} className="flex flex-col gap-2.5 border-t border-white/20 pt-5">
                  <span className="font-display text-[2.5rem] leading-none text-bande-violette" aria-hidden="true">
                    {i + 1}
                  </span>
                  <strong className="font-semibold">{titre}</strong>
                  <span className="text-white/80">{texte}</span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </section>

      {/*
        Le portrait entre ici : c'est le seul endroit de la page où l'on parle
        d'elle à la première personne. Servi à 500 px pour un affichage qui ne
        dépasse pas 260, pour ne pas l'agrandir au-delà du fichier d'origine.
      */}
      <section id="approche" className="bg-bande-claire px-6 py-20 md:py-28">
        <Reveal className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[16rem_1fr] lg:gap-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/amandine.jpg"
            width={500}
            height={500}
            alt="Portrait d’Amandine Monsel"
            className="h-40 w-40 rounded-[28px] object-cover sm:h-52 sm:w-52 lg:h-auto lg:w-full"
          />

          <div className="flex flex-col gap-12">
            <div className="flex max-w-2xl flex-col gap-5">
              <Titre>Mon approche</Titre>
              <p className="mt-3 text-xl leading-relaxed">{SITE.parcours[0]}</p>
              <p className="leading-relaxed text-ink-muted">{SITE.parcours[1]}</p>
            </div>

            <div className="grid gap-12 border-t border-line-strong/70 pt-10 md:grid-cols-2 md:gap-14">
              <div>
                <h3 className="text-[11px] font-semibold tracking-[0.12em] text-accent-text uppercase">
                  Ce que j’accompagne
                </h3>
                <ul className="mt-5 flex flex-col gap-3">
                  {SITE.problematiques.map((p) => (
                    <li key={p} className="flex gap-3 leading-snug">
                      <span aria-hidden="true" className="mt-[0.5rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold tracking-[0.12em] text-accent-text uppercase">
                  Parcours
                </h3>
                <ol className="mt-5 flex flex-col">
                  {SITE.chronologie.map((c) => (
                    <li key={c.periode + c.intitule} className="border-t border-line-strong/70 py-3 first:border-t-0 first:pt-0">
                      <span className="block text-sm text-ink-muted" data-numeric>
                        {c.periode}
                      </span>
                      <span className="leading-snug">{c.intitule}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section id="pratique" className="px-6 pt-20 pb-10 md:pt-28">
        <Reveal className="mx-auto max-w-5xl">
          <Titre>En pratique</Titre>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              ["Durée d’une séance", `${reglages.dureeSeanceMin} minutes`],
              ["Tarif", "Communiqué au premier contact"],
              ["Remboursement", "Mutuelle · convention INAMI"],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1.5 rounded-[20px] bg-surface px-7 py-7">
                <span className="text-[15px] text-ink-muted">{k}</span>
                <span className="font-display text-[1.75rem] leading-tight">{v}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 flex flex-wrap gap-x-8 gap-y-1 font-semibold">
            <Link href="/questions" className="text-accent-text hover:underline">
              Questions fréquentes →
            </Link>
          </p>
        </Reveal>
      </section>

      <section id="lieux" className="px-6 py-14 md:py-20">
        <Reveal className="mx-auto max-w-5xl">
          <Titre>Deux cabinets</Titre>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {cabinets.map((c) => {
              return (
                <article key={c.id} className="flex flex-col gap-3 rounded-[24px] bg-surface px-8 py-8">
                  <h3 className="font-display text-[1.9rem] leading-tight">{c.nom}</h3>
                  <p>{adresseCabinet(c)}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresseCabinet(c))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block w-fit py-2 font-semibold text-accent-text hover:underline"
                  >
                    Itinéraire →
                  </a>
                </article>
              );
            })}
          </div>

          <div className="mt-14 flex flex-col items-start gap-6 rounded-[32px] bg-accent px-8 py-10 text-accent-contrast md:flex-row md:items-center md:justify-between md:px-14">
            <div>
              <p className="font-display text-2xl leading-tight md:text-3xl">
                Les créneaux libres sont en ligne.
              </p>
              <p className="mt-2 text-sm text-white/90">
                Une demande reçoit une réponse rapide, pour confirmer ou proposer un autre créneau.
              </p>
            </div>
            <Link
              href="/rendez-vous"
              className="shrink-0 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-accent transition-opacity hover:opacity-90"
            >
              Prendre rendez-vous
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
