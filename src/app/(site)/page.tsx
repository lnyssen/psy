import Link from "next/link";
import { prisma } from "@/lib/db";
import { adresseCabinet } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Accueil() {
  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true },
    orderBy: { ordre: "asc" },
  });

  return (
    <div className="flex flex-col gap-14">
      <section>
        <h1 className="font-display text-4xl leading-[1.15] font-bold tracking-tight md:text-5xl">
          Un espace pour déposer ce qui pèse, et y voir plus clair.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">
          Je reçois adultes et adolescents à Uccle et à Auderghem, en consultation individuelle.
          Que vous traversiez une période difficile, une question qui revient, ou que vous vouliez
          simplement faire le point, le premier pas est souvent le plus coûteux.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/rendez-vous"
            className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            Prendre rendez-vous
          </Link>
          <Link
            href="/questions"
            className="text-sm font-medium text-accent-text hover:underline"
          >
            Comment se passe une première séance ?
          </Link>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        {cabinets.map((c) => (
          <div
            key={c.id}
            style={{ "--cab": c.colorHex, "--cab-fill": c.fillHex } as React.CSSProperties}
            className="teinte-cabinet rounded-[14px] px-6 py-5"
          >
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase">Cabinet</p>
            <p className="mt-1 text-lg font-bold">{c.nom}</p>
            <p className="mt-1 text-sm opacity-80">{adresseCabinet(c)}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold tracking-tight">Mon approche</h2>
        <div className="mt-4 flex max-w-2xl flex-col gap-4 leading-relaxed text-ink-muted">
          <p>
            Le travail commence par écouter, sans hâte de conclure. Ce qui vous amène a souvent
            une histoire, et cette histoire mérite d’être entendue avant d’être interprétée.
          </p>
          <p>
            Les séances durent quarante-cinq minutes. Leur rythme se décide ensemble : hebdomadaire
            au début le plus souvent, puis espacé à mesure que les choses se posent.
          </p>
          <p className="rounded-[14px] border border-dashed border-line-strong px-5 py-4 text-sm">
            <span className="font-semibold text-ink">À compléter</span> — formation, titres,
            orientation théorique, publics reçus. Ce paragraphe est un emplacement : rien de ce qui
            engage sa qualification ne doit être écrit à sa place.
          </p>
        </div>
      </section>
    </div>
  );
}
