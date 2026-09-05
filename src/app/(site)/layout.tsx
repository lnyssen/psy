import { prisma } from "@/lib/db";
import { adresseCabinet } from "@/lib/format";
import { SITE } from "@/lib/site";
import { EnteteSite } from "@/components/EnteteSite";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true, publie: true },
    orderBy: { ordre: "asc" },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <EnteteSite />

      {/*
        Le contenu n'est plus contraint ici : chaque section porte sa propre
        largeur et sa propre bande de couleur. C'est ce qui permet l'alternance
        d'aplats pleine largeur, impossible dans un conteneur unique centré.
      */}
      <main className="flex-1">{children}</main>

      <footer className="bg-bande-navy px-6 py-14 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 text-sm">
          <div className="grid gap-8 sm:grid-cols-3">
            {cabinets.map((c) => (
              <div key={c.id}>
                <p className="font-semibold">{c.nom}</p>
                <p className="mt-1 text-white/70">{adresseCabinet(c)}</p>
              </div>
            ))}
            <div>
              <p className="font-semibold">Contact</p>
              <p className="mt-1">
                <a href={`tel:${SITE.telephoneLien}`} className="text-white/70 hover:text-white" data-numeric>
                  {SITE.telephone}
                </a>
              </p>
              <p>
                <a href={`mailto:${SITE.email}`} className="text-white/70 hover:text-white">
                  {SITE.email}
                </a>
              </p>
              <p className="mt-3">
                <a
                  href={SITE.psybru}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/70 underline underline-offset-4 hover:text-white"
                >
                  Ma fiche sur PsyBru
                </a>
              </p>
            </div>
          </div>
          <p className="border-t border-white/15 pt-6 text-xs text-white/60">
            Amandine Monsel — Amapsy SRL. Psychologue inscrite à la Commission des psychologues.
            Les échanges sont couverts par le secret professionnel.
          </p>
          <p className="text-xs text-white/40">
            Site de démonstration. Certaines informations restent à compléter.
          </p>
        </div>
      </footer>
    </div>
  );
}
