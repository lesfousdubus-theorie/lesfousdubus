/**
 * Lignes de vitesse manga « vitesse x2 » autour du bus.
 *
 * Comme sur l'image de référence : des lignes droites qui convergent vers
 * un point de fuite devant le bus, donnant l'impression qu'il file à toute
 * vitesse. Logique pure (sans Three.js) : intensité selon la vitesse,
 * grappes de lignes sur un cylindre autour de la coque, fenêtre de défilement
 * qui suit la caméra pour rester dense sur les très longs bus.
 */

export type Vec3 = [number, number, number];

/** Seuil « x2 » : en dessous, aucune ligne de vitesse. */
export const SPEED_LINES_THRESHOLD = 2.0;

/** Hauteur de l'axe du bus (centre de la coque). */
export const SPEED_LINES_AXIS_Y = 1.9;

/** Portée en Z de la fenêtre de défilement (suit la caméra). */
export const SPEED_LINES_WINDOW_SPAN = 32;

/** Palettes aura : violet électrique puis bleu royal (cœur toujours blanc). */
export const SPEED_LINES_PALETTES: readonly (readonly [string, string, string])[] = [
  ["#c084fc", "#d946ef", "#a855f7"],
  ["#60a5fa", "#818cf8", "#4f46e5"],
] as const;

/** Couleur du cœur de chaque ligne. */
export const SPEED_LINES_CORE = "#ffffff" as const;

/**
 * Intensité cible 0..1 pour une vitesse effective (multiplicateur × motionFactor).
 * - < 1.85 : 0 (aucune ligne)
 * - 2.0 : visible (≈0.55), 2.5 : soutenu (≈0.78), 3.0 : maximum (1)
 * Rampe d'entrée douce entre 1.85 et 2.0 pour éviter un clignotement brutal.
 */
export function getSpeedLinesIntensity(effectiveSpeed: number): number {
  if (!Number.isFinite(effectiveSpeed) || effectiveSpeed < 1.85) return 0;
  const entry = Math.min(1, (effectiveSpeed - 1.85) / 0.15);
  const boost = 0.55 + 0.45 * Math.min(1, Math.max(0, effectiveSpeed - SPEED_LINES_THRESHOLD));
  return entry * boost;
}

/** RNG déterministe (mulberry32) pour des lignes reproductibles en test. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SpeedLineSeed {
  /** Angle autour de l'axe du bus (radians). */
  angle: number;
  /** Distance à l'axe (1.8 ≈ collée à la coque, jusqu'à ~6.3). */
  radius: number;
  /** Phase 0..1 dans la fenêtre de défilement. */
  phase: number;
  /** Longueur de la ligne (0.8 à ~4.3). */
  length: number;
  /** Épaisseur du cœur (0.02 à ~0.045). */
  width: number;
  /** Facteur de vitesse relatif (0.7 à 1.5). */
  speedFactor: number;
  /** Index dans SPEED_LINES_PALETTES. */
  paletteIndex: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

/** Graine une grappe bornée de lignes autour de la coque (O(1)). */
export function createSpeedLineSeeds(rng: () => number, count: number): SpeedLineSeed[] {
  const seeds: SpeedLineSeed[] = [];
  for (let i = 0; i < count; i++) {
    seeds.push({
      angle: rng() * Math.PI * 2,
      // Plus dense près de la coque, quelques lignes lointaines.
      radius: 1.8 + Math.pow(rng(), 1.35) * 4.5,
      phase: rng(),
      length: 0.8 + rng() * rng() * 3.5,
      width: 0.02 + rng() * 0.025,
      speedFactor: 0.7 + rng() * 0.8,
      paletteIndex: rng() < 0.5 ? 0 : 1,
    });
  }
  return seeds;
}

/**
 * Fenêtre de défilement qui suit la caméra : les lignes restent denses
 * autour du point de vue, quelle que soit la longueur du bus.
 * Plus d'espace devant la caméra (les lignes arrivent de l'avant).
 */
export function getSpeedLinesWindow(cameraZ: number): { start: number; span: number } {
  return { start: cameraZ - 8, span: SPEED_LINES_WINDOW_SPAN };
}

/** Point de fuite devant la fenêtre : les lignes convergent vers lui. */
export function getSpeedLinesVanishingPoint(windowStart: number): Vec3 {
  return [0, SPEED_LINES_AXIS_Y, windowStart - 6];
}

/**
 * Position d'une ligne à l'instant `time` : elle défile vers l'arrière (+Z)
 * et boucle dans la fenêtre. `speedScale` croît avec l'intensité (x2 → x3).
 */
export function getSpeedLinePosition(
  seed: SpeedLineSeed,
  windowStart: number,
  span: number,
  time: number,
  speedScale: number,
): { position: Vec3; progress: number } {
  const travel = (time * 14 * seed.speedFactor * speedScale) / span;
  const progress = ((seed.phase + travel) % 1 + 1) % 1;
  const z = windowStart + progress * span;
  const x = Math.cos(seed.angle) * seed.radius;
  const y = SPEED_LINES_AXIS_Y + Math.sin(seed.angle) * seed.radius * 0.82;
  return { position: [x, y, z], progress };
}

/** Direction de la ligne : du point de fuite vers la position (effet radiant). */
export function getSpeedLineDirection(position: Vec3, vanishingPoint: Vec3): Vec3 {
  return normalize([position[0] - vanishingPoint[0], position[1] - vanishingPoint[1], position[2] - vanishingPoint[2]]);
}

/** Fondu aux bords de la fenêtre pour masquer l'apparition/disparition. */
export function getSpeedLineFade(progress: number): number {
  const edge = 0.12;
  const inFade = Math.min(progress / edge, (1 - progress) / edge);
  return clamp(inFade, 0, 1);
}
