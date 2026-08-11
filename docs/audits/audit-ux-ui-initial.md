# 🔍 Audit UX / UI / Ergonomie — Les Fous du Bus

> Site wiki éditorial sur la théorie du Siècle oublié dans One Piece  
> Stack : Astro 7 + React + Tailwind CSS + Pagefind  
> Date de l'audit : 26 juillet 2026
>
> **Mise à jour :** plusieurs constats historiques de ce document ont été traités (navigation 404, composants éditoriaux conditionnels, URL canonique via `Astro.site`, CTA d’accueil, chargement différé de la recherche, lien d’évitement, retour en haut et façade vidéo). Les priorités encore ouvertes sont la complétude du contenu et les outils d’exploration.

---

## 📋 Résumé exécutif

Le site est bien structuré techniquement, avec une architecture de contenu solide (collections Astro, schémas Zod, système de badges). Le design dark mode violet/cyan est cohérent et immersif. Cependant, plusieurs problèmes d'ergonomie, de performance et de finition nuisent à l'expérience globale. Voici les **priorités classées par impact** :

| Priorité | Catégorie | Problème | Impact |
|----------|-----------|----------|--------|
| 🔴 Critique | Contenu | Composants placeholder (Preuves, Références, Articles liés) | Expérience cassée |
| 🔴 Critique | Navigation | Liens morts massifs dans la sidebar (100+ liens vers des pages inexistantes) | Frustration |
| 🔴 Critique | SEO | URL canonique incohérente entre BaseLayout et astro.config | Référencement |
| 🟠 Haute | UX | Hero homepage surchargé (3 longs paragraphes sans CTA clair) | Taux de rebond |
| 🟠 Haute | Performance | React chargé sur chaque page via `client:load` | Temps de chargement |
| 🟠 Haute | Mobile | Menu hamburger interminable (>150 liens à scroller) | Utilisabilité mobile |
| 🟡 Moyenne | UI | `border-radius: 4px` partout → design trop angulaire | Perception visuelle |
| 🟡 Moyenne | Accessibilité | Pas de lien "Aller au contenu", contraste light mode | Inclusion |
| 🟢 Basse | Contenu | Footer squelettique avec liens factices | Crédibilité |

---

## 🔴 1. PROBLÈMES CRITIQUES

### 1.1 Composants placeholder vides
**Fichiers :** `EvidenceSection.astro`, `ChapterReferences.astro`, `RelatedArticles.astro`

Trois composants affichés sur **chaque article** sont des coquilles vides :
- `EvidenceSection` → "Les preuves seront affichées ici."
- `ChapterReferences` → "Les références de chapitres seront affichées ici."
- `RelatedArticles` → reçoit un tableau vide `articles={[]}` → grille invisible

**Impact :** Le lecteur voit des sections semi-vides sur chaque article, ce qui donne une impression de site inachevé.

**Correction :**
- Soit connecter ces composants aux collections existantes (`evidence`, `chapters`)
- Soit les masquer conditionnellement quand ils n'ont pas de données

```astro
<!-- Dans ArticleLayout.astro -->
{evidenceList.length > 0 && <EvidenceSection items={evidenceList} />}
{relatedArticles.length > 0 && <RelatedArticles articles={relatedArticles} />}
```

### 1.2 Liens morts massifs dans la sidebar
**Fichier :** `SidebarNav.astro`

La sidebar contient **12 sections et 150+ liens** pointant vers `/dossiers/...` (ex: `/dossiers/blue-star`, `/dossiers/grand-line`, `/dossiers/shanks`...). Or :
- La route dynamique `src/pages/dossiers/[...slug].astro` existe
- Mais il n'y a **aucun fichier de contenu** dans `src/content/articles/` correspondant à ces slugs (les articles ont des noms comme `theorie-complete.md`, `one-piece-histoire.md`, etc.)

**Résultat :** Plus de 90% des liens de la sidebar mènent vers des pages 404 ou des pages vides.

**Correction :**
- Générer la sidebar dynamiquement à partir des articles réellement publiés
- Ou créer les fichiers de contenu manquants

### 1.3 Incohérence d'URL du site
**Fichiers :** `BaseLayout.astro` vs `astro.config.mjs`

```
BaseLayout.astro   → siteUrl = 'https://lesfousdubus.sbs'
astro.config.mjs   → site = 'https://test-site-les-fous-du-bus.epikaigle444.workers.dev'
```

Les balises OG, Twitter Cards et le sitemap généré pointent vers des URLs différentes.

**Correction :** Utiliser `Astro.site` partout au lieu de hardcoder l'URL.

---

## 🟠 2. PROBLÈMES D'EXPÉRIENCE UTILISATEUR

### 2.1 Homepage : hero surchargé sans parcours guidé
**Fichier :** `src/pages/index.astro`

Le hero contient **3 paragraphes denses** (~250 mots) qui forment un mur de texte au-dessus de la ligne de flottaison. Le nouveau visiteur ne sait pas par où commencer.

**Recommandations :**
- Réduire le hero à 1 paragraphe d'accroche (2-3 phrases max)
- Ajouter un **CTA principal** : un bouton "Lire la théorie complète" ou "Commencer par le résumé"
- Ajouter un **CTA secondaire** : "Explorer les dossiers" ou "Dernière analyse"
- Déplacer les 2 paragraphes supplémentaires dans une section "En savoir plus" repliable ou plus bas dans la page

```html
<!-- Exemple de CTA -->
<div class="flex gap-3 mt-6">
  <a href="/theorie/resume" class="btn-primary">Lire le résumé</a>
  <a href="/theorie/theorie-complete" class="btn-secondary">Théorie complète →</a>
</div>
```

### 2.2 Navigation principale absente de la page 404
**Fichier :** `src/pages/404.astro`

La page 404 utilise `BaseLayout` au lieu de `WikiLayout` → pas de navbar, pas de sidebar. L'utilisateur perdu n'a aucun moyen de naviguer.

**Correction :** Utiliser `WikiLayout` ou au minimum inclure la `Navbar`.

### 2.3 Recherche : expérience basique
**Fichier :** `SearchModal.tsx`

- **`client:load`** charge React + le composant sur **chaque page**, même si l'utilisateur ne cherche jamais → impact performance
- Pas de **navigation clavier** dans les résultats (↑/↓/Entrée)
- Pas de **suggestions** ou recherches récentes quand la modale s'ouvre
- Pas de **surlignage** des termes dans les extraits (Pagefind le fournit pourtant)
- Pas de message d'état initial (quand la modale est ouverte mais vide)

**Correction :**
- Utiliser `client:visible` ou `client:idle` au lieu de `client:load`
- Ajouter la navigation clavier (↑/↓ pour naviguer, Entrée pour sélectionner, Echap pour fermer)
- Afficher un message d'accueil : "Tapez pour rechercher dans la théorie..."
- Ajouter le surlignage des termes via `result.excerpt` qui contient déjà les balises `<mark>`

### 2.4 Pas de bouton "Retour en haut"
Les articles de théorie peuvent être très longs (le fichier `theorie-complete.md` fait ~70 lignes, d'autres comme `signification-d.md` ou `dieux-one-piece.md` sont potentiellement beaucoup plus longs). Aucun mécanisme pour remonter en haut de page rapidement.

**Correction :** Ajouter un bouton flottant "↑" qui apparaît au scroll (>300px).

### 2.5 Pas d'indicateur de progression de lecture
Pour un site de lecture longue, un indicateur de progression (barre fine en haut de page) améliorerait l'expérience de lecture.

---

## 🟡 3. PROBLÈMES UI / DESIGN

### 3.1 Border-radius uniformément à 4px
Le Tailwind config définit `borderRadius: { DEFAULT: '4px' }` et tous les composants utilisent des coins très angulaires. Cela donne un aspect technique/austère qui contraste avec le sujet (univers One Piece, aventures, imaginaire).

**Recommandation :** Passer à `6px` ou `8px` par défaut, `12px` pour les cartes et modales.

### 3.2 Transition globale sur TOUS les éléments
**Fichier :** `global.css`

```css
*, *::before, *::after {
  @apply transition-colors duration-200;
}
```

Cela applique une transition à **chaque élément du DOM**, y compris ceux qui n'en ont pas besoin. Impact sur les performances d'animation et comportement inattendu sur les focus.

**Correction :** Appliquer les transitions uniquement aux éléments interactifs :

```css
a, button, input, [role="button"] {
  @apply transition-colors duration-200;
}
```

### 3.3 Thème clair insuffisamment travaillé
Le mode light existe mais semble être un afterthought :
- `--text-secondary: #495057` sur `--bg-main: #f8f9fa` → contraste limite (ratio ~5.7:1, acceptable mais faible)
- `--border-color: rgba(33, 37, 41, 0.1)` → bordures quasi invisibles
- Les badges utilisent `color-mix(in srgb, var(--cyan) 10%, transparent)` qui devient trop pâle en light
- Le wallpaper de fond avec overlay à 85-98% est quasi invisible en light → inutile

**Recommandation :** Revoir la palette light mode avec des contrastes plus affirmés, des bordures plus visibles, et des badges adaptés.

### 3.4 Typographie
- **Taille de base** non définie explicitement → hérite du défaut navigateur (16px), ce qui est correct
- **Contenu des articles** : `line-height: 1.7` est bon pour la lecture
- **Polices** : seule Inter est chargée → pas de variété typographique. Pour un site éditorial/wiki, une deuxième police pour les titres (ex: une serif) donnerait plus de personnalité
- **Taille des badges** : `11px` et `10px` → trop petit pour être confortable, surtout sur mobile

### 3.5 Footer minimaliste
**Fichier :** `Footer.astro`

- Liens GitHub et Twitter pointent vers `https://github.com` et `https://twitter.com` (pages d'accueil, pas de vrais profils)
- Pas de liens vers les pages d'aide, mentions légales, contact
- Pas de lien "Retour en haut"
- Pas d'indication de la date de dernière mise à jour

### 3.6 YouTube embed sur la homepage
L'iframe YouTube charge un player complet (~500KB+ de JavaScript tiers) au-dessus de la ligne de flottaison.

**Recommandation :** Utiliser le pattern "facade" — afficher une image cliquable, ne charger l'iframe qu'au clic.

```html
<!-- Lightweight YouTube facade -->
<div class="video-facade" onclick="this.innerHTML='<iframe src=...>'">
  <img src="https://img.youtube.com/vi/SgJ25zjMJyo/maxresdefault.jpg" alt="Vidéo" />
  <button class="play-btn">▶</button>
</div>
```

---

## 🟢 4. AMÉLIORATIONS À APPORTER

### 4.1 Accessibilité (a11y)

| Élément | Statut | Action |
|---------|--------|--------|
| `lang="fr"` | ✅ | OK |
| `aria-label` sur boutons | ✅ | OK |
| `:focus-visible` | ✅ | OK |
| Skip to content | ❌ | Ajouter un lien caché "Aller au contenu" |
| Contraste light mode | ⚠️ | Vérifier et augmenter |
| Hiérarchie H1-H2-H3 | ⚠️ | Certaines pages ont des sauts de niveau |
| Taille tactile mobile | ⚠️ | Classe `.tap-target` existe mais n'est pas utilisée partout |
| `prefers-reduced-motion` | ❌ | Ajouter pour désactiver les animations |
| Alt text images | ⚠️ | Dépend du contenu Markdown |

### 4.2 Performance

| Élément | Problème | Correction |
|---------|----------|------------|
| Google Fonts | Chargement bloquant depuis fonts.googleapis.com | Self-host les fonts ou utiliser `font-display: optional` |
| SearchModal `client:load` | React chargé sur chaque page | Passer à `client:idle` ou lazy-load |
| Background wallpaper | Image lourde chargée sur chaque page | Optimiser le WebP, ou le supprimer |
| Images R2Image | `<img>` sans `width`/`height` → layout shift | Ajouter dimensions explicites ou `aspect-ratio` |
| Transition sur `*` | Calculs CSS inutiles | Restreindre aux éléments interactifs |
| Pas de lazy-load iframe | YouTube sur homepage | Facade pattern |

### 4.3 SEO manquant

- **Canonical URL** : absente
- **Structured data** (JSON-LD) : absent → ajouter `Article`, `BreadcrumbList`, `WebSite`
- **RSS Feed** : absent pour un site de contenu régulier
- **`<meta name="author">`** : absent
- **Sitemap** : présent via `@astrojs/sitemap` ✅

### 4.4 Mobile / Responsive

| Problème | Détail | Solution |
|----------|--------|----------|
| Sidebar mobile | Menu hamburger avec 150+ liens → scroll interminable | Ajouter une recherche dans le menu mobile, ou réduire aux sections principales |
| TOC FAB | Peut chevaucher le contenu en bas de page | Ajouter un `margin-bottom` au contenu ou positionner au-dessus du footer |
| Grid catégories | 3 → 2 → 1 colonnes | ✅ Bien géré |
| ArticleListItem | Layout adaptatif | ✅ Bien géré |
| Pas de gestes swipe | Pas de swipe pour fermer les drawers | Ajouter des touch events |
| Navbar mobile | Hauteur 52px vs 48px desktop | OK, mais le toggle theme + search + hamburger = 3 boutons serrés |

### 4.5 Contenu manquant

- **Page "Explorer"** : Toutes les cartes mènent vers des pages qui n'existent probablement pas (carte-mentale, chronologie, etc.) → ajouter un badge "Bientôt disponible" et désactiver les liens
- **Page "Vérifier"** : Même problème — les sous-pages (preuves, citations, parallèles...) n'existent probablement pas
- **Pages d'aide** : FAQ, glossaire, à propos, crédits, correction → à vérifier
- **Breadcrumb** : Toujours "Accueil > La théorie > [Article]" même pour les pages qui ne sont pas dans la théorie

---

## 🎯 5. RECOMMANDATIONS PRIORISÉES

### Sprint 1 — Corriger les bugs visibles (1-2 jours)
1. Masquer les composants placeholder quand ils n'ont pas de données
2. Corriger l'URL du site (utiliser `Astro.site`)
3. Supprimer ou marquer les liens morts dans la sidebar
4. Corriger la page 404 (ajouter la navbar)
5. Remplacer les liens factices du footer

### Sprint 2 — Améliorer le parcours utilisateur (2-3 jours)
1. Refondre le hero homepage (CTA clair, texte réduit)
2. Connecter `RelatedArticles` aux articles liés (via `entry.data.related`)
3. Connecter `EvidenceSection` à la collection `evidence`
4. Ajouter un bouton "Retour en haut"
5. Lazy-load YouTube et SearchModal

### Sprint 3 — Polish UI et performance (2-3 jours)
1. Retirer la transition sur `*`
2. Améliorer le light mode
3. Self-host les fonts
4. Ajouter skip-to-content et `prefers-reduced-motion`
5. Ajouter les canonical URLs et le JSON-LD

### Sprint 4 — Fonctionnalités (plus long terme)
1. Navigation clavier dans la recherche
2. Indicateur de progression de lecture
3. RSS feed
4. Fil d'Ariane dynamique
5. Système de favoris / bookmarks côté client

---

## ✅ 6. CE QUI EST BIEN FAIT

Pour équilibrer l'audit, voici les points forts du site :

- **Architecture de contenu** : Collections Astro bien modélisées (articles, chapters, evidence, glossary, characters, locations, objections, predictions, timelines) — schémas Zod propres
- **Système de design** : Variables CSS cohérentes, palette violet/cyan/or distinctive
- **Dark mode** : Bien implémenté avec persistence localStorage et détection système
- **Layout 3 colonnes** : Classique wiki, bien adapté au contenu long
- **Sidebar collapsible** : Bonne idée avec état persisté
- **TOC mobile** : Drawer avec overlay, bonne implémentation
- **Responsive** : Breakpoints cohérents (1200px, 768px, 640px, 480px)
- **Breadcrumbs** : Présents sur les articles
- **Badges de certitude** : Excellent système pour distinguer fait/interprétation/hypothèse
- **Suivi par chapitre** : Système d'effets (renforcement, contradiction...) très pertinent pour un wiki de théorie
- **Pagefind** : Bonne solution de recherche statique
- **Prefetch** activé dans Astro → navigation rapide entre pages

---

*Audit réalisé par analyse statique du code source. Un test utilisateur complémentaire sur le site déployé est recommandé pour valider les problèmes d'interaction et de performance perçue.*

---

## 🛠️ Correctifs appliqués — correctif UI/UX du 22 juillet 2026

Suite à une nouvelle revue complète du code (analyse statique + inspection du HTML généré), les correctifs suivants ont été appliqués :

### Bugs corrigés
- **Modale de recherche cassée** : `<SearchModal />` était rendu *à l'intérieur* de la `<nav>` ; le `backdrop-filter` de la navbar créait un *containing block* pour l'overlay `position: fixed` → le voile sombre ne couvrait que la barre de 56 px au lieu du viewport entier. La modale est désormais rendue **hors de la `<nav>`**.
- **Lien mort en page d'accueil** : `/theorie/luffy-joy-boy` → corrigé vers `/theorie/joy-boy-est-luffy` (vérifié par scan automatique : **0 lien interne mort** sur 195 pages).
- **Ancres masquées sous la navbar sticky** : ajout de `scroll-padding-top` global + `scroll-margin-top` sur les sections de `/dossiers` et du glossaire.
- **Sidebar droite & FAB « Sommaire » affichés vides** sur toutes les pages sans table des matières (accueil, index, aides…) : 240 px de gouttière perdue et un drawer vide. La colonne TOC, le FAB et le drawer ne sont plus rendus que si des `headings` existent.

### Navbar
- **Liens centrés** : la barre passe en grille `1fr auto 1fr` sur desktop (logo à gauche, liens centrés, actions à droite).
- **État actif** : la section courante est mise en évidence (`aria-current`) avec soulignement dégradé, résolue au build.
- **Animations** : apparition fondu de la barre, soulignement animé au survol, micro-glisse des liens de dropdown, glow sur le bouton de recherche.
- Typographies : liens 13.5→14.5 px, dropdown 13→14 px.

### Lisibilité (texte assez grand)
- Corps des articles : 15→**16 px** (line-height 1.8) ; 14→15 px sur mobile.
- Texte hero accueil : 15→16 px.
- Badges 10–11 px → **11.5–12.5 px** partout ; méta 11–12 px → 12–13 px ; footer 11/12 → 12/13 px ; sidebars 13→13.5 px.

### Blocs & cohérence visuelle
- **Hero d'accueil transformé en bloc conteneur** : fond dégradé, bordure arrondie 16 px, ligne dégradée en couronnement, ombre portée.
- `border-radius: 3–4 px` (ancien style) harmonisés vers les tokens (`8 / 12 / 16 px`) sur ~15 pages (listes d'articles, cartes nav, FAQ, glossaire, frise, placeholders, méthodes, guidelines…).
- Suppression des `!important` dans `dossiers/index.astro` (correction de spécificité CSS).
- Icônes des cartes placées dans des pastilles arrondies (blocs) avec glow au survol.

### Animations ajoutées
- Entrée en cascade (stagger 55 ms) des cartes sœurs au scroll (IntersectionObserver), délai nettoyé après révélation pour garder les hovers réactifs.
- Entrée séquencée du hero (badge → titre → vague → texte → CTA → vidéo).
- Levée des cartes (`translateY(-2/-3px)`) + ombre teintée + lueur au survol, glisse horizontale des lignes de liens, rebonds des flèches CTA, états `:active` avec `scale(0.98)`.
- Animation d'ouverture de la modale de recherche (fondu + glissade légère), surlignage `<mark>` des termes stylé aux couleurs du thème.
- Le tout respecte `prefers-reduced-motion` (désactivation globale déjà en place).

### Accessibilité
- `role="dialog"` + `aria-modal` + `aria-label` sur la modale de recherche.
- `aria-current` sur le lien actif de navigation.

### Non traité (dette existante, hors scope de ce correctif)
- ~~`npm run validate` : 33 erreurs préexistantes de taxonomie du contenu~~ → **Corrigé** : la validation (`npm run validate`) passe désormais sans erreur (131 fichiers vérifiés, 0 erreur).
- ~~6 erreurs TS préexistantes dans `Navbar.astro`, `SidebarNav.astro` et `carte-mentale.astro`~~ → **Corrigé** : `npm run check` (astro check) passe sans erreur (0 erreur, 0 warning, 0 hint).
- **Tests** : tous les tests passent (63/63, 4 fichiers).
