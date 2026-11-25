"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BUS_FRONT_Z } from "@/lib/bus-layout";
import { getPartyDanceChillMix, getPartyDanceTime, PARTY_BEAT_SECONDS } from "@/lib/party-rhythm";
import type { WorldState } from "./constants";

const BEAM_Y = 3.083;
const FLOOR_Y = 0.647;
const TAU = Math.PI * 2;
const DOWN = new THREE.Vector3(0, -1, 0);

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
 * Couvre de façon continue toute la zone du bus visible autour de la caméra
 * (sans laisser de tronçons sombres), avec un pas qui s'adapte au dézoom.
 */
function sampleStations(total: number, capacity: number, focus: number, stride = 1) {
  if (total <= capacity) return Array.from({ length: total }, (_, index) => index);
  const clampedStride = Math.max(1, Math.min(stride, Math.floor((total - 1) / Math.max(1, capacity - 1)) || 1));
  const span = (capacity - 1) * clampedStride;
  const start = THREE.MathUtils.clamp(Math.round(focus - span / 2), 0, Math.max(0, total - 1 - span));
  return Array.from({ length: capacity }, (_, index) => Math.min(total - 1, start + index * clampedStride));
}

const BusPartyLights = memo(function BusPartyLights({
  worldRef,
  focusZ,
  rearZ,
  lowPower,
  reducedMotion,
  active = true,
}: {
  worldRef: React.RefObject<WorldState>;
  focusZ: number;
  rearZ: number;
  lowPower: boolean;
  reducedMotion: boolean;
  active?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const conesRef = useRef<THREE.InstancedMesh>(null);
  const orbsRef = useRef<THREE.InstancedMesh>(null);
  const poolsRef = useRef<THREE.InstancedMesh>(null);
  const barsRef = useRef<THREE.InstancedMesh>(null);
  const beamMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const orbMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const poolMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const barMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const from = BUS_FRONT_Z + 0.82;
  const to = rearZ - 0.82;
  const stationCount = 1 + Math.ceil((to - from) / (lowPower ? 1.55 : 0.95));
  const stationCapacity = Math.min(stationCount, lowPower ? 56 : 112);
  const beamsPerStation = lowPower ? 1 : 2;
  const beamCount = stationCapacity * beamsPerStation;
  const step = (to - from) / (stationCount - 1);

  const lastFrame = useRef({ time: NaN, focus: -1, stride: 1, night: -1, stations: [] as number[] });
  const { dummy, cameraLocal, direction, color } = useMemo(() => ({
    dummy: new THREE.Object3D(),
    cameraLocal: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    color: new THREE.Color(),
  }), []);

  const coneGeo = useMemo(() => {
    // Cone d'un mètre, sommet à l'origine et direction verticale négative.
    const geometry = new THREE.ConeGeometry(0.29, 1, lowPower ? 8 : 12, 1, true);
    geometry.translate(0, -0.5, 0);
    return geometry;
  }, [lowPower]);
  const poolGeo = useMemo(() => new THREE.CircleGeometry(0.44, 14).rotateX(-Math.PI / 2), []);
  const orbGeo = useMemo(() => new THREE.SphereGeometry(0.056, 8, 6), []);
  const barGeo = useMemo(() => new THREE.BoxGeometry(0.095, 0.022, 0.47), []);
  const beamTex = useMemo(() => createBeamFadeTexture(), []);
  const poolTex = useMemo(() => createRadialSpotTexture(), []);

  useEffect(() => () => {
    coneGeo.dispose();
    poolGeo.dispose();
    orbGeo.dispose();
    barGeo.dispose();
    beamTex.dispose();
    poolTex.dispose();
  }, [coneGeo, poolGeo, orbGeo, barGeo, beamTex, poolTex]);

  useLayoutEffect(() => {
    lastFrame.current = { time: NaN, focus: -1, stride: 1, night: -1, stations: [] };
    const sphere = new THREE.Sphere(new THREE.Vector3(0, 1.9, (from + to) / 2),
      Math.hypot(1.6, 1.45, (to - from) / 2 + 0.5));
    for (const mesh of [conesRef.current, orbsRef.current, poolsRef.current, barsRef.current]) {
      if (!mesh) continue;
      mesh.boundingSphere = sphere;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
  }, [from, to, beamCount, stationCount, reducedMotion]);

  useFrame(({ clock, camera }) => {
    const anchor = group.current;
    const cones = conesRef.current, orbs = orbsRef.current, pools = poolsRef.current, bars = barsRef.current;
    if (!anchor || !cones || !orbs || !pools || !bars) return;
    if (!active) {
      if (anchor.visible) anchor.visible = false;
      return;
    }

    const night = THREE.MathUtils.smoothstep(1 - worldRef.current.daylight, 0.36, 0.9);
    anchor.visible = night > 0.01;
    if (!anchor.visible) return;

    const previous = lastFrame.current;
    if (night !== previous.night) {
      const brightness = night * (reducedMotion ? 0.72 : 1);
      if (beamMatRef.current) beamMatRef.current.opacity = (lowPower ? 0.24 : 0.2) * brightness;
      if (poolMatRef.current) poolMatRef.current.opacity = 0.62 * brightness;
      if (orbMatRef.current) orbMatRef.current.opacity = 0.95 * brightness;
      if (barMatRef.current) barMatRef.current.opacity = 0.9 * brightness;
      previous.night = night;
    }

    let visibleFocus = 0;
    let visibleStride = 1;
    if (stationCount > stationCapacity) {
      camera.getWorldPosition(cameraLocal);
      anchor.worldToLocal(cameraLocal);
      // Suit toujours la zone du bus observée par la caméra (intérieur ET extérieur).
      const viewZ = THREE.MathUtils.clamp(Number.isFinite(cameraLocal.z) ? cameraLocal.z : focusZ, from, to);
      const camDist = Math.hypot(cameraLocal.x, Math.max(0, cameraLocal.y - 2));
      visibleStride = camDist > 60 ? 3 : camDist > 22 ? 2 : 1;
      const quant = Math.max(4, visibleStride * 4);
      visibleFocus = Math.round((viewZ - from) / (step * quant)) * quant;
    }
    const time = reducedMotion ? 0 : getPartyDanceTime(clock.elapsedTime);
    if (time === previous.time && visibleFocus === previous.focus && visibleStride === previous.stride) return;
    const moved = visibleFocus !== previous.focus || visibleStride !== previous.stride;
    if (moved) previous.stations = sampleStations(stationCount, stationCapacity, visibleFocus, visibleStride);
    previous.time = time;
    previous.focus = visibleFocus;
    previous.stride = visibleStride;

    // Huit temps par rotation, avec des phases opposées des deux côtés de l'allée.
    const chill = reducedMotion ? 0 : getPartyDanceChillMix();
    const beats = (time / PARTY_BEAT_SECONDS) * (1 - chill * 0.72);
    const beatGlow = (0.91 + 0.09 * Math.cos(beats * TAU)) * (1 - chill * 0.25);
    previous.stations.forEach((station, stationIndex) => {
      const stationZ = from + station * step;
      for (let fixture = 0; fixture < beamsPerStation; fixture++) {
        const side = (lowPower ? station % 2 : fixture) === 0 ? -1 : 1;
        const index = stationIndex * beamsPerStation + fixture;
        const phase = beats * TAU / 8 * side + station * 1.73 + fixture * Math.PI;
        const sourceX = side * 0.51;
        const sourceZ = THREE.MathUtils.clamp(stationZ + side * 0.19, from, to);
        const targetX = sourceX * 0.37 + Math.cos(phase) * 0.62;
        const targetZ = THREE.MathUtils.clamp(sourceZ + Math.sin(phase) * 0.8, from, to);
        direction.set(targetX - sourceX, FLOOR_Y - BEAM_Y, targetZ - sourceZ);
        const beamLength = direction.length();

        const hue = (station * 0.143 + fixture * 0.38 + beats / 24) % 1;
        color.setHSL(hue, 0.93, 0.56).multiplyScalar(beatGlow);

        dummy.position.set(sourceX, BEAM_Y, sourceZ);
        dummy.quaternion.setFromUnitVectors(DOWN, direction.normalize());
        dummy.scale.set(1, beamLength, 1);
        dummy.updateMatrix();
        cones.setMatrixAt(index, dummy.matrix);
        cones.setColorAt(index, color);

        dummy.position.set(targetX, FLOOR_Y, targetZ);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.86 + 0.14 * beatGlow);
        dummy.updateMatrix();
        pools.setMatrixAt(index, dummy.matrix);
        pools.setColorAt(index, color);

        if (moved) {
          dummy.position.set(sourceX, BEAM_Y + 0.012, sourceZ);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          orbs.setMatrixAt(index, dummy.matrix);
          dummy.position.y = 3.105;
          dummy.updateMatrix();
          bars.setMatrixAt(index, dummy.matrix);
        }
        orbs.setColorAt(index, color);
        bars.setColorAt(index, color);
      }
    });

    for (const mesh of [cones, pools, orbs, bars]) {
      if (moved || mesh === cones || mesh === pools) mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group ref={group} name="bus-party-lights" visible={false}>
      <instancedMesh name="bus-party-light-cones" ref={conesRef} args={[undefined, undefined, beamCount]}
        geometry={coneGeo} raycast={() => null}>
        <meshBasicMaterial ref={beamMatRef} map={beamTex} transparent blending={THREE.AdditiveBlending}
          depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh name="bus-party-light-orbs" ref={orbsRef} args={[undefined, undefined, beamCount]}
        geometry={orbGeo} raycast={() => null}>
        <meshBasicMaterial ref={orbMatRef} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh name="bus-party-light-pools" ref={poolsRef} args={[undefined, undefined, beamCount]}
        geometry={poolGeo} raycast={() => null}>
        <meshBasicMaterial ref={poolMatRef} map={poolTex} transparent blending={THREE.AdditiveBlending}
          depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh name="bus-party-ceiling-bars" ref={barsRef} args={[undefined, undefined, beamCount]}
        geometry={barGeo} raycast={() => null}>
        <meshBasicMaterial ref={barMatRef} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  );
});

export default BusPartyLights;
