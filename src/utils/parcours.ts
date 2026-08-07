/**
 * Parcours de lecture principal de la théorie.
 *
 * Source unique de vérité pour l'ordre dans lequel la théorie se lit « comme un
 * livre ». Utilisé par la navigation « article précédent / article suivant » en
 * bas des fiches, et par la page « Théorie complète ».
 *
 * L'ordre n'est pas chronologique dans l'univers : c'est l'ordre nécessaire
 * pour comprendre le raisonnement. Seules les fiches neutres figurent dans le
 * parcours ; les articles d'analyse rattachés (`parent`) restent accessibles
 * depuis leur fiche et depuis la sidebar, mais n'interrompent pas la lecture.
 */

export const READING_PATH: readonly string[] = [
  'blue-star',
  'grand-line',
  'red-line',
  'lodestar',
  'laugh-tale',
  'one-piece-histoire',
  'siecle-oublie',
  'royaume-antique',
  'poneglyphes',
  'joy-boy',
  'nika',
  'luffy',
  'armes-antiques',
  'noah',
  'peuples-royaumes',
  'gouvernement-mondial',
  'imu-nerona',
  'guerre-finale',
  'all-blue',
] as const;

export interface ParcoursNeighbour {
  slug: string;
  href: string;
}

export interface ParcoursPosition {
  /** Rang dans le parcours, à partir de 1. `null` si l'article n'en fait pas partie. */
  step: number | null;
  total: number;
  previous: ParcoursNeighbour | null;
  next: ParcoursNeighbour | null;
}

const href = (slug: string) => `/theorie/${slug}`;

/**
 * Position d'un article dans le parcours de lecture.
 *
 * Renvoie `step: null` pour les articles hors parcours (analyses rattachées,
 * fiches secondaires) : l'appelant n'affiche alors aucune navigation séquentielle.
 */
export function getParcoursPosition(slug: string): ParcoursPosition {
  const index = READING_PATH.indexOf(slug);
  if (index === -1) {
    return { step: null, total: READING_PATH.length, previous: null, next: null };
  }

  const previousSlug = index > 0 ? READING_PATH[index - 1] : null;
  const nextSlug = index < READING_PATH.length - 1 ? READING_PATH[index + 1] : null;

  return {
    step: index + 1,
    total: READING_PATH.length,
    previous: previousSlug ? { slug: previousSlug, href: href(previousSlug) } : null,
    next: nextSlug ? { slug: nextSlug, href: href(nextSlug) } : null,
  };
}
