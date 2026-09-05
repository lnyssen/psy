import { prisma } from "@/lib/db";

// La page lit la base à chaque requête : pas de prérendu au build, qui
// échouerait faute de base accessible à ce moment-là.
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "à venir",
  ATTENDED: "honorée",
  CANCELLED_IN_TIME: "annulée à temps",
  NO_SHOW: "absence non excusée",
};

const PAYMENT_LABEL: Record<string, string> = {
  DUE: "dû",
  PAID: "payé",
  OVERDUE: "en retard",
};

const PAYMENT_COLOR: Record<string, string> = {
  DUE: "text-due",
  PAID: "text-paid",
  OVERDUE: "text-overdue",
};

/** Le brief pose que le statut de la séance détermine mécaniquement sa
 *  facturabilité. C'est donc une propriété dérivée, jamais stockée : une
 *  annulation à temps ne porte aucun état de paiement, une absence non
 *  excusée en porte un (elle reste due). */
function isBillable(status: string) {
  return status === "ATTENDED" || status === "NO_SHOW";
}

const SCHEME_LABEL: Record<string, string> = {
  CONVENTIONNE: "conventionné",
  PRIVE: "privé",
};

/** Principe de discrétion du brief : les vues d'ensemble n'affichent pas les
 *  noms complets. L'écran est potentiellement visible depuis le fauteuil. */
function initials(firstName: string, lastName: string) {
  return `${firstName[0]}.${lastName[0]}.`;
}

const dateFmt = new Intl.DateTimeFormat("fr-BE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("fr-BE", { hour: "2-digit", minute: "2-digit" });

function euros(cents: number | null) {
  if (cents === null) return "—";
  return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default async function Page() {
  let sessions;
  let error: string | null = null;

  try {
    sessions = await prisma.session.findMany({
      orderBy: { startsAt: "asc" },
      include: { patient: true },
    });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="mb-6 border border-line bg-white px-4 py-3 text-sm text-ink-muted">
        Instance de vérification technique. Toutes les personnes affichées sont
        fictives. Aucune donnée réelle de patient ne doit être saisie ici.
      </p>

      <h1 className="text-2xl font-semibold">Chaîne Neon → Prisma → Vercel</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Si les séances ci-dessous s’affichent, la base répond et l’application la
        lit correctement.
      </p>

      {error ? (
        <div className="mt-8 border border-overdue bg-white p-4">
          <p className="font-semibold text-overdue">La base n’a pas répondu.</p>
          <pre className="mt-2 overflow-x-auto text-xs text-ink-muted">{error}</pre>
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="py-2 pr-4 font-medium">Quand</th>
                <th className="py-2 pr-4 font-medium">Patient</th>
                <th className="py-2 pr-4 font-medium">Régime</th>
                <th className="py-2 pr-4 font-medium">Séance</th>
                <th className="py-2 pr-4 font-medium">Montant</th>
                <th className="py-2 font-medium">Paiement</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-line/60">
                  <td className="tabular py-2 pr-4 whitespace-nowrap">
                    {dateFmt.format(s.startsAt)} {timeFmt.format(s.startsAt)}
                  </td>
                  <td className="tabular py-2 pr-4">
                    {initials(s.patient.firstName, s.patient.lastName)}
                  </td>
                  <td className="py-2 pr-4 text-ink-muted">{SCHEME_LABEL[s.patient.scheme]}</td>
                  <td className="py-2 pr-4">{STATUS_LABEL[s.status]}</td>
                  <td className="tabular py-2 pr-4 whitespace-nowrap">{euros(s.amountCents)}</td>
                  <td
                    className={
                      isBillable(s.status)
                        ? `py-2 font-medium ${PAYMENT_COLOR[s.paymentStatus]}`
                        : "py-2 text-ink-muted"
                    }
                  >
                    {isBillable(s.status) ? PAYMENT_LABEL[s.paymentStatus] : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-8 text-ink-muted">
          La base répond, mais elle est vide. Lancez <code>npm run db:seed</code>.
        </p>
      )}
    </main>
  );
}
