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
export type TonOption = { colorHex: string; vividHex: string };

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
    <div className="hidden flex-wrap items-center gap-1.5 md:flex">
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
  // Les couleurs de cabinet venant de la base, elles passent par des styles en
  // ligne : Tailwind ne peut pas générer une classe pour une valeur qui
  // n'existe qu'à l'exécution.
  const style: React.CSSProperties | undefined = ton
    ? ({
        "--cab": ton.colorHex,
        "--cab-vif": ton.vividHex,
        ...(actif
          ? { backgroundColor: "var(--cab)", borderColor: "var(--cab)", color: "#fff" }
          : { borderColor: "color-mix(in srgb, var(--cab-vif) 55%, transparent)" }),
      } as unknown as React.CSSProperties)
    : undefined;

  return (
    <Link
      href={href}
      aria-current={actif ? "true" : undefined}
      style={style}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        ton
          ? actif
            ? ""
            : "texte-cabinet"
          : actif
            ? "border-accent bg-accent text-accent-contrast"
            : "border-line-strong text-ink-muted hover:border-accent hover:text-accent-text"
      }`}
    >
      {/* Le point rappelle la couleur du cabinet avant même la sélection. Il est
          rendu dans les deux états et passe au blanc sur fond plein : ne
          l'afficher qu'au repos faisait varier la largeur du bouton d'un état à
          l'autre, et les boutons sautaient. */}
      {ton && (
        <span
          aria-hidden="true"
          style={actif ? { backgroundColor: "#fff" } : undefined}
          className={`h-1.5 w-1.5 rounded-full ${actif ? "" : "filet-cabinet"}`}
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
      </Link>
    </th>
  );
}

/**
 * Tri sur téléphone.
 *
 * Les en-têtes de colonne cliquables disparaissent avec le tableau : sous
 * 900 px les listes deviennent des cartes empilées, et il faut bien rendre le
 * tri autrement qu'en le supprimant. Ces pilules portent les mêmes paramètres
 * d'URL que les en-têtes, et un second appui inverse le sens.
 */
export function TriMobile({
  base,
  params,
  champs,
}: {
  base: string;
  params: Params;
  champs: { champ: string; label: string }[];
}) {
  const actuel = params.tri ?? champs[0].champ;
  const sens = params.sens === "desc" ? "desc" : "asc";

  return (
    <div className="flex flex-wrap items-center gap-1.5 md:hidden">
      <span className="mr-1 text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
        Trier
      </span>
      {champs.map((c) => {
        const actif = actuel === c.champ;
        const p = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v && k !== "tri" && k !== "sens") p.set(k, v);
        }
        p.set("tri", c.champ);
        p.set("sens", actif && sens === "asc" ? "desc" : "asc");
        return (
          <Link
            key={c.champ}
            href={`${base}?${p.toString()}`}
            aria-current={actif ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              actif
                ? "border-accent bg-accent text-accent-contrast"
                : "border-line-strong text-ink-muted"
            }`}
          >
            {c.label}
            {actif && <span aria-hidden="true"> {sens === "desc" ? "\u2193" : "\u2191"}</span>}
          </Link>
        );
      })}
    </div>
  );
}
