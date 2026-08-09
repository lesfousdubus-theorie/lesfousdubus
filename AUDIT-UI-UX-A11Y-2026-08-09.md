# Audit UI / UX / Accessibilité — Les Fous du Bus — 09/08/2026

> **Analyse fraîche du code actuel** (branche `arena/019fe3d4-lesfousdubus`, commit `71a8d25`).
> Méthode : lecture exhaustive de `src/` (layouts, 18 composants, pages clés), build réel
> (`npm run build` ✓ 144 pages), `npm test` ✓ 70/70, `astro check` ✓ 0 erreur / 5 hints,
> mesures de poids sur `dist/`. Croisé avec les audits précédents pour ne lister que ce qui
> est **encore vérifiable aujourd'hui** — les points déjà corrigés ne sont pas répétés.
> Référentiels : heuristiques Nielsen + WCAG 2.2 AA.

---

## 📊 Synthèse

| Niveau | Nb | Nature |
|---|---|---|
| 🔴 Bugs fonctionnels | 2 | Navigation tablette tactile, drawer TOC |
| 🟢 Accessibilité | 8 | Clavier, ARIA, sémantique |
| 🟠 UX | 4 | Découverte, reprise de lecture, recherche |
| 🟡 UI / design system | 3 | Tokens, cohérence |
| 🔵 Performance | 4 | Fonts, React, images, recherche |
| 🧪 Qualité / tests | 3 | Hints, e2e, CI |
| **Total** | **24** | |

---

## 🔴 1. Bugs fonctionnels

### 1.1 Les 4 liens de rubrique de la navbar ne naviguent jamais sur tablette tactile
**Fichier :** `src/components/Navbar.astro` (script « Dropdown click support »).
Le handler intercepte le clic dès que `'ontouchstart' in window || maxTouchPoints > 0`,
**quelle que soit la largeur**. Sur iPad (≥1024px, écran tactile), la navbar desktop est
affichée, mais :
- 1ᵉʳ tap → `preventDefault()` + ouverture du dropdown ;
- 2ᵉ tap → `isOpen` → `closeAllDropdowns()` + `preventDefault()` → **ferme sans naviguer** ;
- 3ᵉ tap → réouvre… Les rubriques « La théorie », « Dossiers », « Chapitres », « Explorer »
  ne sont **jamais navigables en tant que liens**.

Conséquence directe : `/theorie` (l'index) est **inatteignable depuis la navbar sur tablette
tactile** — le dropdown « La théorie » ne contient que Résumé/Complète/Chronologie, pas l'index.
**Fix :** au 2ᵉ tap, laisser la navigation se faire (ne pas `preventDefault()` si déjà ouvert),
ou ouvrir au 1ᵉʳ tap et naviguer au 2ᵉ. Ajouter aussi un lien « Vue d'ensemble de la théorie »
dans le dropdown pour que la page index reste atteignable partout.
**Test :** Playwright `hasTouch: true`, viewport 1180×820 → 2 taps sur « La théorie » → URL `/theorie`.

### 1.2 Drawer TOC (mobile/tablette) : ni focus déplacé, ni focus trap, ni `inert`
**Fichier :** `src/layouts/WikiLayout.astro` (`toggleToc`).
Le tiroir « Sommaire » s'ouvre sans déplacer le focus (il reste sur le FAB), sans piège à
Tab et sans rendre le reste de la page `inert` — contrairement au tiroir de navigation mobile
et à la modale de recherche qui le font correctement. Un utilisateur clavier/lecteur d'écran
ne sait pas que le panneau est ouvert et peut tabuler « derrière » un overlay visible.
**Fix :**
- à l'ouverture : `tocClose?.focus()` (ou le premier lien du TOC) ;
- `inert` sur `.layout` + navbar tant que le drawer est ouvert (même pattern que `lockScroll`) ;
- fermeture : focus rendu au FAB (déjà fait ✓, à conserver).

---

## 🟢 2. Accessibilité (WCAG 2.2 AA)

### 2.1 Resizer de sidebar : étiqueté ARIA mais inutilisable au clavier (2.1.1)
**Fichier :** `WikiLayout.astro` — `<div id="sidebar-resizer" aria-label="Redimensionner la barre latérale">`.
Élément non focusable, pilotable uniquement à la souris (`mousedown`/`touchstart`).
`aria-label` sur un `<div>` non interactif est en outre invalide.
**Fix :** soit `role="separator"` + `aria-orientation="vertical"` + `tabindex="0"` +
redimensionnement aux flèches ←/→ (pas de 20px, Home/End pour min/max), soit retirer
l'`aria-label` et le `title` si on le considère purement souris.

### 2.2 Hiérarchie de titres cassée sur `/chapitres` (h2 → h4)
**Fichier :** `src/pages/chapitres/index.astro` — les cartes de chapitres utilisent `<h4>`
juste après le `<h2 class="section-title">` (niveau h3 sauté). Détecté par axe (`heading-order`),
et incohérent avec `chapitres/[page].astro` qui utilise `<h2>` pour le même contenu.
**Fix :** passer les titres de cartes en `<h3>` (le `.nav-card` utilise déjà h3).

### 2.3 Combobox de recherche : `aria-expanded` vrai sans listbox
**Fichier :** `src/components/SearchModal.tsx` — `aria-expanded={showResults || showNoResults}`.
Dans l'état « aucun résultat », `role="listbox"` (`#search-results`) n'existe pas dans le DOM :
`aria-expanded="true"` + `aria-controls` pointe alors dans le vide.
**Fix :** `aria-expanded={showResults}`.

### 2.4 `aria-controls` du filtre de sidebar pointe vers un conteneur toujours vide
**Fichier :** `src/components/SidebarNav.astro` — `aria-controls="sidebar-filter-results"`
référence un `<div>` qui n'est jamais alimenté (le filtre masque directement les `<li>`).
**Fix :** supprimer l'attribut (le live region `#sidebar-filter-status` couvre déjà l'annonce).

### 2.5 Dropdowns navbar : `aria-expanded` désynchronisé en ouverture hover/focus
**Fichier :** `Navbar.astro`. L'ouverture par `:hover`/`:focus-within` (desktop) ne met pas à
jour `aria-expanded` ; seul le chemin clic/clavier le fait. Par ailleurs `aria-haspopup="true"`
sur des liens qui naviguent aussi est une sémantique discutable.
**Fix (léger) :** synchroniser via `pointerenter`/`focusin` sur `.nav-item`, ou assumer un
disclosure simple et retirer `aria-haspopup`.

### 2.6 Lightbox : focus trap incomplet + pattern image-bouton
**Fichier :** `src/layouts/ArticleLayout.astro`.
- Le `inert` n'est posé que sur `#main-content` : la navbar et la sidebar restent tabables
  derrière le `role="dialog"` (le trap keydown compense, mais le DOM extérieur reste atteignable
  si le focus y est déjà).
- Les images deviennent `<img role="button" tabindex="0">` via JS : préférer un vrai `<button>`
  wrapper (ou `<a>` avec `role` inchangé) — un `img` porteur de rôle interactif reste mal annoncé
  par certains lecteurs d'écran.
- Boutons prev/next positionnés à `∓60px` **hors** du conteneur : entre ~770 et ~1100px de
  viewport, ils peuvent être rognés par le padding de l'overlay. Les rentrer dans le container
  (overlay semi-transparent au-dessus de l'image) sur toutes les largeurs.

### 2.7 Tiroir mobile : la navbar reste focusable derrière l'overlay
**Fichier :** `WikiLayout.astro`. `mainContent` est bien `inert`, mais les boutons de la navbar
(thème, loupe — pourtant neutralisés visuellement via `pointer-events:none`) restent atteignables
au Tab quand le tiroir est ouvert.
**Fix :** `inert` sur la navbar (hors bouton hamburger) quand `data-nav-open="mobile"`,
ou étendre le trap existant au périmètre complet tiroir + navbar.

### 2.8 Raccourci clavier affiché « Ctrl K » sur toutes les plateformes
**Fichiers :** `Navbar.astro` (`.search-shortcut`), `SearchModal.tsx` (footer `kbd`).
Sur macOS le raccourci actif est ⌘K ; l'affichage « Ctrl K » y est faux.
**Fix :** détecter `navigator.platform`/`userAgentData` au rendu côté client et afficher `⌘K` ou `Ctrl K`.

---

## 🟠 3. UX

### 3.1 Accueil : 4 catégories sur 11 sans carte d'accès direct
**Fichier :** `src/pages/index.astro` — 7 `CategoryCard` pour 11 catégories. Manquent :
**Personnages et identités**, **Peuples, royaumes et témoins**, **Dieux et croyances**,
**Transmission et mémoire**. Ces thèmes sont majeurs dans la théorie (identités, Nika, mémoire).
**Fix :** passer la grille en `repeat(4,1fr)` ≥1024px avec 8 cartes (ajouter « Personnages et
identités » et « Dieux et croyances », fusionner ou renvoyer le reste via « Voir tous les
dossiers »), ou 11 cartes + « Voir tout ».

### 3.2 Pas de « Récemment lus » pour la reprise de lecture
Pour un wiki consulté en plusieurs sessions, la sidebar n'offre aucun moyen de reprendre où on
s'était arrêté (la recherche a ses « récents », pas la navigation).
**Fix :** section « Récemment lus » en haut de `SidebarNav` (3–5 entrées, `localStorage`,
même logique que `fousdu-recent-searches`), rendue côté client pour rester statique.

### 3.3 États de la recherche non annoncés aux lecteurs d'écran
**Fichier :** `SearchModal.tsx` — « Recherche en cours… » et l'arrivée des résultats sont des
`<div>` purement visuels. Ajouter un `role="status" aria-live="polite"` (texte masqué ou visible)
qui annonce « Recherche en cours… », puis « N résultats ».

### 3.4 Miniature vidéo YouTube toujours chargée chez un tiers
**Fichier :** `src/pages/index.astro` — `https://img.youtube.com/vi/SgJ25zjMJyo/maxresdefault.jpg`.
Requête third-party avant tout clic (vie privée, CSP, résilience). Déjà signalé dans les audits
précédents, toujours présent.
**Fix :** self-hoster la vignette (`public/images/video-cover.webp`, ~30 Ko), fallback local conservé.

---

## 🟡 4. UI / Design system

### 4.1 Radius littéraux résiduels face aux tokens
**Fichier :** `Navbar.astro` — `.navbar-sidebar-toggle`, `.theme-btn`, `.icon-btn` utilisent
`border-radius: 8px` en dur au lieu de `var(--border-radius)`. (Idem quelques `50%` / `7px`
dans `[page].astro`.) À remplacer pour que l'échelle de tokens reste la seule source.

### 4.2 Déclarations CSS dupliquées (cleanup)
- `CategoryCard.astro` `.card { … overflow: hidden; … overflow: hidden; }` (dupliqué).
- `ArticleListItem.astro` `.article-item` idem.
Sans impact visuel, mais à nettoyer pour éviter les fausses bonnes idées lors des éditions futures.

### 4.3 Ombres « dures » `rgba(0,0,0,…)` en mode clair
Plusieurs composants gardent des ombres noires identiques dans les deux thèmes
(lightbox, hover cards, TOC FAB). En mode clair elles paraissent sales sur le fond washi.
**Fix :** token `--shadow-color` par thème (`color-mix(in srgb, var(--text-main) 12%, transparent)`
en light, noir en dark).

---

## 🔵 5. Performance

### 5.1 Polices : tous les subsets importés → CSS 88 Ko + 34 fichiers woff2
**Mesuré sur `dist/` :** le bundle CSS principal (`Footer.*.css`, chargé par **toutes** les pages,
render-blocking) fait **88 Ko** et contient **39 `@font-face`** (Manrope 5 graisses + Fraunces
3 graisses × subsets cyrillic/greek/vietnamese/latin-ext/latin) ; 34 woff2 sont émis.
Un site 100 % français n'a besoin que du subset **latin**.
**Fix :**
- importer `@fontsource/manrope/latin-400.css` etc. (gain ~50 Ko de CSS, 25+ requêtes potentielles en moins) ;
- réduire les graisses : vérifier l'usage réel de Manrope 500/800 et Fraunces 600
  (Fraunces n'est utilisé qu'en titres 700/800). Chaque graisse latine ≈ 15–20 Ko.
- Alternative propre : `astro-font` / sous-setting local avec `unicode-range` conservé.

### 5.2 React + react-dom (~190 Ko JS) hydratés sur chaque page
**Mesuré :** `client.*.js` = 184 Ko (react-dom) + react + `SearchModal` (19 Ko), chargés sur
**toutes** les pages via `<SearchModal client:load />` dans `Navbar.astro`. Choix documenté
(fiabilité du bouton sur 3G), mais c'est le plus gros poste JS du site.
**Options (par ordre d'effort) :**
1. Préchauffage : `<link rel="modulepreload">` des chunks React + `import()` de Pagefind au
   `pointerenter`/`focusin` sur la loupe (garde `client:load`, zéro risque) ;
2. Basculer en `client:idle` avec file d'attente : un script inline ouvre un état « chargement… »
   si on clique avant hydratation (supprime le reproche historique) ;
3. Réécrire la modale en vanilla (~100 lignes) et supprimer React du site entirely (gain ~60 Ko gzip/page).

### 5.3 Images Markdown non optimisées : 19 Mo dans `public/images/`, CLS garanti
**Mesuré :** 83 fichiers (dont PNG >300 Ko), servis tels quels ; les `![](/images/threads/…)`
du markdown produisent des `<img>` **sans `width`/`height`** (CLS), sans `srcset`, sans WebP,
affichés plafonnés à `max-height:450px` (on télécharge plus grand que l'affichage).
**Fix :**
- pipeline d'optimisation : script de conversion WebP/AVIF (ou migration vers `astro:assets`
  avec images hors `public/`) + dimensions injectées ;
- plugin rehype qui ajoute `loading="lazy" decoding="async"` + `width/height` aux `<img>` markdown ;
- viser <150 Ko par image affichée.

### 5.4 Debounce de recherche à 180 ms
**Fichier :** `SearchModal.tsx` — perceptible en « instantané ». Passer à 100–120 ms, avec
déclenchement immédiat au 1ᵉʳ caractère.

---

## 🧪 6. Qualité / tests

- **6.1 Hints `astro check` (5)** : variables inutilisées dans `scripts/generate-og.mjs`
  (`dirname`, `existsSync`) et `scripts/validate-p3.mjs` (`id`, `CHAP`) ; `document.execCommand`
  déprécié dans le fallback clipboard d'`ArticleLayout.astro` (chemin de secours, à garder mais
  on peut supprimer le hint avec un `// @ts-expect-error` commenté ou un fallback `navigator.clipboard` seul).
- **6.2 e2e à étendre** (`e2e/`) : Échap ferme chaque overlay (recherche, tiroir mobile, TOC,
  lightbox) ; Ctrl+K ouvre la recherche avec focus dans l'input ; Tab complet navbar→footer sans
  piège ; cas tactile tablette du §1.1.
- **6.3 CI accessibilité** : intégrer `@axe-core/playwright` sur 4–5 pages types (accueil,
  article, chapitres, explorer, dossiers) avec seuil bloquant sur les violations A/AA.

---

## ✅ Ce qui est solide (vérifié aujourd'hui — ne pas régresser)

- Build 144 pages en ~5 s, 0 erreur ; tests 70/70 dont contraste AA verrouillé par calcul
  (dark **et** light, `text-muted` inclus) ; `astro check` 0 erreur.
- Thème : pas de FOUC, suivi système non épinglé, `theme-color` dynamique, manifest aligné.
- A11y acquise : skip-link, `lang="fr"`, breadcrumbs `<ol>` + `aria-current="page"`, focus
  visibles globaux, `prefers-reduced-motion` global, tap targets 44 px, filtre sidebar avec
  live region, emojis décoratifs `aria-hidden`, `scrollbar-gutter: stable`, scroll-lock sans
  `position:fixed`, retour de focus à la fermeture (tiroir mobile), combobox avec
  `aria-activedescendant` pointant sur le lien actif, prefetch Astro actif, JSON-LD complet.

---

## 🎯 Plan d'action priorisé

**Sprint 1 — Correctifs (½ journée)**
1. §1.1 Navigation tablette tactile (bug bloquant) + test Playwright tactile.
2. §1.2 Drawer TOC : focus + `inert`.
3. §2.2 h4→h3 sur `/chapitres` ; §2.3 `aria-expanded` combobox ; §2.4 `aria-controls` filtre.
4. §4.1/§4.2 cleanup tokens/CSS.

**Sprint 2 — A11y clavier & lecteurs d'écran (1 jour)**
5. §2.1 resizer clavier (ou retrait étiquette) ; §2.5 synchro `aria-expanded` hover.
6. §2.6 lightbox (prev/next intérieurs, wrapper `<button>`) ; §2.7 `inert` navbar.
7. §2.8 ⌘K/Ctrl K ; §3.3 live region recherche.

**Sprint 3 — UX & contenu (1 jour)**
8. §3.1 cartes d'accueil manquantes ; §3.2 « Récemment lus » sidebar.
9. §3.4 vignette vidéo self-hostée.

**Sprint 4 — Performance (1–2 jours)**
10. §5.1 fonts latin + graisses réduites (mesurer le CSS avant/après).
11. §5.3 pipeline images (WebP + dimensions + lazy) — plus gros gain mobile.
12. §5.2 stratégie SearchModal (option 1 minimum) ; §5.4 debounce.

**Sprint 5 — Filet de sécurité (½ jour)**
13. §6.1 hints ; §6.2 e2e overlays/clavier ; §6.3 axe-core en CI.

---

*Rapport généré le 09/08/2026 sur la branche `arena/019fe3d4-lesfousdubus` (commit `71a8d25`),
à partir du code source réel et d'un build mesuré — pas de reprise d'items non vérifiés.*

---

## ✅ Corrections appliquées (09/08/2026)

Toutes les actions ci-dessous ont été implémentées et vérifiées :
`npm test` ✓ 70/70 · `astro check` ✓ **0 erreur / 0 warning / 0 hint** · `npm run build` ✓ 144 pages.

| # | Correction | Fichiers | Vérification |
|---|---|---|---|
| 1.1 | Navigation tablette tactile : le 2ᵉ tap navigue au lieu de fermer ; test e2e tactile ajouté | `Navbar.astro`, `e2e/overlays-clavier.spec.ts` | logique relue + spec |
| 1.2 | Drawer TOC : focus sur « fermer » à l'ouverture, `inert` sur le fond, focus trap, focus rendu au FAB | `WikiLayout.astro` | spec e2e dédiée |
| 2.1 | Resizer clavier : `role="separator"`, `tabindex="0"`, flèches ←/→ (pas de 20 px), Home/End, `aria-valuenow` | `WikiLayout.astro` | build |
| 2.2 | h4 → h3 sur `/chapitres` (hiérarchie + cohérence avec `[page].astro`) | `chapitres/index.astro` | grep build : 0 `<h4>` |
| 2.3 | `aria-expanded={showResults}` uniquement (plus d'état vrai sans listbox) | `SearchModal.tsx` | build |
| 2.4 | `aria-controls` pendant + `<div>` résultats vide supprimés | `SidebarNav.astro` | grep build : 0 occurrence |
| 2.5 | `aria-expanded` synchronisé en ouverture hover/focus (si `hover:hover`) ; `aria-haspopup` retiré, ArrowDown conserve le même comportement | `Navbar.astro` | build |
| 2.6 | Lightbox rendue HORS de `<main>` (slot `overlays` — le `inert` neutralisait la modale elle-même, bug caché), fond entièrement `inert`, miniature enveloppée dans un vrai `<button>`, prev/next superposés à l'image (plus rognés), bouton fermer en position fixe | `ArticleLayout.astro`, `WikiLayout.astro` | HTML build : lightbox après `</main>` |
| 2.7 | Navbar (`nav-left/center/actions`) `inert` derrière le tiroir mobile ouvert | `WikiLayout.astro` | spec e2e |
| 2.8 | Raccourci affiché « ⌘ K » sur macOS, « Ctrl K » ailleurs | `Navbar.astro` | build |
| 3.1 | Accueil : 11/11 catégories exposées (+ Personnages et identités, Peuples/royaumes, Dieux et croyances, Transmission et mémoire) | `pages/index.astro` | grep build : 11 ancres |
| 3.2 | Section « Récemment lus » en haut de sidebar (localStorage, 5 entrées, page courante exclue) + alimentation sur chaque fiche | `SidebarNav.astro`, `ArticleLayout.astro` | build |
| 3.3 | Live region `role="status"` annonçant « Recherche en cours… / N résultats / Aucun résultat » | `SearchModal.tsx` | build |
| 3.4 | Vignette vidéo : mécanisme auto-hébergé en place (`public/images/video-cover.webp` détecté au build) + script `scripts/fetch-video-cover.sh`. **À exécuter hors sandbox** (réseau YouTube bloqué ici) — en attendant, le comportement distant + repli local est conservé | `pages/index.astro`, `scripts/fetch-video-cover.sh` | build |
| 4.1 | Radius littéraux (8px) remplacés par `var(--border-radius)` | `Navbar.astro` | build |
| 4.2 | Déclarations `overflow: hidden` dupliquées supprimées | `CategoryCard.astro`, `ArticleListItem.astro` | diff |
| 4.3 | Token `--shadow-color` par thème créé ; ombres noires remplacées (hover-lift, TOC FAB, drawers, lightbox, BackToTop, cartes) | `global.css` + 6 composants | build |
| 5.1 | Polices : subsets **latin uniquement** → bundle CSS principal **88 → 50,8 Ko (−42 %)**, `@font-face` 39 → 8, woff2 émis 34 → 8, zéro font base64 | `global.css` | mesuré sur `dist/` |
| 5.2 | `SearchModal` passe de `client:load` à `client:idle` **sans perte de fiabilité** : script inline « demande en attente » (clic loupe ou Ctrl/⌘K avant hydratation → la modale s'ouvre dès le montage, `aria-busy` entre-temps) | `Navbar.astro`, `SearchModal.tsx` | build (`client="idle"`) |
| 5.3 | Pipeline images : 81 fichiers convertis en **WebP** (19 Mo → 7,5 Mo), dimensions injectées (`width`/`height` anti-CLS) via plugin rehype + carte JSON, `loading="lazy"` + `decoding="async"` ; images cassées de `galley-la` réparées (placeholders déplacés, refs 14/15 retirées) | `scripts/optimize-thread-images.sh`, `src/plugins/rehype-image-dimensions.mjs`, `src/utils/image-dimensions.json`, 20 md | mesuré + grep build |
| 5.4 | Debounce recherche 180 → 120 ms, 1ʳᵉ frappe immédiate | `SearchModal.tsx` | diff |
| 6.1 | 5 hints `astro check` → **0** (imports inutilisés supprimés, fallback clipboard conservé sans hint) | `scripts/generate-og.mjs`, `scripts/validate-p3.mjs`, `ArticleLayout.astro` | `astro check` |
| 6.2 | Specs e2e ajoutées : Ctrl+K + focus, Échap, drawer TOC (focus/inert), navbar inert tiroir mobile, 2 taps tablette tactile | `e2e/overlays-clavier.spec.ts` | écrites ; exécution impossible en sandbox (CDN Playwright bloqué), à lancer en local/CI |
| 6.3 | Scan axe-core WCAG A/AA sur 5 pages types | `e2e/axe.spec.ts`, dépendance `@axe-core/playwright` ajoutée | idem |

**Bug supplémentaire découvert et corrigé pendant l'implémentation :**
- le filtre de la sidebar était **silencieusement inopérant** : `querySelector('[data-pagefind-ignore]')` ciblait la navbar (premier élément du DOM portant cet attribut). La sidebar a désormais `id="sidebar-nav-root"` et le filtre la cible explicitement (`SidebarNav.astro`).

**Reste à faire hors sandbox (réseau requis) :**
1. `bash scripts/fetch-video-cover.sh` → auto-héberge la vignette vidéo (le build bascule automatiquement dessus).
2. `npx playwright install chromium && npm run test:e2e` → exécute les nouvelles specs (overlays/clavier + axe).

---

## 🔎 Passe 2 — revérification complète & nouveaux bugs cachés (09/08/2026)

Revérification intégrale après la passe 1 : `npm test` ✓ 70/70 · `astro check` ✓ 0/0/0 ·
`npm run build` ✓ 144 pages · smoke-test HTTP ✓ 19 URLs en 200 · scan de liens ✓ 157 pages sans
lien interne cassé · scan d'ancres ✓ toutes résolues · JSON-LD ✓ 16 blocs valides · RSS ✓ 110 items ·
balayage accessibilité du dist ✓ (1 seul `<h1>` par page réelle, aucun bouton/lien sans nom accessible).

### Nouveaux bugs cachés découverts et corrigés

| # | Bug | Impact | Correctif |
|---|---|---|---|
| H1 | `closeMobileNavIfOpen` (lightbox) retirait les classes des drawers **sans retirer les attributs `inert`/`aria-hidden`** posés par WikiLayout | Si ce chemin défensif s'était déclenché, la page restait définitivement gelée (navbar + contenu inertes) | Nettoyage complet de tous les états `inert`/`aria-hidden`/`aria-expanded` des deux drawers |
| H2 | Pages **404/500** : le hamburger appelait `lockScroll()` sans tiroir à afficher, et rien ne permettait de déverrouiller | Scroll définitivement figé sur mobile | `toggleMobile`/toggle desktop ignorés sans sidebar + hamburger `disabled` et masqué via prop `hideMobileToggle` |
| H3 | Frontmatter `related:` : **13 références vers des slugs renommés** (`poseidon`, `pluton`, `zunesha`, `davy-jones`, `lili-vivi-et-les-poneglyphes`) — filtrées silencieusement | Boîtes « Articles liés » / RelationMap incomplètes sur 10 fiches | Slugs remplacés par les canoniques (`poseidon-fiche`…) ; auto-références retirées |
| H4 | `chapters/1180.md` référençait la fiche inexistante `lulusia` dans `updatedArticles` | Liste d'impact silencieusement amputée | Référence retirée (commentaire explicatif) |
| H5 | `resize` desktop réinitialisait **à chaque redimensionnement** la préférence « sidebar repliée » (ouverture devtools, zoom…) | Choix utilisateur écrasé | Reset uniquement si le tiroir a été manipulé en mobile (drapeau `mobileManipulated`) |
| H6 | Zones cliquables de la fresque d'Elbaf : focusables mais **sans nom accessible ni rôle** | Lecture écran : « graphic » sans étiquette | `role="button"` + `aria-label="Zone de la fresque : …"` |
| H7 | Nœuds de la carte mentale : navigation au clic uniquement, **inaccessibles au clavier** | 34 nœuds inatteignables sans souris | `<g>` focusables `role="link"` + Entrée/Espace + indicateur de focus |
| H8 | Clic sur lien du drawer TOC : le drawer se refermait et **le focus tombait dans le vide** | Perte de position clavier | Focus déplacé vers la section ciblée (`tabindex="-1"` + `focus({preventScroll})`) |
| H9 | `BackToTop` et scroll-vers-actif de la sidebar utilisaient `behavior:'smooth'` en JS, **ignorant `prefers-reduced-motion`** (le CSS ne couvre que `scroll-behavior`) | Mouvement imposé aux utilisateurs qui le refusent | Détection `matchMedia` → `auto` si réduit |
| H10 | `generate-og.mjs` tentait de régénérer les 8 images OG **à chaque build** (erreurs Pillow dans les environnements sans PIL, risque d'écrasement) | Bruit de build + fragilité | Skip si l'image existe déjà (`[og] 0 générée(s), 8 déjà présente(s)`) |
| H11 | `ChapterBanner` : déclaration `overflow:hidden` dupliquée + ombre noire en dur | Cohérence design system | Nettoyé + `var(--shadow-color)` |

### Vérifiés sains lors de la passe 2 (aucune action requise)

- Redirections `astro.config` : pages meta-refresh avec `noindex` + canonical vers la cible ✓.
- Parcours de lecture : 19 slugs, tous publiés ✓.
- Images : toutes les `<img>` du contenu ont `width`/`height`/`lazy` (seules exceptions légitimes :
  façade vidéo dans conteneur 16:9 réservé, img lightbox à src dynamique).
- Pas d'`aria-hidden` contenant un élément focusable ; pas d'id dupliqué sur les pages types.
- FAQ/glossaire/plan-du-site : hiérarchies de titres correctes ; dossiers/anchors navbar tous résolus.
- `prefetch` Astro actif, `manifest.json` aligné, robots/llms.txt générés.

**À faire hors sandbox (inchangé) :** `scripts/fetch-video-cover.sh` (réseau YouTube) et
`npm run test:e2e` après `npx playwright install chromium`.
