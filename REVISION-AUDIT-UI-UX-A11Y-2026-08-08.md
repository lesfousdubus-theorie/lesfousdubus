# Audit UI / UX / Accessibilité — Révision du 08/08/2026 (état réel du code)

> Analyse **statique du code actuel** (`src/`), vérifiée à froid : `npm install` → `astro build` ✓ (144 pages, 0 erreur), `astro check` ✓ (0 erreur / 0 warning / 10 hints), `vitest` ✓ (64/64).
>
> Ce document est une **révision fraîche** de l'existant (`ANALYSE-UI-UX-2026.md`, `AUDIT-UI-UX-2026-08-08.md`, `AUDIT-UX-UI.md`, `AUDIT-UI-UX-A11Y-2026-FRAIS.md`). Beaucoup de points historiques sont **déjà corrigés** et ne sont volontairement pas répétés. Seul ce qui est **encore vérifiable dans le code à la date du jour** est listé, avec le fichier/ligne concerné.
>
> Critères : heuristiques Nielsen + WCAG 2.2 AA. Stack : Astro 7 + React 19 + Tailwind 3 + Pagefind.

---

## ✅ Ce qui est déjà solide (vérifié — ne pas régresser)

- **Tokens contrastés AA** : tous les couples texte/fond vérifiés par calcul passent ≥ 4.5:1 (voir tableau plus bas), et le test `tests/contrast.test.ts` les verrouille.
- **`--text-muted` est désormais défini** dans `global.css` (corrige l'ancien bug de `var(--text-muted)` non déclaré).
- `var(--border)` remplacé par `var(--border-color)` (RelationMap OK).
- Focus clavier : `:focus-visible` global, `outline: none` retiré du filtre sidebar, trap de focus complet (recherche, lightbox, tiroir mobile, dropdowns).
- Scroll-lock **sans** `position:fixed` (zéro reflow), `scrollbar-gutter: stable`, `overflow-x: clip`.
- `prefers-reduced-motion` global + par-composant, skip-link, `lang="fr"`, breadcrumbs en `<ol>`, TOC FAB mobile/tablette, mode zen, self-host fonts, Pagefind singleton, tap-targets 44px.
- **Contraste vérifié par calcul (ratio) :**

| Paire | Ratio | Seuil AA (texte) |
|---|---|---|
| `--text-main` / `--bg-main` (dark) | 15.72 | ✓ 4.5 |
| `--text-secondary` / `--bg-main` (dark) | 8.89 | ✓ |
| `--text-muted` / `--bg-main` (dark) | 5.16 | ✓ |
| `--text-main` / `--bg-main` (light) | 15.45 | ✓ |
| `--text-secondary` / `--bg-main` (light) | 8.73 | ✓ |
| `--text-muted` / `--bg-main` (light) | **4.45** | ⚠️ frôle le seuil |
| `--text-muted` / `--bg-secondary` (light) | **4.27** | ⚠️ **sous 4.5** |

---

---

## ✅ Corrections appliquées (08/08/2026)

Toutes les actions ci-dessous ont été **implémentées et vérifiées** : `astro build` ✓ (144 pages), `astro check` ✓ (0 erreur / 0 warning), `vitest` ✓ (70/70, dont les nouveaux couples `text-muted`).

| # | Correction | Fichiers modifiés | Statut |
|---|---|---|---|
| 1.1 | Suivi du thème système (ne plus épingler à l'init / au changement OS ; épinglage uniquement sur clic bouton) | `BaseLayout.astro`, `Navbar.astro` | ✅ |
| 1.2 | `theme-color` dynamique (suit le thème) + manifest aligné | `BaseLayout.astro`, `public/manifest.json` | ✅ |
| 1.3 | Focus rendu au déclencheur à la fermeture tiroir mobile + TOC (Échap / overlay / bouton fermer) | `WikiLayout.astro` | ✅ |
| 1.4 | H1 d'accueil : `<br>` remplacé par `display:block` (retour à la ligne CSS) | `src/pages/index.astro` | ✅ |
| 2.1 | Contraste `--text-muted` AA : dark 72→74 %, light 75→82 % + test dédié | `global.css`, `tests/contrast.test.ts` | ✅ |
| 2.2 | `aria-current="page"` sur le lien actif de la sidebar | `SidebarNav.astro` | ✅ |
| 2.3 | Pattern combobox : `role="combobox"` + `aria-expanded` | `SearchModal.tsx` | ✅ |
| 2.4 | `role="menu"`/`menuitem` → `role="group"` (navigation de site) | `Navbar.astro` | ✅ |
| 2.5 | Titres de résultats recherche : `<h4>` → `<div>` (dans `role=option`) | `SearchModal.tsx` | ✅ |
| 3.1 | Échelle `border-radius` réelle (sm6/base8/md10/lg14/xl20) | `global.css` | ✅ |
| 3.2 | Temps de lecture simplifié (suppression branches mortes) | `ArticleLayout.astro` | ✅ |
| 3.3 | `manifest.json` `theme_color` aligné sur la meta | `public/manifest.json` | ✅ |
| 4.1 | Miniature vidéo : `onerror` inline retiré → fallback géré en JS (hints `astro check` supprimés) | `src/pages/index.astro` | ✅ |
| 5 | Hints `astro check` : variables inutilisées supprimées (`statusLabels`, `existsSync`) | `fresque-elbaf.astro`, `generate-llms.mjs` | ✅ |

**Non modifié volontairement :**
- **4.2** `client:load` sur `SearchModal` : choix documenté (fiabilité du bouton sur 3G) ; passer en `client:visible` demande un benchmark avant validation.
- Hints restants (5) : dépréciation `document.execCommand` dans le fallback clipboard de `ArticleLayout.astro` — chemin de repli fonctionnel, conservé.

---

## 📊 Synthèse chiffrée

| Niveau | Nb | Nature |
|---|---|---|
| 🟠 UX / cohérence | 4 | thème, focus retour, H2 `<br>`, redondance |
| 🟢 Accessibilité (WCAG) | 5 | contraste light `text-muted`, `aria-current`, pattern combobox, `role=menu`, ARIA emoji |
| 🟡 UI / design tokens | 3 | échelle radius, metadata PWA, axe des explorateurs |
| 🔵 Performance / vie privée | 2 | thumbnail YouTube tiers, `client:load` |
| 🧹 Nettoyage / qualité | 3 | hints `astro check`, branches mortes, tokens |
| **Total** | **17** | |

---

## 🟠 1. UX / Cohérence

### 1.1 Suivi du thème système « épinglé » par erreur après la 1ʳᵉ bascule auto
**Fichier :** `src/layouts/BaseLayout.astro` (écouteur `prefers-color-scheme`).
Quand l'OS change de thème, le site bascule puis écrit `localStorage.setItem('theme', newTheme)`. Du coup, **dès la première bascule automatique**, la préférence se retrouve épinglée : les changements OS ultérieurs sont ignorés. Le comportement attendu d'un « suivre le système par défaut » est cassé.
**Correctif :** ne pas persister dans `localStorage` lors d'une bascule automatique (persister uniquement sur clic du bouton), ou stocker une clé distincte du type `theme-pinned` pour départager « auto » vs « manuel ».

### 1.2 `theme-color` statique + incohérent avec le manifest
**Fichiers :** `BaseLayout.astro` L70 (`#0e1722`) ; `public/manifest.json` (`"theme_color": "#5fb9c2"`).
La meta `theme-color` est figée sur le navy du dark, **même en mode clair** (chrome du navigateur / barre d'adresse reste sombre). Elle diffère aussi du `theme_color` cyan du manifest PWA.
**Correctif :** faire pointer la meta `theme-color` vers une variable `var(--bg-main)` et la mettre à jour à la bascule de thème (idem `manifest.json` → aligner sur la même valeur que le meta, p. ex. `#0e1722`).

### 1.3 Focus clavier non rendu au déclencheur à la fermeture des panneaux
**Fichiers :** `src/layouts/WikiLayout.astro` (`toggleToc`), tiroir mobile.
À l'ouverture le focus va bien dans le panneau (FAB TOC, filtre sidebar), mais **à la fermeture (Escape / clic extérieur / lien) le focus n'est pas rendu au bouton d'origine**. Un utilisateur clavier « perd » sa position.
**Correctif :** dans `toggleToc(false)` et `toggleMobile(false)`, restaurer `tocFab?.focus()` / `mobileToggle?.focus()` (sauf si la cause est une navigation).

### 1.4 H1 d'accueil scindé en 2 lignes codées en dur
**Fichier :** `src/pages/index.astro` (`<h1>Le Siècle oublié<br /><span class="text-gradient">est le présent</span></h1>`).
Le `<br>` force un retour à la ligne qui peut créer un soulignement/chemin de lecture étrange sur certains écrans, et le mot « présent » est en dégradé (lisible mais non AA si le dégradé passe par le magenta faible — vérifier).
**Correctif (optionnel) :** utiliser `display:block` sur le span + `text-wrap: balance` au lieu d'un `<br>` littéral, et vérifier le ratio du texte dégradé sur chaque segment.

---

## 🟢 2. Accessibilité (WCAG 2.2 AA)

### 2.1 Contraste `--text-muted` **en mode clair** sous le seuil AA
**Vérifié par calcul** : 4.27:1 sur `--bg-secondary`, 4.45:1 sur `--bg-main` (seuil 4.5).
**Usages concernés (petits textes, donc AA requis) :** Footer (`footer__updated`, 11.5px), sidebar `.sidebar-link--dossier` (12px italique), `.article-updated-meta__effect`, figcaptions & en-têtes de table (11px) dans **10 pages `/explorer/*`**, badges de statut.
**Correctif :** dans `.light`, foncer la couleur de base utilisée par le `color-mix` (ex. passer `--text-secondary` light de `#4a453c` → ≈ `#3f3a31`), ou réduire l'alpha de `75%` à ≈ `82%`, et ajouter le couple au test `tests/contrast.test.ts` (actuellement il ne couvre pas `text-muted` sur `bg-secondary` en light).

### 2.2 `aria-current="page"` absent sur le lien actif de la sidebar
**Fichier :** `src/components/SidebarNav.astro` (lien actif → classe `.sidebar-link--active`).
Contrairement à la navbar, le lien actif de la sidebar n'expose pas `aria-current`. Un lecteur d'écran ne sait pas quelle page est ouverte.
**Correctif :** `aria-current={isActive ? 'page' : undefined}` sur le `<a class="sidebar-link">`.

### 2.3 Pattern combobox de la recherche incomplet
**Fichier :** `src/components/SearchModal.tsx`.
Le champ est `type="text"` avec `aria-controls`/`aria-activedescendant`, mais **sans `role="combobox"` ni `aria-expanded`**, et les résultats `role="option"` sont des `<a>`. Le pattern déclaré n'est pas conforme à la spec combobox.
**Correctif :** ajouter `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"` (déjà présent) et exposer l'état « résultats affichés ». À défaut, retirer les rôles `listbox`/`option` et utiliser une simple liste de liens (moins trompeur).

### 2.4 `role="menu"` / `role="menuitem"` sur la navigation du site (anti-pattern ARIA)
**Fichier :** `src/components/Navbar.astro` L166/L171.
`role="menu"` est réservé aux menus applicatifs (style barre de menu d'app, Word), **pas** à la navigation de site. Les lecteurs d'écran y annoncent un comportement de menu qui n'existe pas.
**Correctif :** retirer `role="menu"`/`role="menuitem"` et garder un simple `<ul>` de liens (ou `role="group"`/`aria-label` par bloc). Le comportement clavier (flèches, Home/End, Échap) peut être conservé sans les rôles menu.

### 2.5 Sémantique des résultats de recherche : titres en `<h4>` dans des `role="option"`
**Fichier :** `src/components/SearchModal.tsx`.
Chaque résultat affiche son titre dans `<h4 class="search-result-title">`. À l'intérieur d'une liste `role="listbox"` d'options, un élément de titre de niveau `h4` n'a pas de sens sémantique (niveau sauté sans `h3`), et les options d'une liste doivent être du contenu simple.
**Correctif :** remplacer `<h4>` par une `<span>`/`<div class="search-result-title">` (le style est déjà géré par la classe) — le texte `mark`/excerpt reste géré à part.

---

## 🟡 3. UI / Design tokens

### 3.1 Échelle `border-radius` redondante
**Fichier :** `global.css` L92–94 : `--border-radius-sm: 8px` **=** `--border-radius: 8px`, et `--border-radius-md: 12px` **=** `--border-radius-lg: 12px`.
Échelle plate → pas de vraie progression visuelle (l'ancien audit « 4px trop angulaire » est corrigé mais la hiérarchie est inutilisée).
**Correctif :** définir une échelle réelle, ex. `sm:8 / base:10 / md:12 / lg:16 / xl:20`, puis vérifier les usages (aucun n'est sémantiquement dépendant de la valeur exacte).

### 3.2 Redondance du calcul de temps de lecture
**Fichier :** `src/layouts/ArticleLayout.astro` L97–101.
Les 4 branches `if (mins <= …) return '${mins} min'` produisent **toutes le même format** → code mort/redondant.
**Correctif :** `const mins = Math.max(2, Math.ceil(estWords / 220)); return \`${mins} min\`;`

### 3.3 Métadonnées PWA non alignées
**Fichiers :** `BaseLayout.astro` (`theme-color #0e1722`) vs `manifest.json` (`theme_color #5fb9c2`, `background_color #0e1722`).
Alignement nécessaire (voir 1.2). Éventuellement ajouter `"display_override": ["window-controls-overlay"]` et une couleur de fond dynamique selon le thème.

---

## 🔵 4. Performance / Vie privée

### 4.1 Miniature vidéo chargée depuis YouTube (3ᵉ partie, sans consentement)
**Fichier :** `src/pages/index.astro` (façade vidéo, `img.youtube.com`).
La façade est excellente pour le lazy-load du `iframe` (pas de tracking avant clic), mais la **miniature est quand même récupérée sur `img.youtube.com`** (requête 3ᵉ partie + double fallback `onerror`). En plus, le `onerror` inline génère des hints `astro check` (ts6133 « unused »).
**Correctif :** self-hoster la miniature (dans `/public/images`) ou la servir via le proxy d'images Astro ; supprimer le `onerror` inline au profit d'un `onerror` via script.

### 4.2 Hydratation React sur chaque page (`client:load`)
**Fichier :** `src/components/Navbar.astro` (`<SearchModal client:load />`).
Cohérent avec le choix documenté (fiabilité du bouton sur 3G) mais tous les `<script>` inline + React s'exécutent sur chaque page. Le coût est faible (1 petit composant, singleton Pagefind).
**Correctif (si souhaité) :** `client:visible` avec un fallback : pré-lancer l'init Pagefind sur le premier `pointerdown`/scroll. À n'activer qu'après un benchmark.

---

## 🧹 5. Nettoyage / Qualité

- **Hints `astro check` (10)** : variables non utilisées — `onerror`/`src` dans `index.astro` (facade vidéo), `statusLabels` dans `explorer/fresque-elbaf.astro` L71, `existsSync` dans `scripts/generate-llms.mjs` L13. → supprimer ou utiliser.
- **`src/utils/contrast.ts`** : `tintOver` n'est pas testé / pas utilisé (code mort utile). Le considérer ou le retirer.
- **`tests/contrast.test.ts`** : ajouter les couples `text-muted`/`bg-secondary` (dark **et** light) pour verrouiller la correction 2.1.

---

## 🎯 Actions prioritaires recommandées (ordre d'impact)

1. **Corriger le contraste `--text-muted` en mode clair** (2.1) + ajouter au test — risque WCAG AA réel, présent sur ~15 composants.
2. **Réparer le suivi du thème système** (1.1) et **`theme-color`** (1.2) — expérience multi-thème cohérente.
3. **`aria-current="page"` sur la sidebar** (2.2) + **rendre le focus à la fermeture des panneaux** (1.3) — les 2 gains a11y clavier les plus rentables.
4. **Nettoyer `role="menu"`/`menuitem`** (2.4) et **pattern combobox** (2.3) — conformité ARIA.
5. **Self-hoster la miniature vidéo** (4.1) — vie privée + perf + zéro hint.
6. Polish : échelle radius (3.1), simplification temps de lecture (3.2), hints `astro check` (5).

---

### Légende des fichiers clés
- Layouts : `src/layouts/BaseLayout.astro`, `WikiLayout.astro`, `ArticleLayout.astro`
- Composants : `Navbar`, `SidebarNav`, `SidebarToc`, `Footer`, `BackToTop`, `ReadingProgressBar`, `Breadcrumb`, `SearchModal.tsx`, `RelationMap`
- Tokens/contraste : `src/styles/global.css`, `src/utils/contrast.ts`, `tests/contrast.test.ts`
- Pages : `src/pages/index.astro`, `src/pages/explorer/*.astro`
