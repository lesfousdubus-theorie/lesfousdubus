"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
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
const TERRAIN_RELIEF = [1.1, .32, .55, .65, 1.05, .45, 1.2, .25];
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
  { name: "Egghead", subtitle: "L'île du futur", ground: "#dfe9f3", shore: "#8ec8e8" },
  { name: "Elbaf", subtitle: "Royaume des géants", ground: "#4e8c45", shore: "#8b7a5e" },
  { name: "Enies Lobby", subtitle: "L'île judiciaire", ground: "#8fa5b5", shore: "#c6f0ed" },
] as const;

const LOOP = ZONE_LEN * ZONES.length;

const TINT_COLORS = [
  "#f6d38a",
  "#d7e1d6",
  "#ffffff",
  "#a4cf77",
  "#ffffff",
  "#f3f9ff",
  "#8bc462",
  "#c9d6e0",
] as const;

const ZONE_PROPS: Record<number, PropType[]> = {
  0: ["palm", "palm", "cactus", "cactus", "pyramid", "ruins", "rock"],
  1: ["building", "building", "building", "seaTrainPoles", "rock"],
  2: ["cloud", "cloud", "cloud", "giantJack", "bell"],
  3: ["sakura", "sakura", "sakura", "pagoda", "torii", "lantern"],
  4: ["pine", "pine", "pine", "snowman", "drumMesa", "rock"],
  5: ["techDome", "holoTower", "mechPod", "cloud"],
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
  if (zone === 6) return value < 0.2 ? "snow" : value < 0.45 ? "rain" : "clear";
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

function getTerrainHeight(zone: number, x: number, wave: number) {
  const shoulder = smoothstep(7, 17, Math.abs(x));
  const shore = 1 - smoothstep(38, 48, Math.abs(x));
  const relief = TERRAIN_RELIEF[zone];
  // Les canaux de Water Seven passent sous leur surface d'eau fixe.
  const canal = zone === 1 ? 1 - smoothstep(1.4, 3.5, Math.abs(Math.abs(x) - 22)) : 0;
  return .008 + shoulder * shore * Math.max(0, .35 + wave) * relief * (1 - canal) - canal * .06;
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
    positions.setY(i, getTerrainHeight(zone, x, wave));
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
        type === "techDome" ||
        type === "vikingHall" ||
        type === "courthouse" ||
        type === "waterfallCliff";
      const distance = type === "building"
        ? 24 + rnd() * 18
        : big ? 20 + rnd() * 24 : 7 + rnd() * 26;
      const localZ = 10 + rnd() * (ZONE_LEN - 20);
      // Préserver la silhouette du monument central en évitant les superpositions.
      if (side > 0 && distance > 16 && localZ > 45 && localZ < 115) side = -1;
      out.push({
        type,
        x: side * distance,
        base: z * ZONE_LEN + localZ,
        s: big ? 1.0 + rnd() * 0.5 : 0.8 + rnd() * 0.5,
        rot: rnd() * Math.PI * 2,
        seed: rnd(),
      });
    }
  }
  return out;
}

interface WorldProps {
  worldRef: React.RefObject<WorldState>;
  reducedMotion?: boolean;
  lowPower?: boolean;
  phase?: Phase;
  cabinCenterZ?: number;
}

export default function World({ worldRef, reducedMotion = false, lowPower = false, phase = "outside", cabinCenterZ = 0 }: WorldProps) {
  const allProps = useMemo(() => buildProps(), []);
  const terrains = useMemo(() => ZONES.map((_, index) => makeTerrain(index)), []);

  useEffect(() => () => {
    terrains.forEach((terrain) => terrain.dispose());
  }, [terrains]);
  const props = useMemo(
    () => lowPower ? allProps.filter((_, index) => index % 2 === 0) : allProps,
    [allProps, lowPower],
  );
  const propRefs = useRef<(THREE.Group | null)[]>([]);
  const zoneRefs = useRef<(THREE.Group | null)[]>([]);
  const terrainRefs = useRef<(THREE.Mesh | null)[]>([]);
  const sceneryRefs = useRef<(THREE.Group | null)[]>([]);
  const railRefs = useRef<(THREE.Group | null)[]>([]);
  const propBounds = useRef<(SceneryBounds | null)[]>([]);
  const sceneBounds = useRef<SceneryBounds[][]>([]);
  const railBounds = useRef<SceneryBounds[]>([]);
  const visibility = useMemo(() => createSceneryVisibility(), []);
  useLayoutEffect(() => {
    propBounds.current = propRefs.current.map(group => group && cacheSceneryBounds(group, group.position.z));
    sceneBounds.current = ZONES.map((_, zone) => {
      const z = zoneRefs.current[zone]?.position.z ?? 0;
      const objects: THREE.Object3D[] = [];
      const landmark = sceneryRefs.current[zone * 3];
      if (landmark) objects.push(landmark);
      for (const side of [1, 2]) {
        const foreground = sceneryRefs.current[zone * 3 + side]?.children[0];
        if (foreground) objects.push(...foreground.children);
      }
      return objects.map(object => cacheSceneryBounds(object, z));
    });
    railBounds.current = railRefs.current.flatMap(group => group ? [cacheSceneryBounds(group, 0)] : []);
  }, [props, lowPower]);
  const dashRef = useRef<THREE.InstancedMesh>(null);
  const dashMatrix = useMemo(() => new THREE.Matrix4(), []);
  const activeWeatherKey = useRef("");
  const dashes = useMemo(() => Array.from({ length: 80 }, (_, i) => i * 10), []);

  useFrame((state, dt) => {
    const frameDt = Math.min(dt, phase==="entering"||phase==="exiting"?0.25:0.1);
    const mult = (worldRef.current?.speedMultiplier ?? 1.0) * (worldRef.current.motionFactor ?? 1);
    const scroll = (worldRef.current?.scroll ?? 0) + frameDt * WORLD_SPEED * mult;
    if (worldRef.current) worldRef.current.scroll = scroll;

    visibility.begin(state.camera);
    for (const rail of railBounds.current) visibility.update(rail, 0);

    // Les limites détaillées ne sont testées qu'à proximité et devant la caméra.
    for (let i = 0; i < props.length; i++) {
      const g = propRefs.current[i];
      if (!g) continue;
      let z = (((props[i].base + scroll) % LOOP) + LOOP) % LOOP + WINDOW_START;
      if (z > 440) z -= LOOP;
      g.position.z = z;
      const bounds = propBounds.current[i];
      if (bounds && z > -450 && z < 440) visibility.update(bounds, z);
      else g.visible = false;
    }

    // Une portion du premier plan peut disparaître sans retirer tout le décor de l'île.
    for (let i = 0; i < ZONES.length; i++) {
      const g = zoneRefs.current[i];
      if (!g) continue;
      const center = i * ZONE_LEN + ZONE_LEN / 2;
      let z = (((center + scroll) % LOOP) + LOOP) % LOOP + WINDOW_START;
      if (z > 440) z -= LOOP;
      g.position.z = z;
      const terrain = terrainRefs.current[i];
      const eye = state.camera.position;
      const localZ = eye.z - z;
      if (terrain) terrain.visible = eye.y > 1.37 || eye.y >= terrainSurfaceAt(terrain.geometry, eye.x, localZ);
      for (const block of sceneBounds.current[i] ?? []) visibility.update(block, z);
    }

    // Défilement des lignes blanches du pont
    for (let i = 0; i < dashes.length; i++) {
      const z = ((((dashes[i] + scroll) % 800) + 800) % 800) - 440;
      dashMatrix.makeTranslation(0, 0.052, z);
      dashRef.current?.setMatrixAt(i, dashMatrix);
    }
    if (dashRef.current) dashRef.current.instanceMatrix.needsUpdate = true;

    // Calcul de la zone active
    const baseAtBus = (((-WINDOW_START - scroll) % LOOP) + LOOP) % LOOP;
    if (worldRef.current) {
      const zone = Math.floor(baseAtBus / ZONE_LEN) % ZONES.length;
      const visit = Math.floor((-WINDOW_START - scroll) / LOOP);
      const weather = weatherForLandscape(zone, visit);
      const weatherKey = `${visit}:${zone}:${weather}`;
      if (weatherKey !== activeWeatherKey.current) {
        activeWeatherKey.current = weatherKey;
        worldRef.current.weatherIntensity = 0;
      }
      worldRef.current.zone = zone;
      worldRef.current.weather = weather;
      const targetIntensity = weather === "clear" ? 0 : weather === "rain" ? 0.9 : 0.72;
      worldRef.current.weatherIntensity +=
        (targetIntensity - worldRef.current.weatherIntensity) * Math.min(1, frameDt * 0.65);
    }
  });

  return (
    <group>
      <WorldOcean reducedMotion={reducedMotion} />
      <WorldSeaCreatures worldRef={worldRef} cabinCenterZ={cabinCenterZ} reducedMotion={reducedMotion} lowPower={lowPower} />

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
            <meshStandardMaterial vertexColors roughness={0.95} side={THREE.DoubleSide} />
          </mesh>
          <group ref={(element: THREE.Group | null) => { sceneryRefs.current[i * 3] = element; }}>
            <WorldSetPiece zone={i} lowPower={lowPower} />
          </group>
          {[-1, 1].map((side, part) => <group
            key={side}
            ref={(element: THREE.Group | null) => { sceneryRefs.current[i * 3 + part + 1] = element; }}
          >
            <WorldForeground zone={i} side={side} lowPower={lowPower} />
          </group>)}
          {/* Plage / bordure d'île */}
          <mesh position={[0, -0.44, 0]}>
            <boxGeometry args={[104, 0.32, ZONE_LEN - 8]} />
            <meshStandardMaterial color={zone.shore} roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* Pont maritime continu de Grand Line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.024, -60]} receiveShadow>
        <planeGeometry args={[7.4, 960]} />
        <meshStandardMaterial color="#2d3036" roughness={0.92} />
      </mesh>

      {/* Bandes de rive jaunes */}
      {[-3.5, 3.5].map((x) => (
        <mesh key={x} name={`world-bridge-edge-marking-${x < 0 ? "left" : "right"}`} position={[x, 0.048, -60]}>
          <boxGeometry args={BRIDGE_MARKING_BOX} />
          <meshStandardMaterial color="#ffc107" roughness={0.8} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
        </mesh>
      ))}

      {/* Rambardes de sécurité chromées du pont maritime */}
      {[-3.85, 3.85].map((x, i) => (
        <group key={x} ref={(el: THREE.Group | null) => { railRefs.current[i] = el; }}>
          <mesh position={[x, 0.42, -60]}>
            <boxGeometry args={[0.1, 0.55, 960]} />
            <meshStandardMaterial color="#969cb0" roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Ligne médiane discontinue animée */}
      <instancedMesh ref={dashRef} args={[undefined, undefined, dashes.length]} frustumCulled={false}>
        <boxGeometry args={[0.22, 0.02, 3.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </instancedMesh>

      {/* Décors 3D enrichis des mondes */}
      {props.map((p, i) => (
        <group
          key={i}
          name={`world-prop-${p.type}-${i}`}
          ref={(el: THREE.Group | null) => {
            propRefs.current[i] = el;
          }}
          position={[p.x, 0, 0]}
          rotation={[0, p.rot, 0]}
        >
          <WorldLandmark def={p} />
        </group>
      ))}
    </group>
  );
}
