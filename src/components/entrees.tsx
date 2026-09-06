import {
  IconDemandes,
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
 */
export const ENTREES = [
  { href: "/admin", label: "Aujourd’hui", Icone: IconJour },
  { href: "/admin/semaine", label: "Semaine", Icone: IconSemaine },
  { href: "/admin/patients", label: "Patients", Icone: IconPatients },
  { href: "/admin/facturation", label: "Facturation", Icone: IconFacturation },
  { href: "/admin/finance", label: "Finance", Icone: IconFinance },
  { href: "/admin/demandes", label: "Demandes", Icone: IconDemandes },
];

/** « Aujourd'hui » est la racine : elle ne doit s'allumer que sur elle-même,
 *  sinon elle resterait active sur toutes les autres pages. */
export function estActif(href: string, pathname: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}
