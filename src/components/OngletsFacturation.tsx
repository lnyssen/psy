import Link from "next/link";

/**
 * Les deux régimes de facturation, comme deux onglets d'une même section — pas
 * deux entrées de navigation. Le patient et l'établissement répondent à la
 * même question (qui doit quoi), avec des mécaniques différentes ; ce sont
 * deux vues d'un même sujet, pas deux sujets.
 */
export function OngletsFacturation({ actif }: { actif: "patients" | "etablissements" }) {
  const onglets = [
    { cle: "patients", label: "Patients", href: "/admin/facturation" },
    { cle: "etablissements", label: "Établissements", href: "/admin/etablissements" },
  ] as const;
  return (
    <div className="flex gap-1.5">
      {onglets.map((o) => (
        <Link
          key={o.cle}
          href={o.href}
          aria-current={actif === o.cle ? "page" : undefined}
          className={`rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
            actif === o.cle
              ? "bg-accent text-accent-contrast"
              : "border border-line-strong text-ink-muted hover:border-accent hover:text-accent-text"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
