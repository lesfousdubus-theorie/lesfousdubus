/**
 * Éclairs manga « vitesse x2 » autour du bus.
 *
 * Logique pure (sans Three.js) : intensité selon la vitesse effective,
 * ancres sur la coque et tracés dentelés à cœur blanc incandescent.
 * Le composant 3D (BusSpeedLightning) consomme ces helpers pour construire
 * des rubans additifs violet électrique / bleu royal comme sur l'affiche
 * de référence.
 */

export type Vec3 = [number, number, number];

/** Seuil « x2 » : en dessous, aucun éclair. */
export const SPEED_LIGHTNING_THRESHOLD = 2.0;

/** Palettes aura : violet électrique puis bleu royal (cœur toujours blanc). */
export const SPEED_LIGHTNING_PALETTES: readonly (readonly [string, string, string])[] = [
  ["#c084fc", "#d946ef", "#a855f7"],
  ["#60a5fa", "#818cf8", "#4f46e5"],
] as const;

/** Couleur du cœur incandescent de chaque arc. */
export const SPEED_LIGHTNING_CORE = "#ffffff" as const;

/**
 * Intensité cible 0..1 pour une vitesse effective (multiplicateur × motionFactor).
 * - < 1.85 : 0 (aucun éclair)
 * - 2.0 : visible (≈0.55), 2.5 : soutenu (≈0.78), 3.0 : maximum (1)
 * Rampe d'entrée douce entre 1.85 et 2.0 pour éviter un clignotement brutal.
 */
export function getSpeedLightningIntensity(effectiveSpeed: number): number {
  if (!Number.isFinite(effectiveSpeed) || effectiveSpeed < 1.85) return 0;
  const entry = Math.min(1, (effectiveSpeed - 1.85) / 0.15);
  const boost = 0.55 + 0.45 * Math.min(1, Math.max(0, effectiveSpeed - SPEED_LIGHTNING_THRESHOLD));
  return entry * boost;
}

/** RNG déterministe (mulberry32) pour des tracés reproductibles en test. */
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

export interface BoltAnchor {
  anchor: Vec3;
  outward: Vec3;
}

export interface BoltPath {
  /** Tracé principal, de la coque vers l'extérieur (segments + 1 points). */
  points: Vec3[];
  /** Fourche secondaire éventuelle, démarrant sur un point du tracé principal. */
  branch: Vec3[] | null;
  /** Index dans SPEED_LIGHTNING_PALETTES. */
  paletteIndex: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

/**
 * Choisit un point d'ancrage sur la coque (nez, flancs, toit, arrière).
 * Répartition bornée O(1) : avant (capot/toit avant), zone caméra/focus,
 * arrière — pour rester lisible même sur un bus de plusieurs centaines
 * de rangées.
 */
export function pickBoltAnchor(
  rng: () => number,
  frontZ: number,
  midZ: number,
  rearZ: number,
): BoltAnchor {
  const roll = rng();
  const zoneZ = roll < 0.4 ? frontZ : roll < 0.75 ? midZ : rearZ;
  const isFront = roll < 0.4;
  const isRear = roll >= 0.75;
  const surface = rng();

  if ((isFront || isRear) && surface < 0.22) {
    // Capot avant / mur arrière.
    return {
      anchor: [(rng() - 0.5) * 1.9, 0.7 + rng() * 1.7, isFront ? -6.18 : rearZ + 0.18],
      outward: [0, 0, isFront ? -1 : 1],
    };
  }
  if (surface < 0.47) {
    // Toit (au-dessus du rehaussement y ≈ 3.42).
    return {
      anchor: [(rng() - 0.5) * 1.7, 3.52 + rng() * 0.12, clamp(zoneZ + (rng() - 0.5) * 1.5, -6.2, rearZ + 0.05)],
      outward: [(rng() - 0.5) * 0.5, 1, 0.15],
    };
  }
  // Flancs (coque x ≈ ±1.35).
  const side = rng() < 0.5 ? -1 : 1;
  return {
    anchor: [side * (1.42 + rng() * 0.08), 0.7 + rng() * 2.4, clamp(zoneZ + (rng() - 0.5) * 1.7, -6.2, rearZ + 0.05)],
    outward: [side, (rng() - 0.5) * 0.35, 0.2],
  };
}

/**
 * Génère un arc dentelé : direction principale vers l'extérieur et vers
 * l'arrière (traînée de vitesse), jitter perpendiculaire marqué pour le
 * côté manga, fourche occasionnelle.
 */
export function createBoltPath(
  rng: () => number,
  anchor: Vec3,
  outward: Vec3,
  segments = 8,
  length = 2.2,
): BoltPath {
  const out = normalize(outward);
  const direction = normalize([
    out[0] + (rng() - 0.5) * 0.5,
    out[1] + (rng() - 0.5) * 0.5,
    out[2] * 0.6 + 0.55 + (rng() - 0.5) * 0.3,
  ]);
  const step = length / segments;
  const points: Vec3[] = [[anchor[0], anchor[1], anchor[2]]];
  for (let i = 1; i <= segments; i++) {
    const prev = points[i - 1];
    points.push([
      prev[0] + direction[0] * step + (rng() - 0.5) * step * 0.95 + out[0] * step * 0.14,
      prev[1] + direction[1] * step + (rng() - 0.5) * step * 0.95 + out[1] * step * 0.14,
      prev[2] + direction[2] * step + (rng() - 0.5) * step * 0.95 + out[2] * step * 0.14,
    ]);
  }

  let branch: Vec3[] | null = null;
  if (rng() < 0.42 && segments >= 4) {
    const startIndex = 1 + Math.floor(rng() * (segments - 2));
    const start = points[startIndex];
    const branchDir = normalize([
      direction[0] + (rng() - 0.5) * 1.3,
      direction[1] + (rng() - 0.5) * 1.3,
      direction[2] + (rng() - 0.5) * 0.8,
    ]);
    const branchStep = step * 0.72;
    branch = [[start[0], start[1], start[2]]];
    for (let i = 1; i <= 3; i++) {
      const prev = branch[i - 1];
      branch.push([
        prev[0] + branchDir[0] * branchStep + (rng() - 0.5) * branchStep * 1.1,
        prev[1] + branchDir[1] * branchStep + (rng() - 0.5) * branchStep * 1.1,
        prev[2] + branchDir[2] * branchStep + (rng() - 0.5) * branchStep * 1.1,
      ]);
    }
  }

  return { points, branch, paletteIndex: rng() < 0.5 ? 0 : 1 };
}

/**
 * Construit une ruban (triangle strip déplié en positions) face caméra :
 * chaque paire de sommets est perpendiculaire à la direction de vue,
 * la largeur s'effile de startWidth à endWidth le long du tracé.
 * Retourne les positions à plat (2 sommets × 3 composantes par point).
 */
export function buildRibbonStrip(
  points: readonly Vec3[],
  startWidth: number,
  endWidth: number,
  camera: Vec3,
): number[] {
  const positions: number[] = [];
  const count = points.length;
  for (let i = 0; i < count; i++) {
    const point = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(count - 1, i + 1)];
    const dir = normalize([next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]]);
    const toCamera = normalize([camera[0] - point[0], camera[1] - point[1], camera[2] - point[2]]);
    // side = dir × toCamera (perpendiculaire à la vue et au tracé).
    let side: Vec3 = normalize([
      dir[1] * toCamera[2] - dir[2] * toCamera[1],
      dir[2] * toCamera[0] - dir[0] * toCamera[2],
      dir[0] * toCamera[1] - dir[1] * toCamera[0],
    ]);
    if (Math.hypot(side[0], side[1], side[2]) < 0.5) side = [1, 0, 0];
    const t = count <= 1 ? 0 : i / (count - 1);
    const half = (startWidth + (endWidth - startWidth) * t) / 2;
    positions.push(
      point[0] - side[0] * half, point[1] - side[1] * half, point[2] - side[2] * half,
      point[0] + side[0] * half, point[1] + side[1] * half, point[2] + side[2] * half,
    );
  }
  return positions;
}

/** Indices d'une ruban de `pointCount` points (2 sommets par point). */
export function buildRibbonIndices(pointCount: number, vertexOffset: number): number[] {
  const indices: number[] = [];
  for (let i = 0; i < pointCount - 1; i++) {
    const a = vertexOffset + i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  return indices;
}

/** Zone d'ancrage avant / focus / arrière bornée pour les très longs bus. */
export function getLightningZones(focusZ: number, rearZ: number): { frontZ: number; midZ: number; rearZ: number } {
  return {
    frontZ: -5.3,
    midZ: clamp(focusZ, -3.8, Math.max(-3.8, rearZ - 0.8)),
    rearZ: Math.max(-3.5, rearZ - 0.4),
  };
}
