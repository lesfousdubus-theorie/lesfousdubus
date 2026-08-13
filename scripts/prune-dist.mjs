#!/usr/bin/env node

/**
 * Retire de `dist/` des fichiers qu'Astro copie mais que le site ne sert jamais.
 * À lancer après `astro build`, avant le déploiement.
 *
 * 1. Bundles d'interface Pagefind. Le site a sa propre UI de recherche
 *    (`SearchModal.astro`), qui importe uniquement `/pagefind/pagefind.js`.
 *    Les UI livrées par défaut (~346 KB) ne sont référencées nulle part.
 *
 * 2. Polices `.woff`. @fontsource déclare `woff2` puis `woff` en repli dans ses
 *    `@font-face` ; or woff2 est supporté par tous les navigateurs depuis 2016.
 *    On réécrit le CSS émis pour retirer le repli AVANT de supprimer les
 *    fichiers, sinon on laisserait des URL mortes dans la feuille de style.
 */

import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');

const PAGEFIND_UNUSED = [
  'pagefind-ui.js',
  'pagefind-ui.css',
  'pagefind-modular-ui.js',
  'pagefind-modular-ui.css',
  'pagefind-highlight.js',
  'pagefind-component-ui.js',
  'pagefind-component-ui.css',
];

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

let removed = 0;
let freed = 0;

// 1. UI Pagefind inutilisées.
for (const name of PAGEFIND_UNUSED) {
  const path = join(DIST, 'pagefind', name);
  try {
    freed += statSync(path).size;
    unlinkSync(path);
    removed++;
  } catch {
    /* absent selon la version de pagefind : rien à faire */
  }
}

// 2a. Retire le repli woff des @font-face du CSS émis.
let rewritten = 0;
for (const file of walk(join(DIST, '_astro')).filter((f) => f.endsWith('.css'))) {
  const css = readFileSync(file, 'utf8');
  // ", url(...woff) format('woff')" -> "" (on garde le woff2 qui précède)
  const next = css.replace(/,\s*url\([^)]*\.woff\)\s*format\((['"])woff\1\)/g, '');
  if (next !== css) {
    writeFileSync(file, next);
    rewritten++;
  }
}

// 2b. Puis supprime les fichiers eux-mêmes, désormais orphelins.
for (const file of walk(DIST).filter((f) => f.endsWith('.woff'))) {
  freed += statSync(file).size;
  unlinkSync(file);
  removed++;
}

console.log(
  `[prune-dist] ${removed} fichier(s) retiré(s), ${kb(freed)} libéré(s)` +
    `${rewritten ? `, ${rewritten} CSS réécrit(s)` : ''}`,
);
