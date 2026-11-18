"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BUS_FRONT_Z } from "@/lib/bus-layout";
import { CONFETTI_COLORS, createConfettiSeeds, getConfettiZ } from "@/lib/bus-confetti";

/** Un seul draw call : modéré pendant l'intro, dense dès que la danse démarre. */
export default function BusConfetti({ focusZ, rearZ, lowPower, reducedMotion, dancing = false }: {
  focusZ: number; rearZ: number; lowPower: boolean; reducedMotion: boolean; dancing?: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const maxCount = lowPower ? 750 : 2400;
  const introCount = lowPower ? 80 : 180;
  const from = BUS_FRONT_Z + 0.35;
  const to = rearZ - 0.35;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const cameraLocal = useMemo(() => new THREE.Vector3(), []);
  const seeds = useMemo(() => createConfettiSeeds(maxCount, to - from), [maxCount, from, to]);
  const started = useRef<number | null>(null);
  const activeCountRef = useRef(dancing ? maxCount : introCount);
  const color = useMemo(() => new THREE.Color(), []);
  const instancedArgs = useMemo<[undefined, undefined, number]>(
    () => [undefined, undefined, maxCount],
    [maxCount],
  );

  useLayoutEffect(() => {
    if (!mesh.current) return;
    seeds.forEach((seed, i) => {
      mesh.current!.setColorAt(i, color.set(CONFETTI_COLORS[i % CONFETTI_COLORS.length]));
      dummy.position.set(
        (seed.x - 0.5) * 1.9,
        0.85 + seed.phase * 2.2,
        getConfettiZ(seed, from, to, focusZ),
      );
      dummy.rotation.set(seed.spin, seed.spin * 0.7, seed.spin * 0.3);
      dummy.scale.setScalar(seed.scale);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    // La couche dense suit la caméra dans les bus très longs. Les bornes englobent toute la cabine.
    mesh.current.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 1.9, (from + to) / 2),
      Math.hypot(1.3, 1.3, (to - from) / 2 + 0.4),
    );
  }, [seeds, color, dummy, from, to, focusZ]);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const targetCount = dancing ? maxCount : introCount;
    if (reducedMotion) {
      activeCountRef.current = targetCount;
      mesh.current.count = targetCount;
    } else if (activeCountRef.current === 0 || activeCountRef.current > maxCount) {
      activeCountRef.current = targetCount;
      mesh.current.count = targetCount;
    } else {
      mesh.current.count = Math.round(activeCountRef.current);
    }
  }, [dancing, introCount, maxCount, reducedMotion]);

  useFrame(({ clock, camera }, dt) => {
    if (!mesh.current) return;
    const targetCount = dancing ? maxCount : introCount;
    if (reducedMotion) {
      mesh.current.count = targetCount;
      activeCountRef.current = targetCount;
      return;
    }
    if (started.current === null) started.current = clock.elapsedTime;
    const t = clock.elapsedTime - started.current;
    const rate = dancing ? (maxCount - introCount) / 0.9 : (maxCount - introCount) / 0.6;
    const step = Math.max(1, rate * Math.min(dt, 0.1));
    if (activeCountRef.current < targetCount) {
      activeCountRef.current = Math.min(targetCount, activeCountRef.current + step);
    } else if (activeCountRef.current > targetCount) {
      activeCountRef.current = Math.max(targetCount, activeCountRef.current - step);
    }
    const visibleCount = Math.round(activeCountRef.current);
    mesh.current.count = visibleCount;

    camera.getWorldPosition(cameraLocal);
    mesh.current.worldToLocal(cameraLocal);
    const inCabin = Math.abs(cameraLocal.x) < 1.7 && cameraLocal.y > 0.45 && cameraLocal.y < 3.5 && cameraLocal.z > from - 0.5 && cameraLocal.z < to + 0.5;
    const denseFocus = inCabin ? cameraLocal.z : focusZ;
    const speedBoost = dancing ? 1.35 : 0.72;
    const spinBoost = dancing ? 1.35 : 0.75;

    for (let i = 0; i < visibleCount; i++) {
      const seed = seeds[i];
      const fall = (seed.phase + t * seed.speed * speedBoost / 2.7) % 1;
      const swirlX = Math.sin(t * 2.1 + seed.spin) * seed.swirl * 0.85;
      const swirlZ = Math.cos(t * 1.6 + seed.spin * 1.3) * seed.swirl * 1.1;
      dummy.position.set(
        (seed.x - 0.5) * 1.82 + swirlX,
        3.06 - fall * 2.34,
        getConfettiZ(seed, from, to, denseFocus) + swirlZ,
      );
      dummy.rotation.set(
        seed.spin + t * 1.9 * spinBoost,
        seed.spin * 0.7 + t * 1.3 * spinBoost,
        seed.spin * 0.3 + t * 2.5 * spinBoost,
      );
      dummy.scale.setScalar(seed.scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh key={maxCount} name="bus-party-confetti" ref={mesh} args={instancedArgs} raycast={() => null}>
    <planeGeometry args={[0.068, 0.105]}/>
    <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false}/>
  </instancedMesh>;
}
