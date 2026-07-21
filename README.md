# Les Fous du Bus

## Le Siècle oublié est le présent

> Wiki éditorial et interactif consacré à une théorie sur *One Piece* : le Siècle oublié ne serait pas un événement ancien qui se répète, mais l’histoire que Luffy et ses alliés sont en train de créer.

[Site](https://lesfousdubus.sbs) · [Dépôt GitHub](https://github.com/lesfousdubus-theorie/lesfousdubus) · [Vidéo originale](https://youtu.be/SgJ25zjMJyo) · [Compte X](https://x.com/FoudubusTV_)

**Statut :** conception et développement de la première version.

Le projet est ouvert : chacun peut consulter le code, proposer des changements, créer sa propre version ou réutiliser librement les créations originales du dépôt.

---

## Sommaire

- [Identité du projet](#identité-du-projet)
- [Origine de la théorie](#origine-de-la-théorie)
- [Objectifs](#objectifs)
- [Fonctionnalités prévues](#fonctionnalités-prévues)
- [Architecture du site](#architecture-du-site)
- [Interface](#interface)
- [Direction artistique](#direction-artistique)
- [Stack technique](#stack-technique)
- [Structure cible du dépôt](#structure-cible-du-dépôt)
- [Installation locale](#installation-locale)
- [Organisation du contenu](#organisation-du-contenu)
- [Images avec Cloudflare R2](#images-avec-cloudflare-r2)
- [Déploiement](#déploiement)
- [Mise à jour de la théorie](#mise-à-jour-de-la-théorie)
- [Contribution](#contribution)
- [Feuille de route](#feuille-de-route)
- [Attribution et licence](#attribution-et-licence)

---

## Identité du projet

| Élément | Valeur |
|---|---|
| Nom du site | **Les Fous du Bus** |
| Titre principal | **Le Siècle oublié est le présent** |
| Sous-titre | **Une théorie sur la véritable chronologie de One Piece** |
| Domaine | **https://lesfousdubus.sbs** |
| Dépôt | **https://github.com/lesfousdubus-theorie/lesfousdubus** |

### Utilisation du nom

- Navbar : **Les Fous du Bus**
- Accueil : **Le Siècle oublié est le présent**
- Onglet d’accueil : `Le Siècle oublié est le présent | Les Fous du Bus`
- Onglet d’un article : `Joy Boy | Les Fous du Bus`

---

## Origine de la théorie

La théorie est attribuée au **Mont Corvo** et provient de la vidéo :

- [Le Siècle oublié est le présent](https://youtu.be/SgJ25zjMJyo)

Le compte [Fou du Bus TV](https://x.com/FoudubusTV_) permet de suivre les échanges et les actualités autour de la théorie.

Le site a pour objectif de structurer, documenter, développer et faire évoluer cette théorie au fil des nouveaux chapitres de *One Piece*.

---

## Objectifs

Le site doit permettre de :

- **comprendre** la version actuelle de la théorie ;
- **explorer** les liens entre personnages, lieux, événements et époques ;
- **suivre** l’apport de chaque nouveau chapitre ;
- **vérifier** les preuves, citations, objections et contradictions.

### Principes

- **Une seule source de vérité :** une information n’est enregistrée qu’une fois, puis réutilisée partout où elle est nécessaire.
- **Une page canonique :** un sujet peut être accessible depuis plusieurs catégories sans être dupliqué.
- **Le contenu avant les effets :** les articles doivent rester lisibles sans animation ni rendu 3D.
- **Transparence :** les contradictions, corrections et prédictions réfutées restent visibles.
- **Progressivité :** le HTML statique constitue la base ; l’interactivité est chargée uniquement lorsqu’elle apporte une réelle valeur.
- **Ouverture :** les Issues et Pull Requests servent à faire évoluer le projet.

---

## Fonctionnalités prévues

Les fonctionnalités ci-dessous représentent la cible du projet. Leur état d’avancement est indiqué dans la [feuille de route](#feuille-de-route).

### Wiki éditorial

- Articles Markdown et MDX reliés entre eux.
- Navbar fixe avec recherche globale.
- Sidebar gauche pour naviguer dans le site.
- Sidebar droite pour parcourir le sommaire de l’article.
- Fil d’Ariane, articles liés et chapitres liés.
- Glossaire, FAQ, objections et contradictions.

### Suivi de la théorie

- Analyse chapitre par chapitre.
- Historique des modifications.
- Tableau des prédictions.
- Base de preuves et de citations.
- Statuts : renforcement, nouvelle piste, modification, contradiction, réfutation ou aucun apport majeur.

### Exploration

- Double frise chronologique.
- Carte interactive du monde.
- Graphe des personnages et des identités.
- Schéma de la boucle temporelle des Ponéglyphes.
- Exploration de la fresque d’Elbaf.
- Globe 3D de Blue Star.

### Confort de lecture

- Recherche avec `Ctrl/⌘ + K`.
- Filtres par chapitre, personnage, thème et niveau de certitude.
- Réglage anti-spoilers.
- Mode clair et sombre.
- Réduction des animations.
- Interface responsive.

Le réglage anti-spoilers constitue une aide de navigation et non une protection absolue : les URL, métadonnées et résultats de recherche doivent néanmoins éviter de révéler inutilement les contenus masqués.

---

## Architecture du site

```text
Accueil
│
├── La théorie
│   ├── Fondations
│   ├── Figures et identités
│   ├── Armes antiques
│   ├── Science, énergie et pouvoirs
│   ├── Monde, peuples et témoins
│   ├── Transmission, voix et mémoire
│   └── Gouvernement et guerre finale
│
├── Explorer
│   ├── Frises chronologiques
│   ├── Carte du monde
│   ├── Carte des personnages
│   ├── Schémas temporels
│   ├── Fresque d’Elbaf
│   └── Globe 3D
│
├── Évolution
│   ├── Chapitre par chapitre
│   ├── Dernière mise à jour
│   ├── Prédictions
│   ├── Historique des articles
│   └── Hypothèses abandonnées
│
├── Vérifier
│   ├── Pièces du puzzle
│   ├── Citations et scènes
│   ├── Parallèles visuels
│   ├── Objections
│   ├── Contradictions
│   └── Sources et méthode
│
└── Aide
    ├── FAQ
    ├── Glossaire
    ├── À propos
    ├── Crédits
    └── Proposer une correction
```

Exemple : **Shirahoshi est Poséidon** appartient principalement aux Armes antiques, mais sa page est également accessible depuis les personnages, l’île des Hommes-Poissons, Noah et Joy Boy.

---

## Interface

Sur les grands écrans, le site utilise une grille à trois colonnes sous une navbar fixe :

```text
┌──────────────────────────────────────────────────────────────┐
│ Navbar                                                       │
├───────────────┬──────────────────────────────┬───────────────┤
│ Sidebar       │ Article                      │ Sommaire      │
│ gauche        │                              │ de l’article  │
└───────────────┴──────────────────────────────┴───────────────┘
```

### Navbar

- logo et retour à l’accueil ;
- ouverture de la navigation ;
- recherche globale ;
- accès au dernier chapitre analysé ;
- réglage anti-spoilers ;
- mode clair ou sombre ;
- accès à la FAQ, au glossaire et aux sources.

### Sidebar gauche

- fixée sous la navbar et contre le bord gauche ;
- catégories dépliables ;
- page active clairement indiquée ;
- défilement indépendant ;
- largeur cible : `260–290 px` ;
- repliable ou masquable.

### Article

- largeur de lecture cible : `720–820 px` ;
- images et visualisations autorisées à dépasser ponctuellement ;
- fil d’Ariane, titre, résumé et métadonnées en haut ;
- articles liés et poursuite de lecture en bas.

### Sidebar droite

- sommaire généré depuis les titres de la page ;
- section courante mise en évidence ;
- position `sticky` sous la navbar ;
- largeur cible : `210–250 px` ;
- dernière mise à jour, temps de lecture et niveau de certitude ;
- masquée pour les articles courts.

### Responsive

```text
Grand écran : sidebar gauche + article + sidebar droite
Écran moyen : sidebar gauche + article, sommaire escamotable
Tablette    : article, navigation et sommaire en panneaux
Mobile      : article, bouton menu et bouton sommaire
```

---

## Direction artistique

L’identité visuelle doit reprendre l’ambiance de la miniature de la vidéo originale :

![Référence visuelle du thème](https://i.ytimg.com/vi/SgJ25zjMJyo/maxresdefault.jpg)

La miniature sert de **référence artistique**, sans être reproduite littéralement.

> Un wiki-théorie sombre, mystique et lumineux, où chaque page donne l’impression d’assembler les pièces d’un immense puzzle autour du Siècle oublié.

### Principes visuels

- fond sombre, noir bleuté ou violet profond ;
- halos violets, bleus et blancs réservés aux éléments importants ;
- motif du puzzle utilisé comme langage graphique ;
- compositions organisées autour d’une idée centrale et de fragments périphériques ;
- confort de lecture prioritaire sur les effets.

### Palette de départ

| Rôle | Valeur |
|---|---|
| Fond principal | `#07020A` |
| Fond secondaire | `#160B27` |
| Surface | `#22124A` |
| Violet électrique | `#6E3BBC` |
| Magenta énergétique | `#AD57A7` |
| Bleu cyan | `#4DE7FF` |
| Texte principal | `#FEFBF8` |
| Texte secondaire | `#DDE4EA` |
| Accent doré | `#F4B63F` |
| Alerte | `#9E3244` |

### Animations

Les animations peuvent montrer des fragments qui apparaissent, des concepts qui se relient ou des pièces qui s’assemblent.

Elles doivent rester discrètes, respecter `prefers-reduced-motion` et toujours disposer d’une version statique.

Priorité générale :

```text
Lisibilité → Navigation → Compréhension → Identité artistique → Effets visuels
```

---

## Stack technique

| Besoin | Technologie |
|---|---|
| Framework | [Astro](https://astro.build/) |
| Langage | TypeScript |
| Contenu | Markdown et MDX |
| Données | Astro Content Collections |
| Interactivité | React Islands |
| Styles | Tailwind CSS + CSS personnalisé |
| Recherche | [Pagefind](https://pagefind.app/) |
| Cartes 2D | SVG interactif |
| 3D | Three.js + React Three Fiber |
| Tests | Vitest + Playwright |
| Hébergement | Cloudflare Workers avec Static Assets |
| Images | Cloudflare R2 |
| Transformation des images | Cloudflare Images |
| CI/CD | GitHub + Cloudflare Workers Builds |
| Analytics | Cloudflare Web Analytics |
| Base de données | Aucune en V1 |

Le site est **statique par défaut**. Les pages principales doivent rester lisibles lorsque les composants interactifs ne se chargent pas.

L’adaptateur `@astrojs/cloudflare` n’est nécessaire que si le projet ajoute plus tard du rendu à la demande ou des routes exécutées côté serveur. La version statique peut être servie directement depuis le dossier `dist/` avec Cloudflare Workers Static Assets.

### Recherche Pagefind

Pagefind construit son index après le build Astro. Seul le contenu utile des pages doit être indexé : la navbar, les sidebars, le footer et les éléments répétés doivent être exclus afin d’éviter des résultats dupliqués.

Le layout des articles doit donc identifier explicitement la zone principale :

```html
<main data-pagefind-body>
  <!-- Contenu de l’article -->
</main>
```

Les métadonnées Pagefind permettront ensuite de filtrer les résultats par type de page, chapitre, personnage, thème, certitude et niveau de spoilers.

---

## Structure cible du dépôt

Cette arborescence décrit la cible. Certains dossiers et scripts peuvent ne pas encore exister pendant la construction de la première version.

```text
lesfousdubus/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── workflows/
│   └── PULL_REQUEST_TEMPLATE.md
├── public/
├── scripts/
├── src/
│   ├── components/
│   ├── content/
│   │   ├── articles/
│   │   ├── chapters/
│   │   ├── characters/
│   │   ├── evidence/
│   │   ├── glossary/
│   │   ├── locations/
│   │   ├── objections/
│   │   ├── predictions/
│   │   └── timelines/
│   ├── layouts/
│   ├── pages/
│   ├── styles/
│   └── utils/
├── .env.example
├── .gitignore
├── .nvmrc
├── astro.config.mjs
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── wrangler.jsonc
└── README.md
```

---

## Installation locale

Les commandes ci-dessous seront utilisables dès que la structure Astro et les scripts correspondants auront été ajoutés au dépôt.

### Prérequis

- Git ;
- la version de Node.js indiquée dans `.nvmrc` ;
- la version de pnpm déclarée dans `package.json`.

### Installation

```bash
git clone https://github.com/lesfousdubus-theorie/lesfousdubus.git
cd lesfousdubus

corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

Le serveur local utilise généralement :

```text
http://localhost:4321
```

### Commandes prévues

```bash
pnpm dev          # Développement
pnpm check        # Vérification Astro et TypeScript
pnpm validate     # Validation du contenu et des liens
pnpm build        # Build Astro et index Pagefind
pnpm preview      # Prévisualisation du build
pnpm format       # Formatage
pnpm test         # Tests unitaires
pnpm test:e2e     # Tests de navigation dans un navigateur
pnpm r2:upload    # Envoi d’images vers R2
```

---

## Organisation du contenu

Le contenu est stocké dans des collections structurées et validées.

### Article

```yaml
---
title: "Luffy deviendra Joy Boy"
slug: "luffy-joy-boy"
summary: "Joy Boy serait le nom légendaire donné au futur Luffy."
category: "figures-identites"
status: "published"
certainty: "central"
spoilerChapter: 1188
lastUpdatedChapter: 1188
related:
  - luffy
  - nika
  - gol-d-roger
---
```

### Chapitre

```yaml
---
chapter: 1188
title: "Une communication à travers le temps"
effect: "nouvelle-piste"
themes:
  - temporalite
  - imu
  - joy-boy
updatedArticles:
  - temporalite
  - imu
  - joy-boy
---
```

### Preuve

```yaml
---
id: "roger-trop-tot"
title: "Nous sommes arrivés trop tôt"
chapter: 968
type: "dialogue"
strength: "majeure"
articles:
  - gol-d-roger
  - laugh-tale
---
```

Les validations doivent détecter les slugs dupliqués, les références inexistantes, les métadonnées manquantes et les catégories invalides.

### Conventions

- slugs en minuscules, séparés par des tirets ;
- caractères ASCII dans les URL ;
- identifiants internes stables ;
- aucune modification d’une URL publiée sans redirection ;
- une affirmation liée au manga doit pouvoir être rattachée à un chapitre ou à une source identifiable ;
- fait du manga, interprétation et hypothèse doivent être distingués.

---

## Images avec Cloudflare R2

Les images lourdes ne sont pas stockées dans GitHub.

Domaine média prévu :

```text
media.lesfousdubus.sbs
```

Organisation conseillée :

```text
one-piece-media/
├── articles/
├── chapters/
├── characters/
├── maps/
├── timelines/
└── ui/
```

Exemple dans un article MDX :

```mdx
<R2Image
  src="articles/joy-boy/luffy-joy-boy-comparaison.webp"
  alt="Comparaison visuelle entre Luffy et Joy Boy"
  width={960}
  caption="Les deux figures présentent plusieurs caractéristiques communes."
/>
```

Le composant doit gérer les dimensions, le responsive, le chargement différé, les formats optimisés, le texte alternatif et les légendes.

---

## Déploiement

Le site sera déployé sur Cloudflare Workers avec Static Assets.

```text
Modification locale
→ Commit Git
→ Push vers GitHub
→ Build Cloudflare
→ Preview ou production
```

- Production : **https://lesfousdubus.sbs**
- Branche `main` : production.
- Pull Requests et autres branches : prévisualisations.
- Commande de build prévue : `pnpm build`.
- Commande de déploiement prévue : `pnpm exec wrangler deploy`.
- Dossier généré : `dist/`.
- Configuration Cloudflare : `wrangler.jsonc`.
- Images : Cloudflare R2 via `media.lesfousdubus.sbs`.

Les secrets de production restent dans Cloudflare et ne doivent jamais être ajoutés au dépôt.

---

## Mise à jour de la théorie

Pour chaque nouveau chapitre :

1. créer une fiche dans `src/content/chapters/` ;
2. déterminer son effet sur la théorie ;
3. relier les articles concernés ;
4. mettre à jour les articles principaux ;
5. conserver l’historique des changements ;
6. mettre à jour les prédictions.

Effets possibles :

```text
renforcement
nouvelle-piste
modification
contradiction
refutation
aucun-apport
```

Les articles présentent la version actuelle de la théorie. Les anciennes formulations restent consultables dans l’historique.

---

## Contribution

Les contributions sont les bienvenues.

- Ouvrez une **Issue** pour signaler un bug, proposer une amélioration, ajouter une source ou discuter d’un point de la théorie.
- Ouvrez une **Pull Request** pour proposer une correction, une fonctionnalité, une modification du design ou une amélioration du code.
- Pour un changement important, ouvrez d’abord une Issue afin de discuter de l’approche.

### Workflow

```text
Issue → Branche → Modification → Vérifications → Pull Request → Preview → Fusion
```

### Avant une Pull Request

```bash
pnpm check
pnpm validate
pnpm build
```

Une modification est prête à être fusionnée lorsque :

- son objectif est expliqué ;
- elle fonctionne sur ordinateur et mobile ;
- les liens et références sont valides ;
- les faits, interprétations et hypothèses sont distingués ;
- les images possèdent un texte alternatif pertinent ;
- les interactions fonctionnent au clavier ;
- les animations respectent la réduction des mouvements ;
- aucune information sensible n’est ajoutée au dépôt ;
- la prévisualisation Cloudflare a été vérifiée.

Les changements visuels doivent inclure des captures avant/après.

En proposant une contribution au dépôt, son auteur accepte que les éléments originaux de cette contribution soient publiés sous la même licence CC0 que le reste du projet.

---

## Feuille de route

### V1 — Fondation

- [ ] Initialisation Astro et TypeScript.
- [ ] Layout avec navbar et deux sidebars.
- [ ] Collections de contenu.
- [ ] Premiers articles.
- [ ] Recherche Pagefind.
- [ ] Réglage anti-spoilers.
- [ ] Chapitre par chapitre.
- [ ] FAQ, objections et sources.
- [ ] Métadonnées SEO, sitemap et aperçus de partage.
- [ ] Page 404 et gestion des liens cassés.
- [ ] Tests unitaires et tests de navigation essentiels.
- [ ] Intégration R2.
- [ ] Déploiement Cloudflare.

### V2 — Exploration

- [ ] Double frise chronologique.
- [ ] Carte du monde.
- [ ] Carte des personnages.
- [ ] Tableau des prédictions.
- [ ] Base des preuves.
- [ ] Historique des modifications.

### V3 — Expériences avancées

- [ ] Globe 3D.
- [ ] Fresque d’Elbaf interactive.
- [ ] Animation temporelle des Ponéglyphes.
- [ ] Comparateurs visuels.
- [ ] Favoris et progression locale.

---

## Attribution et licence

Ce projet est un site de fans non officiel consacré à l’analyse de *One Piece*.

La théorie originale est attribuée au **Mont Corvo**, à travers [cette vidéo](https://youtu.be/SgJ25zjMJyo).

*One Piece*, ses personnages, son univers, ses illustrations et ses autres éléments protégés appartiennent à leurs auteurs et ayants droit respectifs, notamment Eiichiro Oda, Shueisha et leurs partenaires.

Le projet n’est ni affilié, ni approuvé, ni sponsorisé par les détenteurs de ces droits.

Les contenus, images, extraits, marques et personnages issus de *One Piece* ne sont pas placés sous la licence libre du projet. Ils restent soumis aux droits de leurs propriétaires respectifs.
