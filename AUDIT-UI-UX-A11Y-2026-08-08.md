# Audit UI / UX / Accessibilité — Les Fous du Bus

> Date : 2026-08-08
> Branche : `arena/019fe34d-lesfousdubus`
> Stack : Astro 7 + React (modal recherche) + Tailwind, Pagefind, dark/light natifs.

Le site est globalement **très soigné** (palette cohérente, dark/light géré, préférence `prefers-reduced-motion` respectée, tests de contraste automatisés en place, skip-link, focus visibles, pièges de focus tiroir/modal, inert sur le fond, etc.). Les points ci-dessous sont classés par gravité :

- 🔴 Critique / bloquant
- 🟠 Majeur
- 🟡 Mineur / confort
- 🔵 Recommandation / optimisation
- 🟢 Bonne pratique à étendre

---

## 1. Accessibilité (WCAG 2.2 AA)

### 🔴 1.1 Le logo du footer n'a pas d'alternative textuelle cohérente
- **Fichier** : `src/components/Footer.astro` ligne 19
- `alt="Les Fous du Bus"` sur un logo placé à côté de "© 2026 Les Fous du Bus" = alt redondant et qui plus est lu deux fois en mode "brut" car le logo est seul dans `.footer__brand`. Remplacer par `alt=""` puisque le texte adjacent dit déjà le nom. Idem dans `Navbar.astro` : le logo est dans un lien qui contient aussi le texte "Les Fous du Bus" → passer le `<img>` en `alt=""` pour éviter la double annonce.
- **Justification** : WCAG 1.1.1 Non-text Content + WCAG 2.4.4 Link Purpose.

### 🟠 1.2 Les `<svg role="img">` des schémas d'exploration n'ont pas de `aria-label`/`<title>`
- **Fichiers** : `src/pages/explorer/{carte-blue-star,fresque-elbaf}.astro`
- Ils déclarent `role="img"` mais aucun nom accessible : les lecteurs d'écran annoncent juste "image, sans description".
- **Correction** : ajouter `aria-label="Schéma X — description en 1 phrase"` et un `<title>` interne pour les navigateurs qui préfèrent. Ajouter aussi une `<p class="sr-only">` légende textuelle complète après le SVG.
- Idem pour les `<div role="img">` de `deluge-all-blue`, `memoire-avenir`, `omen-imu`, `road-poneglyphes-temps`, `schema-pluton`, `guerre-finale` : role=img exige un nom accessible (WCAG 4.1.2).

### 🟠 1.3 Vidéo YouTube (facade) — absence d'avertissement "contenu externe" et de contrôle d'autoplay respectueux
- **Fichier** : `src/pages/index.astro`
- Le clic charge un iframe YouTube `?autoplay=1` qui démarre la lecture automatiquement → mauvais pour les utilisateurs de synthèse vocale (le flux audio entre en conflit) et contre le respect de l'autonomie de navigation.
- **Correction** :
  - Retirer `autoplay=1` (ou le remplacer par `autoplay=0`).
  - Ajouter `title` descriptif déjà présent ✓.
  - Ajouter `loading="lazy"` sur la miniature ✅ (ok).
  - Ajouter un lien discret "Ouvrir sur YouTube" sous la vidéo pour qui ne peut/veut pas d'iframe.
- Bonus : pas de sous-titres activés par défaut → ajouter `&cc_load_policy=1&cc_lang_pref=fr` et `iv_load_policy=3` (désactive les annotations).

### 🟠 1.4 `role="button"` sur `.video-facade` → préférer un vrai `<button>`
- **Fichier** : `src/pages/index.astro`
- La facade est un `<div role="button" tabindex="0>` avec JS dédié Enter/Espace. Ça fonctionne mais :
  - n'a pas `type="button"`
  - n'expose pas `aria-pressed`
  - ne reçoit pas le style `cursor:pointer` par défaut et n'est pas reconnu comme bouton par tous les outils d'assistance.
- **Correction** : remplacer par un vrai `<button type="button">` (meilleur support clavier/a11y gratuit).

### 🟠 1.5 Labels manquants / ambigus
- **Navbar** : `aria-label="Basculer la barre latérale"` sur le bouton sidebar-toggle est ambigu entre le collapse desktop et le drawer mobile. Utiliser deux libellés selon le contexte ("Réduire la navigation latérale" / "Ouvrir le menu").
- **Bouton hamburger mobile** : `aria-label="Menu"` est trop générique → "Ouvrir le menu de navigation".
- **TOC FAB** : `aria-label="Sommaire de la page"` ok, mais `<span>Sommaire</span>` sans `aria-hidden` → double annonce sur certaines techno. Soit masquer le span, soit s'en servir de label via `aria-labelledby`.
- **SearchModal** : deux boutons "Fermer la recherche" (l'icône × et le badge "Échap") → le badge "Échap" fait office de bouton et de rappel clavier ; ce n'est pas idéal (deux cibles voisines qui font la même action). Ne garder que le × et afficher le raccourci dans le footer (déjà présent) + `kbd`.

### 🟡 1.6 `aria-expanded` sur la nav desktop (menus déroulants)
- Le `.nav-link` a `aria-haspopup="true" aria-expanded="false"` mais l'`aria-expanded` n'est basculé que via la classe `.nav-item--open` (touch/click). Au survol (`:hover`, `focus-within`), le dropdown est visible mais `aria-expanded` reste à `false` → un lecteur d'écran ne sait pas que le menu est ouvert au focus clavier.
- **Correction** : basculer `aria-expanded` aussi à `focusin`/`focusout`, et fermer les dropdowns à `Escape` (déjà en place) + quand le focus sort.

### 🟡 1.7 Cibles tactiles
- Beaucoup de cibles sont à 32-34px (navbar sidebar-toggle, theme-btn, icon-btn, boutons de la navbar mobile) → WCAG 2.5.5 Target Size (Enhanced, AAA) demande 44×44, AA 2.2 recommande 24px minimum. Le site utilise déjà `.tap-target` sur certains éléments mais pas systématiquement.
- **Correction** : passer toutes les icônes d'action (theme, menu, search close, TOC close, footer social, back-to-top) à **44×44 px** en mobile (<768px) et 36×36 en desktop. Aujourd'hui `theme-btn`, `icon-btn`, `navbar-sidebar-toggle` sont à 34×34 (desktop ok) et 36×36 mobile → c'est limite ; harmoniser à 40×40 min.

### 🟡 1.8 Focus visible sur les liens de carte (CategoryCard, UnderstandCard, ArticleListItem…)
- Les cartes sont des liens entiers mais leur `:focus-visible` ne semble pas surchargé → le contour cyan est appliqué globalement (bon). En revanche, `CategoryCard` a un `::before` en `border-gradient` qui apparaît au hover mais :
  - les coins de l'outline sont coupés à cause de `overflow:hidden` sur `.card`.
  - **Correction** : retirer `overflow:hidden` (utiliser `isolation:isolate`) et ajouter un `:focus-visible` explicite.

### 🟡 1.9 `prefers-reduced-motion` incomplet
- Bon : une règle globale neutralise `animation` et `transition`, et le JS IntersectionObserver saute l'animation si `reduce=true`.
- Il reste plusieurs animations non neutralisées explicitement :
  - `@keyframes pulse-dot` sur le hero badge (une règle dédiée est bien présente ✓).
  - `@keyframes wave-drift` (si jamais utilisée).
  - `transform: scale()` sur `:active` des boutons — pas bloquant, mais peut surprendre.
- Vérifier que le scroll horizontal infini des vagues (`background` `waves-*.svg` en `background-attachment:fixed`) ne déclenche pas de parallaxe non désactivée. Déjà masqué par `.wallpaper-bg, .scene { display:none }` en reduced-motion (ok dans le code de BaseLayout, à confirmer sur `BackgroundScene.astro`).

### 🟡 1.10 Langue & direction
- `<html lang="fr">` ✓
- Mais des mots japonais/anglais ("One Piece", "Joy Boy", "Luffy", "Nika", "Road Poneglyphes", etc.) parsèment le contenu → ils devraient être marqués `<span lang="en">…</span>` ou `<span lang="ja">…</span>` pour la synthèse vocale.
- **Recommandation** : au minimum pour les noms propres non francisés, utiliser une classe `.term` avec `lang="en"` dans les articles MDX.

### 🟡 1.11 Landmarks et structure
- Bon : `<nav>`, `<main id="main-content">`, `<aside>` pour les sidebars, skip-link ✓.
- Le pied de page est `<footer>` mais **en dehors de `<main>`** — parfait ✓.
- La navbar est dans un `<nav>` qui n'a pas d'`aria-label` explicite ("Navigation principale" serait utile car il y a plusieurs `<nav>` : breadcrumb, sidebar, TOC).
- **Correction** : ajouter `aria-label="Navigation principale"` sur `<nav class="navbar">`, `aria-label="Navigation par chapitres"` sur la sidebar, `aria-label="Fil d'Ariane"` ✓ (déjà présent), `aria-label="Table des matières"` ✓.
- Le `<nav data-pagefind-ignore>` racine de la sidebar (dans `SidebarNav.astro`) n'a **pas de `aria-label`** : ajouter `aria-label="Navigation des articles"`.

### 🟡 1.12 Breadcrumb
- Bon : `<nav aria-label="Fil d'Ariane">`, `<ol>`, `aria-current="page"` ✓.
- Le séparateur `/` est en `aria-hidden="true"` ✓.
- En revanche, le breadcrumb n'est pas rendu sur les pages d'articles (`!currentPath.startsWith('/theorie/')`), ce qui fait qu'un article n'a que le TOC à droite et la sidebar à gauche : il n'y a pas de repère hiérarchique visible.
- **Correction** : ajouter un breadcrumb minimal `Accueil → Dossiers → Catégorie → Article` sur les pages d'articles.

### 🟡 1.13 Headings order
- H1 présent sur l'accueil. Les articles ont probablement un H1 dans le contenu. Vérifier qu'il n'y a jamais de saut H1→H3 sans H2. Les titres des cards `<h3 class="card__title">` sont sur la page d'accueil, le premier `<h2 class="section-title">` existe → c'est cohérent.
- Dans `SearchModal` : les résultats utilisent `<h4 class="search-result-title">` → mais ils apparaissent dans une liste `<ul role="listbox">` où chaque item est un `<a role="option">`. Les titres `<h4>` à l'intérieur d'une `option` n'ont pas de sens sémantique : les remplacer par des `<div>` ou `<span>` (la hiérarchie du document n'existe pas dans une combobox/option).

### 🔵 1.14 Liens externes
- Les liens GitHub / X dans le footer ont `target="_blank"` mais **pas d'indication visuelle/texte** "ouvre dans un nouvel onglet" — WCAG 3.2.5 demande de prévenir l'utilisateur.
- **Correction** : ajouter `aria-label="GitHub (nouvel onglet)"` et une icône visuelle discrète ou un texte "(nouvel onglet)" en `sr-only`.

### 🔵 1.15 Images décoratives
- Les emojis dans les cartes (`🌍`, `📜` etc.) sont correctement en `aria-hidden="true"` ✓, **sauf** dans la sidebar (`.sidebar-section-toggle`) où l'icône est dans un `<span>` sans `aria-hidden` — elle sera lue comme "🌍 globe".
- **Correction** : ajouter `aria-hidden="true"` sur le span de l'icône dans SidebarNav.

### 🔵 1.16 Formulaire de recherche
- `aria-label="Rechercher"` sur l'input ✓, `aria-controls="search-results"` ✓, `aria-activedescendant` ✓.
- Il manque `role="combobox"` sur l'input (pattern ARIA APG combobox) pour annoncer correctement l'autocomplétion.
- La liste utilise `role="listbox"` et les liens `role="option" aria-selected` : **mais** les options sont des `<a>` dans une listbox — un `role="option"` ne doit pas être un lien qui navigue ; en pratique ça marche, mais le pattern recommandé est `role="option"` sur un élément non-interactif dans le `<li>`, avec navigation au clic. Acceptable mais non strict.
- Le `sr-only #sidebar-filter-status` est présent dans SidebarNav pour annoncer le nombre de résultats ✓.

### 🔵 1.17 Piège de focus du SearchModal
- `inert` sur `#main-content` ok, focus trap ok.
- Les éléments hors `#main-content` (navbar, footer) **ne sont pas rendus inert** quand la modale est ouverte.
- **Correction** : soit ajouter `inert` à `<nav class="navbar">` et `<footer>` pendant l'ouverture, soit utiliser un `<dialog>` natif qui gère cela nativement.

### 🔵 1.18 `prefers-contrast` / `forced-colors`
- Aucune règle `@media (forced-colors: active)` : les bordures translucides, les glows et `backdrop-filter` disparaissent en mode contraste élevé Windows.
- **Correction** : ajouter un bloc `@media (forced-colors: active)` qui remplace les couleurs système (`Canvas`, `CanvasText`, `Highlight`, `ButtonText`), force une bordure pleine sur les cartes/boutons, et désactive `backdrop-filter` / `box-shadow`.

---

## 2. UI / Design

### 🟠 2.1 Double bouton "Retour haut"
- Il y a un `BackToTop.astro` (bouton flottant rond) **et** un bouton "Haut" dans le footer. Deux contrôles pour la même action à proximité → confusion.
- **Correction** :
  - Soit supprimer le bouton flottant (le footer est toujours accessible et le TOC-FAB flottant occupe déjà le coin inférieur droit).
  - Soit supprimer le bouton du footer et garder le flottant.
  - Préférence : **supprimer le bouton flottant** car (1) la barre d'URL/navigation des navigateurs propose déjà le scroll-top, (2) il chevauche déjà le TOC-FAB (décalage par media query — très fragile), (3) il ajoute un élément flottant qui masque le contenu.

### 🟠 2.2 Chevauchement TOC FAB / BackToTop / safe-area
- `@media (max-width:1200px) { #back-to-top { bottom: 76px; } }` et `@media (max-width:640px) { bottom:148px; }` : ces valeurs dépendent du TOC-FAB à `bottom:84px`. Si un des deux bouge, l'autre casse.
- Avec `env(safe-area-inset-bottom)` (iOS) le TOC-FAB est placé à `bottom:24px` + `padding-bottom:env(...)` non prévu, il peut donc être masqué par la barre d'accueil iOS en paysage.
- **Correction** : ajouter `padding-bottom: env(safe-area-inset-bottom, 0px)` au parent ou au bouton.

### 🟠 2.3 Lecture des longueurs de ligne & rythme
- Le `main-content` a `max-width: min(860px, 100%)` — correct pour la lisibilité (~70-80 caractères).
- Cependant **en zen mode** on passe à 780px ✓.
- **Problème** : `.card__desc` et `.understand-card p` sont à `font-size:13.5px` → un peu petit sur écran desktop (16px standard pour le texte courant, 14px minimum pour des métadonnées).
- **Correction** : remonter le texte courant à 16-17px (défini via Tailwind?), et les descriptions de cartes à 14px.

### 🟡 2.4 Cohérence des bordures arrondies
- Définir plusieurs tokens quasiment identiques : `--border-radius-sm:8px`, `--border-radius:8px`, `--border-radius-md:12px`, `--border-radius-lg:12px`, `--border-radius-xl:16px`.
- Sm/Md/Lg sont dupliqués ; simplifier à 3 valeurs (sm=6, md=10, lg=14 ou similaire) pour éviter l'indécision.

### 🟡 2.5 Système d'espacement
- Les tokens `--space-1..6` sont déclarés mais jamais utilisés (les composants utilisent du padding/margin en dur : `20px`, `22px`, `24px`, `28px`, `32px`, `40px`).
- **Correction** : utiliser les tokens, ou les supprimer pour éviter la fausse promesse.

### 🟡 2.6 Gradient du btn-primary / lisibilité
- `--gradient-border: linear-gradient(120deg, var(--violet), var(--cyan-dim))` est utilisé sur `.btn-primary` avec du texte `--bg-main` (clair en dark, sombre en light). Le test automatique de contraste vérifie les extrémités du dégradé (violet #8091cf, cyan-dim #3f939c) avec `#0e1722` → ok. Mais au milieu, la couleur affichée est ~bleu-gris moyen : vérifier le point milieu (en light notamment, où `--violet` = `#3f4a7a` et `--cyan-dim` = `#0a5e69` sont assez sombres sur `--bg-main: #f8f5ed`) → le test unitaire confirme le ratio AA, c'est OK.

### 🟡 2.7 Focus coupé sur les `.card` avec `overflow:hidden`
- Mentionné en 1.8 → à corriger.

### 🟡 2.8 Wave SVG décorative
- La vague en `background-image` (`waves-dark.svg` / `waves-light.svg`) est répétée et fixe → en light elle utilise des couleurs qui ne sont pas dans la palette du thème (vérifier le SVG). À harmoniser.

### 🟡 2.9 Barre de progression de lecture
- En haut du viewport, `height:3px`, z-index 80. Elle est `aria-hidden="true"`, c'est bien car elle est purement décorative.
- Cependant : quand la recherche est ouverte, la barre reste visible au-dessus de la modale (z-index 100 vs 80 → 80 est inférieur, c'est ok). Vérifier en mobile.

### 🟡 2.10 Hero : espacement & CTA
- 3 CTA sur desktop ("Lire le résumé", "Théorie complète", "Dernier chapitre analysé") : c'est un de trop et le troisième entre en concurrence avec le `ChapterBanner` juste après.
- **Recommandation** : garder 2 CTA (résumé + théorie complète), et laisser la bannière chapitre porter l'info "dernier chapitre".

### 🟡 2.11 Icônes dans les cartes (emojis)
- Dépend de la police emoji système : les emojis ont un rendu différent selon l'OS (Apple color vs Twemoji vs Samsung). Pour une identité visuelle cohérente, remplacer les emojis 🌍📜🎭🔱⚡⚖️⚔️ par des icônes SVG inline (Lucide / Remix Icon / custom). Évite aussi le problème d'accessibilité (lecture par les lecteurs d'écran si aria-hidden oublié).

### 🔵 2.12 Typographie
- Manrope (sans) + Fraunces (display, pour les titres) : bon choix éditorial.
- `font-feature-settings: 'ss01','cv01'` sur le body : s'assurer que Manrope expose bien ces features (sinon sans effet).
- Pensez à charger `@fontsource/fraunces/400.css` car le 700/800 seul ne couvre pas les futurs textes en display plus fins.
- Les italiques (`<em>`) ne sont pas chargés → ajouter `@fontsource/manrope/400-italic.css` etc. (sinon faux-italique).

### 🔵 2.13 Effet de survol "hover-lift" et `card-hover`
- Plusieurs classes (`hover-lift`, `hover-glow`, `hover-scale`, `card-hover`) font le même type d'interaction : les unifier en une ou deux variantes nommées sémantiquement (ex: `link-card` avec elevation, `chip` sans elevation).

### 🔵 2.14 Dark / Light toggle
- Le bouton est une icône soleil/lune. Prévoir aussi un état "système" (troisième état) : aujourd'hui le thème par défaut suit l'OS mais une fois qu'un utilisateur a cliqué, il ne peut pas revenir en mode "système" sans effacer localStorage.
- **Correction** : cycle soleil → lune → auto (icône "écran" ou "A").

### 🔵 2.15 Fil d'Ariane sur /theorie/<slug>
- Absent (1.12) ; ça manque pour se repérer quand on arrive via recherche.

### 🔵 2.16 Skip-link
- Présent mais renvoie vers `#main-content`. En mobile, si la sidebar est ouverte et qu'un utilisateur Tab depuis l'URL bar, le skip-link n'aidera pas (inert sur main). Acceptable.
- Le skip-link pourrait aussi proposer un second lien "Aller à la navigation" / "Aller à la recherche" (Ctrl+K déjà présent).

---

## 3. UX (parcours, contenus, micro-interactions)

### 🟠 3.1 Recherche Pagefind : chargement et retour utilisateur
- `SearchModal` charge `pagefind.js` en asynchrone (import dynamique). En dev c'est instantané, en prod sur connexion lente (3G) il y a un délai entre la frappe et l'apparition des résultats.
- Un état "Recherche en cours…" est présent (`showLoading`) ✓ mais le 180ms de debounce + chargement peut dépasser 1s sans spinner.
- **Correction** : afficher un petit spinner (3 points animés) à la place du texte seul.
- En cas d'échec de chargement de Pagefind (contenu bloqué par un bloqueur de pubs/extensions qui filtre `/pagefind/`), l'erreur est juste `console.error` → l'utilisateur voit "Aucun résultat" au lieu d'un vrai message d'erreur.
- **Correction** : distinguer `erreur` de `pas de résultats`, proposer de réessayer ou un lien vers `/aide/plan-du-site`.

### 🟠 3.2 Page d'accueil : vidéo YouTube
- Chargement de la miniature YouTube depuis `img.youtube.com` → **appel tiers non consenti** (RGPD, traqueurs YouTube avant le clic). La facade est bonne, mais la miniature est chargée dès le HTML, sans consentement.
- **Correction** : utiliser une miniature locale (générée au build et servie depuis le domaine) plutôt que `img.youtube.com`. Stocker une image dans `/public/` (ex: `/video-poster.jpg`). Bonus : la qualité maxresdefault n'est pas disponible pour toutes les vidéos, d'où le fallback dans `onerror=` — si on maîtrise l'image, pas besoin de fallback multiple.

### 🟡 3.3 Raccourcis clavier
- Ctrl+K pour la recherche ✓, navigation ↑↓/Entrée/Échap dans la recherche ✓, Échap ferme le tiroir ✓.
- Rien n'indique le raccourci "Zen mode" (s'il existe). Rien n'indique "Alt+Flèche gauche" pour revenir.
- **Recommandation** : ajouter un petit overlay d'aide aux raccourcis avec `?`, type "Appuyez sur ? pour l'aide" (classique sur les docs/wikis).

### 🟡 3.4 Indication de position de lecture
- Barre de progression en haut ✓, TOC avec scroll-spy ✓.
- Le titre de l'article en cours n'est pas répété dans la navbar (type "collapsed title on scroll") : pour les articles longs ça aiderait.
- Ajouter un `time` de lecture ("~ 12 min") dans `ArticleMeta.astro` si ce n'est déjà fait.

### 🟡 3.5 Recherche dans la sidebar
- Le filtre "Filtrer les articles…" est très utile mais :
  - il n'y a pas de bouton "Réinitialiser" visible tant qu'il y a une saisie : le bouton `.sidebar-filter__clear` existe mais `display:none` initialement — c'est ok s'il apparaît en JS. Vérifier que le bouton est accessible au clavier.
  - quand le filtre ne renvoie que 1-2 résultats sur un grand nombre de sections repliées, l'utilisateur doit ouvrir chaque section pour trouver les correspondances. **Correction** : ouvrir automatiquement les sections qui contiennent des résultats.

### 🟡 3.6 TOC (table des matières)
- Bon scroll-spy via IntersectionObserver ✓.
- Le décalage d'ancrage (`scroll-padding-top`) sur le html est géré ✓.
- Le TOC à droite est masqué sous 1200px, remplacé par le TOC-FAB. Entre 1024px et 1200px, la sidebar gauche est visible mais le TOC est déjà en drawer : le bouton FAB apparaît mais la page a encore de la place pour le TOC à droite.
- **Correction** : remonter le breakpoint de disparition du TOC droit à `1024px` (plutôt que `1200px`) ou mesurer dynamiquement si la colonne centrale a assez de largeur.

### 🟡 3.7 Drawer mobile
- Très bonne implémentation (zéro reflow, `touch-action`, inert, focus trap, swipe-to-close, fermeture à l'Echap, fermeture auto au resize).
- Le swipe-to-close ne fonctionne que vers la gauche (sur le bord gauche) : c'est peu intuitif pour un drawer qui est à gauche (on swipe généralement depuis la bordure pour ouvrir et pour fermer, on clique sur l'overlay ou glisser à gauche partout).
- Un geste **drag-to-dismiss** (glisser-déposer horizontal) améliorerait la sensation.

### 🟡 3.8 Redimensionnement de la sidebar (drag handle)
- Bon : localStorage, min/max 200/480, classe `is-resizing` qui désactive les transitions.
- La poignée fait 8px mais invisible (curseur change au survol seulement). Un indice visuel (une petite barre de 2px discrète) aiderait à découvrir la fonctionnalité.
- Il n'y a pas de raccourci clavier pour redimensionner (peu utile, mais ce serait un plus).

### 🟡 3.9 PWA / manifeste
- `manifest.json` présent ✓, `theme-color` et `background_color` présents ✓.
- Les icônes `icon-512-maskable` sont déclarées comme `purpose: "any maskable"` : vérifier que le logo a assez de padding (zone de sécurité de 10%) sinon l'icône masquable sera tronquée sur Android.
- Aucun Service Worker n'est installé (pas de Workbox/@astrojs/pwa en dépendance) : le manifeste est donc orphelin (PWA installable mais sans offline). Soit on ajoute un SW simple pour les pages déjà visitées, soit on retire le manifeste pour ne pas promettre d'expérience offline.

### 🟡 3.10 Page d'erreur 404
- Jolie, CTA clairs.
- Absence d'un champ de recherche sur la 404 (proposer directement une recherche aiderait l'utilisateur perdu).
- La 404 a `noSidebar` → pas de lien vers des pages populaires. Ajouter un petit bloc "Pages populaires" (5 liens).

### 🟡 3.11 Page 500
- Idem, ne devrait PAS être pré-rendue comme page statique (Astro génère une 500.astro qui est rendue en dev mais en static hosting elle est rarement servie en prod — il n'y a pas de serveur). Ce n'est pas bloquant mais c'est à noter.

### 🔵 3.12 Fil d'actualité / RSS
- Flux RSS présent (`/rss.xml`) ✓, lien `<link rel=alternate>` ✓. Ajouter un lien visible vers le RSS/Atom dans le footer ou une page `/aide/plan-du-site`.
- Un lien "Suivre par RSS" discret dans le footer avec une icône dédiée est recommandé.

### 🔵 3.13 Anchor links partagables
- Les titres d'articles ont des slugs mais aucun bouton "copier le lien de cette section" au survol. UX agréable sur les wikis techniques.

### 🔵 3.14 États de chargement / squelette
- Le site étant statique Astro, pas de chargement client. Mais la recherche, les éventuelles pages "explorer" avec SVG interactif, et les filtres gagneraient à avoir un squelette visuel. Aujourd'hui le scroll-reveal "reveal" joue ce rôle à l'arrivée.

### 🔵 3.15 Image performance
- Les images venant de R2 (`<R2Image>`) utilisent un `<img>` classique sans `srcset`/`sizes` ni format moderne (AVIF/WebP).
- **Correction** : passer par `astro:assets` (ou `@astrojs/image`) pour générer automatiquement srcset, AVIF/WebP et sizes. Pour un site à fort contenu visuel, le gain est important.
- Lazy-loading déjà présent (`loading="lazy"`) ✓, `fetchpriority="high"` sur le hero si eager ✓.
- Les images hébergées sur `img.youtube.com` et le logo ne bénéficient pas de `width`/`height` explicites (le logo si : 34×34).

### 🔵 3.16 Prefetch
- Astro `prefetch: true` précharge les liens au survol : attention à la sur-pré-chauffe sur mobile (consommation data). Configurer `prefetch: { prefetchAll: false, defaultStrategy: 'hover' }`.

---

## 4. SEO / Technique (impact indirect sur UX)

### 🟡 4.1 Meta keywords
- La balise `<meta name="keywords">` est ignorée par Google depuis 2009 et peut pénaliser la confiance s'il y a du keyword stuffing. La liste actuelle est sobre, mais la retirer reste une bonne pratique.

### 🟡 4.2 Open Graph image alt
- `og:image:alt` en anglais/très générique ("Les Fous du Bus — Le Siècle oublié est le présent") : c'est la même chaîne pour toutes les pages. Générer un alt plus pertinent par page (même que title) serait mieux.

### 🟡 4.3 Twitter meta
- Manque `twitter:site` (`@FoudubusTV_`) et `twitter:creator`.

### 🔵 4.4 Plan du site
- Une page `/aide/plan-du-site.astro` existe — ajouter un lien dans le footer.

### 🔵 4.5 `noBreadcrumb` sur la page d'accueil mais breadcrumb absent des articles
- Vu en 1.12 : activer le breadcrumb sur les pages `/theorie/<slug>`.

---

## 5. Cohérence / code (impact maintenabilité → UX long terme)

### 🟡 5.1 Tests d'a11y automatisés absents
- Le projet a Vitest pour les contrastes (excellent) mais pas de test axe-core / pa11y sur les pages clés. Ajouter un test Playwright qui tourne `@axe-core/playwright` sur `/`, `/theorie/resume`, `/dossiers`, `/chapitres`, une page d'article, `/404` en dark et en light.

### 🟡 5.2 Breakpoints harmonisés
- Plusieurs valeurs utilisées à travers le CSS : 400px, 480px, 640px, 768px, 1024px, 1200px, 1280px. Centraliser dans `tailwind.config.mjs` (Tailwind a déjà sm/md/lg/xl/2xl) et réutiliser.

### 🔵 5.3 Dark mode default
- `<html class="dark">` par défaut avec script inline qui rejoue le thème. Bon.
- Mais si le script inline échoue (CSP strict, JS désactivé), l'utilisateur reste en dark. Ajouter un `<noscript>` avec un style de secours en light (ou inversement selon le choix éditorial).

### 🔵 5.4 `color-scheme`
- `<meta name="color-scheme" content="dark light">` ✓ : bien. Vérifier que les champs de formulaire (recherche sidebar, input recherche modale) héritent correctement de la palette du navigateur en dark/light — sinon `color-scheme: light dark` au niveau du `:root`.

### 🔵 5.5 `is:inline` scripts
- Plusieurs scripts inline sans nonce : ok en static, mais si un jour un CSP strict est activé (`script-src 'self'`), ils bloqueront. Prévoir de les externaliser ou de calculer un nonce à la génération.

---

## 6. Priorités de correction suggérées (sprint court)

1. 🔴 Corriger les doublons d'alt sur les logos (Navbar + Footer).
2. 🟠 Ajouter `aria-label`/`<title>` aux schémas SVG (`role="img"`) et aux `div role="img"` d'explorer.
3. 🟠 Retirer `autoplay=1` de l'iframe YouTube et proposer une miniature locale pour RGPD.
4. 🟠 Remplacer la facade vidéo `<div role="button">` par un vrai `<button>`.
5. 🟠 Supprimer un des deux boutons "retour haut" (garder celui du footer).
6. 🟠 Séparer clairement les labels de navigation (sidebar-toggle / hamburger / TOC fab).
7. 🟡 Ajouter un breadcrumb sur les pages d'articles (`/theorie/<slug>`).
8. 🟡 Harmoniser les tailles de cibles tactiles à 44×44px en mobile.
9. 🟡 Réparer le focus-visible sur les cartes (retirer `overflow:hidden`).
10. 🟡 Ajouter `aria-label="Navigation principale"` à la navbar, `aria-label="Navigation des articles"` à la sidebar.
11. 🟡 Taille de texte courant : 16px minimum, descriptions de cartes ≥14px.
12. 🔵 Ajouter un test axe-core en e2e (Playwright) sur les pages critiques.
13. 🔵 Ajouter un état "auto" au toggle de thème.
14. 🔵 Ajouter une page d'aide aux raccourcis (`?`).
15. 🔵 Ajouter `env(safe-area-inset-bottom)` sur FAB/boutons flottants.
16. 🔵 Servir les images R2 via `astro:assets` (AVIF/WebP, srcset).

---

## 7. Points forts à conserver 👏

- ✅ Dark + light thème avec script inline anti-FOUC.
- ✅ `prefers-reduced-motion` globalement bien respecté (JS + CSS).
- ✅ Skip-link fonctionnel.
- ✅ Focus visibles (`:focus-visible`) sur tous les éléments interactifs.
- ✅ Tests unitaires de contraste WCAG AA (46 tests) — très rare et excellent.
- ✅ Piège de focus + `inert` sur les overlays (recherche, drawer mobile).
- ✅ Drawer mobile sans reflow/paddingRight (scrollbar-gutter stable).
- ✅ Sidebar redimensionnable avec persistance localStorage.
- ✅ Breadcrumb sémantique.
- ✅ Scroll-padding-top correct pour ancres.
- ✅ Recherche accessible (aria-activedescendant, combobox-like, alias/typos).
- ✅ Fonts auto-hébergées (respect vie privée).
- ✅ Manifest + SEO complet (Open Graph, Twitter, JSON-LD WebSite/Organization/Article).
- ✅ TOC avec scroll-spy IntersectionObserver.
- ✅ Swipe-to-close du drawer mobile.
- ✅ Respect `overscroll-behavior: contain` dans les conteneurs scrollants.

Globalement, le site est déjà à un très haut niveau d'accessibilité et d'expérience — il reste principalement des ajustements de finition (schémas, cibles tactiles, breadcrumbs, RGPD YouTube, doublon back-to-top) pour atteindre un niveau "exemplaire".
