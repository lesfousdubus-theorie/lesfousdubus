# État UI/UX — Les Fous du Bus

> Document vivant unique. Les audits historiques (chronologie complète des
> itérations passées) sont archivés dans [`docs/audits/`](./docs/audits/) et
> ne doivent plus être mis à jour — seul ce fichier fait foi sur l'état actuel.

Dernière mise à jour : **12 août 2026**.

## Stack actuelle (vérifiée dans le code, pas supposée)

- Astro 7 + Tailwind 3, **sans React** (recherche = Pagefind + JS vanilla).
- Fonts self-hébergées (`@fontsource/manrope`, `@fontsource/fraunces`, subset latin).
- Design system « Mer & Encre » : tokens dans `src/styles/global.css`, contrastes
  couverts par `tests/contrast.test.ts` (52 tests).
- QA : 8 fichiers `vitest` (99 tests) + Playwright (`e2e/axe.spec.ts`,
  `mobile-nav.spec.ts`, `overlays-clavier.spec.ts`, `timeline.spec.ts`, `smoke.spec.ts`).

## Actions réalisées le 12 août 2026

Suite à l'analyse du [11/08](./docs/audits/2026-08-11-analyse-ui-ux.md), toutes les
optimisations identifiées ont été traitées, **à l'exception volontaire du
système de favoris** (reporté, hors périmètre de cette itération) :

| Optimisation | Détail |
|---|---|
| **`og-default.png` compressé** | 1200×630 PNG de 920 Ko → JPEG qualité 85 de 77 Ko (`og-default.jpg`, -91%). Toutes les références mises à jour (`BaseLayout`, `ArticleLayout`, `index.astro`, `content.config.ts`, chapitres, `generate-og.mjs`). |
| **`favicon.ico` supprimé** | Doublon obsolète du `favicon.svg`/`favicon.png` déjà prioritaires ; non référencé dans le code. |
| **Badge « Réfutée / Contredite » distinct** | Nouvelle classe `meta-badge--alert` (`src/utils/format.ts`, `ArticleMeta.astro`) : couleur `--alert`, texte barré, icône ✕ masquée aux lecteurs d'écran redondants. Ne se confond plus avec une simple hypothèse en sourdine. |
| **Page Prédictions enrichie** | `src/pages/chapitres/[page].astro` (route `/chapitres/predictions`) : badges de statut colorés (en cours / confirmée / réfutée / en attente), filtres cliquables avec compteur, affichage des champs enrichis déjà présents dans le contenu (confiance, indices, source, ce qui réfuterait la piste). Schéma Zod étendu (`src/content.config.ts`) pour exposer ces champs. Lien ajouté dans la navbar (« La théorie » et « Chapitres »), auparavant accessible seulement depuis `/chapitres`. |
| **Décor animé coupé en mode zen** | `BackgroundScene.astro` : le fond et les silhouettes animées (bus/sabliers) disparaissent quand `html.zen-mode` est actif, en plus des sidebars. |
| **Décor animé mis en pause après inactivité** | Nouveau script dans `BackgroundScene.astro` : au bout de 12 s sans scroll/clavier/pointeur (ou onglet caché), les animations décoratives sont mises en pause (`animation-play-state`), pour économiser CPU/GPU pendant une lecture longue sans supprimer l'identité visuelle à l'arrivée sur le site. |
| **Mode zen plus visible + suggéré au bon moment** | Bouton « Mode zen » enrichi d'une icône, et un bandeau contextuel discret (« Lecture longue : le mode zen masque les menus… ») apparaît une fois, après ~35 % de scroll, uniquement sur les articles longs (≥ 10 min estimées), avec bouton d'activation directe et fermeture définitive en `localStorage`. |
| **Carte mentale : pan/pinch tactile + chemin en surbrillance** | `src/pages/explorer/carte-mentale.astro` disposait déjà d'un vrai SVG interactif (zoom, pan souris, nœuds cliquables/focusables) — mais le pan ne fonctionnait qu'à la souris. Passage aux Pointer Events : pan tactile et **pinch-to-zoom à deux doigts** fonctionnent maintenant sur mobile. Ajout d'une mise en surbrillance du chemin causal connecté au survol/focus d'un nœud (les autres liens s'estompent), répondant à l'item « chemin sélectionné mis en surbrillance » du README. |
| **Documentation consolidée** | Les 6 anciens audits (parfois contradictoires ou obsolètes, ex. mention de React) déplacés dans `docs/audits/` avec horodatage. Ce fichier devient l'unique référence sur l'état courant. |

## Ce qui reste hors périmètre (demande explicite)

- **Système de favoris/marque-page** (`localStorage` + bouton ☆ + page dédiée) —
  volontairement non traité dans cette itération.

## Comment vérifier

```bash
npm install
npx astro check      # 0 erreur attendue
npx vitest run        # 99/99 tests attendus
npm run build          # 143+ pages statiques générées
```
