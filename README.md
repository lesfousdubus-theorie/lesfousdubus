# Les Fous du Bus

## Le Siècle oublié est le présent

> Wiki éditorial consacré à une théorie sur _One Piece_ : le Siècle oublié ne serait pas un événement ancien qui se répète, mais l’histoire que Luffy et ses alliés sont en train de créer.

[Site](https://lesfousdubus.sbs) · [Dépôt GitHub](https://github.com/lesfousdubus-theorie/lesfousdubus) · [Vidéo originale](https://youtu.be/SgJ25zjMJyo) · [Compte X](https://x.com/FoudubusTV_)

Le projet est ouvert : chacun peut consulter le site, proposer des changements ou réutiliser librement les créations originales du dépôt.

---

## Guide de démarrage rapide (pour tout le monde)

Vous n’avez pas besoin de savoir coder pour modifier le site. **Le contenu est écrit dans de simples fichiers texte.** Le site transforme automatiquement ces fichiers en pages web.

> 💡 **L’idée à retenir :** un article = un fichier dans le dossier `src/content/articles/`. Chaque fichier commence par un petit bloc de réglages (le « frontmatter », entre deux lignes `---`), suivi du texte de l’article, écrit en Markdown (une écriture simple avec des `#` pour les titres, `-` pour les listes, etc.).

### ✏️ Modifier un article existant

1. Ouvrez le fichier `src/content/articles/<nom-de-l-article>.md` (ex. `luffy.md`).
2. Modifiez le texte sous le frontmatter. Exemples de syntaxe Markdown :
   - `## Un titre de section`
   - `- un point de liste`
   - **texte en gras** s’écrit `**texte en gras**`
   - *texte en italique* s’écrit `*texte en italique*`
   - une citation : `> « une phrase »`
3. Si besoin, ajustez les réglages du frontmatter (ex. `reviewedUntilChapter` après une relecture globale). Pour afficher qu’un chapitre a réellement modifié un article, utilisez plutôt `updatedArticles` dans la fiche du chapitre.
4. Enregistrez, puis prévisualisez (voir [Aperçu local](#aperçu-local-sans-installer-rien) plus bas).

### 🆕 Ajouter un nouvel article

1. Créez un nouveau fichier dans `src/content/articles/`, par exemple `mon-sujet.md`.
2. Copiez le modèle ci-dessous et remplissez les champs :

```markdown
---
title: "Titre de l'article"
summary: "Une phrase de résumé affichée sur les listes."
category: "figures-principales"
status: "published"
reviewedUntilChapter: 1188
related:
  - luffy
  - joy-boy
---

## Présentation

Votre premier paragraphe…

## Ce que le manga établit

- premier fait
- deuxième fait

## La lecture des Fous du Bus

Votre analyse…
```

3. **Champs obligatoires** : `title`, `summary`, `category`, `status: "published"`.
4. **`category`** doit être l’une des valeurs autorisées (voir [Les catégories](#les-catégories)).
5. **`related`** (facultatif) : listez les noms d’autres articles liés (leurs noms de fichier, sans le `.md`).
6. Enregistrez le fichier. L’article apparaît automatiquement dans les listes et la recherche.

### 🌐 Modifier la structure ou le design du site

- **La navigation et les pages** sont des fichiers `.astro` dans `src/pages/` et `src/components/`. Modifier le site demande alors des compétences plus techniques (Astro, HTML/CSS).
- Pour la plupart des besoins, **préférez un contenu simple** (un article) plutôt qu’une modification de code.

### ✅ Avant de proposer un changement

Le site vérifie automatiquement la validité du contenu (références, catégories, etc.). Une fois vos modifications enregistrées, lancez la validation :

```bash
npm run validate
npm run check
npm run build
```

Si tout passe sans erreur, votre modification est prête à être proposée (voir [Contribution](#contribution)).

---

## Sommaire

- [Identité du projet](#identité-du-projet)
- [Origine de la théorie](#origine-de-la-théorie)
- [Objectifs](#objectifs)
- [Architecture du site](#architecture-du-site)
- [Interface](#interface)
- [Stack technique](#stack-technique)
- [Structure du dépôt](#structure-du-dépôt)
- [Installation locale](#installation-locale)
- [Aperçu local sans installer rien](#aperçu-local-sans-installer-rien)
- [Organisation du contenu](#organisation-du-contenu)
- [Les catégories](#les-catégories)
- [Images et Cloudflare R2](#images-et-cloudflare-r2)
- [Déploiement](#déploiement)
- [Mise à jour de la théorie](#mise-à-jour-de-la-théorie)
- [Contribution](#contribution)
- [Attribution et licence](#attribution-et-licence)

---

## Identité du projet

| Élément         | Valeur                                                    |
| --------------- | --------------------------------------------------------- |
| Nom du site     | **Les Fous du Bus**                                       |
| Titre principal | **Le Siècle oublié est le présent**                       |
| Sous-titre      | **Une théorie sur la véritable chronologie de One Piece** |
| Domaine         | **https://lesfousdubus.sbs**                              |
| Dépôt           | **https://github.com/lesfousdubus-theorie/lesfousdubus**  |

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

Le site a pour objectif de structurer, documenter, développer et faire évoluer cette théorie au fil des nouveaux chapitres de _One Piece_.

---

## Objectifs

Le site doit permettre de :

- **comprendre** la version actuelle de la théorie ;
- **explorer** les liens entre personnages, lieux, événements et époques ;
- **suivre** l’apport de chaque nouveau chapitre ;
- **lire** la théorie de manière progressive, du résumé à la démonstration complète.

### Principes

- **Une seule source de vérité :** une information n’est enregistrée qu’une fois, puis réutilisée partout où elle est nécessaire.
- **Une page canonique :** un sujet peut être accessible depuis plusieurs catégories sans être dupliqué.
- **Le contenu avant les effets :** les articles doivent rester lisibles sans animation ni rendu 3D.
- **Progressivité :** le HTML statique constitue la base ; l’interactivité est chargée uniquement lorsqu’elle apporte une réelle valeur.
- **Ouverture :** les Issues et Pull Requests servent à faire évoluer le projet.

---

## Architecture du site

```text
Accueil
│
├── La théorie
│   ├── Résumé de la théorie
│   ├── Théorie complète
│   ├── Chronologie
│   ├── Carte mentale
│   └── Lexique essentiel
│
├── Dossiers
│   ├── Monde et destinations
│   ├── Histoire et temporalité
│   ├── Figures principales
│   ├── Armes antiques
│   ├── Technologies et pouvoirs
│   ├── Gouvernement et guerre finale
│   ├── Peuples, royaumes et témoins
│   ├── Dieux et croyances
│   └── Transmission et mémoire
│
├── Chapitres
│   ├── Dernières analyses (chapitre par chapitre)
│   ├── Prédictions
│   └── Toutes les analyses
│
├── Explorer
│   └── Carte mentale
│
└── Aide
    ├── À propos
    ├── FAQ
    ├── Glossaire
    ├── Crédits
```

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
- accès aux grandes sections (La théorie, Dossiers, Chapitres, Explorer) ;
- recherche globale ;
- accès au dernier chapitre analysé ;
- mode clair ou sombre.

### Sidebar gauche

- fixée sous la navbar et contre le bord gauche ;
- catégories dépliables ;
- page active clairement indiquée ;
- défilement indépendant ;
- repliable ou masquable.

### Article

- largeur de lecture confortable ;
- images et visualisations autorisées à dépasser ponctuellement ;
- titre, résumé et métadonnées en haut ;
- articles liés et poursuite de lecture en bas.

### Sidebar droite

- sommaire généré depuis les titres de la page ;
- position `sticky` sous la navbar ;
- masquée pour les articles courts.

### Responsive

```text
Grand écran : sidebar gauche + article + sidebar droite
Écran moyen : sidebar gauche + article, sommaire escamotable
Tablette    : article, navigation et sommaire en panneaux
Mobile      : article, bouton menu et bouton sommaire
```

---

## Stack technique

| Besoin        | Technologie                       |
| ------------- | --------------------------------- |
| Framework     | [Astro](https://astro.build/)     |
| Langage       | TypeScript                        |
| Contenu       | Markdown et MDX                   |
| Données       | Astro Content Collections         |
| Interactivité | React Islands                     |
| Styles        | Tailwind CSS + CSS personnalisé   |
| Recherche     | [Pagefind](https://pagefind.app/) |
| Tests         | Vitest + Playwright               |
| Hébergement   | Cloudflare                        |
| CI/CD         | GitHub Actions                    |

Le site est **statique par défaut** : chaque page est générée à l’avance et peut être servie depuis le dossier `dist/`. Les pages principales restent lisibles même sans interactivité.

### Recherche Pagefind

Pagefind construit son index après le build Astro. Le contenu utile des pages est indexé dans la zone principale (`data-pagefind-body`) ; la navbar, les sidebars et le footer sont exclus pour éviter des résultats dupliqués.

---

## Structure du dépôt

```text
lesfousdubus/
├── .github/              # Modèles d'issues et de pull requests
├── docs/sources/         # Transcriptions et notes éditoriales brutes
├── public/               # Fichiers servis tels quels (images, favicon, llms.txt)
├── scripts/              # Scripts de validation et utilitaires
├── src/
│   ├── components/       # Blocs d'interface réutilisables
│   ├── content/          # TOUT le contenu textuel du site
│   │   ├── articles/     #   ← les articles (97 actuellement)
│   │   ├── chapters/     #   les fiches de chapitres analysés
│   │   ├── characters/   #   les personnages
│   │   ├── glossary/     #   le glossaire
│   │   ├── locations/    #   les lieux
│   │   ├── predictions/  #   les prédictions
│   │   └── timelines/    #   les frises chronologiques
│   ├── layouts/          # Les gabarits de page
│   ├── pages/            # Les routes (.astro)
│   ├── styles/           # Le CSS global
│   └── utils/            # Fonctions partagées
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── wrangler.jsonc
└── README.md
```

> 🔑 **Pour non-codeurs :** tout ce qui s’affiche comme texte sur le site vit dans `src/content/`. Vous n’avez presque jamais besoin de toucher aux dossiers `components`, `layouts` ou `pages`.

---

## Installation locale

### Prérequis

- Git ;
- Node.js (version >= 22, voir `.nvmrc`) ;
- npm (>= 10).

### Installation

```bash
git clone https://github.com/lesfousdubus-theorie/lesfousdubus.git
cd lesfousdubus

npm install
npm run dev
```

Le serveur local est disponible sur :

```text
http://localhost:4321
```

### Commandes

```bash
npm run dev          # Développement (serveur local + rechargement)
npm run check        # Vérification Astro et TypeScript
npm run validate     # Validation du contenu et des liens
npm run build        # Build Astro + index Pagefind (dossier dist/)
npm run preview      # Prévisualisation du build
npm run format       # Formatage automatique
npm run test         # Tests unitaires
npm run test:e2e     # Tests de navigation dans un navigateur
npm run r2:upload    # Envoi d'images vers R2 (optionnel)
```

---

## Aperçu local sans installer rien

> **Non-codeurs :** cette section est pour vous. Pas besoin de terminal, de Node ou de Docker.

### Option A — via GitHub (recommandée)

1. Créez gratuitement un compte sur [GitHub](https://github.com).
2. Cliquez sur le fichier que vous voulez modifier dans le dépôt (ex. `src/content/articles/luffy.md`).
3. Cliquez sur l’icône ✏️ **Modifier** (crayon) en haut à droite.
4. Modifiez le texte directement dans l’éditeur en ligne.
5. En bas de la page, écrivez une petite description de votre changement, puis cliquez sur **Propose changes**.
6. GitHub vous propose de créer une **Pull Request** : validez. Votre modification est maintenant proposée, un aperçu est généré automatiquement, et elle peut être relue puis fusionnée.

> Cette méthode ne modifie rien sur le site tant que la Pull Request n’est pas **fusionnée** — c’est le comportement voulu, pour relire avant de publier.

### Option B — modifier un article sans écrire de code

Même chose que l’option A, mais limitez-vous au fichier de l’article : changez le texte sous le frontmatter, laissez les réglages du haut tels quels sauf si vous savez ce que vous faites.

---

## Organisation du contenu

Le contenu est stocké dans des collections structurées et validées, dans `src/content/`.

### Article (`src/content/articles/`)

```yaml
---
title: 'Luffy deviendra Joy Boy'
summary: 'Joy Boy serait le nom légendaire donné au futur Luffy.'
category: 'figures-principales'
status: 'published'
certainty: 'central'
reviewedUntilChapter: 1188
related:
  - luffy
  - nika
  - gol-d-roger
---
```

`reviewedUntilChapter` signifie seulement que l'article a été relu en tenant compte de ce chapitre. Pour afficher une vraie mise à jour liée à un chapitre, ajoutez l'identifiant de l'article dans `updatedArticles` sur la fiche du chapitre concerné.

### Chapitre (`src/content/chapters/`)

```yaml
---
chapter: 1188
title: 'Une communication à travers le temps'
effect: 'nouvelle-piste'
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

### Les catégories

`category` doit être l’une des valeurs suivantes (elle détermine dans quel dossier thématique l’article apparaît) :

| Valeur                  | Dossier                           |
| ----------------------- | --------------------------------- |
| `monde-destinations`    | Monde et destinations             |
| `histoire-temporalite`  | Histoire, temps et Ponéglyphes    |
| `figures-principales`   | Figures principales               |
| `personnages-identites` | Personnages et identités          |
| `armes-antiques`        | Armes antiques                    |
| `technologies-pouvoirs` | Technologies et pouvoirs          |
| `peuples-royaumes`      | Peuples, royaumes et témoins      |
| `dieux-croyances`       | Dieux et croyances                |
| `transmission-memoire`  | Transmission et mémoire           |
| `gouvernement-mondial`  | Gouvernement mondial              |
| `guerre-finale`         | Guerre finale                     |

### Conventions

- noms de fichiers en minuscules, séparés par des tirets (`luffy-joy-boy.md`) ;
- caractères ASCII dans les noms de fichiers ;
- identifiants internes stables ;
- ne pas modifier une URL publiée sans redirection ;
- distinguer ce que le manga établit, ce qui est une interprétation et ce qui est une hypothèse.

La validation (`npm run validate`) détecte les références inexistantes, les métadonnées manquantes et les catégories invalides.

---

## Images et Cloudflare R2

Les images actuellement utilisées par le site sont versionnées dans `public/images/` et sont servies sous `/images/...`. Elles restent donc disponibles dans les prévisualisations et sans configuration externe.

Pour un volume de médias plus important, le dépôt fournit aussi un composant `R2Image` et le script `npm run r2:upload` pour publier des fichiers sur Cloudflare R2. Configurez alors les variables dans `.env` (voir `.env.example`) et utilisez une URL R2 dans les contenus MDX.

Les sources éditoriales brutes (transcriptions et notes) sont conservées séparément dans [`docs/sources/`](docs/sources/README.md) ; elles ne sont pas exposées par le site.

---

## Déploiement

Le site est généré statiquement puis déployé sur Cloudflare.

```text
Modification locale
→ Commit Git
→ Push vers GitHub
→ Build automatique
→ Prévisualisation (Pull Request) ou production (main)
```

- Production : **https://lesfousdubus.sbs**
- Branche `main` : production.
- Pull Requests et autres branches : prévisualisations.
- Dossier généré : `dist/`.
- Configuration Cloudflare : `wrangler.jsonc`.

Les secrets de production restent dans Cloudflare et ne doivent jamais être ajoutés au dépôt.

---

## Mise à jour de la théorie

Pour chaque nouveau chapitre :

1. créer une fiche dans `src/content/chapters/` ;
2. déterminer son effet sur la théorie ;
3. relier les articles concernés ;
4. mettre à jour les articles principaux ;
5. mettre à jour les prédictions si nécessaire.

Les articles présentent la version actuelle de la théorie. Les anciennes formulations restent consultables dans l’historique de Git.

---

## Contribution

Les contributions sont les bienvenues — y compris, et surtout, le contenu.

- Ouvrez une **Issue** pour signaler un bug, proposer une amélioration, ajouter une source ou discuter d’un point de la théorie.
- Ouvrez une **Pull Request** pour proposer une correction, un nouvel article ou une amélioration du code.
- Pour un changement important, ouvrez d’abord une Issue afin de discuter de l’approche.

### Workflow

```text
Issue → Modification → Vérifications → Pull Request → Preview → Fusion
```

### Avant une Pull Request

```bash
npm run check
npm run validate
npm run build
```

Une modification est prête à être fusionnée lorsque :

- son objectif est expliqué ;
- elle fonctionne sur ordinateur et mobile ;
- les liens et références sont valides ;
- les faits, interprétations et hypothèses sont distingués ;
- les images possèdent un texte alternatif pertinent ;
- la prévisualisation a été vérifiée.

En proposant une contribution au dépôt, son auteur accepte que les éléments originaux de cette contribution soient publiés sous la même licence CC0 que le reste du projet.

---

## Attribution et licence

Ce projet est un site de fans non officiel consacré à l’analyse de _One Piece_.

La théorie originale est attribuée au **Mont Corvo**, à travers [cette vidéo](https://youtu.be/SgJ25zjMJyo).

_One Piece_, ses personnages, son univers, ses illustrations et ses autres éléments protégés appartiennent à leurs auteurs et ayants droit respectifs, notamment Eiichiro Oda, Shueisha et leurs partenaires.

Le projet n’est ni affilié, ni approuvé, ni sponsorisé par les détenteurs de ces droits.

Les contenus, images, extraits, marques et personnages issus de _One Piece_ ne sont pas placés sous la licence libre du projet. Ils restent soumis aux droits de leurs propriétaires respectifs.
