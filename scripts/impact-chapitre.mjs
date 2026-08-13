#!/usr/bin/env node

/**
 * À la sortie d'un chapitre, dit quels articles devraient être relus.
 *
 * Le problème qu'il résout : les fiches de `src/content/chapters/` sont bien
 * tenues à jour, mais rien ne pousse leur contenu vers les articles concernés.
 * Résultat observé le 13/08/2026 : les révélations des chapitres 1189 et 1190
 * n'existaient que dans 2 articles sur 105, alors que trois fiches affichaient
 * `reviewedUntilChapter: 1190`.
 *
 * Usage :
 *   node scripts/impact-chapitre.mjs 1191
 *   node scripts/impact-chapitre.mjs            (dernier chapitre connu)
 *
 * Le script ne modifie rien : il imprime une liste de relecture.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CHAPTERS = join(ROOT, 'src/content/chapters');
const ARTICLES = join(ROOT, 'src/content/articles');

// Mots vides : trop fréquents pour signaler quoi que ce soit.
const STOP = new Set(
  `le la les un une des du de d au aux et ou ni mais donc or car que qui quoi dont
   ce cet cette ces son sa ses leur leurs il elle ils elles on nous vous se sy
   dans sur sous par pour avec sans vers chez entre depuis pendant avant apres
   plus moins tres tout tous toute toutes meme aussi alors ainsi comme quand
   est sont etre eté a ont avoir fait faire dit dire peut pouvoir doit devoir
   pas ne non oui si en y la lui eux cela ceci celui celle chapitre chapitres
   one piece theorie fous bus page article
   trop fois personne plusieurs tranche explicitement admet arrives bras
   limites presentation points lecture selon encore deja jamais toujours
   autre autres nouvelle nouveau grand grande petit petite premier premiere
   dernier derniere propre meme sans avec contre apres avant pendant
   histoire monde mondial siecle oublie manga recit lecteur figure sens
   maniere facon cote fond forme partie moment temps vrai vraie`
    .split(/\s+/)
    .filter(Boolean),
);

function norm(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function frontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  return m ? { head: m[1], body: m[2] } : { head: '', body: raw };
}

function termsOf(text) {
  // On cherche les noms propres et termes techniques. Deux sources fiables :
  // le gras (mise en avant éditoriale) et les majuscules EN MILIEU de phrase.
  // Un mot capitalisé en début de phrase n'est pas un indice : « Trop »,
  // « Personne », « Plusieurs » polluaient les résultats.
  const out = new Set();
  const push = (raw) => {
    for (const w of raw.split(/[\s,.;:!?()«»"'’]+/)) {
      const n = norm(w).replace(/[^a-z0-9-]/g, '');
      if (n.length >= 4 && !STOP.has(n)) out.add(n);
    }
  };
  for (const m of text.matchAll(/\*\*(.+?)\*\*/g)) push(m[1]);
  // (?<![.!?:»\n]\s) : on écarte les débuts de phrase et de ligne.
  for (const m of text.matchAll(/(?<=[a-zà-ÿ,;)]\s)([A-ZÉÈÀÎÔÛ][\wÀ-ÿ'-]{3,})/g)) push(m[1]);
  return out;
}

const chapterFiles = readdirSync(CHAPTERS).filter((f) => f.endsWith('.md'));
const known = chapterFiles.map((f) => Number(f.replace('.md', ''))).sort((a, b) => a - b);
const target = Number(process.argv[2]) || known[known.length - 1];

const chapterPath = join(CHAPTERS, `${target}.md`);
let chapterRaw;
try {
  chapterRaw = readFileSync(chapterPath, 'utf8');
} catch {
  console.error(`Chapitre ${target} introuvable. Connus : ${known.join(', ')}`);
  process.exit(1);
}

const { head: chHead, body: chBody } = frontmatter(chapterRaw);
const chTitle = (chHead.match(/^title:\s*"?(.*?)"?\s*$/m) || [, ''])[1];
const chapterTerms = termsOf(chBody);

// Pondération par rareté : un terme présent dans presque tous les articles
// (« Luffy », « Ponéglyphes », « limites ») ne discrimine rien. On ne retient
// que les termes rares, qui signalent un vrai recoupement de sujet.
const articleFiles = readdirSync(ARTICLES).filter((f) => f.endsWith('.md'));
const parsed = new Map();
const docFreq = new Map();
for (const file of articleFiles) {
  const raw = readFileSync(join(ARTICLES, file), 'utf8');
  const fm = frontmatter(raw);
  const terms = termsOf(fm.body);
  parsed.set(file, { ...fm, terms });
  for (const t of terms) docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
}
const TOTAL = articleFiles.length;
// Un terme porteur apparaît dans au plus 15 % du corpus.
const isRare = (t) => (docFreq.get(t) ?? 0) <= TOTAL * 0.15;
const rareChapterTerms = [...chapterTerms].filter(isRare);

const rows = [];
for (const file of articleFiles) {
  const { head, body, terms } = parsed.get(file);
  const slug = file.replace(/\.md$/, '');
  const sources = (head.match(/^sources:\s*\[(.*?)\]/m) || [, ''])[1]
    .match(/\d{3,4}/g)
    ?.map(Number) ?? [];
  const reviewed = Number((head.match(/^reviewedUntilChapter:\s*(\d+)/m) || [, 0])[1]);
  const status = (head.match(/^editorialStatus:\s*"?(\S+?)"?\s*$/m) || [, '?'])[1];

  const shared = rareChapterTerms.filter((t) => terms.has(t));
  if (shared.length < 2) continue;

  const citesIt = body.includes(String(target)) || sources.includes(target);
  rows.push({ slug, status, reviewed, shared, citesIt, newest: Math.max(0, ...sources) });
}

rows.sort((a, b) => b.shared.length - a.shared.length);

const todo = rows.filter((r) => !r.citesIt);
console.log(`\nChapitre ${target} — ${chTitle}`);
console.log(`${rows.length} article(s) thématiquement proches, dont ${todo.length} à relire.\n`);

if (todo.length === 0) {
  console.log('  Rien à signaler : tous les articles concernés citent déjà ce chapitre.');
} else {
  const pad = Math.max(...todo.map((r) => r.slug.length));
  for (const r of todo) {
    const flag = r.reviewed >= target ? ' ⚠ se déclare relu' : '';
    console.log(
      `  ${r.slug.padEnd(pad)}  [${r.status}]  termes: ${r.shared.slice(0, 6).join(', ')}${flag}`,
    );
  }
  console.log(
    `\n  ⚠ = reviewedUntilChapter >= ${target} alors que le chapitre n'est cité nulle part.`,
  );
}
console.log();
