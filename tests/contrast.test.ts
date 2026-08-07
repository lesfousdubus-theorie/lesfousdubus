import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hexToRgb, contrastRatio, tintOver, compositeOver, type RGB } from '../src/utils/contrast';

/**
 * Non-régression sur les contrastes (WCAG 2.1 AA).
 *
 * Les valeurs sont lues directement dans `src/styles/global.css` : si un token
 * de couleur est modifié, ces tests échouent avant que le problème n'atteigne
 * le site. Seuils appliqués :
 *   - 4.5:1 pour le texte courant (1.4.3) ;
 *   - 3:1 pour les composants d'interface et indicateurs (1.4.11).
 */

const CSS = readFileSync(join(process.cwd(), 'src', 'styles', 'global.css'), 'utf8');

/** Extrait la valeur d'un token CSS dans le bloc `.dark` ou `.light`. */
function token(theme: 'dark' | 'light', name: string): string {
  const blockRe =
    theme === 'dark' ? /:root,\s*\.dark\s*\{([\s\S]*?)\n  \}/ : /\n  \.light\s*\{([\s\S]*?)\n  \}/;
  const block = CSS.match(blockRe);
  if (!block) throw new Error(`Bloc de thème introuvable : ${theme}`);
  const m = block[1].match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`Token introuvable : --${name} (${theme})`);
  return m[1].trim();
}

const color = (theme: 'dark' | 'light', name: string): RGB => hexToRgb(token(theme, name));

const THEMES = ['dark', 'light'] as const;
const SURFACES = ['bg-main', 'bg-secondary', 'surface'] as const;

const TEXT_AA = 4.5;
const UI_AA = 3;

describe.each(THEMES)('contraste — thème %s', (theme) => {
  const surfaces = SURFACES.map((s) => [s, color(theme, s)] as const);

  it.each(SURFACES)('text-main est lisible sur %s', (surface) => {
    const r = contrastRatio(color(theme, 'text-main'), color(theme, surface));
    expect(r).toBeGreaterThanOrEqual(TEXT_AA);
  });

  it.each(SURFACES)('text-secondary est lisible sur %s', (surface) => {
    const r = contrastRatio(color(theme, 'text-secondary'), color(theme, surface));
    expect(r).toBeGreaterThanOrEqual(TEXT_AA);
  });

  it.each(['cyan', 'violet-light', 'accent-gold', 'alert'])(
    '%s reste lisible comme couleur de texte sur toutes les surfaces',
    (accent) => {
      for (const [name, bg] of surfaces) {
        const r = contrastRatio(color(theme, accent), bg);
        expect(r, `${accent} sur ${name}`).toBeGreaterThanOrEqual(TEXT_AA);
      }
    },
  );

  /**
   * Badges : un texte coloré posé sur une teinte translucide de la même famille.
   * C'est le motif le plus fragile du site (`.badge-*`, `.article-item__badge--*`,
   * `.ev-badge--*`, `.proof-badge--*`, `.badge-effect--*`), car la teinte éclaircit
   * le fond et rapproche les deux couleurs.
   */
  const BADGES: Array<[string, string, string]> = [
    ['badge-cyan', 'cyan', 'cyan'],
    ['badge-violet', 'violet-light', 'violet'],
    ['badge-gold', 'accent-gold', 'accent-gold'],
    ['badge-alert', 'alert', 'alert'],
  ];

  it.each(BADGES)('%s reste lisible sur sa propre teinte', (_label, textToken, tintToken) => {
    for (const pct of [10, 12]) {
      for (const [name, bg] of surfaces) {
        const tinted = tintOver(color(theme, tintToken), pct, bg);
        const r = contrastRatio(color(theme, textToken), tinted);
        expect(r, `${textToken} sur ${tintToken}@${pct}% / ${name}`).toBeGreaterThanOrEqual(
          TEXT_AA,
        );
      }
    }
  });

  it('le lien de sidebar actif reste lisible sur son fond teinté', () => {
    const bg = color(theme, 'bg-main');
    for (const pct of [8, 12]) {
      const r = contrastRatio(color(theme, 'cyan'), tintOver(color(theme, 'cyan'), pct, bg));
      expect(r, `cyan sur cyan@${pct}%`).toBeGreaterThanOrEqual(TEXT_AA);
    }
  });

  it('le bandeau « Article d’analyse » reste lisible sur sa teinte violette', () => {
    const bg = color(theme, 'bg-main');
    const tinted = tintOver(color(theme, 'violet'), 7, bg);
    for (const t of ['text-secondary', 'violet-light', 'cyan']) {
      expect(contrastRatio(color(theme, t), tinted), `${t} sur violet@7%`).toBeGreaterThanOrEqual(
        TEXT_AA,
      );
    }
  });

  it('la carte de relations reste lisible sur sa teinte cyan', () => {
    const bg = color(theme, 'bg-main');
    const tinted = tintOver(color(theme, 'cyan'), 8, bg);
    expect(contrastRatio(color(theme, 'cyan'), tinted)).toBeGreaterThanOrEqual(TEXT_AA);
  });

  it('le badge numéroté « Théorie complète » garde un texte lisible sur le dégradé', () => {
    // Le numéro de chapitre (`.theory-section__n`) est posé sur `--gradient-border`
    // (dégradé violet → cyan-dim). On teste ses deux extrémités avec le texte
    // `--bg-main`, dans les deux thèmes.
    const text = color(theme, 'bg-main');
    for (const end of ['violet', 'cyan-dim']) {
      const r = contrastRatio(text, color(theme, end));
      expect(r, `${end} (extrémité du dégradé)`).toBeGreaterThanOrEqual(TEXT_AA);
    }
  });

  it('les éléments posés sur --gradient-border gardent un texte lisible', () => {
    // Motif partagé par `.btn-primary` (accueil, 404), le numéro de chapitre de
    // la « Théorie complète » et le stepper de la chronologie : du texte `--bg-main`
    // sur le dégradé `violet → cyan-dim`. On vérifie ses deux extrémités.
    const text = color(theme, 'bg-main');
    for (const end of ['violet', 'cyan-dim']) {
      const r = contrastRatio(text, color(theme, end));
      expect(r, `${end} (extrémité du dégradé)`).toBeGreaterThanOrEqual(TEXT_AA);
    }
  });

  it('l’indicateur de focus est perceptible (1.4.11)', () => {
    const r = contrastRatio(color(theme, 'cyan'), color(theme, 'bg-main'));
    expect(r).toBeGreaterThanOrEqual(UI_AA);
  });

  it('--border-strong délimite les contrôles interactifs (1.4.11)', () => {
    const raw = token(theme, 'border-strong');
    const m = raw.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    expect(m, `format inattendu : ${raw}`).toBeTruthy();
    const [, r, g, b, a] = m!;
    const composed = compositeOver(
      [Number(r), Number(g), Number(b)],
      Number(a),
      color(theme, 'bg-main'),
    );
    expect(contrastRatio(composed, color(theme, 'bg-main'))).toBeGreaterThanOrEqual(UI_AA);
  });
});

describe('règles de style : pas de texte dilué par l’opacité', () => {
  /**
   * Une opacité faible appliquée à du texte réduit son contraste effectif et
   * échappe à l'audit des tokens. Ces fichiers ont été corrigés : on empêche
   * la réintroduction du motif.
   */
  const GUARDED = [
    'src/components/Footer.astro',
    'src/pages/404.astro',
    'src/components/ParcoursNav.astro',
    'src/components/SidebarNav.astro',
  ];

  it.each(GUARDED)('%s n’applique pas d’opacité < 0.8 à du texte', (file) => {
    const css = readFileSync(join(process.cwd(), file), 'utf8');

    // On inspecte chaque règle CSS : seules celles qui portent du texte sont
    // concernées. Les icônes (`.sidebar-chevron`) sont des indicateurs d'état
    // soumis au seuil 3:1, vérifié séparément, et les valeurs 0 servent aux
    // transitions masqué -> visible.
    const offenders: string[] = [];
    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const opacity = body.match(/opacity:\s*(0?\.\d+)/);
      if (!opacity) continue;
      const value = Number(opacity[1]);
      if (value === 0 || value >= 0.8) continue;
      const name = selector.trim();
      const isIcon = /chevron|icon|svg|::before|::after|caret|dot|wave/i.test(name);
      if (isIcon) continue;
      offenders.push(`${name} (opacity: ${value})`);
    }
    expect(offenders).toEqual([]);
  });
});
