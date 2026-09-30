/**
 * Icônes de navigation, dessinées à la main plutôt qu'importées : quatre
 * pictogrammes ne valent pas une dépendance, et ceux-ci partagent exactement
 * la même grille et la même graisse de trait.
 */
type Props = { className?: string };

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconJour({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="4" width="15" height="13.5" rx="2.5" />
      <path d="M2.5 8h15M6.5 2.5v3M13.5 2.5v3" />
      <circle cx="10" cy="12.5" r="1.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSemaine({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="4" width="15" height="13.5" rx="2.5" />
      <path d="M2.5 8h15M6.5 2.5v3M13.5 2.5v3M7.2 8v9.5M12.8 8v9.5M2.5 12.7h15" />
    </svg>
  );
}

export function IconPatients({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="7" r="3" />
      <path d="M2.5 17c0-2.9 2.5-4.6 5.5-4.6s5.5 1.7 5.5 4.6" />
      <path d="M14 4.4a3 3 0 0 1 0 5.2M15.5 12.7c1.4.6 2.3 1.8 2.3 3.4" />
    </svg>
  );
}

export function IconFacturation({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4.5 2.5h11v15l-2.2-1.4-2.15 1.4L9 16.1l-2.15 1.4L4.5 16.1z" />
      <path d="M7.5 7h5M7.5 10.5h5" />
    </svg>
  );
}

export function IconFinance({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 17h15" />
      <path d="M5 17V9.5M9.2 17V5.5M13.4 17v-4.5M17.5 17V8" />
    </svg>
  );
}

export function IconCadenas({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="8.5" width="12" height="9" rx="2.2" />
      <path d="M6.8 8.5V6.2a3.2 3.2 0 0 1 6.4 0v2.3" />
    </svg>
  );
}

/** Chevrons de navigation. Les caractères « ‹ » et « › » ne se centrent pas
 *  dans un bouton rond : leurs métriques les décalent vers le haut et la
 *  gauche, ce qu'aucun alignement CSS ne rattrape proprement. */
export function IconChevronGauche({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12.5 4.5 7 10l5.5 5.5" />
    </svg>
  );
}

export function IconChevronDroite({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M7.5 4.5 13 10l-5.5 5.5" />
    </svg>
  );
}

/** Flèches de décalage d'une séance. Dessinées plutôt que posées en caractères
 *  « ↑ » et « ↓ », dont les métriques ne se centrent pas dans un bouton rond. */
export function IconFlecheHaut({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M10 15.5V5m0 0-4.2 4.2M10 5l4.2 4.2" />
    </svg>
  );
}

export function IconFlecheBas({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M10 4.5V15m0 0 4.2-4.2M10 15l-4.2-4.2" />
    </svg>
  );
}

export function IconReglages({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="10" cy="10" r="2.7" />
      <path d="M15.9 12.3a1.3 1.3 0 0 0 .27 1.44l.05.05a1.6 1.6 0 1 1-2.26 2.26l-.05-.05a1.3 1.3 0 0 0-1.44-.27 1.3 1.3 0 0 0-.8 1.2v.14a1.6 1.6 0 1 1-3.2 0v-.07a1.3 1.3 0 0 0-.86-1.2 1.3 1.3 0 0 0-1.44.27l-.05.05a1.6 1.6 0 1 1-2.26-2.26l.05-.05a1.3 1.3 0 0 0 .27-1.44 1.3 1.3 0 0 0-1.2-.8h-.14a1.6 1.6 0 1 1 0-3.2h.07a1.3 1.3 0 0 0 1.2-.86 1.3 1.3 0 0 0-.27-1.44l-.05-.05a1.6 1.6 0 1 1 2.26-2.26l.05.05a1.3 1.3 0 0 0 1.44.27h.06a1.3 1.3 0 0 0 .8-1.2v-.14a1.6 1.6 0 1 1 3.2 0v.07a1.3 1.3 0 0 0 .8 1.2 1.3 1.3 0 0 0 1.44-.27l.05-.05a1.6 1.6 0 1 1 2.26 2.26l-.05.05a1.3 1.3 0 0 0-.27 1.44v.06a1.3 1.3 0 0 0 1.2.8h.14a1.6 1.6 0 1 1 0 3.2h-.07a1.3 1.3 0 0 0-1.2.8Z" />
    </svg>
  );
}

export function IconRecherche({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="8.8" cy="8.8" r="5.3" />
      <path d="m12.7 12.7 4 4" />
    </svg>
  );
}

export function IconSoleil({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="10" cy="10" r="3.3" />
      <path d="M10 1.8v1.9M10 16.3v1.9M18.2 10h-1.9M3.7 10H1.8M15.8 4.2l-1.35 1.35M5.55 14.45 4.2 15.8M15.8 15.8l-1.35-1.35M5.55 5.55 4.2 4.2" />
    </svg>
  );
}

export function IconLune({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M16.5 11.6A6.9 6.9 0 0 1 8.4 3.5a6.9 6.9 0 1 0 8.1 8.1Z" />
    </svg>
  );
}

export function IconDemandes({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M2.8 5.5h14.4v9.5a1.6 1.6 0 0 1-1.6 1.6H4.4a1.6 1.6 0 0 1-1.6-1.6z" />
      <path d="m2.8 6 7.2 5 7.2-5" />
    </svg>
  );
}

/** Reçu de dépense : le même ticket que la facturation, mais tourné vers ce
 *  qui entre plutôt que ce qui sort — un appareil photo plutôt qu'un cachet. */
export function IconDepenses({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4 3.5h9L16 6.5v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z" />
      <path d="M13 3.5v3h3" />
      <path d="M6 10h8M6 13h5" />
    </svg>
  );
}

/** Bâtiment à frontons — l'établissement facturé au forfait, distinct des
 *  cabinets où l'on reçoit des patients. */
export function IconEtablissement({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3 8.5 10 3l7 5.5" />
      <path d="M4.5 8.5v8.5h11V8.5" />
      <path d="M8 17v-4.5h4V17" />
    </svg>
  );
}

export function IconMenu({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3 5.5h14M3 10h14M3 14.5h14" />
    </svg>
  );
}

export function IconFermer({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

export function IconPlus({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}
