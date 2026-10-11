import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { parametres } from "@/lib/parametres";
import { demoOuverte } from "@/lib/demo";
import { adresseCabinet } from "@/lib/format";
import { SITE } from "@/lib/site";
import { EnteteSite } from "@/components/EnteteSite";

export const metadata: Metadata = {
  // Une page sans titre propre garde celui du site ; les autres s'y ajoutent.
  title: {
    default: "Amandine Monsel — Psychologue clinicienne à Uccle et Auderghem",
    template: "%s — Amandine Monsel",
  },
};

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true, publie: true },
    orderBy: { ordre: "asc" },
  });

  const reglages = await parametres();

  return (
    <div className="grain flex min-h-screen flex-col">
      <EnteteSite />

      {/*
        Le contenu n'est plus contraint ici : chaque section porte sa propre
        largeur et sa propre bande de couleur. C'est ce qui permet l'alternance
        d'aplats pleine largeur, impossible dans un conteneur unique centré.
      */}
      <main className="flex-1">{children}</main>

      <footer className="bg-bande-navy px-6 py-10 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 text-sm">
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {cabinets.map((c) => (
              <div key={c.id}>
                <p className="font-semibold">{c.nom}</p>
                <p className="mt-1 text-white/70">{adresseCabinet(c)}</p>
              </div>
            ))}
            <div>
              <p className="font-semibold">Contact</p>
              <p className="mt-1">
                <a
                  href={`tel:${SITE.telephoneLien}`}
                  className="-my-2 inline-block py-2 text-white/70 hover:text-white"
                  data-numeric
                >
                  {SITE.telephone}
                </a>
              </p>
              <p>
                <a
                  href={`mailto:${SITE.email}`}
                  className="-my-2 inline-block py-2 text-white/70 hover:text-white"
                >
                  {SITE.email}
                </a>
              </p>
              <p>
                <a
                  href={SITE.psybru}
                  target="_blank"
                  rel="noreferrer"
                  className="-my-2 inline-block py-2 text-white/70 underline underline-offset-4 hover:text-white"
                >
                  Ma fiche sur PsyBru
                </a>
              </p>
            </div>
            <div>
              <p className="font-semibold">Numéros utiles</p>
              <ul className="mt-1 flex flex-col">
                {SITE.numerosUtiles.map((n) => (
                  <li key={n.nom} className="text-white/70">
                    {n.nom}{" "}
                    <a
                      href={`tel:${n.lien}`}
                      className="-my-1 inline-block min-w-11 py-2.5 font-medium text-white hover:underline"
                      data-numeric
                    >
                      {n.affichage}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/60">
            <p>
              Amandine Monsel — AMAPSY SRL, psychologue clinicienne. Les
              échanges sont couverts par le secret professionnel.
            </p>
            <dl className="flex flex-wrap gap-x-6 gap-y-1">
              {[
                ["N° d’entreprise", reglages.numeroEntreprise],
                ["Visa SPF Santé publique", reglages.numeroVisa],
                ["N° INAMI", reglages.numeroInami],
                ["Commission des psychologues", reglages.numeroCommission],
              ].flatMap(([k, v]) =>
                v ? (
                  <div key={k} className="flex gap-1.5">
                    <dt>{k}</dt>
                    <dd className="text-white/80" data-numeric>
                      {v}
                    </dd>
                  </div>
                ) : (
                  []
                ),
              )}
            </dl>
            <p className="flex flex-wrap items-center justify-between gap-x-6">
              <Link
                href="/confidentialite"
                className="inline-block py-2 underline underline-offset-4 hover:text-white"
              >
                Confidentialité, cookies et mentions légales
              </Link>
              <span>
                Made by{" "}
                <a
                  href="https://laurentnyssen.be"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block py-2 text-white/70 underline underline-offset-4 hover:text-white"
                >
                  LN
                </a>
              </span>
            </p>
          </div>
          {demoOuverte() && (
            <p className="text-xs text-white/60">
              Site de démonstration. Certaines informations restent à compléter.
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
