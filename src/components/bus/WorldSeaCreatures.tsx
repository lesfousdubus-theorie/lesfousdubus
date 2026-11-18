"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createSeaCreatures, type SeaCreatureModel } from "@/lib/sea-creature-models";
import { WORLD_SPEED, type WorldState } from "./constants";
import { SEA_LEVEL } from "./WorldOcean";

const PERIOD = 20;
const SPRAY = 10;
const SPRAY_DAY_COLOR = new THREE.Color("#bcebf7");
const RING_INNER_DAY_COLOR = new THREE.Color("#d8f5fb");
const RING_OUTER_DAY_COLOR = new THREE.Color("#a8e0f5");
const NIGHT_FOAM_COLOR = new THREE.Color("#2c425e");
const SLOTS = [
  { side: -1, z: 100, offset: 2.6, direction: -1 },
  { side: 1, z: 132, offset: 0.8, direction: -1 },
  { side: -1, z: -47, offset: -5.7, direction: 1 },
  { side: 1, z: -52, offset: -9.3, direction: 1 },
];

interface Effect {
  group: THREE.Group;
  rings: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[];
  spray: THREE.InstancedMesh;
  model: SeaCreatureModel | null;
}

function makeEffects(count: number, lowPower: boolean) {
  const ripple = new THREE.RingGeometry(.90, 1, lowPower ? 20 : 32).rotateX(-Math.PI / 2);
  const droplet = new THREE.IcosahedronGeometry(1, 0);
  const sprayMat = new THREE.MeshBasicMaterial({ color: "#bcebf7" });
  const slots: Effect[] = Array.from({ length: count }, (_, i) => {
    const group = new THREE.Group();
    group.name = `sea-splash-${i}`;
    group.visible = false;
    const rings = Array.from({ length: 3 }, (_, j) => {
      const material = new THREE.MeshBasicMaterial({
        color: j ? "#a8e0f5" : "#d8f5fb", transparent: true, depthWrite: false,
        toneMapped: false, opacity: 0, side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ripple, material);
      ring.position.y = j * .008;
      group.add(ring);
      return ring;
    });
    const spray = new THREE.InstancedMesh(droplet, sprayMat, lowPower ? 4 : SPRAY);
    spray.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    spray.frustumCulled = false;
    group.add(spray);
    return { group, rings, spray, model: null };
  });
  return { slots, ripple, droplet, sprayMat };
}

function animateWater(
  effect: Effect,
  scratch: THREE.Object3D,
  crossing: number,
  strength: number,
  model: SeaCreatureModel,
  daylight: number,
  airborne: boolean,
) {
  const { group, rings, spray } = effect;
  const showRings = !airborne && (model.motion !== "breach" || crossing > 0.01);
  spray.visible = crossing > .06;
  if (!showRings && !spray.visible) {
    group.visible = false;
    return;
  }
  group.visible = true;
  group.rotation.y = model.group.rotation.y;
  const wakeStrength = (model.motion === "breach" ? crossing : strength) * .64;
  for (let index = 0; index < rings.length; index++) {
    const ring = rings[index];
    ring.visible = showRings;
    if (!showRings) continue;
    const pulse = Math.max(0, crossing - index * .29);
    const burst = pulse * (1 - index * .20);
    const size = model.scale * (.84 + index * .36) + burst * 5;
    ring.position.z = -model.scale * (.36 + index * 1.33);
    ring.scale.set(size * .83, 1, size * (1.18 + index * .19));
    ring.material.color.copy(NIGHT_FOAM_COLOR).lerp(index ? RING_OUTER_DAY_COLOR : RING_INNER_DAY_COLOR, daylight);
    ring.material.opacity = Math.min(.88, wakeStrength * (.53 - index * .13) + burst * .56);
  }
  if (!spray.visible) return;
  for (let index = 0; index < spray.count; index++) {
    const angle = index * 2.39996;
    const spread = model.scale * (1.1 - crossing * .6) * (1 + index % 3 * .3);
    const height = (1.55 + (index % 4) * .64) * crossing;
    scratch.position.set(Math.cos(angle) * spread, height, Math.sin(angle) * spread);
    scratch.scale.set(.10 + crossing * .10, .15 + crossing * .20, .10 + crossing * .10);
    scratch.rotation.set(angle, 0, angle);
    scratch.updateMatrix();
    spray.setMatrixAt(index, scratch.matrix);
  }
  spray.instanceMatrix.needsUpdate = true;
}

export default function WorldSeaCreatures({ worldRef, cabinCenterZ, reducedMotion, lowPower }: {
  worldRef: React.RefObject<WorldState>; cabinCenterZ: number; reducedMotion: boolean; lowPower: boolean;
}) {
  const limit = lowPower ? 2 : SLOTS.length;
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .79, emissive: "#182339", emissiveIntensity: .19 }), []);
  const models = useMemo(() => createSeaCreatures(material, lowPower), [material, lowPower]);
  const effects = useMemo(() => makeEffects(limit, lowPower), [limit, lowPower]);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const firstFrame = useRef<number | null>(null);
  const animation = useRef<{ models: SeaCreatureModel[]; slots: Effect[] }>(null);
  const cycleAnchors = useRef(SLOTS.map(() => ({ cycle: Number.NaN, anchorScroll: 0, entryZ: 0 })));

  useLayoutEffect(() => {
    animation.current = { models, slots: effects.slots };
    return () => { animation.current = null; };
  }, [models, effects]);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => {
    for (const model of models) model.group.traverse(child => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
  }, [models]);
  useEffect(() => () => {
    effects.ripple.dispose();
    effects.droplet.dispose();
    effects.sprayMat.dispose();
    effects.slots.forEach(effect => {
      effect.spray.dispose();
      effect.rings.forEach(ring => ring.material.dispose());
    });
  }, [effects]);

  useFrame(({ clock }) => {
    if (!animation.current) return;
    const { models, slots } = animation.current;
    firstFrame.current ??= clock.elapsedTime;
    const time = clock.elapsedTime - firstFrame.current;
    const world = worldRef.current;
    const scroll = world?.scroll ?? 0;
    const daylight = THREE.MathUtils.clamp(world?.daylight ?? 1, 0, 1);
    effects.sprayMat.color.copy(NIGHT_FOAM_COLOR).lerp(SPRAY_DAY_COLOR, daylight);
    const busSpeed = WORLD_SPEED * (world?.speedMultiplier ?? 1) * (world?.motionFactor ?? 1);
    for (let index = 0; index < slots.length; index++) {
      const slot = SLOTS[index];
      const effect = slots[index];
      const anchor = cycleAnchors.current[index];
      const elapsed = time + slot.offset;
      const cycle = Math.floor(elapsed / PERIOD);
      const local = elapsed - cycle * PERIOD;
      const modelIndex = reducedMotion
        ? index
        : ((cycle * slots.length + index) % models.length + models.length) % models.length;
      const model = models[modelIndex];
      const duration = model?.motion === "surface" ? 14.8 : model?.motion === "rise" ? 12.2 : 10.4;
      const active = reducedMotion ? index < 2 : elapsed >= 0 && local < duration && Boolean(model);
      if (effect.model && (!active || effect.model !== model)) {
        effect.model.group.visible = false;
        effect.model = null;
      }
      if (!active || !model) {
        effect.group.visible = false;
        continue;
      }
      const route = index % 2 ? Math.cos(cycle * 2.2) * 12 : Math.sin(cycle * 1.7) * 14;
      if (anchor.cycle !== cycle) {
        anchor.cycle = cycle;
        anchor.anchorScroll = scroll - busSpeed * local;
        anchor.entryZ = cabinCenterZ + (index % 2 ? -12 : 10) + route * 0.6 - duration * 0.5 * busSpeed;
      }
      const swimSpan = model.motion === "rise" ? 16 : 42;
      const p = reducedMotion ? .46 : local / duration;
      const z = reducedMotion
        ? cabinCenterZ + (index === 0 ? 52 : -48)
        : anchor.entryZ + (scroll - anchor.anchorScroll) + slot.direction * (p - .5) * swimSpan;
      const group = model.group;
      if (z < cabinCenterZ - 420 || z > cabinCenterZ + 340) {
        group.visible = false;
        effect.group.visible = false;
        continue;
      }
      effect.model = model;
      group.visible = true;
      const rise = THREE.MathUtils.smoothstep(p, 0, .29);
      const dive = THREE.MathUtils.smoothstep(p, .68, 1);
      const jumpTime = THREE.MathUtils.clamp((p - .20) / .57, 0, 1);
      const arc = model.motion === "breach" && !reducedMotion ? Math.sin(Math.PI * jumpTime) ** 1.70 : 0;
      const surface = reducedMotion
        ? (model.motion === "surface" ? -1.4 : -.8)
        : (model.motion === "surface" ? -1.4 : model.motion === "rise" ? -.8 : -2.4);
      const height = surface - (1 - rise + dive) * 25 + arc * 10.8 + (reducedMotion ? 0 : Math.sin(local * 1.9) * .37);
      // Les plages s'arrêtent à |x| = 52. Les créatures restent au large, nageoires comprises.
      const x = slot.side * (72 + (1 - p) * 8 + Math.sin(p * Math.PI) * 4);
      const heading = Math.atan2(-slot.side * (8 - Math.cos(p * Math.PI) * 12.56), slot.direction * swimSpan);
      const pitch = reducedMotion ? 0 : model.motion === "breach" && jumpTime > 0 && jumpTime < 1
        ? -Math.cos(Math.PI * jumpTime) * Math.sqrt(Math.max(0, arc)) * .65
        : Math.sin(local * 1.24) * .065 + dive * .20 - (1 - rise) * .18;
      group.position.set(x, SEA_LEVEL + height, z);
      group.rotation.set(pitch, heading, reducedMotion ? 0 : Math.sin(local * 1.48) * .06, "YXZ");
      group.scale.setScalar(model.scale);
      for (const joint of model.joints) {
        const angle = reducedMotion ? 0 : Math.sin(local * 2.22 + joint.offset) * joint.amplitude;
        const rotation = joint.group.rotation;
        rotation.set(joint.axis === "x" ? angle : rotation.x, joint.axis === "y" ? angle : rotation.y,
          joint.axis === "z" ? angle : rotation.z);
      }

      if (reducedMotion || p < .15 || p > .95) {
        effect.group.visible = false;
        continue;
      }
      effect.group.position.set(x, SEA_LEVEL + .025, z);
      const crossing = model.motion === "breach"
        ? Math.max(
          1 - Math.abs(p - .28) / .075,
          1 - Math.abs(p - .69) / .075,
        )
        : Math.max(
          1 - Math.abs(p - .24) / .085,
          1 - Math.abs(p - .72) / .075,
        );
      const airborne = model.motion === "breach" && height > 1.2 && crossing <= .02;
      const surfacePresence = rise * (1 - dive) * THREE.MathUtils.smoothstep(height, -6, -1.8);
      animateWater(effect, scratch, Math.max(0, crossing), surfacePresence, model, daylight, airborne);
    }
  });

  return <group name="world-sea-creatures">
    {models.map(model => <primitive key={model.group.name} object={model.group} dispose={null} />)}
    {effects.slots.map(effect => <primitive key={effect.group.name} object={effect.group} dispose={null} />)}
  </group>;
}
