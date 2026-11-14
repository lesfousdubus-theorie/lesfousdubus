"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { WorldLandmark, type PropDef, type PropType } from "./WorldLandmark";
import { useFrame } from "@react-three/fiber";
import { WORLD_SPEED, type WorldState } from "./constants";

export const ZONE_LEN = 160;
const LOOP = ZONE_LEN * 5;
const WINDOW_START = -620;

export const ZONES = [
  { name: "Alabasta", subtitle: "Royaume des sables", ground: "#e5bd6a", shore: "#d8a84e" },
  { name: "Water Seven", subtitle: "La cité de l'eau", ground: "#9ec5d4", shore: "#6da3ba" },
  { name: "Skypiea", subtitle: "L'île céleste", ground: "#f5f3ec", shore: "#e4e1d6" },
  { name: "Pays des Wa", subtitle: "Terre des samouraïs", ground: "#5da854", shore: "#86c878" },
  { name: "Île de Drum", subtitle: "Royaume des neiges", ground: "#ebf2fa", shore: "#dbe5f2" },
] as const;

const ZONE_PROPS: Record<number, PropType[]> = {
  0: ["palm", "palm", "cactus", "cactus", "pyramid", "ruins", "rock"],
  1: ["building", "building", "building", "seaTrainPoles", "rock"],
  2: ["cloud", "cloud", "cloud", "giantJack", "bell"],
  3: ["sakura", "sakura", "sakura", "pagoda", "torii", "lantern"],
  4: ["pine", "pine", "pine", "snowman", "drumMesa", "rock"],
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
  return value < 0.12 ? "rain" : "clear";
}

function buildProps(): PropDef[] {
  const rnd = mulberry32(2026);
  const out: PropDef[] = [];
  for (let z = 0; z < 5; z++) {
    const types = ZONE_PROPS[z];
    const count = z === 2 ? 24 : 22;
    for (let i = 0; i < count; i++) {
      const side = rnd() > 0.5 ? 1 : -1;
      const type = types[Math.floor(rnd() * types.length)];
      const big =
        type === "pyramid" ||
        type === "pagoda" ||
        type === "bell" ||
        type === "giantJack" ||
        type === "drumMesa";
      const x = side * (big ? 20 + rnd() * 24 : 7 + rnd() * 26);
      out.push({
        type,
        x,
        base: z * ZONE_LEN + 10 + rnd() * (ZONE_LEN - 20),
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
}

export default function World({ worldRef, reducedMotion = false, lowPower = false }: WorldProps) {
  const allProps = useMemo(() => buildProps(), []);
  const props = useMemo(
    () => lowPower ? allProps.filter((_, index) => index % 2 === 0) : allProps,
    [allProps, lowPower],
  );
  const propRefs = useRef<(THREE.Group | null)[]>([]);
  const zoneRefs = useRef<(THREE.Group | null)[]>([]);
  const dashRef = useRef<THREE.InstancedMesh>(null);
  const dashMatrix = useMemo(() => new THREE.Matrix4(), []);
  const oceanMat = useRef<THREE.MeshStandardMaterial>(null);
  const activeWeatherKey = useRef("");
  const dashes = useMemo(() => Array.from({ length: 48 }, (_, i) => i * 10), []);

  useFrame((state, dt) => {
    const frameDt = Math.min(dt, 0.1);
    const mult = worldRef.current?.speedMultiplier ?? 1.0;
    // Le déplacement du bus fait partie du fonctionnement principal de la scène :
    // la préférence système "réduire les animations" coupe seulement les effets
    // décoratifs, jamais l'avancement du véhicule.
    const scroll = (worldRef.current?.scroll ?? 0) + frameDt * WORLD_SPEED * mult;
    if (worldRef.current) worldRef.current.scroll = scroll;

    // Défilement des décors
    for (let i = 0; i < props.length; i++) {
      const g = propRefs.current[i];
      if (!g) continue;
      const z = (((props[i].base + scroll) % LOOP) + LOOP) % LOOP + WINDOW_START;
      g.position.z = z;
      g.visible = z > -180 && z < 110;
    }

    // Défilement des îles
    for (let i = 0; i < 5; i++) {
      const g = zoneRefs.current[i];
      if (!g) continue;
      const center = i * ZONE_LEN + ZONE_LEN / 2;
      let z = (((center + scroll) % LOOP) + LOOP) % LOOP + WINDOW_START;
      if (z > 160) z -= LOOP;
      g.position.z = z;
    }

    // Défilement des lignes blanches du pont
    for (let i = 0; i < dashes.length; i++) {
      const z = ((((dashes[i] + scroll) % 480) + 480) % 480) - 400;
      dashMatrix.makeTranslation(0, 0.038, z);
      dashRef.current?.setMatrixAt(i, dashMatrix);
    }
    if (dashRef.current) dashRef.current.instanceMatrix.needsUpdate = true;

    // Calcul de la zone active
    const baseAtBus = (((-WINDOW_START - scroll) % LOOP) + LOOP) % LOOP;
    if (worldRef.current) {
      const zone = Math.floor(baseAtBus / ZONE_LEN) % 5;
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

    // Ondulation de l'océan de Grand Line
    if (oceanMat.current) {
      const t = state.clock.elapsedTime;
      oceanMat.current.emissiveIntensity = reducedMotion ? 0.08 : 0.08 + Math.sin(t * 1.8) * 0.04;
    }
  });

  return (
    <group>
      {/* Océan infini de Grand Line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.38, -150]} receiveShadow>
        <planeGeometry args={[2600, 2600]} />
        <meshStandardMaterial
          ref={oceanMat}
          color="#165ea3"
          roughness={0.28}
          metalness={0.25}
          emissive="#06274d"
        />
      </mesh>

      {/* Îles des 5 mondes avec rivages et plages */}
      {ZONES.map((zone, i) => (
        <group
          key={zone.name}
          ref={(el: any) => {
            zoneRefs.current[i] = el;
          }}
        >
          {/* Terre principale */}
          <mesh position={[0, -0.3, 0]} receiveShadow>
            <boxGeometry args={[96, 0.6, ZONE_LEN - 16]} />
            <meshStandardMaterial color={zone.ground} roughness={0.9} />
          </mesh>
          {/* Plage / bordure d'île */}
          <mesh position={[0, -0.44, 0]}>
            <boxGeometry args={[104, 0.32, ZONE_LEN - 8]} />
            <meshStandardMaterial color={zone.shore} roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* Pont maritime continu de Grand Line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -200]} receiveShadow>
        <planeGeometry args={[7.4, 960]} />
        <meshStandardMaterial color="#2d3036" roughness={0.92} />
      </mesh>

      {/* Bandes de rive jaunes */}
      {[-3.5, 3.5].map((x) => (
        <mesh key={x} position={[x, 0.035, -200]}>
          <boxGeometry args={[0.16, 0.02, 960]} />
          <meshStandardMaterial color="#ffc107" roughness={0.8} />
        </mesh>
      ))}

      {/* Rambardes de sécurité chromées du pont maritime */}
      {[-3.85, 3.85].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.42, -200]}>
            <boxGeometry args={[0.1, 0.55, 960]} />
            <meshStandardMaterial color="#969cb0" roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Ligne médiane discontinue animée */}
      <instancedMesh ref={dashRef} args={[undefined, undefined, dashes.length]}>
        <boxGeometry args={[0.22, 0.02, 3.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </instancedMesh>

      {/* Décors 3D enrichis des mondes */}
      {props.map((p, i) => (
        <group
          key={i}
          ref={(el: any) => {
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
