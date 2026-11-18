/** Crée une graine entière aléatoire pour varier l'ordre des îles et les décors à chaque chargement. */
export function createRandomSeed(): number {
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0] || 2026;
  }
  return Math.floor(Math.random() * 0xffffffff) || 2026;
}

/** Générateur pseudo-aléatoire déterministe (Mulberry32). */
export function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mélange les îles en une boucle complète sans repasser deux fois par la même avant la fin du tour. */
export function createZoneLoopOrder(zoneCount: number, rand: () => number): number[] {
  const order = Array.from({ length: zoneCount }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Calcule la coordonnée Z courante d'une île placée à l'emplacement `slot` dans la boucle. */
export function getZoneSlotCenterZ(
  slot: number,
  scroll: number,
  zoneLength: number,
  loopLength: number,
  loopStart: number,
  loopEnd: number,
): number {
  const initialZ = -40 - slot * zoneLength;
  let z = (((initialZ + scroll - loopStart) % loopLength) + loopLength) % loopLength + loopStart;
  if (z > loopEnd) z -= loopLength;
  return z;
}

/** Détermine l'emplacement actif, l'île correspondante et le numéro de tour à partir de `scroll`. */
export function getActiveZoneLoopState(
  scroll: number,
  zoneOrder: readonly number[],
  zoneLength: number,
): { slot: number; zone: number; visit: number } {
  const count = zoneOrder.length;
  const loopLength = zoneLength * count;
  const normalized = (((scroll + 40) % loopLength) + loopLength) % loopLength;
  const slot = Math.floor(normalized / zoneLength) % count;
  const visit = Math.floor((scroll + 40) / loopLength);
  return {
    slot,
    zone: zoneOrder[slot] ?? 0,
    visit,
  };
}
