# Restructuration du site Les Fous du Bus

## Vue d'ensemble

Le site a été entièrement restructuré selon les spécifications fournies, avec une navbar fondée sur les usages du site et une sidebar fondée sur les sujets de la théorie.

## Changements principaux

### 1. Navbar (fondée sur les usages)

**Avant :** `La théorie` | `Explorer` | `Évolution` | `Vérifier`

**Après :** `La théorie` | `Dossiers` | `Chapitres` | `Explorer` + `[Recherche]` + `[Dernière analyse]`

La nouvelle navbar reflète les usages principaux :
- **Dossiers** : pour atteindre directement un sujet précis
- **Chapitres** : pour suivre l'évolution avec le manga
- **Dernière analyse** : accès rapide au chapitre le plus récent

### 2. Sidebar (fondée sur les sujets de la théorie)

**Avant :** Sections par type de contenu (Fondations, Figures, Armes, etc.)

**Après :** Sections collapsibles suivant l'ordre naturel de la démonstration :

1. **COMMENCER** — Présentation, Résumé, Théorie complète, Carte mentale, Lexique
2. **MONDE ET DESTINATIONS** — Blue Star, Grand Line, Laugh Tale, Lodestar, One Piece, etc.
3. **HISTOIRE, TEMPS ET PONÉGLYPHES** — Siècle oublié, Royaume antique, Ponéglyphes, voyage temporel
4. **FIGURES PRINCIPALES** — Luffy, Joy Boy, Nika, Roger, Imu
5. **PERSONNAGES ET IDENTITÉS** — Shirahoshi, Vivi, Teach, Zoro, Brook, Loki
6. **ARMES ANTIQUES** — Poséidon, Pluton, Uranus, Noah, Mother Flame
7. **TECHNOLOGIES ET POUVOIRS** — Vegapunk, Fruits du Démon, Emeth, Omen
8. **PEUPLES, ROYAUMES ET TÉMOINS** — Elbaf, Alabasta, Wa no Kuni, Zou, Zunesha
9. **DIEUX ET CROYANCES** — Nika, Gorosei, Dragons Célestes, foi et divinisation
10. **TRANSMISSION ET MÉMOIRE** — Volonté héritée, promesses, Binks no Sake, voix de Joy Boy
11. **GOUVERNEMENT MONDIAL** — Imu, Vingt Rois, Gorosei, Mary Geoise
12. **GUERRE FINALE** — Grande Guerre, Déluge, destruction de Red Line, coalition de Joy Boy

### 3. Nouvelles sections de navigation

#### Dossiers (`/dossiers`)
Hub central pour atteindre directement un sujet précis. Organisé par catégories thématiques avec des liens vers chaque dossier individuel (pages placeholder créées).

#### Chapitres (`/chapitres`) — remplace Évolution
- **Dernière analyse** — Le chapitre le plus récent
- **Toutes les analyses** — Liste complète
- **Prédictions** — Statut des prédictions
- **Modifications** — Changements apportés aux articles
- **Contradictions** — Éléments qui contredisent la théorie
- **Hypothèses abandonnées** — Pistes réfutées

#### Explorer (`/explorer`) — mis à jour
- Carte mentale
- Chronologie
- Carte du monde
- Graphe des personnages
- Graphe des correspondances
- Schéma des Ponéglyphes
- Fresque d'Elbaf

### 4. Nouvelles pages créées

- `/theorie/resume` — Résumé condensé de la théorie en 10 points
- `/theorie/theorie-complete` — Sommaire avec ordre de lecture recommandé
- `/dossiers/[slug]` — 150+ pages placeholder pour chaque sujet de la théorie
- `/chapitres/[chapter]` — Pages individuelles pour chaque chapitre analysé

### 5. Catégories d'articles mises à jour

Les articles existants ont été migrés vers les nouvelles catégories :

| Ancienne catégorie | Nouvelle catégorie |
|-------------------|-------------------|
| `fondations` | `monde-destinations` |
| `figures-identites` | `figures-principales` |
| `science-energie` | `technologies-pouvoirs` |
| `monde-peuples` | `peuples-royaumes` |
| `gouvernement-guerre` | `gouvernement-mondial` ou `guerre-finale` |
| `transmission-memoire` | `transmission-memoire` (inchangé) |

### 6. Intitulés neutres

Tous les intitulés utilisent désormais des noms neutres comme spécifié :
- ✅ "Joy Boy" (pas "Luffy est Joy Boy")
- ✅ "Laugh Tale" (pas "Laugh Tale n'existe pas encore")
- ✅ "Royaume antique" (pas "Le Royaume antique a prédit l'avenir")

Les conclusions de la théorie restent à l'intérieur des articles, pas dans les titres de navigation.

## Structure des fichiers

```
src/
├── components/
│   ├── Navbar.astro (mis à jour)
│   ├── SidebarNav.astro (entièrement refactorisé)
│   └── ...
├── pages/
│   ├── index.astro (mis à jour)
│   ├── theorie/
│   │   ├── index.astro (sommaire complet)
│   │   ├── resume.astro (nouveau)
│   │   ├── theorie-complete.astro (nouveau)
│   │   └── [...slug].astro (articles)
│   ├── dossiers/
│   │   ├── index.astro (nouveau)
│   │   └── [...slug].astro (nouveau, 150+ pages)
│   ├── chapitres/ (nouveau, remplace /evolution)
│   │   ├── index.astro
│   │   ├── [page].astro
│   │   └── [chapter].astro
│   ├── explorer/ (mis à jour)
│   │   ├── index.astro
│   │   └── [page].astro
│   └── verifier/ (mis à jour)
│       ├── index.astro
│       └── [page].astro
└── content.config.ts (catégories mises à jour)
```

## Résultat

- **116 pages** générées avec succès (`npm run build`)
- **Build** : ✅ Pas d'erreurs
- **Tests** : ✅ Tous les tests passent (63/63, 4 fichiers)
- **TypeScript** : ✅ `astro check` — 0 erreur, 0 warning, 0 hint
- **Validation** : ✅ `npm run validate` — 131 fichiers vérifiés, 0 erreur

## Ordre de lecture recommandé

La démonstration complète est structurée en **22 chapitres** sur `/theorie/theorie-complete`. Les 16 étapes de `/theorie` servent d'orientation rapide vers les articles-clés. Le parcours de lecture (READING_PATH, 19 fiches) alimente la navigation séquentielle entre fiches neutres.

L'ordre n'est pas chronologique dans l'univers, mais c'est l'ordre nécessaire pour **comprendre le raisonnement**.
