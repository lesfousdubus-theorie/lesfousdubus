/**
 * Libellés et couleurs partagés pour les badges de certitude, d'effet,
 * de catégorie et de statut. Centralise les libellés français utilisés
 * dans l'interface afin d'éviter la dispersion des chaînes.
 */

export type Certainty = 'central' | 'elevee' | 'moyenne' | 'hypothese';
export type BadgeColor = 'cyan' | 'gold' | 'violet' | 'textSecondary' | 'alert';

export const certaintyLabels: Record<Certainty, { label: string; color: BadgeColor }> = {
  central: { label: 'Centrale', color: 'cyan' },
  elevee: { label: 'Élevée', color: 'gold' },
  moyenne: { label: 'Moyenne', color: 'violet' },
  hypothese: { label: 'Hypothèse', color: 'textSecondary' },
};

export const effectLabels: Record<string, string> = {
  fondation: 'Fondation',
  approfondissement: 'Approfondissement',
  'nouvelle-piste': 'Nouvelle piste',
  modification: 'Mise à jour',
  'piste-abandonnee': 'Piste abandonnée',
};

export const categoryLabels: Record<string, string> = {
  'monde-destinations': 'Monde et destinations',
  'histoire-temporalite': 'Histoire et temporalité',
  'figures-principales': 'Figures principales',
  'personnages-identites': 'Personnages et identités',
  'armes-antiques': 'Armes antiques',
  'technologies-pouvoirs': 'Technologies et pouvoirs',
  'peuples-royaumes': 'Peuples, royaumes et témoins',
  'dieux-croyances': 'Dieux et croyances',
  'transmission-memoire': 'Transmission et mémoire',
  'gouvernement-mondial': 'Gouvernement mondial',
  'guerre-finale': 'Guerre finale',
};

export const predictionStatusLabels: Record<string, string> = {
  'en-cours': 'En cours',
  confirmee: 'Confirmée',
  refutee: 'Réfutée',
  'en-attente': 'En attente',
};

/** Couleur + icône par statut de prédiction, pour un repérage visuel rapide
 * (au-delà du seul intitulé) sur la page /chapitres/predictions. */
export const predictionStatusMeta: Record<string, { color: BadgeColor; icon: string }> = {
  'en-cours': { color: 'violet', icon: '⏳' },
  confirmee: { color: 'cyan', icon: '✓' },
  refutee: { color: 'alert', icon: '✕' },
  'en-attente': { color: 'textSecondary', icon: '…' },
};

export const objectionStrengthLabels: Record<string, string> = {
  mineure: 'Mineure',
  moderee: 'Modérée',
  majeure: 'Majeure',
};

export function certaintyLabel(c: Certainty): string {
  return certaintyLabels[c]?.label ?? c;
}

export function certaintyColor(c: Certainty): BadgeColor {
  return certaintyLabels[c]?.color ?? 'textSecondary';
}

export function effectLabel(e: string): string {
  return effectLabels[e] ?? e;
}

export function categoryLabel(c: string): string {
  return categoryLabels[c] ?? c;
}

export function predictionStatusLabel(s: string): string {
  return predictionStatusLabels[s] ?? s;
}

export function predictionStatusColor(s: string): BadgeColor {
  return predictionStatusMeta[s]?.color ?? 'textSecondary';
}

export function predictionStatusIcon(s: string): string {
  return predictionStatusMeta[s]?.icon ?? '';
}

export function objectionStrengthLabel(s: string): string {
  return objectionStrengthLabels[s] ?? s;
}
