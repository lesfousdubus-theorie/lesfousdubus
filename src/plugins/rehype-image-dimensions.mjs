/**
 * Plugin rehype — anti-CLS et lazy-loading pour les images du contenu markdown.
 *
 * Les images des articles (`/images/threads/…`) sont servies depuis `public/`
 * et n'ont ni `width`/`height` ni attributs de chargement différé. Ce plugin :
 *   - injecte `width`/`height` depuis `src/utils/image-dimensions.json`
 *     (généré par `scripts/optimize-thread-images.sh`) ;
 *   - ajoute `loading="lazy"` et `decoding="async"` quand absents.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { visit } from 'unist-util-visit';

const here = dirname(fileURLToPath(import.meta.url));

let dimensions = {};
try {
  dimensions = JSON.parse(readFileSync(join(here, '../utils/image-dimensions.json'), 'utf8'));
} catch {
  // Carte absente : le plugin ajoute tout de même lazy/decoding.
}

export default function rehypeImageDimensions() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return;
      const src = node.properties?.src;
      if (typeof src !== 'string' || !src.startsWith('/images/')) return;

      const dims = dimensions[src];
      if (dims?.w && dims?.h) {
        node.properties.width = dims.w;
        node.properties.height = dims.h;
      }
      if (!node.properties.loading) node.properties.loading = 'lazy';
      if (!node.properties.decoding) node.properties.decoding = 'async';
    });
  };
}
