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
export function DocBloc({ bloc }: { bloc: Bloc }) {
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
        <figure className="max-w-4xl">
          <a
            href={bloc.src}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-[14px] border border-line bg-surface"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bloc.src}
              alt={bloc.alt}
              loading="lazy"
              className="h-auto w-full"
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
