# Design Brief : outil de gestion de pratique — Amandine Monsel, psychologue

Rédigé le 5 septembre 2026. Praticienne unique, exercice en Belgique.

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

2. **Discrétion par défaut.** L'écran est potentiellement visible depuis le
   fauteuil du patient. Rien de nominatif ni de clinique ne s'affiche au delà de
   ce que la tâche en cours exige, un verrouillage immédiat reste toujours à
   portée, et les vues d'ensemble privilégient les initiales et les compteurs aux
   noms complets. Le confort de lecture cède ici devant la confidentialité, pas
   l'inverse.

3. **Parité de fonction, pas de mise en page.** Tout ce qu'elle fait au bureau,
   elle doit pouvoir le faire depuis son téléphone. Mais ce qui est une matrice
   sur écran large devient une séquence chronologique en main : on adapte la
   forme, jamais le périmètre.

## Direction esthétique

- **Philosophie** : calme éditorial. Composition plate et précise, filets pleins,
  aplats sans transparence, hiérarchie portée par la graisse et la taille plutôt
  que par la couleur. Rythme vertical plus généreux que celui d'un outil de
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

C'est le problème central de la palette, pas sa décoration. Règle de résolution :
une seule des trois familles est portée par de la couleur pleine (l'état de
paiement, le plus scruté), les deux autres par des traitements non chromatiques
(graisse, filet, cartouche discret) doublés de texte. Chaque valeur porteuse de
sens est écrite en toutes lettres à côté de son signal visuel.

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
- **Typographie à définir** (voir `/design-tokens`) : direction recommandée, une
  serif de labeur pour les titres et une sans humaniste pour le corps, avec
  chiffres en chasse tabulaire obligatoires partout où figurent des dates, des
  heures, des montants ou des compteurs.
- **Couleurs à définir** : neutres chauds plutôt que gris froids, encre proche du
  noir mais teintée, une seule teinte d'accent.

## Inventaire des composants

| Composant | Statut | Notes |
| --- | --- | --- |
| Coquille applicative | Nouveau | Barre latérale permanente sur large, barre inférieure sur téléphone |
| Verrouillage rapide | Nouveau | Bouton toujours visible et raccourci clavier, écran neutre immédiat |
| Agenda semaine | Nouveau | Matrice jours × créneaux, glisser pour déplacer, écran large uniquement |
| Agenda jour | Nouveau | Liste chronologique verticale, vue par défaut sur téléphone |
| Carte de rendez vous | Nouveau | Porte régime, état et rappel de paiement en un coup d'œil |
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

- **Au dessus** : barre latérale permanente, agenda en matrice hebdomadaire,
  tables denses à colonnes multiples, panneaux latéraux plutôt que modales.
- **En dessous** : barre de navigation inférieure, agenda en liste chronologique
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

- Portail patient, prise de rendez vous en ligne, rappels automatiques par SMS ou
  courriel.
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
- Tarifs pratiqués en privé, et durée standard d'une séance.
- Fonctionnement exact du régime conventionné dans son cas : quotas de séances,
  destinataire de la facturation, pièces exigées.
- Exigences précises des mutuelles belges sur le contenu d'une attestation.
- Durée légale de conservation des dossiers.
- Nom de l'outil, et existence d'une identité visuelle propre (site, logo,
  papeterie) dont la palette pourrait partir.
