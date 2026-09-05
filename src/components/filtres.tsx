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

/**
 * Une option peut porter sa propre couleur active. Les cabinets s'en servent :
 * sélectionner « Uccle » allume la pastille en teal et « Auderghem » en
 * pourpre, aux teintes exactes qu'ils ont dans l'agenda. Le violet générique
 * les aurait rendus indistincts au moment précis où l'on choisit entre eux.
 * Blanc sur teal : 5,59:1. Blanc sur pourpre : 6,82:1.
 */
export type TonOption = "uccle" | "auderghem";

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
  options: { valeur: string; label: string; ton?: TonOption }[];
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
          ton={o.ton}
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
  ton,
  children,
}: {
  href: string;
  actif: boolean;
  ton?: TonOption;
  children: React.ReactNode;
}) {
  const actifStyle = {
    uccle: "border-uccle bg-uccle text-white",
    auderghem: "border-auderghem bg-auderghem text-white",
  };
  const reposStyle = {
    uccle: "border-line-strong text-ink-muted hover:border-uccle hover:text-uccle",
    auderghem: "border-line-strong text-ink-muted hover:border-auderghem hover:text-auderghem",
  };

  return (
    <Link
      href={href}
      aria-current={actif ? "true" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        actif
          ? (ton ? actifStyle[ton] : "border-accent bg-accent text-accent-contrast")
          : (ton ? reposStyle[ton] : "border-line-strong text-ink-muted hover:border-accent hover:text-accent-text")
      }`}
    >
      {/* Au repos, une pastille pleine rappelle déjà la couleur du cabinet :
          sans elle, il faudrait sélectionner pour savoir de quelle teinte on
          parle. */}
      {ton && !actif && (
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${ton === "uccle" ? "bg-uccle" : "bg-auderghem"}`}
        />
      )}
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
