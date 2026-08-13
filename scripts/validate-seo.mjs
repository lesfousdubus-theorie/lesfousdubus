#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const SITE = 'https://lesfousdubus.sbs';
const errors = [];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function routeFor(file) {
  const rel = relative(DIST, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

if (!existsSync(DIST)) {
  console.error('❌ Validation SEO : le dossier dist/ est absent. Lancez d’abord le build.');
  process.exit(1);
}

const sitemapPath = join(DIST, 'sitemap-0.xml');
if (!existsSync(sitemapPath)) {
  errors.push('sitemap-0.xml est absent.');
}

const sitemap = existsSync(sitemapPath) ? readFileSync(sitemapPath, 'utf8') : '';
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
const htmlFiles = walk(DIST).filter((file) => file.endsWith('.html'));
let indexablePages = 0;

for (const file of htmlFiles) {
  const route = routeFor(file);
  if (route === '/404.html' || route === '/500.html') continue;

  const html = readFileSync(file, 'utf8');
  const rel = relative(DIST, file).split(sep).join('/');
  const robots = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i)?.[1] ?? '';
  const canonicals = [...html.matchAll(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/gi)];

  if (/\bnoindex\b/i.test(robots)) {
    errors.push(`${rel} contient noindex.`);
    continue;
  }
  if (!/\bindex\b/i.test(robots) || !/\bfollow\b/i.test(robots)) {
    errors.push(`${rel} doit déclarer index, follow.`);
  }

  indexablePages += 1;
  const expectedCanonical = `${SITE}${route}`;
  if (canonicals.length !== 1) {
    errors.push(
      `${rel} doit contenir exactement une URL canonique (trouvé : ${canonicals.length}).`,
    );
  } else if (canonicals[0][1] !== expectedCanonical) {
    errors.push(`${rel} : canonique ${canonicals[0][1]} au lieu de ${expectedCanonical}.`);
  }

  if (!sitemapUrls.has(expectedCanonical)) {
    errors.push(`${rel} est indexable mais absent du sitemap.`);
  }
}

for (const url of sitemapUrls) {
  const route = new URL(url).pathname;
  const output = route === '/' ? join(DIST, 'index.html') : join(DIST, route, 'index.html');
  if (!existsSync(output))
    errors.push(`${url} est présent dans le sitemap sans page HTML correspondante.`);
}

const redirectsPath = join(DIST, '_redirects');
if (!existsSync(redirectsPath)) {
  errors.push('_redirects est absent du build final.');
} else {
  const lines = readFileSync(redirectsPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  const sources = new Set();
  for (const line of lines) {
    const [source, destination, status] = line.split(/\s+/);
    if (!source || !destination || status !== '301') {
      errors.push(`Redirection invalide : ${line}`);
    }

    // Les redirections d'assets (og-default.png -> .jpg, etc.) ne visent pas une
    // page : ni le slash final ni la présence au sitemap ne les concernent.
    const isAssetRedirect = /\.[a-z0-9]{2,4}$/i.test(destination);
    if (isAssetRedirect) {
      if (sources.has(source)) errors.push(`Source de redirection dupliquée : ${source}`);
      sources.add(source);
      if (!existsSync(join(DIST, destination.replace(/^\//, '')))) {
        errors.push(`Cible de redirection absente de dist/ : ${line}`);
      }
      continue;
    }
    if (destination !== '/' && !destination.endsWith('/')) {
      errors.push(`La destination doit utiliser le slash final : ${line}`);
    }
    if (sources.has(source)) errors.push(`Source de redirection dupliquée : ${source}`);
    sources.add(source);

    if (!source.includes('*')) {
      const sourceCanonical = `${SITE}${source.endsWith('/') ? source : `${source}/`}`;
      if (sitemapUrls.has(sourceCanonical)) {
        errors.push(`${source} redirige mais figure encore dans le sitemap.`);
      }
    }
    if (!destination.includes(':')) {
      const destinationCanonical = `${SITE}${destination}`;
      if (!sitemapUrls.has(destinationCanonical)) {
        errors.push(`Destination absente du sitemap : ${line}`);
      }
    }
  }
}

// --- Longueur des <title> ---------------------------------------------------
// Google tronque autour de 60-65 caractères, et un titre trop court gâche de
// l'espace en SERP. 24 pages dépassent encore le seuil (titres de chapitres
// longs, essentiellement) : on n'échoue donc pas dessus, mais on interdit toute
// régression au-delà du niveau atteint le 13/08/2026.
const TITLE_MAX = 65;
const TITLE_MIN = 25;
const TITLE_LONG_BUDGET = 24;

const titleIssues = { long: [], short: [] };
for (const file of walk(DIST).filter((f) => f.endsWith('.html'))) {
  const match = readFileSync(file, 'utf8').match(/<title>([\s\S]*?)<\/title>/);
  if (!match) continue;
  const title = match[1].replace(/&#39;/g, "'").trim();
  const route = routeFor(file);
  if (title.length > TITLE_MAX) titleIssues.long.push({ route, len: title.length });
  else if (title.length < TITLE_MIN) titleIssues.short.push({ route, len: title.length });
}

if (titleIssues.short.length) {
  errors.push(
    `${titleIssues.short.length} <title> sous ${TITLE_MIN} caractères : ` +
      titleIssues.short.map((t) => `${t.route} (${t.len})`).join(', '),
  );
}
if (titleIssues.long.length > TITLE_LONG_BUDGET) {
  errors.push(
    `${titleIssues.long.length} <title> dépassent ${TITLE_MAX} caractères, ` +
      `au-delà du budget de ${TITLE_LONG_BUDGET}. Raccourcir le seoTitle des pages ajoutées.`,
  );
} else if (titleIssues.long.length) {
  console.warn(
    `\n⚠️  ${titleIssues.long.length}/${TITLE_LONG_BUDGET} <title> encore au-dessus de ${TITLE_MAX} caractères.`,
  );
}

if (errors.length) {
  console.error(`\n❌ Validation SEO : ${errors.length} erreur(s)\n`);
  for (const error of errors) console.error(`  • ${error}`);
  process.exit(1);
}

console.log(
  `\n✅ Validation SEO : ${indexablePages} pages indexables, canoniques et sitemap cohérents.`,
);
