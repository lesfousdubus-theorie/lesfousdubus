"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createSeaCreatures, type SeaCreatureModel } from "@/lib/sea-creature-models";
import { SEA_LEVEL } from "./WorldOcean";

const PERIOD = 20;
const SPRAY = 10;
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

function animateWater(effect: Effect, scratch: THREE.Object3D, crossing: number, strength: number, model: SeaCreatureModel) {
  const { group, rings, spray } = effect;
  group.visible = true;
  group.rotation.y = model.group.rotation.y;
  const wakeStrength = strength * .64;
  for (let index = 0; index < rings.length; index++) {
    const ring = rings[index];
    const pulse = Math.max(0, crossing - index * .29);
    const burst = pulse * (1 - index * .20);
    const size = model.scale * (.84 + index * .36) + burst * 5;
    ring.position.z = -model.scale * (.36 + index * 1.33);
    ring.scale.set(size * .83, 1, size * (1.18 + index * .19));
    ring.material.opacity = Math.min(.88, wakeStrength * (.53 - index * .13) + burst * .56);
  }
  spray.visible = crossing > .06;
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

export default function WorldSeaCreatures({ cabinCenterZ, reducedMotion, lowPower }: {
  cabinCenterZ: number; reducedMotion: boolean; lowPower: boolean;
}) {
  const limit = lowPower ? 2 : SLOTS.length;
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .79, emissive: "#182339", emissiveIntensity: .19 }), []);
  const models = useMemo(() => createSeaCreatures(material, lowPower), [material, lowPower]);
  const effects = useMemo(() => makeEffects(limit, lowPower), [limit, lowPower]);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const firstFrame = useRef<number | null>(null);
  const animation = useRef<{ models: SeaCreatureModel[]; slots: Effect[] }>(null);

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
    effects.slots.forEach(effect => effect.rings.forEach(ring => ring.material.dispose()));
  }, [effects]);

  useFrame(({ clock }) => {
    if (!animation.current) return;
    const { models, slots } = animation.current;
    const cycles = Math.ceil(models.length / slots.length);
    firstFrame.current ??= clock.elapsedTime;
    const time = clock.elapsedTime - firstFrame.current;
    for (let index = 0; index < slots.length; index++) {
      const slot = SLOTS[index];
      const effect = slots[index];
      const elapsed = time + slot.offset;
      const cycle = Math.floor(elapsed / PERIOD);
      const local = elapsed - cycle * PERIOD;
      const modelIndex = reducedMotion ? index : cycle % cycles * slots.length + index;
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
      effect.model = model;
      const group = model.group;
      group.visible = true;
      const p = reducedMotion ? .46 : local / duration;
      const rise = THREE.MathUtils.smoothstep(p, 0, .29);
      const dive = THREE.MathUtils.smoothstep(p, .68, 1);
      const jumpTime = THREE.MathUtils.clamp((p - .20) / .57, 0, 1);
      const arc = model.motion === "breach" && !reducedMotion ? Math.sin(Math.PI * jumpTime) ** 1.70 : 0;
      const surface = model.motion === "surface" ? -1.4 : model.motion === "rise" ? -.8 : -2.4;
      const height = surface - (1 - rise + dive) * 25 + arc * 10.8 + (reducedMotion ? 0 : Math.sin(local * 1.9) * .37);
      const route = index % 2 ? Math.cos(cycle * 2.2) * 12 : Math.sin(cycle * 1.7) * 14;
      // Les plages s'arrêtent à |x| = 52. Les créatures restent au large, nageoires comprises.
      const x = slot.side * (72 + (1 - p) * 8 + Math.sin(p * Math.PI) * 4);
      const z = cabinCenterZ + slot.z + route + slot.direction * (p - .5) * 46;
      const heading = Math.atan2(-slot.side * (8 - Math.cos(p * Math.PI) * 12.56), slot.direction * 46);
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
      const crossing = Math.max(
        1 - Math.abs(p - .23) / .095,
        1 - Math.abs(p - .80) / .113,
        model.motion === "breach" ? 1 - Math.abs(p - .68) / .075 : 0,
      );
      animateWater(effect, scratch, Math.max(0, crossing), rise * (1 - dive), model);
    }
  });

  return <group name="world-sea-creatures">
    {models.map(model => <primitive key={model.group.name} object={model.group} dispose={null} />)}
    {effects.slots.map(effect => <primitive key={effect.group.name} object={effect.group} dispose={null} />)}
  </group>;
}
