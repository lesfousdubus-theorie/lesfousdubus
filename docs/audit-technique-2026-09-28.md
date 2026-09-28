# Audit technique du projet — 28 septembre 2026

Revue statique du dépôt après les corrections du bus. Le projet compte 56 fichiers dans `src/` et `scripts/`, pour environ 11 000 lignes. Les recommandations de performance ci-dessous sont des pistes à mesurer sur ordinateur et téléphone réels : cette revue ne fournit pas de mesure GPU ou de FPS par appareil.

## Priorité haute

1. **Mesurer puis réduire le coût du décor 3D.** `src/components/bus/World.tsx` crée environ 70 groupes de décors avec `WorldLandmark`, en plus des cinq îles et de `WorldSetPiece`. Plusieurs palmiers, arbres, nuages et bâtiments répètent des géométries. Mesurer les draw calls, le temps CPU/GPU et la mémoire via `WebGLRenderer.info` et le profileur du navigateur, puis instancier les formes répétées et limiter les ombres ou détails éloignés. Dossiers concernés : `src/components/bus/World.tsx`, `WorldLandmark.tsx`, `WorldSetPiece.tsx`.
2. **Simplifier la synchronisation des passagers.** `src/components/useBusSync.ts` lance au démarrage une lecture des statistiques et une lecture des profils ; la réponse des profils contient déjà les statistiques. Regrouper ces lectures éviterait une requête et une lecture D1. Le `setCount` du polling exécute aussi `playStretch` et `showToast` dans une fonction de mise à jour React : déplacer ces effets après la comparaison des états éviterait une exécution répétée lors des vérifications React.
3. **Ajouter une CI GitHub.** Aucun workflow `.github/workflows` n'est présent. Exécuter au minimum `typecheck`, `lint`, `test` et `build:next` sur chaque proposition de changement. Garder le parcours `test:ui` comme contrôle navigateur sur les changements 3D et d'interface.

## Priorité moyenne

4. **Découper le composant principal.** `src/components/BusExperience.tsx` (818 lignes) regroupe la navigation, les contrôles du bus, les passagers, les formulaires, les notifications et les fenêtres. Extraire des hooks distincts pour la navigation, les actions passagers et les fenêtres, puis garder `BusExperience` comme assemblage. Cela réduira les dépendances entre états et facilitera les tests.
5. **Découper la scène et les personnages.** `src/components/bus/Bus.tsx` (environ 650 lignes) mélange matériaux, textures, géométrie, animation et télévisions. `Passengers.tsx` (577 lignes) mélange sélection des places, rendu détaillé, instances et étiquettes. Extraire la géométrie, les ressources et les calculs de places en modules séparés ; conserver les limites d'instances et les transitions stables déjà mises en place.
6. **Revoir les textures créées au chargement.** `Bus.tsx` crée synchroniquement plusieurs `CanvasTexture` via `src/lib/textures.ts` pour les enseignes, la plaque, le tableau de bord et les graffitis. Mesurer le temps de création et la mémoire ; les textures statiques pourraient être préparées en fichiers optimisés dans `public/textures/`. Vérifier la libération des ressources lors d'un remontage de la scène.
7. **Évaluer le préchargement de la télévision.** `src/components/bus/BusTv.tsx` installe le lecteur YouTube avant la première entrée dans le bus pour accélérer la lecture. Mesurer son poids réseau et son coût au démarrage avant de décider si un chargement au premier geste utilisateur serait préférable ; préserver la lecture attendue à l'entrée.
8. **Remplacer les contrôles structurels fragiles par des scénarios.** `scripts/static-regression.mjs` vérifie surtout des expressions dans le code. Compléter avec des tests de comportement pour les transitions caméra, la synchronisation et les commandes météo/vitesse. Les tests D1 et le parcours navigateur existants constituent une bonne base.

## Entretien et organisation

9. **Répartir les fichiers longs par fonction.** `WorldLandmark.tsx` (466 lignes) et `WorldSetPiece.tsx` (292 lignes) peuvent être organisés par île ; `BusTv.tsx` (460 lignes) peut séparer le cadre 3D du lecteur ; `TheoryModal.tsx` (401 lignes) peut séparer la confirmation de sortie et la gestion des onglets. `src/lib/theory-data.ts` (602 lignes) peut être réparti par section pour l'édition ; son interface est déjà chargée à la demande, donc ce découpage vise surtout la maintenance.
10. **Clarifier les dossiers après extraction.** `src/components/bus/` contient à la fois véhicule, caméra, passagers, météo et paysages. Une structure `bus/vehicle/`, `bus/passengers/`, `bus/media/` et `world/` rendrait les responsabilités plus lisibles. Déplacer les fichiers en même temps que les découpages ci-dessus, pas comme migration isolée.
11. **Réduire quelques travaux par image après mesure.** `DayNight.tsx` instancie une `Date` à chaque frame ; l'heure réelle pourrait être actualisée une fois par seconde. `Weather.tsx` réécrit les buffers des particules à chaque frame. Mesurer leur part CPU avant une réécriture.

Ordre conseillé : instrumentation du rendu et CI, puis synchronisation des passagers, optimisation du décor, enfin découpage des composants et ressources.
