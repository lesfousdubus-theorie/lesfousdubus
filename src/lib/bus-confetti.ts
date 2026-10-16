export const CONFETTI_COLORS = ["#ff354f", "#ff8e28", "#ffe34c", "#54e671", "#29dacb", "#42bfff", "#4964ff", "#a866ff", "#ff59bb", "#ffffff"];
export const CONFETTI_DENSE_SPAN = 10;

const random = (seed: number) => {
  const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};

export interface ConfettiSeed {
  x: number;
  z: number;
  phase: number;
  speed: number;
  spin: number;
  local: boolean;
}

/** Chaque strate couvre un morceau de cabine : les extrémités restent peuplées. */
export function createConfettiSeeds(count: number, cabinLength: number): ConfettiSeed[] {
  const globalCount = cabinLength > CONFETTI_DENSE_SPAN * 1.4 ? Math.ceil(count * 0.6) : count;
  return Array.from({ length: count }, (_, i) => {
    const local = i >= globalCount;
    const layerIndex = local ? i - globalCount : i;
    const layerCount = local ? count - globalCount : globalCount;
    return {
      x: random(i * 7 + 1),
      z: (layerIndex + random(i * 7 + 2)) / layerCount,
      phase: random(i * 7 + 3),
      speed: 0.7 + random(i * 7 + 4) * 0.6,
      spin: random(i * 7 + 5) * Math.PI * 2,
      local,
    };
  });
}

export function getConfettiZ(seed: ConfettiSeed, from: number, to: number, focusZ: number): number {
  if (!seed.local) return from + (to - from) * seed.z;
  const length = Math.min(CONFETTI_DENSE_SPAN, to - from);
  const start = Math.max(from, Math.min(to - length, focusZ - length / 2));
  return start + length * seed.z;
}
