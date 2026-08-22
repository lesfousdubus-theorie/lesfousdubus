# Analyse UI / UX — Les Fous du Bus

> Audit rapide du site au 21 août 2026, basé sur l’inspection du code `src/`, des layouts Astro, des pages principales et des composants de navigation/recherche.  
> Tests lancés : `npm test` ✅, `npm run build` ✅. Les tests Playwright n’ont pas pu être exécutés dans ce sandbox car les navigateurs Playwright ne sont pas installés.

## Synthèse

Le site possède un socle UI/UX nettement au-dessus d’un wiki statique classique : identité visuelle forte, thème sombre/clair, recherche clavier, navigation latérale, table des matières, mode zen, barre de progression, breadcrumbs, pages hub, filtres de dossiers et plusieurs visualisations. L’expérience est déjà utilisable et cohérente pour un lecteur motivé.

Les principaux freins restants ne sont pas des problèmes graphiques isolés, mais des points d’architecture d’information et de charge cognitive : trop de portes d’entrée, des outils visuels parfois trop denses, une navigation mobile encore centrée sur l’arborescence encyclopédique, et quelques incohérences de données qui affectent directement l’interface.

---

## Points forts

### 1. Identité éditoriale claire

- Palette « Mer & Encre » mémorisable.
- Couple typographique Manrope / Fraunces adapté au ton éditorial.
- Les cartes, badges et surfaces créent une ambiance de wiki narratif plutôt qu’un simple blog.
- Le contraste des tokens principaux est couvert par des tests unitaires.

### 2. Bonnes bases d’accessibilité

- Skip-link vers le contenu principal.
- Focus visibles sur de nombreux composants interactifs.
- Respect de `prefers-reduced-motion` sur plusieurs animations.
- Gestion `inert` / focus trap sur les tiroirs mobile et sommaire.
- Boutons séparés dans la navbar desktop : le lien navigue, le caret ouvre le dropdown.
- Version textuelle sous certaines visualisations.

### 3. UX de lecture réussie côté articles

- Layout wiki avec sidebar gauche et sommaire droit.
- Mode zen utile pour les longs textes.
- Barre de progression de lecture.
- Breadcrumbs avec catégorie pour les articles.
- Articles liés, références chapitres et parcours de lecture en fin de page.

### 4. Recherche déjà avancée

- Ouverture au clavier via Ctrl/⌘ K.
- Alias orthographiques utiles : Ponéglyphe, Laugh Tale, Mary Geoise, etc.
- Recherches récentes et sujets populaires.
- Message vide avec CTA vers les dossiers.

### 5. Pages hub mieux structurées qu’avant

- `/dossiers` propose recherche + filtre + catégories repliées.
- `/chapitres` liste maintenant le chapitre 1185 à sa place chronologique.
- `/theorie` propose une logique de niveaux de lecture.
- `/explorer` sépare outils principaux et schémas spécialisés.

---

## Problèmes prioritaires

### P0 — Bug d’interface sur `/theorie`

Dans `src/data/siteNavigation.ts`, `understandingPaths` contient deux entrées identiques « Frise chronologique » :

- entrée 2 : Frise chronologique ;
- entrée 3 : Frise chronologique à nouveau ;
- entrée 4 : Démonstration complète.

Or `src/pages/theorie/index.astro` prévoit seulement trois icônes : `['⚡', '🧭', '📚']`.

Effet UX probable : la page annonce « Trois façons de comprendre », mais peut générer quatre cartes, avec une répétition et une icône manquante sur la dernière.

**Correction recommandée :** supprimer le doublon et garder exactement :

1. Résumé en 10 points ;
2. Frise chronologique ;
3. Démonstration complète.

### P0 — Trop de portes d’entrée concurrentes

Le site propose plusieurs chemins : accueil, `/theorie`, sidebar « Commencer », navbar, Explorer, dossiers. Ils sont tous pertinents, mais leur hiérarchie n’est pas parfaitement nette.

Exemples :

- Accueil : Résumé → Chronologie → Théorie complète.
- `/theorie` : niveaux de lecture, mais actuellement perturbés par le doublon.
- Sidebar : Présentation → Résumé → Théorie complète → Frise → Carte mentale.
- Navbar : Résumé → Théorie complète → Chronologie.

**Risque :** un nouveau lecteur ne sait pas si la prochaine étape après le résumé est la chronologie, la carte mentale ou la théorie complète.

**Correction recommandée :** formaliser un parcours canonique unique et le répéter partout :

> Résumé → Chronologie → Théorie complète → Explorer / Dossiers.

### P1 — Accueil encore dense avant la lecture réelle

L’accueil est séduisant, mais le premier écran concentre : hero, trois CTA, vidéo, bannière du dernier chapitre, grille de compréhension, dossiers, articles récents.

La vidéo en façade est propre techniquement, mais elle occupe beaucoup d’espace avant l’accès aux contenus textuels. Pour un wiki, la valeur perçue vient surtout de la capacité à comprendre et naviguer vite.

**Correction recommandée :**

- garder un CTA primaire unique : « Lire le résumé » ;
- rendre « Chronologie » et « Théorie complète » secondaires ;
- descendre la vidéo après le bloc « Comprendre la théorie » ou la rendre plus compacte ;
- ajouter un mini-bloc « Nouveau ici ? Commencez par… ».

### P1 — Navigation mobile : utile, mais très encyclopédique

Sur les pages avec sidebar, le hamburger ouvre surtout l’arborescence wiki. C’est cohérent pour les articles, mais moins idéal pour un utilisateur mobile qui cherche une section globale : Théorie, Dossiers, Chapitres, Explorer, Aide.

La sidebar a gagné des détails repliés, un focus correct, un overlay, un bouton fermer et un swipe de fermeture. En revanche, il n’y a pas de filtre local dans le tiroir.

**Correction recommandée :**

- ajouter un champ « Filtrer les fiches » dans le drawer mobile ;
- afficher en tête du tiroir les 5 sections globales ;
- garder l’arbre wiki en dessous.

### P1 — Les outils Explorer promettent plus qu’ils ne peuvent livrer sur mobile

La page `/explorer` vend une promesse forte : « Manipulez-la ». C’est bon marketing, mais les visualisations lourdes — carte mentale, frise, schémas — restent probablement exigeantes au pouce : densité, zoom/pan, légendes, nombreux nœuds et catégories.

**Correction recommandée :**

- prévoir une version mobile orientée « parcours guidé » plutôt qu’un canvas dense ;
- afficher d’abord 3–5 questions (« Où est Joy Boy ? », « Que prouvent les Ponéglyphes ? ») ;
- garder la visualisation complète comme mode avancé ;
- rendre la légende sticky sur mobile.

### P1 — Cohérence des libellés et microcopies

Quelques libellés varient selon les pages :

- « Frise chronologique » vs « Chronologie » ;
- « Théorie complète » vs « Démonstration complète » ;
- « Dossiers » vs « Bibliothèque de la théorie » ;
- « Explorer visuellement » vs « Laboratoire visuel ».

Les variations ne bloquent pas, mais augmentent la charge cognitive.

**Correction recommandée :** créer une petite table de libellés canoniques dans `siteNavigation.ts` et l’utiliser dans les hubs/navbars/sidebars.

---

## Analyse par zone

## Accueil

### Ce qui fonctionne

- Le hero pose bien la promesse centrale.
- La hiérarchie des CTA est globalement claire.
- Les cartes « Comprendre la théorie » donnent un chemin actionnable.
- Les dossiers rendent visible la richesse du corpus.

### À améliorer

- La vidéo peut retarder l’accès au contenu utile.
- Le bloc « articles récents » est intéressant pour les habitués, moins pour les nouveaux.
- Le dernier chapitre analysé attire vers l’actualité alors que la promesse principale est la compréhension de la théorie.

### Recommandation

Réorganiser l’accueil en deux modes mentaux :

1. **Nouveau lecteur** : Résumé → Chronologie → Théorie complète.
2. **Lecteur à jour** : Dernier chapitre → articles mis à jour.

---

## Page `/theorie`

### Ce qui fonctionne

- Le concept « trois façons de comprendre » est excellent.
- Les cartes de niveau sont lisibles.
- La section « Après la lecture » relie bien théorie, dossiers et explorer.

### À corriger

- Doublon dans `understandingPaths`.
- Le terme « Niveau » peut donner une impression scolaire ; « Étape » ou « Parcours » serait plus doux.
- Les durées ne sont plus affichées partout : mieux vaut soit les retirer complètement, soit les rendre fiables.

---

## Dossiers

### Ce qui fonctionne

- Recherche locale + select thématique : très bonne décision UX.
- Catégories repliées : réduit la liste infinie.
- Compteur de résultats : rassurant.
- Accès rapide par thème : utile.

### À améliorer

- Le finder sticky peut prendre beaucoup de place sur petits écrans.
- Les catégories repliées rendent certains piliers invisibles tant qu’on n’ouvre pas.
- Les emoji d’icônes varient visuellement selon OS.

### Recommandation

Sur mobile : rendre le finder plus compact après scroll, ou le transformer en barre condensée.

---

## Chapitres

### Ce qui fonctionne

- Liste simple et efficace.
- Badges « Chap » et effet de l’analyse utiles.
- Chapitre 1185 explicitement traité comme absence source, à sa place.

### À améliorer

- Les liens « Prédictions et hypothèses » / « Articles mis à jour » sont discrets alors qu’ils servent deux usages très importants.
- La liste pourrait bénéficier d’un filtre par effet : nouvelle piste, approfondissement, modification.

---

## Explorer

### Ce qui fonctionne

- Séparation outils principaux / schémas spécialisés.
- Promesse claire.
- Bon lien de retour vers les dossiers pour les arguments détaillés.

### À améliorer

- Les 8 schémas spécialisés sont cachés derrière un `<details>` ; c’est propre, mais certains contenus majeurs deviennent invisibles.
- « Manipulez-la » crée une attente forte sur mobile.
- La distinction entre outil principal et schéma spécialisé doit rester explicite sur chaque page outil.

---

## Articles

### Ce qui fonctionne

- Expérience de lecture robuste.
- Mode zen très utile.
- Sommaire desktop + FAB mobile.
- Références chapitres et articles liés donnent de la profondeur.

### À améliorer

- Fin d’article potentiellement trop chargée : parcours, articles liés, chapitres, partage, footer.
- Les badges/niveaux de certitude gagneraient à avoir une légende toujours accessible.
- Le temps de lecture doit idéalement être calculé par nombre de mots réel, pas par structure.

---

## UI visuelle

### Points forts

- Belle cohérence des surfaces.
- Bon usage des tokens CSS.
- Les H1 des hubs ont été ramenés à des tailles raisonnables.
- Le thème clair existe vraiment, pas seulement en inversion minimale.

### Points à peaufiner

- Remplacer progressivement les emoji par des SVG monochromes cohérents.
- Éviter les `font-weight` non disponibles dans les imports (`850`, `780`, `750`, `650`, `550`) : Manrope est importée en 400/500/600/700/800. Les poids intermédiaires peuvent être synthétisés par le navigateur.
- Limiter les effets de hover `translateY` répétitifs : tout bouge un peu de la même manière.
- Vérifier les gradients textuels uniquement sur de grands titres décoratifs, pas sur du texte informatif.

---

## Accessibilité restante

| Sujet | Évaluation |
|---|---|
| Navigation clavier | Bonne base : focus, Échap, trap, inert. À confirmer en E2E une fois Chromium installé. |
| Recherche | Bonne, mais le panneau custom reste moins robuste qu’un `<dialog>` natif. |
| Sidebar mobile | Correcte, manque surtout un filtre local. |
| Visualisations | Zone la plus fragile : densité, tabulation, zoom/pan mobile. |
| Tables | `display: block` sur tables peut dégrader la sémantique pour certains lecteurs d’écran. |
| Motion | Plusieurs protections existent ; garder la vigilance sur reveal/stagger. |

---

## Performance perçue

### Positif

- Build statique Astro rapide.
- Fonts self-hosted en subset latin.
- Pagefind chargé à la demande.
- YouTube chargé au clic via façade.

### À surveiller

- Composants visuels lourds, notamment la timeline interactive.
- Animations reveal sur beaucoup d’éléments : joli, mais peut donner une impression de contenu retardé.
- Fond décoratif et blur/backdrop-filter : à surveiller sur mobile bas de gamme.

---

## Priorisation proposée

### Sprint 1 — corrections UX à fort impact

1. Supprimer le doublon `understandingPaths`.
2. Unifier le parcours canonique : Résumé → Chronologie → Théorie complète.
3. Harmoniser les libellés : Chronologie / Frise, Théorie complète / Démonstration.
4. Ajouter un filtre dans la sidebar mobile.
5. Rendre les liens prédictions/modifications plus visibles sur `/chapitres`.

### Sprint 2 — lisibilité et design system

1. Remplacer les poids typographiques non importés.
2. Créer des icônes SVG simples pour remplacer les emoji principaux.
3. Ajouter une légende permanente des niveaux de certitude dans les articles.
4. Alléger la fin d’article.
5. Compactifier le finder des dossiers en mobile.

### Sprint 3 — outils visuels

1. Créer un mode mobile guidé pour la carte mentale.
2. Ajouter une légende sticky dans les visualisations.
3. Réduire le nombre d’éléments visibles au premier chargement mobile.
4. Ajouter un chemin narratif dans Explorer : « comprendre le temps », « comprendre les armes », « comprendre Imu ».

---

## Verdict

Le site est déjà solide, avec une vraie direction artistique et une UX de lecture avancée. La prochaine étape n’est pas une refonte visuelle : c’est une consolidation de l’architecture d’information.

Priorité absolue : corriger le doublon de parcours sur `/theorie`, puis faire en sorte que l’accueil, la navbar, la sidebar et les hubs racontent tous le même chemin de lecture. Une fois ce socle unifié, les améliorations mobile d’Explorer et de la sidebar auront beaucoup plus d’impact.
