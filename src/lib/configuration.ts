import { ibanValide } from "@/lib/epc-qr";
import type { Parametres } from "@/lib/parametres";
import type { StatutRestauration, StatutSauvegarde } from "@/lib/sauvegardes";

/**
 * Ce qu'il reste à régler pour que l'outil rende tous ses services.
 *
 * Chaque oubli a une conséquence concrète et silencieuse : sans IBAN, un reçu
 * ou une relance part sans QR de paiement ; sans adresse de récupération, un
 * mot de passe oublié ne se récupère pas. On les liste sur « Aujourd'hui », avec
 * le lien vers l'endroit où les régler, tant qu'il en reste — et plus rien
 * quand tout est en ordre.
 *
 * `urgent` : le risque est une perte (données, accès), pas un manque de confort.
 */
export type PointAcompleter = {
  id: string;
  titre: string;
  detail: string;
  href: string;
  urgent: boolean;
};

export type EtatConfiguration = {
  reglages: Pick<
    Parametres,
    "iban" | "numeroEntreprise" | "numeroInami" | "numeroVisa" | "adresseSiege" | "rdvEnLigne"
  >;
  courrielConfigure: boolean;
  cleNotesPresente: boolean;
  adresseRecuperation: string | null;
  nbTarifsActifs: number;
  nbCabinetsActifs: number;
  nbDisponibilites: number;
  sauvegarde: StatutSauvegarde;
  restauration: StatutRestauration;
};

const vide = (v: string | null | undefined) => !v || !v.trim();

export function pointsAcompleter(e: EtatConfiguration): PointAcompleter[] {
  const p: PointAcompleter[] = [];

  if (!e.cleNotesPresente)
    p.push({
      id: "cle-notes",
      titre: "La clé de chiffrement des notes manque",
      detail:
        "Sans elle, les notes de séance et les documents ne peuvent ni s’enregistrer ni se relire. À signaler à la personne qui gère le serveur.",
      href: "/admin/reglages#securite",
      urgent: true,
    });

  if (e.sauvegarde.etat === "ancienne")
    p.push({
      id: "sauvegarde",
      titre: "Aucune sauvegarde récente",
      detail: "La sauvegarde de la nuit ne s’est pas faite depuis plus de 36 heures. Faites vérifier le serveur.",
      href: "/admin/reglages#sauvegardes",
      urgent: true,
    });

  if (e.restauration.etat === "echec")
    p.push({
      id: "restauration",
      titre: "Le test de restauration a échoué",
      detail: "Une sauvegarde qui ne se restaure pas ne protège de rien. Faites vérifier le serveur.",
      href: "/admin/reglages#sauvegardes",
      urgent: true,
    });

  if (vide(e.adresseRecuperation))
    p.push({
      id: "recuperation",
      titre: "Pas d’adresse de récupération",
      detail: "Si vous oubliez votre mot de passe, personne ne peut vous renvoyer un lien pour en choisir un autre.",
      href: "/admin/reglages#recuperation",
      urgent: true,
    });

  if (!ibanValide(e.reglages.iban))
    p.push({
      id: "iban",
      titre: vide(e.reglages.iban) ? "IBAN non renseigné" : "L’IBAN saisi n’est pas valide",
      detail: "Reçus, relances et factures partent sans code QR de paiement tant qu’il manque.",
      href: "/admin/reglages#identite",
      urgent: false,
    });

  const numeros = [
    vide(e.reglages.numeroInami) && "n° INAMI",
    vide(e.reglages.numeroVisa) && "n° de visa",
    vide(e.reglages.numeroEntreprise) && "n° d’entreprise",
  ].filter(Boolean);
  if (numeros.length > 0)
    p.push({
      id: "numeros",
      titre: `Mentions légales incomplètes : ${numeros.join(", ")}`,
      detail: "Ces numéros figurent sur le site, les reçus (la mutuelle les demande) et les factures.",
      href: "/admin/reglages#identite",
      urgent: false,
    });

  if (vide(e.reglages.adresseSiege))
    p.push({
      id: "siege",
      titre: "Adresse du siège non renseignée",
      detail: "Elle ouvre toute facture émise à un établissement.",
      href: "/admin/reglages#identite",
      urgent: false,
    });

  if (!e.courrielConfigure)
    p.push({
      id: "courriel",
      titre: "L’envoi d’e-mails n’est pas branché",
      detail:
        "Rappels de rendez-vous, reçus, relances et liens de récupération ne partent pas. À signaler à la personne qui gère le serveur.",
      href: "/admin/reglages#securite",
      urgent: false,
    });

  if (e.nbCabinetsActifs === 0)
    p.push({
      id: "lieux",
      titre: "Aucun lieu de consultation",
      detail: "Sans lieu, impossible de planifier une séance.",
      href: "/admin/reglages#lieux",
      urgent: false,
    });

  if (e.nbTarifsActifs === 0)
    p.push({
      id: "tarifs",
      titre: "Aucun tarif",
      detail: "Les séances se créent sans montant, donc sans reçu ni facturation.",
      href: "/admin/reglages#tarifs",
      urgent: false,
    });

  if (e.reglages.rdvEnLigne && e.nbCabinetsActifs > 0 && e.nbDisponibilites === 0)
    p.push({
      id: "horaires",
      titre: "Aucun horaire d’ouverture",
      detail: "La réservation en ligne est ouverte, mais aucun créneau ne peut être proposé.",
      href: "/admin/reglages#ouverture",
      urgent: false,
    });

  // Les urgents d'abord, l'ordre d'écriture sinon.
  return [...p.filter((x) => x.urgent), ...p.filter((x) => !x.urgent)];
}
