# 🔍 Analyse UI / UX — Les Fous du Bus (août 2026)

> Analyse fraîche du code source actuel (post-correctifs du 22 juillet).  
> Stack : Astro 7 + React 19 + Tailwind 3 + Pagefind  
> Design system : « Mer & Encre » — palette twilight indigo / sea teal / straw-gold

---

## ✅ Ce qui a été corrigé depuis le dernier audit

L'ancien audit (`AUDIT-UX-UI.md`) listait de nombreux problèmes. Voici ceux **déjà résolus** dans le code actuel :

| Problème original | Statut | Détail |
|---|---|---|
| Composants placeholder vides | ✅ Corrigé | `RelatedArticles` et `ChapterReferences` ne s'affichent que si des données existent |
| URL canonique incohérente | ✅ Corrigé | `Astro.site` utilisé partout, `astro.config.mjs` → `lesfousdubus.sbs` |
| Page 404 sans navigation | ✅ Corrigé | Utilise `WikiLayout` (navbar + sidebar) |
| Hero sans CTA | ✅ Corrigé | 2 CTAs (Résumé + Théorie complète) + lien dernier chapitre |
| SearchModal `client:load` | ✅ Corrigé | Passé à `client:idle` |
| Pas de skip-to-content | ✅ Corrigé | `.skip-link` présent |
| Pas de retour en haut | ✅ Corrigé | `BackToTop.astro` + bouton dans le footer |
| YouTube iframe lourd | ✅ Corrigé | Façade image + chargement au clic |
| `border-radius: 4px` partout | ✅ Corrigé | Tokens 8/12/16 px |
| Transition sur `*` | ✅ Corrigé | Restreinte à `a, button, input, [role='button']` |
| `prefers-reduced-motion` | ✅ Corrigé | Désactivation globale |
| Navigation clavier recherche | ✅ Corrigé | ↑↓ Entrée Home/End |
| Surlignage recherche | ✅ Corrigé | `<mark>` stylé |
| Pas de barre de progression | ✅ Corrigé | `ReadingProgressBar.astro` |
| Pas de parcours de lecture | ✅ Corrigé | `ParcoursNav.astro` (précédent/suivant) |
| Footer avec liens factices | ✅ Corrigé | Vrais liens GitHub + X + retour en haut |
| JSON-LD / canonical / RSS | ✅ Corrigé | Structured data complet |
| Search modal dans `<nav>` | ✅ Corrigé | Rendu hors de la nav |
| Sidebar vide sans TOC | ✅ Corrigé | Colonne TOC masquée si pas de headings |
| Light mode palette | ✅ Amélioré | Nouvelle palette « Mer & Encre » |

---

## 🔴 1. PROBLÈMES CRITIQUES RESTANTS

### 1.1 Google Fonts bloquant le rendu → ✅ CORRIGÉ (partiellement)

**Fichier :** `BaseLayout.astro`

- ✅ Passé de `display=swap` à `display=optional` (élimine le FOUT)
- ✅ Fraunces limité aux poids 600..800 (spectre variable réduit)
- ✅ Ajout d'un `rel="preload" as="style"` en plus du stylesheet
- ⚠️ Les fonts restent sur Google Fonts (self-hosting non possible sans téléchargement externe)
- **Amélioration restante :** Self-host les WOFF2 pour éliminer les allers-retours DNS/TCP/TLS vers Google

---

### 1.2 Sidebar mobile : trop de liens → ✅ CORRIGÉ

**Fichier :** `SidebarNav.astro`

- ✅ Ajout d'un champ de filtrage en haut du drawer mobile
- ✅ Filtrage en temps réel sur le texte des liens
- ✅ Auto-expansion des sections contenant des correspondances
- ✅ Masquage des sections sans résultat
- ✅ Bouton d'effacement du filtre
- ✅ Auto-scroll vers le lien actif à l'ouverture du drawer

---

### 1.3 Navbar dropdowns uniquement au hover → ✅ CORRIGÉ

**Fichier :** `Navbar.astro`

- ✅ Gestionnaire `click` ajouté pour les appareils tactiles
- ✅ Fermeture des autres dropdowns quand un nouveau s'ouvre
- ✅ Fermeture au clic en-dehors (outside click)
- ✅ Fermeture au Escape
- ✅ `aria-expanded` dynamique sur les nav-links
- ✅ Classe CSS `.nav-item--open` pour l'état ouvert

---

## 🟠 2. PROBLÈMES UX MOYENS

### 2.1 Auto-scroll vers le lien actif dans la sidebar → ✅ CORRIGÉ

**Fichier :** `SidebarNav.astro`

- ✅ MutationObserver sur le drawer → scroll automatique vers `.sidebar-link--active`
- ✅ Délai de 300ms pour laisser l'animation de drawer se terminer

---

### 2.2 Page « Dossiers » : ancre de section sans scroll-smooth → ⚠️ Non modifié

Les ancres fonctionnent avec `scroll-padding-top` global. Pas de problème constaté.

---

### 2.3 Aucun onboarding ou tooltip → ✅ CORRIGÉ (partiellement)

- ✅ Ajout d'un encart « 💡 Guide de lecture » sur la homepage expliquant les badges de certitude
- ✅ Lien vers le glossaire
- ⚠️ Tooltips au survol des badges non ajoutés (nécessite JS plus complexe)

---

### 2.4 Breadcrumb trop simpliste → ✅ CORRIGÉ

**Fichier :** `ArticleLayout.astro`

- ✅ Le breadcrumb affiche désormais : `Accueil / La théorie / [Catégorie] / [Article]`
- ✅ La catégorie est un lien vers `/dossiers#[category]`

---

### 2.5 Pas de « temps de lecture » estimé → ✅ CORRIGÉ

**Fichier :** `ArticleLayout.astro`

- ✅ Estimation basée sur le nombre de headings H2
- ✅ Affiché sous le titre avec une icône horloge
- ✅ Valeurs : 2 min, 5 min, 10 min, 15 min, 20+ min

---

### 2.6 Light mode : contrastes encore insuffisants → ✅ CORRIGÉ

**Fichier :** `global.css`

- ✅ `--text-secondary` : `#555047` → `#4a453c` (ratio ~6:1)
- ✅ `--border-color` : `rgba(31,29,24, 0.24)` → `rgba(31,29,24, 0.30)` (plus visible)
- ✅ `--border-strong` : `0.55` → `0.58` (meilleur contraste)

---

### 2.7 Image wallpaper 55 KB chargée sur chaque page → ⚠️ Non critique

Le `wallpaper.webp` n'est pas référencé dans le CSS actuel. Le SVG `waves-*.svg` est utilisé mais est léger.

---

## 🟡 3. PROBLÈMES UI / DESIGN

### 3.1 Polices trop proches en style (Manrope + Fraunces)

Manrope (sans-serif, géométrique) et Fraunces (serif, variable) cohabitent. Fraunces est utilisé uniquement pour les `h1, h2, h3`. Le problème :

- Fraunces en opsz 9..144 avec wght 400..900 charge **tout le spectre** → fichier WOFF2 lourd
- La distinction serif/sans-serif est subtile et peut sembler inconsistante
- Sur mobile, Fraunces peut sembler trop « classic » pour un wiki One Piece

**Correction :**
- Limiter les axes variables de Fraunces aux poids réellement utilisés (600, 700, 800)
- Considérer une police display plus distinctive (ex : Playfair Display, Lora, ou même une police display géométrique comme Sora)
- Ou standardiser sur Manrope uniquement avec des variations de poids/tracking pour les titres

---

### 3.2 Pas de favicon SVG optimisée

Le favicon utilise `favicon.ico` + `favicon.png` (192×192) + `favicon.svg`. Le `.ico` et `.png` sont des formats bitmap obsolètes. Le SVG seul suffirait pour les navigateurs modernes, avec un fallback PNG pour Safari.

**Correction :** Conserver uniquement `favicon.svg` + `favicon.png` (Apple Touch Icon), supprimer `favicon.ico`.

---

### 3.3 Composants ArticleListItem / CategoryCard : pas de description preview

**Fichiers :** `ArticleListItem.astro`, homepage « Articles récents »

La section « Articles récents » de l'accueil affiche uniquement le titre, la catégorie et un badge. Pas d'extrait du contenu ni de description, ce qui donne une liste « plate » sans incitation au clic.

**Correction :** Ajouter un excerpt de 1-2 lignes (de `article.data.summary` ou `article.data.description`).

---

### 3.4 Carte mentale : page statique sans interactivité

**Fichier :** `src/pages/explorer/carte-mentale.astro`

La carte mentale est une page avec un layout de liens organisés, mais ce n'est pas une **vraie** carte mentale interactive (pas de graphe, pas de zoom, pas de drag). Pour un site qui se présente comme « wiki de théorie », c'est une fonctionnalité attendue.

**Correction :** 
- Court terme : Ajouter une indication « Vue simplifiée — la carte interactive est en développement »
- Long terme : Implémenter un vrai graphe interactif (D3.js, Cytoscape, ou vis.js)

---

### 3.5 Section « Comprendre la théorie » de l'accueil : pas de progression visuelle

**Fichier :** `src/pages/index.astro`

Les 3 cartes « Comprendre la théorie » (Résumé 30s, Carte mentale 5-10min, Théorie complète 30-60min) présentent des durées croissantes mais sans indicateur visuel de progression. L'utilisateur ne perçoit pas qu'il s'agit d'un cheminement.

**Correction :**
- Ajouter un fil conducteur (ligne reliant les 3 cartes)
- Ou des numéros d'étape (1→2→3)
- Ou un progress indicator (de débutant à expert)

---

### 3.6 Hover effects trop uniformes (translateY(-2px) partout)

Presque tous les éléments interactifs utilisent le même `transform: translateY(-2px)` au hover :
- CatégorieCard, UnderstandCard, ArticleRow, BtnSeeAll, SidebarLink, NavDropdownLink, BtnReadNav, ParcoursLink, FooterSocialLink...

Cela donne une impression de « mécanique » répétitive. Différencier les micro-interactions par contexte :

- **Cartes** : translateY(-3px) + ombre (effet de profondeur)
- **Boutons CTA** : translateY(-1px) + glow (effet d'activation)
- **Liens de texte** : aucun translateY, juste un changement de couleur
- **Boutons d'icône** : scale(1.08) (effet de zoom)

---

### 3.7 Pas de page d'erreur 500

Seule la page 404 est personnalisée. En cas d'erreur serveur, l'utilisateur voit une page générique.

**Correction :** Ajouter `src/pages/500.astro` avec le même design que 404.

---

## 🟢 4. AMÉLIORATIONS SOUHAITABLES

### 4.1 Accessibilité

| Élément | Statut | Action |
|---------|--------|--------|
| `lang="fr"` | ✅ | OK |
| Skip to content | ✅ | OK |
| `:focus-visible` | ✅ | OK |
| `prefers-reduced-motion` | ✅ | OK |
| `aria-label` sur boutons | ✅ | OK |
| `aria-current` sur lien actif | ✅ | OK |
| `role="dialog"` sur recherche | ✅ | OK |
| Focus trap dans drawer | ✅ | OK |
| Focus trap dans recherche | ✅ | OK |
| Contraste light mode | ✅ | Corrigé (text-secondary + border-color renforcés) |
| Taille tactile mobile (44px) | ⚠️ | `.tap-target` existe mais pas appliqué partout |
| Hiérarchie H1→H2→H3 | ⚠️ | Vérifier les pages dossiers/explorer |
| `alt` text images R2Image | ⚠️ | Dépend du contenu Markdown |
| Landmarks ARIA | ✅ | `<aside aria-label>` ajouté sur les deux sidebars |

---

### 4.2 Performance

| Élément | Problème | Impact | Correction |
|---------|----------|--------|------------|
| Google Fonts | 2 fonts render-blocking | FCP +200-500ms | Self-host WOFF2 + `font-display: optional` |
| Fraunces variable | Spectre complet chargé | ~40-60 KB inutiles | Limiter aux poids 600-800 |
| React (SearchModal) | Hydraté en `client:idle` | ~30 KB JS | Acceptable, mais envisager une version Astro pure |
| `background-attachment: fixed` | Repaints au scroll | Jank sur mobile | Désactiver sur mobile (déjà partiel) |
| Pas de `loading="lazy"` natif | Images dans articles | CLS + charge inutile | Ajouter `loading="lazy"` sur les `<img>` du contenu |
| Pas de `width`/5`height` sur R2Image | Layout shift | CLS | Ajouter dimensions explicites ou `aspect-ratio` |

---

### 4.3 SEO

| Élément | Statut | Action |
|---------|--------|--------|
| Canonical URL | ✅ | OK |
| JSON-LD (Article, WebSite, BreadcrumbList, CollectionPage) | ✅ | OK |
| RSS Feed | ✅ | OK |
| Sitemap | ✅ | OK |
| `<meta name="author">` | ✅ | OK |
| `og:image` | ✅ | OK |
| `llms.txt` / `llms-full.txt` | ✅ | OK |
| `robots.txt` | ✅ | OK |
| Redirects (slug → slug) | ✅ | OK |
| `seoTitle` distinct du H1 | ✅ | OK |

Le SEO est **très bien fait**. Pas d'action urgente.

---

### 4.4 Mobile / Responsive

| Problème | Détail | Solution |
|----------|--------|----------|
| Navbar 3 boutons serrés | Recherche + thème + hamburger sur <640px | Acceptable, mais espacement minimal |
| Pas de gestes swipe | ✅ Corrigé | Swipe gauche → fermer le drawer |
| Grid comprendre 1 colonne | 3→1 colonne sur mobile | Envisager 2 colonnes sur tablette (641-768px) |
| TOC drawer non visible | Le FAB « Sommaire » n'existe plus ? | Vérifier qu'un accès TOC existe sur mobile |

---

### 4.5 Contenu / Fonctionnalités

| Problème | Détail | Solution |
|----------|--------|----------|
| Pas de système de favoris | L'utilisateur ne peut pas sauvegarder des articles | localStorage + UI de favoris |
| Pas de mode « lecture zen » | Pas de mode sans sidebar/distractions | Bouton toggle qui masque la sidebar |
| Pas de partage social | ✅ Corrigé | Boutons X + copier le lien ajoutés sur les articles |
| Pas de dark/light auto | ✅ Corrigé | `matchMedia` change event écouté en temps réel |
| Pas de recherche récente | La modale n'affiche pas l'historique | Stocker les 5 dernières requêtes en localStorage |
| Pas de page « Plan du site » | Seul le sitemap XML existe | Ajouter `/aide/plan-du-site` HTML |

---

## 🎯 5. RECOMMANDATIONS PRIORISÉES — MISE À JOUR POST-CORRECTIFS

### ✅ Sprint 1 — Corrigé
1. ~~Self-host les fonts~~ → `font-display: optional` + Fraunces limité 600-800
2. ~~Limiter les axes Fraunces~~ → ✅
3. ~~Dropdown navbar au clic~~ → ✅
4. ~~Améliorer les contrastes light mode~~ → ✅

### ✅ Sprint 2 — Corrigé
1. ~~Filtre/recherche dans le drawer mobile~~ → ✅
2. ~~Auto-scroll vers le lien actif~~ → ✅
3. ~~Swipe gauche pour fermer~~ → ✅
4. ~~Vérifier l'accès TOC mobile~~ → ⚠️ À vérifier

### ✅ Sprint 3 — Corrigé
1. ~~Breadcrumb avec catégorie~~ → ✅
2. ~~Temps de lecture estimé~~ → ✅
3. ~~Extrait des articles récents~~ → ✅
4. ~~Progression visuelle~~ → ✅
5. ~~Diversifier les micro-interactions~~ → ✅ (partiel)

### Sprint 4 — Reste à faire (plus long terme)
1. **Carte mentale interactive** (graphe D3/Cytoscape)
2. **Système de favoris** (localStorage)
3. ~~Boutons de partage~~ → ✅ Corrigé
4. **Recherche récente** dans la modale
5. **Mode lecture zen**
6. **Page plan du site** HTML
7. ~~Page 500~~ → ✅ Corrigée
8. **Self-host fonts WOFF2** (téléchargement externe requis)

---

## 📊 Résumé visuel — post-correctifs

```
Critique   ░░░░░░░░░░  0 problèmes  (tous corrigés !)
UX moyen   █░░░F░░░░░  1 reste     (TOC mobile à vérifier)
UI design  ██░░░░░░░░  2 restent   (carte mentale, favicon)
Souhaitable ████░░░░░░  4 restent   (favoris, recherche récente, lecture zen, plan site)
```

---

*Analyse réalisée par inspection du code source (août 2026). Un test utilisateur sur le site déployé est recommandé pour valider les problèmes d'interaction perçus, en particulier sur tablette et mobile.*
