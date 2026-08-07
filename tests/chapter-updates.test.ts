import { describe, expect, it } from 'vitest';
import { getLatestArticleUpdateChapterMap, getRecentArticleUpdates } from '../src/utils/chapter-updates';

describe('chapter updates', () => {
  const chapters = [
    { data: { chapter: 1180, updatedArticles: ['imu', 'uranus'] } },
    { data: { chapter: 1188, updatedArticles: ['imu', 'joy-boy'] } },
    { data: { chapter: 1184, updatedArticles: ['brook'] } },
  ];

  it('associe chaque article à son dernier chapitre réellement relié', () => {
    const map = getLatestArticleUpdateChapterMap(chapters);

    expect(map.get('imu')).toBe(1188);
    expect(map.get('uranus')).toBe(1180);
    expect(map.get('brook')).toBe(1184);
  });

  it('ne remonte que les articles présents dans updatedArticles', () => {
    const articles = [{ id: 'imu' }, { id: 'brook' }, { id: 'alabasta' }];

    expect(getRecentArticleUpdates(articles, chapters)).toEqual([
      { article: { id: 'imu' }, chapter: 1188 },
      { article: { id: 'brook' }, chapter: 1184 },
    ]);
  });
});
