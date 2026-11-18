"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { WorldLandmark, type PropDef, type PropType } from "./WorldLandmark";
import WorldSetPiece, { WorldForeground } from "./WorldSetPiece";
import WorldOcean from "./WorldOcean";
import WorldSeaCreatures from "./WorldSeaCreatures";
import { useFrame } from "@react-three/fiber";
import { WORLD_SPEED, type Phase, type WorldState } from "./constants";
import { BRIDGE_MARKING_BOX } from "@/lib/world-geometry";
import { cacheSceneryBounds, createSceneryVisibility, type SceneryBounds } from "@/lib/world-visibility";

export const ZONE_LEN = 160;
const WINDOW_START = -440;
const TERRAIN_RELIEF = [1.1, .32, .55, .65, 1.05, .45, .64, .25];
const TERRAIN_WIDTH = 96;
const TERRAIN_DEPTH = ZONE_LEN - 16;
const TERRAIN_COLUMNS = 28;
const TERRAIN_ROWS = 36;

export const ZONES = [
  { name: "Alabasta", subtitle: "Royaume des sables", ground: "#e5bd6a", shore: "#d8a84e" },
  { name: "Water Seven", subtitle: "La cité de l'eau", ground: "#9ec5d4", shore: "#6da3ba" },
  { name: "Skypiea", subtitle: "L'île céleste", ground: "#f5f3ec", shore: "#e4e1d6" },
  { name: "Pays des Wa", subtitle: "Terre des samouraïs", ground: "#5da854", shore: "#86c878" },
  { name: "Île de Drum", subtitle: "Royaume des neiges", ground: "#ebf2fa", shore: "#dbe5f2" },
  { name: "Egghead", subtitle: "L'île du futur", ground: "#83cfa3", shore: "#80cfda" },
  { name: "Elbaf", subtitle: "Royaume des géants", ground: "#76a951", shore: "#9a8664" },
  { name: "Enies Lobby", subtitle: "L'île judiciaire", ground: "#8fa5b5", shore: "#c6f0ed" },
] as const;

const LOOP = ZONE_LEN * ZONES.length;

const TINT_COLORS = [
  "#f6d38a",
  "#d7e1d6",
  "#ffffff",
  "#a4cf77",
  "#ffffff",
  "#bfe89b",
  "#a6cf65",
  "#c9d6e0",
] as const;

const ZONE_PROPS: Record<number, PropType[]> = {
  0: ["palm", "palm", "cactus", "cactus", "pyramid", "ruins", "rock"],
  1: ["building", "building", "building", "seaTrainPoles", "rock"],
  2: ["cloud", "cloud", "cloud", "giantJack", "bell"],
  3: ["sakura", "sakura", "sakura", "pagoda", "torii", "lantern"],
  4: ["pine", "pine", "pine", "snowman", "drumMesa", "rock"],
  5: ["palm"],
  6: ["pine", "giantSword", "vikingHall", "runestone", "drakkar", "rock"],
  7: ["justicePillar", "courthouse", "waterfallCliff", "seaTrainPoles", "rock"],
};

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weatherForLandscape(zone: number, visit: number): WorldState["weather"] {
  const value = mulberry32((visit + 2048) * 7919 + zone * 104729)();

  if (zone === 4) return value < 0.78 ? "snow" : value < 0.9 ? "rain" : "clear";
  if (zone === 1) return value < 0.62 ? "rain" : value < 0.68 ? "snow" : "clear";
  if (zone === 3) return value < 0.34 ? "rain" : value < 0.5 ? "snow" : "clear";
  if (zone === 2) return value < 0.25 ? "rain" : value < 0.35 ? "snow" : "clear";
  if (zone === 6) return value < 0.16 ? "rain" : "clear";
  if (zone === 7) return value < 0.25 ? "rain" : "clear";
  if (zone === 5) return value < 0.18 ? "rain" : "clear";
  return value < 0.12 ? "rain" : "clear";
}

function smoothstep(start: number, end: number, value: number) {
  const t = THREE.MathUtils.clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}

function getTerrainWave(zone: number, x: number, z: number) {
  return Math.sin(z * .11 + x * .21 + zone) * .5 + Math.sin(z * .23 - x * .13) * .27;
}

function getTerrainHeight(zone: number, x: number, wave: number, z = 0) {
  const shoulder = smoothstep(7, 17, Math.abs(x));
  const shore = 1 - smoothstep(38, 48, Math.abs(x));
  const relief = TERRAIN_RELIEF[zone];
  // Les canaux de Water Seven et la cuvette de l'oasis d'Alabasta passent sous leur surface d'eau fixe.
  const canal = zone === 1 ? 1 - smoothstep(1.4, 3.5, Math.abs(Math.abs(x) - 22)) : 0;
  const oasis = zone === 0 ? 1 - smoothstep(4.8, 9.2, Math.hypot((x + 28) / 1.2, z + 32)) : 0;
  return .008 + shoulder * shore * Math.max(0, .35 + wave) * relief * (1 - canal) * (1 - oasis) - canal * .06;
}

function makeTerrain(zone: number) {
  const geometry = new THREE.PlaneGeometry(TERRAIN_WIDTH, TERRAIN_DEPTH, TERRAIN_COLUMNS, TERRAIN_ROWS);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  const base = new THREE.Color(ZONES[zone].ground);
  const tint = new THREE.Color(TINT_COLORS[zone] ?? "#ffffff");
  const color = new THREE.Color();

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const wave = getTerrainWave(zone, x, z);
    positions.setY(i, getTerrainHeight(zone, x, wave, z));
    color.copy(base).lerp(tint, THREE.MathUtils.clamp(0.22 + wave * 0.3, 0, 0.55));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function terrainSurfaceAt(geometry: THREE.BufferGeometry, x: number, z: number) {
  const u = (x / TERRAIN_WIDTH + .5) * TERRAIN_COLUMNS;
  const v = (z / TERRAIN_DEPTH + .5) * TERRAIN_ROWS;
  if (u < 0 || v < 0 || u > TERRAIN_COLUMNS || v > TERRAIN_ROWS) return -Infinity;
  const column = Math.min(TERRAIN_COLUMNS - 1, Math.floor(u));
  const row = Math.min(TERRAIN_ROWS - 1, Math.floor(v));
  const across = u - column, along = v - row;
  const first = row * (TERRAIN_COLUMNS + 1) + column;
  const nextRow = first + TERRAIN_COLUMNS + 1;
  const positions = geometry.getAttribute("position");
  const a = positions.getY(first), b = positions.getY(nextRow);
  const c = positions.getY(nextRow + 1), d = positions.getY(first + 1);
  return across + along <= 1
    ? a * (1 - across - along) + d * across + b * along
    : c * (across + along - 1) + d * (1 - along) + b * (1 - across);
}

function getPropRadius(type: PropType, s: number, seed: number): number {
  switch (type) {
    case "palm": return 2.6 * s;
    case "pyramid": return 10.8 * s;
    case "ruins": return 3.6 * s;
    case "cactus": return 1.2 * s;
    case "building": return (3.6 + seed * 3.5) * 0.82 * s;
    case "seaTrainPoles": return 5.45 * s;
    case "cloud": return 5.1 * s;
    case "giantJack": return 4.5 * s;
    case "bell": return 4.6 * s;
    case "sakura": return 3.2 * s;
    case "pagoda": return 6.5 * s;
    case "torii": return 4.2 * s;
    case "lantern": return 1.0 * s;
    case "drumMesa": return 9.3 * s;
    case "pine": return 2.1 * s;
    case "snowman": return 1.5 * s;
    case "giantSword": return 3.6 * s;
    case "vikingHall": return 6.8 * s;
    case "runestone": return 1.35 * s;
    case "drakkar": return 6.3 * s;
    case "justicePillar": return 1.9 * s;
    case "waterfallCliff": return 6.4 * s;
    case "courthouse": return 6.2 * s;
    case "rock":
    default: return 1.5 * s;
  }
}

function buildProps(): PropDef[] {
  const rnd = mulberry32(2026);
  const out: PropDef[] = [];
  for (let z = 0; z < ZONES.length; z++) {
    const types = ZONE_PROPS[z];
    const count = z === 2 ? 16 : 14;
    for (let i = 0; i < count; i++) {
      let side = rnd() > 0.5 ? 1 : -1;
      const type = types[Math.floor(rnd() * types.length)];
      const big =
        type === "pyramid" ||
        type === "pagoda" ||
        type === "bell" ||
        type === "giantJack" ||
        type === "drumMesa" ||
        type === "vikingHall" ||
        type === "courthouse" ||
        type === "waterfallCliff";
      const s = big ? 1.0 + rnd() * 0.5 : 0.8 + rnd() * 0.5;
      const rot = rnd() * Math.PI * 2;
      const seed = rnd();
      const radius = getPropRadius(type, s, seed);
      const minDist = 5.5 + radius;
      const maxDist = Math.max(minDist, 45.5 - radius);
      let distance: number;
      if (z === 1) {
        const innerMax = 22 - radius - 2.6;
        const outerMin = 22 + radius + 2.6;
        const intervals: Array<[number, number]> = [];
        if (innerMax >= minDist) intervals.push([minDist, innerMax]);
        if (maxDist >= outerMin) intervals.push([outerMin, maxDist]);
        if (intervals.length === 2) {
          const pick = type === "building" ? intervals[1] : intervals[rnd() < 0.5 ? 0 : 1];
          distance = pick[0] + rnd() * (pick[1] - pick[0]);
        } else if (intervals.length === 1) {
          distance = intervals[0][0] + rnd() * (intervals[0][1] - intervals[0][0]);
        } else {
          distance = THREE.MathUtils.clamp(22 + (rnd() > 0.5 ? 1 : -1) * (radius + 2.6), minDist, maxDist);
        }
      } else {
        const span = Math.max(0, maxDist - minDist);
        distance = minDist + rnd() * span;
      }
      const minZ = radius + 8;
      const maxZ = Math.max(minZ, ZONE_LEN - radius - 8);
      let localZ = minZ + rnd() * (maxZ - minZ);
      // Préserver la silhouette du monument central et l'oasis d'Alabasta.
      if (side > 0 && distance + radius > 16 && localZ + radius > 45 && localZ - radius < 115) side = -1;
      if (z === 0 && side < 0 && Math.hypot((side * distance + 28) / 1.2, localZ - ZONE_LEN / 2 + 32) < 7.5 + radius) {
        if (localZ + radius <= 45 || localZ - radius >= 115) side = 1;
        else localZ = Math.min(maxZ, Math.max(minZ, localZ < ZONE_LEN / 2 ? 48 + 9 + radius : localZ));
      }
      const zLocal = localZ - ZONE_LEN / 2;
      const x = side * distance;
      const y = getTerrainHeight(z, x, getTerrainWave(z, x, zLocal), zLocal) - 0.03;
      out.push({
        id: out.length,
        type,
        x,
        y,
        base: z * ZONE_LEN + localZ,
        s,
        rot,
        seed,
      });
    }
  }
  return out;
}

interface WorldProps {
  worldRef: React.RefObject<WorldState>;
  reducedMotion?: boolean;
  lowPower?: boolean;
  propFraction?: 0.5 | 0.75 | 1;
  islandCullDistance?: number;
  propCullDistance?: number;
  bridgeLengthOverride?: number;
  seaCreatureSlots?: number;
  seaCreatureCullAhead?: number;
  seaCreatureCullBehind?: number;
  phase?: Phase;
  cabinCenterZ?: number;
  cabinLength?: number;
}

export default function World({
  worldRef,
  reducedMotion = false,
  lowPower = false,
  propFraction,
  islandCullDistance,
  propCullDistance,
  bridgeLengthOverride,
  seaCreatureSlots,
  seaCreatureCullAhead,
  seaCreatureCullBehind,
  phase = "outside",
  cabinCenterZ = 0,
  cabinLength = 9.2,
}: WorldProps) {
  const allProps = useMemo(() => buildProps(), []);
  const terrains = useMemo(() => ZONES.map((_, index) => makeTerrain(index)), []);

  useEffect(() => () => {
    terrains.forEach((terrain) => terrain.dispose());
  }, [terrains]);
  const resolvedPropFraction = propFraction ?? (lowPower ? 0.5 : 1);
  const props = useMemo(() => {
    if (resolvedPropFraction === 0.5) return allProps.filter((_, index) => index % 2 === 0);
    if (resolvedPropFraction === 0.75) return allProps.filter((_, index) => index % 4 !== 3);
    return allProps;
  }, [allProps, resolvedPropFraction]);
  const propRefs = useRef<(THREE.Group | null)[]>([]);
  const zoneRefs = useRef<(THREE.Group | null)[]>([]);
  const terrainRefs = useRef<(THREE.Mesh | null)[]>([]);
  const sceneryRefs = useRef<(THREE.Group | null)[]>([]);
  const railRefs = useRef<(THREE.Group | null)[]>([]);
  const propBounds = useRef<(SceneryBounds | null)[]>([]);
  const sceneBounds = useRef<SceneryBounds[][]>([]);
  const railBounds = useRef<SceneryBounds[]>([]);
  const visibility = useMemo(() => createSceneryVisibility(), []);

  const bridgeLength = Math.max(960, bridgeLengthOverride ?? Math.max(1600, cabinLength + 1400));
  const bridgeSegments = Math.ceil(bridgeLength / 20);
  const markingCount = Math.ceil(bridgeLength / 960);
  const markingOffsets = useMemo(
    () => Array.from({ length: markingCount }, (_, index) => cabinCenterZ + (index - (markingCount - 1) / 2) * 960),
    [cabinCenterZ, markingCount],
  );
  const dashSpan = Math.ceil(bridgeLength / 10) * 10;
  const dashCount = dashSpan / 10;
  const dashes = useMemo(() => Array.from({ length: dashCount }, (_, i) => i * 10), [dashCount]);

  const refreshPropBounds = useCallback((index: number) => {
    const group = propRefs.current[index];
    propBounds.current[index] = group ? cacheSceneryBounds(group, group.position.z) : null;
  }, []);

  const refreshZoneBounds = useCallback((zone: number) => {
    const z = zoneRefs.current[zone]?.position.z ?? 0;
    const objects: THREE.Object3D[] = [];
    const landmark = sceneryRefs.current[zone * 3];
    if (landmark) {
      landmark.traverse(child => {
        if (child instanceof THREE.Mesh) objects.push(child);
      });
    }
    for (const side of [1, 2]) {
      const foreground = sceneryRefs.current[zone * 3 + side]?.children[0];
      if (foreground) objects.push(...foreground.children);
    }
    sceneBounds.current[zone] = objects.map(object => cacheSceneryBounds(object, z));
  }, []);

  useLayoutEffect(() => {
    propRefs.current.length = props.length;
    propBounds.current = props.map((_, i) => {
      const group = propRefs.current[i];
      return group ? cacheSceneryBounds(group, group.position.z) : null;
    });
    sceneBounds.current = ZONES.map((_, zone) => {
      const z = zoneRefs.current[zone]?.position.z ?? 0;
      const objects: THREE.Object3D[] = [];
      const landmark = sceneryRefs.current[zone * 3];
      if (landmark) {
        landmark.traverse(child => {
          if (child instanceof THREE.Mesh) objects.push(child);
        });
      }
      for (const side of [1, 2]) {
        const foreground = sceneryRefs.current[zone * 3 + side]?.children[0];
        if (foreground) objects.push(...foreground.children);
      }
      return objects.map(object => cacheSceneryBounds(object, z));
    });
    railBounds.current = railRefs.current.flatMap(group => group ? [cacheSceneryBounds(group, 0)] : []);
  }, [props, lowPower, cabinCenterZ, bridgeLength]);

  const dashRef = useRef<THREE.InstancedMesh>(null);
  const dashMatrix = useMemo(() => new THREE.Matrix4(), []);
  const zoneZ = useRef<number[]>(new Array<number>(ZONES.length).fill(0));

  useFrame((state, dt) => {
    const frameDt = Math.min(dt, phase==="entering"||phase==="exiting"?0.25:0.1);
    const mult = (worldRef.current?.speedMultiplier ?? 1.0) * (worldRef.current.motionFactor ?? 1);
    const scroll = (worldRef.current?.scroll ?? 0) + frameDt * WORLD_SPEED * mult;
    if (worldRef.current) worldRef.current.scroll = scroll;

    visibility.begin(state.camera);
    for (const rail of railBounds.current) visibility.update(rail, 0);

    const loopStart = cabinCenterZ - LOOP / 2;
    const loopEnd = cabinCenterZ + LOOP / 2;

    // Boucler les 8 îles dans [cabinCenterZ - LOOP / 2, cabinCenterZ + LOOP / 2]
    for (let i = 0; i < ZONES.length; i++) {
      const g = zoneRefs.current[i];
      if (!g) continue;
      const center = i * ZONE_LEN + ZONE_LEN / 2;
      let z = (((center + scroll + WINDOW_START - loopStart) % LOOP) + LOOP) % LOOP + loopStart;
      if (z > loopEnd) z -= LOOP;
      zoneZ.current[i] = z;
      g.position.z = z;
      const eye = state.camera.position;
      const dzEdge = Math.max(0, Math.abs(z - eye.z) - ZONE_LEN / 2);
      if (islandCullDistance !== undefined && dzEdge > islandCullDistance) {
        g.visible = false;
        continue;
      }
      g.visible = true;
      const terrain = terrainRefs.current[i];
      const localZ = eye.z - z;
      if (terrain) terrain.visible = eye.y > 1.37 || eye.y >= terrainSurfaceAt(terrain.geometry, eye.x, localZ) - 0.06;
      for (const block of sceneBounds.current[i] ?? []) visibility.update(block, z);
    }

    // Les props suivent exactement le bouclage de leur île sur toute la fenêtre.
    for (let i = 0; i < props.length; i++) {
      const g = propRefs.current[i];
      if (!g) continue;
      const zoneIdx = Math.floor(props[i].base / ZONE_LEN);
      const localOffset = props[i].base - (zoneIdx * ZONE_LEN + ZONE_LEN / 2);
      const z = zoneZ.current[zoneIdx] + localOffset;
      g.position.z = z;
      const eye = state.camera.position;
      const dx = props[i].x - eye.x;
      const dz = z - eye.z;
      if (propCullDistance !== undefined && dx * dx + dz * dz > propCullDistance * propCullDistance) {
        g.visible = false;
        continue;
      }
      const bounds = propBounds.current[i];
      if (bounds) visibility.update(bounds, z);
      else g.visible = true;
    }

    // Défilement des lignes blanches du pont sur toute la portée dynamique
    const dashStart = cabinCenterZ - dashSpan / 2;
    for (let i = 0; i < dashes.length; i++) {
      const z = ((((dashes[i] + scroll - dashStart) % dashSpan) + dashSpan) % dashSpan) + dashStart;
      dashMatrix.makeTranslation(0, 0.052, z);
      dashRef.current?.setMatrixAt(i, dashMatrix);
    }
    if (dashRef.current) dashRef.current.instanceMatrix.needsUpdate = true;

    // Calcul de la zone active et fondu météorologique continu
    const baseAtBus = (((-WINDOW_START - scroll) % LOOP) + LOOP) % LOOP;
    if (worldRef.current) {
      const zone = Math.floor(baseAtBus / ZONE_LEN) % ZONES.length;
      const visit = Math.floor((-WINDOW_START - scroll) / LOOP);
      const targetWeather = weatherForLandscape(zone, visit);
      const currentWeather = worldRef.current.weather;
      let targetIntensity = 0;
      if (targetWeather === currentWeather) {
        targetIntensity = targetWeather === "clear" ? 0 : targetWeather === "rain" ? 0.9 : 0.72;
      } else if (worldRef.current.weatherIntensity <= 0.01) {
        worldRef.current.weather = targetWeather;
        targetIntensity = targetWeather === "clear" ? 0 : targetWeather === "rain" ? 0.9 : 0.72;
      }
      worldRef.current.zone = zone;
      worldRef.current.weatherIntensity +=
        (targetIntensity - worldRef.current.weatherIntensity) * Math.min(1, frameDt * 0.65);
    }
  });

  return (
    <group>
      <WorldOcean worldRef={worldRef} reducedMotion={reducedMotion} />
      <WorldSeaCreatures
        worldRef={worldRef}
        cabinCenterZ={cabinCenterZ}
        reducedMotion={reducedMotion}
        lowPower={lowPower}
        slotLimit={seaCreatureSlots}
        cullAhead={seaCreatureCullAhead}
        cullBehind={seaCreatureCullBehind}
      />

      {/* Îles des 8 mondes avec rivages et plages */}
      {ZONES.map((zone, i) => (
        <group
          key={zone.name}
          name={`world-island-${i}`}
          ref={(el: THREE.Group | null) => {
            zoneRefs.current[i] = el;
          }}
        >
          {/* Terre principale */}
          <mesh position={[0, -0.34, 0]} receiveShadow>
            <boxGeometry args={[96, 0.6, ZONE_LEN - 16]} />
            <meshStandardMaterial color={zone.ground} roughness={0.9} />
          </mesh>
          <mesh ref={(el: THREE.Mesh | null) => { terrainRefs.current[i] = el; }} geometry={terrains[i]} receiveShadow>
            <meshStandardMaterial vertexColors roughness={0.95} side={THREE.FrontSide} />
          </mesh>
          <group ref={(element: THREE.Group | null) => { sceneryRefs.current[i * 3] = element; }}>
            <WorldSetPiece
              zone={i}
              lowPower={lowPower}
              reducedMotion={reducedMotion}
              onMeshesReady={() => refreshZoneBounds(i)}
            />
          </group>
          {[-1, 1].map((side, part) => <group
            key={side}
            ref={(element: THREE.Group | null) => { sceneryRefs.current[i * 3 + part + 1] = element; }}
          >
            <WorldForeground zone={i} side={side} lowPower={lowPower} />
          </group>)}
          {/* Plage / bordure d'île */}
          <mesh position={[0, -0.44, 0]} receiveShadow>
            <boxGeometry args={[104, 0.32, ZONE_LEN - 8]} />
            <meshStandardMaterial color={zone.shore} roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* Pont maritime continu de Grand Line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.024, cabinCenterZ]} receiveShadow>
        <planeGeometry args={[7.4, bridgeLength, 1, bridgeSegments]} />
        <meshStandardMaterial color="#2d3036" roughness={0.92} />
      </mesh>

      {/* Bandes de rive jaunes */}
      {[-3.5, 3.5].map((x) => (
        <group key={x} name={`world-bridge-edge-marking-${x < 0 ? "left" : "right"}`}>
          {markingOffsets.map((zOffset, seg) => (
            <mesh key={seg} position={[x, 0.048, zOffset]}>
              <boxGeometry args={BRIDGE_MARKING_BOX} />
              <meshStandardMaterial color="#ffc107" roughness={0.8} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Rambardes de sécurité chromées du pont maritime */}
      {[-3.85, 3.85].map((x, i) => (
        <group key={x} ref={(el: THREE.Group | null) => { railRefs.current[i] = el; }}>
          <mesh position={[x, 0.42, cabinCenterZ]}>
            <boxGeometry args={[0.1, 0.55, bridgeLength, 1, 1, bridgeSegments]} />
            <meshStandardMaterial color="#969cb0" roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Ligne médiane discontinue animée */}
      <instancedMesh key={dashCount} ref={dashRef} args={[undefined, undefined, dashCount]} frustumCulled={false}>
        <boxGeometry args={[0.22, 0.02, 3.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </instancedMesh>

      {/* Décors 3D enrichis des mondes */}
      {props.map((p, i) => (
        <group
          key={p.id ?? i}
          name={`world-prop-${p.type}-${p.id ?? i}`}
          ref={(el: THREE.Group | null) => {
            propRefs.current[i] = el;
          }}
          position={[p.x, p.y ?? 0, 0]}
          rotation={[0, p.rot, 0]}
        >
          <WorldLandmark def={p} onReady={() => refreshPropBounds(i)} />
        </group>
      ))}
    </group>
  );
}
