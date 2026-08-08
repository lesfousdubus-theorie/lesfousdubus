#!/usr/bin/env node
/**
 * Génère public/llms.txt et public/llms-full.txt automatiquement depuis les
 * collections de src/content (articles + chapitres).
 *
 * Usage : `node scripts/generate-llms.mjs` (ou `npm run llms`).
 *
 * Le fichier llms.txt donne la structure éditoriale : commencer, fondations,
 * figures, armes, dernières analyses. llms-full.txt liste l'index complet de
 * tous les articles publiés.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');
const CHAPTERS_DIR = join(ROOT, 'src', 'content', 'chapters');
const SITE = 'https://lesfousdubus.sbs';

// Ordre d'affichage des catégories (aligné sur la sidebar).
const CATEGORY_ORDER = [
  'monde-destinations',
  'histoire-temporalite',
  'figures-principales',
  'personnages-identites',
  'armes-antiques',
  'technologies-pouvoirs',
  'peuples-royaumes',
  'dieux-croyances',
  'transmission-memoire',
  'gouvernement-mondial',
  'guerre-finale',
];

const CATEGORY_LABELS = {
  'monde-destinations': 'Monde et destinations',
  'histoire-temporalite': 'Histoire, temps et Ponéglyphes',
  'figures-principales': 'Figures principales',
  'personnages-identites': 'Personnages et identités',
  'armes-antiques': 'Armes antiques',
  'technologies-pouvoirs': 'Technologies et pouvoirs',
  'peuples-royaumes': 'Peuples, royaumes et témoins',
  'dieux-croyances': 'Dieux et croyances',
  'transmission-memoire': 'Transmission et mémoire',
  'gouvernement-mondial': 'Gouvernement mondial',
  'guerre-finale': 'Guerre finale',
};

/** Extrait le bloc frontmatter YAML (entre les deux premières lignes `---`). */
function readFrontmatter(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  return match[1];
}

/** Lecture simple de champs YAML scalaires / tableaux. */
function parseField(frontmatter, key) {
  const re = new RegExp(`^\\s*${key}\\s*:\\s*(.*)$`, 'm');
  const m = frontmatter.match(re);
  if (!m) return undefined;
  let val = m[1].trim();
  if (val.startsWith('[')) {
    // ["a", "b"] ou ["a","b"]
    return val
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  return val.replace(/^["']|["']$/g, '');
}

function loadArticles() {
  const articles = [];
  for (const file of readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.md'))) {
    const fm = readFrontmatter(join(ARTICLES_DIR, file));
    const status = parseField(fm, 'status') || 'draft';
    if (status !== 'published') continue;
    articles.push({
      id: file.replace(/\.md$/, ''),
      title: parseField(fm, 'title') || file.replace(/\.md$/, ''),
      summary: parseField(fm, 'summary') || '',
      category: parseField(fm, 'category') || 'autre',
      order: Number(parseField(fm, 'order') || 0),
      sidebarHidden: parseField(fm, 'sidebarHidden') === 'true',
      editorialStatus: parseField(fm, 'editorialStatus') || '',
      certainty: parseField(fm, 'certainty') || '',
      reviewedUntilChapter: parseField(fm, 'reviewedUntilChapter') || '',
    });
  }
  return articles;
}

function loadChapters() {
  const chapters = [];
  for (const file of readdirSync(CHAPTERS_DIR).filter((f) => f.endsWith('.md'))) {
    const fm = readFrontmatter(join(CHAPTERS_DIR, file));
    chapters.push({
      chapter: Number(parseField(fm, 'chapter')),
      title: parseField(fm, 'title') || '',
      effect: parseField(fm, 'effect') || '',
      summary: parseField(fm, 'summary') || '',
    });
  }
  return chapters.sort((a, b) => b.chapter - a.chapter);
}

const articles = loadArticles();
const chapters = loadChapters();
const published = articles.filter((a) => !a.sidebarHidden);

/** Badge de certitude / statut éditorial pour les métadonnées LLM. */
function metaTag(a) {
  const tags = [];
  if (a.editorialStatus) {
    const map = {
      canon: 'canon',
      'fait-observe': 'fait-observe',
      interpretation: 'interpretation',
      'hypothese-centrale': 'core-theory',
      'hypothese-secondaire': 'secondary-theory',
      'nouvelle-piste': 'speculative',
      contredite: 'contradicted',
      refutee: 'refuted',
    };
    tags.push(map[a.editorialStatus] || a.editorialStatus);
  } else if (a.certainty === 'hypothese') {
    tags.push('speculative');
  }
  return tags.length ? ` [${tags.join(',')}]` : '';
}

function linkLine(a) {
  const title = a.title.replace(/\|/g, '\\|');
  const meta = metaTag(a);
  return `- [${title}](${SITE}/theorie/${a.id}) : ${a.summary}${meta}`;
}

// ---- llms.txt (structure éditoriale) ----------------------------------------
let out = [];
out.push('# Les Fous du Bus\n');
out.push('> Wiki consacré à la théorie One Piece selon laquelle le Siècle oublié serait le présent.');
out.push('Le contenu distingue ce que le manga établit (canon) des hypothèses de la théorie (core-theory, speculative).');
out.push('');

out.push('## Commencer\n');
out.push(`- [Accueil](${SITE}/) : pitch et vidéo d'introduction`);
out.push(`- [Résumé de la théorie](${SITE}/theorie/resume) : l'argument en 10 points`);
out.push(`- [Théorie complète](${SITE}/theorie/theorie-complete) : démonstration continue en 22 chapitres`);
out.push(`- [Glossaire](${SITE}/aide/glossaire) : définitions « Dans le manga / Selon la théorie »`);
out.push('');

const sections = [
  ['Fondations et géographie', ['monde-destinations', 'histoire-temporalite']],
  ['Figures principales et identités', ['figures-principales', 'personnages-identites']],
  ['Armes antiques', ['armes-antiques']],
  ['Technologies et pouvoirs', ['technologies-pouvoirs']],
  ['Peuples, royaumes et témoins', ['peuples-royaumes', 'dieux-croyances', 'transmission-memoire']],
  ['Gouvernement mondial et guerre finale', ['gouvernement-mondial', 'guerre-finale']],
];

for (const [title, cats] of sections) {
  out.push(`## ${title}\n`);
  const list = published
    .filter((a) => cats.includes(a.category))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id, 'fr'));
  for (const a of list) out.push(linkLine(a));
  out.push('');
}

out.push('## Dernières analyses\n');
for (const c of chapters.slice(0, 8)) {
  const effect = c.effect ? ` — ${c.effect.replace(/-/g, ' ')}` : '';
  out.push(`- [Chapitre ${c.chapter} : ${c.title}](${SITE}/chapitres/${c.chapter})${effect}`);
}
out.push(`- [Tous les chapitres](${SITE}/chapitres) : index complet`);
out.push('');

out.push('---');
out.push('Site : ' + SITE + ' — One Piece © Eiichiro Oda / Shueisha / Toei Animation. Projet fan-made.');
out.push('');

writeFileSync(join(ROOT, 'public', 'llms.txt'), out.join('\n'), 'utf8');

// ---- llms-full.txt (index complet) ------------------------------------------
let full = [];
full.push('# Les Fous du Bus — Index complet\n');
full.push('> Index généré automatiquement de tous les articles publiés.');
full.push('Les balises entre crochets indiquent la nature : canon, fait-observe, interpretation, core-theory, secondary-theory, speculative.');
full.push('');

const byCategory = new Map();
for (const a of published) {
  if (!byCategory.has(a.category)) byCategory.set(a.category, []);
  byCategory.get(a.category).push(a);
}
for (const cat of CATEGORY_ORDER) {
  const list = (byCategory.get(cat) || []).sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id, 'fr'),
  );
  if (!list.length) continue;
  full.push(`## ${CATEGORY_LABELS[cat] || cat}\n`);
  for (const a of list) full.push(linkLine(a));
  full.push('');
}

full.push('## Dernières analyses\n');
for (const c of chapters) {
  const effect = c.effect ? ` — ${c.effect.replace(/-/g, ' ')}` : '';
  full.push(`- [Chapitre ${c.chapter} : ${c.title}](${SITE}/chapitres/${c.chapter})${effect}`);
}
full.push('');

writeFileSync(join(ROOT, 'public', 'llms-full.txt'), full.join('\n'), 'utf8');

console.log(`[llms] ${published.length} articles → public/llms.txt + public/llms-full.txt`);
