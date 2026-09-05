# Prompt pour Claude Design

À coller tel quel dans un nouveau projet Claude Design.

---

## Avant toute chose

Il n'existe aujourd'hui aucune identité visuelle pour ce projet : pas de site,
pas de logo, pas de charte. Ne va donc rien relever nulle part, et n'invente
surtout pas une identité existante. Tu pars de zéro, et c'est la commande.

Une seule vérification préalable : si on te fournit une adresse de site
professionnel, relève-la avec l'outil de capture web et n'en déduis que des
valeurs mesurées, jamais devinées. Si une information n'est pas récupérable,
dis-le et propose une alternative en la signalant comme telle. En l'absence
d'adresse, construis la palette et la typographie depuis la direction décrite
plus bas.

## Le contexte

Amandine Monsel est psychologue indépendante en Belgique. Elle exerce seule.
Une partie de sa patientèle relève de la convention INAMI de psychologie de
première ligne, l'autre du privé à tarif libre : ces deux régimes ne se
facturent pas de la même façon et se mélangent dans la même semaine.

Elle tient aujourd'hui son agenda sur papier et ses comptes dans un tableur.
L'outil à concevoir remplace les deux.

## Ce qu'il faut concevoir

Une application interne de gestion de pratique, utilisée par une seule personne,
tous les jours, sur ordinateur au bureau **et** sur téléphone en déplacement,
sans hiérarchie entre les deux. Ce n'est pas un site vitrine : c'est un outil de
travail ouvert entre deux consultations. La densité d'information prime sur
l'effet, mais le rythme doit rester plus respirant que celui d'un tableau de
bord d'équipe : ces écrans sont consultés quelques fois par jour, pas vingt fois
par heure.

Écrans à produire :

1. **Coquille applicative.** Barre latérale permanente à gauche sur écran large,
   barre de navigation inférieure sur téléphone. Elle porte le nom de l'outil,
   les entrées de navigation, un bouton de création et — toujours visible — le
   bouton de verrouillage immédiat.
2. **Agenda de la semaine**, écran principal sur ordinateur. Une matrice : les
   jours en colonnes, les heures en lignes. Chaque séance est un bloc portant
   l'heure, l'identification du patient, son régime et l'état de son paiement.
   Prévois le cas de deux séances qui se chevauchent.
3. **Agenda du jour**, vue par défaut sur téléphone. La même semaine devient une
   liste chronologique verticale, avec navigation jour par jour. Même périmètre
   fonctionnel, forme différente : ce n'est pas la matrice réduite.
4. **Fiche patient.** Identité, régime, tarif, solde dû, chronologie dense des
   séances passées, accès à la note de séance. Traite le cas d'un patient sans
   aucun historique.
5. **Table de facturation.** Dense, triable, avec sélection multiple et
   marquage payé en lot. C'est l'écran où la contrainte chromatique se joue
   vraiment : montre-le rempli d'une trentaine de lignes mélangeant les deux
   régimes et les trois états de paiement.
6. **Tableau de bord financier.** Revenus par mois et par régime, impayés en
   cours, charges. Sobre : des chiffres et des filets, pas une infographie.
7. **Écran verrouillé.** Ce que voit quelqu'un qui regarde l'écran quand elle a
   verrouillé. Il ne doit rien laisser lire, et rester digne : ni écran noir
   brutal, ni message anxiogène.
8. **États vides et messages d'erreur.** Premier lancement, journée sans
   rendez-vous, recherche sans résultat, base injoignable.

## Contraintes

### La contrainte structurante est chromatique

Trois familles de sens doivent coexister dans une même ligne de tableau, sur
fond clair, sans transformer l'écran en sapin de Noël :

- **Régime** : conventionné INAMI, privé.
- **État de la séance** : à venir, honorée, annulée à temps, absence non
  excusée.
- **État de paiement** : dû, payé, en retard.

Traite cela comme le problème central, pas comme une décoration. La règle de
résolution retenue : **une seule de ces familles est portée par de la couleur
pleine — l'état de paiement, le plus scruté** — les deux autres passent par des
traitements non chromatiques (graisse, filet, cartouche discret) doublés de
texte. Si tu trouves mieux, propose-le et argumente ; ne t'en écarte pas en
silence.

Chaque valeur porteuse de sens est écrite en toutes lettres à côté de son signal
visuel. Aucune information ne repose sur la seule couleur.

Le contraste texte sur fond doit atteindre le niveau AA de la norme WCAG 2.1
(4,5:1 pour le texte, 3:1 pour les éléments d'interface non textuels). **Indique
le rapport obtenu pour chaque couleur porteuse de sens.**

### La discrétion est une contrainte de conception, pas une option

L'écran est potentiellement visible depuis le fauteuil du patient. Dans toutes
les vues d'ensemble — agenda, table de facturation, tableau de bord — les
patients sont identifiés par leurs initiales, jamais par leur nom complet. Le
nom complet n'apparaît que dans la fiche individuelle, ouverte
intentionnellement. Le contenu clinique n'apparaît nulle part hors de l'éditeur
de note.

Conçois en conséquence : une colonne d'initiales n'a pas la même largeur ni la
même lisibilité qu'une colonne de noms, et c'est un vrai problème de mise en
page, pas un détail.

### Typographie

Chiffres en chasse tabulaire partout où figurent des dates, des heures, des
montants ou des compteurs, pour que les colonnes s'alignent. Hiérarchie portée
par la graisse et la taille plutôt que par la couleur.

Direction recommandée : une serif de labeur pour les titres, une sans humaniste
pour le corps. Conteste-la si tu penses mieux, en argumentant.

Règles typographiques françaises strictes : guillemets « », apostrophes courbes,
espaces insécables avant les deux-points, points-virgules, points d'interrogation
et d'exclamation. Pas de tiret cadratin. Format de date et d'heure belge
(fr-BE), devise en euros.

### Registre

Calme éditorial. Composition plate et précise, filets pleins, aplats sans
transparence. Neutres chauds plutôt que gris froids. Une seule teinte d'accent.

Références : la sobriété structurelle des outils de travail bien tenus, la
qualité tranquille d'un agenda papier relié, la retenue typographique de la
presse écrite.

Anti-références, à éviter explicitement : les logiciels médicaux gris et
surchargés hérités des interfaces bureautiques ; le SaaS bleu générique à
dégradés, ombres portées et illustrations rondes ; l'imagerie « bien-être » en
pastel et arrondie, qui infantilise autant la praticienne que ses patients.

### Responsive

Bascule à 900 px. Au-dessus : barre latérale, matrice hebdomadaire, tables
denses, panneaux latéraux. En dessous : barre inférieure, agenda du jour en
liste, tables converties en cartes empilées hiérarchisées — jamais un tableau à
défilement horizontal. Cibles tactiles d'au moins 44 px.

## Ce que je veux en retour

En plus des maquettes : la palette documentée, valeur par valeur, avec le rôle
de chaque couleur, son rapport de contraste mesuré, et la raison du choix. C'est
ce document qui deviendra le fichier de jetons de l'application — il compte
autant que les écrans.
