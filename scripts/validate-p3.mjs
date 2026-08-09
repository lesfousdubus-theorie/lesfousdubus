import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const ART = join(ROOT, 'src/content/articles');

let errors = 0;

function check(file, cond, msg) {
  if (!cond) { console.error(`[FAIL] ${file}: ${msg}`); errors++; }
}

for (const f of readdirSync(ART).filter(f => f.endsWith('.md'))) {
  const p = join(ART, f);
  const raw = readFileSync(p, 'utf8');

  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) { check(f, false, 'no frontmatter'); continue; }
  const fm = fmMatch[1];

  const status = (fm.match(/status:\s*["']?(\w+)/) || [])[1] || 'draft';
  if (status !== 'published') continue; // skip drafts for strict checks

  check(f, /title:/.test(fm), 'missing title');
  check(f, /summary:/.test(fm), 'missing summary');
  check(f, /category:/.test(fm), 'missing category');

  check(f, !raw.includes('代代'), 'contains broken "代代 transmission"');
  check(f, !/[\uFFFD]/.test(raw), 'contains replacement char');

  const internalLinks = [...raw.matchAll(/\]\(\/theorie\/([a-z0-9-]+)\)/g)].map(m => m[1]);
  for (const l of internalLinks) {
    const target = join(ART, l + '.md');
    check(f, existsSync(target), `broken internal link to ${l}`);
  }
}

console.log(`[validate-p3] ${errors} errors`);
process.exit(errors > 0 ? 1 : 0);
