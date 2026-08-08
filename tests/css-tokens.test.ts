import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Non-régression : détecte tout `var(--xxx)` qui référence un token non
 * défini dans `src/styles/global.css` (le fichier fondateur).
 *
 * Les tokens autorisés à être définis dans d'autres fichiers sont listés
 * ci-dessous (variables de layout/couleur définies dans les composants).
 */

const GLOBAL_CSS = readFileSync(join(process.cwd(), 'src', 'styles', 'global.css'), 'utf8');

// Extraire tous les noms de custom properties déclarés dans :root/.dark/.light
const declaredTokens = new Set<string>();
for (const m of GLOBAL_CSS.matchAll(/--([\w-]+)\s*:/g)) {
  declaredTokens.add(m[1]);
}

// Tokens qui sont déclarés dans d'autres fichiers (variables de layout/composant)
const ALLOWED_EXTERNAL = new Set([
  'nav-h',
  'nav-h-mobile',
  'sidebar-left-width',
  // Couleurs utilitées par les pages explorer
  'bg-card',
  'bg-card-hover',
]);

const SRC = join(process.cwd(), 'src');
const offenders: Array<{ file: string; token: string }> = [];

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(astro|css|tsx?|jsx?)$/.test(entry)) {
      const content = readFileSync(p, 'utf8');
      for (const m of content.matchAll(/var\(--([\w-]+)\b/g)) {
        const name = m[1];
        if (name.startsWith('tw-')) continue;
        if (declaredTokens.has(name)) continue;
        if (ALLOWED_EXTERNAL.has(name)) continue;
        // Variables calculées dans les composants (setProperty) sont dynamiques
        if (
          content.includes(`--${name}:`) ||
          content.includes(`'--${name}'`) ||
          content.includes(`"--${name}"`)
        ) {
          continue;
        }
        offenders.push({ file: p.replace(process.cwd() + '/', ''), token: name });
      }
    }
  }
}
walk(SRC);

describe('tokens CSS définis', () => {
  it('tous les var(--xxx) sont déclarés dans global.css', () => {
    expect(offenders).toEqual([]);
  });
});
