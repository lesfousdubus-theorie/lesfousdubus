import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contrastRatio, hexToRgb } from '../src/utils/contrast';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('régressions UI, UX et accessibilité', () => {
  it('libère la colonne de navigation quand la sidebar est repliée', () => {
    const layout = read('src/layouts/WikiLayout.astro');
    expect(layout).toContain('grid-template-columns: 0 minmax(0, 1fr)');
    expect(layout).toContain('aria-controls="toc-drawer"');
  });

  it('rend les schémas détaillés lisibles et agrandissables sur mobile', () => {
    const viewport = read('src/components/DiagramViewport.astro');
    expect(viewport).toContain('data-diagram-expand');
    expect(viewport).toContain('overflow-x: auto');
    expect(viewport).toContain('width: var(--diagram-min-width)');

    for (const page of [
      'carte-blue-star',
      'road-poneglyphes-temps',
      'poneglyphes',
      'fresque-elbaf',
    ]) {
      expect(read(`src/pages/explorer/${page}.astro`)).toContain('<DiagramViewport');
    }
  });

  it('conserve un rendu complet du mécanisme sans JavaScript', () => {
    const mechanism = read('src/components/TheoryMechanism.astro');
    const markup = mechanism.slice(0, mechanism.indexOf('<script>'));
    expect(markup).not.toContain('role="tab"');
    expect(markup).not.toContain('role="tabpanel"');
    expect(mechanism).toContain("tab.setAttribute('role', 'tab')");
    expect(mechanism).toContain("panels[index].setAttribute('role', 'tabpanel')");
  });

  it('utilise un bouton natif pour lancer la vidéo sans requête YouTube préalable', () => {
    const homepage = read('src/pages/index.astro');
    expect(homepage).toContain('id="video-facade__trigger"');
    expect(homepage).toContain("const videoCoverSrc = '/og-default.png'");
    expect(homepage).not.toContain('img.youtube.com');
  });

  it('charge Pagefind à la demande sans embarquer React', () => {
    const search = read('src/components/SearchModal.astro');
    const navbar = read('src/components/Navbar.astro');
    const pkg = read('package.json');
    expect(search).toContain("const pagefindUrl = '/pagefind/pagefind.js'");
    expect(navbar).toContain('<SearchModal />');
    expect(navbar).not.toContain('client:idle');
    expect(pkg).not.toContain('"react"');
  });

  it('exclut le chrome de lecture et les pages internes des extraits Pagefind', () => {
    const layout = read('src/layouts/ArticleLayout.astro');
    const modifications = read('src/content/articles/modifications.md');
    expect(layout).toContain('class="article-top-meta" data-pagefind-ignore');
    expect(layout).toContain('frontmatter.searchHidden');
    expect(modifications).toContain('searchHidden: true');
  });
});

describe('contraste fixe de la fresque d’Elbaf', () => {
  const background = hexToRgb('#26222e');

  it.each(['#76d3dc', '#c7a7ef', '#f0bd61'])(
    '%s dépasse 4.5:1 pour les libellés',
    (foreground) => {
      expect(contrastRatio(hexToRgb(foreground), background)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(['#756d7d', '#8d8496', '#9b75c4'])(
    '%s dépasse 3:1 pour les formes significatives',
    (foreground) => {
      expect(contrastRatio(hexToRgb(foreground), background)).toBeGreaterThanOrEqual(3);
    },
  );
});
