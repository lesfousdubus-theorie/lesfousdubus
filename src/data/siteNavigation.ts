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
    description: 'Les correspondances proposées entre personnages anciens et modernes.',
    order: 4,
  },
  {
    id: 'armes-antiques',
    label: 'Armes antiques',
    shortLabel: 'Armes',
    icon: '🔱',
    description: 'Poséidon, Pluton, Uranus, Noah et leur rôle dans le monde à venir.',
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
    description: 'Les peuples qui protègent une pièce de la mémoire et de la guerre finale.',
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
    description: 'La coalition, le Déluge, la chute de Red Line et la naissance d’All Blue.',
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
    description: 'Du passé apparent au futur qui l’a créé.',
    href: '/theorie/chronologie',
    icon: '🕰️',
  },
  {
    label: 'Carte mentale',
    description: 'Toute la chaîne causale en une vue.',
    href: '/explorer/carte-mentale',
    icon: '🧠',
  },
  {
    label: 'Correspondances',
    description: 'Luffy/Joy Boy, Vivi/Lili, Teach/Davy Jones et les autres liens.',
    href: '/explorer/correspondances',
    icon: '🔗',
  },
  {
    label: 'Carte de Blue Star',
    description: 'La géographie qui déclenche toute la théorie.',
    href: '/explorer/carte-blue-star',
    icon: '🗺️',
  },
] as const;
