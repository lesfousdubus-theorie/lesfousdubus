"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BUS_FRONT_Z } from "@/lib/bus-layout";
import {
  createSpeedLineSeeds,
  getSpeedLineDirection,
  getSpeedLineFade,
  getSpeedLinePosition,
  getSpeedLinesIntensity,
  getSpeedLinesVanishingPoint,
  getSpeedLinesWindow,
  mulberry32,
  SPEED_LINES_CORE,
  SPEED_LINES_PALETTES,
  type SpeedLineSeed,
} from "@/lib/bus-speed-lines";
import type { WorldState } from "./constants";

/**
 * Lignes de vitesse manga autour du bus dès la vitesse x2 (voir image de
 * référence : des lignes droites qui convergent vers un point de fuite,
 * comme dans les cases de manga quand un personnage file à toute vitesse).
 *
 * Chaque ligne est un fin boîtier orienté du point de fuite vers sa position,
 * qui défile vers l'arrière (+Z, vent relatif) le long des flancs et du toit,
 * jamais dans le vide devant le nez. La fenêtre suit la caméra en restant
 * collée à la coque — densité constante même sur un bus de 100M places.
 * Budget O(1) : 2 draw calls (cœur blanc + aura violet/bleu), 80–160 lignes.
 */

const Z_AXIS = new THREE.Vector3(0, 0, 1);

const BusSpeedLines = memo(function BusSpeedLines({
  worldRef,
  focusZ,
  rearZ,
  lowPower,
  reducedMotion,
  visible,
}: {
  worldRef: React.RefObject<WorldState>;
  focusZ: number;
  rearZ: number;
  lowPower: boolean;
  reducedMotion: boolean;
  visible: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const auraRef = useRef<THREE.InstancedMesh>(null);
  const coreMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const auraMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const lineCount = lowPower ? 80 : 160;
  const seedsRef = useRef<SpeedLineSeed[]>([]);
  const intensityRef = useRef(0);
  const streamTimeRef = useRef(0);
  const cameraLocal = useMemo(() => new THREE.Vector3(0, 2, -14), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);

  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const instancedArgs = useMemo<[undefined, undefined, number]>(
    () => [undefined, undefined, lineCount],
    [lineCount],
  );

  useEffect(() => () => {
    boxGeo.dispose();
  }, [boxGeo]);

  useLayoutEffect(() => {
    seedsRef.current = createSpeedLineSeeds(mulberry32(0x51eed), lineCount);
    const sphere = new THREE.Sphere(new THREE.Vector3(0, 1.9, focusZ), 80);
    for (const mesh of [coreRef.current, auraRef.current]) {
      if (!mesh) continue;
      mesh.boundingSphere = sphere;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
  }, [lineCount, focusZ, rearZ]);

  useFrame(({ camera }, dt) => {
    const anchor = group.current;
    const core = coreRef.current;
    const aura = auraRef.current;
    if (!anchor || !core || !aura) return;
    const frameDt = Math.min(dt, 0.1);

    const effective = (worldRef.current?.speedMultiplier ?? 1) * (worldRef.current?.motionFactor ?? 1);
    let target = visible ? getSpeedLinesIntensity(effective) : 0;
    if (reducedMotion) target *= 0.65;
    intensityRef.current += (target - intensityRef.current) * Math.min(1, frameDt * 6);
    const intensity = intensityRef.current;
    anchor.visible = intensity > 0.02;
    if (!anchor.visible) return;

    if (!reducedMotion) {
      streamTimeRef.current += frameDt * (0.55 + intensity * 0.85);
    }
    const time = streamTimeRef.current;
    const speedScale = 0.6 + intensity * 0.9;

    if (coreMatRef.current) coreMatRef.current.opacity = 0.85 * intensity;
    if (auraMatRef.current) auraMatRef.current.opacity = 0.42 * intensity;

    camera.getWorldPosition(cameraLocal);
    anchor.worldToLocal(cameraLocal);
    const window = getSpeedLinesWindow(cameraLocal.z, BUS_FRONT_Z, rearZ);
    const vanishingPoint = getSpeedLinesVanishingPoint(window.start);

    const seeds = seedsRef.current;
    for (let i = 0; i < lineCount; i++) {
      const seed = seeds[i];
      if (!seed) continue;
      const { position, progress } = getSpeedLinePosition(seed, window.start, window.span, time, speedScale);
      const fade = getSpeedLineFade(progress);
      direction.set(...getSpeedLineDirection(position, vanishingPoint));
      dummy.quaternion.setFromUnitVectors(Z_AXIS, direction);

      // Cœur : fin et blanc incandescent.
      dummy.position.set(position[0], position[1], position[2]);
      dummy.scale.set(seed.width, seed.width, seed.length);
      dummy.updateMatrix();
      core.setMatrixAt(i, dummy.matrix);
      color.set(SPEED_LINES_CORE).multiplyScalar(fade);
      core.setColorAt(i, color);

      // Aura : plus large, teintée violet électrique / bleu royal.
      const palette = SPEED_LINES_PALETTES[seed.paletteIndex % SPEED_LINES_PALETTES.length];
      color.set(palette[Math.floor(seed.phase * palette.length) % palette.length]).multiplyScalar(fade);
      aura.setColorAt(i, color);
      dummy.scale.set(seed.width * 2.8, seed.width * 2.8, seed.length * 0.94);
      dummy.updateMatrix();
      aura.setMatrixAt(i, dummy.matrix);
    }
    core.instanceMatrix.needsUpdate = true;
    aura.instanceMatrix.needsUpdate = true;
    if (core.instanceColor) core.instanceColor.needsUpdate = true;
    if (aura.instanceColor) aura.instanceColor.needsUpdate = true;
  });

  return (
    <group ref={group} name="bus-speed-lines" visible={false}>
      <instancedMesh name="bus-speed-lines-core" ref={coreRef} args={instancedArgs} geometry={boxGeo} raycast={() => null} frustumCulled={false}>
        <meshBasicMaterial
          ref={coreMatRef}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh name="bus-speed-lines-aura" ref={auraRef} args={instancedArgs} geometry={boxGeo} raycast={() => null} frustumCulled={false}>
        <meshBasicMaterial
          ref={auraMatRef}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
});

export default BusSpeedLines;
