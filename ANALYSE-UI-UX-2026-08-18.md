# Analyse UI / UX — Les Fous du Bus

> Inspection du code actuel (août 2026).  
> Site wiki éditorial Astro, design « Mer & Encre ».  
> Objectif : lister ce qui gêne vraiment la lecture, la compréhension et la navigation — pas une refonte.

Le socle est déjà solide : skip-link, focus visible, `prefers-reduced-motion`, dark/light, recherche (Pagefind + alias + récents), TOC mobile, mode zen, lightbox, façade YouTube, parcours de lecture, breadcrumbs, JSON-LD. Les problèmes restants sont surtout d’**architecture d’information**, de **cohérence**, de **lisibilité** et de **qualité mobile des outils visuels**.

---

## 1. À corriger en priorité

### 1.1 Trois chemins d’entrée se contredisent

Le nouveau visiteur ne reçoit pas le même récit selon la page.

| Surface | Promesse |
|---|---|
| Accueil « Comprendre la théorie » | 1. Résumé 8 min → 2. Carte mentale 5–10 min → 3. Théorie complète 30–60 min |
| `/theorie` | 1. Accueil 2 min → 2. Résumé 10 min → 3. Démo 45 min |
| `understandingPaths` | 2 min / 10 min / 45 min |
| Navbar « La théorie » | Résumé, théorie complète, chronologie — pas de carte mentale en premier |

Conséquence : le CTA principal n’est pas unique. L’accueil pousse la carte mentale comme étape 2 ; la page Théorie pousse le résumé. Les durées affichées sont inventées et incohérentes.

**Corriger :** une seule séquence canonique (ex. Résumé → Chronologie ou carte → Théorie complète), les mêmes durées partout, et un seul CTA primaire sur l’accueil.

### 1.2 Double navigation divergente (navbar ≠ sidebar ≠ hubs)

- Navbar desktop : La théorie / Dossiers / Chapitres / Explorer. **Pas d’Aide.**
- Sidebar : Commencer + 11 dossiers + chapitres + Aide. Glossaire apparaît **deux fois** (Commencer et Aide). Plan du site absent de la sidebar.
- Navbar « Explorer » n’expose que 5 outils ; la page `/explorer` en a 12.
- Navbar « Dossiers » mélange « Gouvernement & guerre finale » en un seul lien alors que ce sont deux catégories.

Sur tablette/mobile, le menu hamburger ouvre la **sidebar wiki**, pas le menu global (sauf pages `noSidebar`). Un utilisateur qui cherche « Explorer » ou « Aide » doit d’abord comprendre que ce n’est pas dans le tiroir.

**Corriger :** une IA unique. Aide dans la navbar. Un seul glossaire. Alignement des libellés. Sur mobile, le hamburger devrait offrir les 4 sections top-level + recherche, pas uniquement l’arbre encyclopédique.

### 1.3 Sidebar trop longue, sans filtre

`SidebarNav` liste quasiment tout le corpus dans des `<details>`. Sur mobile, c’est un tiroir de plusieurs dizaines de liens, **sans champ de filtre** (l’ancien audit le donnait pour corrigé : ce n’est plus dans le code). Pas de swipe pour fermer non plus.

**Corriger :** filtre local dans le drawer, sections repliées par défaut sauf la section active, et geste de fermeture (swipe / bouton déjà présent).

### 1.4 Accueil trop chargé, dossiers cachés

L’accueil enchaîne : hero + vidéo 16:9 + bannière chapitre + 6 dossiers + `<details>` pour les 5 autres + guide de lecture + 3 cartes « comprendre » + articles récents.

- Les 5 derniers dossiers (Peuples, Dieux, Transmission, Gouvernement, Guerre finale) sont **derrière un clic**. Ce sont des piliers de la théorie.
- Le guide de lecture (badges Manga / Théorie / Hypothèse) arrive **après** les dossiers : trop tard pour un premier visiteur.
- La vidéo occupe trop de viewport avant le premier contenu utile.

**Corriger :** guide de lecture juste sous les CTA ; 11 dossiers visibles (grille compacte) ou 4–5 « portes » seulement ; vidéo plus bas ou plus petite ; un seul bloc « commencer ici ».

### 1.5 Titres en dégradé peu lisibles

Les H1 d’articles utilisent `background-clip: text` + `text-fill-color: transparent`. Problèmes :

- contraste variable selon le mot et le thème (surtout light) ;
- sélection / copier-coller dégradés ;
- titres de 5 rem sur `/theorie`, `/dossiers`, `/explorer` (`line-height: 0.96`) trop « poster », trop peu wiki.

**Corriger :** H1 en `--text-main` (éventuellement un mot d’accent). Ramener les hubs à `clamp(2rem, 4vw, 2.8rem)`.

### 1.6 Mode clair incomplet sur les surfaces « média »

Plusieurs overlays et schémas restent calés sur le thème sombre :

- overlay vidéo accueil : `rgba(7, 2, 10, …)` + label blanc ;
- overlay recherche : `rgba(7, 2, 10, 0.74)` ;
- nœuds de la carte mentale : `fill="rgba(14,23,34,0.92)"` et texte `#f3efe6` — illisibles / hors thème en light ;
- couleurs SVG hardcodées (`#8899aa`, `#5fb9c2`, `#e0ab4e`) qui ne suivent pas les tokens light (`--accent-gold` devient `#76520d`).

**Corriger :** tokens CSS partout, y compris dans les SVG générés en JS.

---

## 2. UX à améliorer

### 2.1 Temps de lecture peu fiable

`ArticleLayout` estime la durée via un heuristique headings (150 + 260/H2 + 120/H3). Un article court très titré paraît long ; un long texte peu structuré paraît court. Afficher « ~X min » avec cette méthode crée de la méfiance.

**Corriger :** compter les mots du markdown réel, ~220 wpm, plancher 2 min.

### 2.2 Badges de certitude encore opaques

Le système (Manga / Noyau / Extension / Hypothèse récente / Projection) est le vrai produit. Aujourd’hui :

- pas de tooltip au survol / focus des badges ;
- le guide n’est que sur l’accueil ;
- `ArticleMeta` dit « Niveau : … » sans légende ;
- pastilles de section dans le corps sans lien vers le glossaire.

**Corriger :** tooltip + lien glossaire sur chaque badge ; mini-légende persistante en tête d’article.

### 2.3 Page Chapitres redondante

`/chapitres` propose 4 cartes (Dernière analyse / Toutes / Prédictions / Modifications) **puis** re-liste tous les chapitres. « Toutes les analyses » double la liste du dessous. Le chapitre 1185 (vide) est collé **en bas** au lieu d’être à sa place numérique, ce qui casse l’ordre mental.

**Corriger :** une liste unique (triable / filtrable par effet) + un encart Prédictions. Insérer 1185 entre 1184 et 1186.

### 2.4 Fin d’article trop bavarde

Après le contenu : ParcoursNav + « ← Sommaire de la théorie » + articles liés + références chapitres + partage + footer. Trop de blocs similaires « continuer à lire ».

**Corriger :** garder parcours + liés ; fondre le bouton sommaire dans le parcours ; partage plus discret.

### 2.5 Recherche : détails manquants

Déjà bien faite (alias, récents, chips, clavier). Reste :

- extraits Pagefind affichés en texte brut (les `<mark>` sont stripés) : plus de surlignage du match ;
- pas de catégorie / type de page dans le résultat (fiche vs chapitre vs explorer) ;
- en local `astro dev`, Pagefind n’existe souvent pas → message d’erreur peu rassurant.

### 2.6 Carte mentale encore pénible sur mobile

Zoom/pan souris, `wheel` avec `preventDefault`, pas de pinch, nœuds trop denses dans un viewport 55vh. La version textuelle en dessous sauve l’accessibilité, mais l’outil phare vendu comme « manipulez la théorie » échoue au pouce.

Même famille de problèmes sur la frise (`InteractiveTheoryTimeline.astro`, 2500+ lignes) et les schémas Explorer : trop d’information simultanée, légende parfois seulement en haut, peu de highlight du chemin choisi.

### 2.7 Onboarding wiki absent

Aucun état vide / première visite. Un lecteur One Piece casual arrive sur un vocabulaire (Ponéglyphes, Mother Flame, Domi Reversi) sans « par où commencer si je suis au chapitre X ».

**Souhaitable :** un sélecteur léger « Je suis au chapitre … » qui oriente vers résumé vs analyses récentes, ou un encart « nouveau ici ».

### 2.8 Incohérences de microcopie

- Accueil H1 : « La mémoire » + « de l’avenir » en block — OK. Mais le badge dit seulement « La théorie ».
- Sidebar « Frise chronologique » vs navbar « Chronologie » vs explorer « Frise chronologique ».
- Homepage « Histoire et temporalité » vs README « Histoire, temps et Ponéglyphes ».
- Bouton thème : `aria-label` fixe « Changer le thème », sans indiquer le thème cible (clair/sombre).
- Raccourci recherche affiché « Ctrl K » puis corrigé en JS sur Mac : flash du mauvais label.

---

## 3. UI / design à peaufiner

### 3.1 Hiérarchie visuelle des hubs

`/theorie`, `/dossiers`, `/explorer` ont le même template « eyebrow cyan + H1 5rem + em accent ». Ça fait landing marketing, pas outil de travail. Les articles, plus sobres, sont plus réussis.

### 3.2 Cartes trop uniformes

Presque toutes les cartes : même border, même radius, même `translateY(-2/-4px)`. Acceptable, mais les CTA primaires ne ressortent pas assez face aux secondaires (accueil : 1 primary + 2 secondary de même poids visuel une fois wrapés en colonne).

### 3.3 Cibles tactiles encore justes

- caret dropdown navbar : **26×36 px** (sous les 40–44 px recommandés) ;
- `--touch-target: 40px` (WCAG 2.2 AAA / Apple HIG visent 44) ;
- chips / liens footer OK grâce à `min-height`.

### 3.4 Emoji comme icônes système

Sidebar, dossiers, explorer, chapitres : emoji (🌍📜🎭). Rendu instable selon OS/police, parfois hors grille, parfois « cartoon » à côté de Fraunces. Remplacer à terme par un set SVG monochrome.

### 3.5 `font-weight: 850` / `750`

Manrope self-hosté n’a que 400/500/600/700/800. Ces poids synthétisent un gras intermédiaire, légèrement flou.

### 3.6 Titre accueil / gradient sur CTA

`.btn-primary` utilise `color: var(--bg-main)` sur un dégradé cyan→violet→magenta. En dark, `--bg-main` est presque noir : lisible. En light, `--bg-main` est crème `#f8f5ed` sur magenta/violet : à revérifier (risque < 4.5:1 sur une partie du dégradé).

### 3.7 Lightbox caption hors cadre

La légende est en `bottom: -40px` sous le conteneur : souvent coupée, surtout mobile (`max-height: 75vh` + padding).

### 3.8 Page 404 / 500

Propres, mais pas de champ recherche intégré (le plus utile sur une 404 de wiki). Le hamburger ouvre le menu global : bien. Ajouter 3–4 liens « pages fréquentes » + ouvrir la recherche.

---

## 4. Accessibilité restante

| Point | Détail |
|---|---|
| Titres dégradés | texte en `transparent` : certains AT / contrast checkers échouent |
| Carte mentale | nœuds en `<g role="link" tabindex="0">` : mieux qu’avant, mais pas de liste d’ordre de tabulation raisonnable (30+ stops) |
| Overlay search | `role="dialog"` est sur le **panneau**, l’overlay n’est pas un `<dialog>` natif : backdrop click OK, mais pas de `showModal()` (focus / inert moins robustes que le menu mobile) |
| TOC `h3` | « Sur cette page » est un H3 hors flux de l’article : peut perturber la outline |
| Images markdown | alts dépendent du contenu ; lightbox reprend l’alt (souvent vide) |
| `theme-color` | géré dynamiquement : OK |
| Reveal JS | ajoute `.reveal { opacity: 0 }` avant intersection : si JS casse, le contenu reste invisible. Le fallback `prefers-reduced-motion` / pas d’IO existe, mais pas de noscript |
| Tables d’articles | `display: block` pour le scroll : perd le sémantique tableau pour AT |

---

## 5. Performance perçue

- Polices déjà self-host latin : bon.
- `BackgroundScene` + `background-attachment: fixed` (désactivé <768px) : OK.
- Reveal + stagger sur presque toutes les cartes : sensation « site qui pop », mais contenu utile retardé.
- Timeline 66 Ko de composant + carte mentale JS inline : hydratation / parse coûteux sur mobile bas de gamme.
- Hero vidéo : façade OK, mais l’image YouTube distante part encore si `public/images/video-cover.webp` manque.

---

## 6. Ce qui est déjà bon (ne pas casser)

- Distinction éditoriale faits / théorie / hypothèse (le vrai différenciateur).
- Recherche clavier (Ctrl/⌘K, flèches, trap de focus, chips, alias orthographiques).
- Mode zen + barre de progression + TOC sticky / FAB.
- Façade YouTube, lightbox hors `<main>`, `inert` sur drawers.
- Breadcrumbs d’articles avec catégorie.
- Pagefind ignoré sur nav/footer.
- Contraste des tokens texte testé (`tests/contrast.test.ts`).
- Version textuelle sous la carte mentale.
- `DiagramViewport` (scroll + agrandir) pour les schémas.

---

## 7. Priorisation proposée

### Sprint A — cohérence (fort impact, peu de design nouveau)

1. Unifier le parcours d’entrée et les durées (accueil, `/theorie`, navbar).
2. Remonter le guide de lecture ; ne plus cacher 5 dossiers.
3. Aide dans la navbar ; dédoublonner Glossaire ; filtre sidebar mobile.
4. H1 articles en couleur pleine ; réduire les H1 hubs.
5. Insérer le chapitre 1185 à sa place ; simplifier `/chapitres`.

### Sprint B — light mode + lisibilité

6. Tokens sur overlays, carte mentale, légendes SVG.
7. Vérifier contraste CTA primary en light.
8. Temps de lecture au compteur de mots.
9. Tooltips / légende des badges de certitude.

### Sprint C — outils Explorer

10. Carte mentale : pinch, légende sticky, highlight du nœud actif, moins de nœuds au premier zoom mobile.
11. Frise : même traitement (chemin sélectionné, version HTML d’abord).
12. Extraire un design system de légende Canon / Théorie / Hypothèse réutilisé partout.

### Plus tard (P2)

- Favoris locaux.
- « Je suis au chapitre X ».
- Icônes SVG à la place des emoji.
- Recherche : type de page + `<mark>`.
- 404 avec recherche.
- Self-host déjà fait : ne plus y revenir.

---

*Analyse basée sur le code de `src/` (layouts, Navbar, SidebarNav, accueil, dossiers, explorer, chapitres, SearchModal, carte mentale). Un passage utilisateur réel mobile + light mode reste le meilleur complément.*
