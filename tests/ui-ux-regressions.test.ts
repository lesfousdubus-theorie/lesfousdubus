import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contrastRatio, hexToRgb } from '../src/utils/contrast';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('régressions UI, UX et accessibilité', () => {
  it('utilise une sidebar simple sans redimensionnement ni état persistant', () => {
    const layout = read('src/layouts/WikiLayout.astro');
    expect(layout).toContain('class="sidebar-scroll"');
    expect(layout).toContain('min-height: 0');
    expect(layout).toContain('height: calc(100dvh - var(--nav-h))');
    expect(layout).toContain('height: 0');
    expect(layout).toContain('overflow-y: scroll');
    expect(layout).toContain('-webkit-overflow-scrolling: touch');
    expect(layout).toContain('aria-label="Liste des articles"');
    expect(layout).toContain("window.matchMedia('(max-width: 1023px)')");
    expect(layout).not.toContain('sidebar-resizer');
    expect(layout).not.toContain('sidebar-left-width');
    expect(layout).not.toContain('sidebar-left-collapsed');
    expect(layout).toContain('aria-controls="toc-drawer"');
  });

  it('utilise le même seuil responsive pour la navbar et le tiroir latéral', () => {
    const layout = read('src/layouts/WikiLayout.astro');
    const navbar = read('src/components/Navbar.astro');

    expect(layout).toContain("window.matchMedia('(max-width: 1023px)')");
    expect(layout).toContain('@media (max-width: 1023px)');
    expect(navbar).toContain('@media (max-width: 1023px)');
    expect(navbar).toContain("aria-controls={hideMobileToggle ? undefined : 'sidebar-left'}");
    expect(layout).not.toMatch(/window\.innerWidth\s*[<>]=?\s*768/);
  });

  it('synchronise les composants fixes avec les états réels des superpositions', () => {
    const backToTop = read('src/components/BackToTop.astro');
    const progress = read('src/components/ReadingProgressBar.astro');

    for (const source of [backToTop, progress]) {
      expect(source).toContain('html.nav-drawer-open');
      expect(source).toContain('html.toc-drawer-open');
      expect(source).toContain('html.search-modal-open');
      expect(source).not.toContain("data-nav-open='mobile'");
    }
  });

  it('donne un nom accessible propre à chaque détail de la chronologie', () => {
    const timeline = read('src/components/InteractiveTheoryTimeline.astro');
    expect(timeline).toContain('id={`event-detail-title-${event.id}`}');
    expect(timeline).toContain(
      "dialog.setAttribute('aria-labelledby', `event-detail-title-${eventId}`)",
    );
    expect(timeline).not.toContain('id="event-dialog-title"');
  });

  it('utilise les éléments details natifs pour les sections de navigation', () => {
    const sidebar = read('src/components/SidebarNav.astro');
    expect(sidebar).toContain('<details');
    expect(sidebar).toContain('<summary');
    expect(sidebar).not.toContain('<script>');
  });

  it('ne rend plus de barre de recherche dans la navigation latérale', () => {
    const sidebar = read('src/components/SidebarNav.astro');
    expect(sidebar).not.toContain('sidebar-filter');
    expect(sidebar).not.toContain('Filtrer la navigation');
    expect(sidebar).not.toContain('applyFilter');
  });

  it('publie les 15 médias locaux du thread Galley-La', () => {
    const article = read('src/content/articles/galley-la-coincidence-impossible.md');
    for (let index = 1; index <= 15; index++) {
      const imagePath = `public/images/threads/galley-la-coincidence-impossible/img_${index}.webp`;
      expect(existsSync(resolve(process.cwd(), imagePath))).toBe(true);
      expect(article).toContain(
        `/images/threads/galley-la-coincidence-impossible/img_${index}.webp`,
      );
    }
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

  it('neutralise l’arrière-plan de la recherche et annule les résultats périmés', () => {
    const search = read('src/components/SearchModal.astro');
    expect(search).toContain("'.navbar, .wiki-layout, #toc-fab, #back-to-top'");
    expect(search).toContain("element.setAttribute('inert', '')");
    expect(search).toContain('requestId += 1');
    expect(search).toContain("input.removeAttribute('aria-activedescendant')");
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

  it.each(['#76d3dc', '#c7a7ef', '#f0bd61'])('%s dépasse 4.5:1 pour les libellés', (foreground) => {
    expect(contrastRatio(hexToRgb(foreground), background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['#756d7d', '#8d8496', '#9b75c4'])(
    '%s dépasse 3:1 pour les formes significatives',
    (foreground) => {
      expect(contrastRatio(hexToRgb(foreground), background)).toBeGreaterThanOrEqual(3);
    },
  );
});
