import type { Metadata } from "next";
import { parametres } from "@/lib/parametres";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confidentialité et mentions légales",
  description: "Cookies, données personnelles (RGPD) et mentions légales du site.",
};

const APD = {
  nom: "Autorité de protection des données",
  adresse: "Rue de la Presse 35, 1000 Bruxelles",
  site: "https://www.autoriteprotectiondonnees.be",
};

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-2xl tracking-tight text-titre">{titre}</h2>
      <div className="flex flex-col gap-3 leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

export default async function Confidentialite() {
  const p = await parametres();
  const contact = (
    <a href={`mailto:${SITE.email}`} className="text-accent-text underline underline-offset-4">
      {SITE.email}
    </a>
  );

  return (
    <div className="px-6 py-14 md:py-20">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <header>
          <h1 className="font-display text-4xl tracking-tight text-titre md:text-5xl">
            Confidentialité et mentions légales
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">
            Ce que ce site fait de vos données, et qui l’édite.
          </p>
        </header>

        <Section titre="Cookies">
          <p>
            Ce site <span className="font-medium text-ink">ne dépose aucun cookie</span> sur votre
            appareil : ni cookie publicitaire, ni outil de mesure d’audience, ni traceur de réseau
            social. Il n’y a donc pas de bandeau à accepter.
          </p>
          <p>
            Les polices de caractères sont servies par le site lui-même, et aucun service tiers
            n’est chargé à l’ouverture d’une page. Les liens « Voir sur Google Maps » ne mènent à
            Google que si vous cliquez dessus.
          </p>
        </Section>

        <Section titre="Responsable du traitement">
          <p>
            Amandine Monsel, psychologue clinicienne, exerçant via AMAPSY SRL.
            {p.adresseSiege && <> Siège : {p.adresseSiege.replace(/\s*\n\s*/g, ", ")}.</>}
            {p.numeroEntreprise && <> N° d’entreprise : {p.numeroEntreprise}.</>}
          </p>
          <p>Contact pour toute question sur vos données : {contact}.</p>
        </Section>

        <Section titre="Les données que vous nous confiez">
          <p>
            Le seul endroit du site où vous laissez des informations est le formulaire de demande de
            rendez-vous. Il recueille :
          </p>
          <ul className="list-disc pl-5">
            <li>votre prénom, votre nom et votre numéro de téléphone (obligatoires) ;</li>
            <li>votre adresse électronique et un message (facultatifs) ;</li>
            <li>le cabinet et le créneau souhaités.</li>
          </ul>
          <p>
            Nous vous demandons de ne pas décrire de problème de santé dans le message : ce qui
            relève de la consultation se dit en séance.
          </p>
          <p>
            Ces données servent uniquement à répondre à votre demande et à organiser le rendez-vous.
            La base légale est la prise de mesures précontractuelles à votre demande. Elles ne sont
            ni vendues, ni utilisées à des fins commerciales.
          </p>
          <p>
            Le site n’enregistre pas votre adresse IP. Les téléphones des demandes servent
            seulement à écarter les envois automatisés en rafale.
          </p>
        </Section>

        <Section titre="Si vous devenez patient">
          <p>
            Un dossier est alors ouvert : coordonnées, rendez-vous, notes de suivi et éléments de
            facturation. Il est couvert par le secret professionnel, accessible à la seule
            psychologue, et conservé le temps exigé par les obligations légales et déontologiques
            qui s’imposent à sa profession. Les rendez-vous confirmés sont reportés dans son agenda
            professionnel (Google Agenda), avec le nom du patient.
          </p>
          <p>
            Une demande de rendez-vous qui n’aboutit pas n’est pas conservée au-delà du temps
            nécessaire pour y répondre.
          </p>
        </Section>

        <Section titre="Qui peut voir vos données">
          <p>
            Uniquement Amandine Monsel, ainsi que les prestataires techniques qui hébergent le site
            et l’agenda et n’agissent que sur ses instructions. Aucune donnée n’est communiquée à
            des tiers à des fins commerciales.
          </p>
        </Section>

        <Section titre="Vos droits">
          <p>
            Vous pouvez demander l’accès à vos données, leur rectification, leur effacement, la
            limitation de leur traitement, vous y opposer, ou en obtenir une copie portable. Écrivez
            à {contact} : la réponse vous est donnée dans un délai d’un mois. Il peut vous être
            demandé de justifier de votre identité.
          </p>
          <p>
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une
            réclamation auprès de l’{APD.nom} ({APD.adresse}) :{" "}
            <a
              href={APD.site}
              target="_blank"
              rel="noreferrer"
              className="text-accent-text underline underline-offset-4"
            >
              autoriteprotectiondonnees.be
            </a>
            .
          </p>
        </Section>

        <Section titre="Mentions légales">
          <p>
            Site édité par Amandine Monsel, psychologue clinicienne et psychothérapeute, inscrite à
            la Commission des psychologues, exerçant via AMAPSY SRL.
            {p.adresseSiege && <> Siège : {p.adresseSiege.replace(/\s*\n\s*/g, ", ")}.</>}
            {p.numeroEntreprise && <> N° d’entreprise : {p.numeroEntreprise}.</>}
            {p.numeroInami && <> N° INAMI : {p.numeroInami}.</>}
            {p.numeroVisa && <> Visa SPF Santé publique : {p.numeroVisa}.</>}
            {p.numeroCommission && <> N° Commission des psychologues : {p.numeroCommission}.</>}
          </p>
          <p>
            Téléphone : {SITE.telephone}. E-mail : {contact}.
          </p>
          <p>
            Conception et réalisation du site :{" "}
            <a
              href="https://laurentnyssen.be"
              target="_blank"
              rel="noreferrer"
              className="text-accent-text underline underline-offset-4"
            >
              LN
            </a>
            .
          </p>
          <p>
            Les informations de ce site présentent la pratique de la psychologue ; elles ne
            remplacent pas une consultation et ne constituent pas un avis médical.
          </p>
        </Section>
      </div>
    </div>
  );
}
