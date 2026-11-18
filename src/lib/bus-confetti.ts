export const CONFETTI_COLORS = ["#ff354f", "#ff8e28", "#ffe34c", "#54e671", "#29dacb", "#42bfff", "#4964ff", "#a866ff", "#ff59bb", "#ffffff"];
export const CONFETTI_DENSE_SPAN = 13;

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
  scale: number;
  swirl: number;
  local: boolean;
}

/** Répartition entrelacée pour couvrir uniformément toute la cabine dès les premiers confettis de l'intro. */
export function createConfettiSeeds(count: number, cabinLength: number): ConfettiSeed[] {
  const useLocal = cabinLength > CONFETTI_DENSE_SPAN * 1.4;
  let localIdx = 0;
  let globalIdx = 0;
  return Array.from({ length: count }, (_, i) => {
    const local = useLocal && (i % 10) < 6;
    const layerIndex = local ? localIdx++ : globalIdx++;
    // Suite quasi-aléatoire au nombre d'or : même un sous-ensemble (intro) reste réparti partout.
    const zPos = (layerIndex * 0.6180339887498949 + random(i * 7 + 2) * 0.03) % 1;
    return {
      x: random(i * 7 + 1),
      z: zPos,
      phase: random(i * 7 + 3),
      speed: 0.7 + random(i * 7 + 4) * 0.6,
      spin: random(i * 7 + 5) * Math.PI * 2,
      scale: 0.85 + random(i * 7 + 6) * 0.75,
      swirl: 0.12 + random(i * 7 + 7) * 0.22,
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
