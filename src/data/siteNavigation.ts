export interface SiteCategory {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  order: number;
}

export const siteCategories: SiteCategory[] = [
  {
    id: 'monde-destinations',
    label: 'Monde et destinations',
    shortLabel: 'Monde',
    icon: '🌍',
    description: 'Blue Star, Grand Line, Red Line, Lodestar et Laugh Tale.',
    order: 1,
  },
  {
    id: 'histoire-temporalite',
    label: 'Histoire et temporalité',
    shortLabel: 'Temps',
    icon: '📜',
    description: 'Le Siècle oublié, les Ponéglyphes et la communication entre les époques.',
    order: 2,
  },
  {
    id: 'figures-principales',
    label: 'Figures principales',
    shortLabel: 'Figures',
    icon: '🎭',
    description: 'Luffy, Joy Boy, Nika et les figures au cœur de la théorie.',
    order: 3,
  },
  {
    id: 'personnages-identites',
    label: 'Personnages et identités',
    shortLabel: 'Identités',
    icon: '👥',
    description: 'Des rapprochements explicites, sans transformer les parallèles en identités.',
    order: 4,
  },
  {
    id: 'armes-antiques',
    label: 'Armes antiques',
    shortLabel: 'Armes',
    icon: '🔱',
    description: 'Poséidon, Pluton, Uranus et Noah : faits établis et rôles projetés.',
    order: 5,
  },
  {
    id: 'technologies-pouvoirs',
    label: 'Technologies et pouvoirs',
    shortLabel: 'Technologies',
    icon: '⚡',
    description: 'Vegapunk, Mother Flame, Fruits du Démon et technologies perdues.',
    order: 6,
  },
  {
    id: 'peuples-royaumes',
    label: 'Peuples, royaumes et témoins',
    shortLabel: 'Peuples',
    icon: '🏰',
    description: 'Des traditions et missions indépendantes, transmises à des dates différentes.',
    order: 7,
  },
  {
    id: 'dieux-croyances',
    label: 'Dieux et croyances',
    shortLabel: 'Croyances',
    icon: '☀️',
    description: 'Nika, les divinités et la manière dont les croyances traversent le temps.',
    order: 8,
  },
  {
    id: 'transmission-memoire',
    label: 'Transmission et mémoire',
    shortLabel: 'Mémoire',
    icon: '🎵',
    description: 'Volonté héritée, chants, promesses et informations venues de l’avenir.',
    order: 9,
  },
  {
    id: 'gouvernement-mondial',
    label: 'Gouvernement mondial',
    shortLabel: 'Gouvernement',
    icon: '⚖️',
    description: 'Imu, le Gorosei, les Dragons célestes et la structure du pouvoir.',
    order: 10,
  },
  {
    id: 'guerre-finale',
    label: 'Guerre finale',
    shortLabel: 'Guerre finale',
    icon: '⚔️',
    description: 'Guerre annoncée et futurs possibles : coalition, Déluge, Red Line et All Blue.',
    order: 11,
  },
];

export const categoryById = new Map(siteCategories.map((category) => [category.id, category]));

export const understandingPaths = [
  {
    label: 'Comprendre en 2 minutes',
    description: 'Le retournement central, sans entrer dans toutes les preuves.',
    href: '/',
    duration: '2 min',
  },
  {
    label: 'Résumé en 10 points',
    description: 'Le raisonnement complet dans une version guidée et accessible.',
    href: '/theorie/resume',
    duration: '10 min',
  },
  {
    label: 'Démonstration complète',
    description: 'Les 22 chapitres, arguments, limites et prolongements de la théorie.',
    href: '/theorie/theorie-complete',
    duration: '45 min',
  },
] as const;

export const explorerHighlights = [
  {
    label: 'Frise chronologique',
    description: 'Passé apparent, présent vécu et futurs possibles, sans ordre forcé.',
    href: '/theorie/chronologie',
    icon: '🕰️',
  },
  {
    label: 'Carte mentale',
    description: 'Faits, noyau, extensions, hypothèses et projections en une vue.',
    href: '/explorer/carte-mentale',
    icon: '🧠',
  },
  {
    label: 'Correspondances',
    description: 'Relations explicites, objections et niveaux de solidité.',
    href: '/explorer/correspondances',
    icon: '🔗',
  },
  {
    label: 'Carte de Blue Star',
    description: 'Géographie établie et hypothèses de mécanisme clairement séparées.',
    href: '/explorer/carte-blue-star',
    icon: '🗺️',
  },
] as const;
