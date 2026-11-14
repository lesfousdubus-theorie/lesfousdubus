"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BUS_FRONT_Z } from "@/lib/bus-layout";
import { createConfettiSeeds, getConfettiZ } from "@/lib/bus-confetti";
import type { WorldState } from "./constants";

const PARTY_LIGHT_PALETTE = [
  "#ff1f8f",
  "#00e5ff",
  "#ffd23f",
  "#a855f7",
  "#00f59b",
  "#ff3d57",
  "#3b82f6",
  "#ff8800",
];

function createBeamFadeTexture(): THREE.DataTexture {
  const height = 64;
  const data = new Uint8Array(height * 4);
  for (let y = 0; y < height; y++) {
    const v = y / (height - 1);
    const tipFade = v > 0.88 ? 1 - Math.pow((v - 0.88) / 0.12, 2) : 1;
    const value = Math.round(Math.max(0, Math.min(1, Math.pow(v, 1.35) * tipFade)) * 255);
    const offset = y * 4;
    data[offset] = value;
    data[offset + 1] = value;
    data[offset + 2] = value;
    data[offset + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, 1, height, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function createRadialSpotTexture(): THREE.DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const center = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - center) / center;
      const dy = (y - center) / center;
      const dist = Math.min(1, Math.hypot(dx, dy));
      const falloff = Math.pow(Math.max(0, 1 - dist), 2.1);
      const value = Math.round(falloff * 255);
      const offset = (y * size + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Jeux de lumière disco multicolores actifs la nuit pendant le mode Fête :
 * faisceaux balayants au plafond, néons LED multicolores, spots lumineux et taches au sol dans tout le bus.
 */
export default function BusPartyLights({
  worldRef,
  focusZ,
  rearZ,
  lowPower,
  reducedMotion,
}: {
  worldRef: React.RefObject<WorldState>;
  focusZ: number;
  rearZ: number;
  lowPower: boolean;
  reducedMotion: boolean;
}) {
  const conesRef = useRef<THREE.InstancedMesh>(null);
  const orbsRef = useRef<THREE.InstancedMesh>(null);
  const poolsRef = useRef<THREE.InstancedMesh>(null);
  const barsRef = useRef<THREE.InstancedMesh>(null);

  const beamMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const orbMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const poolMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const barMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const count = lowPower ? 14 : 26;
  const barCount = lowPower ? 12 : 24;
  const from = BUS_FRONT_Z + 0.45;
  const to = rearZ - 0.45;
  const seeds = useMemo(() => createConfettiSeeds(count, Math.max(1, to - from)), [count, from, to]);
  const barSeeds = useMemo(() => createConfettiSeeds(barCount, Math.max(1, to - from)), [barCount, from, to]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const cameraLocal = useMemo(() => new THREE.Vector3(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const coneGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.76, 2.38, 14, 1, true);
    // Déplace le sommet du cône à l'origine pour pivoter depuis le plafond.
    g.translate(0, -1.19, 0);
    return g;
  }, []);

  const poolGeo = useMemo(() => {
    const g = new THREE.CircleGeometry(0.56, 18);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const orbGeo = useMemo(() => new THREE.SphereGeometry(0.085, 10, 10), []);
  const barGeo = useMemo(() => new THREE.BoxGeometry(0.16, 0.036, 0.72), []);

  const beamTex = useMemo(() => createBeamFadeTexture(), []);
  const poolTex = useMemo(() => createRadialSpotTexture(), []);

  useEffect(() => {
    return () => {
      coneGeo.dispose();
      poolGeo.dispose();
      orbGeo.dispose();
      barGeo.dispose();
      beamTex.dispose();
      poolTex.dispose();
    };
  }, [coneGeo, poolGeo, orbGeo, barGeo, beamTex, poolTex]);

  useLayoutEffect(() => {
    const sphere = new THREE.Sphere(
      new THREE.Vector3(0, 1.9, (from + to) / 2),
      Math.hypot(1.6, 1.6, Math.max(1, to - from) / 2 + 0.5),
    );
    seeds.forEach((seed, i) => {
      const z = getConfettiZ(seed, from, to, focusZ);
      const laneX = ((i % 3) - 1) * 0.62;
      const hex = PARTY_LIGHT_PALETTE[i % PARTY_LIGHT_PALETTE.length];
      color.set(hex);

      if (conesRef.current) {
        dummy.position.set(laneX, 3.1, z);
        dummy.rotation.set(Math.sin(seed.spin) * 0.35, 0, Math.cos(seed.spin) * 0.35);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        conesRef.current.setMatrixAt(i, dummy.matrix);
        conesRef.current.setColorAt(i, color);
      }

      if (orbsRef.current) {
        dummy.position.set(laneX, 3.09, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        orbsRef.current.setMatrixAt(i, dummy.matrix);
        orbsRef.current.setColorAt(i, color);
      }

      if (poolsRef.current) {
        dummy.position.set(laneX * 1.15, 0.654, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        poolsRef.current.setMatrixAt(i, dummy.matrix);
        poolsRef.current.setColorAt(i, color);
      }
    });

    if (barsRef.current) {
      barSeeds.forEach((seed, i) => {
        const z = getConfettiZ(seed, from, to, focusZ);
        const sideX = i % 2 === 0 ? -0.5 : 0.5;
        color.set(PARTY_LIGHT_PALETTE[(i * 3) % PARTY_LIGHT_PALETTE.length]);
        dummy.position.set(sideX, 3.112, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        barsRef.current!.setMatrixAt(i, dummy.matrix);
        barsRef.current!.setColorAt(i, color);
      });
    }

    [conesRef.current, orbsRef.current, poolsRef.current, barsRef.current].forEach((mesh) => {
      if (!mesh) return;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.boundingSphere = sphere.clone();
    });
  }, [seeds, barSeeds, from, to, focusZ, dummy, color]);

  useFrame(({ clock, camera }) => {
    const daylight = worldRef.current?.daylight ?? 1;
    const nightFactor = THREE.MathUtils.clamp((0.68 - daylight) / 0.35, 0, 1);
    const active = nightFactor > 0.01;

    const cones = conesRef.current;
    const orbs = orbsRef.current;
    const pools = poolsRef.current;
    const bars = barsRef.current;

    if (cones) cones.visible = active;
    if (orbs) orbs.visible = active;
    if (pools) pools.visible = active;
    if (bars) bars.visible = active;
    if (!active) return;

    if (beamMatRef.current) beamMatRef.current.opacity = 0.24 * nightFactor;
    if (poolMatRef.current) poolMatRef.current.opacity = 0.72 * nightFactor;
    if (orbMatRef.current) orbMatRef.current.opacity = 0.95 * nightFactor;
    if (barMatRef.current) barMatRef.current.opacity = 0.92 * nightFactor;

    const t = clock.elapsedTime;
    const anchor = cones ?? orbs ?? pools ?? bars;
    let denseFocus = focusZ;
    if (anchor) {
      camera.getWorldPosition(cameraLocal);
      anchor.worldToLocal(cameraLocal);
      const inCabin =
        Math.abs(cameraLocal.x) < 1.7 &&
        cameraLocal.y > 0.45 &&
        cameraLocal.y < 3.5 &&
        cameraLocal.z > from - 0.5 &&
        cameraLocal.z < to + 0.5;
      if (inCabin) denseFocus = cameraLocal.z;
    }

    seeds.forEach((seed, i) => {
      const baseZ = getConfettiZ(seed, from, to, denseFocus);
      const laneX = ((i % 3) - 1) * 0.62;
      const swayX = reducedMotion ? Math.sin(seed.spin) * 0.34 : Math.sin(t * (1.8 + seed.speed) + seed.spin) * 0.46;
      const swayZ = reducedMotion ? Math.cos(seed.spin) * 0.34 : Math.cos(t * (1.5 + seed.speed * 0.8) + seed.spin) * 0.48;

      const hue = reducedMotion
        ? (i / seeds.length) % 1
        : (t * 0.28 + i / seeds.length + seed.phase * 0.25) % 1;
      const pulse = reducedMotion ? 1 : 0.78 + 0.32 * Math.sin(t * 7.2 + seed.spin * 2);
      color.setHSL(hue, 0.96, 0.56);

      if (cones) {
        dummy.position.set(laneX, 3.1, baseZ);
        dummy.rotation.set(swayX, 0, swayZ);
        dummy.scale.set(pulse, 1, pulse);
        dummy.updateMatrix();
        cones.setMatrixAt(i, dummy.matrix);
        cones.setColorAt(i, color);
      }

      if (orbs) {
        dummy.position.set(laneX, 3.09, baseZ);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.85 + pulse * 0.35);
        dummy.updateMatrix();
        orbs.setMatrixAt(i, dummy.matrix);
        orbs.setColorAt(i, color);
      }

      if (pools) {
        const hitX = THREE.MathUtils.clamp(laneX - Math.sin(swayZ) * 1.4, -1.02, 1.02);
        const hitZ = THREE.MathUtils.clamp(baseZ + Math.sin(swayX) * 1.3, from, to);
        dummy.position.set(hitX, 0.654, hitZ);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.75 + pulse * 0.45);
        dummy.updateMatrix();
        pools.setMatrixAt(i, dummy.matrix);
        pools.setColorAt(i, color);
      }
    });

    if (bars) {
      barSeeds.forEach((seed, i) => {
        const z = getConfettiZ(seed, from, to, denseFocus);
        const sideX = i % 2 === 0 ? -0.5 : 0.5;
        const hue = reducedMotion
          ? ((i * 0.17) % 1)
          : (t * 0.35 + i / barSeeds.length) % 1;
        color.setHSL(hue, 0.98, 0.6);
        dummy.position.set(sideX, 3.112, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        bars.setMatrixAt(i, dummy.matrix);
        bars.setColorAt(i, color);
      });
      bars.instanceMatrix.needsUpdate = true;
      if (bars.instanceColor) bars.instanceColor.needsUpdate = true;
    }

    if (cones) {
      cones.instanceMatrix.needsUpdate = true;
      if (cones.instanceColor) cones.instanceColor.needsUpdate = true;
    }
    if (orbs) {
      orbs.instanceMatrix.needsUpdate = true;
      if (orbs.instanceColor) orbs.instanceColor.needsUpdate = true;
    }
    if (pools) {
      pools.instanceMatrix.needsUpdate = true;
      if (pools.instanceColor) pools.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group name="bus-party-lights">
      <instancedMesh
        name="bus-party-light-cones"
        ref={conesRef}
        args={[undefined, undefined, count]}
        count={count}
        geometry={coneGeo}
        raycast={() => null}
      >
        <meshBasicMaterial
          ref={beamMatRef}
          color="#ffffff"
          map={beamTex}
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        name="bus-party-light-orbs"
        ref={orbsRef}
        args={[undefined, undefined, count]}
        count={count}
        geometry={orbGeo}
        raycast={() => null}
      >
        <meshBasicMaterial
          ref={orbMatRef}
          color="#ffffff"
          transparent
          opacity={0.92}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        name="bus-party-light-pools"
        ref={poolsRef}
        args={[undefined, undefined, count]}
        count={count}
        geometry={poolGeo}
        raycast={() => null}
      >
        <meshBasicMaterial
          ref={poolMatRef}
          color="#ffffff"
          map={poolTex}
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        name="bus-party-ceiling-bars"
        ref={barsRef}
        args={[undefined, undefined, barCount]}
        count={barCount}
        geometry={barGeo}
        raycast={() => null}
      >
        <meshBasicMaterial
          ref={barMatRef}
          color="#ffffff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
