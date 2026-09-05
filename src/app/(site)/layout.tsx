import Link from "next/link";
import { prisma } from "@/lib/db";
import { adresseCabinet } from "@/lib/format";
import { SITE } from "@/lib/site";

const PAGES = [
  { href: "/", label: "Accueil" },
  { href: "/praticalites", label: "Praticalités" },
  { href: "/questions", label: "Questions fréquentes" },
  { href: "/contact", label: "Contact" },
];

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const cabinets = await prisma.cabinet.findMany({
    where: { actif: true, publie: true },
    orderBy: { ordre: "asc" },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-5">
          <Link href="/" className="flex shrink-0 flex-col">
            <span className="font-display text-[22px] leading-[1.15] font-bold tracking-tight">
              Amandine Monsel
            </span>
            <span className="mt-0.5 text-[11px] leading-[1.4] font-semibold tracking-[0.2em] text-accent-text uppercase">
              Psychologue clinicienne
            </span>
          </Link>
          <nav aria-label="Navigation du site" className="flex flex-wrap gap-x-5 gap-y-1">
            {PAGES.slice(1).map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="text-sm text-ink-muted transition-colors hover:text-accent-text"
              >
                {p.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/rendez-vous"
            className="ml-auto shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            Prendre rendez-vous
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 md:py-16">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10 text-sm">
          <div className="flex flex-wrap gap-x-12 gap-y-6">
            {cabinets.map((c) => (
              <div key={c.id}>
                <p className="font-semibold">{c.nom}</p>
                <p className="mt-1 text-ink-muted">{adresseCabinet(c)}</p>
              </div>
            ))}
            <div>
              <p className="font-semibold">Contact</p>
              <p className="mt-1">
                <a href={`tel:${SITE.telephoneLien}`} className="text-ink-muted hover:text-accent-text" data-numeric>
                  {SITE.telephone}
                </a>
              </p>
              <p>
                <a href={`mailto:${SITE.email}`} className="text-ink-muted hover:text-accent-text">
                  {SITE.email}
                </a>
              </p>
            </div>
          </div>
          <p className="text-xs text-ink-muted">
            Amandine Monsel — Amapsy SRL. Psychologue inscrite à la Commission des psychologues.
            Les échanges sont couverts par le secret professionnel.
          </p>
          <p className="text-xs text-ink-muted">
            Site de démonstration. Les informations qui y figurent restent à compléter.
          </p>
        </div>
      </footer>
    </div>
  );
}
