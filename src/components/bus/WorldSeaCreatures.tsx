"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createSeaCreatures, type SeaCreatureModel } from "@/lib/sea-creature-models";
import {
  SEA_CREATURE_PERIOD,
  getSeaCreatureDuration,
  getSeaCreatureSwimSpeed,
  sampleSeaCreaturePose,
} from "@/lib/sea-creature-motion";
import { WORLD_SPEED, type WorldState } from "./constants";
import { SEA_LEVEL, SEA_WAKE_COUNT } from "./WorldOcean";

const SPRAY_HIGH = 18;
const SPRAY_LOW = 7;
const SPLASH_GRAVITY = 15.0;
const SPRAY_DAY_COLOR = new THREE.Color("#d9f6fd");
const RING_INNER_DAY_COLOR = new THREE.Color("#e8fbff");
const RING_OUTER_DAY_COLOR = new THREE.Color("#9fe0f5");
const NIGHT_FOAM_COLOR = new THREE.Color("#2c425e");

const SLOTS = [
  { side: -1, z: 100, offset: 2.6, direction: -1 },
  { side: 1, z: 132, offset: 0.8, direction: -1 },
  { side: -1, z: -47, offset: -5.7, direction: 1 },
  { side: 1, z: -52, offset: -9.3, direction: 1 },
];

interface SplashGroup {
  group: THREE.Group;
  rings: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[];
  spray: THREE.InstancedMesh;
}

interface EffectSlot {
  exit: SplashGroup;
  entry: SplashGroup;
}

interface BurstState {
  active: boolean;
  fired: boolean;
  x: number;
  z: number;
  heading: number;
  age: number;
  life: number;
  power: number;
  scale: number;
}

interface SlotTrackState {
  cycle: number;
  waterZ: number;
  prevLocal: number;
  diveFired: boolean;
  jointPhase: number;
  poseInit: boolean;
  smoothY: number;
  smoothHeading: number;
  smoothPitch: number;
  smoothRoll: number;
  exit: BurstState;
  entry: BurstState;
}

function lerpAngle(current: number, target: number, alpha: number) {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * alpha;
}

function fractHash(seed: number) {
  const x = Math.sin(seed) * 43758.5453123;
  return x - Math.floor(x);
}

function makeBurstState(): BurstState {
  return { active: false, fired: false, x: 0, z: 0, heading: 0, age: 0, life: 2.2, power: 1, scale: 2.8 };
}

function makeSlotTrackState(): SlotTrackState {
  return {
    cycle: Number.NaN,
    waterZ: 0,
    prevLocal: 0,
    diveFired: false,
    jointPhase: 0,
    poseInit: false,
    smoothY: -18,
    smoothHeading: 0,
    smoothPitch: 0,
    smoothRoll: 0,
    exit: makeBurstState(),
    entry: makeBurstState(),
  };
}

function createSplashGroup(
  name: string,
  ripple: THREE.RingGeometry,
  droplet: THREE.IcosahedronGeometry,
  sprayMat: THREE.MeshBasicMaterial,
  sprayCount: number,
): SplashGroup {
  const group = new THREE.Group();
  group.name = name;
  group.visible = false;
  const rings = Array.from({ length: 4 }, (_, j) => {
    const material = new THREE.MeshBasicMaterial({
      color: j < 2 ? "#e8fbff" : "#9fe0f5",
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ripple, material);
    ring.position.y = j * 0.008;
    group.add(ring);
    return ring;
  });
  const spray = new THREE.InstancedMesh(droplet, sprayMat, sprayCount);
  spray.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  spray.frustumCulled = false;
  group.add(spray);
  return { group, rings, spray };
}

function makeEffects(count: number, lowPower: boolean) {
  const ripple = new THREE.RingGeometry(0.84, 1, lowPower ? 20 : 32).rotateX(-Math.PI / 2);
  const droplet = new THREE.IcosahedronGeometry(1, 0);
  const sprayMat = new THREE.MeshBasicMaterial({
    color: "#d9f6fd",
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    toneMapped: false,
  });
  const sprayCount = lowPower ? SPRAY_LOW : SPRAY_HIGH;
  const slots: EffectSlot[] = Array.from({ length: count }, (_, i) => ({
    exit: createSplashGroup(`sea-exit-splash-${i}`, ripple, droplet, sprayMat, sprayCount),
    entry: createSplashGroup(`sea-entry-splash-${i}`, ripple, droplet, sprayMat, sprayCount),
  }));
  return { slots, ripple, droplet, sprayMat };
}

function animateBurst(
  emitter: SplashGroup,
  burst: BurstState,
  scratch: THREE.Object3D,
  daylight: number,
  seedSalt: number,
): { radius: number; strength: number } {
  if (!burst.active || burst.age >= burst.life) {
    burst.active = false;
    emitter.group.visible = false;
    return { radius: 1, strength: 0 };
  }

  const p = burst.age / burst.life;
  emitter.group.visible = true;
  emitter.group.position.set(burst.x, SEA_LEVEL + 0.03, burst.z);
  emitter.group.rotation.y = burst.heading;

  let outerRadius = burst.scale;
  for (let j = 0; j < emitter.rings.length; j++) {
    const ring = emitter.rings[j];
    const delay = j * 0.14;
    const ringAge = burst.age - delay;
    if (ringAge <= 0) {
      ring.visible = false;
      continue;
    }
    const rp = Math.min(1, ringAge / (burst.life - delay));
    ring.visible = rp < 1;
    // La propagation des ondes circulaires croît en sqrt(t).
    const radius = burst.scale * (0.85 + j * 0.25) + Math.sqrt(rp) * burst.power * (5.2 + j * 1.45);
    if (j === 0) outerRadius = radius;
    ring.position.z = 0;
    ring.scale.set(radius * 0.92, 1, radius * 1.08);
    ring.material.color
      .copy(NIGHT_FOAM_COLOR)
      .lerp(j < 2 ? RING_INNER_DAY_COLOR : RING_OUTER_DAY_COLOR, daylight);
    const fadeIn = Math.min(1, ringAge / 0.14);
    const fadeOut = Math.pow(Math.max(0, 1 - rp), 1.55);
    ring.material.opacity = Math.min(0.88, fadeIn * fadeOut * (0.76 - j * 0.13) * Math.min(1.2, burst.power));
  }

  const sprayVisible = burst.age < 1.55;
  emitter.spray.visible = sprayVisible;
  if (sprayVisible) {
    const count = emitter.spray.count;
    const power = burst.power;
    for (let i = 0; i < count; i++) {
      const h1 = fractHash(i * 17.3 + seedSalt * 11.1);
      const h2 = fractHash(i * 31.7 + seedSalt * 23.9);
      const h3 = fractHash(i * 47.9 + seedSalt * 5.3);
      const angle = i * 2.39996 + h1 * 0.45;
      const vr = (1.6 + h2 * 3.8) * power;
      const vy0 = (4.6 + h3 * 5.8) * power;
      const t = burst.age + h1 * 0.05;
      const y = vy0 * t - 0.5 * SPLASH_GRAVITY * t * t;
      if (y <= 0.03) {
        scratch.position.set(0, -1, 0);
        scratch.scale.setScalar(0);
        scratch.updateMatrix();
        emitter.spray.setMatrixAt(i, scratch.matrix);
        continue;
      }
      const r = burst.scale * (0.32 + h1 * 0.42) + vr * t;
      const vyNow = vy0 - SPLASH_GRAVITY * t;
      const baseSize = (0.09 + h2 * 0.09) * Math.max(0.85, burst.scale * 0.35);
      const stretch = 1.15 + Math.min(1.9, Math.abs(vyNow) * 0.16);
      scratch.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      scratch.rotation.set(0, -angle, Math.atan2(vyNow, Math.max(0.8, vr)) - Math.PI / 2);
      scratch.scale.set(baseSize, baseSize * stretch, baseSize);
      scratch.updateMatrix();
      emitter.spray.setMatrixAt(i, scratch.matrix);
    }
    emitter.spray.instanceMatrix.needsUpdate = true;
  }

  const fade = Math.pow(Math.max(0, 1 - p), 1.4);
  return { radius: Math.max(outerRadius, burst.scale * 1.6), strength: Math.min(1, fade * burst.power * 0.9) };
}

function animateSurfaceWake(
  emitter: SplashGroup,
  scratch: THREE.Object3D,
  x: number,
  z: number,
  heading: number,
  scale: number,
  localTime: number,
  strength: number,
  daylight: number,
): { radius: number; strength: number } {
  if (strength <= 0.04) {
    emitter.group.visible = false;
    return { radius: 1, strength: 0 };
  }

  emitter.group.visible = true;
  emitter.group.position.set(x, SEA_LEVEL + 0.025, z);
  emitter.group.rotation.y = heading;

  let outerRadius = scale;
  for (let j = 0; j < emitter.rings.length; j++) {
    const ring = emitter.rings[j];
    const phase = (localTime * 0.65 + j * 0.25) % 1;
    ring.visible = true;
    const size = scale * (0.85 + phase * 1.45);
    if (j === 2) outerRadius = size;
    ring.position.z = -scale * (0.25 + phase * 1.85);
    ring.scale.set(size * (0.78 + phase * 0.22), 1, size * 1.18);
    ring.material.color
      .copy(NIGHT_FOAM_COLOR)
      .lerp(j < 2 ? RING_INNER_DAY_COLOR : RING_OUTER_DAY_COLOR, daylight);
    ring.material.opacity = Math.min(0.68, strength * (1 - phase) * 0.56);
  }

  emitter.spray.visible = true;
  const count = emitter.spray.count;
  for (let i = 0; i < count; i++) {
    const cycleSpan = 0.72;
    const t = (localTime * 1.15 + i * (cycleSpan / count)) % cycleSpan;
    const h1 = fractHash(i * 19.1 + Math.floor((localTime * 1.15) / cycleSpan));
    const side = i % 2 === 0 ? 1 : -1;
    const lateral = scale * (0.55 + h1 * 0.45) * side + side * t * 2.2;
    const back = scale * (0.35 - (i % 4) * 0.55) - t * 3.4;
    const vy0 = 2.4 + h1 * 1.9;
    const y = vy0 * t - 0.5 * SPLASH_GRAVITY * t * t;
    if (y <= 0.02) {
      scratch.position.set(0, -1, 0);
      scratch.scale.setScalar(0);
      scratch.updateMatrix();
      emitter.spray.setMatrixAt(i, scratch.matrix);
      continue;
    }
    const drop = (0.06 + h1 * 0.05) * strength;
    scratch.position.set(lateral, y, back);
    scratch.rotation.set(0, 0, 0);
    scratch.scale.set(drop, drop * 1.4, drop);
    scratch.updateMatrix();
    emitter.spray.setMatrixAt(i, scratch.matrix);
  }
  emitter.spray.instanceMatrix.needsUpdate = true;

  return { radius: Math.max(outerRadius, scale * 2.2), strength: strength * 0.58 };
}

export default function WorldSeaCreatures({
  worldRef,
  wakesRef,
  cabinCenterZ,
  reducedMotion,
  lowPower,
  slotLimit,
  cullAhead,
  cullBehind,
}: {
  worldRef: React.RefObject<WorldState>;
  wakesRef?: React.RefObject<THREE.Vector4[]>;
  cabinCenterZ: number;
  reducedMotion: boolean;
  lowPower: boolean;
  slotLimit?: number;
  cullAhead?: number;
  cullBehind?: number;
}) {
  const limit = Math.max(1, Math.min(SLOTS.length, slotLimit ?? (lowPower ? 2 : SLOTS.length)));
  const maxAhead = cullAhead ?? 420;
  const maxBehind = cullBehind ?? 340;
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.79, emissive: "#182339", emissiveIntensity: 0.19 }),
    [],
  );
  const models = useMemo(() => createSeaCreatures(material, lowPower), [material, lowPower]);
  const effects = useMemo(() => makeEffects(limit, lowPower), [limit, lowPower]);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const firstFrame = useRef<number | null>(null);
  const prevScroll = useRef<number | null>(null);
  const needsEffectsReset = useRef(true);
  const animation = useRef<{ models: SeaCreatureModel[]; slots: EffectSlot[] }>(null);
  const trackStates = useRef<SlotTrackState[]>(SLOTS.map(() => makeSlotTrackState()));

  useLayoutEffect(() => {
    trackStates.current = SLOTS.map(() => makeSlotTrackState());
    prevScroll.current = null;
    needsEffectsReset.current = true;
    animation.current = { models, slots: effects.slots };
    const wakes = wakesRef?.current;
    return () => {
      if (wakes) {
        for (let i = 0; i < SEA_WAKE_COUNT; i++) wakes[i]?.set(0, 0, 1, 0);
      }
      animation.current = null;
    };
  }, [models, effects, wakesRef]);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => {
    for (const model of models) {
      model.group.traverse((child) => {
        if (child instanceof THREE.Mesh) child.geometry.dispose();
      });
    }
  }, [models]);
  useEffect(() => () => {
    effects.ripple.dispose();
    effects.droplet.dispose();
    effects.sprayMat.dispose();
    effects.slots.forEach((slotEffect) => {
      for (const group of [slotEffect.exit, slotEffect.entry]) {
        group.spray.dispose();
        group.rings.forEach((ring) => ring.material.dispose());
      }
    });
  }, [effects]);

  useFrame(({ clock }) => {
    if (!animation.current) return;
    const { models: activeModels, slots } = animation.current;
    // Garantie stricte : aucun modèle marin ne peut rester visible hors d'un créneau actif.
    for (let i = 0; i < activeModels.length; i++) {
      activeModels[i].group.visible = false;
    }
    if (needsEffectsReset.current) {
      needsEffectsReset.current = false;
      for (let i = 0; i < slots.length; i++) {
        slots[i].exit.group.visible = false;
        slots[i].entry.group.visible = false;
      }
    }

    firstFrame.current ??= clock.elapsedTime;
    const time = clock.elapsedTime - firstFrame.current;
    const world = worldRef.current;
    const scroll = world?.scroll ?? 0;
    const dScroll = prevScroll.current === null ? 0 : Math.max(0, scroll - prevScroll.current);
    prevScroll.current = scroll;

    const daylight = THREE.MathUtils.clamp(world?.daylight ?? 1, 0, 1);
    effects.sprayMat.color.copy(NIGHT_FOAM_COLOR).lerp(SPRAY_DAY_COLOR, daylight);
    const busSpeed = WORLD_SPEED * (world?.speedMultiplier ?? 1) * (world?.motionFactor ?? 1);
    const wakes = wakesRef?.current;

    for (let index = 0; index < SEA_WAKE_COUNT; index++) {
      if (wakes && wakes[index]) wakes[index].set(0, 0, 1, 0);
    }

    // Sur un très long bus (ex. 20 000 passagers), ancrer les monstres marins autour des
    // premiers wagons (portes 1 à 5, z ≈ -15 à +85 m) au lieu du milieu du bus à 3,3 km.
    const anchorBaseZ = Math.min(cabinCenterZ, 30);
    const doorZoneSpread = cabinCenterZ > 45 ? 46 : Math.max(12, Math.min(36, Math.abs(cabinCenterZ) + 18));

    for (let index = 0; index < slots.length; index++) {
      const slot = SLOTS[index];
      const effect = slots[index];
      const track = trackStates.current[index];
      const elapsed = time + slot.offset;
      const cycle = Math.floor(elapsed / SEA_CREATURE_PERIOD);
      const local = elapsed - cycle * SEA_CREATURE_PERIOD;
      const modelIndex = reducedMotion
        ? index
        : ((cycle * slots.length + index) % activeModels.length + activeModels.length) % activeModels.length;
      const model = activeModels[modelIndex];
      const duration = model ? getSeaCreatureDuration(model.motion) : 10.0;
      const active = reducedMotion ? index < 2 : elapsed >= 0 && local < duration && Boolean(model);

      if (track.exit.active) {
        track.exit.z += dScroll;
      }
      if (track.entry.active) {
        track.entry.z += dScroll;
      }

      if (!active || !model) {
        // Laisse les ondes résiduelles d'impact se dissiper sur l'eau après le plongeon.
        const stepOff = Math.max(0, local - track.prevLocal);
        track.prevLocal = local;
        if (track.exit.active) track.exit.age += stepOff;
        if (track.entry.active) track.entry.age += stepOff;
        const exitWake = animateBurst(effect.exit, track.exit, scratch, daylight, index * 3 + 1);
        const entryWake = animateBurst(effect.entry, track.entry, scratch, daylight, index * 3 + 2);
        if (wakes && wakes[index]) {
          if (entryWake.strength > 0.01) {
            wakes[index].set(track.entry.x, track.entry.z, entryWake.radius, entryWake.strength);
          } else if (exitWake.strength > 0.01) {
            wakes[index].set(track.exit.x, track.exit.z, exitWake.radius, exitWake.strength);
          }
        }
        continue;
      }

      const route = index % 2 ? Math.cos(cycle * 2.2) * 12 : Math.sin(cycle * 1.7) * 14;
      const p = reducedMotion ? 0.46 : THREE.MathUtils.clamp(local / duration, 0, 1);

      if (track.cycle !== cycle) {
        track.cycle = cycle;
        track.prevLocal = local;
        track.diveFired = false;
        track.jointPhase = local * 2.4;
        track.poseInit = false;
        track.exit = makeBurstState();
        track.entry = makeBurstState();
        const baseSwimSpeed = getSeaCreatureSwimSpeed(model.motion, p, busSpeed);
        const netRelVz = busSpeed + slot.direction * baseSwimSpeed;
        const cycleOffset = (fractHash(cycle * 37.3 + index * 13.7 + 0.5) - 0.5) * 2 * doorZoneSpread;
        const focusAnchor = anchorBaseZ + cycleOffset + route * 0.35;
        track.waterZ = focusAnchor - (duration * 0.45 - local) * netRelVz;
      }

      const stepDt = reducedMotion ? 0 : Math.max(0, Math.min(0.1, local - track.prevLocal));
      track.prevLocal = local;

      const previewZ = reducedMotion
        ? anchorBaseZ + (index === 0 ? 34 : -14)
        : track.waterZ + dScroll;

      const pose = sampleSeaCreaturePose({
        motion: model.motion,
        p,
        duration,
        local,
        cycle,
        side: slot.side,
        direction: slot.direction,
        worldZ: previewZ,
        scroll,
        waterTime: time,
        busSpeed,
        reducedMotion,
      });

      const z = reducedMotion
        ? previewZ
        : previewZ + slot.direction * pose.swimSpeed * stepDt;
      track.waterZ = z;

      const group = model.group;
      if (z < anchorBaseZ - maxAhead || z > anchorBaseZ + maxBehind) {
        effect.exit.group.visible = false;
        effect.entry.group.visible = false;
        continue;
      }

      // Enfoncement doux sous l'eau près des limites d'affichage pour éviter tout pop-in / pop-out brutal.
      const aheadFade = THREE.MathUtils.smoothstep(z, anchorBaseZ - maxAhead, anchorBaseZ - maxAhead + 42);
      const behindFade = 1 - THREE.MathUtils.smoothstep(z, anchorBaseZ + maxBehind - 42, anchorBaseZ + maxBehind);
      const horizonSink = (1 - aheadFade * behindFade) * 18.0;
      const targetY = SEA_LEVEL + pose.height - horizonSink;

      if (!track.poseInit || reducedMotion) {
        track.poseInit = true;
        track.smoothY = targetY;
        track.smoothHeading = pose.heading;
        track.smoothPitch = pose.pitch;
        track.smoothRoll = pose.roll;
      } else {
        // Amortissement organique des rotations et de la hauteur pour un mouvement fluide et massif.
        const posAlpha = 1 - Math.exp(-stepDt * 14);
        const rotAlpha = 1 - Math.exp(-stepDt * 9.5);
        track.smoothY += (targetY - track.smoothY) * posAlpha;
        track.smoothHeading = lerpAngle(track.smoothHeading, pose.heading, rotAlpha);
        track.smoothPitch += (pose.pitch - track.smoothPitch) * rotAlpha;
        track.smoothRoll += (pose.roll - track.smoothRoll) * rotAlpha;
      }

      // Intégration continue de la phase d'ondulation (empêche tout saut brutal des nageoires/queues).
      track.jointPhase += stepDt * pose.jointFrequency;

      group.visible = true;
      group.position.set(pose.x, track.smoothY, z);
      group.rotation.set(track.smoothPitch, track.smoothHeading, track.smoothRoll, "YXZ");
      group.scale.setScalar(model.scale);

      for (const joint of model.joints) {
        const angle = reducedMotion
          ? 0
          : Math.sin(track.jointPhase + joint.offset) * joint.amplitude * pose.jointGain;
        const rotation = joint.group.rotation;
        rotation.set(
          joint.axis === "x" ? angle : rotation.x,
          joint.axis === "y" ? angle : rotation.y,
          joint.axis === "z" ? angle : rotation.z,
        );
      }

      if (reducedMotion) {
        effect.exit.group.visible = false;
        effect.entry.group.visible = false;
        continue;
      }

      if (track.exit.active) track.exit.age += stepDt;
      if (track.entry.active) track.entry.age += stepDt;

      let chosenWake = { x: pose.x, z, radius: 1, strength: 0 };

      if (model.motion === "breach") {
        // Gerbe et onde de sortie quand la créature perce la surface vers le haut.
        if (!track.exit.fired && p >= 0.22 && pose.vy > 0 && pose.height >= -1.45) {
          track.exit = {
            active: true,
            fired: true,
            x: pose.x,
            z,
            heading: pose.heading,
            age: 0,
            life: 2.25,
            power: Math.min(1.45, Math.max(0.85, pose.vy / 8.5)) * (model.scale / 3.0),
            scale: model.scale,
          };
        }
        // Plongeon : onde puissante et gerbe verticale au retour dans l'océan.
        if (!track.entry.fired && (track.exit.fired || p >= 0.45) && pose.vy < -1.0 && pose.height <= 0.45) {
          track.entry = {
            active: true,
            fired: true,
            x: pose.x,
            z,
            heading: pose.heading,
            age: 0,
            life: 2.55,
            power: Math.min(1.75, Math.max(1.05, Math.abs(pose.vy) / 7.2)) * (model.scale / 2.85),
            scale: model.scale * 1.08,
          };
        }

        const exitWake = animateBurst(effect.exit, track.exit, scratch, daylight, index * 7 + cycle);
        const entryWake = animateBurst(effect.entry, track.entry, scratch, daylight, index * 11 + cycle);

        if (entryWake.strength >= exitWake.strength && entryWake.strength > 0.01) {
          chosenWake = { x: track.entry.x, z: track.entry.z, ...entryWake };
        } else if (exitWake.strength > 0.01) {
          chosenWake = { x: track.exit.x, z: track.exit.z, ...exitWake };
        }
      } else {
        // Émersion, sillage continu en surface puis remous de plongée.
        if (!track.exit.fired && pose.vy > 0.3 && pose.height >= -2.1) {
          track.exit = {
            active: true,
            fired: true,
            x: pose.x,
            z,
            heading: pose.heading,
            age: 0,
            life: 2.0,
            power: (model.motion === "rise" ? 1.15 : 0.85) * (model.scale / 3.0),
            scale: model.scale,
          };
        }
        if (!track.diveFired && p >= 0.70 && pose.vy < -0.8 && pose.height <= -0.95) {
          track.diveFired = true;
          track.entry = {
            active: true,
            fired: true,
            x: pose.x,
            z,
            heading: pose.heading,
            age: 0,
            life: 2.1,
            power: 0.95 * (model.scale / 3.0),
            scale: model.scale,
          };
        }

        const exitWake = animateBurst(effect.exit, track.exit, scratch, daylight, index * 7 + cycle);
        let swimWake = { radius: 1, strength: 0 };
        if (track.diveFired) {
          swimWake = animateBurst(effect.entry, track.entry, scratch, daylight, index * 13 + cycle);
          if (swimWake.strength > 0.01) {
            chosenWake = { x: track.entry.x, z: track.entry.z, ...swimWake };
          }
        } else {
          const surfacePresence = THREE.MathUtils.smoothstep(pose.height, -4.2, -1.2);
          swimWake = animateSurfaceWake(
            effect.entry,
            scratch,
            pose.x,
            z,
            pose.heading,
            model.scale,
            local,
            surfacePresence,
            daylight,
          );
          if (swimWake.strength >= exitWake.strength && swimWake.strength > 0.01) {
            chosenWake = { x: pose.x, z, ...swimWake };
          } else if (exitWake.strength > 0.01) {
            chosenWake = { x: track.exit.x, z: track.exit.z, ...exitWake };
          }
        }
      }

      if (wakes && wakes[index] && chosenWake.strength > 0.01) {
        wakes[index].set(chosenWake.x, chosenWake.z, chosenWake.radius, chosenWake.strength);
      }
    }
  });

  return (
    <group name="world-sea-creatures">
      {models.map((model) => (
        <primitive key={model.group.name} object={model.group} dispose={null} />
      ))}
      {effects.slots.map((slotEffect) => (
        <group key={slotEffect.exit.group.name}>
          <primitive object={slotEffect.exit.group} dispose={null} />
          <primitive object={slotEffect.entry.group} dispose={null} />
        </group>
      ))}
    </group>
  );
}
