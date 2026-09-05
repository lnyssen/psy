# Design Brief : outil de gestion de pratique — Amandine Monsel, psychologue

Rédigé le 5 septembre 2026, révisé le même jour (voir « Révisions »).
Praticienne unique, exercice en Belgique sous l'entité AMAPSY SRL, sur deux
cabinets : rue Victor Allard 191 à 1180 Uccle, et place Félix Govaert 4 à
1160 Auderghem.

## Problème

Amandine tient aujourd'hui son agenda, ses dossiers et ses comptes sur papier et
dans un tableur. La friction ne vient pas d'un seul de ces supports mais de leur
séparation : savoir quand elle a vu tel patient pour la dernière fois demande de
feuilleter ; savoir qui n'a pas payé demande de recouper ; préparer une
attestation demande de retrouver les dates ; et en fin d'année, reconstituer ses
revenus revient à réassembler des traces éparses accumulées sur douze mois.

S'y ajoute une complication que le tableur ne modélise pas : une partie de sa
patientèle relève de la convention INAMI de psychologie de première ligne,
l'autre du privé à tarif libre. Ces deux régimes ne se facturent pas de la même
manière, ne se suivent pas de la même manière, et se mélangent pourtant dans la
même semaine.

S'y ajoute une seconde source d'erreur : elle reçoit dans deux cabinets, à Uccle
et à Auderghem. Savoir où se tient la prochaine séance n'est pas un détail de
confort, et deux rendez-vous consécutifs dans des cabinets différents sans temps
de trajet suffisant sont une faute d'agenda qu'aucun support papier ne signale.

Le temps passé là-dessus est du temps pris sur sa pratique, et l'incertitude qui
subsiste (« ai-je oublié une facture ? ») a un coût mental propre.

## Solution

Un outil unique, ouvert chaque matin, qui répond dans l'ordre où elles se posent
aux trois questions de sa journée : qui je vois aujourd'hui, où en est ce
patient, où j'en suis financièrement.

Le rendez-vous en est le pivot. Depuis un créneau de l'agenda, elle atteint le
dossier, consigne la séance, marque l'encaissement. Rien ne s'encode deux fois :
une séance honorée devient un acte facturable sans ressaisie, et une attestation
se génère à partir de séances déjà enregistrées. Le suivi financier n'est pas un
module à alimenter mais la conséquence de ce qu'elle a déjà fait.

## Principes d'expérience

1. **La séance est l'unité, pas le module.** Agenda, dossier et facturation ne
   sont pas trois espaces à tenir en parallèle mais trois lectures d'un même
   fait. Toute donnée financière ou clinique naît d'une séance et y reste
   rattachée. Conséquence de conception : aucun écran ne demande de resaisir un
   nom, une date ou un montant déjà connus ailleurs.

2. **Le verrouillage porte seul la confidentialité.** L'écran reste
   potentiellement visible depuis le fauteuil du patient, mais les noms complets
   s'affichent partout, y compris dans l'agenda : décision explicite de la
   praticienne, qui a primé sur la retenue prévue au départ (les vues d'ensemble
   devaient s'en tenir aux initiales). La conséquence doit être assumée plutôt
   que subie : la confidentialité de l'écran ne repose plus sur ce qu'il tait,
   mais sur la rapidité avec laquelle on peut le masquer. Le bouton de
   verrouillage est donc permanent, doublé d'un raccourci clavier, et aucun
   contenu clinique n'apparaît hors de l'éditeur de notes.

3. **Parité de fonction, pas de mise en page.** Tout ce qu'elle fait au bureau,
   elle doit pouvoir le faire depuis son téléphone. Mais ce qui est une matrice
   sur écran large devient une séquence chronologique en main : on adapte la
   forme, jamais le périmètre.

## Direction esthétique

- **Philosophie** : calme éditorial. Composition plate et précise, filets pleins,
  aplats sans transparence, hiérarchie portée par la graisse et la taille plutôt
  que par la couleur. Fond blanc cassé chaud, violet #7F00FF pour ce qui se
  clique, navy #272757 en guise d'encre, boutons et cartouches en pilule.
- **Typographie** : Satoshi comme unique famille de texte, titres et corps
  confondus, hébergée localement plutôt que servie par un CDN tiers — une police
  distante ferait partir l'adresse IP de l'utilisatrice chez ce tiers à chaque
  chargement. Une mono accompagne les heures, durées et montants, qui doivent
  s'aligner en colonne. Rythme vertical plus généreux que celui d'un outil de
  planification d'équipe : les écrans sont consultés entre deux consultations,
  pas parcourus vingt fois par heure.
- **Tonalité** : posée, sobre, attentive. Ni froideur clinique, ni douceur
  thérapeutique appuyée.
- **Références** : la sobriété structurelle des outils de travail bien tenus, la
  qualité tranquille d'un agenda papier relié, la retenue typographique de la
  presse écrite.
- **Anti-références** : les logiciels médicaux gris et surchargés hérités des
  interfaces bureautiques ; le SaaS bleu générique à dégradés et illustrations
  rondes ; l'imagerie « bien être » en pastel, arrondie et rassurante, qui
  infantilise autant la praticienne que ses patients.

### Contrainte chromatique structurante

Comme dans tout outil dense, la couleur doit porter du sens sans saturer
l'écran. Trois familles doivent rester distinguables côte à côte, y compris en
petits aplats dans une même ligne de tableau, sur fond clair :

- **Régime** : conventionné INAMI / privé.
- **État du rendez vous** : à venir, honoré, annulé à temps, absence non excusée.
- **État de paiement** : dû, payé, en retard.
- **Cabinet** : Uccle, Auderghem.

C'est le problème central de la palette, pas sa décoration. Règle retenue :

- **L'état de paiement** garde la couleur pleine — ambre, vert, rouge. C'est la
  famille la plus scrutée.
- **Les deux cabinets** reçoivent chacun une teinte propre, sur demande : teal
  pour Uccle, rose pour Auderghem. Elles ont été choisies pour être franchement
  à l'écart du violet de marque comme des trois couleurs de paiement — l'écart
  de teinte minimal avec une couleur déjà employée est de 47°. Le cabinet est en
  outre doublé d'un filet vertical, d'un fond teinté et de son nom écrit : sur
  une pratique à deux sites, c'est l'information qu'on lit en premier.
- **Conséquence assumée** : cinq familles chromatiques sur un même écran, c'est
  beaucoup. Deux compensations. Dans les cartes du calendrier, l'état de
  paiement est ramené à une mention grise, et il ne garde sa couleur pleine que
  dans la facturation, où il est le sujet. Et l'alerte de trajet ne peut pas
  s'exprimer par le fond de la carte : le fond appartient au cabinet. Elle passe
  par un cerne et un pictogramme, faute de quoi une carte marquée « Uccle »
  cessait d'être de la couleur d'Uccle sans que rien ne l'explique.
- **Régime et statut de séance** passent sans couleur, par la graisse, le filet
  et le cartouche.

Chaque valeur porteuse de sens est écrite en toutes lettres à côté de son signal
visuel. Aucune information ne repose sur la seule couleur.

## Patterns existants

Projet neuf : aucun composant, aucun jeton à reprendre. Ce qui est hérité relève
des conventions techniques, pas de l'identité visuelle.

- **Socle technique repris de `~/planning-studios`** : Next.js 16, React 19,
  Prisma 7 sur PostgreSQL, next-auth v5, Tailwind v4, TanStack Query, Vitest,
  Playwright. Interface intégralement en français.
- **Convention de jetons** : source de vérité unique dans `src/app/globals.css`,
  déclarée en variables CSS puis exposée via `@theme inline`. Aucune valeur de
  couleur ou de police codée en dur ailleurs.
- **Ce qui ne suit pas** : la palette violette, les polices Noka et Hanken
  Grotesk et le logo appartiennent à Média Animation. L'outil d'Amandine a besoin
  de sa propre identité.
- **Typographie arrêtée** : Satoshi (400, 500, 700, 900) en local, JetBrains Mono
  pour les valeurs numériques. Chiffres en chasse tabulaire partout où figurent
  des dates, des heures, des montants ou des compteurs.
- **Couleurs arrêtées** : voir `src/app/globals.css`, seule source de vérité, où
  chaque rapport de contraste mesuré est consigné en commentaire.

## Inventaire des composants

| Composant | Statut | Notes |
| --- | --- | --- |
| Coquille applicative | Nouveau | Navigation supérieure fixe, sans défilement horizontal : les libellés s'effacent au profit des icônes quand la place manque |
| Réglages | Nouveau | Lieux et grille tarifaire |
| Recherche globale | Nouveau | Patients, notes et lieux ; raccourci ⌘K |
| Bascule de thème | Nouveau | Clair / sombre, conservé en cookie |
| Écran de connexion | Nouveau | Fait aussi office d'écran verrouillé |
| Verrouillage rapide | Nouveau | Bouton toujours visible et raccourci clavier, écran neutre immédiat |
| Agenda semaine | Nouveau | Matrice jours × créneaux, glisser pour déplacer, écran large uniquement |
| Agenda jour | Nouveau | Liste chronologique verticale, vue par défaut sur téléphone |
| Carte de rendez vous | Nouveau | Porte cabinet, régime, état et rappel de paiement en un coup d'œil |
| Alerte de trajet | Nouveau | Signale deux séances consécutives dans des cabinets différents sans trajet possible |
| Création de série | Nouveau | Séances récurrentes avec exceptions (congés, jours fériés belges) |
| Recherche patient | Nouveau | Palette au clavier, accessible partout |
| Fiche patient | Nouveau | Identité, régime, historique des séances, solde, documents |
| Historique de séances | Nouveau | Chronologie dense, dépliable vers la note |
| Éditeur de note de séance | Nouveau | Texte libre, enregistrement continu, jamais affiché dans une vue d'ensemble |
| Badge de régime | Nouveau | Cartouche non chromatique, libellé écrit en toutes lettres |
| Badge d'état de paiement | Nouveau | Seule famille portée par la couleur, doublée de texte |
| Table de facturation | Nouveau | Dense, triable, sélection multiple, marquage payé en lot |
| Générateur d'attestation | Nouveau | Sélection de séances vers un PDF conforme aux exigences mutuelle |
| Tableau de bord financier | Nouveau | Revenus par mois et par régime, impayés, charges |
| Saisie de charges | Nouveau | Poste, montant, justificatif joint |
| Export comptable | Nouveau | Récapitulatif annuel destiné au comptable |
| Tri de colonne | Nouveau | En-tête cliquable, état porté par l'URL |
| Filtres | Nouveau | Cabinet, régime, état de paiement ; pilules liées, état porté par l'URL |
| Glisser-déposer d'agenda | Nouveau | Déplacement au quart d'heure, doublé de boutons pour le clavier |
| Notes de dossier | Nouveau | Datées et empilées, jamais réécrites |
| Encaissement | Nouveau | Espèces ou électronique, demandé au moment du geste |
| Reçu PDF | Nouveau | Composé côté serveur, identique quel que soit le navigateur |
| États vides | Nouveau | Premier lancement, journée sans rendez vous, patient sans historique |
| Champs de formulaire | Nouveau | Base commune, cibles tactiles conformes sur téléphone |
| Modale de confirmation | Nouveau | Réservée aux actions destructrices ou irréversibles |

## Interactions clés

**Ouvrir la journée.** L'écran d'accueil est la journée en cours. Chaque séance
passée attend un statut : honorée, annulée à temps, absence non excusée. Un seul
geste par séance, et le statut détermine mécaniquement si l'acte devient
facturable.

**Traiter une séance sans quitter l'agenda.** Depuis un rendez vous : consigner
la note, marquer l'encaissement, fixer la séance suivante. Ces trois actions
s'enchaînent dans le même panneau ; le retour à l'agenda est implicite.

**Déplacer un rendez vous.** Par glisser sur écran large, avec retour visuel
immédiat et annulation possible. Par édition des champs de date et d'heure sur
téléphone : même résultat, geste différent.

**Verrouiller.** Un raccourci et un bouton permanent basculent l'écran sur un
état neutre qui ne laisse rien lire. Le retour demande le mot de passe. Un
verrouillage automatique s'enclenche après quelques minutes d'inactivité.

**Établir une attestation.** Sélection de séances dans la fiche patient, contrôle
du récapitulatif, génération du PDF. Les séances déjà attestées sont marquées
comme telles pour éviter le doublon.

**Solder les impayés.** La table de facturation permet la sélection multiple et
le marquage payé en lot, avec date et mode de paiement communs.

**Retrouver un patient.** Une palette de recherche au clavier, disponible depuis
n'importe quel écran, atteint une fiche en trois frappes.

## Comportement responsive

Bascule à 900 px, comme dans le projet de référence.

- **Au dessus** : navigation supérieure sur une ligne, agenda en matrice
  hebdomadaire (lundi à samedi), tables denses à colonnes multiples, panneaux
  latéraux plutôt que modales.
- **En dessous** : navigation reportée sur sa propre ligne et défilante, agenda en liste chronologique
  du jour avec navigation jour par jour, tables converties en cartes empilées
  hiérarchisées (jamais en tableau à défilement horizontal), panneaux devenus
  écrans pleins.

Composants dont le comportement change, pas seulement la taille : l'agenda
(matrice vers séquence), les tables de facturation (colonnes vers cartes), le
déplacement de rendez vous (glisser vers édition de champs).

## Accessibilité

- Contraste texte sur fond d'au moins 4,5:1 pour le corps et 3:1 pour les
  éléments d'interface non textuels, norme WCAG 2.1 niveau AA. Le rapport obtenu
  est indiqué pour chaque couleur porteuse de sens.
- Aucune information portée par la seule couleur : régime, état de rendez vous et
  état de paiement sont toujours écrits.
- Navigation clavier complète, ordre de tabulation cohérent, focus visible et non
  supprimé. L'agenda est parcourable et modifiable sans souris.
- Chiffres en chasse tabulaire pour tout ce qui s'aligne en colonne.
- Cibles tactiles d'au moins 44 px sur téléphone.
- Respect de `prefers-reduced-motion` : les transitions de l'agenda sont les
  premières à tomber.
- Rôles et libellés ARIA sur la grille d'agenda, les tables triables et les
  panneaux ; annonce des changements d'état aux lecteurs d'écran.

## Confidentialité et conformité

Contrainte dure, pas une finition. Les dossiers manipulés sont des données de
santé au sens du RGPD, et le secret professionnel du psychologue s'y ajoute.

- **Hébergement** : Vercel pour l'application, PostgreSQL en région européenne.
  Accord de sous traitance à signer avec chacun des deux prestataires, et région
  de la base à vérifier explicitement plutôt qu'à supposer.
- **Chiffrement** : TLS en transit, chiffrement au repos côté hébergeur, et
  chiffrement applicatif dédié des champs de notes cliniques avec une clé tenue
  hors base. Le chiffrement de bout en bout a été écarté sciemment (voir
  arbitrages) : les notes restent donc lisibles par qui détient la clé serveur, ce
  qui rend la protection de cette clé critique.
- **Authentification** : compte unique, mot de passe fort, second facteur
  recommandé, sessions courtes, verrouillage automatique.
- **Traçabilité** : journal des accès et des modifications sur les dossiers.
- **Sauvegardes** : chiffrées, hors du serveur principal, et surtout restaurées
  pour de vrai au moins une fois. Une sauvegarde jamais testée n'existe pas.
- **Conservation** : la durée légale de conservation d'un dossier psychologique en
  Belgique se compte en décennies et reste à confirmer auprès de la Commission
  des psychologues. Ce n'est pas un paramètre de configuration à décider en
  chemin : il conditionne le modèle de données et la procédure d'archivage.
- **Droits des patients** : export et suppression d'un dossier sur demande,
  procédure prévue dès la conception. Registre des traitements à tenir.

## Révisions

Décisions arrêtées après la rédaction initiale, qui remplacent ce que ce brief
prévoyait au départ.

- **Navigation supérieure, pas de barre latérale**, sur demande explicite. La
  version initiale prévoyait une barre latérale permanente à gauche.
- **Deux cabinets, Uccle et Auderghem.** Le brief initial n'en supposait qu'un
  seul. Conséquences : le lieu devient une propriété de la séance, il s'ajoute
  aux familles de sens qui se disputent l'écran, et l'agenda doit signaler les
  enchaînements impossibles entre les deux sites.
- **Identité arrêtée** : AMANDINE MONSEL / AMAPSY SRL, violet #7F00FF et navy
  #272757 sur blanc cassé, Satoshi, boutons en pilule, navigation à icônes. La
  palette n'est plus une question ouverte. L'indigo d'une première version a été
  remplacé par ce violet, sur demande.
- **Noms complets partout**, y compris agenda et calendrier. Renverse le principe
  de discrétion initial ; voir le principe 2, réécrit en conséquence.
- **Cabinets visuellement distincts**, portés par les deux couleurs de marque.
- **Séance de 45 minutes, pas de séance le week-end.** Deux questions ouvertes
  refermées : l'agenda va du lundi au vendredi, et le serveur refuse un
  déplacement vers un samedi ou un dimanche — une règle qui ne vivrait que dans
  le navigateur n'en serait pas une.
- **Agenda positionné à l'heure réelle**, blocs dimensionnés à leur durée et
  répartis en colonnes parallèles quand ils se chevauchent, sans défilement
  interne : c'est la page qui défile, et sous 900 px la grille cède la place à
  une liste par jour.
- **Tri et filtres sur toutes les vues**, portés par l'URL : la vue est
  partageable, le retour arrière fonctionne, rien ne dépend de JavaScript.
- **Deux couleurs de cabinet propres**, distinctes du violet de marque, qui a
  cessé de servir à identifier Auderghem.
- **Satoshi partout**, valeurs numériques comprises : l'alignement des colonnes
  de chiffres passe par `font-variant-numeric`, plus par une police à chasse
  fixe.
- **Grille horaire au demi-heure**, cartes repensées autour de l'heure (la
  première information cherchée), volume hebdomadaire en chiffres pleins, et
  calcul de séances et d'heures sur une plage de dates libre.
- **Flux iCalendar** suivi depuis Google Calendar ou tout autre agenda, protégé
  par un jeton secret dans l'adresse. Les événements ne portent que le lieu et
  l'heure, jamais le nom du patient : les envoyer reviendrait à transférer des
  données de santé chez un tiers, et à les afficher sur l'écran de verrouillage
  d'un téléphone. L'adresse du cabinet y figure en revanche, pour permettre de
  lancer un itinéraire.
- **Les lieux sont devenus des données** : nom, adresse et couleur s'éditent
  dans les réglages, on en ajoute et on en ferme. L'énumération figée dans le
  code était une limite atteinte dès l'apparition d'un troisième lieu.
- **Troisième lieu et troisième régime** : Amandine intervient aussi comme
  indépendante dans une école, souvent le matin. Le payeur n'y est ni le
  patient ni l'INAMI mais l'établissement — c'est exactement la question que
  tranchent déjà les deux autres régimes, d'où l'ajout d'une valeur plutôt
  qu'un cas particulier.
- **Grille tarifaire** éditable, dont un tarif par défaut. Le tarif propre à un
  patient prime toujours.
- **Authentification** par mot de passe, et verrouillage qui détruit la session
  au lieu de la masquer. L'écran de connexion et l'écran verrouillé ne font
  qu'un : reprendre la main exige le mot de passe.
- **Thème clair et sombre**, choix conservé dans un cookie et appliqué dès le
  rendu serveur, sans éclair blanc au chargement.
- **Recherche globale** sur les patients, leurs coordonnées, les notes et les
  lieux, accessible au raccourci ⌘K.
- **Site public et prise de rendez-vous en ligne**, initialement hors périmètre.
  Une seule application sert les deux : le site à la racine, l'outil sous
  `/admin`, atteignable sur un sous-domaine distinct. Rien du site ne trahit
  l'existence de l'outil.
- **Réservation à deux régimes** : un patient connu, arrivant avec son lien
  personnel, réserve immédiatement ; toute autre personne dépose une demande
  qu'Amandine confirme ou décline. Elle garde la main sur qui entre dans son
  agenda, ce qui compte pour une première consultation.
- **Disponibilités** : horaires d'ouverture par lieu et par jour, et congés. Il
  manquait à l'outil de savoir quand elle est disponible, et non seulement
  quand elle est occupée. Un créneau n'est proposé que s'il tombe dans une
  plage d'ouverture, qu'aucune séance ne l'occupe où que ce soit, qu'aucun congé
  ne le couvre, et qu'il laisse le temps de rejoindre le lieu depuis la séance
  précédente. Mieux vaut ne pas proposer un créneau intenable que de le refuser
  ensuite.
- **Le formulaire public est un point de collecte de données de santé** :
  solliciter une psychologue en révèle une. D'où le minimum de champs, une
  mention d'information à côté du formulaire, et l'invitation explicite à
  garder le motif pour la séance plutôt que de l'écrire dans un courriel.
- **Reçu PDF** avec mode de paiement (espèces ou électronique). Ce n'est pas une
  attestation de soins, et les prestations de psychologue sont exonérées de TVA
  en Belgique.

## Arbitrages assumés

Deux décisions ont été prises contre la recommandation initiale et sont
consignées ici pour qu'elles restent des choix, et non des oublis.

1. **Chiffrement de bout en bout écarté**, au profit d'un chiffrement au repos
   avec réinitialisation possible du mot de passe. Gagné : aucune perte
   définitive de notes en cas d'oubli, recherche plein texte possible. Perdu : la
   confidentialité repose désormais sur la sécurité du serveur et de sa clé, pas
   sur une impossibilité mathématique.
2. **Comptabilité incluse** malgré sa sortie du métier de l'outil. Elle est
   cadrée serré (revenus, charges, récapitulatif annuel pour le comptable) et
   placée en dernière phase. La TVA disparaît d'elle même : les prestations de
   psychologue sont exonérées en Belgique.

## Découpage proposé

1. **Agenda et patients** : créneaux, séances récurrentes, fiches, notes,
   verrouillage. L'outil devient utilisable au quotidien dès cette phase.
2. **Honoraires** : deux régimes, états de paiement, relance des impayés, export.
3. **Attestations** : génération PDF à partir des séances.
4. **Comptabilité** : charges, tableau de bord annuel, récapitulatif comptable.

## Hors périmètre

- Rappels automatiques par SMS ou courriel avant séance.
- Écriture ou lecture via l'API Google Calendar. Le flux iCalendar couvre le
  besoin « voir mon agenda sur mon téléphone » sans OAuth, sans jetons à
  renouveler et sans contrat de sous-traitance avec Google. Sa limite est
  connue : Google rafraîchit les agendas suivis quand il l'entend, souvent avec
  plusieurs heures de retard. Passer à l'API ne se justifiera que si cette
  latence devient gênante — et supposera alors un compte Workspace.
- Téléconsultation, visioconférence, messagerie avec les patients.
- Multi praticiens : comptes multiples, cloisonnement des dossiers, agenda
  partagé, gestion de salles.
- Chiffrement de bout en bout.
- TVA et facturation électronique structurée (Peppol).
- Transmission automatisée vers les mutuelles ou l'INAMI ; l'outil produit des
  documents, il ne dialogue avec aucun organisme.
- Application mobile native : le web responsive couvre le besoin.
- Reprise automatisée du tableur existant ; la saisie initiale se fait à la main.

## Questions ouvertes

À confirmer avec Amandine avant la phase 2.

- Volume de patientèle et rythme hebdomadaire, qui déterminent la densité utile
  de l'agenda.
- Répartition des journées entre Uccle et Auderghem, et temps de trajet réel
  entre les deux. La valeur retenue par défaut, trente minutes, reste une
  supposition qui conditionne les alertes d'agenda.
- Contenu exact attendu sur un reçu par sa comptable.
- Tarifs pratiqués en privé.
- Fonctionnement exact du régime conventionné dans son cas : quotas de séances,
  destinataire de la facturation, pièces exigées.
- Exigences précises des mutuelles belges sur le contenu d'une attestation.
- Durée légale de conservation des dossiers.
- Nom de l'outil, et existence d'une identité visuelle propre (site, logo,
  papeterie) dont la palette pourrait partir.
