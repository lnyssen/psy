import type { Bloc } from "@/lib/documentation";

/** **gras** devient <strong> : les libellés de l'outil se détachent du texte. */
function enrichi(texte: string) {
  return texte.split(/(\*\*[^*]+\*\*)/g).map((m, i) =>
    m.startsWith("**") ? (
      <strong key={i} className="font-semibold text-ink">
        {m.slice(2, -2)}
      </strong>
    ) : (
      m
    ),
  );
}

/** Un bloc de documentation : paragraphe, étapes, liste, remarque, capture. */
export function DocBloc({
  bloc,
  eager = false,
}: {
  bloc: Bloc;
  /** Version imprimable : toutes les images se chargent tout de suite, sans quoi
   *  celles qui sont hors de l'écran manqueraient au PDF. */
  eager?: boolean;
}) {
  switch (bloc.t) {
    case "p":
      return <p className="max-w-3xl leading-relaxed">{enrichi(bloc.texte)}</p>;
    case "etapes":
      return (
        <ol className="flex max-w-3xl flex-col gap-3">
          {bloc.items.map((item, i) => (
            <li key={i} className="flex gap-4 leading-relaxed">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-text"
              >
                {i + 1}
              </span>
              <span>{enrichi(item)}</span>
            </li>
          ))}
        </ol>
      );
    case "liste":
      return (
        <ul className="flex max-w-3xl flex-col gap-2.5">
          {bloc.items.map((item, i) => (
            <li key={i} className="flex gap-3 leading-relaxed">
              <span
                aria-hidden="true"
                className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              />
              <span>{enrichi(item)}</span>
            </li>
          ))}
        </ul>
      );
    case "note":
      return (
        <p className="max-w-3xl rounded-[14px] border border-line bg-sunken px-5 py-3.5 text-sm leading-relaxed">
          <span className="font-semibold">À savoir. </span>
          {enrichi(bloc.texte)}
        </p>
      );
    case "attention":
      return (
        <p className="max-w-3xl rounded-[14px] border border-due/40 bg-due-soft px-5 py-3.5 text-sm leading-relaxed text-due">
          <span className="font-semibold">Attention. </span>
          {enrichi(bloc.texte)}
        </p>
      );
    case "image":
      return (
        <figure className="max-w-4xl break-inside-avoid">
          <a
            href={bloc.src}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-[14px] border border-line bg-surface print:text-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bloc.src}
              alt={bloc.alt}
              loading={eager ? "eager" : "lazy"}
              // Sur papier, une capture haute (la fiche entière) ne doit pas
              // déborder de la page : elle se réduit en hauteur.
              className="h-auto w-full print:mx-auto print:max-h-[215mm] print:w-auto print:max-w-full"
            />
          </a>
          {bloc.legende && (
            <figcaption className="mt-2 text-xs text-ink-muted">
              {bloc.legende} (cliquer pour agrandir)
            </figcaption>
          )}
        </figure>
      );
  }
}
