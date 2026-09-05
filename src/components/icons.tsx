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
