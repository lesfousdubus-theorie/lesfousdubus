/**
 * Helpers de formatage pour l'affichage du contenu.
 */

/** Formate un numéro de chapitre. */
export function formatChapter(chapter: number): string {
  return `Chapitre ${chapter}`;
}

/**
 * Mappe le statut éditorial vers le libellé français et la classe de badge.
 */
export function editorialStatusToFrench(s?: string): { label: string; badgeClass: string } {
  const map: Record<string, { label: string; badgeClass: string }> = {
    manga: { label: 'Manga', badgeClass: 'meta-badge--cyan' },
    'theorie-centrale': {
      label: 'Théorie centrale',
      badgeClass: 'meta-badge--gold',
    },
    extension: { label: 'Extension de la théorie', badgeClass: 'meta-badge--violet' },
    'hypothese-recente': {
      label: 'Hypothèse récente',
      badgeClass: 'meta-badge--violet',
    },
    projection: { label: 'Projection', badgeClass: 'meta-badge--gold' },
  };
  return map[s ?? ''] ?? { label: 'Statut non classé', badgeClass: 'meta-badge--muted' };
}


/** Estimation de lecture basée sur 220 mots par minute. */
export function readingTime(text: string): string {
  return `${Math.max(1, Math.ceil(text.trim().split(/\s+/).filter(Boolean).length / 220))} min`;
}

/** Libellé historique conservé pour les tests et les anciennes intégrations. */
export function certaintyToFrench(certainty: string): string {
  return ({ central: 'Confirmée', elevee: 'Élevée', moyenne: 'Moyenne', hypothese: 'Basse' } as Record<string, string>)[certainty] ?? 'Basse';
}
