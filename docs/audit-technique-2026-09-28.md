# Revue technique et architecture — 28 septembre 2026

Revue de l'arborescence versionnée, des responsabilités des modules, des scripts,
des migrations D1, des ressources publiques et du README. Les changements de
structure ci-dessous sont limités aux frontières qui séparent déjà des fonctions
indépendantes ; les autres refontes doivent être guidées par des mesures ou des
tests de comportement.

## Structure actuelle

| Emplacement | Rôle | État |
| --- | --- | --- |
| `src/app/` | Pages, routes API, métadonnées et CSS global | Cohérent avec l'App Router. |
| `src/components/` | Assemblage de l'expérience, HUD et hooks de contrôle/synchronisation | `useBusControls.ts` sépare désormais les commandes du bus de `BusExperience.tsx`. |
| `src/components/bus/` | Scène 3D, véhicule, passagers, paysages, caméra, météo, télévision | `BusFront.tsx` isole la face avant fixe de `BusExterior.tsx`, qui gère la carrosserie extensible. |
| `src/components/modals/`, `src/components/theory/` | Fenêtres des passagers et contenu de la théorie | Séparation claire. |
| `src/lib/` | Calculs et ressources partagés | `client/` et `server/` séparent les accès réseau et D1 ; `bus-front-geometry.ts` centralise les cotes de la calandre. |
| `src/types/`, `migrations/` | Types partagés et six migrations D1 ordonnées | Noms et hiérarchie cohérents. |
| `public/`, `scripts/`, `.github/workflows/` | Ressources statiques, tests et CI | Les ressources référencées existent ; les vérifications sont automatisées. |

Convention de noms vérifiée : composants React en `PascalCase`, hooks en `use...`,
fonctions et données partagées en noms descriptifs minuscules, migrations numérotées.
Aucun renommage massif de dossier n'améliorerait à lui seul le fonctionnement.

## Défauts corrigés pendant cette revue

- La calandre montait jusqu'à `Y = 1,24` alors que le cercle de l'emblème descend
  à `Y = 1,22` : elle masquait son bord inférieur. La calandre s'arrête
  maintenant à `Y = 1,17`, soit un espace de `0,05` unité. Les cinq lames restent
  à l'intérieur de leur panneau ; un test contrôle ces contraintes.
- La face avant et les commandes de conduite ont été extraites respectivement
  dans `BusFront.tsx` et `useBusControls.ts`, réduisant la taille des modules
  principaux sans changer les interfaces publiques.
- Les sons et notifications déclenchés depuis des fonctions de mise à jour
  d'état React ont été déplacés dans les gestionnaires d'actions et dans le
  polling. Ils ne dépendent plus d'une éventuelle réexécution de l'updater.
- Le README décrit maintenant le comportement réel de la vidéo et la procédure
  de test. La CI exécute typecheck, lint, tests et compilation sur les PR et `main`.

## Travaux restants, à traiter par priorité

1. **Mesurer le rendu 3D sur appareils réels.** `World.tsx`, `WorldLandmark.tsx`
   et `WorldSetPiece.tsx` créent de nombreuses formes répétées. Relever d'abord
   les draw calls, la mémoire et les temps CPU/GPU, puis instancier les formes
   qui dominent réellement le coût. Une capture fixe ne mesure pas les freezes.
2. **Fusionner les lectures initiales de données.** `useBusSync.ts` lit les
   statistiques puis les profils proches alors que la réponse profils contient
   aussi les statistiques. Garder un repli de statistiques si les profils
   échouent, pour que le compteur et son bouton Réessayer restent utilisables.
3. **Poursuivre les découpages quand une zone change.** `BusExperience.tsx`
   regroupe encore les formulaires et la liste des passagers ;
   `Bus.tsx` contient matériaux, textures et habitacle ; `Passengers.tsx`
   contient sélection, instances et étiquettes ; `BusTv.tsx` regroupe cadre 3D
   et lecteur. Extraire ces responsabilités avec des tests de parcours avant
   de déplacer les fichiers dans de nouveaux sous-dossiers.
4. **Évaluer les ressources au chargement.** Les textures Canvas de `Bus.tsx`
   et le lecteur YouTube préchargé peuvent peser sur le premier affichage.
   Comparer le temps de démarrage avant de choisir des textures préfabriquées
   ou un chargement différé ; préserver le démarrage de la vidéo à l'entrée.
5. **Compléter les tests de comportement.** `static-regression.mjs` vérifie
   surtout des motifs de code. Les transitions caméra, la synchronisation et
   les commandes météo/vitesse gagneraient à être couvertes par des scénarios
   exécutés ; le test navigateur actuel couvre déjà le parcours principal et
   les dimensions du HUD.

La revue ne conclut pas à un gain de FPS : aucun profil CPU/GPU d'appareil réel
n'a été produit. La compilation et les tests du dépôt établissent la validité
fonctionnelle de ces changements, pas une mesure universelle de performance.
