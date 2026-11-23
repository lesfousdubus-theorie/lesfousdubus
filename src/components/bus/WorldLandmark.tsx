"use client";

import * as THREE from "three";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { setSceneryParts } from "@/lib/world-visibility";

export type PropType =
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
  | "rock"
  | "giantSword"
  | "vikingHall"
  | "runestone"
  | "drakkar"
  | "justicePillar"
  | "waterfallCliff"
  | "courthouse";

export interface PropDef {
  id?: number;
  type: PropType;
  x: number;
  y?: number;
  base: number;
  s: number;
  rot: number;
  seed: number;
}

const MATS = {
  trunk: new THREE.MeshStandardMaterial({ color: "#6e3f1c", roughness: 0.9 }),
  leaf: new THREE.MeshStandardMaterial({ color: "#2d9138", roughness: 0.75 }),
  leafLight: new THREE.MeshStandardMaterial({ color: "#58b94e", roughness: 0.8 }),
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
  neonCyan: new THREE.MeshStandardMaterial({
    color: "#9ef8ff",
    emissive: "#19d4ff",
    emissiveIntensity: 1.4,
    roughness: 0.25,
  }),
  water: new THREE.MeshStandardMaterial({ color: "#43bdd7", roughness: 0.28, metalness: 0.08 }),
  marble: new THREE.MeshStandardMaterial({ color: "#dce5ef", roughness: 0.85 }),
};

function LandmarkModel({ def }: { def: PropDef }) {
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
              <group key={i} position={[0, 4.6, 0]} rotation={[0, a, 0.45]}>
                <mesh material={i % 2 ? MATS.leafLight : MATS.leaf} position={[1.25, -0.12, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
                  <coneGeometry args={[0.48, 2.65, 3]} />
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
          {/* Portail d'entrée encastré contre la pente de la pyramide */}
          <mesh material={MATS.black} position={[0, 1.2, 5.45]}>
            <boxGeometry args={[2.2, 2.4, 1.8]} />
          </mesh>
          {[-1.32, 1.32].map((x) => (
            <mesh key={`jamb-${x}`} material={MATS.sandDark} position={[x, 1.25, 5.4]}>
              <boxGeometry args={[0.56, 2.5, 2.0]} />
            </mesh>
          ))}
          <mesh material={MATS.sandDark} position={[0, 2.5, 5.4]}>
            <boxGeometry args={[3.3, 0.44, 2.2]} />
          </mesh>
          {[-1.42, 1.42].map((x) => (
            <mesh key={x} material={MATS.sandDark} position={[x, 1.3, 6.4]}>
              <cylinderGeometry args={[0.24, 0.32, 2.6, 6]} />
            </mesh>
          ))}
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
          <mesh material={MATS.cactus} position={[-0.85, 3.05, 0]}>
            <sphereGeometry args={[0.2, 8, 8]} />
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
          {/* Fenêtres à arches et lueurs adaptées à la hauteur du bâtiment */}
          {Array.from({ length: Math.max(1, Math.min(3, Math.floor((h - 0.8) / 2.2))) }, (_, floor) =>
            [-w * 0.28, w * 0.28].map((fx, fi) => (
              <mesh
                key={`${floor}-${fi}`}
                material={(floor + fi) % 2 === 0 ? MATS.lanternLight : MATS.black}
                position={[fx, 1.5 + floor * 2.2, w * 0.45 + 0.02]}
              >
                <boxGeometry args={[0.65, 1.1, 0.06]} />
              </mesh>
            )),
          )}
          <mesh material={MATS.wallPastelA} position={[0, 2.9, w * 0.48]}>
            <boxGeometry args={[w * 0.72, 0.16, 0.45]} />
          </mesh>
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
            <cylinderGeometry args={[1.0, 2.2, 15, 10]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => {
            const h = 3 + i * 3.5;
            const a = i * 1.6;
            return (
              <group key={i} position={[Math.cos(a) * 1.4, h, Math.sin(a) * 1.4]} rotation={[0, a, 0.4]}>
                <mesh material={MATS.leafLight} rotation={[0, 0, -Math.PI / 2]}>
                  <coneGeometry args={[0.9, 3.6, 4]} />
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
          {[-2.85, 2.85].map((x) => (
            <mesh key={x} material={MATS.trunk} position={[x, 7.8, 0]}>
              <boxGeometry args={[0.6, 7.0, 0.6]} />
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
          {/* Socle en pierre de la pagode */}
          <mesh material={MATS.rock} position={[0, 0.25, 0]} receiveShadow>
            <boxGeometry args={[6.0, 0.5, 6.0]} />
          </mesh>
          {/* Pagode traditionnelle à 3 étages de Wano */}
          {[0, 1, 2].map((i) => {
            const w = 5.2 - i * 1.1;
            const winW = w * 0.42;
            return (
              <group key={i} position={[0, 0.4 + i * 3.4, 0]}>
                <mesh material={MATS.redWood} position={[0, 1.5, 0]} castShadow>
                  <boxGeometry args={[w, 3.0, w]} />
                </mesh>
                {/* Fenêtres shoji éclairées sur les façades */}
                <mesh material={MATS.lanternLight} position={[0, 1.5, w / 2 + 0.03]}>
                  <boxGeometry args={[winW, 1.05, 0.06]} />
                </mesh>
                <mesh material={MATS.lanternLight} position={[0, 1.5, -w / 2 - 0.03]}>
                  <boxGeometry args={[winW, 1.05, 0.06]} />
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
            );
          })}
          {/* Flèche d'or au sommet */}
          <mesh material={MATS.gold} position={[0, 11.6, 0]}>
            <coneGeometry args={[0.3, 2.0, 8]} />
          </mesh>
        </group>
      );

    case "torii":
      return (
        <group scale={s * 1.4}>
          {/* Socles en pierre et piliers du portail Torii vermillon */}
          {[-1.8, 1.8].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh material={MATS.rock} position={[0, 0.25, 0]}>
                <cylinderGeometry args={[0.38, 0.45, 0.5, 10]} />
              </mesh>
              <mesh material={MATS.redWood} position={[0, 2.2, 0]} castShadow>
                <cylinderGeometry args={[0.24, 0.3, 4.4, 12]} />
              </mesh>
            </group>
          ))}
          {/* Linteau supérieur noir galbé */}
          <mesh material={MATS.black} position={[0, 4.72, 0]} castShadow>
            <boxGeometry args={[5.8, 0.35, 0.55]} />
          </mesh>
          {/* Poutre principale rouge */}
          <mesh material={MATS.redWood} position={[0, 4.4, 0]} castShadow>
            <boxGeometry args={[5.2, 0.38, 0.45]} />
          </mesh>
          {/* Poutre intermédiaire et tablette dorée */}
          <mesh material={MATS.redWood} position={[0, 3.5, 0]}>
            <boxGeometry args={[4.2, 0.28, 0.32]} />
          </mesh>
          <mesh material={MATS.gold} position={[0, 4.05, 0.2]}>
            <boxGeometry args={[0.55, 0.75, 0.14]} />
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
          {/* Écharpe rouge et boutons en charbon */}
          <mesh material={MATS.redWood} position={[0, 2.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.55, 0.12, 8, 16]} />
          </mesh>
          <mesh material={MATS.redWood} position={[0.35, 2.6, 0.5]} rotation={[0.2, 0, -0.35]}>
            <boxGeometry args={[0.18, 0.72, 0.08]} />
          </mesh>
          {[2.1, 2.4, 2.68].map((y) => (
            <mesh key={y} material={MATS.black} position={[0, y, 0.76]}>
              <sphereGeometry args={[0.07, 6, 6]} />
            </mesh>
          ))}
          {[-0.18, 0.18].map((x) => (
            <mesh key={x} material={MATS.black} position={[x, 3.52, 0.48]}>
              <sphereGeometry args={[0.06, 6, 6]} />
            </mesh>
          ))}
          {/* Bras en brindilles */}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              material={MATS.trunk}
              position={[side * 0.98, 2.55, 0]}
              rotation={[0, 0, -side * 0.75]}
            >
              <cylinderGeometry args={[0.05, 0.07, 1.1, 6]} />
            </mesh>
          ))}
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

    case "giantSword":
      return (
        <group scale={s * 1.1}>
          <mesh material={MATS.rock} position={[0, 0.9, 0]} castShadow>
            <dodecahedronGeometry args={[1.8, 1]} />
          </mesh>
          <group position={[0, 1.4, 0]} rotation={[0.12, 0.2, 0.22]}>
            <mesh material={MATS.steelRail} position={[0, 3.6, 0]} castShadow>
              <boxGeometry args={[0.95, 7.2, 0.22]} />
            </mesh>
            <mesh material={MATS.gold} position={[0, 7.2, 0]}>
              <boxGeometry args={[2.8, 0.42, 0.48]} />
            </mesh>
            <mesh material={MATS.trunk} position={[0, 8.3, 0]}>
              <cylinderGeometry args={[0.2, 0.22, 2.0, 8]} />
            </mesh>
          </group>
        </group>
      );

    case "vikingHall":
      return (
        <group scale={s * 1.2}>
          <mesh material={MATS.trunk} position={[0, 1.8, 0]} castShadow>
            <boxGeometry args={[5.4, 3.6, 7.2]} />
          </mesh>
          <mesh material={MATS.darkRoof} position={[0, 5.2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[5.6, 3.4, 4]} />
          </mesh>
          {[-2.72, 2.72].map((x) => (
            <mesh key={x} material={MATS.gold} position={[x, 2.0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.55, 0.55, 0.14, 10]} />
            </mesh>
          ))}
          <mesh material={MATS.lanternLight} position={[0, 1.8, 3.62]}>
            <boxGeometry args={[1.2, 1.6, 0.1]} />
          </mesh>
        </group>
      );

    case "runestone":
      return (
        <group scale={s}>
          <mesh material={MATS.rock} position={[0, 2.2, 0]} castShadow>
            <cylinderGeometry args={[0.75, 1.25, 4.4, 6]} />
          </mesh>
          <mesh material={MATS.gold} position={[0, 2.35, 1.01]} rotation={[-0.113, 0, 0]}>
            <boxGeometry args={[0.26, 2.2, 0.12]} />
          </mesh>
          <mesh material={MATS.neonCyan} position={[0, 2.85, 0.98]} rotation={[-0.113, 0, 0]}>
            <boxGeometry args={[0.68, 0.2, 0.12]} />
          </mesh>
        </group>
      );

    case "drakkar":
      return (
        <group scale={s * 1.15}>
          <mesh material={MATS.trunk} position={[0, 0.85, 0]} scale={[1.1, 0.6, 2.8]} castShadow>
            <sphereGeometry args={[1.8, 12, 10]} />
          </mesh>
          <mesh material={MATS.trunk} position={[0, 3.4, 0]}>
            <cylinderGeometry args={[0.14, 0.2, 5.2, 8]} />
          </mesh>
          <mesh material={MATS.trunk} position={[0, 4.95, 0.25]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.09, 0.09, 3.8, 6]} />
          </mesh>
          <mesh material={MATS.redWood} position={[0, 3.7, 0.25]}>
            <boxGeometry args={[3.4, 2.4, 0.12]} />
          </mesh>
          {/* Boucliers dorés plaqués contre la courbure de la coque */}
          {[
            [-1.8, 1.66],
            [0, 1.88],
            [1.8, 1.66],
          ].map(([z, offset]) =>
            [-1, 1].map((side) => (
              <mesh
                key={`${z}-${side}`}
                material={MATS.gold}
                position={[side * offset, 1.2, z]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.38, 0.38, 0.12, 10]} />
              </mesh>
            )),
          )}
          <mesh material={MATS.gold} position={[0, 1.8, 4.5]} rotation={[0.45, 0, 0]}>
            <coneGeometry args={[0.45, 1.8, 6]} />
          </mesh>
        </group>
      );

    case "justicePillar":
      return (
        <group scale={s * 1.15}>
          <mesh material={MATS.marble} position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[2.2, 1.0, 2.2]} />
          </mesh>
          <mesh material={MATS.snow} position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.62, 0.72, 5.2, 12]} />
          </mesh>
          <mesh material={MATS.marble} position={[0, 6.2, 0]}>
            <boxGeometry args={[2.0, 0.55, 2.0]} />
          </mesh>
        </group>
      );

    case "waterfallCliff":
      return (
        <group scale={s * 1.2}>
          <mesh material={MATS.rock} position={[0, 3.6, 0]} castShadow>
            <cylinderGeometry args={[3.0, 3.8, 7.2, 10]} />
          </mesh>
          <mesh material={MATS.water} position={[0, 3.6, 3.58]} rotation={[-0.115, 0, 0]}>
            <boxGeometry args={[2.4, 7.1, 0.35]} />
          </mesh>
          <mesh material={MATS.snow} position={[0, 0.55, 3.85]} scale={[1.4, 0.45, 0.9]}>
            <sphereGeometry args={[1.6, 10, 8]} />
          </mesh>
        </group>
      );

    case "courthouse":
      return (
        <group scale={s * 1.2}>
          <mesh material={MATS.snow} position={[0, 0.25, 0.2]} receiveShadow>
            <boxGeometry args={[7.0, 0.5, 6.0]} />
          </mesh>
          <mesh material={MATS.marble} position={[0, 2.8, 0]} castShadow>
            <boxGeometry args={[6.2, 5.2, 5.0]} />
          </mesh>
          <mesh material={MATS.darkRoof} position={[0, 6.3, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[5.1, 2.0, 4]} />
          </mesh>
          {[-2.3, -1.2, 1.2, 2.3].map((x) => (
            <mesh key={x} material={MATS.snow} position={[x, 2.8, 2.65]}>
              <cylinderGeometry args={[0.26, 0.32, 4.8, 8]} />
            </mesh>
          ))}
          {/* Portail central dégagé et fenêtres latérales du palais de justice */}
          <mesh material={MATS.black} position={[0, 1.4, 2.53]}>
            <boxGeometry args={[1.35, 2.2, 0.08]} />
          </mesh>
          {[-1.75, 1.75].map((x) => (
            <mesh key={x} material={MATS.lanternLight} position={[x, 3.2, 2.53]}>
              <boxGeometry args={[0.55, 0.95, 0.06]} />
            </mesh>
          ))}
          {/* Emblème à 5 points du Gouvernement Mondial centré sous le toit */}
          <mesh material={MATS.gold} position={[0, 4.45, 2.56]}>
            <boxGeometry args={[1.25, 0.14, 0.08]} />
          </mesh>
          <mesh material={MATS.gold} position={[0, 4.45, 2.56]}>
            <boxGeometry args={[0.14, 1.25, 0.08]} />
          </mesh>
          {[
            [0, 4.45],
            [-0.55, 4.45],
            [0.55, 4.45],
            [0, 5.0],
            [0, 3.9],
          ].map(([ex, ey], idx) => (
            <mesh key={idx} material={MATS.gold} position={[ex, ey, 2.6]}>
              <sphereGeometry args={[0.15, 8, 8]} />
            </mesh>
          ))}
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

type MergedMeshBatch = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  castShadow: boolean;
  receiveShadow: boolean;
};

const LANDMARK_GEOMETRY_CACHE = new Map<string, MergedMeshBatch[]>();

function getLandmarkCacheKey(def: PropDef): string {
  if (def.type === "building" || def.type === "cloud") {
    return `${def.type}:${Math.round(def.seed * 20)}`;
  }
  return def.type;
}

/** Les éléments fixes regroupent leurs pièces par matériau et par comportement d’ombre. */
export function WorldLandmark({ def, onReady }: { def: PropDef; onReady?: () => void }) {
  const source = useRef<THREE.Group>(null);
  const onReadyRef = useRef(onReady);
  const cacheKey = getLandmarkCacheKey(def);
  const unitDef = useMemo(() => ({ ...def, s: 1 }), [def]);
  const [merged, setMerged] = useState<{ key: string; batches: MergedMeshBatch[] } | null>(() => {
    const cached = LANDMARK_GEOMETRY_CACHE.get(cacheKey);
    return cached ? { key: cacheKey, batches: cached } : null;
  });
  const activeBatches = LANDMARK_GEOMETRY_CACHE.get(cacheKey)
    ?? (merged?.key === cacheKey ? merged.batches : null);

  useLayoutEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useLayoutEffect(() => {
    const cached = LANDMARK_GEOMETRY_CACHE.get(cacheKey);
    if (cached) {
      onReadyRef.current?.();
      return;
    }
    const original = source.current;
    if (!original) return;
    original.updateWorldMatrix(true, true);
    const inverse = original.matrixWorld.clone().invert();
    const batches = new Map<string, { material: THREE.Material; cast: boolean; receive: boolean; shapes: THREE.BufferGeometry[] }>();
    original.traverse(object => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
      const cast = object.castShadow;
      const receive = object.receiveShadow;
      const key = `${object.material.uuid}:${cast}:${receive}`;
      const batch = batches.get(key) ?? { material: object.material, cast, receive, shapes: [] as THREE.BufferGeometry[] };
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      for (const attr of Object.keys(geometry.attributes)) {
        if (attr !== "position" && attr !== "normal") geometry.deleteAttribute(attr);
      }
      if (!geometry.hasAttribute("normal")) geometry.computeVertexNormals();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      geometry.computeBoundingBox();
      batch.shapes.push(geometry);
      batches.set(key, batch);
    });

    const nextBatches: MergedMeshBatch[] = [];
    for (const { material, cast, receive, shapes } of batches.values()) {
      const combined = mergeGeometries(shapes);
      if (combined) {
        setSceneryParts(combined, shapes);
        nextBatches.push({ geometry: combined, material, castShadow: cast, receiveShadow: receive });
      }
      shapes.forEach(shape => shape.dispose());
    }
    if (nextBatches.length === batches.size && nextBatches.length > 0) {
      LANDMARK_GEOMETRY_CACHE.set(cacheKey, nextBatches);
      setMerged({ key: cacheKey, batches: nextBatches });
    } else {
      nextBatches.forEach(batch => batch.geometry.dispose());
    }
  }, [cacheKey, activeBatches]);

  if (activeBatches) {
    return (
      <group scale={def.s}>
        {activeBatches.map((batch, index) => (
          <mesh
            key={`${batch.material.uuid}:${index}`}
            geometry={batch.geometry}
            material={batch.material}
            castShadow={batch.castShadow}
            receiveShadow={batch.receiveShadow}
            dispose={null}
          />
        ))}
      </group>
    );
  }
  return <group ref={source} scale={def.s}><LandmarkModel def={unitDef} /></group>;
}
