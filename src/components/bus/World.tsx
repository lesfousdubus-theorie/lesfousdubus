"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { WorldLandmark, type PropDef, type PropType } from "./WorldLandmark";
import WorldSetPiece, { WorldForeground } from "./WorldSetPiece";
import { createOnePieceDistantLod, type SceneryBatch } from "@/lib/one-piece-scenery";
import WorldOcean, { SEA_WAKE_COUNT } from "./WorldOcean";
import WorldSeaCreatures from "./WorldSeaCreatures";
import { useFrame } from "@react-three/fiber";
import { WORLD_SPEED, type Phase, type WorldState } from "./constants";
import { cacheSceneryBounds, createSceneryVisibility, type SceneryBounds } from "@/lib/world-visibility";
import {
  createRandomSeed,
  createZoneLoopOrder,
  getActiveZoneLoopState,
  getZoneSlotCenterZ,
  mulberry32,
} from "@/lib/world-route";

export const ZONE_LEN = 160;
const TERRAIN_RELIEF = [1.1, .32, .55, .65, 1.05, .45, .64, .25];
const TERRAIN_WIDTH = 96;
const TERRAIN_DEPTH = ZONE_LEN - 16;
const TERRAIN_COLUMNS = 28;
const TERRAIN_ROWS = 36;

export const ZONES = [
  { name: "Alabasta", subtitle: "Royaume des sables", ground: "#e5bd6a", shore: "#d8a84e" },
  { name: "Water Seven", subtitle: "La cité de l'eau", ground: "#9ec5d4", shore: "#6da3ba" },
  { name: "Skypiea", subtitle: "L'île céleste", ground: "#eef6ff", shore: "#cfe5fa" },
  { name: "Pays des Wa", subtitle: "Terre des samouraïs", ground: "#5da854", shore: "#86c878" },
  { name: "Île de Drum", subtitle: "Royaume des neiges", ground: "#ebf2fa", shore: "#dbe5f2" },
  { name: "Egghead", subtitle: "L'île du futur", ground: "#83cfa3", shore: "#80cfda" },
  { name: "Elbaf", subtitle: "Royaume des géants", ground: "#76a951", shore: "#9a8664" },
  { name: "Enies Lobby", subtitle: "L'île judiciaire", ground: "#78a962", shore: "#c6f0ed" },
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
  "#d8e6c8",
] as const;

const ZONE_PROPS: Record<number, PropType[]> = {
  0: ["palm", "palm", "cactus", "cactus", "pyramid", "ruins", "rock"],
  1: ["building", "building", "building", "seaTrainPoles", "rock"],
  2: ["cloud", "cloud", "cloudHouse", "skyJungleTree", "shandoraRuin"],
  3: ["sakura", "sakura", "sakura", "pagoda", "torii", "lantern"],
  4: ["pine", "pine", "pine", "snowman", "drumMesa", "rock"],
  5: ["palm"],
  6: ["pine", "giantSword", "vikingHall", "runestone", "drakkar", "rock"],
  7: ["justicePillar", "courthouse", "waterfallCliff", "seaTrainPoles", "rock"],
};

function weatherForLandscape(zone: number, visit: number, seed: number): WorldState["weather"] {
  const value = mulberry32((visit + 2048) * 7919 + zone * 104729 + seed)();

  if (zone === 4) return value < 0.78 ? "snow" : value < 0.9 ? "rain" : "clear";
  if (zone === 1) return value < 0.62 ? "rain" : value < 0.68 ? "snow" : "clear";
  if (zone === 3) return value < 0.34 ? "rain" : value < 0.5 ? "snow" : "clear";
  if (zone === 2) return value < 0.25 ? "rain" : value < 0.35 ? "snow" : "clear";
  if (zone === 6) return value < 0.16 ? "rain" : "clear";
  if (zone === 7) return value < 0.05 ? "rain" : "clear";
  if (zone === 5) return value < 0.18 ? "rain" : "clear";
  return value < 0.12 ? "rain" : "clear";
}

function smoothstep(start: number, end: number, value: number) {
  const t = THREE.MathUtils.clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}

function getTerrainWave(zone: number, x: number, z: number) {
  const mx = -x;
  return Math.sin(z * .11 + mx * .21 + zone) * .5 + Math.sin(z * .23 - mx * .13) * .27;
}

function getTerrainHeight(zone: number, x: number, wave: number, z = 0) {
  const absX = Math.abs(x);
  const shoulder = smoothstep(7, 17, absX);
  const shore = 1 - smoothstep(38, 48, absX);
  const relief = TERRAIN_RELIEF[zone];
  // Abaisse nettement le terrain sous la chaussée (|x| <= 3,7 m) pour empêcher tout Z-fighting au dézoom.
  const roadBed = 1 - smoothstep(3.65, 4.45, absX);
  // Les canaux de Water Seven et la cuvette de l'oasis d'Alabasta (inversée côté +X) passent sous leur surface d'eau fixe.
  const canal = zone === 1 ? 1 - smoothstep(1.4, 3.5, Math.abs(absX - 22)) : 0;
  const oasis = zone === 0 ? 1 - smoothstep(4.8, 9.2, Math.hypot((x - 28) / 1.2, z + 32)) : 0;
  return .008 - roadBed * .19 + shoulder * shore * Math.max(0, .35 + wave) * relief * (1 - canal) * (1 - oasis) - canal * .06;
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

function buildProps(worldSeed = 2026): PropDef[] {
  const rnd = mulberry32(worldSeed);
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
      // Inverse gauche <-> droite (x -> -x) en miroir exact des décors et reliefs de l'île.
      const x = -side * distance;
      const y = getTerrainHeight(z, x, getTerrainWave(z, x, zLocal), zLocal) - 0.03;
      out.push({
        id: out.length,
        type,
        x,
        y,
        base: z * ZONE_LEN + localZ,
        s,
        rot: -rot,
        seed,
      });
    }
  }
  return out;
}

function IslandTerrain({ zone, terrainRef }: { zone: number; terrainRef: (el: THREE.Mesh | null) => void }) {
  const geometry = useMemo(() => makeTerrain(zone), [zone]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh ref={terrainRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} side={THREE.FrontSide} />
    </mesh>
  );
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
  onReady?: (ready: boolean) => void;
  onLoadProgress?: (progress: number) => void;
}

const World = memo(function World({
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
  onReady,
  onLoadProgress,
}: WorldProps) {
  const [{ seed: worldSeed, order: zoneOrder }] = useState(() => {
    const seed = createRandomSeed();
    return {
      seed,
      order: createZoneLoopOrder(ZONES.length, mulberry32(seed ^ 0x9e3779b9)),
    };
  });
  const slotByZone = useMemo(() => {
    const slots = new Array<number>(ZONES.length).fill(0);
    zoneOrder.forEach((zoneIndex, slot) => {
      slots[zoneIndex] = slot;
    });
    return slots;
  }, [zoneOrder]);
  const initialZoneLoadOrder = useMemo(() => {
    const initialCenter = cabinLength > LOOP * 0.45 ? 0 : cabinCenterZ;
    const loopStart = initialCenter - LOOP / 2;
    const loopEnd = initialCenter + LOOP / 2;
    return Array.from({ length: ZONES.length }, (_, i) => i).sort((a, b) => {
      const za = Math.abs(getZoneSlotCenterZ(slotByZone[a], 0, ZONE_LEN, LOOP, loopStart, loopEnd) - initialCenter);
      const zb = Math.abs(getZoneSlotCenterZ(slotByZone[b], 0, ZONE_LEN, LOOP, loopStart, loopEnd) - initialCenter);
      return za - zb;
    });
  }, [slotByZone, cabinCenterZ, cabinLength]);
  const allProps = useMemo(() => {
    const raw = buildProps(worldSeed);
    const rank = new Map<number, number>(initialZoneLoadOrder.map((z, idx) => [z, idx]));
    return [...raw].sort((a, b) => {
      const za = rank.get(Math.floor(a.base / ZONE_LEN)) ?? 99;
      const zb = rank.get(Math.floor(b.base / ZONE_LEN)) ?? 99;
      return za - zb;
    });
  }, [worldSeed, initialZoneLoadOrder]);

  const resolvedPropFraction = propFraction ?? (lowPower ? 0.5 : 1);
  const props = useMemo(() => {
    if (resolvedPropFraction === 0.5) return allProps.filter((_, index) => index % 2 === 0);
    if (resolvedPropFraction === 0.75) return allProps.filter((_, index) => index % 4 !== 3);
    return allProps;
  }, [allProps, resolvedPropFraction]);
  // Découpage fin : 4 micro-étapes par île + 1 LOD lointain par frame pour garder le gouvernail 100 % fluide au chargement.
  const [zoneSubStage, setZoneSubStage] = useState(1);
  const [seaCreaturesReady, setSeaCreaturesReady] = useState(false);
  const [propLimit, setPropLimit] = useState(2);
  const [distantZoneBatches, setDistantZoneBatches] = useState<SceneryBatch[][]>(() => ZONES.map(() => []));
  const distantBuiltCountRef = useRef(0);
  const distantZoneBatchesRef = useRef<SceneryBatch[][]>(ZONES.map(() => []));
  const loadStepNextAtRef = useRef(0);
  const distantLodReady = distantZoneBatches.every((batches) => batches.length > 0);
  const worldLoaded = zoneSubStage >= ZONES.length * 4 && seaCreaturesReady && propLimit >= props.length && distantLodReady;
  useEffect(() => {
    onReady?.(worldLoaded);
  }, [onReady, worldLoaded]);
  useEffect(() => {
    const zoneFrac = Math.min(1, zoneSubStage / (ZONES.length * 4));
    const propFrac = props.length > 0 ? Math.min(1, propLimit / props.length) : 1;
    const lodBuilt = distantZoneBatches.reduce((sum, b) => sum + (b.length > 0 ? 1 : 0), 0);
    const lodFrac = lodBuilt / ZONES.length;
    onLoadProgress?.(zoneFrac * 0.45 + lodFrac * 0.25 + (seaCreaturesReady ? 0.1 : 0) + propFrac * 0.2);
  }, [distantZoneBatches, onLoadProgress, propLimit, props.length, seaCreaturesReady, zoneSubStage]);
  const zoneStageFor = useCallback((zone: number) => {
    const rank = initialZoneLoadOrder.indexOf(zone);
    if (rank < 0) return 0;
    return Math.max(0, Math.min(4, zoneSubStage - rank * 4));
  }, [initialZoneLoadOrder, zoneSubStage]);
  const visibleProps = useMemo(
    () => props.slice(0, propLimit),
    [props, propLimit],
  );
  const propRefs = useRef<(THREE.Group | null)[]>([]);
  const zoneRefs = useRef<(THREE.Group | null)[]>([]);
  const terrainRefs = useRef<(THREE.Mesh | null)[]>([]);
  const sceneryRefs = useRef<(THREE.Group | null)[]>([]);
  const propBounds = useRef<(SceneryBounds | null)[]>([]);
  const sceneBounds = useRef<SceneryBounds[][]>([]);
  const dirtyZonesRef = useRef<Set<number>>(new Set());
  const dirtyPropsRef = useRef<Set<number>>(new Set());
  const visibility = useMemo(() => createSceneryVisibility(), []);

  const bridgeLength = Math.max(960, bridgeLengthOverride ?? Math.max(1600, cabinLength + 1400));
  const horizonBound = Math.max(480, islandCullDistance ?? 580);

  // Chaque île (détaillée ou LOD lointaine) embarque son propre tronçon de route (ZONE_LEN = 160 m)
  // ainsi que les vraies structures One Piece en géométrie allégée (instanciée par matériau) pour
  // qu'aucun paysage au loin ou au dézoom ne soit jamais vide.
  const distantScrollGroupRef = useRef<THREE.Group>(null);
  const lastDistantLayoutKeyRef = useRef("");
  const nextFlightLayoutAtRef = useRef(0);
  const distantGroundRef = useRef<THREE.InstancedMesh>(null);
  const distantShoreRef = useRef<THREE.InstancedMesh>(null);
  const distantRoadRef = useRef<THREE.InstancedMesh>(null);
  const distantYellowRef = useRef<THREE.InstancedMesh>(null);
  const distantRailRef = useRef<THREE.InstancedMesh>(null);
  const distantDashRef = useRef<THREE.InstancedMesh>(null);
  const distantTileCapacity = Math.max(32, Math.ceil((cabinLength + Math.max(bridgeLength, horizonBound * 2) + 2400) / ZONE_LEN) + 12);
  const distantZoneCapacity = Math.max(8, Math.ceil(distantTileCapacity / ZONES.length) + 6);
  const distantDashCapacity = 24;
  useEffect(
    () => () => {
      for (const batches of distantZoneBatchesRef.current) {
        for (const { geometry } of batches) geometry.dispose();
      }
    },
    [],
  );
  const distantZoneMeshRefs = useRef<(THREE.InstancedMesh | null)[][]>(ZONES.map(() => []));
  const distantZoneZsRef = useRef<number[][]>(ZONES.map(() => []));
  const tileDashOffsets = useMemo(() => Array.from({ length: 16 }, (_, i) => -75 + i * 10), []);
  // Géométries & matériaux de route fusionnés et partagés entre les 8 îles détaillées (4 draw calls par île au lieu de 21).
  const sharedRoadAssets = useMemo(() => {
    const planeGeo = new THREE.PlaneGeometry(7.4, ZONE_LEN, 1, 1);
    const yellowParts = [-3.5, 3.5].map((x) => {
      const g = new THREE.BoxGeometry(0.18, 0.02, ZONE_LEN);
      g.translate(x, 0.052, 0);
      return g;
    });
    const yellowGeo = mergeGeometries(yellowParts, false)!;
    yellowParts.forEach((g) => g.dispose());

    const railParts = [-3.85, 3.85].map((x) => {
      const g = new THREE.BoxGeometry(0.1, 0.55, ZONE_LEN);
      g.translate(x, 0.42, 0);
      return g;
    });
    const railGeo = mergeGeometries(railParts, false)!;
    railParts.forEach((g) => g.dispose());

    const dashParts = tileDashOffsets.map((dz) => {
      const g = new THREE.BoxGeometry(0.22, 0.02, 3.2);
      g.translate(0, 0.056, dz);
      return g;
    });
    const dashGeo = mergeGeometries(dashParts, false)!;
    dashParts.forEach((g) => g.dispose());

    const roadMat = new THREE.MeshStandardMaterial({
      color: "#2d3036",
      roughness: 0.92,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const yellowMat = new THREE.MeshStandardMaterial({
      color: "#ffc107",
      roughness: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const railMat = new THREE.MeshStandardMaterial({ color: "#969cb0", roughness: 0.5, metalness: 0.5 });
    const dashMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    return { planeGeo, yellowGeo, railGeo, dashGeo, roadMat, yellowMat, railMat, dashMat };
  }, [tileDashOffsets]);
  useEffect(
    () => () => {
      sharedRoadAssets.planeGeo.dispose();
      sharedRoadAssets.yellowGeo.dispose();
      sharedRoadAssets.railGeo.dispose();
      sharedRoadAssets.dashGeo.dispose();
      sharedRoadAssets.roadMat.dispose();
      sharedRoadAssets.yellowMat.dispose();
      sharedRoadAssets.railMat.dispose();
      sharedRoadAssets.dashMat.dispose();
    },
    [sharedRoadAssets],
  );
  const distantMatrix = useMemo(() => new THREE.Matrix4(), []);
  const distantColor = useMemo(() => new THREE.Color(), []);
  const detailedVisibleRef = useRef<boolean[]>(new Array<boolean>(ZONES.length).fill(true));
  const detailedTileByZoneRef = useRef<Int32Array>(new Int32Array(ZONES.length));

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

  const flushDirtyBounds = useCallback(() => {
    if (dirtyZonesRef.current.size > 0) {
      for (const zone of dirtyZonesRef.current) {
        refreshZoneBounds(zone);
      }
      dirtyZonesRef.current.clear();
    }
    if (dirtyPropsRef.current.size > 0) {
      for (const index of dirtyPropsRef.current) {
        refreshPropBounds(index);
      }
      dirtyPropsRef.current.clear();
    }
  }, [refreshPropBounds, refreshZoneBounds]);

  useLayoutEffect(() => {
    propRefs.current.length = props.length;
    propBounds.current = new Array(props.length).fill(null);
    dirtyPropsRef.current.clear();
    for (let i = 0; i < props.length; i++) {
      if (propRefs.current[i]) dirtyPropsRef.current.add(i);
    }
    if (worldRef.current) {
      const initial = getActiveZoneLoopState(worldRef.current.scroll, zoneOrder, ZONE_LEN);
      worldRef.current.zone = initial.zone;
    }
  }, [props, lowPower, worldRef, zoneOrder]);

  useLayoutEffect(() => {
    flushDirtyBounds();
  }, [flushDirtyBounds, zoneSubStage, visibleProps.length, props, lowPower]);

  const zoneZ = useRef<number[]>(new Array<number>(ZONES.length).fill(0));
  const seaWakesRef = useRef<THREE.Vector4[]>(
    Array.from({ length: SEA_WAKE_COUNT }, () => new THREE.Vector4(0, 0, 1, 0)),
  );

  useFrame((state, dt) => {
    // Charger chaque élément par micro-étapes espacées d'au moins 20 ms afin de ne jamais
    // bloquer le thread principal ni faire saccader le gouvernail de chargement.
    const now = performance.now();
    if (now >= loadStepNextAtRef.current) {
      if (zoneSubStage < ZONES.length * 4) {
        loadStepNextAtRef.current = now + 22;
        setZoneSubStage((prev) => Math.min(ZONES.length * 4, prev + 1));
      } else if (distantBuiltCountRef.current < ZONES.length) {
        loadStepNextAtRef.current = now + 24;
        const zIdx = distantBuiltCountRef.current;
        distantBuiltCountRef.current += 1;
        const built = createOnePieceDistantLod(zIdx);
        const nextBatches = distantZoneBatchesRef.current.slice();
        nextBatches[zIdx] = built;
        distantZoneBatchesRef.current = nextBatches;
        lastDistantLayoutKeyRef.current = "";
        setDistantZoneBatches(nextBatches);
      } else if (!seaCreaturesReady) {
        loadStepNextAtRef.current = now + 20;
        setSeaCreaturesReady(true);
      } else if (propLimit < props.length) {
        loadStepNextAtRef.current = now + 18;
        setPropLimit((prev) => Math.min(props.length, prev + 4));
      }
    }

    flushDirtyBounds();

    const frameDt = Math.min(dt, phase==="entering"||phase==="exiting"?0.25:0.1);
    if (worldRef.current) {
      const targetSpeed = worldRef.current.targetSpeedMultiplier ?? worldRef.current.speedMultiplier ?? 1.0;
      const currentSpeed = worldRef.current.speedMultiplier ?? targetSpeed;
      const diff = targetSpeed - currentSpeed;
      if (Math.abs(diff) < 0.002) {
        worldRef.current.speedMultiplier = targetSpeed;
      } else {
        const rate = diff < 0 ? 2.6 : 2.1;
        worldRef.current.speedMultiplier = currentSpeed + diff * (1 - Math.exp(-frameDt * rate));
      }
    }
    const mult = (worldRef.current?.speedMultiplier ?? 1.0) * (worldRef.current.motionFactor ?? 1);
    const scroll = (worldRef.current?.scroll ?? 0) + frameDt * WORLD_SPEED * mult;
    if (worldRef.current) worldRef.current.scroll = scroll;

    visibility.begin(state.camera);

    // Sur un bus très long (ex. 20 000 passagers), on centre la boucle des îles détaillées
    // autour de la caméra (bornée au bus), tout en plafonnant l'avant à exactement 3 paysages
    // devant le nez du bus (un nouveau s'ajoute dès que le bus entre sur un nouveau paysage).
    const busStartZ = cabinCenterZ - cabinLength / 2;
    const busEndZ = cabinCenterZ + cabinLength / 2;
    const frontTileIdx = Math.round((busStartZ - scroll + 40) / ZONE_LEN);
    const minAllowedTileIdx = frontTileIdx - 3;
    const minAllowedCenterZ = -40 + minAllowedTileIdx * ZONE_LEN + scroll;
    const sceneryCenterZ = cabinLength > LOOP * 0.45
      ? THREE.MathUtils.clamp(state.camera.position.z, busStartZ - 30, busEndZ + 30)
      : cabinCenterZ;
    const loopStart = Math.max(sceneryCenterZ - LOOP / 2, minAllowedCenterZ - 1);
    const loopEnd = loopStart + LOOP;

    // Boucler les 8 îles détaillées dans un ordre aléatoire sans répétition avant la fin du tour ;
    // au-delà de detailedSwitchDist (~180–220 m), la tuile LOD allégée (mêmes structures) prend le relais.
    const detailedSwitchDist = Math.min(islandCullDistance ?? 480, lowPower ? 180 : 220);
    for (let i = 0; i < ZONES.length; i++) {
      const g = zoneRefs.current[i];
      if (!g) continue;
      const z = getZoneSlotCenterZ(slotByZone[i], scroll, ZONE_LEN, LOOP, loopStart, loopEnd);
      zoneZ.current[i] = z;
      g.position.z = z;
      const eye = state.camera.position;
      const dzEdge = Math.max(0, Math.abs(z - eye.z) - ZONE_LEN / 2);
      const switchLimit = detailedVisibleRef.current[i] ? detailedSwitchDist + 24 : detailedSwitchDist;
      if (z < minAllowedCenterZ - 1 || dzEdge > switchLimit) {
        g.visible = false;
        detailedVisibleRef.current[i] = false;
        continue;
      }
      g.visible = true;
      detailedVisibleRef.current[i] = true;
      const terrain = terrainRefs.current[i];
      const localZ = eye.z - z;
      if (terrain) terrain.visible = eye.y > 1.37 || eye.y >= terrainSurfaceAt(terrain.geometry, eye.x, localZ) - 0.06;
      for (const block of sceneBounds.current[i] ?? []) visibility.update(block, z);
    }

    // Les props suivent exactement le bouclage de leur île sur toute la fenêtre.
    const effectivePropCull = Math.min(propCullDistance ?? detailedSwitchDist, detailedSwitchDist);
    for (let i = 0; i < visibleProps.length; i++) {
      const g = propRefs.current[i];
      if (!g) continue;
      const zoneIdx = Math.floor(visibleProps[i].base / ZONE_LEN);
      if (!detailedVisibleRef.current[zoneIdx]) {
        g.visible = false;
        continue;
      }
      const localOffset = visibleProps[i].base - (zoneIdx * ZONE_LEN + ZONE_LEN / 2);
      const z = zoneZ.current[zoneIdx] + localOffset;
      g.position.z = z;
      const eye = state.camera.position;
      const dx = visibleProps[i].x - eye.x;
      const dz = z - eye.z;
      if (dx * dx + dz * dz > effectivePropCull * effectivePropCull) {
        g.visible = false;
        continue;
      }
      const bounds = propBounds.current[i];
      if (bounds) visibility.update(bounds, z);
      else g.visible = true;
    }

    // Tuiles d'îles simplifiées (LOD lointain) avec leur route intégrée et leurs vrais décors allégés :
    // le groupe parent porte la translation continue +scroll (0 upload GPU/frame), les matrices d'instances
    // ne sont reconstruites que lorsqu'une tuile change d'index (~toutes les 6 s).
    if (distantScrollGroupRef.current) {
      distantScrollGroupRef.current.position.z = scroll;
    }
    if (
      distantGroundRef.current
      && distantShoreRef.current
      && distantRoadRef.current
      && distantYellowRef.current
      && distantRailRef.current
      && distantDashRef.current
    ) {
      const eye = state.camera.position;
      const eyeZ = eye.z;
      const horizon = Math.max(640, islandCullDistance ?? 720);
      const spanMax = Math.max(busEndZ + 480, eyeZ + horizon, loopEnd);
      const firstIndex = minAllowedTileIdx;
      // Aligner lastIndex et eyeTileIdx sur des multiples propres pour éviter de reconstruire les buffers
      // 5 fois par tuile à des phases décalées pendant le défilement continu du bus.
      const tileSpan = Math.ceil((spanMax - minAllowedCenterZ) / ZONE_LEN) + 2;
      const lastIndex = firstIndex + tileSpan;
      const rawEyeTileIdx = Math.round((eyeZ - scroll + 40) / ZONE_LEN);
      const snappedEyeTileIdx = Math.round(rawEyeTileIdx / 4) * 4;
      // Les socles d'îles et la route couvrent tout le bus (6,5 km+), tandis que les monuments 3D LOD
      // couvrent ±1,1 à ±2,4 km autour de la caméra (évite de tracer 10 copies sub-pixel à 6 km).
      const landmarkRadius = Math.max(
        1100,
        Math.min(2400, Math.round((Math.hypot(eye.x, eye.y) * 2.2 + 960) / 320) * 320),
      );
      let detailedSig = "";
      const detailedTileByZone = detailedTileByZoneRef.current;
      detailedTileByZone.fill(-999999);
      for (let zIdx = 0; zIdx < ZONES.length; zIdx++) {
        if (detailedVisibleRef.current[zIdx]) {
          const dTile = Math.round((zoneZ.current[zIdx] - scroll + 40) / ZONE_LEN);
          detailedTileByZone[zIdx] = dTile;
          detailedSig += `${zIdx}:${dTile}:${zoneStageFor(zIdx) < 2 ? 0 : 1},`;
        }
      }
      const layoutKey = `${firstIndex}|${lastIndex}|${snappedEyeTileIdx}|${landmarkRadius}|${distantTileCapacity}|${detailedSig}`;
      const isBoardingFlight = phase === "entering" || phase === "exiting";
      if (layoutKey !== lastDistantLayoutKeyRef.current && (!isBoardingFlight || now >= nextFlightLayoutAtRef.current)) {
        if (isBoardingFlight) nextFlightLayoutAtRef.current = now + 260;
        lastDistantLayoutKeyRef.current = layoutKey;
        const distantZoneZs = distantZoneZsRef.current;
        for (let zIdx = 0; zIdx < ZONES.length; zIdx++) distantZoneZs[zIdx].length = 0;
        let tileCount = 0;
        let dashCountOut = 0;
        for (let tileIdx = firstIndex; tileIdx <= lastIndex && tileCount < distantTileCapacity; tileIdx++) {
          const localZ = -40 + tileIdx * ZONE_LEN;
          const worldZ = localZ + scroll;
          if (worldZ - ZONE_LEN * 0.5 > spanMax) continue;
          const slot = ((-tileIdx % ZONES.length) + ZONES.length) % ZONES.length;
          const zoneIdx = zoneOrder[slot] ?? 0;
          const withinLandmarkHorizon = Math.abs(worldZ - eyeZ) <= landmarkRadius;
          if (detailedTileByZone[zoneIdx] === tileIdx) {
            if (zoneStageFor(zoneIdx) < 2 && withinLandmarkHorizon && distantZoneZs[zoneIdx].length < distantZoneCapacity) {
              distantZoneZs[zoneIdx].push(localZ);
            }
            continue;
          }
          const zone = ZONES[zoneIdx];

          distantMatrix.makeTranslation(0, -0.34, localZ);
          distantGroundRef.current.setMatrixAt(tileCount, distantMatrix);
          distantColor.set(zone.ground);
          distantGroundRef.current.setColorAt(tileCount, distantColor);

          distantMatrix.makeTranslation(0, -0.44, localZ);
          distantShoreRef.current.setMatrixAt(tileCount, distantMatrix);
          distantColor.set(zone.shore);
          distantShoreRef.current.setColorAt(tileCount, distantColor);

          distantMatrix.makeTranslation(0, 0.024, localZ);
          distantRoadRef.current.setMatrixAt(tileCount, distantMatrix);

          distantMatrix.makeTranslation(0, 0, localZ);
          distantYellowRef.current.setMatrixAt(tileCount, distantMatrix);
          distantRailRef.current.setMatrixAt(tileCount, distantMatrix);

          if (Math.abs(tileIdx - snappedEyeTileIdx) <= 9 && dashCountOut < distantDashCapacity) {
            distantDashRef.current.setMatrixAt(dashCountOut++, distantMatrix);
          }

          if (withinLandmarkHorizon && distantZoneZs[zoneIdx].length < distantZoneCapacity) {
            distantZoneZs[zoneIdx].push(localZ);
          }

          tileCount += 1;
        }
        distantGroundRef.current.count = tileCount;
        distantShoreRef.current.count = tileCount;
        distantRoadRef.current.count = tileCount;
        distantYellowRef.current.count = tileCount;
        distantRailRef.current.count = tileCount;
        distantDashRef.current.count = dashCountOut;
        distantGroundRef.current.instanceMatrix.needsUpdate = true;
        distantShoreRef.current.instanceMatrix.needsUpdate = true;
        distantRoadRef.current.instanceMatrix.needsUpdate = true;
        distantYellowRef.current.instanceMatrix.needsUpdate = true;
        distantRailRef.current.instanceMatrix.needsUpdate = true;
        distantDashRef.current.instanceMatrix.needsUpdate = true;
        if (distantGroundRef.current.instanceColor) distantGroundRef.current.instanceColor.needsUpdate = true;
        if (distantShoreRef.current.instanceColor) distantShoreRef.current.instanceColor.needsUpdate = true;

        for (let zIdx = 0; zIdx < ZONES.length; zIdx++) {
          const zs = distantZoneZs[zIdx];
          const meshes = distantZoneMeshRefs.current[zIdx];
          if (!meshes) continue;
          const count = zs.length;
          const sphereCenterZ = count > 0 ? (zs[0] + zs[count - 1]) * 0.5 : 0;
          const sphereRadius = count > 0 ? Math.abs(zs[count - 1] - zs[0]) * 0.5 + 120 : 1;
          for (let bIdx = 0; bIdx < meshes.length; bIdx++) {
            const mesh = meshes[bIdx];
            if (!mesh) continue;
            mesh.count = count;
            mesh.visible = count > 0;
            if (count > 0) {
              for (let k = 0; k < count; k++) {
                distantMatrix.makeTranslation(0, 0, zs[k]);
                mesh.setMatrixAt(k, distantMatrix);
              }
              mesh.instanceMatrix.clearUpdateRanges();
              mesh.instanceMatrix.addUpdateRange(0, count * 16);
              mesh.instanceMatrix.needsUpdate = true;
              if (!mesh.boundingSphere) mesh.boundingSphere = new THREE.Sphere();
              mesh.boundingSphere.center.set(0, 18, sphereCenterZ);
              mesh.boundingSphere.radius = sphereRadius;
            }
          }
        }
      }
    }

    // Calcul de la zone active et fondu météorologique continu
    if (worldRef.current) {
      const { zone, visit } = getActiveZoneLoopState(scroll, zoneOrder, ZONE_LEN);
      const targetWeather = weatherForLandscape(zone, visit, worldSeed);
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
      <WorldOcean worldRef={worldRef} wakesRef={seaWakesRef} reducedMotion={reducedMotion} />
      {seaCreaturesReady && (
        <WorldSeaCreatures
          worldRef={worldRef}
          wakesRef={seaWakesRef}
          cabinCenterZ={cabinCenterZ}
          reducedMotion={reducedMotion}
          lowPower={lowPower}
          slotLimit={seaCreatureSlots}
          cullAhead={seaCreatureCullAhead}
          cullBehind={seaCreatureCullBehind}
        />
      )}

      {/* Îles des 8 mondes avec apparition progressive des reliefs et décors */}
      {ZONES.map((zone, i) => {
        const stage = zoneStageFor(i);
        return (
          <group
            key={zone.name}
            name={`world-island-${i}`}
            ref={(el: THREE.Group | null) => {
              zoneRefs.current[i] = el;
            }}
          >
            {/* Terre principale (abaissée sous la chaussée pour éviter tout Z-fighting au dézoom) */}
            <mesh position={[0, -0.48, 0]} receiveShadow>
              <boxGeometry args={[96, 0.6, ZONE_LEN - 16]} />
              <meshStandardMaterial color={zone.ground} roughness={0.9} />
            </mesh>
            {stage >= 1 && (
              <IslandTerrain
                zone={i}
                terrainRef={(el: THREE.Mesh | null) => {
                  terrainRefs.current[i] = el;
                }}
              />
            )}
            {stage >= 2 && (
              <group ref={(element: THREE.Group | null) => { sceneryRefs.current[i * 3] = element; }}>
                <WorldSetPiece
                  zone={i}
                  lowPower={lowPower}
                  reducedMotion={reducedMotion}
                  onMeshesReady={() => dirtyZonesRef.current.add(i)}
                />
              </group>
            )}
            {[-1, 1].map((side, part) => stage >= 3 + part ? (
              <group
                key={side}
                ref={(element: THREE.Group | null) => { sceneryRefs.current[i * 3 + part + 1] = element; }}
              >
                <WorldForeground
                  zone={i}
                  side={side}
                  lowPower={lowPower}
                  onMeshesReady={() => dirtyZonesRef.current.add(i)}
                />
              </group>
            ) : null)}
            {/* Plage / bordure d'île */}
            <mesh position={[0, -0.44, 0]} receiveShadow>
              <boxGeometry args={[104, 0.32, ZONE_LEN - 8]} />
              <meshStandardMaterial color={zone.shore} roughness={0.95} />
            </mesh>
            {/* Tronçon de route intégré au paysage (4 meshes fusionnés par île au lieu de 21) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.028, 0]} geometry={sharedRoadAssets.planeGeo} material={sharedRoadAssets.roadMat} receiveShadow dispose={null} />
            <mesh geometry={sharedRoadAssets.yellowGeo} material={sharedRoadAssets.yellowMat} dispose={null} />
            <mesh geometry={sharedRoadAssets.railGeo} material={sharedRoadAssets.railMat} dispose={null} />
            <mesh geometry={sharedRoadAssets.dashGeo} material={sharedRoadAssets.dashMat} dispose={null} />
          </group>
        );
      })}

      {/* Tuiles d'îles simplifiées (LOD lointain) portées par un groupe défilant (0 upload GPU/frame) */}
      <group ref={distantScrollGroupRef} name="world-distant-islands">
        <instancedMesh key={`dg-${distantTileCapacity}`} ref={distantGroundRef} args={[undefined, undefined, distantTileCapacity]} count={0} frustumCulled={false} raycast={() => null}>
          <boxGeometry args={[96, 0.6, ZONE_LEN - 16]} />
          <meshStandardMaterial roughness={0.92} />
        </instancedMesh>
        <instancedMesh key={`ds-${distantTileCapacity}`} ref={distantShoreRef} args={[undefined, undefined, distantTileCapacity]} count={0} frustumCulled={false} raycast={() => null}>
          <boxGeometry args={[104, 0.32, ZONE_LEN - 8]} />
          <meshStandardMaterial roughness={0.95} />
        </instancedMesh>
        {distantZoneBatches.map((batches, zoneIdx) =>
          batches.map((batch, batchIdx) => (
            <instancedMesh
              key={`dlod-${zoneIdx}-${batch.material.uuid}-${distantZoneCapacity}`}
              ref={(el: THREE.InstancedMesh | null) => {
                if (!distantZoneMeshRefs.current[zoneIdx]) distantZoneMeshRefs.current[zoneIdx] = [];
                distantZoneMeshRefs.current[zoneIdx][batchIdx] = el;
              }}
              args={[batch.geometry, batch.material, distantZoneCapacity]}
              count={0}
              visible={false}
              frustumCulled
              dispose={null}
              raycast={() => null}
            />
          )),
        )}
        <instancedMesh key={`dr-${distantTileCapacity}`} ref={distantRoadRef} args={[undefined, undefined, distantTileCapacity]} count={0} frustumCulled={false} raycast={() => null}>
          <boxGeometry args={[7.4, 0.04, ZONE_LEN]} />
          <meshStandardMaterial color="#2d3036" roughness={0.92} />
        </instancedMesh>
        <instancedMesh key={`dy-${distantTileCapacity}`} ref={distantYellowRef} args={[sharedRoadAssets.yellowGeo, sharedRoadAssets.yellowMat, distantTileCapacity]} count={0} frustumCulled={false} dispose={null} raycast={() => null} />
        <instancedMesh key={`drail-${distantTileCapacity}`} ref={distantRailRef} args={[sharedRoadAssets.railGeo, sharedRoadAssets.railMat, distantTileCapacity]} count={0} frustumCulled={false} dispose={null} raycast={() => null} />
        <instancedMesh key={`ddash-${distantDashCapacity}`} ref={distantDashRef} args={[sharedRoadAssets.dashGeo, sharedRoadAssets.dashMat, distantDashCapacity]} count={0} frustumCulled={false} dispose={null} raycast={() => null} />
      </group>

      {/* Décors 3D enrichis des mondes */}
      {visibleProps.map((p, i) => (
        <group
          key={p.id ?? i}
          name={`world-prop-${p.type}-${p.id ?? i}`}
          ref={(el: THREE.Group | null) => {
            propRefs.current[i] = el;
          }}
          position={[p.x, p.y ?? 0, 0]}
          rotation={[0, p.rot, 0]}
        >
          <WorldLandmark def={p} onReady={() => dirtyPropsRef.current.add(i)} />
        </group>
      ))}
    </group>
  );
});

export default World;
