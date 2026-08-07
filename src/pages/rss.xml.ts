import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: { site: URL }) {
  const articles = await getCollection('articles', ({ data }) => data.status === 'published');
  const chapters = await getCollection('chapters');

  // Combine articles and chapter analyses into a unified feed
  const items = [
    ...articles
      .filter((a) => a.id !== 'theorie-complete')
      .map((article) => ({
        title: article.data.seoTitle || article.data.title,
        description: article.data.summary,
        link: `/theorie/${article.id}/`,
        pubDate: new Date(), // static site: use build date
        category: article.data.category,
      })),
    ...chapters.map((chapter) => ({
      title: `Chapitre ${chapter.data.chapter} — ${chapter.data.title}`,
      description: chapter.data.summary || `Analyse du chapitre ${chapter.data.chapter} de One Piece`,
      link: `/chapitres/${chapter.data.chapter}/`,
      pubDate: new Date(),
    })),
  ];

  return rss({
    title: 'Les Fous du Bus — Wiki de la théorie One Piece',
    description:
      'Théorie One Piece : le Siècle oublié est le présent. Articles, analyses chapitre par chapitre, et mises à jour de la théorie des Fous du Bus.',
    site: context.site,
    items,
    customData: `<language>fr-FR</language>`,
    stylesheet: '/rss/styles.xsl',
  });
}
