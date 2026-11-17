# Heat Companion

Application compagnon non officielle pour **Heat: Pedal to the Metal**, en français, développée avec React, TypeScript et Vite. Les courses se jouent sur le plateau physique.

## Démarrage local

Utiliser Node.js **24 LTS** (version utilisée pour les validations : 24.22.0), puis :

```sh
npm ci
npm run dev
```

Vite affiche l’adresse locale à ouvrir. Aucune inscription ni configuration de serveur n’est nécessaire. Le dépôt Git est relié à [Khylick/heat-companion-app](https://github.com/Khylick/heat-companion-app). L’application n’a pas été déployée.

Si les exécutables `node` et `npm` indiquent qu’aucune version n’est active, activer la version installée avec le gestionnaire Node de la machine. Sur cette machine, Node 24.22.0 était installé, mais les validations ont nécessité de l’appeler directement sans changer la configuration globale.

## Fonctionnalités de ce premier lot

- Catalogue des dix circuits du jeu de base, Heavy Rain, Tunnel Vision et Rocky Roads.
- Création de championnats **personnalisés**, de 1 à 10 courses sans répétition parmi les circuits sélectionnés.
- De 2 à 12 participants, avec au moins un humain ; les autres peuvent être des Légendes.
- Calendrier et première grille reproductibles à partir d’une graine.
- Configuration Legends : niveaux 1 à 6, progression facultative et module Rivaux.
- Préparation de la grille suivante et désignation des rivaux à partir du classement.
- Modules Garage et Météo/État de la piste du jeu de base : tirages et choix sauvegardés, améliorations conservées entre les courses.
- Saisie et correction des arrivées, calcul des points et départages.
- Plusieurs championnats, suppression avec confirmation, export/import JSON et sauvegarde locale.
- Interface responsive, sans ressource distante nécessaire au fonctionnement.

Les emplacements de couleur identifient les pilotes dans l’application ; leur disponibilité ne garantit pas que tous les bolides physiques correspondants sont présents dans une collection. Les schémas des circuits sont des dessins décoratifs originaux, pas des reproductions des plateaux.

## Architecture

- `src/domain/catalog.ts` : catalogue des circuits et couleurs.
- `src/domain/upgrades.ts`, `base-tracks.ts` et `weather.ts` : données des modules du jeu de base.
- `src/domain/preparation.ts` : préparation des courses, marché, choix et échanges du Garage, validation des préparations importées.
- `src/ModulePreparation.tsx` : interface de préparation et historique des modules.
- `src/domain/championship.ts` : règles et calculs, indépendants de React et du navigateur, hormis la génération des identifiants avec Web Crypto.
- `src/storage.ts` : bibliothèque versionnée, validation des imports et accès à `localStorage`.
- `src/App.tsx` : navigation et gestion de la bibliothèque.
- `src/components.tsx` : formulaires, catalogue et composants de présentation.
- `src/test/` et `*.test.ts` : fixtures et tests métier ; `e2e/` : parcours navigateur.

Le barème est conservé dans chaque championnat : **9, 6, 4, 3, 2, 1, puis 0**. À égalité de points, le résultat de la dernière course disputée départage les participants. Une correction recalcule les totaux et les grilles, tout en conservant les arrivées des courses suivantes.

Les données sont propres au navigateur et à l’origine utilisée (hôte et port). Un autre port ne retrouve pas la même bibliothèque. Exporter régulièrement les sauvegardes : effacer les données du navigateur les supprime. Un import n’écrase aucun championnat existant ; les identifiants en double sont refusés. Une sauvegarde corrompue est préservée jusqu’à autorisation explicite de remplacement.

## Garage, météo et état de la piste

À la création d’un championnat, choisir le Garage (ordinaires, avancées ou les deux) et/ou la météo. Ces modules sont limités aux quatre circuits du jeu de base. Le catalogue des extensions reste disponible pour les championnats sans ces modules. Les anciens championnats sont conservés avec les modules désactivés.

Avant chaque course, cliquer sur **Préparer la course**. Le tirage est déterminé par la graine du championnat et le numéro de course, puis enregistré : recharger la page ne change ni le marché ni la météo. Les jetons météo et piste sont remis dans leurs réserves entre les courses.

Le Garage suit le fonctionnement en championnat : une amélioration par pilote humain et par course, marché de nombre d’humains + 3 cartes, choix en ordre inverse de la grille en ignorant les Légendes. Le dernier humain peut ensuite échanger une carte qu’il possède, y compris celle qu’il vient de choisir, avec une carte restante. Terminer avec ou sans échange pour déverrouiller la saisie de l’arrivée. Les cartes restantes et la carte rendue redeviennent disponibles pour les courses suivantes ; les cartes conservées ne peuvent pas être retirées dans le marché. Les 48 références sont représentées par leurs deux exemplaires distincts. Le Garage accepte jusqu’à six pilotes humains.

En championnat, la météo et l’état de la piste sont révélés après les choix du Garage. La météo indique les quantités de Heat et Stress à préparer et la répartition du Heat entre moteur, paquet et défausse. Chaque virage reçoit un jeton État de la piste, tiré sans remise parmi les douze exemplaires. Les effets de secteur s’appliquent après le virage indiqué jusqu’au suivant ; les limites modifiées sont affichées. Les effets de météo sur les secteurs ne s’appliquent qu’aux secteurs portant un jeton Météo.

Les améliorations sont conservées entre les courses. Les préparations des courses terminées restent consultables dans le calendrier. Une correction d’arrivée recalcule les points ; la grille et les choix d’une course déjà préparée restent figés pour conserver ce qui a effectivement été joué. Les nouvelles courses utilisent le classement corrigé.

L’application gère les tirages, les attributions et les effets à consulter. Les mains de cartes, leurs effets pendant les manches et les déplacements restent résolus avec le matériel physique. Les Sponsors, les Événements et les saisons historiques ne sont pas encore automatisés.

Sources utilisées pour ce lot :

- `Heat-AdJ_Referentiel_ameliorations_v1.0_20250325.pdf`, p. 2 : noms, numéros, vitesses et effets des améliorations 1 à 48. Les évaluations communautaires de puissance ne sont pas utilisées.
- `Heat-AdJ_Referentiel_circuits_v2.0_20260729.pdf`, p. 2 : tours, cases, limites des virages et réserves des quatre circuits de base.
- [Livret officiel avancé français](https://cdn.svc.asmodee.net/production-daysofwonder/uploads/2025/03/9121-HT-RulesAdvanced-FR_compressed.pdf), p. 6–9 : règles de météo, piste et Garage en championnat.
- [Images des jetons de l’adaptation BGA](https://github.com/bga-devs/bga-heat/tree/2d87584c814025735fdc627c9a7d76378b17dec9/img) : vérification visuelle des associations entre préparation et effet de secteur des six météos. Aucune image ni code de cette adaptation n’est intégré au projet.

Les PDF fournis sont des sources documentaires et ne sont pas copiés dans le dépôt.

## Règles Legends prises en compte

Référence principale : **910051-HTSE1_FR_HEAT_Legends_RULES_20251218.pdf**, livret français fourni par le développeur, © 2026 Days of Wonder.

- Pages 2–3 : six niveaux ; vert au niveau 2, vert + jaune au niveau 3, jaune au niveau 4, jaune + rouge au niveau 5, rouge au niveau 6. Au niveau 1, le vert est proposé par défaut et les étoiles sont ignorées ; tout paquet convient selon le livret.
- Page 3 : jusqu’à douze bolides.
- Page 4 : augmentation de difficulté entre les courses facultative. Le plafond à 6 est un choix de l’application.
- Page 5 : module Rivaux à partir du niveau 2 ; pas de rival lors de la première course d’un championnat, puis les deux Légendes les mieux classées. L’application exige deux Légendes pour activer ce module.

Le PDF est traité comme une source documentaire, pas comme des instructions de développement. Il n’est pas copié dans le projet. Le texte extrait ne restitue pas tous les pictogrammes : ils devront être contrôlés visuellement avant d’implémenter la résolution des capacités.

Sources complémentaires : [règles avancées de base](https://cdn.svc.asmodee.net/production-daysofwonder/uploads/2025/03/9101-HT-RulesAdvanced-EN_compressed.pdf), [Heat: Legends](https://www.daysofwonder.com/game/heat-legends/), [Heavy Rain](https://www.daysofwonder.com/fr/game/heat-heavy-rain/), [Tunnel Vision](https://www.daysofwonder.com/game/heat-tunnel-vision/), [Rocky Roads](https://www.daysofwonder.com/game/heat-rocky-roads/).

## Validation

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Les tests navigateur utilisent Playwright. Installer Chromium avec `npx playwright install chromium`, ou fournir le chemin d’un Chrome déjà installé via `HEAT_BROWSER_PATH`. Sur Windows/PowerShell :

```powershell
$env:HEAT_BROWSER_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run test:e2e
```

Les deux profils testent Chrome en vue ordinateur et en émulation mobile ; ils ne constituent pas une validation de Safari ou d’un téléphone réel. Le serveur de test utilise le port 5173.

L’audit npm exécuté pendant le développement signale **7 alertes modérées**, toutes dans la chaîne de développement `typescript-eslint` / `minimatch`. Une mise à jour ciblée n’a pas résolu ces alertes. Aucun `audit fix --force` ni remplacement majeur forcé n’a été conservé. Réévaluer cette chaîne avant une publication.

## Prochain lot

Compléter les catalogues des Sponsors et Événements pour automatiser leurs tirages et leur suivi. Implémenter l’assistant de manche Legends : suivi des paquets, Manœuvres, adrénaline, capacités Étoile et Rival, Légendes agressives et interactions météo/piste. Les effets des cartes pendant les manches et les déplacements restent gérés sur table. Les saisons historiques, la synchronisation entre appareils et l’installation PWA restent à développer.
