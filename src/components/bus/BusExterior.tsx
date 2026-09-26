"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";

interface BusExteriorProps {
  headlights: boolean;
  phase: "outside" | "entering" | "inside" | "exiting";
  mats: Record<string, THREE.Material>;
  cabinLength: number;
  cabinCenterZ: number;
  rearWallZ: number;
  pillars: number[];
  wheelPositions: [number, number][];
  wheels: RefObject<(THREE.Mesh | null)[]>;
  leftWiper: RefObject<THREE.Group | null>;
  rightWiper: RefObject<THREE.Group | null>;
  leftTarget: RefObject<THREE.Object3D | null>;
  rightTarget: RefObject<THREE.Object3D | null>;
  sideLabel: THREE.Texture;
  destLabel: THREE.Texture;
  licensePlateTex: THREE.Texture;
  montCorvoTex: THREE.Texture;
  hatGeo: THREE.BufferGeometry;
  ribbonGeo: THREE.BufferGeometry;
  hat: RefObject<THREE.Group | null>;
  hatBasePos: [number, number, number];
  hatBaseRot: [number, number, number];
  tagSiecleTex: THREE.Texture;
  tagBarbeNoireTex: THREE.Texture;
  tagLuffyNikaTex: THREE.Texture;
  tagPoneglyphesTex: THREE.Texture;
  tagTimingTex: THREE.Texture;
}

export default function BusExterior({
  headlights, phase, mats, cabinLength, cabinCenterZ, rearWallZ,
  pillars, wheelPositions, wheels, leftWiper, rightWiper, leftTarget, rightTarget,
  sideLabel, destLabel, licensePlateTex, montCorvoTex, hatGeo, ribbonGeo, hat,
  hatBasePos, hatBaseRot, tagSiecleTex, tagBarbeNoireTex, tagLuffyNikaTex,
  tagPoneglyphesTex, tagTimingTex,
}: BusExteriorProps) {
  return (
    <>
      {/* Cibles des phares positionnées dans l'axe de marche du bus */}
      <object3D ref={leftTarget} position={[-0.85, 0.4, -35]} />
      <object3D ref={rightTarget} position={[0.85, 0.4, -35]} />

      {/* ---------- Carrosserie extérieure extensible ---------- */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          {/* Panneau latéral bas extensible */}
          <mesh material={mats.body} castShadow position={[sx * 1.3, 1.125, cabinCenterZ]}>
            <boxGeometry args={[0.08, 1.25, cabinLength]} />
          </mesh>
          {/* Panneau latéral haut extensible */}
          <mesh material={mats.body} castShadow position={[sx * 1.3, 2.975, cabinCenterZ]}>
            <boxGeometry args={[0.08, 0.45, cabinLength]} />
          </mesh>
          {/* Vitres teintées continues extensibles */}
          <mesh material={mats.glass} position={[sx * 1.3, 2.25, cabinCenterZ]} raycast={() => null}>
            <boxGeometry args={[0.02, 1.0, cabinLength]} />
          </mesh>
          {/* Bandes jaunes qui encadrent les tags sans jamais les recouvrir */}
          <mesh material={mats.yellow} position={[sx * 1.36, 1.68, cabinCenterZ]}>
            <boxGeometry args={[0.02, 0.14, cabinLength]} />
          </mesh>
          <mesh material={mats.yellow} position={[sx * 1.36, 0.57, cabinCenterZ]}>
            <boxGeometry args={[0.02, 0.07, cabinLength]} />
          </mesh>

          {/* Slogans de la théorie tagués en grand style graffiti street art : 3 phrases à gauche, 2 phrases à droite */}
          {sx < 0 ? (
            <>
              {/* CÔTÉ GAUCHE (3 phrases grandes et artistiques) */}
              {/* 1. Le siècle oublié c'est le présent (avant gauche) */}
              <mesh
                position={[sx * 1.352, 1.25, -2.7]}
                rotation={[0, -Math.PI / 2, 0]}
              >
                <planeGeometry args={[2.7, 0.62]} />
                <meshStandardMaterial
                  map={tagSiecleTex}
                  transparent
                  depthWrite={false}
                  polygonOffset
                  polygonOffsetFactor={-2}
                  roughness={0.4}
                />
              </mesh>
              {/* 2. Barbe Noire est Davy D. Jones (milieu gauche) */}
              <mesh
                position={[sx * 1.352, 1.25, 0.0]}
                rotation={[0, -Math.PI / 2, 0]}
              >
                <planeGeometry args={[2.5, 0.62]} />
                <meshStandardMaterial
                  map={tagBarbeNoireTex}
                  transparent
                  depthWrite={false}
                  polygonOffset
                  polygonOffsetFactor={-2}
                  roughness={0.4}
                />
              </mesh>
              {/* 3. Luffy est Nika et Joy Boy (arrière gauche) */}
              <mesh
                position={[sx * 1.352, 1.25, 2.7]}
                rotation={[0, -Math.PI / 2, 0]}
              >
                <planeGeometry args={[2.5, 0.62]} />
                <meshStandardMaterial
                  map={tagLuffyNikaTex}
                  transparent
                  depthWrite={false}
                  polygonOffset
                  polygonOffsetFactor={-2}
                  roughness={0.4}
                />
              </mesh>
            </>
          ) : (
            <>
              {/* CÔTÉ DROIT (2 phrases grandes et artistiques) */}
              {/* 4. Les ponéglyphes viennent du futur (avant/milieu droit) */}
              <mesh
                position={[sx * 1.352, 1.25, -1.5]}
                rotation={[0, Math.PI / 2, 0]}
              >
                <planeGeometry args={[3.6, 0.62]} />
                <meshStandardMaterial
                  map={tagPoneglyphesTex}
                  transparent
                  depthWrite={false}
                  polygonOffset
                  polygonOffsetFactor={-2}
                  roughness={0.4}
                />
              </mesh>
              {/* 5. Tout est une question de timing (milieu/arrière droit) */}
              <mesh
                position={[sx * 1.352, 1.25, 2.4]}
                rotation={[0, Math.PI / 2, 0]}
              >
                <planeGeometry args={[3.4, 0.62]} />
                <meshStandardMaterial
                  map={tagTimingTex}
                  transparent
                  depthWrite={false}
                  polygonOffset
                  polygonOffsetFactor={-2}
                  roughness={0.4}
                />
              </mesh>
            </>
          )}

          {/* Grands rétroviseurs incurvés (restent à l'avant) */}
          <mesh material={mats.body} position={[sx * 1.62, 2.42, -4.35]}>
            <boxGeometry args={[0.15, 0.44, 0.28]} />
          </mesh>
          <mesh
            material={mats.chrome}
            position={[sx * 1.45, 2.42, -4.35]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.02, 0.02, 0.35, 12]} />
          </mesh>
          {/* Miroir réfléchissant */}
          <mesh material={mats.chrome} position={[sx * 1.62, 2.42, -4.2]}>
            <planeGeometry args={[0.13, 0.4]} />
          </mesh>
        </group>
      ))}

      <PillarInstances positions={pillars} material={mats.bodyDark} />

      {/* Face avant : pare-brise panoramique */}
      <mesh material={mats.body} castShadow position={[0, 1.125, -4.6]}>
        <boxGeometry args={[2.6, 1.25, 0.08]} />
      </mesh>
      <mesh material={mats.body} castShadow position={[0, 2.975, -4.6]}>
        <boxGeometry args={[2.6, 0.45, 0.08]} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} material={mats.bodyDark} position={[sx * 1.225, 2.25, -4.6]}>
          <boxGeometry args={[0.15, 1.02, 0.08]} />
        </mesh>
      ))}
      <mesh material={mats.bodyDark} position={[0, 2.25, -4.6]}>
        <boxGeometry args={[0.05, 1.02, 0.08]} />
      </mesh>
      <mesh material={mats.glass} position={[0, 2.25, -4.6]} raycast={() => null}>
        <boxGeometry args={[2.3, 1.0, 0.02]} />
      </mesh>
      {/* Finition intérieure du bandeau de pare-brise, dans le prolongement
          exact des habillages latéraux. */}
      <mesh material={mats.interiorWall} position={[0, 2.98, -4.548]}>
        <boxGeometry args={[2.5, 0.4, 0.016]} />
      </mesh>
      <mesh material={mats.bodyDark} position={[0, 2.76, -4.535]}>
        <boxGeometry args={[2.5, 0.08, 0.04]} />
      </mesh>
      {/* Essuie-glaces */}
      <group ref={leftWiper} position={[-0.55, 1.8, -4.66]} rotation={[0, 0, 0.58]}>
        <mesh material={mats.dark} position={[0, 0.31, 0]}>
          <boxGeometry args={[0.035, 0.62, 0.02]} />
        </mesh>
      </group>
      <group ref={rightWiper} position={[0.55, 1.8, -4.66]} rotation={[0, 0, -0.58]}>
        <mesh material={mats.dark} position={[0, 0.31, 0]}>
          <boxGeometry args={[0.035, 0.62, 0.02]} />
        </mesh>
      </group>
      {/* Girouette de destination lumineuse */}
      <mesh position={[0, 2.98, -4.65]}>
        <planeGeometry args={[2.1, 0.32]} />
        <meshStandardMaterial
          map={destLabel}
          emissive="#ffb700"
          emissiveMap={destLabel}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* ---------- Face arrière dynamique (se recule avec la longueur) ---------- */}
      <group position={[0, 0, rearWallZ]}>
        <mesh material={mats.body} castShadow position={[0, 1.125, 0]}>
          <boxGeometry args={[2.6, 1.25, 0.08]} />
        </mesh>
        <mesh material={mats.body} castShadow position={[0, 2.975, 0]}>
          <boxGeometry args={[2.6, 0.45, 0.08]} />
        </mesh>
        <mesh material={mats.glass} position={[0, 2.25, 0]} raycast={() => null}>
          <boxGeometry args={[2.56, 1.04, 0.02]} />
        </mesh>
        <mesh material={mats.chrome} position={[0, 0.65, 0.1]}>
          <boxGeometry args={[2.7, 0.28, 0.25]} />
        </mesh>
        {/* Plaque d'immatriculation arrière */}
        <mesh position={[0, 0.65, 0.23]}>
          <planeGeometry args={[0.85, 0.24]} />
          <meshStandardMaterial map={licensePlateTex} roughness={0.3} />
        </mesh>
        {/* Feux arrière rouges */}
        {[-0.95, 0.95].map((rx) => (
          <mesh key={rx} material={mats.red} position={[rx, 1.05, 0.05]}>
            <boxGeometry args={[0.35, 0.2, 0.06]} />
          </mesh>
        ))}
        {/* Affiche à l'arrière du bus */}
        <mesh position={[0, 2.3, 0.012]}>
          <planeGeometry args={[1.8, 0.38]} />
          <meshStandardMaterial map={sideLabel} roughness={0.3} />
        </mesh>
      </group>

      {/* ---------- Toit et plancher extensibles ---------- */}
      <mesh material={mats.body} castShadow position={[0, 3.2, cabinCenterZ]}>
        <boxGeometry args={[2.6, 0.08, cabinLength]} />
      </mesh>
      <mesh material={mats.bodyDark} castShadow position={[0, 3.29, cabinCenterZ]}>
        <boxGeometry args={[2.3, 0.12, cabinLength - 0.3]} />
      </mesh>
      <mesh material={mats.floor} position={[0, 0.6, cabinCenterZ]}>
        <boxGeometry args={[2.6, 0.08, cabinLength]} />
      </mesh>
      <mesh material={mats.dark} position={[0, 0.4, cabinCenterZ - 0.6]}>
        <boxGeometry args={[2.4, 0.3, cabinLength + 1.2]} />
      </mesh>

      {/* ---------- Capot avant & Calandre chromée ---------- */}
      <mesh material={mats.body} castShadow position={[0, 1.0, -5.3]}>
        <boxGeometry args={[2.4, 1.0, 1.4]} />
      </mesh>
      <mesh material={mats.bodyDark} position={[0, 1.52, -5.3]}>
        <boxGeometry args={[2.2, 0.06, 1.3]} />
      </mesh>
      {/* Grille de calandre */}
      <mesh material={mats.dark} position={[0, 0.95, -6.0]}>
        <boxGeometry args={[1.1, 0.58, 0.06]} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} material={mats.chrome} position={[0, 0.74 + i * 0.1, -6.04]}>
          <boxGeometry args={[1.05, 0.035, 0.02]} />
        </mesh>
      ))}

      {/* Logo emblème officiel Le Mont Corvo à l'avant du bus (surélevé au-dessus de la grille d'aération) */}
      <group position={[0, 1.48, -6.05]}>
        {/* Cerclage chromé d'emblème */}
        <mesh material={mats.chrome} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.025, 32]} />
        </mesh>
        {/* Fond sombre rond puis logo complet, ajusté dans le diamètre intérieur. */}
        <mesh position={[0, 0, -0.018]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.24, 32]} />
          <meshStandardMaterial
            color="#101214"
            roughness={0.2}
            metalness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0, -0.033]} rotation={[0, Math.PI, 0]}>
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
          <mesh position={[0, -0.3, -10]} rotation={[-Math.PI / 2 - 0.03, 0, 0]}>
            <coneGeometry args={[2.8, 20, 32, 1, true]} />
            <meshBasicMaterial
              color="#b8e2ff"
              transparent
              opacity={headlights ? 0.08 : 0}
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

      {/* ---------- Roues stylisées (adaptées à la longueur) ---------- */}
      {phase !== "inside" && wheelPositions.map(([x, z], i) => (
        <group key={`wheel-${i}`} position={[x, 0.55, z]}>
          <mesh
            ref={(el: THREE.Mesh | null) => {
              wheels.current[i] = el;
            }}
            castShadow
            rotation={[0, 0, Math.PI / 2]}
          >
            {/* Pneu noir à cannelures */}
            <cylinderGeometry args={[0.55, 0.55, 0.4, 32]} />
            <meshStandardMaterial color="#19191d" roughness={0.92} />

            {/* Enjoliveur chromé bombé */}
            <mesh material={mats.chrome} position={[0, 0, 0]}>
              <cylinderGeometry args={[0.34, 0.34, 0.42, 28]} />
            </mesh>
            {/* Centre de roue doré One Piece */}
            <mesh material={mats.yellow} position={[0, 0, 0]}>
              <sphereGeometry args={[0.14, 16, 16]} />
            </mesh>
            {/* 5 écrous chromés */}
            {[0, 1, 2, 3, 4].map((k) => (
              <mesh
                key={k}
                material={mats.dark}
                position={[
                  0,
                  Math.cos((k / 5) * Math.PI * 2) * 0.22,
                  Math.sin((k / 5) * Math.PI * 2) * 0.22,
                ]}
              >
                <cylinderGeometry args={[0.03, 0.03, 0.44, 8]} />
              </mesh>
            ))}
          </mesh>
        </group>
      ))}

      {/* ---------- CHAPEAU DE PAILLE DE LUFFY (AGRANDI ET DROIT) ---------- */}
      <group
        ref={hat}
        position={hatBasePos}
        rotation={hatBaseRot}
        scale={[1.35, 1.35, 1.35]}
      >
        {/* Chapeau de Luffy complet et continu */}
        <mesh geometry={hatGeo} material={mats.straw} castShadow receiveShadow />

        {/* Ruban rouge écarlate ceignant la calotte */}
        <mesh
          geometry={ribbonGeo}
          material={mats.band}
          position={[0, 0, 0]}
          castShadow
        />
      </group>

    </>
  );
}

function PillarInstances({ positions, material }: { positions: number[]; material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const matrix = new THREE.Matrix4();
    let index = 0;
    for (const x of [-1.3, 1.3]) {
      for (const z of positions) {
        matrix.makeTranslation(x, 2.25, z);
        ref.current.setMatrixAt(index++, matrix);
      }
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, [positions]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, positions.length * 2]} material={material}>
      <boxGeometry args={[0.08, 1.02, 0.1]} />
    </instancedMesh>
  );
}
