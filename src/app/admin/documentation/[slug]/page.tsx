import Link from "next/link";
import { notFound } from "next/navigation";
import { DocBloc } from "@/components/DocBloc";
import { PAGES_DOC, pageDoc } from "@/lib/documentation";

export function generateStaticParams() {
  return PAGES_DOC.map((p) => ({ slug: p.slug }));
}

export default async function PageDocumentation({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = pageDoc(slug);
  if (!page) notFound();
  const i = PAGES_DOC.findIndex((p) => p.slug === slug);
  const precedente = PAGES_DOC[i - 1];
  const suivante = PAGES_DOC[i + 1];

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/admin/documentation"
        className="text-sm text-ink-muted transition-colors hover:text-accent-text"
      >
        ← Documentation
      </Link>

      <header className="max-w-2xl">
        <h1 className="font-display text-3xl tracking-tight">{page.titre}</h1>
        <p className="mt-2 text-sm text-ink-muted">{page.resume}</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[13rem_1fr]">
        <nav
          aria-label="Sections de la page"
          className="lg:sticky lg:top-6 lg:self-start"
        >
          <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
            Sur cette page
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
            {page.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-block rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-text lg:rounded-md lg:border-0 lg:px-2 lg:text-sm"
                >
                  {s.titre}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-12">
          {page.sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              className="flex scroll-mt-6 flex-col gap-5"
            >
              <h2 className="font-display text-2xl tracking-tight">
                {s.titre}
              </h2>
              {s.blocs.map((b, k) => (
                <DocBloc key={k} bloc={b} />
              ))}
            </section>
          ))}

          <nav
            aria-label="Pages de la documentation"
            className="flex flex-wrap justify-between gap-3 border-t border-line pt-6 text-sm"
          >
            {precedente ? (
              <Link
                href={`/admin/documentation/${precedente.slug}`}
                className="font-medium text-accent-text hover:underline"
              >
                ← {precedente.titre}
              </Link>
            ) : (
              <span />
            )}
            {suivante && (
              <Link
                href={`/admin/documentation/${suivante.slug}`}
                className="font-medium text-accent-text hover:underline"
              >
                {suivante.titre} →
              </Link>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
