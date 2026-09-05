import Link from "next/link";
import { prisma } from "@/lib/db";
import { adresseCabinet } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Contact() {
  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true },
    orderBy: { ordre: "asc" },
  });

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h1 className="font-display text-4xl font-bold tracking-tight">Contact</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
          Pour une demande de rendez-vous, la{" "}
          <Link href="/rendez-vous" className="text-accent-text hover:underline">
            page dédiée
          </Link>{" "}
          est plus rapide : vous y voyez les créneaux libres. Pour tout le reste, écrivez ou
          téléphonez.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {cabinets.map((c) => (
          <div key={c.id} className="rounded-[14px] border border-line px-6 py-5">
            <p
              style={{ "--cab": c.colorHex } as React.CSSProperties}
              className="texte-cabinet font-bold"
            >
              {c.nom}
            </p>
            <p className="mt-1 text-sm text-ink-muted">{adresseCabinet(c)}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[14px] border border-dashed border-line-strong px-6 py-5">
        <p className="text-sm">
          <span className="font-semibold">À compléter</span> — adresse électronique et numéro de
          téléphone professionnels. Je ne les invente pas : ce sont des coordonnées réelles qui
          engagent, et elles doivent venir d’elle.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold tracking-tight">En cas d’urgence</h2>
        <div className="mt-4 flex max-w-2xl flex-col gap-3 leading-relaxed text-ink-muted">
          <p>
            Ce site n’est pas un service d’urgence et les messages ne sont pas relevés en continu.
          </p>
          <p>
            Si vous traversez une crise et que vous avez besoin de parler à quelqu’un tout de
            suite, le <span className="font-semibold text-ink">Centre de prévention du suicide</span>{" "}
            répond gratuitement, jour et nuit, au{" "}
            <a href="tel:0800 32 123" className="font-semibold text-accent-text">
              0800 32 123
            </a>
            . En cas de danger immédiat, appelez le{" "}
            <a href="tel:112" className="font-semibold text-accent-text">
              112
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
