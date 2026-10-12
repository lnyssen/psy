import Link from "next/link";
import { EnvoyerRelance } from "@/components/EnvoyerRelance";
import { lienWhatsApp } from "@/lib/contact";
import { sujetRelance, texteRelance, type Relance } from "@/lib/relance";

/**
 * Relance des impayés, une ligne par patient, avec trois façons de la faire :
 * « préparer la relance » ouvre la messagerie avec un e-mail prérempli (séances,
 * montants, IBAN) qu'on relit avant d'envoyer ; « envoyer » l'expédie d'un clic,
 * après confirmation ; « WhatsApp » ouvre la conversation avec le même texte.
 * Rien ne part jamais tout seul : une relance d'argent auprès d'une famille se
 * décide. Au-delà de trente jours, l'ancienneté se lit en rouge.
 */
export function Relances({ relances, iban }: { relances: Relance[]; iban: string | null }) {
  if (relances.length === 0) return null;

  const lien = (r: Relance) => {
    const params = new URLSearchParams({ subject: sujetRelance(r), body: texteRelance(r, iban) });
    // URLSearchParams encode les espaces en « + », que les messageries
    // affichent tels quels dans un lien mailto.
    return `mailto:${r.adresses.join(",")}?${params.toString().replace(/\+/g, "%20")}`;
  };

  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold">Relances</h2>
      <p className="mb-3 text-xs text-ink-muted">
        Tout ce que chaque patient doit encore, tous cabinets confondus. Le bouton prépare un
        e-mail dans votre messagerie, à relire avant de l’envoyer.
      </p>
      <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
        {relances.map((r) => (
          <li
            key={r.patientId}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-5 py-3 last:border-b-0"
          >
            <Link
              href={`/admin/patients/${r.patientId}`}
              className="min-w-40 flex-1 text-sm font-medium hover:text-accent-text"
            >
              {r.nom}
            </Link>
            <span className="text-xs text-ink-muted" data-numeric>
              {r.seances.length} séance{r.seances.length > 1 ? "s" : ""} depuis le {r.seances[0].date}
              <span className={r.depuisJours > 30 ? "font-semibold text-overdue" : ""}>
                {" "}
                ({r.depuisJours} j)
              </span>
            </span>
            <span className="font-mono text-sm font-semibold text-due" data-numeric>
              {r.total}
            </span>
            {r.adresses.length > 0 && (
              <>
                <a
                  href={lien(r)}
                  className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium transition-colors hover:border-accent hover:text-accent-text"
                >
                  préparer la relance
                </a>
                <EnvoyerRelance patientId={r.patientId} nom={r.nom} adresses={r.adresses} />
              </>
            )}
            {(() => {
              const wa = lienWhatsApp(r.telephone, texteRelance(r, iban));
              return wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium transition-colors hover:border-accent hover:text-accent-text"
                >
                  WhatsApp
                </a>
              ) : null;
            })()}
            {r.adresses.length === 0 && !lienWhatsApp(r.telephone) && (
              <span className="text-xs text-ink-muted">
                pas d’e-mail{r.telephone ? ` · ${r.telephone}` : ""}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
