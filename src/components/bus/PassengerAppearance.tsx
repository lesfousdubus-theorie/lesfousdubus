"use client";

import * as THREE from "three";
import type { NakamaArchetype } from "./passenger-archetypes";

/** Styles de cheveux 3D manga */
export function HairStyle({
  style,
  mats,
}: {
  style: NakamaArchetype["hairStyle"];
  mats: Record<string, THREE.Material>;
}) {
  switch (style) {
    case "spiky":
      // Cheveux hérissés (Luffy)
      return (
        <group>
          <mesh material={mats.hair} position={[0, 0.08, 0.02]}>
            <boxGeometry args={[0.24, 0.16, 0.22]} />
          </mesh>
          {[-0.08, 0, 0.08].map((hx, hi) => (
            <mesh
              key={hi}
              material={mats.hair}
              position={[hx, 0.16, -0.04]}
              rotation={[-0.2, 0, (hi - 1) * 0.3]}
            >
              <coneGeometry args={[0.045, 0.12, 4]} />
            </mesh>
          ))}
        </group>
      );

    case "crop":
      // Cheveux courts marimo (Zoro, Chopper)
      return (
        <mesh material={mats.hair} position={[0, 0.08, 0.01]}>
          <boxGeometry args={[0.24, 0.16, 0.22]} />
        </mesh>
      );

    case "flowing":
      // Longs cheveux (Nami, Robin, Yamato, Shanks, Buggy)
      return (
        <group>
          <mesh material={mats.hair} position={[0, 0.08, 0.02]}>
            <boxGeometry args={[0.24, 0.16, 0.22]} />
          </mesh>
          {/* Mèches longues tombant sur les épaules */}
          {[-0.12, 0.12].map((lx) => (
            <mesh key={lx} material={mats.hair} position={[lx, -0.06, 0.04]} rotation={[0.1, 0, 0]}>
              <cylinderGeometry args={[0.035, 0.045, 0.28, 6]} />
            </mesh>
          ))}
          <mesh material={mats.hair} position={[0, -0.08, 0.11]}>
            <boxGeometry args={[0.22, 0.26, 0.04]} />
          </mesh>
        </group>
      );

    case "swoop":
      // Mèche asymétrique tombante (Sanji)
      return (
        <group>
          <mesh material={mats.hair} position={[0, 0.08, 0.02]}>
            <boxGeometry args={[0.24, 0.16, 0.22]} />
          </mesh>
          <mesh material={mats.hair} position={[0.06, 0.02, -0.11]} rotation={[0, 0, -0.45]}>
            <boxGeometry args={[0.1, 0.18, 0.03]} />
          </mesh>
        </group>
      );

    case "afro":
      // Afro volumineux (Brook, Usopp)
      return (
        <mesh material={mats.hair} position={[0, 0.1, 0.04]}>
          <sphereGeometry args={[0.22, 14, 14]} />
        </mesh>
      );

    case "pompadour":
      // Banane rockeur Franky
      return (
        <group>
          <mesh material={mats.hair} position={[0, 0.08, 0.02]}>
            <boxGeometry args={[0.24, 0.16, 0.22]} />
          </mesh>
          <mesh
            material={mats.hair}
            position={[0, 0.18, -0.06]}
            rotation={[-0.4, 0, 0]}
          >
            <cylinderGeometry args={[0.08, 0.09, 0.24, 8]} />
          </mesh>
        </group>
      );

    case "topknot":
      // Chignon samouraï (Jinbe)
      return (
        <group>
          <mesh material={mats.hair} position={[0, 0.08, 0.02]}>
            <boxGeometry args={[0.24, 0.16, 0.22]} />
          </mesh>
          <mesh material={mats.hair} position={[0, 0.2, 0.05]}>
            <sphereGeometry args={[0.06, 8, 8]} />
          </mesh>
        </group>
      );

    case "wavy":
    case "shaggy":
    default:
      return (
        <group>
          <mesh material={mats.hair} position={[0, 0.08, 0.02]}>
            <boxGeometry args={[0.24, 0.16, 0.22]} />
          </mesh>
          {[-0.11, 0.11].map((wx) => (
            <mesh key={wx} material={mats.hair} position={[wx, -0.02, 0.02]}>
              <cylinderGeometry args={[0.03, 0.04, 0.16, 6]} />
            </mesh>
          ))}
        </group>
      );
  }
}

/** Chapeaux et accessoires fidèles de l'univers One Piece */
export function Accessory({
  archetype,
  mats,
}: {
  archetype: NakamaArchetype;
  mats: Record<string, THREE.Material>;
}) {
  switch (archetype.accessory) {
    case "straw_hat":
      // Chapeau de paille de Luffy (accroché dans le dos ou sur la tête)
      return (
        <group position={[0, 0.18, 0.04]} rotation={[-0.2, 0, 0]}>
          {/* Bord large */}
          <mesh material={mats.accessory}>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 24]} />
          </mesh>
          {/* Calotte */}
          <mesh material={mats.accessory} position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.11, 0.12, 0.08, 20]} />
          </mesh>
          {/* Ruban rouge */}
          <mesh material={mats.accessorySub} position={[0, 0.025, 0]}>
            <cylinderGeometry args={[0.115, 0.115, 0.03, 20]} />
          </mesh>
        </group>
      );

    case "earrings":
      // 3 anneaux dorés de Zoro à l'oreille gauche
      return (
        <group position={[-0.12, -0.02, 0]}>
          {[0, 0.025, 0.05].map((ez) => (
            <mesh key={ez} material={mats.gold} position={[0, 0, ez]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.015, 0.004, 6, 12]} />
            </mesh>
          ))}
        </group>
      );

    case "goggles":
      // Lunettes de tireur d'élite d'Usopp
      return (
        <group position={[0, 0.12, -0.12]}>
          {[-0.05, 0.05].map((gx) => (
            <mesh key={gx} material={mats.gold} position={[gx, 0, 0]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
            </mesh>
          ))}
          <mesh material={mats.dark} position={[0, 0, 0.02]}>
            <boxGeometry args={[0.2, 0.02, 0.02]} />
          </mesh>
        </group>
      );

    case "reindeer_hat":
      // Chapeau rose à cornes de renne de Chopper
      return (
        <group position={[0, 0.14, 0]}>
          {/* Dôme rose */}
          <mesh material={mats.accessory}>
            <sphereGeometry args={[0.18, 16, 16]} />
          </mesh>
          {/* Croix médicale blanche */}
          <mesh material={mats.accessorySub} position={[0, 0.04, -0.19]}>
            <boxGeometry args={[0.08, 0.025, 0.01]} />
          </mesh>
          <mesh material={mats.accessorySub} position={[0, 0.04, -0.19]}>
            <boxGeometry args={[0.025, 0.08, 0.01]} />
          </mesh>
          {/* Bois de renne */}
          {[-0.15, 0.15].map((bx, bi) => (
            <group key={bi} position={[bx, 0.12, 0]} rotation={[0, 0, bi === 0 ? 0.4 : -0.4]}>
              <mesh material={mats.dark}>
                <cylinderGeometry args={[0.02, 0.03, 0.16, 6]} />
              </mesh>
              <mesh material={mats.dark} position={[0.03, 0.04, 0]} rotation={[0, 0, 0.6]}>
                <cylinderGeometry args={[0.015, 0.02, 0.08, 6]} />
              </mesh>
            </group>
          ))}
        </group>
      );

    case "top_hat":
      // Haut-de-forme (Brook, Sabo)
      return (
        <group position={[0, 0.22, 0.02]}>
          <mesh material={mats.accessory}>
            <cylinderGeometry args={[0.18, 0.18, 0.02, 20]} />
          </mesh>
          <mesh material={mats.accessory} position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.11, 0.12, 0.22, 20]} />
          </mesh>
          {/* Ruban coloré */}
          <mesh material={mats.accessorySub} position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.115, 0.115, 0.04, 20]} />
          </mesh>
        </group>
      );

    case "sunglasses":
      // Lunettes de soleil (Robin, Franky)
      return (
        <group position={[0, 0.1, -0.12]}>
          <mesh material={mats.accessory}>
            <boxGeometry args={[0.18, 0.035, 0.03]} />
          </mesh>
        </group>
      );

    case "white_cap":
      // Béret moucheté de Law
      return (
        <group position={[0, 0.14, 0]}>
          <mesh material={mats.accessory}>
            <cylinderGeometry args={[0.15, 0.13, 0.1, 16]} />
          </mesh>
          <mesh material={mats.accessory} position={[0, 0.03, -0.08]}>
            <boxGeometry args={[0.16, 0.02, 0.06]} />
          </mesh>
        </group>
      );

    case "cowboy_hat":
      // Chapeau de cowboy d'Ace
      return (
        <group position={[0, 0.18, 0.02]}>
          <mesh material={mats.accessory}>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 24]} />
          </mesh>
          <mesh material={mats.accessory} position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.11, 0.12, 0.1, 20]} />
          </mesh>
          {/* Collier de perles rouges */}
          <mesh material={mats.accessorySub} position={[0, 0.02, 0]}>
            <torusGeometry args={[0.12, 0.012, 6, 16]} />
          </mesh>
        </group>
      );

    case "horns":
      // Cornes oni de Yamato
      return (
        <group position={[0, 0.12, -0.04]}>
          {[-0.08, 0.08].map((hx, hi) => (
            <mesh
              key={hi}
              material={mats.accessory}
              position={[hx, 0.06, 0]}
              rotation={[0.2, 0, hi === 0 ? 0.35 : -0.35]}
            >
              <coneGeometry args={[0.025, 0.14, 8]} />
            </mesh>
          ))}
        </group>
      );

    default:
      return null;
  }
}

/** Objets emblématiques tenus par les nakama */
export function NakamaProp({
  prop,
  mats,
}: {
  prop?: NakamaArchetype["prop"];
  mats: Record<string, THREE.Material>;
}) {
  switch (prop) {
    case "meat":
      // Gigot d'anime légendaire de Luffy
      return (
        <group position={[0.12, 1.25, -0.16]} rotation={[0.4, 0.3, -0.2]}>
          {/* Os traversant */}
          <mesh material={mats.skin}>
            <cylinderGeometry args={[0.02, 0.02, 0.28, 8]} />
          </mesh>
          {/* Viande rôtie appétissante */}
          <mesh material={mats.accessorySub} position={[0, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.16, 10]} />
          </mesh>
        </group>
      );

    case "swords":
      // Katanas de Zoro / Law
      return (
        <group position={[0.22, 1.05, 0.05]} rotation={[-0.3, 0.1, 0.2]}>
          {[-0.03, 0, 0.03].map((sx, si) => (
            <mesh key={si} material={si === 0 ? mats.skin : si === 1 ? mats.red : mats.dark} position={[sx, 0, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.75, 6]} />
            </mesh>
          ))}
        </group>
      );

    case "book":
      // Livre d'histoire ancienne de Robin
      return (
        <group position={[0, 1.22, -0.1]} rotation={[-0.3, 0, 0]}>
          <mesh material={mats.shirt}>
            <boxGeometry args={[0.2, 0.03, 0.15]} />
          </mesh>
        </group>
      );

    case "violin":
      // Violon de Brook
      return (
        <group position={[-0.05, 1.25, -0.12]} rotation={[0.3, 0.2, 0.4]}>
          <mesh material={mats.accessory}>
            <boxGeometry args={[0.09, 0.18, 0.04]} />
          </mesh>
          <mesh material={mats.dark} position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.14, 6]} />
          </mesh>
        </group>
      );

    case "tangerine":
      // Mandarine de Nami
      return (
        <mesh material={mats.accessory} position={[0.15, 1.2, -0.12]}>
          <sphereGeometry args={[0.04, 10, 10]} />
        </mesh>
      );

    case "sake":
      // Gourde de saké de Jinbe
      return (
        <group position={[0.18, 1.15, -0.1]}>
          <mesh material={mats.skin}>
            <sphereGeometry args={[0.06, 10, 10]} />
          </mesh>
          <mesh material={mats.skin} position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.05, 8]} />
          </mesh>
        </group>
      );

    case "slingshot":
    case "cane":
    default:
      return null;
  }
}
