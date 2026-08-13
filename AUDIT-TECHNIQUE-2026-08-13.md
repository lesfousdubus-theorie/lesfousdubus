# Audit technique du site — 13 août 2026

Analyse portant sur la performance, le SEO technique, la sécurité et la dette de
code. Le contenu éditorial est traité séparément dans `AUDIT-THEORIE-2026-08-13.md`.

Mesures prises sur un build de production réel (`npx astro build --force`) :
147 pages en 6,0 s, `dist/` = 23 Mo.

---

## Déjà corrigé (commit `76da896`)

| Correctif | Détail |
| --- | --- |
| Titres SEO dupliqués | `chapters/1184.md`, `1186.md`, `1187.md` préfixaient leur `title` par « Chapitre NNNN — » alors que `src/pages/chapitres/[chapter].astro` l.26 l'ajoute déjà. `/chapitres/1186` affichait un `<title>` de **132 caractères** contenant deux fois « Chapitre 1186 ». Ramené à 116. Correctif porté sur les frontmatters, pas sur le gabarit, qui réutilise la valeur en `headline` JSON-LD et en `<h1>`. |
| Vulnérabilité HIGH | `nanoid` 3.3.11 → 3.3.18 (GHSA-2v37-7h3g-55p8, boucle infinie sur `size=0`), présente en dépendance **de production**. `npm audit --omit=dev` : 0 vulnérabilité. |

Non-régression : 100 tests verts, `validate.mjs` 120 fichiers sans erreur,
`astro check` 0 erreur / 0 warning sur 93 fichiers.

---

## Priorité 1 — Impact réel, effort faible

### 1. `og-default.png` pèse 898 KB

Le plus gros fichier du site, et il est référencé en `og:image` par **toutes** les
pages. 1200×630 en PNG là où le format n'apporte rien (pas de transparence utile).
Converti en JPEG qualité 85 ou WebP, on tombe autour de 40–60 KB, soit **~95 % de
gain**. `icon-512.png` (217 KB) mérite le même traitement.

Point d'attention : `scripts/generate-og.mjs` l.23 note explicitement qu'il
n'écrase pas `og-default.png` (image de marque originale). La recompression doit
donc se faire sur le fichier source dans `public/`, sans passer par le script.

### 2. Aucun fichier `_headers`

Le site est déployé sur Cloudflare Pages mais ne définit **aucun en-tête de cache**.
Les assets de `_astro/` sont fingerprintés (hash dans le nom) : ils peuvent être
mis en cache un an sans risque. Un `public/_headers` de quelques lignes suffit :

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/*.html
  Cache-Control: public, max-age=0, must-revalidate
```

C'est probablement le meilleur rapport gain/effort de tout cet audit pour les
visites répétées. On peut y ajouter les en-têtes de sécurité usuels
(`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`).

### 3. 346 KB de Pagefind livrés pour rien

`dist/pagefind/` contient `pagefind-component-ui.js` (171 KB),
`pagefind-ui.js` (117 KB), `pagefind-highlight.js` (43 KB) et
`pagefind-modular-ui.js` (14 KB). Or `SearchModal.astro` l.137 importe uniquement
`/pagefind/pagefind.js` : l'UI est maison. Vérifié par `grep` — **aucune référence
à `pagefind-ui` ou `pagefind-component` dans `src/`**.

Ces fichiers ne sont pas téléchargés par les visiteurs (rien ne les référence),
donc l'impact sur le Lighthouse est nul ; c'est du poids de déploiement et de
stockage. À supprimer en post-build si `astro-pagefind` ne l'expose pas en option.

### 4. Polices servies en double format

8 fichiers `woff2` **et** 8 `woff` (155 KB de legacy). Le `woff2` est supporté par
tous les navigateurs depuis 2016, y compris Safari 10+. Les `woff` peuvent partir.

---

## Priorité 2 — Structurel, à arbitrer

### 5. Aucune intégration continue

`.github/workflows/` n'existe pas. Rien ne garantit que les 100 tests, `validate.mjs`
et `astro check` tournent avant un déploiement. Un workflow d'une vingtaine de
lignes sur `pull_request` fermerait le risque.

Sous-problème : le script `build` du `package.json` enchaîne `generate-llms`,
`generate-og`, `astro build`, `copy-sitemap` et `validate-seo` — mais **pas
`validate.mjs`**. La validation de contenu (liens morts, graphies Glénat,
cohérence des frontmatters) n'est donc jamais exécutée au déploiement, alors
qu'elle existe et qu'elle fonctionne.

### 6. La sidebar est réinjectée entière dans chaque page

Mesure sur `/theorie/luffy/` : le `<nav>` fait **34,3 KB sur 103,1 KB**, soit
**33 % du poids de chaque page HTML**, pour 113 liens. Multiplié par 147 pages,
c'est ~5 Mo de markup répété. C'est le mécanisme normal d'un site statique, et le
gzip/brotli de Cloudflare l'absorbe très bien (la redondance se compresse
remarquablement), donc **je ne recommande pas de refonte** : le signaler surtout
pour expliquer pourquoi `/theorie/chronologie/` atteint 291 KB (275 KB de markup
pur, 12 KB de script seulement).

Si le sujet devient gênant, la piste est le rendu de la sidebar côté client à
partir d'un JSON unique mis en cache — au prix de la navigation sans JS et d'un
risque SEO sur le maillage interne. Mauvais échange à mon avis.

### 7. 54 `<title>` encore trop longs

Après le correctif, le gabarit lui-même reste verbeux :
`Chapitre 1186 de One Piece — Les Fruits du Démon et l'histoire des géants : analyse et théorie | Les Fous du Bus`.
Le segment « : analyse et théorie » ajoute 20 caractères à chaque page chapitre.
Google tronque autour de 60–65 caractères ; au-delà, la fin est simplement
invisible en SERP. Suggestion : `Chapitre 1186 — <titre> | Les Fous du Bus`.

Symétriquement, 10 titres font moins de 25 caractères (`/theorie/brook`,
`dozan`, `gunko`, `kaido`… au format « Nom | Les Fous du Bus »), ce qui gâche de
l'espace de description en SERP.

### 8. Dépendances en retard

Mineures, sûres : `astro` 7.1.3 → 7.2.1, `@playwright/test` 1.49 → 1.62.1,
`prettier` 3.4.2 → 3.9.6, `wrangler` 4.0 → 4.123.

Majeures, à ne pas faire à la légère : `tailwindcss` 3.4 → 4.3 (refonte de la
config), `typescript` 5.7 → 7.0, `vitest` 3 → 4, `@types/node` 22 → 26.

Un avertissement de dépréciation apparaît déjà au build : `markdown.rehypePlugins`
doit passer par `unified({...})` de `@astrojs/markdown-remark`. Concerne
`rehype-image-dimensions.mjs`, à traiter avant la montée de version majeure d'Astro.

---

## Ce qui est sain — à ne pas « corriger »

Ces points ont été vérifiés et ne demandent aucune action :

- **Pas de CLS sur les images** : le plugin `rehype-image-dimensions` injecte
  `width`/`height` sur les 83 images Markdown, avec `loading="lazy"` et
  `decoding="async"`.
- **SEO de base complet** : 0 page sans meta description, sans canonical ou sans
  `og:image`. JSON-LD sur 145/145 pages (Article, BreadcrumbList, WebPage, WebSite,
  Organization, ImageObject). Sitemap à 145 URLs, `trailingSlash: 'always'`
  cohérent avec les canoniques.
- **Structure de titres correcte** : 0 page sans `h1`, 0 page à `h1` multiples.
- **Accessibilité de base** : 0 `<img>` sans `alt`, `<html lang="fr">` correct,
  0 `target="_blank"` sans `noopener`. Une suite Playwright avec axe existe déjà
  (`e2e/axe.spec.ts`, plus mobile-nav, overlays-clavier, smoke, timeline).
- **Images de contenu** : une seule dépasse 200 KB
  (`barbe-noire-davy-jones/img_4.webp`, 220 KB) ; `public/images` = 5,3 Mo, ce qui
  est raisonnable pour 84 WebP.
- **Typage** : `astro check` ne remonte rien sur 93 fichiers.

---

## Non vérifiable dans cet environnement

Le sandbox n'a pas accès au réseau public (allowlist limitée à GitHub et au
registre npm) et Lighthouse n'est pas installé. N'ont donc **pas** pu être mesurés,
et resteraient à contrôler depuis un poste connecté :

- Core Web Vitals réels (LCP, INP, CLS) sur le site en production.
- Contraste des couleurs et parcours clavier réels — l'audit axe existe en e2e
  mais n'a pas été exécuté ici.
- Comportement effectif du cache Cloudflare et compression brotli.

---

## Ordre d'exécution suggéré

1. `_headers` (5 min, gain immédiat sur les visites répétées)
2. Recompression `og-default.png` + `icon-512.png` (10 min, −1 Mo)
3. Suppression des `woff` et des bundles Pagefind inutilisés (10 min, −500 KB)
4. Ajout de `validate.mjs` au script `build` (1 min, ferme un vrai trou)
5. Workflow GitHub Actions (30 min)
6. Raccourcissement du gabarit de titre des chapitres (15 min)
7. Montées de version mineures (30 min, à tester)

Les points 1 à 4 sont sans risque et peuvent être appliqués immédiatement sur
votre accord.
