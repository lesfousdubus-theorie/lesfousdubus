"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  buildRibbonIndices,
  buildRibbonStrip,
  createBoltPath,
  getLightningZones,
  getSpeedLightningIntensity,
  mulberry32,
  pickBoltAnchor,
  SPEED_LIGHTNING_CORE,
  SPEED_LIGHTNING_PALETTES,
  type BoltPath,
  type Vec3,
} from "@/lib/bus-speed-lightning";
import type { WorldState } from "./constants";

/**
 * Éclairs manga autour du bus dès la vitesse x2 (voir image de référence :
 * arcs dentelés à cœur blanc incandescent, aura violet électrique / bleu
 * royal, étincelles traînantes).
 *
 * Budget borné O(1) : 2 draw calls pour tous les arcs (aura + cœur, géométries
 * fusionnées) + 1 pour les étincelles, quelle que soit la longueur du bus.
 * Les ancres restent sur le nez, la zone caméra et l'arrière.
 * Régénération « image par image » (~12 ips) pour le crépitement manga.
 */

interface Spine {
  main: Vec3[];
  branch: Vec3[] | null;
  paletteIndex: number;
}

function createRadialTexture(): THREE.DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const center = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - center) / center;
      const dy = (y - center) / center;
      const dist = Math.min(1, Math.hypot(dx, dy));
      const falloff = Math.pow(Math.max(0, 1 - dist), 2.4);
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

export default function BusSpeedLightning({
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
  const auraMesh = useRef<THREE.Mesh>(null);
  const coreMesh = useRef<THREE.Mesh>(null);
  const sparksRef = useRef<THREE.Points>(null);
  const auraMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const coreMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const sparkMatRef = useRef<THREE.PointsMaterial>(null);

  const boltCount = lowPower ? 10 : 18;
  const segments = lowPower ? 6 : 8;
  const sparkCount = lowPower ? 60 : 150;

  const zones = useMemo(() => getLightningZones(focusZ, rearZ), [focusZ, rearZ]);
  const rngRef = useRef(mulberry32(0x5eed));
  const spinesRef = useRef<Spine[]>([]);
  const intensityRef = useRef(0);
  const flickerRef = useRef(1);
  const nextRegenRef = useRef(0);
  const cameraLocal = useMemo(() => new THREE.Vector3(0, 2, -14), []);
  const sparkTexture = useMemo(() => createRadialTexture(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // --- Géométries fusionnées : aura (large) + cœur (fin), même squelette. ---
  const { auraGeo, coreGeo, auraColors, coreColors } = useMemo(() => {
    const mainPoints = segments + 1;
    const branchPoints = 4;
    const vertsPerBolt = (mainPoints + branchPoints) * 2;
    const totalVerts = boltCount * vertsPerBolt;
    const auraPositions = new Float32Array(totalVerts * 3);
    const corePositions = new Float32Array(totalVerts * 3);
    const auraColors = new Float32Array(totalVerts * 3);
    const coreColors = new Float32Array(totalVerts * 3);
    const indices: number[] = [];
    for (let bolt = 0; bolt < boltCount; bolt++) {
      const offset = bolt * vertsPerBolt;
      indices.push(...buildRibbonIndices(mainPoints, offset));
      indices.push(...buildRibbonIndices(branchPoints, offset + mainPoints * 2));
    }
    const makeGeometry = (positions: Float32Array, colors: Float32Array) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.9, (zones.frontZ + zones.rearZ) / 2), 60);
      return geometry;
    };
    return {
      auraGeo: makeGeometry(auraPositions, auraColors),
      coreGeo: makeGeometry(corePositions, coreColors),
      auraColors,
      coreColors,
    };
  }, [boltCount, segments, zones.frontZ, zones.rearZ]);

  // --- Étincelles traînantes (Points, toujours face caméra). ---
  const sparkData = useMemo(() => {
    const positions = new Float32Array(sparkCount * 3);
    const colors = new Float32Array(sparkCount * 3);
    const velocities = new Float32Array(sparkCount * 3);
    const life = new Float32Array(sparkCount);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.9, (zones.frontZ + zones.rearZ) / 2), 60);
    return { positions, colors, velocities, life, geometry };
  }, [sparkCount, zones.frontZ, zones.rearZ]);

  // Les buffers d'étincelles sont mutés chaque image : accès via ref mutable.
  const sparkDataRef = useRef(sparkData);
  useEffect(() => {
    sparkDataRef.current = sparkData;
  }, [sparkData]);

  useEffect(() => () => {
    auraGeo.dispose();
    coreGeo.dispose();
    sparkData.geometry.dispose();
    sparkTexture.dispose();
  }, [auraGeo, coreGeo, sparkData, sparkTexture]);

  const regenerateSpines = () => {
    const rng = rngRef.current;
    const spines: Spine[] = [];
    for (let i = 0; i < boltCount; i++) {
      const { anchor, outward } = pickBoltAnchor(rng, zones.frontZ, zones.midZ, zones.rearZ);
      const path: BoltPath = createBoltPath(rng, anchor, outward, segments, 1.5 + rng() * 1.5);
      spines.push({ main: path.points, branch: path.branch, paletteIndex: path.paletteIndex });
    }
    spinesRef.current = spines;
    // Couleurs : aura = palette du bolt, cœur = blanc incandescent.
    const mainPoints = segments + 1;
    const branchPoints = 4;
    const vertsPerBolt = (mainPoints + branchPoints) * 2;
    spines.forEach((spine, bolt) => {
      const palette = SPEED_LIGHTNING_PALETTES[spine.paletteIndex % SPEED_LIGHTNING_PALETTES.length];
      const offset = bolt * vertsPerBolt;
      const writeColors = (target: Float32Array, vertexStart: number, pointCount: number, hex: string) => {
        color.set(hex);
        for (let v = 0; v < pointCount * 2; v++) {
          const idx = (vertexStart + v) * 3;
          target[idx] = color.r;
          target[idx + 1] = color.g;
          target[idx + 2] = color.b;
        }
      };
      const auraHex = palette[Math.floor(rng() * palette.length)];
      writeColors(auraColors, offset, mainPoints, auraHex);
      writeColors(auraColors, offset + mainPoints * 2, branchPoints, auraHex);
      writeColors(coreColors, offset, mainPoints, SPEED_LIGHTNING_CORE);
      writeColors(coreColors, offset + mainPoints * 2, branchPoints, SPEED_LIGHTNING_CORE);
    });
    auraGeo.getAttribute("color").needsUpdate = true;
    coreGeo.getAttribute("color").needsUpdate = true;
  };

  const spawnSpark = (index: number, randomLife: boolean) => {
    const sparks = sparkDataRef.current;
    const rng = rngRef.current;
    const { anchor, outward } = pickBoltAnchor(rng, zones.frontZ, zones.midZ, zones.rearZ);
    const i3 = index * 3;
    sparks.positions[i3] = anchor[0] + outward[0] * 0.15;
    sparks.positions[i3 + 1] = anchor[1] + outward[1] * 0.15;
    sparks.positions[i3 + 2] = anchor[2] + outward[2] * 0.15;
    // Traînée vers l'arrière (+Z, vent relatif) + léger rejet vers l'extérieur.
    sparks.velocities[i3] = outward[0] * 1.6 + (rng() - 0.5) * 1.4;
    sparks.velocities[i3 + 1] = outward[1] * 1.2 + (rng() - 0.5) * 1.4;
    sparks.velocities[i3 + 2] = 7 + rng() * 8;
    sparks.life[index] = randomLife ? 0.15 + rng() * 0.7 : 0.45 + rng() * 0.5;
    const palette = SPEED_LIGHTNING_PALETTES[rng() < 0.5 ? 0 : 1];
    color.set(rng() < 0.3 ? SPEED_LIGHTNING_CORE : palette[Math.floor(rng() * palette.length)]);
    sparks.colors[i3] = color.r;
    sparks.colors[i3 + 1] = color.g;
    sparks.colors[i3 + 2] = color.b;
  };

  useLayoutEffect(() => {
    regenerateSpines();
    for (let i = 0; i < sparkCount; i++) spawnSpark(i, true);
    sparkDataRef.current.geometry.getAttribute("position").needsUpdate = true;
    sparkDataRef.current.geometry.getAttribute("color").needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boltCount, segments, sparkCount, zones]);

  const writeRibbons = (camera: Vec3) => {
    const mainPoints = segments + 1;
    const branchPoints = 4;
    const vertsPerBolt = (mainPoints + branchPoints) * 2;
    const auraPos = auraGeo.getAttribute("position") as THREE.BufferAttribute;
    const corePos = coreGeo.getAttribute("position") as THREE.BufferAttribute;
    spinesRef.current.forEach((spine, bolt) => {
      const writeStrip = (points: Vec3[], vertexOffset: number, auraWidth: [number, number], coreWidth: [number, number]) => {
        const auraStrip = buildRibbonStrip(points, auraWidth[0], auraWidth[1], camera);
        const coreStrip = buildRibbonStrip(points, coreWidth[0], coreWidth[1], camera);
        const base = (vertexOffset) * 3;
        for (let k = 0; k < auraStrip.length; k++) {
          auraPos.array[base + k] = auraStrip[k];
          corePos.array[base + k] = coreStrip[k];
        }
      };
      writeStrip(spine.main, bolt * vertsPerBolt, [0.17, 0.03], [0.05, 0.012]);
      if (spine.branch) {
        writeStrip(spine.branch, bolt * vertsPerBolt + mainPoints * 2, [0.1, 0.02], [0.03, 0.008]);
      } else {
        // Fourche absente : ruban replié sur place (invisible).
        const flat = buildRibbonStrip([spine.main[0], spine.main[0]], 0.001, 0.001, camera);
        const base = (bolt * vertsPerBolt + mainPoints * 2) * 3;
        for (let k = 0; k < flat.length; k++) {
          auraPos.array[base + k] = flat[k];
          corePos.array[base + k] = flat[k];
        }
      }
    });
    auraPos.needsUpdate = true;
    corePos.needsUpdate = true;
  };

  useFrame(({ camera }, dt) => {
    const anchor = group.current;
    if (!anchor) return;
    const frameDt = Math.min(dt, 0.1);
    const effective = (worldRef.current?.speedMultiplier ?? 1) * (worldRef.current?.motionFactor ?? 1);
    let target = visible ? getSpeedLightningIntensity(effective) : 0;
    if (reducedMotion) target *= 0.7;
    intensityRef.current += (target - intensityRef.current) * Math.min(1, frameDt * 6);
    const intensity = intensityRef.current;
    anchor.visible = intensity > 0.02;
    if (!anchor.visible) return;

    // Crépitement manga : nouveau tracé toutes les ~80 ms, pas d'interpolation.
    if (!reducedMotion) {
      nextRegenRef.current -= frameDt;
      if (nextRegenRef.current <= 0) {
        regenerateSpines();
        flickerRef.current = 0.8 + rngRef.current() * 0.35;
        nextRegenRef.current = 0.06 + rngRef.current() * 0.05;
      }
    }

    const flicker = reducedMotion ? 1 : flickerRef.current;
    if (auraMatRef.current) auraMatRef.current.opacity = 0.62 * intensity * flicker;
    if (coreMatRef.current) coreMatRef.current.opacity = 0.95 * intensity * flicker;
    if (sparkMatRef.current) sparkMatRef.current.opacity = 0.9 * intensity;

    camera.getWorldPosition(cameraLocal);
    anchor.worldToLocal(cameraLocal);
    writeRibbons([cameraLocal.x, cameraLocal.y, cameraLocal.z]);

    if (!reducedMotion) {
      const sparks = sparkDataRef.current;
      for (let i = 0; i < sparkCount; i++) {
        sparks.life[i] -= frameDt;
        if (sparks.life[i] <= 0) {
          spawnSpark(i, false);
          continue;
        }
        const i3 = i * 3;
        sparks.positions[i3] += sparks.velocities[i3] * frameDt;
        sparks.positions[i3 + 1] += sparks.velocities[i3 + 1] * frameDt;
        sparks.positions[i3 + 2] += sparks.velocities[i3 + 2] * frameDt;
      }
      sparks.geometry.getAttribute("position").needsUpdate = true;
      sparks.geometry.getAttribute("color").needsUpdate = true;
    }
  });

  return (
    <group ref={group} name="bus-speed-lightning" visible={false}>
      <mesh ref={auraMesh} name="bus-speed-lightning-aura" geometry={auraGeo} raycast={() => null} frustumCulled={false}>
        <meshBasicMaterial
          ref={auraMatRef}
          vertexColors
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={coreMesh} name="bus-speed-lightning-core" geometry={coreGeo} raycast={() => null} frustumCulled={false}>
        <meshBasicMaterial
          ref={coreMatRef}
          vertexColors
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <points ref={sparksRef} name="bus-speed-lightning-sparks" geometry={sparkData.geometry} raycast={() => null} frustumCulled={false}>
        <pointsMaterial
          ref={sparkMatRef}
          size={0.15}
          map={sparkTexture}
          vertexColors
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
          toneMapped={false}
        />
      </points>
    </group>
  );
}
