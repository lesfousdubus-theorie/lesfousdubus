interface ArticleLike {
  id: string;
}

interface ChapterLike {
  data: {
    chapter: number;
    updatedArticles?: string[];
  };
}

export interface ArticleUpdate<TArticle extends ArticleLike> {
  article: TArticle;
  chapter: number;
}

/**
 * Associe chaque article au dernier chapitre qui le mentionne explicitement
 * dans `updatedArticles`.
 *
 * Les badges "Chap." doivent venir des fiches de chapitres, pas du champ
 * éditorial `lastUpdatedChapter`, qui indique seulement l'état de relecture
 * d'un article et peut donc être identique pour beaucoup de pages.
 */
export function getLatestArticleUpdateChapterMap(chapters: ChapterLike[]): Map<string, number> {
  const latestByArticle = new Map<string, number>();

  for (const chapter of chapters) {
    for (const articleId of chapter.data.updatedArticles ?? []) {
      const current = latestByArticle.get(articleId) ?? 0;
      if (chapter.data.chapter > current) {
        latestByArticle.set(articleId, chapter.data.chapter);
      }
    }
  }

  return latestByArticle;
}

/** Dernières mises à jour d'articles, dédupliquées et triées par chapitre décroissant. */
export function getRecentArticleUpdates<TArticle extends ArticleLike>(
  articles: TArticle[],
  chapters: ChapterLike[],
  limit?: number,
): ArticleUpdate<TArticle>[] {
  const latestByArticle = getLatestArticleUpdateChapterMap(chapters);
  const updates = articles
    .map((article) => {
      const chapter = latestByArticle.get(article.id);
      return chapter ? { article, chapter } : undefined;
    })
    .filter((update): update is ArticleUpdate<TArticle> => Boolean(update))
    .sort((a, b) => b.chapter - a.chapter || a.article.id.localeCompare(b.article.id, 'fr'));

  return typeof limit === 'number' ? updates.slice(0, limit) : updates;
}
