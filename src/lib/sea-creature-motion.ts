import * as THREE from "three";
import type { SeaCreatureMotion } from "./sea-creature-models";

export const SEA_CREATURE_PERIOD = 20;

export function getSeaCreatureDuration(motion: SeaCreatureMotion): number {
  if (motion === "surface") return 13.6;
  if (motion === "rise") return 11.6;
  return 10.0;
}

/** Reproduit la houle du shader de l'océan pour synchroniser le flottement en surface. */
export function sampleOceanSwell(worldX: number, worldZ: number, scroll: number, waterTime: number): number {
  const waveZ = worldZ - scroll;
  const current = Math.sin(worldX * 0.15 + waveZ * 0.26 - waterTime * 1.08);
  const swell = Math.sin(worldX * 0.31 - waveZ * 0.46 - waterTime * 1.53 + current);
  return current * 0.14 + swell * 0.22;
}

export interface SeaCreaturePoseSample {
  x: number;
  height: number;
  vx: number;
  vy: number;
  swimSpeed: number;
  heading: number;
  pitch: number;
  roll: number;
  airborneMix: number;
  jointFrequency: number;
  jointGain: number;
}

function sampleRawHeight(
  motion: SeaCreatureMotion,
  p: number,
  duration: number,
  local: number,
  swell: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) {
    return motion === "surface" ? -1.25 : motion === "rise" ? -0.75 : -2.1;
  }

  if (motion === "breach") {
    const P_EXIT = 0.28;
    const P_ENTRY = 0.58;
    const LAUNCH_Y = -1.2;
    const PEAK_H = 6.8;
    const tAir = (P_ENTRY - P_EXIT) * duration;
    const vLaunch = (4 * PEAK_H) / tAir;
    const tPre = P_EXIT * duration;
    const tPost = (1 - P_ENTRY) * duration;

    if (p < P_EXIT) {
      const s = THREE.MathUtils.clamp(p / P_EXIT, 0, 1);
      const riseDepth = (vLaunch * tPre) / 1.5;
      return LAUNCH_Y - riseDepth * (1 - s * Math.sqrt(s));
    }
    if (p <= P_ENTRY) {
      const u = THREE.MathUtils.clamp((p - P_EXIT) / (P_ENTRY - P_EXIT), 0, 1);
      return LAUNCH_Y + 4 * PEAK_H * u * (1 - u);
    }
    const s = THREE.MathUtils.clamp((p - P_ENTRY) / (1 - P_ENTRY), 0, 1);
    const kPost = 2.6;
    const diveDepth = (vLaunch * tPost) / kPost;
    return LAUNCH_Y - diveDepth * (1 - Math.pow(1 - s, kPost));
  }

  if (motion === "rise") {
    const P_UP = 0.26;
    const P_DOWN = 0.72;
    const depth = -19.0;
    const settleY = -0.75 + swell * 0.65;
    if (p < P_UP) {
      const s = THREE.MathUtils.clamp(p / P_UP, 0, 1);
      const smooth = s * s * (3 - 2 * s);
      // Légère poussée au-dessus de la ligne d'eau puis retour par flottabilité.
      const heave = Math.sin(s * Math.PI) * 1.9;
      return THREE.MathUtils.lerp(depth, settleY + 0.9, smooth) + heave * (1 - s * 0.45);
    }
    if (p <= P_DOWN) {
      const u = THREE.MathUtils.clamp((p - P_UP) / (P_DOWN - P_UP), 0, 1);
      const dampedBob = Math.exp(-u * 3.8) * Math.cos(u * Math.PI * 3.2) * 0.95;
      const swayBob = Math.sin(local * 1.45) * 0.26;
      return settleY + dampedBob + swayBob;
    }
    const s = THREE.MathUtils.clamp((p - P_DOWN) / (1 - P_DOWN), 0, 1);
    const smooth = s * s * (3 - 2 * s);
    return THREE.MathUtils.lerp(settleY, depth, smooth);
  }

  // "surface"
  const P_UP = 0.24;
  const P_DOWN = 0.72;
  const depth = -17.0;
  const surfaceY = -1.25;
  const cruiseWave = Math.sin(Math.max(0, p - 0.14) * Math.PI * 3.5) * 0.42 + swell * 0.78;
  const rise = THREE.MathUtils.smoothstep(p, 0, P_UP);
  const keep = 1 - THREE.MathUtils.smoothstep(p, P_DOWN, 1);
  return THREE.MathUtils.lerp(depth, surfaceY + cruiseWave, rise * keep);
}

function sampleLateralX(
  motion: SeaCreatureMotion,
  p: number,
  side: number,
  cycle: number,
  reducedMotion: boolean,
): number {
  const approach = Math.sin(p * Math.PI) * 3.5;
  const swayFreq = motion === "breach" ? 1.4 : motion === "rise" ? 1.2 : 2.2;
  const swayAmp = reducedMotion || motion === "rise" ? 0.9 : motion === "breach" ? 1.8 : 2.6;
  const sway = reducedMotion ? 0 : Math.sin(p * Math.PI * swayFreq + cycle * 1.15) * swayAmp;
  // Les plages s'arrêtent à |x| = 52 ; la trajectoire reste largement au large (>= 69).
  return side * (77.5 - approach) + sway;
}

export function getSeaCreatureSwimSpeed(motion: SeaCreatureMotion, p: number, busSpeed: number): number {
  const slowGuard = busSpeed < 7 ? 0.72 : 1;
  if (motion === "breach") {
    return (5.6 + Math.sin(THREE.MathUtils.clamp(p, 0, 1) * Math.PI) * 2.8) * slowGuard;
  }
  if (motion === "rise") {
    return 2.1 * slowGuard;
  }
  return (4.5 + Math.sin(p * Math.PI) * 1.1) * slowGuard;
}

/** Échantillonne la position, la vitesse tangentielle et la posture complète d'une créature marine. */
export function sampleSeaCreaturePose(options: {
  motion: SeaCreatureMotion;
  p: number;
  duration: number;
  local: number;
  cycle: number;
  side: number;
  direction: number;
  worldZ: number;
  scroll: number;
  waterTime: number;
  busSpeed: number;
  reducedMotion: boolean;
}): SeaCreaturePoseSample {
  const { motion, p, duration, local, cycle, side, direction, worldZ, scroll, waterTime, busSpeed, reducedMotion } = options;
  const dp = 0.002;
  const dtStep = dp * duration;

  const x = sampleLateralX(motion, p, side, cycle, reducedMotion);
  const swell = reducedMotion ? 0 : sampleOceanSwell(x, worldZ, scroll, waterTime);
  const height = sampleRawHeight(motion, p, duration, local, swell, reducedMotion);

  const pPrev = Math.max(0, p - dp);
  const pNext = Math.min(1, p + dp);
  const spanDt = Math.max(1e-4, (pNext - pPrev) * duration);
  const xPrev = sampleLateralX(motion, pPrev, side, cycle, reducedMotion);
  const xNext = sampleLateralX(motion, pNext, side, cycle, reducedMotion);
  const vx = (xNext - xPrev) / spanDt;

  const swellPrev = reducedMotion ? 0 : sampleOceanSwell(xPrev, worldZ - direction * 0.1, scroll, waterTime - dtStep);
  const swellNext = reducedMotion ? 0 : sampleOceanSwell(xNext, worldZ + direction * 0.1, scroll, waterTime + dtStep);
  const yPrev = sampleRawHeight(motion, pPrev, duration, pPrev * duration, swellPrev, reducedMotion);
  const yNext = sampleRawHeight(motion, pNext, duration, pNext * duration, swellNext, reducedMotion);
  const vy = reducedMotion ? 0 : (yNext - yPrev) / spanDt;

  const swimSpeed = getSeaCreatureSwimSpeed(motion, p, busSpeed);
  const vz = direction * swimSpeed;
  const horizontalSpeed = Math.hypot(vx, vz);

  const heading = reducedMotion
    ? Math.atan2(-side * 0.12, direction)
    : Math.atan2(vx, vz);
  const pitch = reducedMotion
    ? 0
    : -Math.atan2(vy, Math.max(3.2, horizontalSpeed));

  const airborneMix = THREE.MathUtils.smoothstep(height, -0.35, 0.9);
  const turnBank = THREE.MathUtils.clamp((-vx * direction) * 0.07, -0.24, 0.24);
  const jumpBank = motion === "breach" ? Math.sin(THREE.MathUtils.clamp((p - 0.28) / 0.30, 0, 1) * Math.PI) * 0.22 * side : 0;
  const waveRoll = motion === "surface" ? Math.sin(local * 1.48) * 0.08 + swell * 0.12 : Math.sin(local * 1.35) * 0.05;
  const roll = reducedMotion ? 0 : turnBank + jumpBank + waveRoll * (1 - airborneMix * 0.7);

  const effortBoost = vy > 0 && height < 0 ? Math.min(0.45, vy * 0.05) : 0;
  const jointFrequency = 2.45 + effortBoost * 2.2;
  const jointGain = THREE.MathUtils.lerp(1 + effortBoost, 0.24, airborneMix);

  return {
    x,
    height,
    vx,
    vy,
    swimSpeed,
    heading,
    pitch,
    roll,
    airborneMix,
    jointFrequency,
    jointGain,
  };
}
