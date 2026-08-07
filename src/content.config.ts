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
    lastUpdatedChapter: z.number().optional(),
    related: z.array(z.string()).default([]),
    /** Numéros de chapitres explicitement cités dans l'article. */
    sources: z.array(z.number()).default([]),
    order: z.number().default(0),
    editorialStatus: z.enum([
      'canon', 'fait-observe', 'interpretation', 'hypothese-centrale',
      'hypothese-secondaire', 'nouvelle-piste', 'contredite', 'refutee',
    ]).optional(),
    /** Titre SEO riche pour <title> (H1 reste court). Ex: "Joy Boy dans One Piece : identité, indices et théorie" */
    seoTitle: z.string().optional(),
    /** Identifiant (slug) de la fiche canonique parente pour les articles de démonstration. */
    parent: z.string().optional(),
  }),
});

const chapters = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/chapters' }),
  schema: z.object({
    chapter: z.number(),
    title: z.string(),
    effect: z.enum([
      'fondation',
      'approfondissement',
      'nouvelle-piste',
      'modification',
    ]),
    themes: z.array(z.string()).default([]),
    updatedArticles: z.array(z.string()).default([]),
    summary: z.string().optional(),
  }),
});

const glossary = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/glossary' }),
  schema: z.object({
    term: z.string(),
    definition: z.string(),
    relatedArticles: z.array(z.string()).default([]),
  }),
});

const characters = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/characters' }),
  schema: z.object({
    name: z.string(),
    era: z.enum(['ancien', 'moderne', 'transversal']).default('transversal'),
    aliases: z.array(z.string()).default([]),
    summary: z.string(),
    articles: z.array(z.string()).default([]),
    order: z.number().default(0),
  }),
});

const locations = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/locations' }),
  schema: z.object({
    name: z.string(),
    region: z.string().default('Inconnu'),
    summary: z.string(),
    articles: z.array(z.string()).default([]),
    order: z.number().default(0),
  }),
});

const predictions = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/predictions' }),
  schema: z.object({
    title: z.string(),
    statement: z.string(),
    status: z.enum(['en-cours', 'confirmee', 'refutee', 'en-attente']).default('en-cours'),
    chapter: z.number().optional(),
    articles: z.array(z.string()).default([]),
  }),
});

const timelines = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/timelines' }),
  schema: z.object({
    title: z.string(),
    period: z.enum(['siecle-oublie', 'present', 'futur', 'boucle']).default('present'),
    summary: z.string(),
    articles: z.array(z.string()).default([]),
  }),
});

export const collections = {
  articles,
  chapters,
  glossary,
  characters,
  locations,
  predictions,
  timelines,
};
