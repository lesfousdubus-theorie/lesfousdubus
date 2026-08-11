# Analyse UI/UX — Les Fous du Bus (11 août 2026)

> Méthode : inspection directe du code source actuel, `npm run build` (143 pages générées avec succès), exécution de la suite `vitest` (99 tests, tous verts), lecture des composants clés (Navbar, SidebarNav, SearchModal, ArticleLayout, WikiLayout, BaseLayout, index.astro, R2Image, BackgroundScene) et des tokens de design (`global.css`).
>
> Le repo contient déjà **5 audits UI/UX précédents** (`ANALYSE-UI-UX-2026.md`, `AUDIT-UI-UX-2026-08-08.md`, `AUDIT-UI-UX-A11Y-2026-08-09.md`, `AUDIT-UI-UX-A11Y-2026-FRAIS.md`, `AUDIT-UX-UI.md`, `REVISION-AUDIT-UI-UX-A11Y-2026-08-08.md`). En les confrontant au code réel, la grande majorité de leurs recommandations sont **déjà implémentées** — certaines descriptions sont même obsolètes (ex. le stack n'est plus "Astro + React", il n'y a **plus aucune dépendance React** dans `package.json`). Ce document ne répète donc pas ce qui est déjà fait : il liste ce qui reste réellement à optimiser, vérifié dans le code actuel.

---

## ✅ Ce qui est déjà solide (vérifié dans le code, pour éviter de refaire du travail)

- **Fonts** : self-hébergées via `@fontsource` (Manrope 400-800, Fraunces 600-800, subset latin uniquement) — plus aucun aller-retour Google Fonts.
- **Recherche** : Pagefind chargé à la demande, `client:idle`-like, **0 KB React**, historique des recherches en `localStorage`, navigation clavier complète, raccourci `⌘K` / `Ctrl K` détecté par plateforme.
- **Mode zen** (masque les sidebars), **FAB sommaire mobile**, **swipe pour fermer le drawer**, **filtre dans le drawer mobile** : tous implémentés.
- **Images** : `R2Image` fixe `width`/`height` + `aspect-ratio` + `loading="lazy"`/`fetchpriority` → pas de CLS.
- **Design tokens** : palette "Mer & Encre" cohérente, contrastes vérifiés par `tests/contrast.test.ts` (52 tests), échelle de rayons progressive, micro-interactions différenciées (hover uniforme `translateY(-2px)` corrigé, ne reste que sur 2 éléments volontairement).
- **CSS partagé** : le chunk `Footer.*.css` (fonts + reset + footer) est bien un chunk **unique réutilisé** entre les pages (vérifié en comparant `dist/index.html` et `dist/theorie/nika/index.html`) → mise en cache correcte entre pages, pas de duplication.
- **Homepage** : étapes numérotées 1→2→3 sur le parcours "Comprendre la théorie", extraits (`summary`) sur les articles récents.
- **QA automatisée** : 8 fichiers de tests unitaires (contrastes, tokens CSS, sidebar, timeline, régressions UI/UX) + tests e2e Playwright incluant `axe.spec.ts` (accessibilité), `mobile-nav.spec.ts`, `overlays-clavier.spec.ts`. C'est un niveau de rigueur rare pour un site éditorial de cette taille.

Ce socle est déjà très mûr. Les optimisations restantes sont donc plus fines / marginales que critiques.

---

## 🟠 Optimisations réelles restantes

### 1. Performance

| # | Constat | Détail | Action |
|---|---|---|---|
| 1.1 | `og-default.png` = **920 Ko** | Les autres `og-*.png` générés automatiquement font ~20-25 Ko pour la même résolution (1200×630). `og-default.png` est une image "de marque" non régénérée par le script, jamais compressée. | Recompresser avec `pngquant`/`oxipng` ou repasser par le pipeline de génération. Impact : partage social plus rapide (WhatsApp/Discord/X timeout parfois sur >1 Mo), moins de bande passante CDN. Gain estimé : -600 à -750 Ko sans perte visible. |
| 1.2 | `favicon.ico` (16 Ko) conservé en plus de `favicon.svg` + `favicon.png` | Format bitmap obsolète, doublon avec le SVG déjà servi en priorité. | Supprimer `favicon.ico` si aucun `<link rel="shortcut icon">` ne le référence explicitement (vérifié : aucune référence dans le code source, seul le `.svg`/`.png` sont liés dans `BaseLayout.astro`). |
| 1.3 | Décor animé plein écran sur **toutes** les pages (`BackgroundScene.astro`) | 6 SVG en mouvement perpétuel (jusqu'à 90 s de boucle) + `wallpaper.webp` en fond fixe, sur chaque page, y compris les pages de lecture longue (articles, théorie complète). Bien géré côté a11y (`prefers-reduced-motion`) mais reste un coût CPU/GPU continu sur mobile bas de gamme même sans interaction. | Envisager de couper l'animation après ~10-15 s d'inactivité de scroll (garder le fond statique), ou de la limiter à la page d'accueil / pages "vitrine" plutôt qu'aux pages de lecture dense. |
| 1.4 | Pas de compression Brotli/Cache-Control visibles dans le repo (dépend de l'hébergeur Cloudflare/Wrangler) | `wrangler.jsonc` minimal. | Vérifier les en-têtes `Cache-Control` sur les assets statiques `_astro/*` (immutables, hash dans le nom) une fois déployé — souvent oublié même quand Astro fait bien son travail côté build. |

### 2. Navigation / architecture de l'information

| # | Constat | Détail | Action |
|---|---|---|---|
| 2.1 | Carte mentale toujours "vue simplifiée" | `DiagramViewport.astro` n'offre qu'un conteneur scrollable + bouton plein écran, pas de vrai graphe (zoom/pan/drag, `carte-mentale.astro` est un SVG statique). C'est le seul point des anciens audits qui reste non résolu en profondeur. | Court terme : rien à changer, le disclaimer existe déjà. Long terme : un vrai graphe interactif (D3/Cytoscape/vis-network) reste la fonctionnalité la plus attendue pour un site qui se présente comme wiki de théorie visuelle. |
| 2.2 | Statuts "Contredite" et "Réfutée" visuellement identiques à une simple "Hypothèse" grisée | Dans `src/utils/format.ts`, `editorialStatusToFrench()` mappe `contredite` **et** `refutee` sur `meta-badge--muted`, la même classe neutre utilisée ailleurs pour "peu de certitude". Un lecteur pressé peut confondre "idée invalidée par le manga" et "idée pas encore confirmée". | Créer une classe dédiée (ex. `meta-badge--refuted`) utilisant `var(--alert)` (déjà défini dans le design system, utilisé ailleurs) avec éventuellement une icône barrée, pour bien distinguer "réfuté" de "hypothèse ouverte". |
| 2.3 | Pas de page "Prédictions" dédiée | Les fiches `src/content/predictions/*.md` (5 fichiers) ne semblent référencées que via les pages chapitres, pas de page listant l'ensemble des prédictions actives/confirmées/réfutées avec leur statut. Le README mentionne pourtant "refonte légère de la page Prédictions" comme item prévu. | Si le contenu existe déjà (5 prédictions avec statut), une page `/theorie/predictions` ou équivalent listant toutes les prédictions avec badge de statut serait un point d'entrée à forte valeur pour les lecteurs qui suivent le manga chapitre par chapitre. |
| 2.4 | Pas de système de favoris/marque-page | Toujours absent (confirmé : aucune trace de `bookmark`/`favoris` dans le JS). Sur un wiki à 140+ pages avec une taxonomie dense (11 catégories, sous-catégories, chapitres), un lecteur qui revient régulièrement n'a pas de "ma liste" personnelle. | `localStorage` + petit bouton "☆" sur les fiches, page `/mes-favoris` listant les slugs sauvegardés. Faible effort, gain de rétention. |

### 3. UI / Design

| # | Constat | Détail | Action |
|---|---|---|---|
| 3.1 | Décor animé + wallpaper sur les pages de lecture longue | Même remarque que 1.3 côté UX : sur une page d'article de théorie de 15-20 min de lecture, les formes flottantes en arrière-plan (bus, sabliers) sont une touche d'identité sympathique mais peuvent devenir une **distraction visuelle périphérique** pendant une lecture dense, même à faible opacité. | Le mode zen existant est la bonne réponse — s'assurer qu'il est bien mis en avant (pas juste un petit bouton) sur les articles les plus longs (théorie complète, chronologie). |
| 3.2 | Cohérence de longueur entre `og-default.png` (image "brandée" statique) et les `og-*.png` générés (cartes typographiques) | Les partages sociaux de la home auront un rendu visuellement différent du reste du site (photo/illustration vs carte générée). | Vérifier que c'est un choix assumé (image de marque pour la home) plutôt qu'un oubli du script de génération — sinon régénérer `og-default.png` avec le même pipeline pour cohérence de marque. |

### 4. Accessibilité (fine)

L'accessibilité est déjà à un très bon niveau (labels systématiques sur les badges, `aria-live` sur la recherche, focus trap, tests `axe-core` en CI). Deux points fins restent à vérifier manuellement (non vérifiables par lecture de code seule) :

- **Hiérarchie de titres sur les pages "Explorer"** (schémas SVG denses type `guerre-finale.astro`, `poneglyphes.astro`) : à valider avec un outil d'audit de structure de headings, ces pages étant plus visuelles que textuelles.
- **Alt text du contenu Markdown** : dépend entièrement des rédacteurs (le composant `R2Image` exige `alt` en prop obligatoire, ce qui est une bonne garde-fou, mais rien n'empêche un `alt=""` vide ou peu descriptif côté contenu).

### 5. Hygiène du repo (méta-UX pour les contributeurs)

- **6 fichiers d'audit UI/UX à la racine** (`ANALYSE-UI-UX-2026.md`, `AUDIT-UI-UX-2026-08-08.md`, `AUDIT-UI-UX-A11Y-2026-08-09.md`, `AUDIT-UI-UX-A11Y-2026-FRAIS.md`, `AUDIT-UX-UI.md`, `REVISION-AUDIT-UI-UX-A11Y-2026-08-08.md`, + celui-ci) se chevauchent largement et certains contiennent des informations obsolètes (ex. mention de React alors qu'il n'y en a plus). Pour un contributeur qui arrive, c'est difficile de savoir quel document fait foi.
  - **Action recommandée** : déplacer les audits historiques dans `docs/audits/` et ne garder à la racine qu'un seul document "état actuel" mis à jour en continu (ce fichier peut jouer ce rôle et remplacer les précédents plutôt que s'y ajouter).

---

## 🎯 Priorisation

**Quick wins (< 1h, impact immédiat)**
1. Compresser `og-default.png` (920 Ko → ~150-250 Ko).
2. Supprimer `favicon.ico` s'il n'est plus référencé.
3. Distinguer visuellement "Réfutée/Contredite" des "Hypothèses" (classe badge dédiée avec `--alert`).
4. Consolider les 6 fichiers d'audit en un seul document de référence.

**Moyen terme**
5. Page "Prédictions" listant statuts (en cours/confirmée/réfutée) — contenu déjà existant, juste besoin d'une vue.
6. Couper ou limiter l'animation de fond sur les pages de lecture longue / après inactivité.
7. Mettre en avant le mode zen sur les articles longs (bouton plus visible, ou activation suggérée après X secondes de scroll).

**Long terme**
8. Vraie carte mentale interactive (graphe zoomable/draggable) — le seul gros chantier UX qui reste ouvert depuis plusieurs audits.
9. Système de favoris/marque-page en `localStorage`.

---

*Analyse réalisée le 11/08/2026 par inspection du code, build de production réel (`astro build`) et exécution de la suite de tests (`vitest run` — 99/99 verts). Recommandé : compléter par un test utilisateur sur le site déployé (https://lesfousdubus.sbs) pour valider les points 1.3/3.1 (perception du décor animé pendant la lecture), impossibles à juger uniquement par lecture de code.*
