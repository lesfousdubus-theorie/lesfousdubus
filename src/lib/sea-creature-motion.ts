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
    const P_UP = 0.28;
    const P_DOWN = 0.72;
    const depth = -19.0;
    const settleY = -0.75 + swell * 0.62;
    // Courbe C1-continue sans aucun saut à P_UP ni P_DOWN :
    // montée progressive avec léger élan de flottabilité, flottement doux, puis plongée fluide.
    const riseEnv = THREE.MathUtils.smoothstep(p, 0, P_UP);
    const diveEnv = 1 - THREE.MathUtils.smoothstep(p, P_DOWN, 1);
    const presence = riseEnv * diveEnv;
    const heaveWindow = Math.sin(THREE.MathUtils.clamp((p - 0.14) / 0.28, 0, 1) * Math.PI);
    const heave = heaveWindow * heaveWindow * 1.15;
    const bobWindow = THREE.MathUtils.smoothstep(p, 0.20, 0.34) * (1 - THREE.MathUtils.smoothstep(p, 0.62, 0.76));
    const swayBob = Math.sin(local * 1.4) * 0.28 + Math.cos(local * 0.85) * 0.14;
    return THREE.MathUtils.lerp(depth, settleY + heave + swayBob * bobWindow, presence);
  }

  // "surface"
  const P_UP = 0.24;
  const P_DOWN = 0.74;
  const depth = -17.0;
  const surfaceY = -1.2;
  const rise = THREE.MathUtils.smoothstep(p, 0, P_UP);
  const keep = 1 - THREE.MathUtils.smoothstep(p, P_DOWN, 1);
  const presence = rise * keep;
  const cruiseWave = (Math.sin(local * 1.55) * 0.38 + swell * 0.72) * presence;
  return THREE.MathUtils.lerp(depth, surfaceY + cruiseWave, presence);
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
  // Transition continue (sans palier brusque à busSpeed = 7) pour éviter tout à-coup de vitesse ou de tangage.
  const slowGuard = THREE.MathUtils.lerp(0.72, 1, THREE.MathUtils.smoothstep(busSpeed, 4, 10));
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
  const dp = 0.0025;
  const dtStep = dp * duration;

  const x = sampleLateralX(motion, p, side, cycle, reducedMotion);
  const swell = reducedMotion ? 0 : sampleOceanSwell(x, worldZ, scroll, waterTime);
  const height = sampleRawHeight(motion, p, duration, local, swell, reducedMotion);

  const swimSpeed = getSeaCreatureSwimSpeed(motion, p, busSpeed);
  const pPrev = Math.max(0, p - dp);
  const pNext = Math.min(1, p + dp);
  const spanDt = Math.max(1e-4, (pNext - pPrev) * duration);
  const xPrev = sampleLateralX(motion, pPrev, side, cycle, reducedMotion);
  const xNext = sampleLateralX(motion, pNext, side, cycle, reducedMotion);
  const vx = (xNext - xPrev) / spanDt;

  const dzStep = direction * swimSpeed * dtStep;
  const swellPrev = reducedMotion ? 0 : sampleOceanSwell(xPrev, worldZ - dzStep, scroll, waterTime - dtStep);
  const swellNext = reducedMotion ? 0 : sampleOceanSwell(xNext, worldZ + dzStep, scroll, waterTime + dtStep);
  const yPrev = sampleRawHeight(motion, pPrev, duration, pPrev * duration, swellPrev, reducedMotion);
  const yNext = sampleRawHeight(motion, pNext, duration, pNext * duration, swellNext, reducedMotion);
  const vy = reducedMotion ? 0 : (yNext - yPrev) / spanDt;

  const vz = direction * swimSpeed;
  const horizontalSpeed = Math.hypot(vx, vz);

  const heading = reducedMotion
    ? Math.atan2(-side * 0.12, direction)
    : Math.atan2(vx, vz);
  const pitch = reducedMotion
    ? 0
    : -Math.atan2(vy, Math.max(3.6, horizontalSpeed));

  const airborneMix = THREE.MathUtils.smoothstep(height, -0.35, 0.9);
  const turnBank = THREE.MathUtils.clamp((-vx * direction) * 0.065, -0.22, 0.22);
  const jumpBank = motion === "breach" ? Math.sin(THREE.MathUtils.clamp((p - 0.28) / 0.30, 0, 1) * Math.PI) * 0.22 * side : 0;
  const waveRoll = motion === "surface" ? Math.sin(local * 1.48) * 0.075 + swell * 0.11 : Math.sin(local * 1.32) * 0.05;
  const roll = reducedMotion ? 0 : turnBank + jumpBank + waveRoll * (1 - airborneMix * 0.7);

  // Transition continue de l'effort de nage (pas de coupure nette à height = 0 ni vy = 0).
  const underwaterMix = 1 - THREE.MathUtils.smoothstep(height, -1.2, 0.5);
  const riseEffort = THREE.MathUtils.smoothstep(vy, 0, 9.0) * 0.45 * underwaterMix;
  const jointFrequency = 2.4 + riseEffort * 2.1;
  const jointGain = THREE.MathUtils.lerp(1 + riseEffort, 0.24, airborneMix);

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
