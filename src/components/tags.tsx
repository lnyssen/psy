import type { CareScheme, Office, PaymentStatus, SessionStatus } from "@prisma/client";
import { OFFICE_LABEL, PAYMENT_LABEL, SCHEME_LABEL, STATUS_LABEL, isBillable } from "@/lib/format";

/**
 * Contrainte chromatique du brief : trois familles de sens coexistent dans une
 * même ligne, plus le cabinet depuis qu'il y en a deux. Une seule est portée
 * par de la couleur pleine — l'état de paiement, le plus scruté. Régime,
 * statut et cabinet passent par des traitements non chromatiques. Chaque
 * valeur est en outre écrite en toutes lettres : aucune information ne repose
 * sur la seule couleur.
 */

export function Tag({
  children,
  tone = "neutre",
}: {
  children: React.ReactNode;
  tone?: "neutre" | "contour" | "accent";
}) {
  const styles = {
    neutre: "bg-sunken text-ink-muted",
    contour: "border border-line-strong text-ink-muted",
    accent: "bg-accent-soft text-accent",
  }[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${styles}`}
    >
      {children}
    </span>
  );
}

export function RegimeTag({ scheme }: { scheme: CareScheme }) {
  // Le conventionné est cerclé, le privé posé en aplat neutre : deux formes
  // distinctes sans recourir à la couleur.
  return (
    <Tag tone={scheme === "CONVENTIONNE" ? "contour" : "neutre"}>{SCHEME_LABEL[scheme]}</Tag>
  );
}

export function CabinetTag({ office }: { office: Office }) {
  return <Tag tone="accent">{OFFICE_LABEL[office]}</Tag>;
}

export function StatutSeance({ status }: { status: SessionStatus }) {
  const emphase =
    status === "NO_SHOW" ? "font-semibold text-ink" : "text-ink-muted";
  return <span className={`text-xs ${emphase}`}>{STATUS_LABEL[status]}</span>;
}

export function EtatPaiement({
  status,
  payment,
}: {
  status: SessionStatus;
  payment: PaymentStatus;
}) {
  if (!isBillable(status)) {
    return <span className="text-ink-muted">—</span>;
  }
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
    </span>
  );
}

export function AlerteTrajet() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-overdue/40 bg-overdue-soft px-2.5 py-0.5 text-[11px] font-semibold text-overdue">
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" fill="currentColor">
        <path d="M6 0.5 11.5 10.5H0.5L6 0.5Zm0 3.2v3.6m0 1.5v.9" stroke="currentColor" strokeWidth="1.2" fill="none" />
      </svg>
      trajet trop court
    </span>
  );
}
