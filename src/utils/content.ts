import { getCollection, type CollectionEntry } from 'astro:content';

export type ArticleEntry = CollectionEntry<'articles'>;

/** Tous les articles publiés, triés de façon déterministe pour les listes générales. */
export async function getPublishedArticles(): Promise<ArticleEntry[]> {
  const articles = await getCollection('articles', ({ data }) => data.status === 'published');
  return articles.sort(
    (a, b) =>
      a.data.category.localeCompare(b.data.category, 'fr') ||
      (a.data.order ?? 0) - (b.data.order ?? 0) ||
      a.id.localeCompare(b.id, 'fr'),
  );
}

/** Articles publiés d'une catégorie, triés par ordre décroissant. */
export async function getArticlesByCategory(category: string): Promise<ArticleEntry[]> {
  const articles = await getCollection(
    'articles',
    ({ data }) => data.category === category && data.status === 'published',
  );
  return articles.sort((a, b) => (b.data.order ?? 0) - (a.data.order ?? 0));
}

/** Filtre les articles liés à un article donné, en excluant l'article lui-même. */
export function getRelatedArticles(current: ArticleEntry, all: ArticleEntry[]): ArticleEntry[] {
  return all.filter((a) => current.data.related.includes(a.id) && a.id !== current.id);
}
