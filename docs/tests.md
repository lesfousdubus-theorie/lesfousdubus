# Vérifications du projet

Les commandes ci-dessous sont manuelles et rapides ; aucun workflow GitHub n’est versionné.

## Commandes principales

```bash
npm run lint
npm run typecheck
npm test
npm run build:next
```

- `npm run lint` : vérification ESLint / React Compiler sur tout le dépôt.
- `npm run typecheck` : vérification des types TypeScript (`tsc --noEmit`).
- `npm test` : suite unitaire et d’intégration rapide (environ 10 s) couvrant :
  - `test-local-setup.mjs` : génération idempotente des secrets dans `.dev.vars` (fichier temporaire isolé).
  - `test-bus-audio.mjs` : machine à états audio, priorités (théorie, fête, TV, musique) et événements inter-racines.
  - `test-bus-shortcuts.mjs` : raccourcis clavier et liens de signalement.
  - `test-tv-layout.mjs` : placement et index actif des écrans TV selon le nombre de rangées.
  - `test-bus-occupancy.mjs` : allocation des sièges, places vacantes, rangées et colonnes latérales.
  - `test-server-security.mjs` (+ `test-server-authorization.mjs`) : nettoyage texte, normalisation IP, modération et intégration complète de `/api/bus-entries` et `/api/health` dans Miniflare (`workerd` + bases D1 temporaires isolées).
  - `npm run test:seo` : synchronisation `llms.txt` / `llms-full.txt` (`content:check`), JSON-LD, sitemap et redirections HTTP -> HTTPS du point d’entrée Worker.
- `npm run build:next` : compilation Next.js de production (`npm run build` assemble en plus l’adaptateur Cloudflare sans déployer).

## Référencement en ligne

```bash
# Après compilation, sur le serveur local :
BASE_URL=http://localhost:3000 npm run test:seo
# Vérification publique en lecture seule après déploiement :
BASE_URL=https://lesfousdubus.sbs npm run test:seo
```

Définir `SEO_REPORT` pour enregistrer le rapport JSON. Le [guide SEO](seo.md) précise le périmètre et Search Console.

## Compléments manuels

Le [protocole mobile](validation-mobile.md) décrit la vérification sur appareil réel.
