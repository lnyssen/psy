import type { CareScheme, PaymentMethod, PaymentStatus, SessionStatus } from "@prisma/client";
import {
  METHOD_LABEL,
  PAYMENT_LABEL,
  SCHEME_LABEL,
  STATUS_LABEL,
  adresseCabinet,
  isBillable,
  type CabinetVue,
} from "@/lib/format";

/**
 * Contrainte chromatique : plusieurs familles de sens se disputent une même
 * ligne. L'état de paiement garde la couleur pleine — ambre, vert, rouge. Les
 * cabinets portent chacun la leur, choisie dans une palette vérifiée. Restent
 * le régime et le statut de séance, tous deux traités sans couleur.
 *
 * Les couleurs de cabinet venant de la base, elles passent par des styles en
 * ligne et non par des classes : une classe Tailwind ne peut pas être générée
 * pour une valeur qui n'existe qu'à l'exécution.
 */

export function Tag({
  children,
  tone = "neutre",
  titre,
}: {
  children: React.ReactNode;
  tone?: "neutre" | "contour";
  titre?: string;
}) {
  const styles = {
    neutre: "bg-sunken text-ink-muted",
    contour: "border border-line-strong text-ink-muted",
  }[tone];
  return (
    <span
      title={titre}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${styles}`}
    >
      {children}
    </span>
  );
}

export function RegimeTag({ scheme }: { scheme: CareScheme }) {
  return <Tag tone={scheme === "PRIVE" ? "neutre" : "contour"}>{SCHEME_LABEL[scheme]}</Tag>;
}

export function CabinetTag({ cabinet }: { cabinet: CabinetVue }) {
  return (
    <span
      title={adresseCabinet(cabinet)}
      style={{ "--cab": cabinet.colorHex, "--cab-fill": cabinet.fillHex } as React.CSSProperties}
      className="teinte-cabinet inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap"
    >
      <span aria-hidden="true" className="filet-cabinet h-1.5 w-1.5 rounded-full" />
      {cabinet.nom}
    </span>
  );
}

export function StatutSeance({ status }: { status: SessionStatus }) {
  const emphase = status === "NO_SHOW" ? "font-semibold text-ink" : "text-ink-muted";
  return <span className={`text-xs whitespace-nowrap ${emphase}`}>{STATUS_LABEL[status]}</span>;
}

export function EtatPaiement({
  status,
  payment,
  methode,
}: {
  status: SessionStatus;
  payment: PaymentStatus;
  methode?: PaymentMethod | null;
}) {
  if (!isBillable(status)) return <span className="text-ink-muted">—</span>;

  const styles: Record<PaymentStatus, string> = {
    DUE: "bg-due-soft text-due",
    PAID: "bg-paid-soft text-paid",
    OVERDUE: "bg-overdue-soft text-overdue",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${styles[payment]}`}
    >
      {PAYMENT_LABEL[payment]}
      {payment === "PAID" && methode ? ` · ${METHOD_LABEL[methode]}` : ""}
    </span>
  );
}

export function AlerteTrajet() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-overdue/40 bg-overdue-soft px-2.5 py-0.5 text-[11px] font-semibold text-overdue">
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
        <path
          d="M6 1 11.2 10.5H0.8L6 1Z M6 4.6v2.6 M6 8.6v.5"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      trajet trop court
    </span>
  );
}
