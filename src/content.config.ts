import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    category: z.enum([
      'monde-destinations',
      'histoire-temporalite',
      'figures-principales',
      'personnages-identites',
      'armes-antiques',
      'technologies-pouvoirs',
      'peuples-royaumes',
      'dieux-croyances',
      'transmission-memoire',
      'gouvernement-mondial',
      'guerre-finale',
    ]),
    status: z.enum(['draft', 'published']).default('draft'),
    certainty: z.enum(['central', 'elevee', 'moyenne', 'hypothese']).optional(),
    /** Dernier chapitre pris en compte lors de la relecture éditoriale globale. */
    reviewedUntilChapter: z.number().optional(),
    related: z.array(z.string()).default([]),
    /** Numéros de chapitres explicitement cités dans l'article. */
    sources: z.array(z.number()).default([]),
    order: z.number().default(0),
    editorialStatus: z
      .enum(['manga', 'theorie-centrale', 'extension', 'hypothese-recente', 'projection'])
      .optional(),
    /** Titre SEO riche pour <title> (H1 reste court). Ex: "Joy Boy dans One Piece : identité, indices et théorie" */
    seoTitle: z.string().optional(),
    /** Image Open Graph spécifique à la page (chemin, ex: "/og-foo.png"). Sinon og-default.jpg. */
    ogImage: z.string().optional(),
    /** Identifiant (slug) de la fiche canonique parente pour les articles de démonstration. */
    parent: z.string().optional(),
    /** Masquer cet article de la sidebar (reste accessible via recherche et liens). */
    sidebarHidden: z.boolean().default(false),
    /** Exclure une page interne ou éditoriale de l’index de recherche public. */
    searchHidden: z.boolean().default(false),
    /** Présentation de navigation : fiche neutre ou dossier d’analyse. */
    navigationType: z.enum(['fiche', 'dossier']).default('fiche'),
  }),
});

const chapters = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/chapters' }),
  schema: z.object({
    chapter: z.number(),
    title: z.string(),
    /** Titre SERP concis, distinct du titre éditorial affiché. */
    seoTitle: z.string().optional(),
    effect: z.enum([
      'fondation',
      'approfondissement',
      'nouvelle-piste',
      'modification',
      'piste-abandonnee',
    ]),
    themes: z.array(z.string()).default([]),
    updatedArticles: z.array(z.string()).default([]),
    summary: z.string().optional(),
  }),
});

const predictions = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/predictions' }),
  schema: z.object({
    title: z.string(),
    statement: z.string(),
    status: z.enum(['en-cours', 'confirmee', 'refutee', 'en-attente']).default('en-cours'),
    /** Dernier chapitre observé, jamais la date de dépôt. */
    chapter: z.number().optional(),
    articles: z.array(z.string()).default([]),
    /** Date de dépôt immuable de la proposition atomique. */
    depositedAtChapter: z.number(),
    lastUpdate: z.number().optional(),
    resolvedAtChapter: z.number().optional(),
    outcome: z.string().optional(),
    revisionHistory: z
      .array(
        z.object({
          chapter: z.number(),
          change: z.string(),
        }),
      )
      .default([]),
    statusNote: z.string().optional(),
    confidence: z.enum(['elevee', 'moyenne', 'faible']).optional(),
    primarySource: z.string(),
    indices: z.string().optional(),
    observableCriterion: z.string(),
    refuterait: z.string().optional(),
  }),
});

export const collections = {
  articles,
  chapters,
  predictions,
};
