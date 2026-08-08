# Audit UI / UX / Accessibilité — Les Fous du Bus — 08/08/2026 (état actuel du code)

> Analyse statique du code (`src/`) + tests unitaires (63/63 pass) + revue heuristique Nielsen/WCAG 2.2 AA.
> Bases : Astro 7 + React 19 + Tailwind 3 + Pagefind, sur branche `arena/019fe2f4-lesfousdubus`.
>
> **Note :** 80 % des points critiques listés dans les audits précédents (`AUDIT-UI-UX-2026-08-08.md`) ont **déjà été corrigés** (TOC FAB mobile/tablette, breadcrumb `<ol>`, favoris recherche récents/populaires, mode zen, wallpaper light-mode caché, tap-targets 44px, self-host fonts, Pagefind singleton, scroll-lock sans `position:fixed`, reduced-motion, etc.).
>
> Ce document liste ce qui **reste à faire** à la date du jour, trié par criticité.

---

## 📊 Synthèse chiffrée

| Niveau   | Nombre | Type                                 |
| -------- | ------ | ------------------------------------ |
| 🔴 Bloquant / bug fonctionnel | 4  | Tokens manquants, CSS cassés, JS cassant l'accessibilité |
| 🟠 UX Majeur       | 7  | Parcours, découverte, cohérence       |
| 🟡 UI / Polish     | 12 | Design system, micro-interactions     |
| 🟢 Accessibilité   | 9  | WCAG 2.2 AA, screen readers, clavier  |
| 🔵 Performance    | 6  | Mobile, assets, hydration             |
| 🧪 Tests / Qualité | 3  | Non-régressions automatisées          |
| **Total**         | **41** |                                       |

---

## 🔴 1. Bloquants / Bugs à corriger immédiatement

### 1.1 Token `--text-muted` non défini → texte hérité/cassé
**Fichiers** : `src/components/Footer.astro`, `SidebarNav.astro` (`.sidebar-link--dossier`), `ArticleLayout.astro` (`.article-updated-meta__effect`), `src/pages/chapitres/index.astro`, **14 pages `/explorer/*`** (fresco, chronologie, cartes, notes…).

`var(--text-muted)` est utilisé partout mais **jamais déclaré** dans `global.css`. Le navigateur résout alors… rien → texte hérite de `currentColor`, ce qui rend certains labels illisibles (ex : `.sidebar-link--dossier` en light mode hérite de `--text-secondary` et devient confondu ; `footer__updated` est censé être plus discret).

**Fix** :
```css
/* dans :root, .dark et .light */
--text-muted: color-mix(in srgb, var(--text-secondary) 70%, transparent);
```
Ou plus propre : renommer tous les usages vers `--text-secondary` avec une opacité dédiée. Ajouter un test Vitest qui détecte tout `var(--text-*)` non défini dans `global.css`.

---

### 1.2 Token `--border` non défini dans RelationMap
**Fichier** : `src/components/RelationMap.astro` L46, L60, L88.
```css
border: 1px solid var(--border);
border-bottom: 1px solid var(--border);
```
→ `var(--border)` n'existe pas (il faut `--border-color`). Le composant s'affiche sans bordures.
**Fix** : remplacer par `var(--border-color)`.

---

### 1.3 `.sidebar-filter__input { outline: none }` efface le focus clavier
**Fichier** : `src/components/SidebarNav.astro` ~L342.
L'input de filtre de la sidebar n'a pas de remplacement `:focus-visible` → au clavier, quand on tabule sur le champ de filtrage, **aucun indicateur visuel** n'apparaît.
**Fix** : remplacer `outline: none` par le style global `:focus-visible` (ou ajouter explicitement) :
```css
.sidebar-filter__input:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; border-radius: 3px; }
```
Idem dans `src/pages/explorer/fresque-elbaf.astro` L221 (même pattern).

---

### 1.4 Lightbox ne gère pas le focus trap, pas `role="dialog"`
**Fichier** : `src/layouts/ArticleLayout.astro` (fin de fichier).
La lightbox d'images :
- n'a **pas** `role="dialog"`, `aria-modal="true"`, `aria-label` ;
- ne déplace **pas** le focus au bouton de fermeture à l'ouverture ;
- n'emprisonne **pas** le focus (Tab peut repartir sur la page en arrière-plan qui est encore interactive) ;
- le bouton `✕` est un `<button>` sans texte accessible (OK avec aria-label mais le contenu "✕" est lu comme "multiplication X" par certains SR).

**Fix** :
- Ajouter `role="dialog" aria-modal="true" aria-label="Vue agrandie de l'image"` sur `.lightbox-overlay` ;
- À l'ouverture, `focus()` sur `#lightbox-close`, ajouter un piège de focus (même pattern que `SearchModal`) ;
- Fermer aussi avec clic sur l'image et avec la touche Espace/Entrée quand l'image est focus ;
- Remplacer le ✕ par une icône SVG avec `aria-hidden="true"` + texte "Fermer" invisible mais accessible, ou garder `aria-label`.

---

## 🟠 2. UX majeure

### 2.1 `index.astro` : carte « Gouvernement et guerre finale » pointe vers le mauvais anchor
La carte pointe vers `#gouvernement-mondial` alors qu'il existe deux sections distinctes (`gouvernement-mondial` et `guerre-finale`) ET qu'en page d'accueil **seulement 6 cartes** sont affichées sur 11 sections. Les sections `personnages-identites`, `peuples-royaumes`, `dieux-croyances`, `transmission-memoire`, `guerre-finale` n'ont pas de carte d'accès direct → découverte plus faible.

**Fix** :
- Soit passer à 12 cartes (2 rangées de 6) en desktop avec `grid-template-columns: repeat(4, 1fr)` (sur ≥1280px) ;
- Soit créer une 7e carte « Guerre finale » à part, le sujet étant un pilier de la théorie ;
- Soit renommer la 6e « Gouvernement mondial & guerre finale » en cohérence avec les ancres.

---

### 2.2 Lien dupliqué dans le bloc « Légende des badges » (accueil)
**Fichier** : `src/pages/index.astro`.
```
… pour distinguer les faits établis des suppositions.
<a href="/aide/glossaire" class="reading-guide__link">Consultez le glossaire →</a>
```
Le mot « Canon » lie déjà au glossaire, et le lien « Consultez le glossaire → » juste après double la destination → redondance et bruit pour les lecteurs d'écran qui annoncent deux liens consécutifs identiques.

**Fix** : supprimer l'un des deux (garder le lien « Consultez le glossaire → » plus explicite, retirer le lien sur le mot « Canon »).

---

### 2.3 Sidebar : pas de section « Récents » en haut
La section « COMMENCER » est statique. Aucun affichage des **3-5 derniers articles visités** (lecture reprise). Pour un wiki que l'on consulte en plusieurs sessions, c'est un manque important.

**Reco** : ajouter une section « Récemment lus » en haut (avant COMMENCER), alimentée par `localStorage` quand on clique une fiche (même logique que les recents de la recherche).

---

### 2.4 Dossiers (`/dossiers`) : liste de titres uniquement, sans hiérarchie
Page dossiers : chaque section affiche icône + titre + description + **liste de titres seuls** (pas de `ArticleListItem`, pas de résumé, pas de badge certitude, pas d'indentation parent/enfant). On perd toute la densité informative présente dans les cartes d'accueil.

**Reco** :
- Réutiliser `<ArticleListItem>` dans chaque section ;
- Afficher un compteur « X fiches » à côté du titre ;
- Indenter les sous-articles (même pattern `└` que la sidebar) ;
- Ajouter une ancre « Haut de page » à la fin de chaque section.

---

### 2.5 Explorer (`/explorer`) : surcharge cognitive
15 cartes visuellement identiques, même CTA « Ouvrir → », même taille. Aucun groupement.
**Reco** (déjà amorcée dans l'audit précédent, pas encore faite) :
- Grouper en 3-4 catégories avec un sous-titre : **Cartes & schémas** / **Temps & chronologies** / **Correspondances & identités** / **Guerre & déluge** ;
- Mettre en avant la carte mentale et la chronologie (cartes `featured` 2x plus hautes) ;
- Ajouter des icônes distinctes par type.

---

### 2.6 Breadcrumb : `currentPath="/404"` affiche un faux breadcrumb → « Accueil / 404 »
**Fichier** : `src/pages/404.astro`. Le breadcrumb générique ajoute un segment « 404 » cliquable qui n'existe pas. Sur une page d'erreur, il ne faut **pas** de breadcrumb (ou alors juste « Accueil » sans le segment 404).

**Fix** : passer une prop `noBreadcrumb` à WikiLayout, ou exclure `/404` de `buildGenericBreadcrumb`.

---

### 2.7 Partage : pas de Web Share API (`navigator.share`)
Le bouton de partage ne propose que X (Twitter) + copier le lien. Sur mobile, la plupart des navigateurs supportent `navigator.share()` qui donne accès à WhatsApp, Discord, Bluesky, messages, etc.

**Fix** : dans `ArticleLayout.astro`, tenter `navigator.share({ title, url })` d'abord, fallback vers le menu actuel si non supporté.

---

## 🟡 3. UI / Design system — Polish

### 3.1 Border-radius incohérents (tokens vs usages littéraux)
Les tokens `--border-radius-sm/md/lg/xl` existent mais des valeurs littérales `6px, 7px, 9px, 10px` sont encore utilisées dans :
- `Footer.astro` (6px sur les social links) ;
- `Navbar.astro` (6px logo, 7px nav-link, 9px search-trigger mobile, 10px hero CTA) ;
- `WikiLayout.astro` (6px collapse button) ;
- `chapitres/[chapter].astro` (6px) ;
- `theorie/theorie-complete.astro` (6px).

**Fix** : remplacer systématiquement par les tokens `var(--border-radius-sm|md|lg)`. Mapper : 6→sm, 7→sm, 8→sm, 9→sm, 10→md, 12→md, 14→md, 16→lg.

### 3.2 Espacements hors grille 4/8
Paddings/margins en `7px, 11px, 14px, 22px, 28px` trouvés dans Navbar, SearchModal, Footer. Passer à la grille `--space-1..6 = 4/8/12/16/24/32`.

### 3.3 Hover effects encore trop uniformes
Plusieurs composants partagent encore `transform: translateY(-2px)` : `btn-see-all`, `btn-read-nav`, `.article-item`, `.btn-secondary` (coexistent avec les classes `.hover-lift / -glow / -scale` définies dans `global.css` mais non utilisées partout). Utiliser les classes utilitaires déjà créées.

### 3.4 Logo animé au survol dans un lien externe sans cible
Le logo `/logo.png` a `border-radius:6px` et un `scale(1.08)` au hover, mais est placé dans un lien qui n'a qu'un `alt`, pas de `aria-label` explicite (OK, le span `Les Fous du Bus` est là). RAS mais le border-radius 6px entre en conflit avec le token.

### 3.5 TOC active style provoque un micro-shift
**Fichier** : `SidebarToc.astro` — le `.toc__link--active` ajoute `border-left: 2px; padding-left: 6px; margin-left: -8px` mais le `font-weight: 500` peut épaissir le texte et changer sa largeur (layout shift). Préférer uniquement `color + border-left` sans changement de graisse.

### 3.6 SearchModal « Échap » bouton visuellement disparate
Bouton "Échap" avec `font-size:11px` dans un badge, absent sur mobile (icône X seulement). Le texte "Échap" est muet pour qui ne sait pas ce qu'est Échap. Préférer le symbole `Esc` ou une icône × pure.

### 3.7 Skip-link : contraste toujours léger
Le skip-link a `background: var(--bg-secondary); border: 1px solid var(--border-strong)` — c'est mieux que avant, mais la bordure ne suffit pas à le distinguer d'un bouton normal. Semble OK au test visuel, à vérifier en light mode (contraste avec la navbar).

### 3.8 `::selection` en mode light : `--accent-gold @ 30%` sur `--text-main`
Le jaune `#76520d` à 30% est peu visible sur fond clair. Ajuster en light mode : `background: color-mix(in srgb, var(--accent-gold) 45%, var(--bg-secondary))`.

### 3.9 CTA hero `btn-primary` : texte `--bg-main` sur gradient
Le commentaire dit « contraste AA >= 4.5:1 ». Les tests Vitest confirment aux extrémités, mais au centre du dégradé (violet→cyan) le contraste peut descendre sous 4.5:1 avec la couleur `#0e1722` très sombre. Vérifier avec `colorjs.io` au point médian ; si <4.5, passer le texte en blanc pur `#fff`.

### 3.10 R2Image : `width/height` sont facultatifs → CLS
Le composant n'exige pas `width/height` ; s'ils sont absents, `aspect-ratio` n'est pas défini et l'image provoque un **Cumulative Layout Shift**. Rendre `width/height` **obligatoires** (TypeScript le permet), ou à défaut exiger `aspectRatio`.

### 3.11 Images Markdown non optimisées
Les images dans le `.content` des articles (via `![]()` MD) n'utilisent **pas** R2Image, pas de `srcset`, pas de WebP, pas d'aspect-ratio. Ajouter un plugin `rehype` Astro qui convertit les `<img>` Markdown en composant `R2Image` avec `loading="lazy"`, dimensions extraites des imports ou déclarées en frontmatter.

### 3.12 Footer absent sur `pages/404.astro` et pages d'erreur
`404.astro` n'inclut pas `<Footer />` → la page s'arrête brutalement après les deux boutons. Idem `500.astro` à vérifier.

---

## 🟢 4. Accessibilité (WCAG 2.2 AA)

### A1. Emoji icons dans Sidebar & CategoryCard lus par les lecteurs d'écran
Des `<span class="text-base">🌍</span>` sans `aria-hidden="true"` sont lus « Terre globe européenne-afrique », « Fichier dossier », « Buste en silhouette », etc. (VO) ou leurs équivalents FR. **Bruit** pour les SR.

**Fix** : ajouter `aria-hidden="true"` sur tous les `<span>` contenant uniquement un emoji dans SidebarNav, CategoryCard, index, dossiers. Une alternative plus propre : utiliser les SVG déjà utilisés dans la navigation, ou des icônes décoratives.

### A2. Sidebar filter : `aria-describedby` / annonce du nombre de résultats
Quand on filtre, rien n'annonce à un SR combien de résultats sont visibles. Ajouter un `role="status"` (live region) qui affiche « X articles trouvés » quand la recherche filtre.

### A3. `aria-activedescendant` dans SearchModal pointe sur le `<li>`
L'input a `aria-activedescendant="search-result-0"` mais pointe sur `<li id="search-result-0">` au lieu du lien focusable à l'intérieur. Les SR annoncent « option » mais ne lisent pas le titre. Pointer vers l'`<a>` en lui donnant l'id, ou retirer `aria-activedescendant` et faire un vrai focus `.focus()` sur le `<a>` actif.

### A4. Lightbox (voir 1.4) + close button "✕"
En plus du `role=dialog` manquant, "✕" est annoncé comme « times » / « multiplication ». Utiliser une icône SVG + `aria-label="Fermer"`.

### A5. Navbar dropdown : navigation clavier ↓/↑ ne permet pas d'entrer dans le menu
Le menu s'ouvre au clic (touch device) et au survol (desktop `:hover`), mais **pas via la touche Bas** quand le lien top-level a le focus. Il faut :
- à `focus` sur `.nav-link`, ouvrir le dropdown ;
- à la touche ↓, placer le focus sur le premier `menuitem` ;
- à l'intérieur, flèches ↓↑ circulent, Échap / Tab sortent.

Actuellement, c'est le comportement natif de `:focus-within` qui ouvre mais les items ne reçoivent pas le focus automatiquement.

### A6. BackToTop et TOC FAB : deux FAB bas-droite qui se chevauchent sur mobile
Sur mobile, TOC FAB est positionné à `bottom:84px` et BackToTop à `bottom:20px` mais tous deux à `right:20px`/`16px`. Si le TOC FAB est présent ET le BackToTop visible, ils sont **empilés** à 24px de distance (juste) mais quand un article court n'a pas de TOC, le bouton haut est seul. Ajouter un décalage : quand `.toc-fab` est visible, décaler `.back-to-top` de 64px vers le haut via une règle de parent.

### A7. `lang="fr"` mais certains textes sont en anglais ("Esc", "Ctrl K")
"Ctrl K" devrait être noté `Ctrl + K` et "Esc" → "Échap" (déjà fait dans le badge de fermeture). Les `kbd` de la recherche utilisent `esc` minuscule → mettre en français/symboles clavier cohérents.

### A8. Vidéo YouTube : `iframe` sans `title` en français
Le titre est `"YouTube video player"` en anglais. Remplacer par `title="Présentation vidéo de la théorie (YouTube)"`.

### A9. `prefers-reduced-motion: reduce` respecté globalement MAIS
- le `page-fade-in` de `.app` est bien neutralisé ;
- les `transition-delay` de stagger des cartes peuvent encore déclencher sur la 1re frame ;
- l'`animation: pulse-dot` du hero-badge est bien neutralisée.
À auditer avec l'inspecteur d'accessibilité pour détecter tout `animation` restant sans neutralisation.

---

## 🔵 5. Performance & Mobile

### P1. `SearchModal` hydraté en `client:idle` → inopérant les 2-3 premières secondes sur 3G
Si l'utilisateur clique la loupe avant l'hydratation React, rien ne se passe. **Fix** :
- Passer le bouton `search-trigger` en `client:visible` ou, plus robuste, faire un petit script inline qui écoute `openSearch` **avant** hydratation et affiche un état d'attente ;
- Précharger le chunk à `mouseenter` / `focusin` sur le bouton :
  ```js
  btn.addEventListener('mouseenter', () => import('./SearchModal'), { once: true });
  ```

### P2. Façade vidéo YouTube : image en `https://img.youtube.com/...` tierce partie
Même avec onerror chainé, cette requête reste une requête cross-origin sur le domaine de Google avant le clic. **Fix** :
- Télécharger et héberger localement la vignette (`/images/video-cover.jpg`) ;
- L'`onerror` devient un fallback local si l'image R2 est manquante.
- Bonus : pas de requête tiers avant le clic → améliore la politique CSP et la vie privée.

### P3. `wallpaper.webp` : toujours préchargé en dark mode ?
Il est caché en light, mais en dark il est chargé en CSS via `url('/wallpaper.webp')` → non préchargé mais pas non plus `fetchpriority:low`. Si on utilise `<link rel="preload" as="image" href="/wallpaper.webp" media="(prefers-color-scheme: dark)">` dans `<head>`, on gagne en LCP en dark. Sinon, le charger en `fetchpriority="low"` car c'est un décor.

### P4. Images dans les pages `/explorer/*` hébergées publiquement sans taille explicite
Plusieurs pages `explorer` (fresque-elbaf, carte-blue-star, etc.) utilisent des `<img src="/images/...">` sans `width/height` → CLS. Vérifier et fixer les dimensions.

### P5. Pagefind `180ms` de debounce à chaque recherche
C'est un peu long pour une recherche instantanée. Passer à 100-120ms, et déclencher immédiatement au 1er caractère.

### P6. `prefetch` des liens non configuré
Astro `client:idle` n'est pas utilisé sur les liens, mais `astro-pagefind` ajoute des prefetch à sa façon. Vérifier que les liens de la sidebar et les CTA principaux sont préchargés au survol (`data-astro-prefetch="hover"` Astro ≥4).

---

## 🧪 6. Tests et non-régressions

### T1. Ajouter un test qui parse le CSS et vérifie qu'aucun `var(--xxx)` ne référence un token non défini dans `global.css` (piège 1.1 & 1.2 récurrent).

### T2. Ajouter un test de contraste sur les **badges translucides** utilisés dans les pages `/explorer/*` (1.1 `text-muted`) : tous doivent passer 4.5:1.

### T3. Ajouter un test Playwright de base :
- tabulation complète depuis la navbar jusqu'au footer sans perte de focus ;
- Échap ferme tous les overlays (search, drawer, TOC, lightbox) ;
- la recherche s'ouvre au `Ctrl+K` et le focus est dans l'input.

---

## ✅ Ce qui est excellent (à conserver)

- **Architecture** : Astro collections + Zod, build rapide (5s), 144 pages générées proprement ;
- **Thèmes** dark/light avec switch persistant, `prefers-color-scheme` respecté, pas de FOUC (inline script au `<head>`) ;
- **Breadcrumb** sémantique en `<ol>` avec `aria-current="page"` et `aria-hidden` sur les séparateurs ;
- **Recherche** Pagefind singleton + debounce + alias orthographiques (`Ponéglyphe`, `Laugh Tale`, `Mary Geoise`, etc.) + raccourci Ctrl+K + récents/populaires + focus trap + reduced motion ;
- **TOC** avec IntersectionObserver pour l'ancre active + FAB drawer <1200px ;
- **Mode zen** persistant en localStorage ;
- **Scroll-lock** sans `position:fixed` (évite le layout-shift à l'ouverture du drawer) ;
- **Design tokens** « Mer & Encre » cohérents et distinctifs ;
- **Vidéo facade** pour YouTube (évite de charger 1.5 Mo d'iframe avant le clic) ;
- **JSON-LD** : Website, Organization, BreadcrumbList, Article, CollectionPage — très complet ;
- **Tests de contraste automatisés** (63 tests, tous verts) ;
- **`scrollbar-gutter: stable`** pour éviter le décalage horizontal à l'ouverture des overlays ;
- **Polices self-hostées** (`@fontsource`) + `Manrope` & `Fraunces` ;
- **`prefers-reduced-motion`** globalement bien respecté ;
- **Tap targets ≥ 44px** sur la plupart des contrôles mobiles ;
- **Skip-link** fonctionnel et visible au focus ;
- **Micro-interactions** du hero : badges, gradient title, stagger d'entrée.

---

## 🎯 Plan d'action priorisé

### Sprint 1 — Hotfix (½ journée)
- [ ] 1.1 Définir `--text-muted` dans `global.css` (ou renommage) → rend lisible 14 pages explorer + footer + sidebar ;
- [ ] 1.2 Corriger `var(--border)` → `var(--border-color)` dans `RelationMap.astro` ;
- [ ] 1.3 Focus-visible sur `.sidebar-filter__input` + fresque-elbaf ;
- [ ] 2.6 Désactiver breadcrumb sur `/404` ;
- [ ] 2.2 Lien dupliqué dans `reading-guide` ;
- [ ] 3.12 Ajouter `<Footer />` dans `404.astro` et `500.astro`.

### Sprint 2 — A11y & Lightbox (1 journée)
- [ ] 1.4 Refonte de la lightbox : `role="dialog"`, focus trap, focus initial, aria-label en français ;
- [ ] A5 Dropdown navbar navigation clavier ↓↑/Échap ;
- [ ] A1 `aria-hidden="true"` sur tous les emojis décoratifs ;
- [ ] A3 Corriger `aria-activedescendant` de la recherche (pointer sur le `<a>`) ;
- [ ] A2 Live region « X articles trouvés » dans le filtre de sidebar ;
- [ ] A8 `title` en français sur l'iframe YouTube ;
- [ ] A6 Déconfliction TOC FAB / BackToTop.

### Sprint 3 — UX contenu (1-2 jours)
- [ ] 2.1 Cartes d'accueil : ajouter une 7e carte « Guerre finale », ou grouper ;
- [ ] 2.4 Refonte `/dossiers` avec `ArticleListItem`, compteurs, hiérarchie ;
- [ ] 2.5 Refonte `/explorer` avec groupement par type ;
- [ ] 2.3 Section « Récemment lus » en haut de la sidebar ;
- [ ] 2.7 Partage via `navigator.share()` ;
- [ ] 3.10 `R2Image` width/height obligatoires ;
- [ ] 3.11 Plugin Rehype pour optimiser les images Markdown.

### Sprint 4 — Design system & perf (1-2 jours)
- [ ] 3.1 Remplacer tous les radius littéraux par les tokens ;
- [ ] 3.2 Normaliser les spacings sur la grille 4/8 ;
- [ ] 3.3/3.5 Unifier les hover effects ;
- [ ] P1 Préchargement de SearchModal au `mouseenter` ;
- [ ] P2 Vignette YouTube hébergée localement ;
- [ ] P3/P4 Images dimensionnées + fetchpriority ;
- [ ] T1/T2/T3 Tests d'a11y et de non-régression.

---

## 📌 Recommandations transverses

1. **Intégrer axe-core** en CI via `@axe-core/playwright` dans `e2e/` : bloque automatiquement les régressions WCAG A/AA les plus courantes.
2. **Tester sur vrais devices** : iPhone SE (375×667) et un Android low-end Chrome pour valider le scroll du drawer, la zone de pouce (CTA en colonne déjà fait sur <640px ✓).
3. **Lighthouse CI** : seuil de perf ≥90, a11y ≥95, SEO ≥95. L'état actuel semble très proche des 100.
4. **Audit de contenu** : quelques pages `/explorer` sont encore des prototypes/placeholders (`deluge-all-blue`, `memoire-avenir`), prévoir une passe éditoriale.
5. **CSP** : envisager un en-tête `Content-Security-Policy` qui restreint les tiers à YouTube seulement en vigueur (aucun autre tracker visible, c'est un excellent point).

---

*Rapport généré le 08/08/2026 à partir du code source courant (branche `arena/019fe2f4-lesfousdubus`, 63 tests verts).*
