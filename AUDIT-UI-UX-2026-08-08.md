# Audit UI / UX — Les Fous du Bus — 08 Août 2026

> Audit statique du code (Astro 7 + React 19 + Tailwind 3 + Pagefind) + revue heuristique UX.
> Base : commit `a572414` + correctifs juin-juillet 2026 déjà appliqués.

---

## Résumé exécutif

Le site est **très solide** : architecture contenu, SEO (canonical, JSON-LD, RSS, llms.txt), dark/light propre, search Pagefind, a11y de base (skip-link, focus-visible). Les audits précédents ont corrigé 80% des critiques (modale hors `<nav>`, CTA hero, `client:idle`, BackToTop, etc.).

Restent **~52 points** répartis ainsi :
- 🔴 8 bloquants / bugs visuels / a11y
- 🟠 11 UX majeurs (parcours & découverte)
- 🟡 17 UI polish / cohérence design system
- 🟢 8 accessibilité
- 🔵 8 performance & mobile

---

## 🔴 1. Bloquants / Bugs à corriger immédiatement

### 1.1 TOC inaccessible sur tablette (768-1200px)
**Fichiers** : `WikiLayout.astro`, `SidebarToc.astro`
- `< 1200px`, `.sidebar-right` → `display:none`. Aucun FAB de remplacement. Sur article long (20+ min), lecteur tablette n'a aucune table des matières.
- **Fix** : Réintroduire FAB « Sommaire » qui ouvre drawer TOC à droite (comme ancien code) ou intégrer TOC collapsible dans le hero article sur <1200px. Test : `window.innerWidth` 800 → zéro navigation intra-page.

### 1.2 ParcoursNav bordures invisibles
**Fichier** : `ParcoursNav.astro` L130-145
```css
border-top: 1px solid var(--border); /* var n'existe pas */
border: 1px solid var(--border);
```
`--border` n'est défini nulle part → fallback transparent. Composant semble « flottant » sans séparation.
**Fix** : Remplacer par `var(--border-color)`.

### 1.3 Search trigger tue le focus-visible
**Fichier** : `Navbar.astro` ~ ligne 300
```css
.search-trigger { outline: none !important; box-shadow: none !important; }
```
`!important` écrase `:focus-visible`. Utilisateur clavier ne voit plus où il est.
**Fix** : Retirer `!important`, garder seulement `:focus-visible` cyan 2px. Idem pour `:focus` si besoin.

### 1.4 Theme toggle FOUC (bouton vide)
**Fichier** : `Navbar.astro`
Les deux SVG ont `class="ico-sun hidden"` et `ico-moon hidden` → `display:none` au chargement. JS `updateIcons()` ne tourne qu'après hydratation → bouton vide ~100-300ms.
**Fix** : Inline script dans `BaseLayout` qui retire `hidden` de la bonne icône **avant** rendu, ou afficher une icône par défaut côté serveur selon `prefers-color-scheme`.

### 1.5 Reading time faux
**Fichier** : `ArticleLayout.astro` L56-70 `computeReadingTime`
Estimation basée sur `headings.length` (nb de H2) → « 2 min » pour un article de 4000 mots mais 2 H2.
**Fix** : Calcul basé sur `frontmatter.description` + longueur headings proxy OU mieux, exposer `remark` plugin qui compte mots pendant build. Minimum : `wordCount = Astro.props.rawContent().length` si dispo, sinon 200 mots/min.

### 1.6 Double définition BackToTop
- `src/styles/global.css` définit `.back-to-top { bottom:80px... }`
- `src/components/BackToTop.astro` définit `.back-to-top { bottom:24px... }`
Deux règles concurrentes, ordre d'import aléatoire selon Vite → position incohérente. De plus `BackToTop.astro` utilise classe `back-to-top--visible` alors que `global.css` utilisait `.visible`.
**Fix** : Supprimer définition de `global.css`, ne garder que composant. Unifier nom de classe visible.

### 1.7 Lightbox vs Drawer : scroll-lock conflictuel
**Fichier** : `ArticleLayout.astro` script lightbox
```js
document.body.style.overflow = 'hidden' // direct
// ...
if (!body.classList.contains('mobile-nav-open')) body.style.overflow = ''
```
Si drawer mobile + lightbox ouverts successivement, `style.overflow` reste `hidden` car classe `mobile-nav-open` présente → body bloqué après fermeture lightbox.
**Fix** : Gérer scroll-lock uniquement via classes (`search-modal-open`, `mobile-nav-open`, `lightbox-open`) pas via `style.overflow`. Utiliser compteur de locks.

### 1.8 Share copy fallback reload la page
```js
} catch { window.location.href = window.location.href }
```
En cas d'échec clipboard, ça recharge la page = perte de position.
**Fix** : Fallback textarea :
```js
const t=document.createElement('textarea'); t.value=location.href; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove()
```

---

## 🟠 2. UX Majeure — parcours & découverte

### 2.1 Sidebar desktop sans recherche
**Fichier** : `SidebarNav.astro` → `.sidebar-filter` `display:none` sauf `max-width:768px`
Desktop a 11 catégories + 100+ liens. Aucun moyen de filtrer sans scroller. L'audit précédent avait corrigé mobile uniquement.
**Reco** : Afficher filtre aussi sur desktop (>=768px) mais plus discret (sticky top). Ajouter localStorage des 3 derniers articles visités en haut de sidebar « Récents ».

### 2.2 Filtre mobile perd l'état d'expansion
Après `clear`, toutes les sections restent ouvertes (celles qui avaient match) mais on ne restaure pas l'état initial (seule section active ouverte). L'utilisateur doit re-collapser manuellement.
**Reco** : Sauvegarder `expandedSections` avant filtrage, restaurer au clear.

### 2.3 Breadcrumb non sémantique
**Fichier** : `Breadcrumb.astro` : simple `nav` avec `flex` et `/` séparateur. Pas de `<ol>`, pas de `aria-current="page"` sur dernier item, pas de `aria-hidden` sur séparateur.
**Reco** :
```astro
<nav aria-label="Fil d'Ariane"><ol><li><a href="/">Accueil</a></li>...</ol></nav>
```
Ajouter micro-données HTML (en plus du JSON-LD déjà bon).

### 2.4 Recherche : pas de récents / populaires
**Fichier** : `SearchModal.tsx`
Ux actuelle : vide → « Tapez pour rechercher ». Aucune proposition. Taux d'usage recherche bas.
**Reco** :
- Stocker 5 dernières requêtes + résultats cliqués en localStorage.
- Afficher au vide : « Recherches récentes » + « Sujets populaires » (Joy Boy, Imu, Ponéglyphe, etc.).
- Astuce : Pagefind déjà aliasé, utiliser ces alias comme suggestions.

### 2.5 Dossiers page trop pauvre
**Fichier** : `dossiers/index.astro`
Chaque section : icône + titre + description + liste de titres uniquement. Aucune preview, aucun badge certitude, aucune hiérarchie fiche parent / sous-dossier (niveau 1).
**Reco** : Réutiliser `ArticleListItem` avec summary, ou au minimum ajouter count + badge « X fiches ».
Afficher child avec indentation `└` comme sidebar.

### 2.6 Explorer page : overload cognitif
**Fichier** : `explorer/index.astro` : 16 cartes identiques visuellement, même CTA « Ouvrir → ».
**Reco** : Grouper en 4 groupes avec titres :
- **Cartes** : carte mentale, Blue Star, fresque Elbaf
- **Temps** : chronologie, double chronologie, mémoire avenir, Road Ponéglyphes
- **Identités** : correspondances, Luffy/JoyBoy/Nika
- **Guerre** : guerre finale, schéma Pluton, déluge, Omen
Ajouter filtre visuel ou onglets.

### 2.7 Hero vidéo : pas de fallback si YouTube bloqué
Facade charge `img.youtube.com/vi/.../maxresdefault.jpg`. Sur réseau bloqué (école, entreprise), image = 404, `onerror` → hqdefault mais si YouTube bloqué, 2 requêtes échouent → carré vide.
**Reco** : Image locale `og-default.png` en fallback final + `onerror` chaîné, et bouton sans image reste cliquable avec background CSS.

### 2.8 Pas de mode lecture zen
Articles longs : 2 sidebars (260px + 260px) + navbar + progress bar = beaucoup de chrome. Lecteurs demandent souvent mode sans distraction.
**Reco** : Bouton « Lecture » dans TOC ou header article qui ajoute classe `.zen-mode` : cache sidebars, centre contenu 720px, augmente line-height. Sauvegarder préférence localStorage.

### 2.9 Aide pages sans breadcrumb ni TOC
**Fichier** : `WikiLayout` : seules pages `/theorie` ont breadcrumb custom via `ArticleLayout`. `/aide/*`, `/explorer/*`, `/dossiers` n'ont pas de fil d'Ariane → perte orientation.
**Reco** : Ajouter `Breadcrumb` générique dans WikiLayout si `currentPath !== "/"`.

### 2.10 Footer liens pauvres
Actuel : À propos, Glossaire, FAQ, Chronologie, Carte mentale + GitHub/X.
Manque : Mentions légales ? Plan du site HTML ? Contact ? Source ?
**Reco** : Ajouter `/aide/plan-du-site` (HTML lisible du sitemap) + lien mail / formulaire GitHub issue.

### 2.11 Search aliases hint confus
`Recherche aussi « Ponéglyphe »` quand l'utilisateur tape « poneglyph » → bien intentionné mais formulation technique. L'utilisateur peut croire que sa requête a été modifiée sans consentement.
**Reco** : Reformuler : `💡 Nous cherchons aussi : Ponéglyphe` + proposer toggle.

---

## 🟡 3. UI / Design system — Polish

### 3.1 Tokens border-radius incohérents
Design tokens définis : 8px, 12px, 16px, 9999px.
Mais usage réel : 6px (sidebar-collapse), 7px (nav-link), 8px (search-trigger, theme-btn), 9px (search-close-icon), 10px (btn-primary), 12px (card), 14px (search-modal), 16px (hero).
**Fix** : Créer `--radius-sm:8px`, `--radius-md:12px`, `--radius-lg:16px` et remplacer tous les littéraux.

### 3.2 Hover effects uniformes `translateY(-2px)`
Presque tous les composants utilisent même micro-interaction : carte, bouton, lien sidebar, footer social. Impression mécanique.
**Reco** :
- Cartes : `-3px + shadow 0 12px 40px`
- CTA primaire : `-1px + glow`
- Liens texte : aucun translate, underline color shift
- Icon buttons : `scale(1.08)`

### 3.3 Tailles d'icônes non tokenisées
12px caret, 14px search, 15px filter, 16px footer, 17px sidebar-toggle, 18px backToTop, 20px hamburger → bruit visuel.
**Reco** : `--icon-xs:12px`, `--icon-sm:16px`, `--icon-md:20px`.

### 3.4 Light mode wallpaper gaspillage
`BackgroundScene.astro` : `wallpaper.webp` chargé partout, même en light mode où `mix-blend-mode: screen` sur fond `#f8f5ed` le rend quasi invisible. 55-120KB téléchargé pour rien sur connexion lente.
**Fix** :
```css
.light .wallpaper-bg { display:none; }
```
Ou charger via `media="(prefers-color-scheme: dark)"`.

### 3.5 BackgroundScene animations = GPU load
6 objets `position:fixed` avec animations 46-90s linéaires + `will-change: transform` + bobbing nested. Sur mobile low-end, compositing layers excessif.
**Reco** : `prefers-reduced-motion: reduce` → pause toutes animations. Ajouter `IntersectionObserver` pour pause quand onglet hidden (`document.hidden`).

### 3.6 Waves pattern `fixed` = jank iOS
`html { background-attachment: fixed, fixed }` → sur Safari mobile, scroll repaint cost élevé. Déjà partiellement géré mais reste 2 layers fixed.
**Reco** : Sur `@media (max-width:768px)` → `background-attachment: scroll, scroll`.

### 3.7 CategoryCard count non utilisé
Composant supporte `count` mais page d'accueil ne l'affiche pas. Homepage pourrait afficher « X articles » pour incitation.
**Reco** : Dans `index.astro`, calculer `publishedArticles.filter(c=>...) .length` par catégorie et passer à Card.

### 3.8 ArticleListItem badge `textSecondary` low contrast light
`badge--textSecondary` : `color-mix(text-secondary 12%, transparent)` → sur light `#4a453c` = très pâle, contraste <3:1.
**Fix** : Augmenter à 20% bg, 45% border pour ce variant.

### 3.9 Navbar dropdown overflow
`.nav-dropdown { left:50%; transform: translate(-50%,6px) }` → pour premier item (La théorie ~80px du bord), dropdown de 320px dépasse viewport gauche → scrollbar horizontal fantôme.
**Fix** : Détecter si proche bord, aligner left:0 transform none. Simple CSS : première nav-item `left:0; transform:translateY(6px)`, dernière `right:0; left:auto`.

### 3.10 Boutons : active scale écrase translate
`.card:hover { transform: translateY(-3px) }` puis `:active { transform: translateY(0) scale(0.98) }` → deux transforms successifs = saut. Mieux : utiliser `--hover-y` variable.

### 3.11 Fraunces opsz gaspillé
`Fraunces:opsz,wght@9..144,600..800` charge tout l'axe optique 9-144 mais jamais utilisé (pas de `font-variation-settings: "opsz"`). Poids = 42KB supplémentaire.
**Fix** : Si on garde Fraunces, préciser `opsz` par taille : `h1 { font-variation-settings: "opsz" 60 }` etc., ou réduire range à `opsz 32..144`.

### 3.12 Favicon ICO obsolète
`favicon.ico` + `favicon.png` (192) + `favicon.svg`. ICO = BMP legacy, double téléchargement. Garder SVG + PNG 180px apple-touch + PNG 192 manifest.
**Fix** : Supprimer `favicon.ico`, mettre `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`.

### 3.13 Espacement non 8pt
Paddings found : 11px, 14px, 22px, 28px... Mélange.
**Reco** : Passer tout sur grille 4/8 : 4,8,12,16,24,32.

### 3.14 Search empty state sans CTA
« Aucun résultat » avec icône 48px mais aucun bouton « Retour accueil » ou « Parcourir dossiers » → cul-de-sac.
**Fix** : Ajouter lien « Parcourir les dossiers → ».

### 3.15 Skip-link contraste faible
`.skip-link { background: var(--violet) #8091cf; color:white }` → ratio ~2.8:1 (WCAG AA fail).
**Fix** : `background: var(--violet) -> #3f4a7a` en dark, blanc texte.

### 3.16 R2Image : pas d'aspect-ratio si width/height manquants → CLS
Component accepte width/height optional. Si absent, image sans ratio réservé → layout shift.
**Fix** : Exiger width/height ou ajouter `aspect-ratio: attr(width)/attr(height)` fallback CSS.

### 3.17 ChapterBanner glow bar non arrondie
Barre 3px left avec `border-radius: 3px 0 0 3px` mais parent radius 12px → coin bas légèrement dépasse. Mettre `overflow:hidden` + radius inherited.

---

## 🟢 4. Accessibilité (A11y)

- **A1** Sidebar emoji icons lus par SR : « 🌍 Monde... » → SR lit « Globe » inutile. Ajouter `aria-hidden="true"` sur span emoji + label texte seul.
- **A2** Focus trap drawer : piège focus ok, mais focus initial reste sur dernier élément cliqué hors drawer. Devrait mettre focus sur input filtre ou premier lien à l'ouverture.
- **A3** Search modal `aria-activedescendant` pointe sur `<li id>` mais focus réel sur `<input>`. Devrait pointer sur `<a>` dedans : mieux gérer `role="option"` + focus virtuel. Actuellement SR lit « option » mais pas le titre.
- **A4** TOC active bold shift = layout shift = provoque scroll jank. Éviter font-weight change, préférer `color` + `border-left` 3px cyan.
- **A5** Reduced-motion pour BackgroundScene non respecté : ajouter `@media (prefers-reduced-motion:reduce){ .scene{ display:none } .wallpaper-bg{ display:none } }`.
- **A6** Keyboard dropdown navbar : ouvre au click mais pas de navigation flèches Haut/Bas + Enter / Escape déjà géré pour fermeture mais pas pour ouverture via clavier sans click.
- **A7** Tap targets mobile : `.sidebar-link` 40px ok, mais `.nav-dropdown__link` 13px padding 7px 10px = 29px <44px sur tactile. Augmenter min-height 44px.
- **A8** `alt` images articles : dépend contenu Markdown ; beaucoup d'images ont alt générique. Ajouter lint `validate.mjs` vérifiant alt non vide.

---

## 🔵 5. Performance & Mobile

- **P1** Google Fonts : 2 roundtrips DNS/TLS Google. Self-host WOFF2 via `@fontsource/manrope` + `@fontsource/fraunces`. Gain FCP 200-400ms.
- **P2** Pagefind instance non cachée : chaque recherche fait `import('/pagefind/pagefind.js')` + `init()`. Mettre en module singleton avec promesse cachée.
- **P3** Wallpaper.webp chargé même si `display:none` en light mode (si fix appliqué après load). Utiliser `<link rel="preload" as="image" media="(prefers-color-scheme:dark)">` ou charger via CSS seulement en dark.
- **P4** SearchModal React hydrate en `client:idle` → si user clique search avant idle (3s sur 3G), bouton sans effet 1-2 sec. Solution : `client:visible` sur bouton? Ou précharger au `mouseenter`/`focus` du trigger.
- **P5** Mobile drawer scrollbar invisible : `scrollbar-width:none` + `::-webkit-scrollbar{display:none}` → pas d'affordance scrollable. Utilisateur ne sait pas qu'il y a plus de liens. Ajouter fade bottom + thin scrollbar visible.
- **P6** Hero CTA sur mobile <400px : 3 boutons côte à côte serrés. Passer en colonne 1fr sur <480px pour thumb zone.
- **P7** Navbar height var overridden localement (`--nav-h:52px` dans media) mais scroll-padding-top utilise root var 56px → ancre 4px trop basse sur mobile. Définir `--nav-h` mobile dans `:root` media, pas dans `.navbar`.
- **P8** Images contenu non optimisées : `.content img` max-height 450px mais pas de `srcset`, pas de WebP. R2Image le fait mais pas Markdown images. Ajouter plugin Astro `rehype` pour convertir `<img>` Markdown en R2Image + lazy + aspect-ratio.

---

## 🎯 Plan d'action priorisé (sprints)

### Sprint 1 — Hotfix (½ journée)
- [ ] Fix `--border` → `--border-color` (ParcoursNav)
- [ ] Fix `search-trigger outline !important`
- [ ] Fix BackToTop duplication
- [ ] Fix skip-link contraste
- [ ] Fix share fallback
- [ ] Fix favicon + wallpaper light mode

### Sprint 2 — UX navigation (1-2j)
- [ ] TOC mobile FAB drawer (ou sticky TOC sous hero <1200px)
- [ ] Filtre sidebar desktop + recents
- [ ] Breadcrumb sémantique <ol>
- [ ] Dossiers & Explorer grouping
- [ ] Recherche récents/popular

### Sprint 3 — Polish design system (1-2j)
- [ ] Tokens radius / icons / spacing
- [ ] Hover differentiation
- [ ] Navbar dropdown flip
- [ ] Badge contrast light
- [ ] Self-host fonts + Pagefind cache

### Sprint 4 — A11y & Perf (1j)
- [ ] Emoji aria-hidden + focus management drawer + search
- [ ] Reduced-motion scene + wallpaper
- [ ] Tap targets 44px
- [ ] R2Image aspect-ratio / Markdown image optimisation
- [ ] Lighthouse mobile test

---

## ✅ Ce qui est très bien (à garder)

- Architecture collections Astro + Zod : propre, déterministe.
- Système badges certitude : excellent pour区分 Canon / théorie.
- Search aliases : très malin pour fautes Ponéglyphe / Raftel.
- WikiLayout 3 colonnes + resizer draggable + persistence localStorage.
- Design tokens « Mer & Encre » : palette cohérente, zen, distinctive vs One Piece fan-sites criards.
- Video facade : évite chargement YouTube lourd — pattern impeccable.
- JSON-LD Website + Organization + Breadcrumb + Article : SEO au-dessus de la moyenne.
- Pagefind + prefetch : nav rapide.

---

*Audit généré le 08/08/2026 à partir du repo local. Recommande test utilisateur sur mobile (iPhone SE + Android low-end) + Lighthouse + axe-core.*
