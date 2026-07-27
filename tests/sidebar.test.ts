import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { READING_PATH, getParcoursPosition } from '../src/utils/parcours';

/**
 * La barre latérale est rendue par un composant unique (`SidebarNav.astro`) à partir
 * des seules données de contenu. Elle doit donc être strictement identique sur
 * toutes les pages du site : mêmes entrées, même ordre.
 *
 * Ces tests travaillent directement sur les sources Markdown (pas sur `dist/`)
 * afin de s'exécuter sans build préalable.
 */

const ARTICLES_DIR = join(process.cwd(), 'src', 'content', 'articles');

interface Article {
  id: string;
  title: string;
  category: string;
  order: number;
  parent?: string;
  status: string;
}

function readArticles(): Article[] {
  return readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
    .filter((f) => statSync(join(ARTICLES_DIR, f)).isFile())
    .map((file) => {
      const raw = readFileSync(join(ARTICLES_DIR, file), 'utf8');
      const fm = raw.split(/\r?\n---\r?\n/)[0].replace(/^---\r?\n/, '');
      const get = (key: string) => {
        const m = fm.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
        return m ? m[1].trim().replace(/^["']|["']$/g, '') : undefined;
      };
      return {
        id: file.replace(/\.(md|mdx)$/, ''),
        title: get('title') ?? '',
        category: get('category') ?? '',
        order: Number(get('order') ?? 0),
        parent: get('parent'),
        status: get('status') ?? 'draft',
      };
    })
    .filter((a) => a.status === 'published');
}

describe('sidebar : source unique et ordre déterministe', () => {
  const articles = readArticles();

  it('ne contient aucun couple (catégorie, order) dupliqué', () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const a of articles) {
      const key = `${a.category}#${a.order}`;
      if (seen.has(key)) duplicates.push(`${a.id} <-> ${seen.get(key)} (${key})`);
      else seen.set(key, a.id);
    }
    expect(duplicates).toEqual([]);
  });

  it('rattache chaque article d’analyse à une fiche existante', () => {
    const ids = new Set(articles.map((a) => a.id));
    const orphans = articles
      .filter((a) => a.parent && !ids.has(a.parent))
      .map((a) => `${a.id} -> ${a.parent}`);
    expect(orphans).toEqual([]);
  });

  it('classe Monde et destinations dans l’ordre géographique attendu', () => {
    const worldOrder = articles
      .filter((a) => a.category === 'monde-destinations' && !a.parent)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id, 'fr'))
      .map((a) => a.title);

    expect(worldOrder).toEqual([
      'Blue Star',
      'Grand Line',
      'Red Line',
      'Lodestar',
      'Laugh Tale',
      'One Piece',
      'All Blue',
    ]);
  });

  it('n’utilise pas de titre de navigation formulé comme une conclusion définitive', () => {
    const banned = /\b(deviendront|est Joy Boy|n'existe pas encore)\b/i;
    const offenders = articles.filter((a) => banned.test(a.title)).map((a) => a.title);
    expect(offenders).toEqual([]);
  });
});

describe('parcours de lecture', () => {
  const articles = readArticles();
  const ids = new Set(articles.map((a) => a.id));

  it('ne référence que des articles publiés existants', () => {
    const missing = READING_PATH.filter((slug) => !ids.has(slug));
    expect(missing).toEqual([]);
  });

  it('ne contient aucun doublon', () => {
    expect(new Set(READING_PATH).size).toBe(READING_PATH.length);
  });

  it('ne fait figurer que des fiches neutres, jamais des articles d’analyse', () => {
    const withParent = articles
      .filter((a) => a.parent && READING_PATH.includes(a.id))
      .map((a) => a.id);
    expect(withParent).toEqual([]);
  });

  it('chaîne correctement précédent et suivant', () => {
    const first = getParcoursPosition(READING_PATH[0]);
    expect(first.step).toBe(1);
    expect(first.previous).toBeNull();
    expect(first.next?.slug).toBe(READING_PATH[1]);

    const last = getParcoursPosition(READING_PATH[READING_PATH.length - 1]);
    expect(last.step).toBe(READING_PATH.length);
    expect(last.next).toBeNull();

    const middle = getParcoursPosition('joy-boy');
    expect(middle.previous?.slug).toBe('ponelyphes');
    expect(middle.next?.slug).toBe('nika');
  });

  it('renvoie une position vide pour un article hors parcours', () => {
    const off = getParcoursPosition('binks-no-sake');
    expect(off.step).toBeNull();
    expect(off.previous).toBeNull();
    expect(off.next).toBeNull();
  });
});
