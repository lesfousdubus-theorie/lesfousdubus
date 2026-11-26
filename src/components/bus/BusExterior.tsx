"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
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
import BusGraffiti from "./BusGraffiti";
import { BUS_DOOR, BUS_FRONT_Z, splitAtDoors, type BusDoorLayout } from "@/lib/bus-layout";
import { WHEEL_ARCH_RADIUS, createLowerBodyGeometry } from "./BusBodyGeometry";
import { isWindowPillarClearOfDoor } from "@/lib/bus-interior-geometry";
import type { JourneyState } from "@/lib/bus-journey";

const PLAIN_SIDE_PANEL_TEMPLATE_CACHE = new Map<string, THREE.BufferGeometry>();

function getPlainSidePanelTemplate(len: number): THREE.BufferGeometry {
  const key = len.toFixed(3);
  let template = PLAIN_SIDE_PANEL_TEMPLATE_CACHE.get(key);
  if (!template) {
    if (PLAIN_SIDE_PANEL_TEMPLATE_CACHE.size >= 48) {
      const oldestKey = PLAIN_SIDE_PANEL_TEMPLATE_CACHE.keys().next().value;
      if (oldestKey !== undefined) {
        PLAIN_SIDE_PANEL_TEMPLATE_CACHE.get(oldestKey)?.dispose();
        PLAIN_SIDE_PANEL_TEMPLATE_CACHE.delete(oldestKey);
      }
    }
    template = createLowerBodyGeometry(len, []);
    PLAIN_SIDE_PANEL_TEMPLATE_CACHE.set(key, template);
  }
  return template;
}

function createExtrudedRoundedProfile(width: number, height: number, radius: number, curveSegments = 6): THREE.BufferGeometry {
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw, hh);
  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments });
  geometry.translate(0, 0, -0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function splitAtWheels(spans: Array<[number, number]>, wheelZs: number[], margin = WHEEL_ARCH_RADIUS): Array<[number, number]> {
  let current = spans;
  for (const wheelZ of wheelZs) {
    const front = wheelZ - margin;
    const rear = wheelZ + margin;
    current = current.flatMap(([from, to]): Array<[number, number]> => {
      if (to <= front || from >= rear) return [[from, to]];
      const out: Array<[number, number]> = [];
      if (from < front) out.push([from, front]);
      if (to > rear) out.push([rear, to]);
      return out;
    });
  }
  return current;
}

interface BusExteriorProps {
  headlights: boolean;
  phase: "outside" | "entering" | "inside" | "exiting";
  mats: Record<string, THREE.Material>;
  cabinLength: number;
  cabinCenterZ: number;
  hullStartZ?: number;
  hullEndZ?: number;
  rearWallZ: number;
  doors: BusDoorLayout[];
  totalDoorCount?: number;
  numRows: number;
  focusZ: number;
  lowPower: boolean;
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
  contactShadowTex: THREE.Texture;
}

const BusExterior = memo(function BusExterior({
  headlights, phase, journey, mats, cabinLength, cabinCenterZ, hullStartZ = BUS_FRONT_Z, hullEndZ, rearWallZ, doors, totalDoorCount, numRows, focusZ, lowPower,
  wheelPositions, wheels, leftWiper, rightWiper, leftTarget, rightTarget,
  sideLabel, reducedMotion, freeView, licensePlateTex, montCorvoTex, hatGeo, ribbonGeo, hat,
  hatBasePos, hatBaseRot, contactShadowTex,
}: BusExteriorProps) {
  const spanEndZ = hullEndZ ?? rearWallZ;
  const startsAtFront = hullStartZ <= BUS_FRONT_Z + 0.01;
  const endsAtRear = spanEndZ >= rearWallZ - 0.01;
  const roofCapStartZ = startsAtFront ? hullStartZ + 0.15 : hullStartZ;
  const roofCapEndZ = endsAtRear ? spanEndZ - 0.15 : spanEndZ;
  const roofMainStartZ = startsAtFront ? hullStartZ - 0.06 : hullStartZ;
  const roofMainEndZ = endsAtRear ? spanEndZ + 0.06 : spanEndZ;
  const chassisStartZ = startsAtFront ? hullStartZ - 1.2 : hullStartZ;
  const shadowStartZ = startsAtFront ? hullStartZ - 1.9 : hullStartZ;
  const shadowEndZ = endsAtRear ? spanEndZ + 0.9 : spanEndZ;
  // Profils arrondis extrudés une seule fois (Z ∈ [-0,5, 0,5]) puis étirés par scale.z = cabinLength :
  // évite de ré-extruder 4 RoundedBox sur le thread principal à chaque nouvelle rangée ajoutée au bus.
  const stretchGeos = useMemo(() => ({
    upperSide: createExtrudedRoundedProfile(0.08, 0.45, 0.035),
    roofMain: createExtrudedRoundedProfile(2.68, 0.22, 0.1),
    roofCap: createExtrudedRoundedProfile(2.3, 0.12, 0.05),
    unitBox: new THREE.BoxGeometry(1, 1, 1),
    unitPlane: new THREE.PlaneGeometry(1, 1),
  }), []);
  useEffect(() => () => {
    stretchGeos.upperSide.dispose();
    stretchGeos.roofMain.dispose();
    stretchGeos.roofCap.dispose();
    stretchGeos.unitBox.dispose();
    stretchGeos.unitPlane.dispose();
  }, [stretchGeos]);

  const wheelZs = useMemo(
    () => [...new Set(wheelPositions.map(([, z]) => z))].sort((a, b) => a - b),
    [wheelPositions],
  );
  const panelOriginZ = Math.round(focusZ / 160) * 160;
  const sidePanels = useMemo(() => {
    return [-1, 1].map((side) => {
      const pieces = splitAtDoors(hullStartZ, spanEndZ, doors, side > 0).map(([from, to]) => {
        const len = to - from;
        const center = (from + to) / 2;
        const localCenter = center - panelOriginZ;
        const localWheelZs = wheelZs.filter((z) => z + WHEEL_ARCH_RADIUS > from && z - WHEEL_ARCH_RADIUS < to).map((z) => z - center);
        if (localWheelZs.length > 0) {
          return createLowerBodyGeometry(len, localWheelZs).translate(0, 0, localCenter);
        }
        return getPlainSidePanelTemplate(len).clone().translate(0, 0, localCenter);
      });
      const geometry = mergeGeometries(pieces, false)!;
      pieces.forEach((piece) => piece.dispose());
      return { side, geometry };
    });
  }, [hullStartZ, spanEndZ, wheelZs, doors, panelOriginZ]);
  useEffect(() => () => sidePanels.forEach(({ geometry }) => geometry.dispose()), [sidePanels]);
  const leftOuterFloorSpans = useMemo(
    () => splitAtWheels([[hullStartZ, spanEndZ]], wheelZs),
    [hullStartZ, spanEndZ, wheelZs],
  );
  const rightOuterFloorSpans = useMemo(
    () => splitAtWheels(splitAtDoors(hullStartZ, spanEndZ, doors), wheelZs),
    [hullStartZ, spanEndZ, doors, wheelZs],
  );

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
            <mesh key={sx} name={`bus-body-side-${sx}-${BUS_FRONT_Z}`} geometry={geometry} material={mats.body} castShadow position={[sx * 1.3, 0, panelOriginZ]} />
          )}
          {/* Panneau latéral haut extensible */}
          <mesh geometry={stretchGeos.upperSide} material={mats.body} castShadow position={[sx * 1.3, 2.975, cabinCenterZ]} scale={[1, 1, cabinLength]} dispose={null} />
          <BusSpanMeshes spans={splitAtDoors(hullStartZ, spanEndZ, doors, sx > 0)} material={mats.windowGlass} x={sx * 1.3} y={2.25} width={0} height={1} planeSide={sx} />
          <BusSpanMeshes spans={splitAtDoors(hullStartZ, spanEndZ, doors, sx > 0)} material={mats.yellow} x={sx * 1.356} y={1.72} width={0.024} height={0.08} />

        </group>
      ))}

      <BusGraffiti doors={doors} rearWallZ={rearWallZ} wheelPositions={wheelPositions} />

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
      <group ref={leftWiper} position={[-0.5, 1.79, -4.62]} rotation={[0, 0, WIPER_PARK_ANGLE]}>
        <mesh material={mats.dark} position={[0, 0.22, 0]}>
          <boxGeometry args={[0.035, 0.44, 0.02]} />
        </mesh>
      </group>
      <group ref={rightWiper} position={[0.5, 1.79, -4.62]} rotation={[0, 0, WIPER_PARK_ANGLE]}>
        <mesh material={mats.dark} position={[0, 0.22, 0]}>
          <boxGeometry args={[0.035, 0.44, 0.02]} />
        </mesh>
      </group>
      {/* Girouette de destination lumineuse */}
      <BusDestination mats={mats} reducedMotion={reducedMotion} />
      <BusDoors doors={doors} totalDoorCount={totalDoorCount} numRows={numRows} focusZ={focusZ} lowPower={lowPower} mats={mats} phase={phase} journey={journey} reducedMotion={reducedMotion} />

      {/* ---------- Face arrière dynamique (se recule avec la longueur) ---------- */}
      <group name="bus-rear-face" position={[0, 0, rearWallZ]}>
        <RoundedBox args={[2.6, 1.25, 0.08]} radius={0.035} smoothness={2} bevelSegments={3} material={mats.body} castShadow position={[0, 1.125, 0]} />
        <RoundedBox args={[2.6, 0.45, 0.08]} radius={0.035} smoothness={2} bevelSegments={3} material={mats.body} castShadow position={[0, 2.975, 0]} />
        {/* Habillage intérieur du mur arrière (bas et bandeau haut) */}
        <mesh material={mats.interiorWall} position={[0, 1.19, -0.045]}>
          <boxGeometry args={[2.42, 1.1, 0.01]} />
        </mesh>
        <mesh material={mats.interiorWall} position={[0, 2.98, -0.045]}>
          <boxGeometry args={[2.42, 0.38, 0.01]} />
        </mesh>
        {[-1.255, 1.255].map((x) => <mesh key={x} material={mats.bodyDark} castShadow position={[x, 1.875, 0.02]}>
          <boxGeometry args={[0.09, 2.75, 0.12]} />
        </mesh>)}
        <mesh material={mats.windowGlass} position={[0, 2.25, 0]} raycast={() => null}>
          <planeGeometry args={[2.56, 1.04]} />
        </mesh>
        <RoundedBox args={[2.7, 0.28, 0.25]} radius={0.1} smoothness={2} bevelSegments={3} material={mats.chrome} castShadow position={[0, 0.65, 0.1]} />
        {/* Support et plaque d'immatriculation arrière plaquée sur le pare-chocs */}
        <mesh material={mats.dark} position={[0, 0.65, 0.206]}>
          <boxGeometry args={[0.66, 0.21, 0.048]} />
        </mesh>
        <mesh position={[0, 0.65, 0.234]}>
          <planeGeometry args={[0.64, 0.2]} />
          <meshStandardMaterial map={licensePlateTex} roughness={0.3} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
        </mesh>
        {/* Support opaque fin et affiche à l'arrière du bus */}
        <mesh material={mats.bodyDark} position={[0, 2.3, 0.025]}>
          <boxGeometry args={[1.84, 0.42, 0.014]} />
        </mesh>
        <mesh position={[0, 2.3, 0.036]}>
          <planeGeometry args={[1.8, 0.38]} />
          <meshStandardMaterial map={sideLabel} roughness={0.3} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
        </mesh>
      </group>

      {/* ---------- Toit et plancher extensibles ---------- */}
      <mesh geometry={stretchGeos.roofMain} material={mats.body} castShadow position={[0, 3.26, (roofMainStartZ + roofMainEndZ) / 2]} scale={[1, 1, roofMainEndZ - roofMainStartZ]} dispose={null} />
      <mesh geometry={stretchGeos.roofCap} material={mats.bodyDark} castShadow position={[0, 3.36, (roofCapStartZ + roofCapEndZ) / 2]} scale={[1, 1, Math.max(0.5, roofCapEndZ - roofCapStartZ)]} dispose={null} />
      {/* Plancher et châssis découpés aux passages de roue et au puits des marches. */}
      <mesh geometry={stretchGeos.unitBox} material={mats.floor} castShadow position={[-0.37, 0.6, cabinCenterZ]} scale={[1.54, 0.08, cabinLength]} dispose={null} />
      <mesh geometry={stretchGeos.unitBox} material={mats.dark} castShadow position={[-0.37, 0.4, (chassisStartZ + spanEndZ) / 2]} scale={[1.54, 0.3, spanEndZ - chassisStartZ]} dispose={null} />
      <BusSpanMeshes spans={splitAtDoors(hullStartZ, spanEndZ, doors)} material={mats.floor} x={(BUS_DOOR.innerX + 1.14) / 2} y={0.6} width={1.14 - BUS_DOOR.innerX} height={0.08} castShadow />
      <BusSpanMeshes spans={leftOuterFloorSpans} material={mats.floor} x={-1.22} y={0.6} width={0.16} height={0.08} castShadow />
      <BusSpanMeshes spans={rightOuterFloorSpans} material={mats.floor} x={1.22} y={0.6} width={0.16} height={0.08} castShadow />
      <BusSpanMeshes spans={splitAtDoors(chassisStartZ, spanEndZ, doors)} material={mats.dark} x={0.77} y={0.4} width={0.74} height={0.3} castShadow />

      {/* Ombre de contact au sol sous le bus : ancre solidement le bus au sol */}
      <mesh
        geometry={stretchGeos.unitPlane}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.036, (shadowStartZ + shadowEndZ) / 2]}
        scale={[3.2, shadowEndZ - shadowStartZ, 1]}
        renderOrder={1}
        dispose={null}
      >
        <meshBasicMaterial
          map={contactShadowTex}
          transparent
          opacity={0.88}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
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

      <BusCoachDetails mats={mats} cabinLength={cabinLength} cabinCenterZ={cabinCenterZ} hullStartZ={hullStartZ} hullEndZ={spanEndZ} rearWallZ={rearWallZ} wheelPositions={wheelPositions} doors={doors} />
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
});

export default BusExterior;

export const PillarInstances = memo(function PillarInstances({ positions, doors, material }: { positions: number[]; doors: BusDoorLayout[]; material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const capacity = Math.max(448, Math.ceil((positions.length * 2) / 128) * 128);
  const originZ = positions.length > 0 ? positions[Math.floor(positions.length / 2)] : 0;
  useLayoutEffect(() => {
    if (!ref.current) return;
    const matrix = new THREE.Matrix4();
    let index = 0;
    for (const x of [-1.3, 1.3]) {
      for (const z of positions) {
        if (x > 0 && !isWindowPillarClearOfDoor(z, doors)) continue;
        if (index >= capacity) break;
        matrix.makeTranslation(x, 2.255, z - originZ);
        ref.current.setMatrixAt(index++, matrix);
      }
    }
    ref.current.count = index;
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [capacity, positions, doors, originZ]);
  return (
    <instancedMesh key={`pillars-${capacity}`} ref={ref} position={[0, 0, originZ]} args={[undefined, undefined, capacity]} material={material} raycast={() => null}>
      <boxGeometry args={[0.08, 1.01, 0.1]} />
    </instancedMesh>
  );
});
