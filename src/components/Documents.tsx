import { ajouterDocument, supprimerDocument } from "@/lib/documents-actions";
import { TAILLE_MAX_DOCUMENT } from "@/lib/documents-constantes";
import { fmtJourMoisAn } from "@/lib/format";

const MESSAGES: Record<string, { ok: boolean; texte: string }> = {
  ok: { ok: true, texte: "Document ajouté." },
  retire: { ok: true, texte: "Document supprimé." },
  vide: { ok: false, texte: "Choisissez d’abord un fichier." },
  taille: {
    ok: false,
    texte: `Ce fichier dépasse ${TAILLE_MAX_DOCUMENT / 1048576} Mo.`,
  },
  type: {
    ok: false,
    texte:
      "Ce type de fichier n’est pas accepté (PDF, images, texte, Word ou LibreOffice).",
  },
  cle: {
    ok: false,
    texte:
      "La clé de chiffrement est absente : les documents ne peuvent pas être enregistrés.",
  },
};

function taille(octets: number) {
  return octets < 1048576
    ? `${Math.max(1, Math.round(octets / 1024))} Ko`
    : `${(octets / 1048576).toFixed(1)} Mo`;
}

/**
 * Documents joints à un dossier : convention, consentement, courrier à l'école.
 * Chiffrés avant d'entrer en base, téléchargés à la demande — jamais affichés
 * dans la page.
 */
export function Documents({
  patientId,
  documents,
  cle,
  code,
}: {
  patientId: string;
  documents: { id: string; nom: string; taille: number; createdAt: Date }[];
  cle: boolean;
  code?: string;
}) {
  const message = code ? MESSAGES[code] : undefined;
  return (
    <section
      id="documents"
      className="scroll-mt-6 rounded-[14px] border border-line bg-surface px-5 py-4"
    >
      <h2 className="text-sm font-semibold">Documents</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Convention, consentement, courrier à l’école… Chaque document est
        chiffré avant d’être enregistré.
      </p>

      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`mt-3 rounded-[10px] border px-4 py-2 text-sm ${
            message.ok
              ? "border-paid/40 bg-paid-soft text-paid"
              : "border-overdue/40 bg-overdue-soft text-overdue"
          }`}
        >
          {message.texte}
        </p>
      )}

      {documents.length > 0 && (
        <ul className="mt-3 overflow-hidden rounded-[12px] border border-line">
          {documents.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-2.5 text-sm last:border-b-0"
            >
              <a
                href={`/api/documents/${d.id}`}
                className="min-w-40 flex-1 font-medium hover:text-accent-text"
              >
                {d.nom}
              </a>
              <span className="text-xs text-ink-muted" data-numeric>
                {taille(d.taille)} · ajouté le{" "}
                {fmtJourMoisAn.format(d.createdAt)}
              </span>
              <form action={supprimerDocument}>
                <input type="hidden" name="id" value={d.id} />
                <button
                  type="submit"
                  className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-overdue hover:text-overdue"
                >
                  Supprimer
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {cle ? (
        <form
          action={ajouterDocument}
          className="mt-4 flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="patientId" value={patientId} />
          <label className="min-w-52 flex-1">
            <span className="sr-only">Fichier à joindre</span>
            <input
              type="file"
              name="fichier"
              required
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.odt"
              className="w-full text-sm file:mr-3 file:rounded-full file:border file:border-line file:bg-surface file:px-4 file:py-2 file:text-sm file:font-medium"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            Joindre
          </button>
          <p className="basis-full text-xs text-ink-muted">
            PDF, images, texte, Word ou LibreOffice.{" "}
            {TAILLE_MAX_DOCUMENT / 1048576} Mo au plus.
          </p>
        </form>
      ) : (
        <p className="mt-3 rounded-[10px] border border-due/40 bg-due-soft px-4 py-2.5 text-sm text-due">
          La clé de chiffrement (NOTES_KEY) n’est pas configurée sur ce serveur
          : les documents ne peuvent pas être joints.
        </p>
      )}
    </section>
  );
}
