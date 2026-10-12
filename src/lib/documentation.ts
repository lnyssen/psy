/**
 * Contenu de la documentation de l'outil, en données : une page par grande
 * partie, des sections, des blocs. Le rendu est dans components/DocBloc.tsx.
 *
 * Dans les textes, **gras** désigne un libellé tel qu'il apparaît à l'écran
 * (un bouton, un champ, un onglet) : on lit ainsi la documentation avec
 * l'outil sous les yeux. Les captures (public/documentation/) viennent d'une
 * base fictive — voir scripts/capturer-documentation.ts ; aucune ne montre une
 * personne réelle.
 */
export type Bloc =
  | { t: "p"; texte: string }
  | { t: "etapes"; items: string[] }
  | { t: "liste"; items: string[] }
  | { t: "note"; texte: string }
  | { t: "attention"; texte: string }
  | { t: "image"; src: string; alt: string; legende?: string };

export type SectionDoc = { id: string; titre: string; blocs: Bloc[] };
export type PageDoc = {
  slug: string;
  titre: string;
  resume: string;
  sections: SectionDoc[];
};

const img = (nom: string, alt: string, legende?: string): Bloc => ({
  t: "image",
  src: `/documentation/${nom}.webp`,
  alt,
  legende,
});

export const PAGES_DOC: PageDoc[] = [
  // ---------------------------------------------------------------------------
  {
    slug: "prise-en-main",
    titre: "Prise en main",
    resume: "Se connecter, se repérer, installer l'outil sur le téléphone.",
    sections: [
      {
        id: "connexion",
        titre: "Se connecter",
        blocs: [
          {
            t: "p",
            texte:
              "L'outil s'ouvre sur un écran de connexion. Il n'affiche rien d'autre que le nom : aucun patient, aucun rendez-vous, tant que vous n'êtes pas entrée.",
          },
          img(
            "connexion",
            "L'écran de connexion de l'outil",
            "L'écran de connexion. Le bouton Face ID n'apparaît que sur un appareil qui sait l'utiliser.",
          ),
          {
            t: "etapes",
            items: [
              "Saisissez votre mot de passe, puis cliquez sur **Ouvrir**.",
              "Sur un iPhone, un Mac ou un téléphone enregistré, vous pouvez à la place toucher **Ouvrir avec Face ID ou Touch ID** : l'outil s'ouvre d'un geste, sans mot de passe.",
              "Mot de passe oublié ? Cliquez sur **Mot de passe oublié ?** : un lien valable 30 minutes est envoyé à votre adresse de récupération.",
            ],
          },
          {
            t: "note",
            texte:
              "Face ID s'enregistre une fois par appareil, dans **Réglages › Sécurité de l'accès**. Voir la page « Réglages ».",
          },
        ],
      },
      {
        id: "verrouiller",
        titre: "Verrouiller l'écran",
        blocs: [
          {
            t: "p",
            texte:
              "Avant de quitter votre bureau ou de laisser votre téléphone, cliquez sur le **cadenas**, en bas de la barre de gauche (ou ⌘ ⇧ L). La session est alors fermée pour de bon : il faudra le mot de passe ou Face ID pour reprendre.",
          },
          {
            t: "p",
            texte:
              "Sans aucun geste pendant 30 minutes, l'outil se verrouille de lui-même (un message prévient une minute avant ; **Rester connecté** le repousse). Il faut alors le mot de passe ou Face ID pour reprendre.",
          },
        ],
      },
      {
        id: "navigation",
        titre: "Se repérer",
        blocs: [
          img(
            "aujourdhui",
            "La page Aujourd'hui, avec la barre de navigation à gauche",
            "La barre de gauche donne accès à toutes les parties de l'outil.",
          ),
          {
            t: "liste",
            items: [
              "**Aujourd'hui** : ce qui vous attend aujourd'hui, et les séances passées à trancher. Un compteur ambre sur cette entrée indique combien de séances passées n'ont pas encore de statut, d'où que vous soyez dans l'outil : sans statut, une séance ne se facture pas. Sur la journée, la **prochaine séance** (ou celle **en cours**) est entourée et porte une pastille, par exemple « prochaine · dans 25 min » ; une séance à venir n'affiche ni statut ni paiement tant qu'il n'y a rien à en dire.",
              "**Agenda** : la semaine, les séances, la création de rendez-vous.",
              "**Patients** : les dossiers.",
              "**Facturation** : ce qui est dû, encaissé, et la facturation aux établissements.",
              "**Dépenses** : les achats et leurs reçus.",
              "**Finance** : les chiffres de l'année, les statistiques, le suivi de la première ligne.",
              "**Demandes** : les demandes de rendez-vous arrivées du site, et la liste d'attente. Un badge rouge indique combien sont à traiter.",
            ],
          },
          {
            t: "p",
            texte:
              "Tout en bas du menu, sous un trait, **Réglages** et **Documentation** (cette page) ; juste en dessous, le **thème** clair ou sombre (la lune) et le **cadenas**. La flèche en haut replie la barre pour gagner de la place. La page où vous êtes est sur fond violet pâle. Sur la page **Documentation**, le bouton **Version imprimable (PDF)** réunit tout ce guide sur une seule page, avec couverture et table des matières : **Imprimer** ouvre la boîte d'impression, qui permet aussi d'**Enregistrer en PDF**.",
          },
          {
            t: "p",
            texte:
              "**Les couleurs** : le violet plein est réservé aux actions principales (**Nouvelle séance**, **Enregistrer**) ; l'**ambre** signale ce qui est dû ou à trancher, le **rouge** ce qui est en retard, le **vert** ce qui est payé ou reçu. Une couleur d'alerte ne s'affiche que s'il y a quelque chose à signaler : un « En retard » à 0,00 € reste gris. Chaque cabinet garde sa couleur (Uccle, Auderghem, École) partout dans l'outil.",
          },
          {
            t: "p",
            texte:
              "**Au clavier** : le premier appui sur Tab propose **Aller au contenu**, qui évite de parcourir tout le menu ; Entrée place alors le curseur sur la page. L'élément sélectionné est toujours entouré d'un contour violet. Les tableaux qui dépassent de l'écran défilent au clavier une fois sélectionnés (flèches), et les messages de confirmation sont annoncés par les lecteurs d'écran.",
          },
          {
            t: "p",
            texte:
              "Le champ **Rechercher…** en haut de la barre retrouve un patient, une note ou un lieu en tapant quelques lettres.",
          },
        ],
      },
      {
        id: "telephone",
        titre: "Sur le téléphone",
        blocs: [
          img(
            "mobile-aujourdhui",
            "La page Aujourd'hui sur un téléphone",
            "Sur téléphone, la barre devient un menu en haut de l'écran.",
          ),
          {
            t: "p",
            texte:
              "L'outil est conçu pour s'utiliser aussi bien sur téléphone que sur ordinateur : sur un écran tactile, les petits boutons (honorée, absente, espèces, annuler…) sont agrandis pour le pouce. Pour qu'il s'ouvre comme une application, avec son icône :",
          },
          {
            t: "liste",
            items: [
              "**iPhone, iPad** : dans Safari, ouvrez l'outil, touchez **Partager**, puis **Sur l'écran d'accueil**.",
              "**Android** : dans Chrome, menu ⋮, puis **Installer l'application**.",
              "**Mac** : dans Safari, **Fichier**, puis **Ajouter au Dock**.",
            ],
          },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------
  {
    slug: "agenda",
    titre: "Agenda et séances",
    resume: "La semaine, créer et suivre les séances, Google Agenda.",
    sections: [
      {
        id: "semaine",
        titre: "Lire l'agenda",
        blocs: [
          img(
            "agenda",
            "L'agenda de la semaine",
            "Une colonne par jour, une couleur par lieu.",
          ),
          {
            t: "p",
            texte:
              "**Imprimer**, à côté de « Cette semaine », ouvre une feuille de route simple de la semaine : pour chaque jour, l'heure, le nom, le lieu et la visio. **Imprimer la journée**, sur Aujourd'hui, fait de même pour un seul jour. La feuille ne montre ni téléphone, ni note, ni montant ; le bouton **Imprimer** de cette page ouvre la boîte d'impression, qui permet aussi d'enregistrer en PDF.",
          },
          {
            t: "p",
            texte:
              "L'agenda montre la semaine du lundi au vendredi. Les flèches en haut passent à la semaine précédente ou suivante, et **Cette semaine** revient à aujourd'hui. Chaque lieu a sa couleur ; les boutons **tout / Uccle / Auderghem / École** filtrent l'affichage.",
          },
          {
            t: "p",
            texte:
              "Sous le nom du jour, le total d'heures de la journée. En haut, deux compteurs donnent le nombre de séances et d'heures de la semaine, et **Compter sur une autre période** calcule les mêmes chiffres entre deux dates.",
          },
          {
            t: "note",
            texte:
              "Un petit triangle d'avertissement sur une séance signale un **trajet trop court** : deux séances dans deux cabinets différents sans assez de temps pour se déplacer. Le temps de trajet se règle dans **Réglages › Rythme des séances**.",
          },
          {
            t: "p",
            texte:
              "Une ligne « École : 0 min / 24 h cette semaine » suit les heures facturées à l'école, plafonnées à 24 heures par semaine.",
          },
        ],
      },
      {
        id: "creer",
        titre: "Créer une séance",
        blocs: [
          img(
            "agenda-nouvelle-seance",
            "Le formulaire de création d'une séance",
          ),
          {
            t: "etapes",
            items: [
              "Cliquez sur **Nouvelle séance** (en haut à droite de l'agenda). Sur téléphone, c'est le bouton **+**. Vous pouvez aussi cliquer directement sur un créneau libre de la grille.",
              "Choisissez le **Patient** (tapez quelques lettres de son nom), le **Cabinet**, la **Date** et l'**Heure**.",
              "Cochez **En visio** si la séance se fait à distance : l'agenda Google l'affichera comme telle.",
              "Cliquez sur **Créer**.",
            ],
          },
          {
            t: "p",
            texte:
              "Pour une série, renseignez **Jusqu'au (optionnel)** : la séance se répète chaque semaine, au même jour et à la même heure, jusqu'à cette date.",
          },
          {
            t: "attention",
            texte:
              "Pour un patient conventionné, l'outil prévient quand le plafond INAMI sur douze mois est atteint : une séance de plus ne serait pas remboursée.",
          },
        ],
      },
      {
        id: "statuts",
        titre: "Trancher une séance passée",
        blocs: [
          {
            t: "p",
            texte:
              "Une séance passée n'est facturée que lorsque vous avez dit ce qui s'est passé. Sur **Aujourd'hui**, les séances passées sans statut apparaissent dans un encadré ambre (au-delà de trois, la liste se replie : **Voir les N séances**), avec deux boutons :",
          },
          {
            t: "liste",
            items: [
              "**honorée** : la séance a eu lieu, elle est facturable.",
              "**absente** : le patient ne s'est pas présenté sans prévenir, la séance est due.",
              "**toutes honorées** : pour valider d'un coup toutes les séances d'un groupe.",
            ],
          },
          {
            t: "p",
            texte:
              "Pour une séance à venir qui est annulée à temps, cliquez sur **annuler** à côté de la séance : elle passe en « annulée à temps », ne se facture pas et ne compte pas dans le plafond INAMI, mais reste visible dans l'historique.",
          },
          {
            t: "note",
            texte:
              "Pour une absence que vous choisissez de ne pas facturer, utilisez **annuler l'absence** dans Facturation : la trace de l'absence reste pour vos statistiques, mais elle n'est plus due.",
          },
        ],
      },
      {
        id: "google",
        titre: "Google Agenda",
        blocs: [
          img(
            "google",
            "La page Google Agenda",
            "Tant que Google Agenda n'est pas connecté, la page propose de le faire dans les réglages.",
          ),
          {
            t: "p",
            texte:
              "L'outil peut se synchroniser avec votre Google Agenda, dans les deux sens :",
          },
          {
            t: "liste",
            items: [
              "Une séance créée dans l'outil apparaît dans Google Agenda, avec le **nom du patient** comme titre.",
              "Un événement créé dans Google Agenda apparaît dans l'outil comme une séance **à rattacher** : vous dites alors s'il s'agit d'un patient, d'un créneau occupé, ou de l'ignorer.",
              "Un rendez-vous déplacé ou supprimé d'un côté est déplacé ou supprimé de l'autre.",
            ],
          },
          {
            t: "p",
            texte:
              "La page **Google Agenda** (accessible depuis l'agenda quand il y a des événements à trier) liste ce qu'il reste à rattacher. La connexion elle-même se fait dans **Réglages › Google Agenda**.",
          },
        ],
      },
      {
        id: "telephone",
        titre: "Sur téléphone",
        blocs: [
          img(
            "mobile-agenda",
            "L'agenda sur un téléphone",
            "La même semaine, jour par jour.",
          ),
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------
  {
    slug: "patients",
    titre: "Patients",
    resume: "Dossiers, import Excel, doublons, documents et droits RGPD.",
    sections: [
      {
        id: "liste",
        titre: "La liste des patients",
        blocs: [
          img("patients", "La liste des patients"),
          {
            t: "p",
            texte:
              "La liste affiche le cabinet, le régime (privé ou conventionné), le téléphone, le nombre de séances et ce qui est dû. Les filtres **Cabinet** et **Régime** restreignent la liste, et un clic sur un titre de colonne la trie. Un clic sur un nom ouvre le dossier.",
          },
          {
            t: "p",
            texte:
              "Deux boutons en haut : **Nouveau patient** et **Importer (Excel)**. Quand l'outil repère des fiches qui se ressemblent, un troisième bouton, **N doublons possibles**, apparaît.",
          },
        ],
      },
      {
        id: "creer",
        titre: "Créer un patient",
        blocs: [
          img("patient-nouveau", "Le formulaire de nouveau patient"),
          {
            t: "p",
            texte:
              "Seuls le prénom et le nom sont obligatoires. Le formulaire est découpé en cinq blocs :",
          },
          {
            t: "liste",
            items: [
              "**Identité** : prénom, nom, date de naissance, numéro national (sa clé est vérifiée : un numéro faux est refusé).",
              "**Prise en charge** : le **régime** décide qui paie. **Privé** : le patient paie le tarif choisi. **Conventionné** : psychologie de première ligne, le patient ne paie rien et c'est l'INAMI qui verse le montant à Amandine. Le **tarif** se choisit dans la grille des Réglages. Le **cabinet habituel** est proposé par défaut à la création d'une séance.",
              "**Contact du patient** : téléphone, e-mail, et la case **Rappel de rendez-vous par e-mail, la veille** (cochée par défaut).",
              "**Parents** : téléphones et e-mails de la mère et du père, pour un enfant ou un adolescent. Les rappels partent aux parents quand le patient n'a pas d'adresse.",
              "**Adresse** : rue, code postal, commune (elle figure sur les reçus).",
            ],
          },
        ],
      },
      {
        id: "fiche",
        titre: "Le dossier d'un patient",
        blocs: [
          img(
            "patient-fiche",
            "La fiche d'un patient conventionné",
            "Un patient conventionné : le tarif affiché est celui que verse l'INAMI, le patient paie 0 €.",
          ),
          {
            t: "p",
            texte:
              "En haut : le nom, le régime, le cabinet, puis une rangée de compteurs : nombre de séances, heures, ce qui a été encaissé ou reçu de l'INAMI, ce qui reste dû ou à recevoir. Pour un patient conventionné, **INAMI, 12 mois** montre où il en est de son plafond (par exemple 4 / 10). Dessous, deux colonnes sur ordinateur (tout s'empile sur téléphone) : à gauche les **coordonnées**, à droite les boutons **Nouvelle séance** (pour ce patient) et **Modifier la fiche** (dont le **lien personnel de réservation**, en bas du formulaire), l'**historique des séances**, les notes, les documents et, tout en bas, les données personnelles. Sous les coordonnées, **Copier les coordonnées** met nom, téléphones, e-mails et adresse dans le presse-papiers (pour les coller dans un message ou un événement d'agenda), et **Appeler** et **WhatsApp** apparaissent pour chaque numéro connu (patient, mère, père). Deux absences non excusées ou plus sur les douze derniers mois sont signalées par un bandeau sur la fiche et par une pastille **2 absences** dans la liste des patients.",
          },
          img(
            "patient-modifier",
            "Le formulaire de modification d'un dossier",
            "**Modifier la fiche** ouvre le même formulaire que la création.",
          ),
          {
            t: "p",
            texte:
              "Le **lien personnel de réservation** (en bas de **Modifier la fiche**) est celui que reçoit le patient pour réserver lui-même un créneau sans passer par une demande : ne le diffusez pas ailleurs.",
          },
        ],
      },
      {
        id: "documents",
        titre: "Joindre des documents",
        blocs: [
          img("patient-documents", "La section Documents d'une fiche"),
          {
            t: "p",
            texte:
              "Convention, consentement, courrier à l'école : joignez-les au dossier avec **Choisir un fichier**, puis **Joindre**. Types acceptés : PDF, images, texte, Word, LibreOffice, 4 Mo au plus.",
          },
          {
            t: "note",
            texte:
              "Chaque document est chiffré avant d'être enregistré : une copie de la base de données ne donnerait accès à aucun contenu. Il se télécharge d'un clic sur son nom, jamais affiché dans la page. La clé de chiffrement se garde précieusement : la perdre, c'est perdre les documents.",
          },
        ],
      },
      {
        id: "import",
        titre: "Importer depuis un fichier Excel",
        blocs: [
          img("import", "La page d'import de patients"),
          {
            t: "etapes",
            items: [
              "Cliquez sur **Importer (Excel)** depuis la liste des patients.",
              "Utilisez votre fichier tel quel, ou téléchargez le **modèle Excel** : il propose des menus déroulants pour le régime, le tarif et le cabinet, et conserve le zéro initial des téléphones.",
              "Choisissez le fichier (.xlsx, 5 Mo au plus), puis **Vérifier le fichier**. Rien n'est encore créé.",
              "Contrôlez la correspondance des colonnes (corrigez-la dans les menus si besoin) et le résultat ligne par ligne : « Prêt », un avertissement, ou une erreur.",
              "Cliquez sur **Importer N patients**.",
            ],
          },
          {
            t: "liste",
            items: [
              "Seuls le prénom et le nom sont obligatoires. Une donnée douteuse (e-mail invalide, numéro national faux, date illisible) est écartée avec un avertissement : la ligne s'importe quand même.",
              "Un patient déjà présent (même prénom et même nom) est ignoré, jamais écrasé : vous pouvez réimporter sans risque.",
              "Le fichier n'est pas conservé après la lecture.",
            ],
          },
        ],
      },
      {
        id: "doublons",
        titre: "Doublons",
        blocs: [
          img("doublons", "La page des doublons possibles"),
          {
            t: "p",
            texte:
              "L'outil regroupe les fiches qui ressemblent à une même personne : même nom, même numéro national, ou même téléphone. Pour chaque groupe, cliquez sur **Garder cette fiche** à côté de celle à conserver : les séances, notes et documents des autres lui sont rattachés, elle reprend ce qui lui manque (téléphone, adresse…), puis les autres fiches sont supprimées.",
          },
          {
            t: "attention",
            texte:
              "La fusion est définitive. Deux personnes différentes peuvent porter le même nom : regardez les coordonnées avant de fusionner.",
          },
        ],
      },
      {
        id: "rgpd",
        titre: "Droits du patient (RGPD)",
        blocs: [
          img("patient-rgpd", "La section Données personnelles d'une fiche"),
          {
            t: "p",
            texte:
              "En bas de chaque fiche, **Données personnelles et suppression** permet :",
          },
          {
            t: "liste",
            items: [
              "**D'exporter le dossier** : un fichier qui regroupe tout ce que l'outil sait du patient. Les notes de séance, cliniques, n'y figurent que si vous choisissez **Exporter avec les notes de séance**.",
              "**D'anonymiser le dossier** : le nom, les coordonnées, le numéro national, les notes et les documents sont effacés. Les séances et leurs montants restent, rattachés à « Dossier anonymisé », car ce sont des pièces comptables à conserver. Il faut taper ANONYMISER pour confirmer, et c'est refusé tant qu'un rendez-vous à venir existe.",
              "**De supprimer le patient** : la fiche, ses notes, ses documents et ses rendez-vous à venir disparaissent pour de bon (et de l'agenda Google). Il faut taper SUPPRIMER pour confirmer. C'est prévu pour une fiche créée par erreur, un doublon ou une personne jamais venue : dès que le patient a une séance passée ou facturée, la suppression est refusée, car ce sont des pièces comptables à conserver sept ans. Il reste alors l'anonymisation.",
            ],
          },
          { t: "attention", texte: "L'anonymisation et la suppression sont irréversibles." },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------
  {
    slug: "rendez-vous-en-ligne",
    titre: "Rendez-vous en ligne",
    resume:
      "Ce que voit le visiteur, les demandes, les rappels et l'annulation par le patient.",
    sections: [
      {
        id: "visiteur",
        titre: "Ce que voit le visiteur",
        blocs: [
          img(
            "public-rendez-vous",
            "La page publique de prise de rendez-vous",
            "La page « Prendre rendez-vous » du site.",
          ),
          {
            t: "p",
            texte:
              "Sur le site, la page **Prendre rendez-vous** propose un cabinet, un calendrier de créneaux libres, et un formulaire. Les créneaux tiennent compte des horaires d'ouverture, des congés, des séances déjà prises, du temps de trajet et de votre Google Agenda.",
          },
          {
            t: "p",
            texte: "Deux chemins, selon que l'outil connaît déjà la personne :",
          },
          {
            t: "liste",
            items: [
              "**Un patient muni de son lien personnel** réserve directement : le créneau devient une séance, et un e-mail de confirmation lui est envoyé.",
              "**Toute autre personne** dépose une **demande** que vous confirmez ou déclinez : vous gardez la main sur qui entre dans votre agenda, surtout pour une première consultation.",
            ],
          },
        ],
      },
      {
        id: "demandes",
        titre: "Traiter les demandes",
        blocs: [
          img(
            "demandes",
            "La page Demandes",
            "Les demandes en attente, puis la liste d'attente.",
          ),
          {
            t: "p",
            texte:
              "Les demandes arrivent dans **Demandes**, et vous recevez un e-mail à chaque nouvelle demande. Le badge rouge de la barre de gauche compte celles à traiter.",
          },
          {
            t: "etapes",
            items: [
              "Lisez la demande : nom, créneau souhaité, cabinet, téléphone, message éventuel.",
              "**Confirmer et créer le dossier** : le dossier patient est créé, la séance est posée dans l'agenda, et un e-mail de confirmation part si le demandeur a laissé son adresse.",
              "**Décliner** : rien n'est créé ; le demandeur reçoit un e-mail qui lui propose un autre créneau.",
            ],
          },
          {
            t: "note",
            texte:
              "Si le demandeur n'a pas laissé d'adresse e-mail, la page vous le dit : prévenez-le par téléphone, le seul champ toujours exigé.",
          },
        ],
      },
      {
        id: "annulation",
        titre: "Rappels et annulation par le patient",
        blocs: [
          img(
            "public-annulation",
            "La page d'annulation, vue par le patient",
            "La page que le patient ouvre depuis son e-mail.",
          ),
          {
            t: "p",
            texte:
              "La veille d'un rendez-vous, le patient (ou ses parents) reçoit un rappel par e-mail : le jour, l'heure et le lieu, rien de plus. Les e-mails de confirmation et de rappel contiennent un lien pour **annuler ou déplacer** le rendez-vous jusqu'à **24 heures** avant.",
          },
          {
            t: "liste",
            items: [
              "**Choisir un autre créneau** : la séance est annulée et le patient choisit un nouveau créneau avec son lien personnel.",
              "**Annuler ce rendez-vous** : la séance passe en « annulée à temps », vous êtes prévenue par e-mail, et votre Google Agenda se met à jour.",
              "À moins de 24 heures, la page invite à téléphoner : la séance reste due.",
            ],
          },
          {
            t: "p",
            texte:
              "Les rappels partent chaque matin à 5 h pour les rendez-vous du lendemain. Le message donne la date et l'heure en clair (« mardi 13 octobre à 13 h 15 »), le lieu, le lien pour annuler ou déplacer jusqu'à 24 heures avant et le numéro à appeler passé ce délai ; il précise qu'il est automatique, et une réponse arrive dans votre boîte e-mail. Les e-mails de confirmation et la page du lien suivent la même écriture. Les rappels se désactivent patient par patient, avec la case **Rappel de rendez-vous par e-mail, la veille** dans la fiche.",
          },
        ],
      },
      {
        id: "ouvrir-fermer",
        titre: "Ouvrir, fermer, liste d'attente",
        blocs: [
          img(
            "reglages-ouverture",
            "Le réglage Rendez-vous en ligne",
            "Dans Réglages › Rendez-vous en ligne.",
          ),
          {
            t: "p",
            texte: "Deux réglages, dans **Réglages › Rendez-vous en ligne** :",
          },
          {
            t: "liste",
            items: [
              "**Rendez-vous en ligne ouverts** : décochée, la page publique n'affiche plus de créneaux mais un message (modifiable) et vos moyens de contact, et aucune demande n'est acceptée. L'accueil du site le dit aussi.",
              "**J'accepte de nouveaux patients** : décochée, les personnes que l'outil ne connaît pas ne peuvent plus demander de rendez-vous ; elles laissent leurs coordonnées sur une **liste d'attente**, que vous retrouvez dans Demandes. Les patients qui ont leur lien personnel réservent comme avant. Une fois la personne rappelée, cliquez sur **Classer**.",
            ],
          },
          {
            t: "p",
            texte:
              "Cliquez sur **Enregistrer** : le changement est immédiat sur le site.",
          },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------
  {
    slug: "facturation",
    titre: "Facturation et paiements",
    resume:
      "Encaisser, reçus, séances conventionnées, relances, établissements.",
    sections: [
      {
        id: "patients",
        titre: "Les séances à encaisser",
        blocs: [
          img("facturation", "La page Facturation"),
          {
            t: "p",
            texte:
              "La page **Facturation** liste les séances facturables : honorées ou absences non excusées. Les annulations à temps et les séances à venir n'y figurent pas. En haut, une bande de six chiffres : **Encaissé**, **Dû**, **En retard**, **INAMI reçu**, **INAMI à recevoir**, et le nombre d'**Actes** (un chiffre d'alerte à zéro reste gris : l'ambre et le rouge n'apparaissent que s'il y a une somme). Les filtres (paiement, cabinet, régime) et les titres de colonnes trient et restreignent la liste.",
          },
          {
            t: "etapes",
            items: [
              "Pour un patient privé qui paie, cliquez sur **espèces** ou **carte**, derrière « encaisser : », à la fin de la ligne : la séance passe en « payé » et le mode de paiement est mémorisé.",
              "Le bouton **reçu PDF** apparaît alors : il produit le reçu à remettre au patient, avec tous les champs obligatoires. Deux boutons le suivent : **envoyer par e-mail** joint le PDF à un message envoyé au patient (ou à ses parents s'il n'a pas d'adresse ; le bouton devient **renvoyer par e-mail** et la fiche indique « déjà envoyé »), et **partager** ouvre la feuille de partage du téléphone — WhatsApp, SMS, Mail — avec le PDF (sur ordinateur, le fichier se télécharge). Dans la fiche d'un patient, ces trois boutons (et **annuler l'absence**) sont rangés derrière le menu **⋯** de la ligne.",
              "Pour une séance conventionnée, le patient ne doit rien : cliquez sur **reçu de l'INAMI** quand l'INAMI a versé le montant.",
              "Pour une absence que vous ne souhaitez pas facturer, **annuler l'absence** la rend non due, tout en gardant la trace.",
            ],
          },
          {
            t: "note",
            texte:
              "En cochant plusieurs lignes, une barre d'actions apparaît pour encaisser ou marquer comme reçues plusieurs séances d'un coup.",
          },
        ],
      },
      {
        id: "relances",
        titre: "Relancer les impayés",
        blocs: [
          {
            t: "p",
            texte:
              "Le bloc **Relances** de la page Facturation regroupe les impayés par famille. Chaque ligne indique l'ancienneté de l'impayé (en rouge au-delà de 30 jours) et propose trois façons de relancer : **préparer la relance** ouvre votre messagerie avec un e-mail déjà rédigé (séances, montants, IBAN, formule de politesse) que vous relisez avant de l'envoyer ; **envoyer** l'expédie directement depuis l'outil, après confirmation ; **WhatsApp** ouvre la conversation avec le même texte. Rien ne part jamais tout seul : une relance d'argent auprès d'une famille se fait avec tact, l'outil prépare, vous décidez.",
          },
        ],
      },
      {
        id: "etablissements",
        titre: "Facturer un établissement (l'école)",
        blocs: [
          img("etablissements", "La page Établissements"),
          {
            t: "p",
            texte:
              "L'onglet **Établissements** de la Facturation traite les lieux facturés à l'heure, comme l'école. Les prestations de psychologue étant exonérées de TVA, les factures sont émises hors TVA.",
          },
          {
            t: "etapes",
            items: [
              "Le bloc **À facturer** montre, par mois, les heures et le montant des séances pas encore facturées.",
              "Cliquez sur **Émettre la facture** : elle est numérotée, et vous obtenez le PDF.",
              "Pour un supplément ou une régularisation, utilisez **Nouvelle facture manuelle** : choisissez l'établissement, le mois, saisissez les heures et le tarif horaire (ou un libellé et un montant), puis **Émettre**.",
              "Retrouvez toutes les factures dans **Historique des factures**.",
            ],
          },
          {
            t: "attention",
            texte:
              "Une facture émise est numérotée et ne change plus. Si une facture a été annulée par erreur, elle peut être rétablie depuis l'historique.",
          },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------
  {
    slug: "finance",
    titre: "Dépenses, finance et première ligne",
    resume:
      "Dépenses et reçus, chiffres de l'année, statistiques, suivi trimestriel INAMI.",
    sections: [
      {
        id: "depenses",
        titre: "Les dépenses",
        blocs: [
          img("depenses", "La page Dépenses"),
          {
            t: "etapes",
            items: [
              "Dans **Nouvelle dépense**, saisissez la **Date**, le **Libellé**, le **Montant**, la **Catégorie**, le **Fournisseur** et le **Lieu concerné** (ou « Commun aux deux »).",
              "Photographiez le reçu avec **Photo du reçu** : la preuve part avec la dépense, et le mois se donne d'un bloc à la comptable.",
              "Cliquez sur **Enregistrer**. **modifier** ou **supprimer** corrigent une dépense déjà saisie.",
            ],
          },
          {
            t: "p",
            texte:
              "Chaque mois affiche son total. **Export Excel** produit le classeur du mois (recettes et dépenses) ; **Reçus en PDF** rassemble les photos des reçus : les deux font le dossier à donner à la comptable.",
          },
        ],
      },
      {
        id: "finance",
        titre: "Les chiffres de l'année",
        blocs: [
          img("finance", "La page Finance"),
          {
            t: "p",
            texte:
              "**Finance** montre l'année en cours : ce qui a été **Facturé**, **Encaissé**, ce qui **Reste dû**, le nombre d'**Actes** et la **Moyenne par mois**. Le graphique donne le facturé de chaque mois, par cabinet, et chaque mois se détaille en dessous (par lieu, encaissé, reste dû).",
          },
        ],
      },
      {
        id: "statistiques",
        titre: "Statistiques d'activité",
        blocs: [
          img("statistiques", "La page Statistiques d'activité"),
          {
            t: "p",
            texte:
              "Les **Statistiques d'activité** (bouton en haut de Finance) répondent à des questions de pilotage : combien d'heures par semaine, quel **taux d'absence**, combien d'annulations à temps, et depuis quand aucune séance n'est prévue. Le tableau détaille les heures par semaine et par cabinet.",
          },
        ],
      },
      {
        id: "ppl",
        titre: "Première ligne : le suivi trimestriel",
        blocs: [
          img("ppl", "La page Première ligne, suivi trimestriel"),
          {
            t: "p",
            texte:
              "Pour la convention de psychologie de première ligne, **Première ligne (trimestre)** (bouton en haut de Finance) donne, trimestre par trimestre :",
          },
          {
            t: "liste",
            items: [
              "le nombre de séances honorées, ce que l'**INAMI doit verser**, ce qui est **déjà reçu** et ce qui reste **à recevoir** ;",
              "pour chaque patient, la convention (soutien ou traitement, réseau enfants ou adultes) et son **plafond sur douze mois** (par exemple 2 / 10) ;",
              "les séances **hors plafond**, qui ne seront pas remboursées.",
            ],
          },
          {
            t: "p",
            texte:
              "Les flèches en haut changent de trimestre. **Exporter le trimestre (CSV)** produit un fichier qui s'ouvre dans Excel : une ligne par séance (patient, numéro national, date, lieu, durée, montant, reçu ou non, hors plafond ou non), utile pour la déclaration. Les séances à recevoir se marquent « reçues » dans la Facturation.",
          },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------
  {
    slug: "reglages",
    titre: "Réglages",
    resume: "Rythme, horaires, tarifs, identité, sécurité, sauvegardes, lieux.",
    sections: [
      {
        id: "vue",
        titre: "Vue d'ensemble",
        blocs: [
          img(
            "reglages",
            "La page Réglages",
            "Un sommaire à gauche, quatre groupes : Rendez-vous, Finance, Sécurité, Lieux et connexions.",
          ),
          {
            t: "p",
            texte:
              "Les réglages se règlent une fois et changent rarement. Chaque bloc s'enregistre séparément, avec son propre bouton : modifier le rythme des séances ne touche ni vos tarifs ni votre identité.",
          },
        ],
      },
      {
        id: "ouverture",
        titre: "Rendez-vous en ligne",
        blocs: [
          img("reglages-ouverture", "Le bloc Rendez-vous en ligne"),
          {
            t: "p",
            texte:
              "Ouvre ou ferme la prise de rendez-vous sur le site, et accepte ou non de nouveaux patients. Voir la page « Rendez-vous en ligne ».",
          },
        ],
      },
      {
        id: "rythme",
        titre: "Rythme des séances",
        blocs: [
          img("reglages-rythme", "Le bloc Rythme des séances"),
          {
            t: "liste",
            items: [
              "**Durée d'une séance** et **Heures proposées toutes les** : la grille de créneaux (toutes les 15 minutes, toutes les 30…).",
              "**Pause entre deux séances** : le temps qu'il vous faut entre deux patients dans le même lieu.",
              "**Trajet entre deux lieux** : sert aussi à signaler dans l'agenda deux séances impossibles à enchaîner.",
              "**Réservation ouverte sur** : jusqu'à combien de semaines à l'avance on peut demander un rendez-vous.",
              "**Coller les créneaux aux séances existantes** : propose aussi un créneau juste après une séance déjà prise, même s'il ne tombe pas sur une heure ronde.",
            ],
          },
        ],
      },
      {
        id: "horaires",
        titre: "Horaires d'ouverture et congés",
        blocs: [
          img("reglages-horaires", "Le bloc Horaires d'ouverture"),
          {
            t: "p",
            texte:
              "Pour chaque cabinet, indiquez les jours et les heures où vous recevez. Seuls ces créneaux sont proposés au public. Les **congés** (vacances, absences) se soustraient aux créneaux et aux heures comptées : saisissez les dates et un motif facultatif.",
          },
        ],
      },
      {
        id: "tarifs",
        titre: "Tarifs",
        blocs: [
          img("reglages-tarifs", "Le bloc Tarifs"),
          {
            t: "p",
            texte:
              "Deux régimes, deux sens du même chiffre. **Privé** : ce que paie le patient, avec plusieurs tarifs possibles (celui marqué **Par défaut** est proposé à la création d'une fiche). **Conventionné** : ce que reçoit Amandine de l'INAMI ; le patient ne paie rien. Un tarif utilisé dans une fiche se **désactive** au lieu de se supprimer, pour ne pas laisser ces patients sans montant.",
          },
        ],
      },
      {
        id: "identite",
        titre: "Identité et facturation",
        blocs: [
          img("reglages-identite", "Le bloc Identité et facturation"),
          {
            t: "p",
            texte:
              "Les numéros professionnels (entreprise, INAMI, visa, Commission des psychologues), l'adresse du siège, l'IBAN et le délai de paiement. Ils figurent dans les mentions légales du site, sur le reçu remis au patient et sur les factures aux établissements.",
          },
        ],
      },
      {
        id: "securite",
        titre: "Sécurité de l'accès",
        blocs: [
          img("reglages-securite", "Le bloc Sécurité de l'accès"),
          {
            t: "liste",
            items: [
              "**Mot de passe** : saisissez l'actuel, puis le nouveau deux fois (12 caractères au moins). Les sessions déjà ouvertes restent ouvertes jusqu'à leur fin.",
              "**Adresse de récupération** : l'adresse qui reçoit le lien de réinitialisation en cas de mot de passe oublié. Choisissez une boîte que vous seule consultez.",
              "**Face ID, Touch ID et empreinte** : sur l'appareil que vous utilisez, cliquez sur **Enregistrer cet appareil** et validez avec votre visage ou votre empreinte. Vous pouvez enregistrer plusieurs appareils et en **Retirer** un à tout moment (téléphone perdu, par exemple).",
            ],
          },
          {
            t: "attention",
            texte:
              "Avant de changer le mot de passe, vérifiez que l'adresse de récupération est enregistrée et que le courriel de réinitialisation arrive bien : c'est ce qui vous protège si vous l'oubliez.",
          },
        ],
      },
      {
        id: "sauvegardes",
        titre: "Sauvegardes",
        blocs: [
          img("reglages-sauvegardes", "Le bloc Sauvegardes"),
          {
            t: "p",
            texte:
              "Chaque nuit, la base de données est sauvegardée et chiffrée sur le serveur, avec trente jours d'historique. Ce bloc affiche la date de la dernière sauvegarde. Si elle date de plus de 36 heures, un bandeau rouge s'affiche en haut de l'outil : faites vérifier le serveur.",
          },
          {
            t: "note",
            texte:
              "Une copie des sauvegardes se récupère aussi sur un autre ordinateur, avec un script dédié : un serveur qui tomberait emporterait sinon les sauvegardes qui y sont rangées. La personne qui administre le site s'en charge.",
          },
        ],
      },
      {
        id: "lieux",
        titre: "Lieux",
        blocs: [
          img("reglages-lieux", "Le bloc Lieux"),
          {
            t: "p",
            texte:
              "Cabinets et établissements : nom, adresse, couleur (choisie dans une palette vérifiée), **Accès** (une ligne par moyen de transport, affichée sur le site), et pour un établissement facturé à l'heure, le tarif horaire et le **Plafond hebdomadaire**. Deux cases décident si le lieu est proposé à la création d'une séance et s'il est **visible sur le site public**.",
          },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------
  {
    slug: "aide",
    titre: "Questions et dépannage",
    resume: "Quand quelque chose ne marche pas comme prévu.",
    sections: [
      {
        id: "acces",
        titre: "Accès",
        blocs: [
          {
            t: "p",
            texte:
              "**J'ai oublié mon mot de passe.** Sur l'écran de connexion, cliquez sur **Mot de passe oublié ?** puis **Envoyer le lien** : un courriel arrive à l'adresse de récupération (vérifiez les indésirables). Le lien ne sert qu'une fois et expire en 30 minutes. Si rien n'arrive, contactez la personne qui administre le site.",
          },
          {
            t: "p",
            texte:
              "**Face ID ne marche pas.** Vérifiez que vous êtes sur l'appareil et le navigateur où il a été enregistré (Réglages › Sécurité de l'accès liste les appareils). Sinon, le mot de passe reste valable en secours. Un appareil se réenregistre à tout moment.",
          },
          {
            t: "p",
            texte:
              "**J'ai perdu mon téléphone.** Depuis un autre appareil, ouvrez **Réglages › Sécurité de l'accès** et **retirez** le téléphone de la liste : il ne pourra plus ouvrir l'outil. Changez ensuite le mot de passe par précaution.",
          },
        ],
      },
      {
        id: "agenda",
        titre: "Agenda et séances",
        blocs: [
          {
            t: "p",
            texte:
              "**Une séance passée n'apparaît pas dans la facturation.** Elle n'a probablement pas de statut : sur **Aujourd'hui**, tranchez-la avec **honorée** ou **absente**.",
          },
          {
            t: "p",
            texte:
              "**Un événement de Google Agenda n'est pas dans l'outil.** Il apparaît d'abord comme « à rattacher » dans la page Google Agenda : dites s'il s'agit d'un patient, d'un créneau occupé ou à ignorer.",
          },
          {
            t: "p",
            texte:
              "**Un créneau n'est pas proposé sur le site.** Vérifiez les **horaires d'ouverture**, les **congés**, le **temps de trajet** entre deux cabinets, et la limite **Réservation ouverte sur** dans les Réglages. Un événement Google Agenda bloque aussi le créneau.",
          },
        ],
      },
      {
        id: "mails",
        titre: "E-mails",
        blocs: [
          {
            t: "p",
            texte:
              "**Les rappels et confirmations ne partent pas.** L'envoi d'e-mails dépend de la messagerie du site, configurée sur le serveur. Les rappels partent chaque matin à 5 h pour le lendemain, et seulement aux patients qui ont une adresse (ou dont les parents en ont une) et dont la case de rappel est cochée.",
          },
          {
            t: "p",
            texte:
              "**Un patient dit ne pas avoir reçu le lien d'annulation.** Regardez son dossier : l'adresse est-elle correcte, la case de rappel cochée ? Le courriel a pu arriver dans les indésirables.",
          },
        ],
      },
      {
        id: "donnees",
        titre: "Données et sauvegardes",
        blocs: [
          {
            t: "p",
            texte:
              "**Le bandeau « Aucune sauvegarde récente » s'affiche.** La sauvegarde nocturne n'a pas réussi depuis plus de 36 heures. L'outil continue de fonctionner, mais prévenez la personne qui administre le serveur.",
          },
          {
            t: "p",
            texte:
              "**Les notes ou documents ne s'enregistrent pas.** La clé de chiffrement n'est pas configurée sur le serveur : un message l'indique à l'endroit concerné.",
          },
          {
            t: "attention",
            texte:
              "Ne jamais transmettre un mot de passe ou une clé par e-mail ou par message. Pour toute question sur la sécurité, passez par un échange en personne ou par téléphone.",
          },
        ],
      },
    ],
  },
];

export function pageDoc(slug: string) {
  return PAGES_DOC.find((p) => p.slug === slug);
}
