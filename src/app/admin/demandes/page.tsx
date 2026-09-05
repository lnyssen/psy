import { prisma } from "@/lib/db";
import { CabinetTag } from "@/components/tags";
import { traiterDemande } from "@/lib/rdv-actions";
import { fmtHeure, fmtJourLong } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Demandes() {
  const demandes = await prisma.demandeRdv.findMany({
    orderBy: [{ statut: "asc" }, { souhaite: "asc" }],
    include: { cabinet: true },
  });
  const enAttente = demandes.filter((d) => d.statut === "EN_ATTENTE");
  const traitees = demandes.filter((d) => d.statut !== "EN_ATTENTE");

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Demandes</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Rendez-vous demandés depuis le site par des personnes que l’outil ne connaît pas encore.
          Confirmer crée le dossier et la séance.
        </p>
      </header>

      {enAttente.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-muted">
          Aucune demande en attente.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {enAttente.map((d) => (
            <li key={d.id} className="rounded-[14px] border border-line bg-surface px-5 py-4">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-base font-semibold">
                  {d.firstName} {d.lastName}
                </span>
                <CabinetTag cabinet={d.cabinet} />
                <span className="text-sm first-letter:uppercase" data-numeric>
                  {fmtJourLong.format(d.souhaite)} à {fmtHeure.format(d.souhaite)}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-muted" data-numeric>
                {d.email}
                {d.phone ? ` · ${d.phone}` : ""}
              </p>
              {d.message && (
                <p className="mt-3 rounded-[14px] bg-sunken px-4 py-3 text-sm whitespace-pre-wrap">
                  {d.message}
                </p>
              )}
              <form action={traiterDemande} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={d.id} />
                <button
                  type="submit"
                  name="decision"
                  value="confirmer"
                  className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
                >
                  Confirmer et créer le dossier
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="refuser"
                  className="rounded-full border border-line-strong px-5 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-overdue hover:text-overdue"
                >
                  Décliner
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {traitees.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Traitées</h2>
          <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
            {traitees.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-5 py-3 text-sm last:border-b-0"
              >
                <span className="font-medium">
                  {d.firstName} {d.lastName}
                </span>
                <span className="text-ink-muted" data-numeric>
                  {fmtJourLong.format(d.souhaite)}
                </span>
                <span
                  className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    d.statut === "CONFIRMEE"
                      ? "bg-paid-soft text-paid"
                      : "bg-sunken text-ink-muted"
                  }`}
                >
                  {d.statut === "CONFIRMEE" ? "confirmée" : "déclinée"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
