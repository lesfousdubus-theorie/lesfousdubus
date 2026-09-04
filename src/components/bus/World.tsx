"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
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

type PropType =
  | "palm"
  | "pyramid"
  | "ruins"
  | "cactus"
  | "building"
  | "seaTrainPoles"
  | "cloud"
  | "giantJack"
  | "bell"
  | "sakura"
  | "pagoda"
  | "torii"
  | "lantern"
  | "pine"
  | "snowman"
  | "drumMesa"
  | "rock";

interface PropDef {
  type: PropType;
  x: number;
  base: number;
  s: number;
  rot: number;
  seed: number;
}

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

function buildProps(): PropDef[] {
  const rnd = mulberry32(2026);
  const out: PropDef[] = [];
  for (let z = 0; z < 5; z++) {
    const types = ZONE_PROPS[z];
    const count = z === 2 ? 38 : 34;
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

const MATS = {
  trunk: new THREE.MeshStandardMaterial({ color: "#6e3f1c", roughness: 0.9 }),
  leaf: new THREE.MeshStandardMaterial({ color: "#2d9138", roughness: 0.75 }),
  sand: new THREE.MeshStandardMaterial({ color: "#e3b865", roughness: 0.95 }),
  sandDark: new THREE.MeshStandardMaterial({ color: "#ba8b3c", roughness: 0.9 }),
  cactus: new THREE.MeshStandardMaterial({ color: "#32853b", roughness: 0.8 }),
  cactusFlower: new THREE.MeshStandardMaterial({ color: "#ff4757", roughness: 0.6 }),
  wallPastelA: new THREE.MeshStandardMaterial({ color: "#faebd7", roughness: 0.85 }),
  wallPastelB: new THREE.MeshStandardMaterial({ color: "#fed4aa", roughness: 0.85 }),
  wallPastelC: new THREE.MeshStandardMaterial({ color: "#c5e4f3", roughness: 0.85 }),
  roofTerracotta: new THREE.MeshStandardMaterial({ color: "#b94129", roughness: 0.75 }),
  cloud: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.95 }),
  gold: new THREE.MeshStandardMaterial({ color: "#f7ca38", metalness: 0.9, roughness: 0.2 }),
  pinkSakura: new THREE.MeshStandardMaterial({ color: "#ffa5ba", roughness: 0.85 }),
  pinkDeep: new THREE.MeshStandardMaterial({ color: "#f4729f", roughness: 0.85 }),
  redWood: new THREE.MeshStandardMaterial({ color: "#c21f26", roughness: 0.6 }),
  darkRoof: new THREE.MeshStandardMaterial({ color: "#222733", roughness: 0.75 }),
  pine: new THREE.MeshStandardMaterial({ color: "#16592e", roughness: 0.85 }),
  snow: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9 }),
  rock: new THREE.MeshStandardMaterial({ color: "#6a6e78", roughness: 0.95 }),
  carrot: new THREE.MeshStandardMaterial({ color: "#ff6b1a", roughness: 0.7 }),
  black: new THREE.MeshStandardMaterial({ color: "#16181e", roughness: 0.8 }),
  lanternLight: new THREE.MeshStandardMaterial({
    color: "#fff3cc",
    emissive: "#ffb400",
    emissiveIntensity: 1.8,
  }),
  steelRail: new THREE.MeshStandardMaterial({ color: "#545963", metalness: 0.8, roughness: 0.3 }),
};

function Prop({ def }: { def: PropDef }) {
  const s = def.s;
  switch (def.type) {
    case "palm":
      return (
        <group scale={s}>
          {/* Tronc courbé avec anneaux */}
          <mesh material={MATS.trunk} position={[0, 2.4, 0]} rotation={[0, 0, 0.09]} castShadow>
            <cylinderGeometry args={[0.2, 0.35, 4.8, 10]} />
          </mesh>
          {/* Couronne de palmes retombantes */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <group key={i} position={[0, 4.6, 0]} rotation={[0, a, 0.62]}>
                <mesh material={MATS.leaf} position={[1.4, 0, 0]} castShadow>
                  <boxGeometry args={[2.8, 0.08, 0.55]} />
                </mesh>
              </group>
            );
          })}
          {/* Noix de coco */}
          {[0, 1, 2].map((i) => (
            <mesh
              key={i}
              material={MATS.trunk}
              position={[
                Math.cos((i / 3) * Math.PI * 2) * 0.3,
                4.5,
                Math.sin((i / 3) * Math.PI * 2) * 0.3,
              ]}
            >
              <sphereGeometry args={[0.18, 8, 8]} />
            </mesh>
          ))}
        </group>
      );

    case "pyramid":
      return (
        <group scale={s * 1.2}>
          {/* Pyramide majestueuse d'Alabasta */}
          <mesh material={MATS.sand} position={[0, 4.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[9, 9, 4]} />
          </mesh>
          {/* Capstone dorée */}
          <mesh material={MATS.gold} position={[0, 8.2, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[1.8, 1.8, 4]} />
          </mesh>
          {/* Portail d'entrée du temple */}
          <mesh material={MATS.black} position={[0, 1.2, 6.2]} rotation={[0, 0, 0]}>
            <boxGeometry args={[2.2, 2.4, 0.3]} />
          </mesh>
          <mesh material={MATS.sandDark} position={[0, 2.5, 6.3]}>
            <boxGeometry args={[3.2, 0.4, 0.5]} />
          </mesh>
        </group>
      );

    case "ruins":
      return (
        <group scale={s * 1.1}>
          {/* Colonnes antiques d'Alabasta */}
          {[-2.5, 0, 2.5].map((x, i) => (
            <group key={i} position={[x, 0, 0]}>
              <mesh material={MATS.sand} position={[0, 2.2, 0]} castShadow>
                <cylinderGeometry args={[0.35, 0.4, 4.4, 12]} />
              </mesh>
              <mesh material={MATS.sandDark} position={[0, 4.5, 0]}>
                <boxGeometry args={[1.0, 0.3, 1.0]} />
              </mesh>
            </group>
          ))}
          {/* Linteau en ruine */}
          <mesh material={MATS.sandDark} position={[0, 4.8, 0]} castShadow>
            <boxGeometry args={[6.4, 0.4, 0.8]} />
          </mesh>
        </group>
      );

    case "cactus":
      return (
        <group scale={s}>
          {/* Tronc principal Saguaro */}
          <mesh material={MATS.cactus} position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.36, 0.42, 3.2, 12]} />
          </mesh>
          {/* Sommet arrondi */}
          <mesh material={MATS.cactus} position={[0, 3.2, 0]}>
            <sphereGeometry args={[0.36, 12, 12]} />
          </mesh>
          {/* Fleur de cactus au sommet */}
          <mesh material={MATS.cactusFlower} position={[0, 3.55, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
          </mesh>
          {/* Bras droit */}
          <mesh material={MATS.cactus} position={[0.55, 1.6, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.22, 0.22, 0.8, 8]} />
          </mesh>
          <mesh material={MATS.cactus} position={[0.9, 2.1, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 1.2, 8]} />
          </mesh>
          <mesh material={MATS.cactus} position={[0.9, 2.7, 0]}>
            <sphereGeometry args={[0.22, 8, 8]} />
          </mesh>
          {/* Bras gauche */}
          <mesh material={MATS.cactus} position={[-0.55, 2.0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.7, 8]} />
          </mesh>
          <mesh material={MATS.cactus} position={[-0.85, 2.5, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 1.1, 8]} />
          </mesh>
        </group>
      );

    case "building": {
      // Édifice vénitien / Water Seven
      const w = 3.6 + def.seed * 3.5;
      const h = 5.0 + def.seed * 8.0;
      const wallMat =
        def.seed > 0.6 ? MATS.wallPastelA : def.seed > 0.3 ? MATS.wallPastelB : MATS.wallPastelC;
      return (
        <group scale={s}>
          {/* Corps du bâtiment */}
          <mesh material={wallMat} position={[0, h / 2, 0]} castShadow>
            <boxGeometry args={[w, h, w * 0.9]} />
          </mesh>
          {/* Toit en tuiles */}
          <mesh material={MATS.roofTerracotta} position={[0, h + 1.2, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[w * 0.82, 2.4, 4]} />
          </mesh>
          {/* Flèche ou dôme */}
          <mesh material={MATS.gold} position={[0, h + 2.5, 0]}>
            <coneGeometry args={[0.25, 1.2, 8]} />
          </mesh>
          {/* Fenêtres à arches sur les étages */}
          {[0, 1, 2].map((floor) =>
            [-w * 0.28, w * 0.28].map((fx, fi) => (
              <mesh
                key={`${floor}-${fi}`}
                material={MATS.black}
                position={[fx, 1.5 + floor * 2.2, w * 0.45 + 0.02]}
              >
                <boxGeometry args={[0.65, 1.1, 0.06]} />
              </mesh>
            )),
          )}
        </group>
      );
    }

    case "seaTrainPoles":
      return (
        <group scale={s * 1.3}>
          {/* Piliers et rails du Puffing Tom de Water Seven */}
          <mesh material={MATS.steelRail} position={[0, 1.8, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 3.6, 8]} />
          </mesh>
          <mesh material={MATS.steelRail} position={[0, 3.6, 0]}>
            <boxGeometry args={[2.8, 0.15, 0.2]} />
          </mesh>
          {[-1.2, 1.2].map((x) => (
            <mesh key={x} material={MATS.steelRail} position={[x, 3.5, 0]}>
              <boxGeometry args={[0.1, 0.1, 8.0]} />
            </mesh>
          ))}
        </group>
      );

    case "cloud":
      return (
        <group scale={s * 1.2} position={[0, 1.8 + def.seed * 7, 0]}>
          <mesh material={MATS.cloud} position={[0, 0, 0]}>
            <sphereGeometry args={[2.5, 16, 16]} />
          </mesh>
          <mesh material={MATS.cloud} position={[2.4, -0.4, 0.6]}>
            <sphereGeometry args={[1.8, 14, 14]} />
          </mesh>
          <mesh material={MATS.cloud} position={[-2.3, -0.5, -0.4]}>
            <sphereGeometry args={[1.7, 14, 14]} />
          </mesh>
          <mesh material={MATS.cloud} position={[0.2, 1.2, 0.2]}>
            <sphereGeometry args={[1.5, 12, 12]} />
          </mesh>
        </group>
      );

    case "giantJack":
      return (
        <group scale={s * 1.3}>
          {/* Le haricot géant de Skypiea */}
          <mesh material={MATS.leaf} position={[0, 7.5, 0]} rotation={[0.08, 0.1, 0]} castShadow>
            <cylinderGeometry args={[1.2, 2.5, 15, 12]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => {
            const h = 3 + i * 3.5;
            const a = i * 1.6;
            return (
              <group key={i} position={[Math.cos(a) * 1.4, h, Math.sin(a) * 1.4]} rotation={[0, a, 0.4]}>
                <mesh material={MATS.leaf}>
                  <boxGeometry args={[3.2, 0.18, 1.4]} />
                </mesh>
              </group>
            );
          })}
        </group>
      );

    case "bell":
      return (
        <group scale={s * 1.2}>
          {/* La Cloche d'Or de Shandora */}
          {/* Socle de nuages */}
          <mesh material={MATS.cloud} position={[0, 2.5, 0]}>
            <cylinderGeometry args={[3.2, 3.8, 5.0, 16]} />
          </mesh>
          {/* Cloche d'or resplendissante */}
          <mesh material={MATS.gold} position={[0, 7.6, 0]}>
            <cylinderGeometry args={[1.6, 2.4, 4.2, 24]} />
          </mesh>
          <mesh material={MATS.gold} position={[0, 9.8, 0]}>
            <sphereGeometry args={[1.6, 20, 20]} />
          </mesh>
          {/* Portique en bois ancien */}
          <mesh material={MATS.trunk} position={[0, 11.2, 0]}>
            <boxGeometry args={[6.8, 0.6, 0.6]} />
          </mesh>
          {[-3.1, 3.1].map((x) => (
            <mesh key={x} material={MATS.trunk} position={[x, 8.4, 0]}>
              <boxGeometry args={[0.6, 5.8, 0.6]} />
            </mesh>
          ))}
        </group>
      );

    case "sakura":
      return (
        <group scale={s * 1.1}>
          {/* Cerisier en fleurs du Pays des Wa */}
          <mesh material={MATS.trunk} position={[0, 1.6, 0]} rotation={[0, 0, 0.07]} castShadow>
            <cylinderGeometry args={[0.25, 0.42, 3.2, 10]} />
          </mesh>
          {/* Nuages de fleurs roses */}
          <mesh material={MATS.pinkSakura} position={[0, 3.8, 0]} castShadow>
            <sphereGeometry args={[2.0, 14, 14]} />
          </mesh>
          <mesh material={MATS.pinkDeep} position={[1.4, 3.2, 0.5]} castShadow>
            <sphereGeometry args={[1.4, 12, 12]} />
          </mesh>
          <mesh material={MATS.pinkSakura} position={[-1.3, 3.4, -0.4]} castShadow>
            <sphereGeometry args={[1.5, 12, 12]} />
          </mesh>
          <mesh material={MATS.pinkDeep} position={[0, 4.8, 0]}>
            <sphereGeometry args={[1.2, 10, 10]} />
          </mesh>
          {/* Petite lanterne rouge suspendue */}
          <mesh material={MATS.redWood} position={[0.9, 2.4, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.35, 8]} />
          </mesh>
        </group>
      );

    case "pagoda":
      return (
        <group scale={s * 1.25}>
          {/* Pagode traditionnelle à 3 étages de Wano */}
          {[0, 1, 2].map((i) => (
            <group key={i} position={[0, i * 3.4, 0]}>
              <mesh material={MATS.redWood} position={[0, 1.5, 0]} castShadow>
                <boxGeometry args={[5.2 - i * 1.1, 3.0, 5.2 - i * 1.1]} />
              </mesh>
              {/* Toit incurvé traditionnel */}
              <mesh
                material={MATS.darkRoof}
                position={[0, 3.2, 0]}
                rotation={[0, Math.PI / 4, 0]}
                castShadow
              >
                <coneGeometry args={[(6.8 - i * 1.2) * 0.76, 1.5, 4]} />
              </mesh>
            </group>
          ))}
          {/* Flèche d'or au sommet */}
          <mesh material={MATS.gold} position={[0, 11.2, 0]}>
            <coneGeometry args={[0.3, 2.0, 8]} />
          </mesh>
        </group>
      );

    case "torii":
      return (
        <group scale={s * 1.4}>
          {/* Portail Torii vermillon */}
          {[-1.8, 1.8].map((x) => (
            <mesh key={x} material={MATS.redWood} position={[x, 2.2, 0]} castShadow>
              <cylinderGeometry args={[0.24, 0.3, 4.4, 12]} />
            </mesh>
          ))}
          {/* Linteau supérieur noir galbé */}
          <mesh material={MATS.black} position={[0, 4.9, 0]} castShadow>
            <boxGeometry args={[5.8, 0.35, 0.55]} />
          </mesh>
          {/* Poutre principale rouge */}
          <mesh material={MATS.redWood} position={[0, 4.4, 0]} castShadow>
            <boxGeometry args={[5.2, 0.38, 0.45]} />
          </mesh>
          {/* Poutre intermédiaire */}
          <mesh material={MATS.redWood} position={[0, 3.5, 0]}>
            <boxGeometry args={[4.2, 0.28, 0.32]} />
          </mesh>
        </group>
      );

    case "lantern":
      return (
        <group scale={s * 1.1}>
          {/* Lanterne en pierre Toro avec lueur */}
          <mesh material={MATS.rock} position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.2, 0.3, 1.6, 8]} />
          </mesh>
          {/* Chambre lumineuse */}
          <mesh material={MATS.lanternLight} position={[0, 1.9, 0]}>
            <boxGeometry args={[0.6, 0.6, 0.6]} />
          </mesh>
          {/* Toit en pierre */}
          <mesh material={MATS.rock} position={[0, 2.4, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.8, 0.5, 4]} />
          </mesh>
        </group>
      );

    case "drumMesa":
      return (
        <group scale={s * 1.5}>
          {/* Les légendaires montagnes en forme de tambour de l'île de Drum */}
          <mesh material={MATS.rock} position={[0, 7.0, 0]} castShadow>
            <cylinderGeometry args={[5.5, 6.2, 14, 16]} />
          </mesh>
          {/* Plateau enneigé au sommet */}
          <mesh material={MATS.snow} position={[0, 14.1, 0]}>
            <cylinderGeometry args={[5.6, 5.6, 0.5, 16]} />
          </mesh>
        </group>
      );

    case "pine":
      return (
        <group scale={s}>
          <mesh material={MATS.trunk} position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.22, 0.32, 1.8, 8]} />
          </mesh>
          {/* 3 étages de feuillage enneigé */}
          <mesh material={MATS.pine} position={[0, 2.5, 0]} castShadow>
            <coneGeometry args={[2.0, 2.8, 10]} />
          </mesh>
          <mesh material={MATS.snow} position={[0, 3.4, 0]}>
            <coneGeometry args={[1.8, 1.2, 10]} />
          </mesh>
          <mesh material={MATS.pine} position={[0, 4.2, 0]} castShadow>
            <coneGeometry args={[1.5, 2.4, 10]} />
          </mesh>
          <mesh material={MATS.snow} position={[0, 5.6, 0]}>
            <coneGeometry args={[1.0, 1.6, 10]} />
          </mesh>
        </group>
      );

    case "snowman":
      return (
        <group scale={s}>
          {/* Bonhomme de neige de Drum */}
          <mesh material={MATS.snow} position={[0, 1.0, 0]} castShadow>
            <sphereGeometry args={[1.1, 14, 14]} />
          </mesh>
          <mesh material={MATS.snow} position={[0, 2.4, 0]} castShadow>
            <sphereGeometry args={[0.78, 14, 14]} />
          </mesh>
          <mesh material={MATS.snow} position={[0, 3.4, 0]} castShadow>
            <sphereGeometry args={[0.55, 14, 14]} />
          </mesh>
          {/* Nez carotte */}
          <mesh material={MATS.carrot} position={[0, 3.4, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.12, 0.6, 8]} />
          </mesh>
          {/* Chapeau haut-de-forme */}
          <mesh material={MATS.black} position={[0, 4.05, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.6, 12]} />
          </mesh>
          <mesh material={MATS.black} position={[0, 3.75, 0]}>
            <cylinderGeometry args={[0.65, 0.65, 0.08, 12]} />
          </mesh>
        </group>
      );

    case "rock":
    default:
      return (
        <mesh material={MATS.rock} position={[0, 0.9 * s, 0]} scale={s} castShadow>
          <dodecahedronGeometry args={[1.4, 1]} />
        </mesh>
      );
  }
}

interface WorldProps {
  worldRef: React.RefObject<WorldState>;
}

export default function World({ worldRef }: WorldProps) {
  const props = useMemo(() => buildProps(), []);
  const propRefs = useRef<(THREE.Group | null)[]>([]);
  const zoneRefs = useRef<(THREE.Group | null)[]>([]);
  const dashRefs = useRef<(THREE.Mesh | null)[]>([]);
  const oceanMat = useRef<THREE.MeshStandardMaterial>(null);
  const dashes = useMemo(() => Array.from({ length: 48 }, (_, i) => i * 10), []);

  useFrame((state, dt) => {
    const scroll = (worldRef.current?.scroll ?? 0) + dt * WORLD_SPEED;
    if (worldRef.current) worldRef.current.scroll = scroll;

    // Défilement des décors
    for (let i = 0; i < props.length; i++) {
      const g = propRefs.current[i];
      if (!g) continue;
      const z = (((props[i].base + scroll) % LOOP) + LOOP) % LOOP + WINDOW_START;
      g.position.z = z;
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
      const m = dashRefs.current[i];
      if (!m) continue;
      m.position.z = ((((dashes[i] + scroll) % 480) + 480) % 480) - 400;
    }

    // Calcul de la zone active
    const baseAtBus = (((-WINDOW_START - scroll) % LOOP) + LOOP) % LOOP;
    if (worldRef.current) {
      worldRef.current.zone = Math.floor(baseAtBus / ZONE_LEN) % 5;
    }

    // Ondulation de l'océan de Grand Line
    if (oceanMat.current) {
      const t = state.clock.elapsedTime;
      oceanMat.current.emissiveIntensity = 0.08 + Math.sin(t * 1.8) * 0.04;
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
      {dashes.map((d, i) => (
        <mesh
          key={d}
          ref={(el: any) => {
            dashRefs.current[i] = el;
          }}
          position={[0, 0.038, 0]}
        >
          <boxGeometry args={[0.22, 0.02, 3.2]} />
          <meshStandardMaterial color="#ffffff" roughness={0.7} />
        </mesh>
      ))}

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
          <Prop def={p} />
        </group>
      ))}
    </group>
  );
}
