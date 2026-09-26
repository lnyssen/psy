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
        <div className="mx-auto w-full max-w-5xl pt-[calc(var(--entete)+2rem)] pb-16 text-white md:pt-[calc(var(--entete)+3rem)] md:pb-24">
          <p className="text-[11px] font-bold tracking-[0.2em] text-white/85 uppercase">
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

      <section className="bg-bande-violette px-6 py-16 text-nuit md:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="max-w-3xl font-display text-[1.6rem] leading-snug tracking-tight md:text-[2.25rem]">
            Je reçois les enfants dès quatre ans, les adolescents et leurs parents, ainsi que les
            jeunes adultes.
          </p>
          <p className="mt-6 text-lg font-semibold text-nuit">{SITE.langues}</p>
        </div>
      </section>

      {/*
        Le portrait entre ici et pas dans la bannière : au-dessus, il aurait
        disputé la place au nom et au phare ; ici il arrive au moment où le
        texte dit « je », et c'est le seul endroit de la page où l'on parle
        d'elle à la première personne.

        Il est servi à 500 px pour un affichage qui ne dépasse pas 260 : le
        fichier d'origine ne fait pas plus, et l'agrandir l'aurait rendu mou
        sur un écran à haute densité.
      */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[16rem_1fr] md:gap-14">
          <div className="order-1 md:order-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/amandine.jpg"
              width={500}
              height={500}
              alt="Portrait d’Amandine Monsel"
              className="w-40 rounded-full object-cover sm:w-52 md:w-full md:max-w-[16rem] md:rounded-[28px]"
            />
          </div>

          <div>
            <Titre>Mon approche</Titre>
            <div className="mt-8 flex flex-col gap-6">
              {SITE.parcours.map((p) => (
                <p key={p.slice(0, 24)} className="text-lg leading-relaxed text-ink-muted">
                  {p}
                </p>
              ))}
            </div>
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

      <section className="bg-bande-violette px-6 py-20 text-nuit md:py-28">
        <div className="mx-auto max-w-5xl">
          <Titre>La première séance</Titre>
          <div className="mt-10 grid gap-8 md:grid-cols-2 md:gap-14">
            <p className="text-lg leading-relaxed text-nuit/80">
              On prend le temps de faire connaissance. Vous racontez ce qui vous amène, à votre
              rythme, sans avoir à tout dire d’emblée.
            </p>
            <div className="flex flex-col items-start gap-6">
              <p className="text-lg leading-relaxed text-nuit/80">
                À la fin, nous décidons ensemble s’il y a lieu de continuer, et à quel rythme. Rien
                ne vous engage au-delà.
              </p>
              <Link
                href="/questions"
                className="rounded-full border border-nuit/30 px-6 py-3 text-sm font-semibold transition-colors hover:border-nuit"
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
              <p className="mt-2 text-sm text-white/90">
                Un premier rendez-vous se confirme par retour d’e-mail.
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
