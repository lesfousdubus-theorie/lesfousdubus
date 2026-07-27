/**
 * Utilitaires de contraste WCAG 2.1.
 *
 * Servent au test de non-régression `tests/contrast.test.ts`, qui vérifie que
 * les couples texte/fond du thème sombre et du thème clair restent au-dessus
 * des seuils AA (4.5:1 pour le texte courant, 3:1 pour les éléments d'interface
 * et le texte agrandi).
 */

export type RGB = [number, number, number];

/** Convertit `#rgb` ou `#rrggbb` en composantes sRGB 0-255. */
export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Luminance relative (WCAG 2.1, formule officielle). */
export function relativeLuminance([r, g, b]: RGB): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Rapport de contraste entre deux couleurs opaques (1 à 21). */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Composite `fg` avec une opacité `alpha` (0-1) au-dessus de `bg`. */
export function compositeOver(fg: RGB, alpha: number, bg: RGB): RGB {
  return fg.map((c, i) => c * alpha + bg[i] * (1 - alpha)) as RGB;
}

/**
 * Équivalent de `color-mix(in srgb, <couleur> <pct>%, transparent)` rendu
 * au-dessus de `bg` : une teinte translucide se comporte comme la couleur
 * appliquée avec une opacité de `pct`%.
 */
export function tintOver(color: RGB, pct: number, bg: RGB): RGB {
  return compositeOver(color, pct / 100, bg);
}
