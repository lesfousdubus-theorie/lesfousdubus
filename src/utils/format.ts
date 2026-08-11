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
    'canon': { label: 'Canon', badgeClass: 'meta-badge--cyan' },
    'fait-observe': { label: 'Fait observé', badgeClass: 'meta-badge--cyan' },
    'interpretation': { label: 'Interprétation', badgeClass: 'meta-badge--violet' },
    'hypothese-centrale': { label: 'Hypothèse centrale', badgeClass: 'meta-badge--gold' },
    'hypothese-secondaire': { label: 'Hypothèse secondaire', badgeClass: 'meta-badge--violet' },
    'nouvelle-piste': { label: 'Nouvelle piste', badgeClass: 'meta-badge--violet' },
    // Statuts invalidés : rendus visuellement distincts d'une simple hypothèse
    // en sourdine (`--muted`) grâce à `--alert`, pour éviter la confusion entre
    // « pas encore confirmé » et « invalidé par le manga ».
    'contredite': { label: 'Contredite', badgeClass: 'meta-badge--alert' },
    'refutee': { label: 'Réfutée', badgeClass: 'meta-badge--alert' },
  };
  return map[s ?? ''] ?? { label: 'Hypothèse centrale', badgeClass: 'meta-badge--gold' };
}


/** Estimation de lecture basée sur 220 mots par minute. */
export function readingTime(text: string): string {
  return `${Math.max(1, Math.ceil(text.trim().split(/\s+/).filter(Boolean).length / 220))} min`;
}

/** Libellé historique conservé pour les tests et les anciennes intégrations. */
export function certaintyToFrench(certainty: string): string {
  return ({ central: 'Confirmée', elevee: 'Élevée', moyenne: 'Moyenne', hypothese: 'Basse' } as Record<string, string>)[certainty] ?? 'Basse';
}
