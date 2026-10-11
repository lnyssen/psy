/**
 * Contenu du site public.
 *
 * Rassemblé ici plutôt que dispersé dans les pages : ce sont les seules
 * informations qu'Amandine relira et corrigera, et elles doivent se trouver
 * en un seul endroit.
 */
export const SITE = {
  nom: "Amandine Monsel",
  titre: "Psychologue clinicienne & psychothérapeute",
  publics: ["Enfants", "Adolescents", "Jeunes adultes"],
  accroche:
    "Un accompagnement attentif, fort de plus de vingt ans d’expérience. Orientations analytique et systémique.",
  langues: "Consultations en français et en anglais.",
  /** Fiche publique sur l'annuaire des psychologues bruxellois. */
  psybru: "https://psybru.be/fr/psychologue/amandine-monsel",
  telephone: "+32 485 83 11 19",
  telephoneLien: "+32485831119",
  email: "psychologue@amandinemonsel.be",
  /** Numéros d'urgence, affichés dans le pied de page de chaque page du site. */
  numerosUtiles: [
    { nom: "S.O.S Suicide", affichage: "0800 32 123", lien: "080032123" },
    { nom: "Urgences", affichage: "112", lien: "112" },
  ],
  parcours: [
    "Je suis psychologue clinicienne, diplômée de l’ULB, et psychothérapeute formée à l’IFISAM. Depuis plus de vingt ans, je travaille et continue de me former pour offrir un accompagnement fondé sur les orientations analytique et systémique.",
    "Parallèlement à ma pratique privée, j’exerce depuis une dizaine d’années comme psychologue en milieu scolaire. Cette expérience m’a permis d’intervenir à tous les niveaux d’enseignement et auprès de publics issus de différents milieux socio-économiques.",
  ],
  /** Formation et fonctions, dans l'ordre des dates, telles qu'elles figurent
   *  sur sa fiche publique. */
  chronologie: [
    { periode: "2001–2006", intitule: "Master en psychologie clinique de l’enfant et de l’adolescent, ULB" },
    { periode: "2009–2019", intitule: "Psychologue en centre PMS" },
    { periode: "2010–2013", intitule: "3ᵉ cycle en psychothérapie de l’enfant et de l’adolescent, IFISAM" },
    { periode: "2014", intitule: "Psychologue de liaison, Hôpital d’Ixelles" },
    { periode: "2019–2020", intitule: "Psychologue, Bru-Stars" },
    { periode: "Depuis 2020", intitule: "Psychologue scolaire, De l’Autre Côté de l’École" },
  ],
  /** Les trois publics reçus. */
  publicsDetail: [
    {
      nom: "Enfants",
      repere: "Dès 4 ans",
      texte: "Avec leurs parents, pour les difficultés de comportement, de développement ou scolaires.",
    },
    {
      nom: "Adolescents",
      repere: "Et leurs parents",
      texte: "Un espace à soi pour les questions adolescentes et identitaires, le harcèlement, l’anxiété.",
    },
    {
      nom: "Jeunes adultes",
      repere: "En français ou en anglais",
      texte: "Pour les questions existentielles, les problèmes relationnels, les périodes de déprime.",
    },
  ],
  pourQui:
    "Je reçois les enfants dès quatre ans, les adolescents et leurs parents, ainsi que les jeunes adultes.",
  problematiques: [
    "Difficultés de comportement, de développement et scolaires",
    "Anxiété et déprime",
    "Troubles alimentaires",
    "Harcèlement",
    "Séparations difficiles",
    "Problèmes relationnels au sein de la famille",
    "Problématiques adolescentes et identitaires",
    "Questions existentielles",
  ],
};
