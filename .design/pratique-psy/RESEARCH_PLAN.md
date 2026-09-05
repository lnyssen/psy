# Plan de recherche : entretien contextuel avec Amandine

Complément de `DESIGN_BRIEF.md`. À mener avant `/design-tokens` et avant tout
développement de la phase 2.

## Pourquoi ce n'est pas une étude

L'outil a exactement une utilisatrice. Il n'y a donc ni échantillon à constituer,
ni saturation à atteindre, ni généralisation à viser. Interroger d'autres
psychologues serait du temps perdu : ce qui compte n'est pas ce que font les
psychologues en général, mais ce que fait Amandine, y compris ses habitudes les
plus idiosyncrasiques. Une manie personnelle de classement n'est pas un biais à
corriger, c'est une spécification.

La méthode adaptée est l'entretien contextuel : une séance unique, chez elle, ses
supports réels ouverts devant nous. Une heure trente, en une fois.

## Le piège à désamorcer

Amandine est une amie et le travail est un cadeau. Elle validera par gentillesse
des propositions qui ne lui conviennent pas, et minimisera les frictions de son
organisation actuelle pour ne pas paraître désordonnée. C'est le principal risque
de fiabilité de cet entretien, avant toute considération de méthode.

Trois contre mesures, à tenir pendant toute la séance :

1. **Faire montrer, pas raconter.** « Ouvre ton tableur et refais devant moi la
   facturation de la semaine dernière » vaut dix réponses déclaratives. On observe
   les gestes, les allers retours, les post it, les colonnes abandonnées.
2. **Ne jamais présenter une idée comme la sienne.** Poser les options comme
   extérieures et déjà critiquées : « une version demande ceci, une autre cela,
   la première a tel défaut » plutôt que « j'ai pensé faire ceci, qu'en penses
   tu ». Elle peut alors critiquer sans blesser.
3. **Chercher activement le désaccord.** À chaque validation, relancer une fois :
   « qu'est ce qui, dans ce que je viens de décrire, ne collerait pas à ta façon
   de travailler ? » Une séance sans aucune objection est une séance ratée.

## Objectifs

Chaque objectif est rattaché à la décision de conception qu'il débloque.

| # | Objectif | Décision débloquée |
| --- | --- | --- |
| 1 | Comprendre le déroulé réel d'une semaine, du premier rendez vous au dernier encaissement | Structure de l'écran d'accueil, ordre des tâches |
| 2 | Observer la facturation telle qu'elle se pratique aujourd'hui, dans ses supports | Modèle de données des honoraires, périmètre de la phase 2 |
| 3 | Établir le fonctionnement exact du régime conventionné dans son cas | Modélisation des deux régimes, la question la plus structurante du projet |
| 4 | Recueillir les exigences réelles des mutuelles sur les attestations | Gabarit PDF de la phase 3 |
| 5 | Cerner ce qu'elle consigne après une séance, et ce qu'elle ne consignerait jamais dans un outil informatique | Périmètre de l'éditeur de notes, et validation ou remise en cause de l'arbitrage sur le chiffrement |
| 6 | Établir la réalité de l'usage sur téléphone | Confirmation ou abandon de la parité affichée dans le brief |
| 7 | Mesurer l'exposition visuelle de son écran en consultation | Calibrage du principe de discrétion |
| 8 | Régler les paramètres restés ouverts : volume, durée de séance, tarifs, conservation | Densité de l'agenda, modèle d'archivage |

## À rapporter de la séance

Des artefacts, pas seulement des notes. Demander l'autorisation en amont, et
anonymiser tout ce qui porte un nom de patient.

- Photographie de son agenda papier, une semaine chargée.
- Copie ou capture de son tableur de suivi, colonnes visibles.
- Une attestation vierge et une attestation remplie, caviardée.
- Les documents du régime conventionné : convention, grille tarifaire, formulaires.
- Un relevé de ses tarifs privés et de la durée type d'une séance.
- Une photographie de son bureau depuis le fauteuil du patient. C'est la mesure la
  plus directe du principe de discrétion.

## Guide d'entretien

Quatre vingt dix minutes. Les durées sont indicatives ; l'objectif 3 est
prioritaire et ne doit pas être sacrifié si la séance dérape.

### 1. Cadrage (5 min)

Rappeler que l'objet de la séance est de comprendre sa manière de travailler, pas
de valider un projet. Dire explicitement qu'un désaccord est plus utile qu'un
accord, et qu'aucune organisation ne sera jugée. Demander l'autorisation de
photographier les documents.

### 2. La semaine réelle (20 min) — objectifs 1, 6, 7, 8

Ne pas demander de décrire une semaine type. Demander de raconter **la semaine
dernière**, jour par jour, agenda ouvert.

- Comment cette semaine a t elle commencé ? Qu'as tu regardé en premier lundi
  matin ?
- Combien de patients as tu vus ? Combien de temps dure une séance chez toi ?
- Y a t il eu une annulation, un retard, une absence ? Qu'as tu fait
  concrètement ?
- Quand as tu fixé les prochains rendez vous ? Pendant la séance, entre deux, le
  soir ?
- À quel moment as tu touché à ton téléphone pour quelque chose lié au travail ?
  Que faisais tu exactement ?
- Où est posé ton écran quand tu reçois ? Qu'est ce qu'un patient assis en face
  peut voir ?

Relances : « et ensuite ? », « montre moi », « c'était la première fois ? ».

### 3. Observation de la facturation (25 min) — objectifs 2, 3

Le cœur de la séance. Passer à l'observation directe.

- « Refais devant moi la facturation de la semaine dernière, à voix haute. »
  Chronométrer sans le dire. Noter chaque hésitation et chaque vérification.
- Où sais tu qu'un patient n'a pas payé ? Comment le sais tu ?
- Comment relances tu quelqu'un ? Est ce que ça t'arrive de renoncer ?

Puis le régime conventionné, en détail :

- Quels patients relèvent de la convention, et comment se retrouvent ils chez toi ?
- Qui paie, et combien ? Que verse le patient, que verse l'INAMI ou le réseau ?
- Y a t il un quota de séances par patient ? Comment le suis tu aujourd'hui ?
- À qui adresses tu quoi, et sous quelle forme ? Quel délai ?
- Qu'est ce qui, dans ce circuit, te fait perdre le plus de temps ?

Enfin les attestations :

- Montre moi une attestation que tu as établie récemment.
- Y a t il des mutuelles plus exigeantes que d'autres ? Une attestation t'a t elle
  déjà été refusée, et pourquoi ?

### 4. Les notes de séance (15 min) — objectif 5

Terrain sensible. Aborder par la pratique, jamais par le contenu.

- Que notes tu après une séance ? À quel moment, sur quoi ?
- Y relis tu quelque chose avant une séance ? Quoi ?
- Qu'est ce que tu ne noterais jamais nulle part ?
- Si ces notes vivaient dans une application hébergée en ligne, plutôt que dans un
  carnet chez toi, qu'est ce que ça changerait pour toi ?

Cette dernière question est décisive. Si l'idée la met mal à l'aise, l'arbitrage
du brief contre le chiffrement de bout en bout doit être rouvert, ou les notes
sorties du périmètre. Ne pas la rassurer trop vite : laisser l'inconfort
s'exprimer.

### 5. Réactions aux options (20 min) — validation du brief

Présenter les partis pris comme des options extérieures, chacune avec son défaut
annoncé. Pour chacune, demander ce qui ne collerait pas.

- Le rendez vous comme point d'entrée unique : tout part de l'agenda, y compris la
  facturation. Défaut annoncé : si elle pense d'abord « patient » et non « date »,
  la navigation lui sera contre intuitive.
- La discrétion par défaut : initiales plutôt que noms dans les vues d'ensemble,
  verrouillage à portée. Défaut annoncé : lire des initiales est moins confortable.
- Le statut à donner à chaque séance passée, un geste par séance. Défaut annoncé :
  une corvée quotidienne si elle est en retard d'une semaine.
- La comptabilité intégrée. Défaut annoncé : périmètre qui vieillit mal. Vérifier
  ce qu'elle attend réellement de son comptable, et ce que celui ci exige d'elle.

### 6. Clôture (5 min)

- Si un seul de ces tracas disparaissait demain, lequel choisirais tu ?
- Qu'est ce que je ne t'ai pas demandé et que j'aurais dû ?
- Confirmer les documents à récupérer et le délai.

## Synthèse

Avec une seule participante, la cartographie d'affinités et les matrices n'ont
rien à agréger. Deux formats suffisent, à produire dans les quarante huit heures
pendant que le souvenir de la séance est net.

**Une carte du parcours d'une semaine.** Du lundi matin au bouclage de la
facturation : les étapes, les supports mobilisés à chaque étape, le temps réel
mesuré, et les points de friction observés plutôt que déclarés. C'est ce document
qui arbitrera la structure de l'écran d'accueil.

**Une liste de décisions.** Chaque question ouverte du brief reçoit une réponse
tranchée, ou reste explicitement ouverte avec la raison. Format : la décision, ce
qui la fonde dans l'observation, ce qu'elle change dans le brief.

Trois résultats obligent à réviser le brief avant de coder :

- Si elle pense « patient » avant « date », le principe 1 doit être reformulé.
- Si l'hébergement en ligne des notes la met mal à l'aise, l'arbitrage sur le
  chiffrement se rouvre.
- Si le régime conventionné implique un circuit de facturation plus lourd que
  prévu, la phase 2 se scinde en deux.

Les citations valent d'être notées mot pour mot quand elles portent une
contradiction avec le brief. Ce sont celles là qui serviront, pas les
approbations.
