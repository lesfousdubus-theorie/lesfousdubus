export interface WiperMotion {
  phase: number;
  running: boolean;
  cyclesPerSecond: number;
}

// Les deux balais sont couchés vers la gauche, au pied du pare-brise.
export const WIPER_PARK_ANGLE = Math.PI / 2;
const WIPER_FAR_ANGLE = -0.35;
const FULL_TURN = Math.PI * 2;

/** Un cycle continu : la cadence suit progressivement le bus et la pluie. */
export function advanceWiperAngle(
  motion: WiperMotion,
  raining: boolean,
  rainIntensity: number,
  busSpeed: number,
  dt: number,
): number {
  const frameDt = Math.min(Math.max(dt, 0), 0.1);
  if (raining) motion.running = true;
  if (motion.running) {
    if (raining) {
      const intensity = Math.min(1, Math.max(0, rainIntensity));
      const speed = Math.min(3, Math.max(0.3, busSpeed));
      const targetRate = 0.22 + speed * 0.12 + intensity * 0.28;
      motion.cyclesPerSecond += (targetRate - motion.cyclesPerSecond) * Math.min(1, frameDt * 3);
    }
    motion.phase += frameDt * FULL_TURN * motion.cyclesPerSecond;
    if (motion.phase >= FULL_TURN) {
      motion.phase %= FULL_TURN;
      if (!raining) {
        motion.phase = 0;
        motion.running = false;
      }
    }
  }
  // Départ et retour doux à la position de repos, sans saut au changement de météo.
  return WIPER_PARK_ANGLE - (WIPER_PARK_ANGLE - WIPER_FAR_ANGLE) * (1 - Math.cos(motion.phase)) / 2;
}
