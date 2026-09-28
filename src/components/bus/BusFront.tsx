"use client";

import type { RefObject } from "react";
import * as THREE from "three";
import {
  FRONT_BADGE_CENTER_Y,
  FRONT_BADGE_RADIUS,
  FRONT_GRILLE_CENTER_Y,
  FRONT_GRILLE_HEIGHT,
  FRONT_GRILLE_SLAT_HEIGHT,
  FRONT_GRILLE_SLAT_YS,
} from "@/lib/bus-front-geometry";

interface BusFrontProps {
  headlights: boolean;
  mats: Record<string, THREE.Material>;
  leftTarget: RefObject<THREE.Object3D | null>;
  rightTarget: RefObject<THREE.Object3D | null>;
  licensePlateTex: THREE.Texture;
  montCorvoTex: THREE.Texture;
}

/** Face avant fixe du bus : capot, calandre, emblème, pare-chocs et feux. */
export default function BusFront({
  headlights, mats, leftTarget, rightTarget, licensePlateTex, montCorvoTex,
}: BusFrontProps) {
  return (
    <>
      {/* ---------- Capot avant & Calandre chromée ---------- */}
      <mesh material={mats.body} castShadow position={[0, 1.0, -5.3]}>
        <boxGeometry args={[2.4, 1.0, 1.4]} />
      </mesh>
      <mesh material={mats.bodyDark} position={[0, 1.52, -5.3]}>
        <boxGeometry args={[2.2, 0.06, 1.3]} />
      </mesh>
      {/* Grille de calandre */}
      <mesh material={mats.dark} position={[0, FRONT_GRILLE_CENTER_Y, -6.0]}>
        <boxGeometry args={[1.1, FRONT_GRILLE_HEIGHT, 0.06]} />
      </mesh>
      {FRONT_GRILLE_SLAT_YS.map((y) => (
        <mesh key={y} material={mats.chrome} position={[0, y, -6.04]}>
          <boxGeometry args={[1.05, FRONT_GRILLE_SLAT_HEIGHT, 0.02]} />
        </mesh>
      ))}

      {/* Le capot se termine à Z = -6 : le dos du badge entre légèrement
          dans cette face pour qu'aucun vide ne soit visible de profil. */}
      <group position={[0, FRONT_BADGE_CENTER_Y, -6.012]}>
        {/* Cerclage chromé d'emblème */}
        <mesh material={mats.chrome} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[FRONT_BADGE_RADIUS, FRONT_BADGE_RADIUS, 0.025, 32]} />
        </mesh>
        {/* Fond sombre rond puis logo complet, ajusté dans le diamètre intérieur. */}
        <mesh position={[0, 0, -0.014]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.24, 32]} />
          <meshStandardMaterial
            color="#101214"
            roughness={0.2}
            metalness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0, -0.017]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.334, 0.334]} />
          <meshStandardMaterial map={montCorvoTex} roughness={0.2} metalness={0.1} />
        </mesh>
      </group>
      {/* Pare-chocs chromé massif */}
      <mesh material={mats.chrome} castShadow position={[0, 0.6, -6.05]}>
        <boxGeometry args={[2.7, 0.28, 0.3]} />
      </mesh>
      {/* Plaque d'immatriculation avant */}
      <mesh position={[0, 0.6, -6.21]}>
        <planeGeometry args={[0.85, 0.24]} />
        <meshStandardMaterial map={licensePlateTex} roughness={0.3} />
      </mesh>
      {/* Bandes jaunes sur le capot */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} material={mats.yellow} position={[sx * 1.205, 1.2, -5.3]}>
          <boxGeometry args={[0.02, 0.14, 1.4]} />
        </mesh>
      ))}

      {/* ---------- Feux avant & Phares ---------- */}
      {[-0.8, 0.8].map((x, i) => (
        <group key={x} position={[x, 1.02, -6.02]}>
          {/* Cerclage chromé des phares */}
          <mesh material={mats.chrome} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.24, 0.05, 16, 32]} />
          </mesh>
          {/* Globe de phare lumineux */}
          <mesh scale={[1, 1, 0.5]}>
            <sphereGeometry args={[0.22, 24, 16]} />
            <meshStandardMaterial
              color={headlights ? "#f0f8ff" : "#8ab0d8"}
              emissive={headlights ? "#e1f2ff" : "#447098"}
              emissiveIntensity={headlights ? 4.0 : 0.2}
              toneMapped={false}
            />
          </mesh>

          {/* Les faisceaux restent montés : seul leur intensité change, pour éviter
              une recompilation des shaders et le micro-gel au clic. */}
          <spotLight
            ref={(sl: THREE.SpotLight | null) => {
              if (sl) {
                const tgt = i === 0 ? leftTarget.current : rightTarget.current;
                if (tgt) sl.target = tgt;
              }
            }}
            color="#eaf4ff"
            intensity={headlights ? 260 : 0}
            distance={85}
            angle={0.42}
            penumbra={0.65}
            decay={1.5}
            position={[0, 0, -0.1]}
            castShadow={false}
          />
          <mesh position={[0, -0.3, -10]} rotation={[-Math.PI / 2 - 0.03, 0, 0]} visible={headlights}>
            <coneGeometry args={[2.8, 20, 32, 1, true]} />
            <meshBasicMaterial
              color="#b8e2ff"
              transparent
              opacity={0.08}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
          <pointLight color="#d6ecff" intensity={headlights ? 8 : 0} distance={8} decay={1.8} />
        </group>
      ))}

      {/* Feux clignotants orange */}
      {[-0.8, 0.8].map((x) => (
        <mesh key={`under${x}`} material={mats.orange} position={[x, 0.68, -6.04]}>
          <boxGeometry args={[0.26, 0.1, 0.05]} />
        </mesh>
      ))}

      {/* Feux orange sur les ailes et le pavillon */}
      {[-1.0, 1.0].map((x) => (
        <mesh key={`wing${x}`} material={mats.orange} position={[x, 1.56, -5.85]}>
          <boxGeometry args={[0.26, 0.08, 0.16]} />
        </mesh>
      ))}
      {[-0.95, -0.7, 0.7, 0.95].map((x) => (
        <mesh key={`roof${x}`} material={mats.orange} position={[x, 3.14, -4.65]}>
          <boxGeometry args={[0.16, 0.1, 0.06]} />
        </mesh>
      ))}

    </>
  );
}
