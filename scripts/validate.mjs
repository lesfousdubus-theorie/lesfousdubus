#!/usr/bin/env node
/**
 * Validation du contenu et des liens internes.
 *
 * Vérifie, pour chaque collection de `src/content` :
 *  - les champs obligatoires ;
 *  - la validité des énumérations (catégorie, certitude, effet, type, etc.) ;
 *  - l'absence de références vers des articles inexistants (`related`, `articles`, `updatedArticles`...) ;
 *  - l'absence de liens internes cassés dans le corps Markdown.
 *
 * Usage : `node scripts/validate.mjs` (ou `npm run validate`).
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const CONTENT_DIR = join(process.cwd(), 'src', 'content');
const PUBLIC_DIR = join(process.cwd(), 'public');

const CATEGORIES = [
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

const ENUMS = {
  'articles.category': CATEGORIES,
  'articles.certainty': ['central', 'elevee', 'moyenne', 'hypothese'],
  'articles.status': ['draft', 'published'],
  // Doit rester aligné sur le schéma `chapters` de src/content.config.ts.
  'chapters.effect': ['fondation', 'approfondissement', 'nouvelle-piste', 'modification', 'piste-abandonnee'],
  'characters.era': ['ancien', 'moderne', 'transversal'],
  'predictions.status': ['en-cours', 'confirmee', 'refutee', 'en-attente'],
  'timelines.period': ['siecle-oublie', 'present', 'futur', 'boucle'],
};

const SCHEMA = {
  articles: { required: ['title', 'summary', 'category'], refArrays: ['related'] },
  chapters: { required: ['chapter', 'title', 'effect'], refArrays: ['updatedArticles'] },
  glossary: { required: ['term', 'definition'], refArrays: ['relatedArticles'] },
  characters: { required: ['name', 'summary'], refArrays: ['articles'] },
  locations: { required: ['name', 'summary'], refArrays: ['articles'] },
  predictions: { required: ['title', 'statement'], refArrays: ['articles'] },
  timelines: { required: ['title', 'summary'], refArrays: ['articles'] },
};

const KNOWN_PAGES = new Set([
  '/',
  '/theorie',
  '/theorie/chronologie',
  '/explorer',
  '/explorer/frises',
  '/explorer/carte',
  '/explorer/personnages',
  '/explorer/schemas',
  '/explorer/elbaf',
  '/explorer/globe',
  '/explorer/correspondances',
  '/explorer/poneglyphes',
  '/evolution',
  '/evolution/chapitres',
  '/evolution/previsions',
  '/evolution/historique',
  '/evolution/abandonnees',
  '/dossiers',
  '/chapitres',
  '/chapitres/derniere-analyse',
  '/chapitres/toutes-les-analyses',
  '/chapitres/predictions',
  '/chapitres/modifications',
  '/theorie/resume',
  '/theorie/theorie-complete',
  '/explorer/carte-mentale',
  '/aide',
  '/aide/faq',
  '/aide/glossaire',
  '/aide/a-propos',
  '/aide/credits',
  '/aide/correction',
  '/aide/index',
  '/404',
]);

// Découvre automatiquement les pages .astro de src/pages (routes statiques) pour
// éviter de maintenir à la main la liste des pages d'Explorer et autres pages.
function discoverStaticPages(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...discoverStaticPages(full));
    } else if (/\.astro$/.test(entry)) {
      const rel = relative(join(process.cwd(), 'src', 'pages'), full).replace(/\\/g, '/');
      // Ignore les routes dynamiques ([...] et [param]) : elles sont validées autrement.
      if (/\[/.test(rel)) continue;
      let route = '/' + rel.replace(/\.astro$/, '');
      if (route === '/index') route = '/';
      out.push(route);
    }
  }
  return out;
}

// Ajoute toutes les pages statiques découvertes aux pages connues.
for (const route of discoverStaticPages(join(process.cwd(), 'src', 'pages'))) {
  KNOWN_PAGES.add(route);
}

const errors = [];
const articleIds = [];

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(md|mdx)$/.test(entry)) out.push(full);
  }
  return out;
}

function parseFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines[0].trim() !== '---') return null;
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) return null;
  const fm = lines.slice(1, end).join('\n');
  const body = lines.slice(end + 1).join('\n');
  const data = {};
  const lineRe = /^([A-Za-z0-9_-]+):\s*(.*)$/;
  for (const line of fm.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(lineRe);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (/^\[.*\]$/.test(val)) {
      const inner = val.slice(1, -1).trim();
      data[key] = inner
        ? inner
            .split(',')
            .map((s) => s.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean)
        : [];
    } else {
      data[key] = val;
    }
  }
  return { data, body };
}

const files = walk(CONTENT_DIR);

// First pass : collect article ids for reference checks.
for (const file of files) {
  const rel = relative(CONTENT_DIR, file);
  const parts = rel.split(sep);
  const collection = parts[0];
  if (collection === 'articles') {
    const id = parts[parts.length - 1].replace(/\.(md|mdx)$/, '');
    articleIds.push(id);
  }
}

// Second pass : validate.
for (const file of files) {
  const rel = relative(CONTENT_DIR, file).split(sep).join('/');
  const collection = rel.split('/')[0];
  const raw = readFileSync(file, 'utf8');
  const parsed = parseFrontmatter(raw);
  if (!parsed) {
    errors.push(`${rel} : frontmatter introuvable ou mal formé.`);
    continue;
  }
  const { data, body } = parsed;
  const schema = SCHEMA[collection];
  if (schema) {
    if (collection === 'articles' && data.lastUpdatedChapter !== undefined) {
      errors.push(
        `${rel} : champ obsolète "lastUpdatedChapter". Utiliser "reviewedUntilChapter" pour la relecture globale, ou "updatedArticles" dans une fiche chapitre pour une vraie mise à jour.`,
      );
    }

    for (const field of schema.required) {
      if (data[field] === undefined || data[field] === '') {
        errors.push(`${rel} : champ obligatoire manquant : "${field}".`);
      }
    }
    for (const [path, allowed] of Object.entries(ENUMS)) {
      const [col, field] = path.split('.');
      if (col !== collection) continue;
      const value = data[field];
      if (value !== undefined && value !== '' && !allowed.includes(value)) {
        errors.push(`${rel} : "${field}"="${value}" invalide (attendu : ${allowed.join(', ')}).`);
      }
    }
    for (const arrField of schema.refArrays) {
      const refs = Array.isArray(data[arrField]) ? data[arrField] : [];
      for (const ref of refs) {
        if (!articleIds.includes(ref)) {
          errors.push(`${rel} : référence "${arrField}" -> article inexistant : "${ref}".`);
        }
      }
    }
  }

  // Internal link check (body).
  const linkRe = /\[[^\]]*\]\((\/[^)\s]+)\)/g;
  let match;
  while ((match = linkRe.exec(body)) !== null) {
    let path = match[1];
    path = path.replace(/[?#].*$/, '').replace(/\/$/, '') || '/';
    // `/theorie/<slug>` et `/chapitres/<n>` sont générés dynamiquement : on valide
    // le slug contre la collection plutôt que contre la liste statique.
    const articleLink = path.match(/^\/theorie\/([a-z0-9-]+)$/);
    if (articleLink) {
      if (!articleIds.includes(articleLink[1])) {
        errors.push(`${rel} : lien interne vers un article inexistant : "${match[1]}".`);
      }
      continue;
    }
    if (/^\/chapitres\/\d+$/.test(path)) continue;
    // Astro exposes files from `public/` at the site root. Validate these paths
    // against the filesystem instead of maintaining a brittle route list.
    const publicFile = join(PUBLIC_DIR, path.replace(/^\/+/, ''));
    if (existsSync(publicFile) && statSync(publicFile).isFile()) continue;
    if (!KNOWN_PAGES.has(path)) {
      errors.push(`${rel} : lien interne cassé vers "${match[1]}".`);
    }
  }
}

// --- Cohérence de la navigation latérale -----------------------------------
// La sidebar est construite à partir de `category` / `order` / `parent`.
// Deux articles publiés partageant le même couple (catégorie, order) rendaient
// l'ordre d'affichage ambigu : on l'interdit pour garantir une sidebar
// strictement identique sur toutes les pages.
{
  const seen = new Map();
  for (const file of files) {
    const rel = relative(CONTENT_DIR, file).split(sep).join('/');
    if (!rel.startsWith('articles/')) continue;
    const parsed = parseFrontmatter(readFileSync(file, 'utf8'));
    if (!parsed) continue;
    const { data } = parsed;
    if (data.status !== 'published') continue;
    const id = rel.replace(/^articles\//, '').replace(/\.(md|mdx)$/, '');

    if (data.parent) {
      if (!articleIds.includes(data.parent)) {
        errors.push(`${rel} : "parent" -> fiche inexistante : "${data.parent}".`);
      } else if (data.parent === id) {
        errors.push(`${rel} : "parent" ne peut pas pointer vers l'article lui-même.`);
      }
    }

    const key = `${data.category}#${data.order}`;
    if (seen.has(key)) {
      errors.push(
        `${rel} : "order"=${data.order} déjà utilisé par "${seen.get(key)}" dans la catégorie ` +
          `"${data.category}" (ordre de sidebar ambigu).`,
      );
    } else {
      seen.set(key, rel);
    }
  }
}

if (errors.length > 0) {
  console.error(`\n❌ Validation du contenu : ${errors.length} erreur(s)\n`);
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
} else {
  console.log(`\n✅ Validation du contenu : ${files.length} fichier(s) vérifié(s), aucune erreur.`);
}
