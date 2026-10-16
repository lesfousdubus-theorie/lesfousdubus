"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { WIPER_PARK_ANGLE } from "@/lib/bus-wipers";
import BusFront from "./BusFront";
import BusCoachDetails from "./BusCoachDetails";
import BusWheels from "./BusWheels";
import BusDoors from "./BusDoors";
import BusSpanMeshes from "./BusSpanMeshes";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import BusDestination from "./BusDestination";
import { BUS_DOOR, BUS_FRONT_Z, splitAtDoors, type BusDoorLayout } from "@/lib/bus-layout";
import { createLowerBodyGeometry, SIDE_LABEL_Y } from "./BusBodyGeometry";
import { isWindowPillarClearOfDoor } from "@/lib/bus-interior-geometry";
import type { JourneyState } from "@/lib/bus-journey";

interface BusExteriorProps {
  headlights: boolean;
  phase: "outside" | "entering" | "inside" | "exiting";
  mats: Record<string, THREE.Material>;
  cabinLength: number;
  cabinCenterZ: number;
  rearWallZ: number;
  doors: BusDoorLayout[];
  numRows: number;
  focusZ: number;
  lowPower: boolean;
  pillars: number[];
  wheelPositions: [number, number][];
  wheels: RefObject<(THREE.Group | null)[]>;
  leftWiper: RefObject<THREE.Group | null>;
  rightWiper: RefObject<THREE.Group | null>;
  leftTarget: RefObject<THREE.Object3D | null>;
  rightTarget: RefObject<THREE.Object3D | null>;
  sideLabel: THREE.Texture;
  reducedMotion: boolean;
  freeView: boolean;
  journey:RefObject<JourneyState>;
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
  contactShadowTex: THREE.Texture;
}

export default function BusExterior({
  headlights, phase, journey, mats, cabinLength, cabinCenterZ, rearWallZ, doors, numRows, focusZ, lowPower,
  pillars, wheelPositions, wheels, leftWiper, rightWiper, leftTarget, rightTarget,
  sideLabel, reducedMotion, freeView, licensePlateTex, montCorvoTex, hatGeo, ribbonGeo, hat,
  hatBasePos, hatBaseRot, tagSiecleTex, tagBarbeNoireTex, tagLuffyNikaTex,
  tagPoneglyphesTex, tagTimingTex, contactShadowTex,
}: BusExteriorProps) {
  const sidePanels = useMemo(() => [-1, 1].map(side => {
    const pieces = splitAtDoors(BUS_FRONT_Z, rearWallZ, doors, side > 0).map(([from, to]) => {
      const center = (from + to) / 2;
      return createLowerBodyGeometry(to - from, [...new Set(wheelPositions.map(([, z]) => z - center))]).translate(0, 0, center);
    });
    const geometry = mergeGeometries(pieces, false)!;
    pieces.forEach(piece => piece.dispose());
    return { side, geometry };
  }), [rearWallZ, wheelPositions, doors]);
  useEffect(() => () => sidePanels.forEach(({ geometry }) => geometry.dispose()), [sidePanels]);

  return (
    <>
      {/* Cibles des phares positionnées dans l'axe de marche du bus */}
      <object3D ref={leftTarget} position={[-0.85, 0.4, -35]} />
      <object3D ref={rightTarget} position={[0.85, 0.4, -35]} />

      {/* ---------- Carrosserie extérieure extensible ---------- */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          {/* Panneau latéral bas extensible */}
          {sidePanels.filter(({ side }) => side === sx).map(({ geometry }) =>
            <mesh key={sx} name={`bus-body-side-${sx}-${BUS_FRONT_Z}`} geometry={geometry} material={mats.body} castShadow position={[sx * 1.3, 0, 0]} />
          )}
          {/* Panneau latéral haut extensible */}
          <RoundedBox args={[0.08, 0.45, cabinLength]} radius={0.035} smoothness={2} bevelSegments={3} material={mats.body} castShadow position={[sx * 1.3, 2.975, cabinCenterZ]} />
          <BusSpanMeshes spans={splitAtDoors(BUS_FRONT_Z, rearWallZ, doors, sx > 0)} material={mats.windowGlass} x={sx * 1.3} y={2.25} width={0} height={1} planeSide={sx} />
          <BusSpanMeshes spans={splitAtDoors(BUS_FRONT_Z, rearWallZ, doors, sx > 0)} material={mats.yellow} x={sx * 1.35} y={1.72} width={0.024} height={0.08} />

          {/* Slogans de la théorie tagués en grand style graffiti street art : 3 phrases à gauche, 2 phrases à droite */}
          {sx < 0 ? (
            <>
              {/* CÔTÉ GAUCHE (3 phrases grandes et artistiques) */}
              {/* 1. Le siècle oublié c'est le présent (avant gauche) */}
              <mesh
                name="bus-side-slogan-siecle" position={[sx * 1.352, SIDE_LABEL_Y, -2.45]}
                rotation={[0, -Math.PI / 2, 0]}
              >
                <planeGeometry args={[2.9, 0.725]} />
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
                name="bus-side-slogan-barbe-noire" position={[sx * 1.352, SIDE_LABEL_Y, 0.0]}
                rotation={[0, -Math.PI / 2, 0]}
              >
                <planeGeometry args={[2.7, 0.675]} />
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
                name="bus-side-slogan-luffy" position={[sx * 1.352, SIDE_LABEL_Y, 2.7]}
                rotation={[0, -Math.PI / 2, 0]}
              >
                <planeGeometry args={[2.7, 0.675]} />
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
                name="bus-side-slogan-poneglyphes" position={[sx * 1.352, SIDE_LABEL_Y, -0.7]}
                rotation={[0, Math.PI / 2, 0]}
              >
                <planeGeometry args={[3.1, 0.775]} />
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
                name="bus-side-slogan-timing" position={[sx * 1.352, SIDE_LABEL_Y, 2.35]}
                rotation={[0, Math.PI / 2, 0]}
              >
                <planeGeometry args={[3, 0.75]} />
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

        </group>
      ))}

      <PillarInstances positions={pillars} doors={doors} material={mats.bodyDark} />

      {/* Face avant : pare-brise panoramique */}
      <RoundedBox args={[2.6, 1.25, 0.08]} radius={0.035} smoothness={2} bevelSegments={3} material={mats.body} castShadow position={[0, 1.125, -4.6]} />
      <RoundedBox args={[2.6, 0.45, 0.08]} radius={0.035} smoothness={2} bevelSegments={3} material={mats.body} castShadow position={[0, 2.975, -4.6]} />
      {[-1, 1].map((sx) => (
        <mesh key={sx} material={mats.bodyDark} position={[sx * 1.225, 2.25, -4.6]}>
          <boxGeometry args={[0.15, 1.02, 0.08]} />
        </mesh>
      ))}
      <mesh material={mats.bodyDark} position={[0, 2.25, -4.6]}>
        <boxGeometry args={[0.05, 1.02, 0.08]} />
      </mesh>
      <mesh material={mats.windowGlass} position={[0, 2.25, -4.6]} raycast={() => null}>
        <planeGeometry args={[2.3, 1.0]} />
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
      <group ref={leftWiper} position={[-0.48, 1.79, -4.66]} rotation={[0, 0, WIPER_PARK_ANGLE]}>
        <mesh material={mats.dark} position={[0, 0.28, 0]}>
          <boxGeometry args={[0.035, 0.56, 0.02]} />
        </mesh>
      </group>
      <group ref={rightWiper} position={[0.48, 1.79, -4.66]} rotation={[0, 0, WIPER_PARK_ANGLE]}>
        <mesh material={mats.dark} position={[0, 0.28, 0]}>
          <boxGeometry args={[0.035, 0.56, 0.02]} />
        </mesh>
      </group>
      {/* Girouette de destination lumineuse */}
      <BusDestination mats={mats} reducedMotion={reducedMotion} />
      <BusDoors doors={doors} numRows={numRows} focusZ={focusZ} lowPower={lowPower} mats={mats} phase={phase} journey={journey} reducedMotion={reducedMotion} />

      {/* ---------- Face arrière dynamique (se recule avec la longueur) ---------- */}
      <group name="bus-rear-face" position={[0, 0, rearWallZ]}>
        <RoundedBox args={[2.6, 1.25, 0.08]} radius={0.035} smoothness={2} bevelSegments={3} material={mats.body} castShadow position={[0, 1.125, 0]} />
        <RoundedBox args={[2.6, 0.45, 0.08]} radius={0.035} smoothness={2} bevelSegments={3} material={mats.body} castShadow position={[0, 2.975, 0]} />
        {[-1.255, 1.255].map((x) => <mesh key={x} material={mats.bodyDark} castShadow position={[x, 1.875, 0.02]}>
          <boxGeometry args={[0.09, 2.75, 0.12]} />
        </mesh>)}
        <mesh material={mats.windowGlass} position={[0, 2.25, 0]} raycast={() => null}>
          <planeGeometry args={[2.56, 1.04]} />
        </mesh>
        <RoundedBox args={[2.7, 0.28, 0.25]} radius={0.1} smoothness={2} bevelSegments={3} material={mats.chrome} castShadow position={[0, 0.65, 0.1]} />
        {/* Plaque d'immatriculation arrière */}
        <mesh position={[0, 0.65, 0.23]}>
          <planeGeometry args={[0.85, 0.24]} />
          <meshStandardMaterial map={licensePlateTex} roughness={0.3} />
        </mesh>
        {/* Affiche à l'arrière du bus */}
        <mesh position={[0, 2.3, 0.035]}>
          <planeGeometry args={[1.8, 0.38]} />
          <meshStandardMaterial map={sideLabel} roughness={0.3} />
        </mesh>
      </group>

      {/* ---------- Toit et plancher extensibles ---------- */}
      <RoundedBox args={[2.68, 0.22, cabinLength + 0.12]} radius={0.1} smoothness={2} bevelSegments={3} material={mats.body} castShadow position={[0, 3.26, cabinCenterZ]} />
      <RoundedBox args={[2.3, 0.12, cabinLength - 0.3]} radius={0.05} smoothness={2} bevelSegments={3} material={mats.bodyDark} castShadow position={[0, 3.36, cabinCenterZ]} />
      {/* Plancher et châssis découpés à droite pour le puits des marches. */}
      <mesh material={mats.floor} castShadow position={[-0.45, 0.6, cabinCenterZ]}>
        <boxGeometry args={[1.7, 0.08, cabinLength]} />
      </mesh>
      <mesh material={mats.dark} castShadow position={[-0.4, 0.4, cabinCenterZ - 0.6]}>
        <boxGeometry args={[1.6, 0.3, cabinLength + 1.2]} />
      </mesh>
      <BusSpanMeshes spans={splitAtDoors(BUS_FRONT_Z, rearWallZ, doors)} material={mats.floor} x={(BUS_DOOR.innerX + 1.3) / 2} y={0.6} width={1.3 - BUS_DOOR.innerX} height={0.08} castShadow />
      <BusSpanMeshes spans={splitAtDoors(BUS_FRONT_Z - 1.2, rearWallZ, doors)} material={mats.dark} x={0.8} y={0.4} width={0.8} height={0.3} castShadow />

      {/* Ombre de contact au sol sous le bus : ancre solidement le bus au sol */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.026, cabinCenterZ - 0.5]}
        renderOrder={1}
      >
        <planeGeometry args={[3.2, cabinLength + 2.8]} />
        <meshBasicMaterial
          map={contactShadowTex}
          transparent
          opacity={0.88}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      <BusFront
        headlights={headlights}
        mats={mats}
        leftTarget={leftTarget}
        rightTarget={rightTarget}
        licensePlateTex={licensePlateTex}
        montCorvoTex={montCorvoTex}
      />

      <BusCoachDetails mats={mats} cabinLength={cabinLength} cabinCenterZ={cabinCenterZ} rearWallZ={rearWallZ} wheelPositions={wheelPositions} doors={doors} />
      <BusWheels positions={wheelPositions} wheels={wheels} mats={mats} visible={phase !== "inside" || freeView} />

      {/* ---------- CHAPEAU DE PAILLE DE LUFFY (AGRANDI ET DROIT) ---------- */}
      <group
        ref={hat}
        position={hatBasePos}
        rotation={hatBaseRot}
        scale={[1.35, 1.35, 1.35]}
      >
        {/* Chapeau de Luffy complet et continu */}
        {/* The thin closed shell casts onto the bus, but cannot reliably
            receive its own shadow map without concentric shadow acne. */}
        <mesh geometry={hatGeo} material={mats.straw} castShadow />

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

function PillarInstances({ positions, doors, material }: { positions: number[]; doors: BusDoorLayout[]; material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const matrix = new THREE.Matrix4();
    let index = 0;
    for (const x of [-1.3, 1.3]) {
      for (const z of positions) {
        if (x > 0 && !isWindowPillarClearOfDoor(z, doors)) continue;
        matrix.makeTranslation(x, 2.25, z);
        ref.current.setMatrixAt(index++, matrix);
      }
    }
    ref.current.count = index;
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [positions, doors]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, positions.length * 2)]} count={positions.length * 2} material={material}>
      <boxGeometry args={[0.08, 1.02, 0.1]} />
    </instancedMesh>
  );
}
