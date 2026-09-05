import Link from "next/link";
import { prisma } from "@/lib/db";
import { adresseCabinet } from "@/lib/format";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function Contact() {
  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true, publie: true },
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

      <section className="flex flex-wrap gap-4">
        <a
          href={`tel:${SITE.telephoneLien}`}
          className="rounded-[14px] border border-line px-6 py-5 transition-colors hover:border-accent"
        >
          <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
            Téléphone
          </p>
          <p className="mt-1 text-lg font-semibold" data-numeric>
            {SITE.telephone}
          </p>
        </a>
        <a
          href={`mailto:${SITE.email}`}
          className="rounded-[14px] border border-line px-6 py-5 transition-colors hover:border-accent"
        >
          <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
            Courriel
          </p>
          <p className="mt-1 text-lg font-semibold">{SITE.email}</p>
        </a>
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
