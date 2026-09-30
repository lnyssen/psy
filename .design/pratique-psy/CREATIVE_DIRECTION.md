# Direction créative — Pratique Psy (Amandine Monsel)

**Projet.** Un site public de prise de rendez-vous et un outil d'administration pour une psychologue clinicienne exerçant en société, sur deux cabinets, une école et une convention INAMI première ligne.

**Audience.** Deux publics distincts, qui ne se croisent jamais sur le même écran : les visiteurs du site (patients potentiels, souvent en recherche, parfois anxieux, sur téléphone) et Amandine elle-même dans l'outil (utilisatrice unique, quotidienne, pressée).

**Objectif.** Que la prise de rendez-vous en ligne se fasse sans friction ni fausse promesse, et que la gestion administrative (patients, séances, facturation, dépenses) tienne dans le temps qu'Amandine peut vraiment lui consacrer entre deux séances.

---

## Les quatre axes

### 1. Registre de ton — Conversationnel
Amandine parle à la première personne, au « vous », sans jargon ni formule commerciale. Le formulaire de RDV dit « Bonjour {nom}. Choisissez le créneau qui vous convient », pas « Veuillez sélectionner un créneau disponible ». Aucune exclamation nulle part. La correction de la fausse promesse d'e-mail (cinq occurrences retirées) allait dans ce sens : dire exactement ce qui se passe, pas ce qui rassurerait.

### 2. Philosophie esthétique — Éditorial retenu (site public) / strictement fonctionnel (outil)
Sur le site : des bandes pleine largeur qui alternent papier, violet, clair, navy — pas des grilles de cartes identiques ; un seul portrait, placé au moment où le texte dit « je » ; une seule couleur d'accent ; les listes de problématiques et de cabinets restent volontairement neutres, sans code couleur, sans pastille au-dessus de chaque titre. Dans l'outil : aucune ambition décorative — pas de grain, aplats pleins et nets, la couleur ne sert qu'à distinguer les cabinets d'un coup d'œil dans l'agenda.

### 3. Relation à l'audience — Compagne
Le site ne dit jamais à la personne ce qui est bon pour elle et ne joue pas non plus le pair neutre. « On prend le temps de faire connaissance », « à votre rythme, sans avoir à tout dire d'emblée », « nous décidons ensemble s'il y a lieu de continuer, et à quel rythme » : le visiteur reste le protagoniste, le site marche à côté de lui, jamais devant.

### 4. Ambition sensorielle — scindée, et c'est voulu
> *Le site vise le soigné (le grain, le portrait placé au bon moment, la typographie qu'on remarque sans qu'elle prenne toute la place) ; l'admin vise strictement le fonctionnel (consulté vingt fois par jour, jamais pour le plaisir). C'est une tension du cadre habituel — d'ordinaire un brief tient un seul point sur cet axe — mais ici la bifurcation elle-même est la décision : deux publics, deux besoins, une seule palette qui les relie.*

C'est la position confirmée par Amandine, et le point le plus inhabituel du brief : cet axe n'est normalement pas scindé. Il l'est ici parce que les deux publics ne se recouvrent jamais et n'ont pas les mêmes attentes vis-à-vis du même geste (prendre un rendez-vous vs. gérer sa comptabilité un mardi soir).

---

## Synthèse

Ce brief produit un site public feutré et prévenant — jamais tape-à-l'œil, jamais pressé — à côté d'un outil qui ne cherche à plaire à personne et se contente d'être clair et rapide. Les deux surfaces partagent la même palette (un seul violet, une seule encre) et la même honnêteté de langage, ce qui les relie sans jamais faire de l'outil une vitrine ni du site un tableau de bord. Le seul mouvement du site est une unique cascade d'entrée sur le hero, au chargement de l'accueil — rien d'autre ne bouge nulle part, sur aucune des deux surfaces.

## Références d'inspiration

Aucune n'a été fournie pour ce projet : la direction s'est construite en cours de route, décision par décision, plutôt que d'un moodboard de départ. Si des références concrètes émergent plus tard (un site, une brochure), elles complèteront cette section.

## Ce que ce brief refuse

- Pas de repères numérotés (01 / 02 / 03) : rien sur le site n'est une séquence.
- Pas de grilles de cartes identiques icône + titre + texte.
- Pas d'avatars ni d'initiales en cercle, nulle part dans l'outil.
- Pas de texte gris sur fond de couleur — une teinte dérivée du fond, jamais un gris neutre plaqué dessus.
- Pas de bordure-accent en `border-left` sur les listes ou les alertes.
- Pas de fausse promesse dans la copie (« vous recevrez un e-mail ») quand l'infrastructure réelle ne le fait pas.
- Pas de code couleur des cabinets qui déborde du site public — il reste dans l'outil, où il sert un vrai besoin (distinguer vingt occurrences par semaine dans l'agenda).
- Pas de décoration dans l'admin : pas de grain, pas d'animation, pas d'accent hors de ce qui aide à lire un tableau.
- Pas d'animation dans l'admin, à aucun prétexte — même si le site en gagne.

## Mouvement (mis à jour)

Le site public porte maintenant plusieurs gestes, tous transform/opacity, tous respectueux de `prefers-reduced-motion`, tous absents de l'admin :
- la cascade d'entrée du hero (sur-titre, nom, publics, accroche, boutons — 90 ms d'écart, easing exponentiel) ;
- une apparition en montant au défilement pour chaque bande de l'accueil qui suit le hero, une fois pour toutes, jamais rejouée (composant `Reveal`) ;
- une légère élévation au survol des cartes de cabinet dans « Où me trouver » ;
- l'ouverture et la fermeture du menu mobile, qui glissent au lieu d'apparaître et de disparaître sèchement.

Le principe reste : un geste par interaction ou par entrée, jamais une collection d'effets simultanés, et rien de tout cela dans l'outil.

## Questions ouvertes

- Si une nouvelle page publique est ajoutée plus tard, elle doit être vérifiée contre ce brief avant d'être construite — en particulier l'axe 2, qui est le plus facile à trahir par réflexe (grille de cartes, icônes au-dessus des titres). Le composant `Reveal` existe déjà et peut s'y appliquer directement.
