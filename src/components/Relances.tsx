import Link from "next/link";
import { SITE } from "@/lib/site";

export type Relance = {
  patientId: string;
  nom: string;
  /** Les adresses connues de la famille : parents d'abord, puis le patient. */
  adresses: string[];
  telephone: string | null;
  seances: { date: string; montant: string }[];
  total: string;
};

/**
 * Relance des impayés, une ligne par patient.
 *
 * Le bouton n'envoie rien : il ouvre la messagerie d'Amandine avec un e-mail
 * prérempli (séances, montants, IBAN), qu'elle relit et envoie elle-même. Une
 * relance d'argent auprès d'une famille se fait avec tact, et ça ne
 * s'automatise pas.
 */
export function Relances({ relances, iban }: { relances: Relance[]; iban: string | null }) {
  if (relances.length === 0) return null;

  const lien = (r: Relance) => {
    const corps = [
      "Bonjour,",
      "",
      `Sauf erreur de ma part, ${r.seances.length > 1 ? "les séances suivantes" : "la séance suivante"} de ${r.nom} ${
        r.seances.length > 1 ? "restent" : "reste"
      } à régler :`,
      "",
      ...r.seances.map((s) => `- ${s.date} : ${s.montant}`),
      "",
      `Total : ${r.total}`,
      ...(iban ? ["", `Vous pouvez effectuer le virement sur le compte ${iban}, en mentionnant le nom de ${r.nom}.`] : []),
      "",
      "Si le paiement a déjà été fait, merci de ne pas tenir compte de ce message.",
      "",
      "Bien à vous,",
      SITE.nom,
    ].join("\n");
    const params = new URLSearchParams({ subject: `Séances à régler : ${r.nom}`, body: corps });
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
            </span>
            <span className="font-mono text-sm font-semibold text-due" data-numeric>
              {r.total}
            </span>
            {r.adresses.length > 0 ? (
              <a
                href={lien(r)}
                className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium transition-colors hover:border-accent hover:text-accent-text"
              >
                préparer la relance
              </a>
            ) : (
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
