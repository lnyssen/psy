import {
  IconAide,
  IconDemandes,
  IconDepenses,
  IconFacturation,
  IconFinance,
  IconJour,
  IconPatients,
  IconReglages,
  IconSemaine,
} from "@/components/icons";

/**
 * Les sections de l'outil, en un seul endroit.
 *
 * La barre latérale et la barre du téléphone les affichent différemment mais
 * doivent afficher les mêmes : les avoir écrites deux fois aurait garanti
 * qu'un jour l'une des deux oublie une entrée.
 *
 * Facturation couvre deux pages (/admin/facturation et /admin/etablissements,
 * qui se distinguent par des onglets internes) sous une seule entrée : le
 * patient et l'établissement sont deux régimes de la même question — qui doit
 * quoi — pas deux sections de l'outil. Une entrée par page aurait aussi
 * dépassé les six libellés pour lesquels la barre latérale a été dimensionnée.
 */
export const ENTREES = [
  { href: "/admin", label: "Aujourd’hui", Icone: IconJour },
  { href: "/admin/semaine", label: "Agenda", Icone: IconSemaine },
  { href: "/admin/patients", label: "Patients", Icone: IconPatients },
  { href: "/admin/facturation", label: "Facturation", Icone: IconFacturation },
  { href: "/admin/depenses", label: "Dépenses", Icone: IconDepenses },
  { href: "/admin/finance", label: "Finance", Icone: IconFinance },
  { href: "/admin/demandes", label: "Demandes", Icone: IconDemandes },
];

/** Réglages et documentation : en bas du menu, séparés du travail quotidien. */
export const ENTREES_BAS = [
  { href: "/admin/reglages", label: "Réglages", Icone: IconReglages },
  { href: "/admin/documentation", label: "Documentation", Icone: IconAide },
];

/** « Aujourd'hui » est la racine : elle ne doit s'allumer que sur elle-même,
 *  sinon elle resterait active sur toutes les autres pages. Facturation
 *  s'allume aussi sur /admin/etablissements, son second onglet. */
export function estActif(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/facturation") return pathname.startsWith("/admin/facturation") || pathname.startsWith("/admin/etablissements");
  return pathname.startsWith(href);
}

/**
 * Compteur affiché sur une entrée du menu, s'il y en a un : les demandes de
 * rendez-vous en attente (rouge) et les séances passées à statuer sur
 * « Aujourd'hui » (ambre) — l'une comme l'autre dorment sans bruit, et une
 * séance sans statut ne se facture pas.
 */
export function compteurDe(href: string, demandes: number, aStatuer: number) {
  if (href === "/admin/demandes")
    return {
      nb: demandes,
      singulier: "demande en attente",
      pluriel: "demandes en attente",
      classe: "bg-overdue text-white",
    };
  if (href === "/admin")
    return {
      nb: aStatuer,
      singulier: "séance à statuer",
      pluriel: "séances à statuer",
      classe: "bg-due-soft text-due ring-1 ring-due/40",
    };
  return { nb: 0, singulier: "", pluriel: "", classe: "" };
}
