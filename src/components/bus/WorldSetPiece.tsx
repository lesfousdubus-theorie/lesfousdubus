"use client";

import * as THREE from "three";

// Repères dessinés à partir des panoramas des cinq îles. Les matériaux sont
// partagés entre les maillages pour garder un coût raisonnable dans le bus.
const M = {
  sandstone: new THREE.MeshStandardMaterial({ color: "#c99658", roughness: 1 }),
  sandstoneLight: new THREE.MeshStandardMaterial({ color: "#f4d69a", roughness: 0.94 }),
  alabastaBlue: new THREE.MeshStandardMaterial({ color: "#4f9db3", roughness: 0.68 }),
  waterStone: new THREE.MeshStandardMaterial({ color: "#eee4cb", roughness: 0.88 }),
  waterBlue: new THREE.MeshStandardMaterial({ color: "#319cc6", roughness: 0.24, metalness: 0.12 }),
  waterDark: new THREE.MeshStandardMaterial({ color: "#34738c", roughness: 0.54 }),
  brick: new THREE.MeshStandardMaterial({ color: "#cc7655", roughness: 0.86 }),
  cloud: new THREE.MeshStandardMaterial({ color: "#fffefa", roughness: 0.98 }),
  cloudShade: new THREE.MeshStandardMaterial({ color: "#dce6ee", roughness: 0.98 }),
  vine: new THREE.MeshStandardMaterial({ color: "#5c9f55", roughness: 0.9 }),
  vineLight: new THREE.MeshStandardMaterial({ color: "#a9d17e", roughness: 0.9 }),
  gold: new THREE.MeshStandardMaterial({ color: "#edbb42", metalness: 0.65, roughness: 0.28 }),
  goldDark: new THREE.MeshStandardMaterial({ color: "#ad7928", metalness: 0.5, roughness: 0.4 }),
  wanoWood: new THREE.MeshStandardMaterial({ color: "#903c42", roughness: 0.85 }),
  wanoRoof: new THREE.MeshStandardMaterial({ color: "#315c70", roughness: 0.72 }),
  sakura: new THREE.MeshStandardMaterial({ color: "#f8acc4", roughness: 0.9 }),
  sakuraLight: new THREE.MeshStandardMaterial({ color: "#ffd5dc", roughness: 0.9 }),
  drumRock: new THREE.MeshStandardMaterial({ color: "#778b9e", roughness: 0.98 }),
  drumSnow: new THREE.MeshStandardMaterial({ color: "#edf6ff", roughness: 0.95 }),
  castle: new THREE.MeshStandardMaterial({ color: "#d7e1ea", roughness: 0.87 }),
  slate: new THREE.MeshStandardMaterial({ color: "#3d5369", roughness: 0.8 }),
  window: new THREE.MeshStandardMaterial({ color: "#273948", roughness: 0.8 }),
};

function Alubarna() {
  return (
    <group position={[30, 0, 0]}>
      {/* Ville et palais au sommet d'une falaise ocre. */}
      <mesh material={M.sandstone} position={[0, 2.4, 0]} castShadow>
        <cylinderGeometry args={[14, 17, 4.8, 8]} />
      </mesh>
      <mesh material={M.sandstoneLight} position={[0, 4.85, 0]}>
        <cylinderGeometry args={[14.1, 14.1, 0.35, 8]} />
      </mesh>
      {[-4.5, 4.5].map((z) => (
        <mesh key={z} material={M.alabastaBlue} position={[-13.15, 2.4, z]}>
          <boxGeometry args={[0.18, 4.7, 1.15]} />
        </mesh>
      ))}
      <mesh material={M.sandstoneLight} position={[0, 7.5, 0]} castShadow>
        <boxGeometry args={[12, 5, 8]} />
      </mesh>
      <mesh material={M.sandstone} position={[-6.25, 7.3, 0]}>
        <boxGeometry args={[0.8, 5.1, 9]} />
      </mesh>
      <mesh material={M.sandstone} position={[6.25, 7.3, 0]}>
        <boxGeometry args={[0.8, 5.1, 9]} />
      </mesh>
      <mesh material={M.alabastaBlue} position={[0, 11.1, 0]} castShadow>
        <sphereGeometry args={[3.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={M.gold} position={[0, 14.25, 0]}>
        <sphereGeometry args={[0.38, 8, 6]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 7.5, 0, 0]}>
          <mesh material={M.sandstoneLight} position={[0, 8.7, 0]} castShadow>
            <cylinderGeometry args={[1.25, 1.5, 7.7, 8]} />
          </mesh>
          <mesh material={M.alabastaBlue} position={[0, 12.6, 0]}>
            <sphereGeometry args={[1.55, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh material={M.sandstoneLight} position={[side * 3.4, 5.7, 4]}>
            <boxGeometry args={[4, 2.1, 3.4]} />
          </mesh>
        </group>
      ))}
      {/* Entrée sombre et terrasses tournées vers la route. */}
      <mesh material={M.window} position={[-6.02, 6.4, 0]}>
        <boxGeometry args={[0.12, 2.7, 2]} />
      </mesh>
      {[-8, -11].map((x, i) => (
        <mesh key={x} material={M.sandstoneLight} position={[x, 1.4 - i * 0.45, 0]}>
          <boxGeometry args={[3.2, 0.5, 4.4 + i * 1.1]} />
        </mesh>
      ))}
    </group>
  );
}

function WaterSeven() {
  return (
    <group position={[31, 0, 0]}>
      {/* La ville étagée entoure une fontaine centrale en cascade. */}
      {[0, 1, 2].map((level) => (
        <group key={level} position={[0, level * 4, 0]}>
          <mesh material={M.waterStone} position={[0, 1.25, 0]} castShadow>
            <cylinderGeometry args={[12 - level * 2.6, 13 - level * 2.6, 2.5, 12]} />
          </mesh>
          <mesh material={M.waterBlue} position={[0, 2.56, 0]}>
            <cylinderGeometry args={[12.1 - level * 2.6, 12.1 - level * 2.6, 0.12, 12]} />
          </mesh>
          <mesh material={M.waterDark} position={[0, 0.42, 0]}>
            <cylinderGeometry args={[12.6 - level * 2.6, 12.6 - level * 2.6, 0.3, 12]} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} material={M.waterBlue} position={[side * (12.05 - level * 2.6), 1.15, 0]}>
              <boxGeometry args={[0.12, 2.3, 1.8]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh material={M.waterStone} position={[0, 14.1, 0]} castShadow>
        <cylinderGeometry args={[3.3, 4.2, 3.3, 10]} />
      </mesh>
      <mesh material={M.waterBlue} position={[0, 15.8, 0]}>
        <cylinderGeometry args={[3.4, 3.4, 0.2, 10]} />
      </mesh>
      <mesh material={M.waterStone} position={[0, 17.1, 0]}>
        <cylinderGeometry args={[1.25, 2.4, 2.5, 10]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 14.5, 0, 4]}>
          <mesh material={M.brick} position={[0, 4.5, 0]} castShadow>
            <boxGeometry args={[5.2, 9, 6]} />
          </mesh>
          <mesh material={M.waterStone} position={[0, 9.1, 0]}>
            <boxGeometry args={[5.6, 0.55, 6.4]} />
          </mesh>
          <mesh material={M.brick} position={[0, 10.4, 0]}>
            <sphereGeometry args={[2.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          {[2.5, 5.1, 7.7].map((y) => (
            <mesh key={y} material={M.window} position={[0, y, -3.06]}>
              <boxGeometry args={[1.05, 1.35, 0.08]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Pont au-dessus du canal le plus proche du bus. */}
      <mesh material={M.waterStone} position={[-9, 3.2, -18]} castShadow>
        <boxGeometry args={[11, 0.65, 3.2]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} material={M.waterStone} position={[-9, 3.8, -18 + side * 1.55]}>
          <boxGeometry args={[11, 0.42, 0.24]} />
        </mesh>
      ))}
    </group>
  );
}

function Skypiea() {
  return (
    <group position={[30, 0, 0]}>
      {/* L'île flotte sur une mer de nuages sous le Giant Jack. */}
      {[[-8, 3.4, -4, 5], [0, 3.8, 0, 8], [8, 3.2, 4, 5.5]].map(([x, y, z, radius], i) => (
        <mesh key={i} material={i % 2 ? M.cloud : M.cloudShade} position={[x, y, z]} scale={[1, 0.55, 0.8]}>
          <sphereGeometry args={[radius, 12, 8]} />
        </mesh>
      ))}
      <mesh material={M.vine} position={[-2, 13.5, 0]} rotation={[0, 0, -0.08]} castShadow>
        <cylinderGeometry args={[1.25, 2, 22, 9]} />
      </mesh>
      {[8, 14, 20].map((y, i) => (
        <group key={y} position={[-2, y, 0]} rotation={[0, i * 1.9, 0]}>
          {[-1, 1].map((side) => (
            <mesh key={side} material={M.vineLight} position={[side * 3, 0.4, 0]} rotation={[0, 0, side * -0.65]}>
              <coneGeometry args={[1.5, 6.5, 4]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* La grande cloche d'or de Shandora et son portique. */}
      <group position={[8, 5, 0]}>
        <mesh material={M.goldDark} position={[0, 0.4, 0]}>
          <cylinderGeometry args={[4.4, 4.8, 0.8, 8]} />
        </mesh>
        {[-3.5, 3.5].map((x) => (
          <mesh key={x} material={M.goldDark} position={[x, 5.6, 0]} castShadow>
            <boxGeometry args={[0.65, 10, 0.75]} />
          </mesh>
        ))}
        <mesh material={M.goldDark} position={[0, 10.8, 0]}>
          <boxGeometry args={[8.2, 0.7, 0.8]} />
        </mesh>
        <mesh material={M.gold} position={[0, 6.1, 0]} castShadow>
          <cylinderGeometry args={[1.75, 2.8, 4.9, 14]} />
        </mesh>
        <mesh material={M.goldDark} position={[0, 3.55, 0]}>
          <torusGeometry args={[2.55, 0.35, 6, 14]} />
        </mesh>
        <mesh material={M.gold} position={[0, 8.75, 0]}>
          <sphereGeometry args={[1.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
    </group>
  );
}

function Wano() {
  return (
    <group position={[31, 0, 0]}>
      {/* La capitale des fleurs, dominée par son château et ses cerisiers. */}
      <mesh material={M.wanoWood} position={[0, 6.5, 0]} castShadow>
        <cylinderGeometry args={[4.2, 7.3, 13, 10]} />
      </mesh>
      <mesh material={M.wanoWood} position={[0, 13.3, 0]}>
        <cylinderGeometry args={[3.3, 4.2, 2, 10]} />
      </mesh>
      {[0, 1, 2].map((level) => (
        <group key={level} position={[0, 13.5 + level * 3.1, 0]}>
          <mesh material={M.wanoWood} position={[0, 1.4, 0]} castShadow>
            <boxGeometry args={[8 - level * 1.5, 2.8, 7 - level * 1.3]} />
          </mesh>
          <mesh material={M.gold} position={[0, 2.5, -3.55 + level * 0.65]}>
            <boxGeometry args={[2, 0.45, 0.09]} />
          </mesh>
          <mesh material={M.wanoRoof} position={[0, 3.05, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[6.5 - level * 1.25, 1.4, 4]} />
          </mesh>
        </group>
      ))}
      <mesh material={M.gold} position={[0, 24.3, 0]}>
        <coneGeometry args={[0.42, 1.9, 6]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 10, 0, side * 3]}>
          <mesh material={M.wanoWood} position={[-side * 2.4, 8, 0]} rotation={[0, 0, side * 0.45]}>
            <cylinderGeometry args={[0.55, 0.8, 8, 7]} />
          </mesh>
          <mesh material={M.sakura} position={[0, 12, 0]} scale={[1.4, 0.8, 1]} castShadow>
            <sphereGeometry args={[4.3, 12, 8]} />
          </mesh>
          <mesh material={M.sakuraLight} position={[side * 3.2, 10.2, 1.5]} scale={[1, 0.75, 1]}>
            <sphereGeometry args={[3, 10, 7]} />
          </mesh>
        </group>
      ))}
      <mesh material={M.wanoWood} position={[-10, 0.8, -13]}>
        <boxGeometry args={[11, 1.2, 3.5]} />
      </mesh>
    </group>
  );
}

function Drum() {
  return (
    <group position={[31, 0, 0]}>
      {/* Drum Rockies : colonnes abruptes et château isolé sur la neige. */}
      {[-1, 0, 1].map((side) => {
        const height = side === 0 ? 19 : 12 + (side + 1) * 2;
        return (
          <group key={side} position={[side * 10.5, 0, side * -4]}>
            <mesh material={M.drumRock} position={[0, height / 2, 0]} castShadow>
              <cylinderGeometry args={[4.2, 5.3, height, 9]} />
            </mesh>
            <mesh material={M.drumSnow} position={[0, height + 0.25, 0]}>
              <cylinderGeometry args={[4.4, 4.4, 0.55, 9]} />
            </mesh>
          </group>
        );
      })}
      <group position={[0, 19.5, 0]}>
        <mesh material={M.castle} position={[0, 2.3, 0]} castShadow>
          <boxGeometry args={[6.6, 4.6, 5.2]} />
        </mesh>
        <mesh material={M.slate} position={[0, 5.05, 0]}>
          <coneGeometry args={[4.6, 1.65, 4]} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 3.4, 0, 0]}>
            <mesh material={M.castle} position={[0, 3.1, 0]} castShadow>
              <cylinderGeometry args={[1.2, 1.3, 6.2, 8]} />
            </mesh>
            <mesh material={M.slate} position={[0, 6.65, 0]}>
              <coneGeometry args={[1.6, 2.2, 8]} />
            </mesh>
          </group>
        ))}
        <mesh material={M.window} position={[-3.36, 1.85, 0]}>
          <boxGeometry args={[0.08, 2.5, 1.25]} />
        </mesh>
      </group>
    </group>
  );
}

export default function WorldSetPiece({ zone }: { zone: number }) {
  if (zone === 0) return <Alubarna />;
  if (zone === 1) return <WaterSeven />;
  if (zone === 2) return <Skypiea />;
  if (zone === 3) return <Wano />;
  return <Drum />;
}
