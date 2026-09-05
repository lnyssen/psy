import Link from "next/link";

/**
 * Filtres et tris passent par l'URL plutôt que par un état client : la vue est
 * partageable, le retour arrière fonctionne, et rien ne dépend de JavaScript.
 */

export type Params = Record<string, string | undefined>;

export function avecParam(base: string, params: Params, cle: string, valeur?: string) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== cle) p.set(k, v);
  if (valeur) p.set(cle, valeur);
  const q = p.toString();
  return q ? `${base}?${q}` : base;
}

export function GroupeFiltre({
  base,
  params,
  cle,
  libelle,
  options,
}: {
  base: string;
  params: Params;
  cle: string;
  libelle: string;
  options: { valeur: string; label: string }[];
}) {
  const actuel = params[cle];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
        {libelle}
      </span>
      <Pilule href={avecParam(base, params, cle)} actif={!actuel}>
        tout
      </Pilule>
      {options.map((o) => (
        <Pilule
          key={o.valeur}
          href={avecParam(base, params, cle, o.valeur)}
          actif={actuel === o.valeur}
        >
          {o.label}
        </Pilule>
      ))}
    </div>
  );
}

function Pilule({
  href,
  actif,
  children,
}: {
  href: string;
  actif: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={actif ? "true" : undefined}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        actif
          ? "border-accent bg-accent text-accent-contrast"
          : "border-line-strong text-ink-muted hover:border-accent hover:text-accent-text"
      }`}
    >
      {children}
    </Link>
  );
}

/** En-tête de colonne cliquable : un clic trie, un second inverse le sens. */
export function EnTeteTri({
  base,
  params,
  champ,
  children,
  aDroite = false,
}: {
  base: string;
  params: Params;
  champ: string;
  children: React.ReactNode;
  aDroite?: boolean;
}) {
  const actif = params.tri === champ;
  const sens = params.sens === "desc" ? "desc" : "asc";
  const prochainSens = actif && sens === "asc" ? "desc" : "asc";

  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== "tri" && k !== "sens") p.set(k, v);
  p.set("tri", champ);
  p.set("sens", prochainSens);

  return (
    <th
      scope="col"
      className={`px-3 py-2.5 font-semibold first:pl-5 last:pr-5 ${aDroite ? "text-right" : "text-left"}`}
      aria-sort={actif ? (sens === "asc" ? "ascending" : "descending") : "none"}
    >
      <Link
        href={`${base}?${p.toString()}`}
        className={`inline-flex items-center gap-1 transition-colors hover:text-accent-text ${
          actif ? "text-accent-text" : ""
        }`}
      >
        {children}
        <span aria-hidden="true" className={actif ? "" : "opacity-25"}>
          {actif && sens === "desc" ? "↓" : "↑"}
        </span>
      </Link>
    </th>
  );
}
