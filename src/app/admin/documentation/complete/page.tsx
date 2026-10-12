import Link from "next/link";
import type { Metadata } from "next";
import { BoutonImprimer } from "@/components/BoutonImprimer";
import { DocBloc } from "@/components/DocBloc";
import { PAGES_DOC } from "@/lib/documentation";
import { fmtJourMoisAn } from "@/lib/format";

export const metadata: Metadata = { title: "Documentation complète" };
export const dynamic = "force-dynamic";

/**
 * Toute la documentation sur une seule page, prévue pour le papier et le PDF :
 * une couverture, une table des matières, puis chaque partie sur sa propre
 * page. Le bouton Imprimer ouvre la boîte d'impression du navigateur, qui sait
 * aussi « Enregistrer en PDF » ; scripts/generer-pdf-documentation.ts produit
 * le même PDF en ligne de commande.
 */
export default function DocumentationComplete() {
  const date = fmtJourMoisAn.format(new Date());
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 print:max-w-none">
      <style>{"@media print { @page { size: A4; margin: 16mm 14mm 18mm; } html, body, .outil { background: #fff !important; } }"}</style>

      <div className="sans-impression flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/documentation"
          className="text-sm text-ink-muted transition-colors hover:text-accent-text"
        >
          ← Documentation
        </Link>
        <BoutonImprimer />
      </div>

      <section className="flex min-h-[60vh] flex-col justify-center gap-4 break-after-page print:min-h-[235mm]">
        <p className="text-xs font-semibold tracking-[0.2em] text-accent-text uppercase">
          AMAPSY SRL
        </p>
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight">
          Documentation de l’outil
        </h1>
        <p className="font-display text-2xl text-ink-muted">
          Amandine Monsel, psychologue
        </p>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-ink-muted">
          Comment fonctionne chaque partie de l’outil, pas à pas. Les noms de
          boutons et de champs sont en gras, tels qu’ils s’affichent à l’écran.
          Toutes les personnes montrées sur les captures d’écran sont fictives.
        </p>
        <p className="text-sm text-ink-muted">Version du {date}.</p>
      </section>

      <section className="break-after-page">
        <h2 className="font-display text-3xl tracking-tight">Table des matières</h2>
        <ol className="mt-6 flex flex-col gap-5">
          {PAGES_DOC.map((p, i) => (
            <li key={p.slug}>
              <a href={`#${p.slug}`} className="font-display text-xl hover:text-accent-text">
                {i + 1}. {p.titre}
              </a>
              <ul className="mt-1.5 flex flex-col gap-0.5 pl-6 text-sm text-ink-muted">
                {p.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${p.slug}-${s.id}`} className="hover:text-accent-text">
                      {s.titre}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {PAGES_DOC.map((p, i) => (
        <article
          key={p.slug}
          id={p.slug}
          className={`flex flex-col gap-8 ${i > 0 ? "break-before-page" : ""}`}
        >
          <header className="border-b border-ink/30 pb-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-accent-text uppercase">
              Partie {i + 1}
            </p>
            <h2 className="mt-1 font-display text-4xl tracking-tight">{p.titre}</h2>
            <p className="mt-2 text-sm text-ink-muted">{p.resume}</p>
          </header>
          {p.sections.map((s) => (
            <section
              key={s.id}
              id={`${p.slug}-${s.id}`}
              className="flex flex-col gap-4"
            >
              <h3 className="font-display text-2xl tracking-tight break-after-avoid">
                {s.titre}
              </h3>
              {s.blocs.map((b, k) => (
                <DocBloc key={k} bloc={b} eager />
              ))}
            </section>
          ))}
        </article>
      ))}
    </div>
  );
}
