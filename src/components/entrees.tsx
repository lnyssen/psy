import {
  IconDemandes,
  IconDepenses,
  IconFacturation,
  IconFinance,
  IconJour,
  IconPatients,
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
  { href: "/admin/semaine", label: "Semaine", Icone: IconSemaine },
  { href: "/admin/patients", label: "Patients", Icone: IconPatients },
  { href: "/admin/facturation", label: "Facturation", Icone: IconFacturation },
  { href: "/admin/depenses", label: "Dépenses", Icone: IconDepenses },
  { href: "/admin/finance", label: "Finance", Icone: IconFinance },
  { href: "/admin/demandes", label: "Demandes", Icone: IconDemandes },
];

/** « Aujourd'hui » est la racine : elle ne doit s'allumer que sur elle-même,
 *  sinon elle resterait active sur toutes les autres pages. Facturation
 *  s'allume aussi sur /admin/etablissements, son second onglet. */
export function estActif(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/facturation") return pathname.startsWith("/admin/facturation") || pathname.startsWith("/admin/etablissements");
  return pathname.startsWith(href);
}
