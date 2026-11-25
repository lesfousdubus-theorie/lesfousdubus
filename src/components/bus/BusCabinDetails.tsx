"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { makeLabelTexture } from "@/lib/textures";
import { BUS_FRONT_Z, ENTRY_SEAT_POSITION, SEAT_CUSHION_DEPTH, SEAT_CUSHION_Z, SEAT_BASE_DEPTH, type TvPosition } from "@/lib/bus-layout";
import { CABIN_CEILING_Y, GRAB_HANDLE_X, GRAB_RAIL_BRIDGE_Y, GRAB_RAIL_Y, getGrabRailBridgeSpans, getGrabRailSpans, isGrabHandleClearOfTv } from "@/lib/bus-interior-geometry";
import { WHEEL_ARCH_RADIUS, WHEEL_CENTER_Y } from "./BusBodyGeometry";
import { CharacterPart } from "./CharacterShapes";

const WHEELHOUSE_LAYERS: ReadonlyArray<{ xStart: number; xEnd: number; radius: number }> = [
  { xStart: 1.14, xEnd: 1.2, radius: 0.57 },
  { xStart: 1.2, xEnd: 1.235, radius: 0.59 },
  { xStart: 1.235, xEnd: 1.258, radius: 0.66 },
];

function createWheelhouseGeometry(wheelPositions: [number, number][], rearWallZ: number): THREE.BufferGeometry {
  const yBase = 0.56;
  const parts: THREE.BufferGeometry[] = [];
  for (const [x, z] of wheelPositions) {
    const side = Math.sign(x);
    const zMin = Math.max(BUS_FRONT_Z + 0.042, z - WHEEL_ARCH_RADIUS) - z;
    const zMax = Math.min(rearWallZ - 0.042, z + WHEEL_ARCH_RADIUS) - z;
    for (const { xStart, xEnd, radius } of WHEELHOUSE_LAYERS) {
      const halfChord = Math.sqrt(radius * radius - (yBase - WHEEL_CENTER_Y) ** 2);
      const left = Math.max(zMin, -halfChord);
      const right = Math.min(zMax, halfChord);
      if (right <= left) continue;
      const yLeft = WHEEL_CENTER_Y + Math.sqrt(Math.max(0, radius * radius - left * left));
      const startAngle = Math.acos(THREE.MathUtils.clamp(left / radius, -1, 1));
      const endAngle = Math.acos(THREE.MathUtils.clamp(right / radius, -1, 1));
      const shape = new THREE.Shape();
      shape.moveTo(left, yBase);
      if (yLeft > yBase + 1e-5) shape.lineTo(left, yLeft);
      shape.absarc(0, WHEEL_CENTER_Y, radius, startAngle, endAngle, true);
      shape.lineTo(right, yBase);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: xEnd - xStart, bevelEnabled: false, curveSegments: 24 });
      geo.rotateY(-Math.PI / 2);
      geo.translate(side > 0 ? xEnd : -xStart, 0, z);
      parts.push(geo);
    }
  }
  const merged = parts.length ? mergeGeometries(parts, false)! : new THREE.BufferGeometry();
  parts.forEach((part) => part.dispose());
  return merged;
}

interface Props {
  mats: Record<string, THREE.Material>;
  cabinLength: number;
  cabinCenterZ: number;
  rearWallZ: number;
  rowZs: number[];
  wheelPositions: [number, number][];
  tvPositions: TvPosition[];
}

type RailPoint = [number, number, number];
interface RailSegment { from: RailPoint; to: RailPoint; radius: number }

function makeGrabRailBridges(from: number, to: number, bridges: Array<[number, number]>) {
  const segments: RailSegment[] = [];
  const elbows: RailPoint[] = [];
  const supportZs = new Set([from, to]);
  for (const [start, end] of bridges) {
    segments.push({ from: [0, GRAB_RAIL_BRIDGE_Y, start], to: [0, GRAB_RAIL_BRIDGE_Y, end], radius: .022 });
    for (const z of [start, end]) {
      // Au bout de la cabine, le pont est directement fixé au plafond.
      if (z > from && z < to) {
        segments.push({ from: [0, GRAB_RAIL_Y, z], to: [0, GRAB_RAIL_BRIDGE_Y, z], radius: .022 });
        elbows.push([0, GRAB_RAIL_Y, z]);
      }
      elbows.push([0, GRAB_RAIL_BRIDGE_Y, z]);
      supportZs.add(z);
    }
  }
  for (const z of supportZs) {
    const y = bridges.some(([start, end]) => z >= start && z <= end) ? GRAB_RAIL_BRIDGE_Y : GRAB_RAIL_Y;
    segments.push({ from: [0, y, z], to: [0, CABIN_CEILING_Y, z], radius: .014 });
    if (y === GRAB_RAIL_Y) elbows.push([0, y, z]);
  }
  const axis = new THREE.Vector3(0, 1, 0);
  const parts: THREE.BufferGeometry[] = segments.map(({ from: start, to: end, radius }) => {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const geometry = new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 12);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(axis, b.clone().sub(a).normalize()));
    geometry.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return geometry;
  });
  for (const point of elbows) parts.push(new THREE.SphereGeometry(.022, 12, 8).translate(...point));
  for (const z of supportZs) parts.push(new THREE.BoxGeometry(.065, .012, .065).translate(0, CABIN_CEILING_Y, z));
  // Les groupes gardent la géométrie de chaque raccord vérifiable ; un seul
  // matériau permet néanmoins un seul appel de dessin par côté.
  const geometry = mergeGeometries(parts, true)!;
  parts.forEach(part => part.dispose());
  return { geometry, segments };
}

const BusCabinDetails = memo(function BusCabinDetails({ mats, cabinLength, cabinCenterZ, rearWallZ, rowZs, wheelPositions, tvPositions }: Props) {
  // Quantité plafonnée, même quand le bus accueille des centaines de rangées.
  const detailZs = useMemo(() => rowZs.filter((_, index) => index % Math.max(1, Math.ceil(rowZs.length / 10)) === 0).slice(0, 10), [rowZs]);
  const grabRailSpans = useMemo(() => getGrabRailSpans(
    cabinCenterZ + .4 - (cabinLength - 1.6) / 2,
    cabinCenterZ + .4 + (cabinLength - 1.6) / 2,
    tvPositions,
  ), [cabinCenterZ, cabinLength, tvPositions]);
  const grabRailBridges = useMemo(() => {
    const from = cabinCenterZ + .4 - (cabinLength - 1.6) / 2;
    const to = cabinCenterZ + .4 + (cabinLength - 1.6) / 2;
    return makeGrabRailBridges(from, to, getGrabRailBridgeSpans(from, to, tvPositions));
  }, [cabinCenterZ, cabinLength, tvPositions]);
  useEffect(() => () => grabRailBridges.geometry.dispose(), [grabRailBridges]);
  const wheelKey = wheelPositions.map(([x, z]) => `${x}:${z}`).join(",");
  const wheelhouseGeo = useMemo(() => {
    const parsed = wheelKey
      ? wheelKey.split(",").map((pair) => pair.split(":").map(Number) as [number, number])
      : [];
    return createWheelhouseGeometry(parsed, rearWallZ);
  }, [wheelKey, rearWallZ]);
  useEffect(() => () => wheelhouseGeo.dispose(), [wheelhouseGeo]);
  const exitTexture = useMemo(() => makeLabelTexture({ text: "ISSUE DE SECOURS", bg: "#087449", fg: "#ffffff", width: 512, height: 96, font: "bold 38px Arial, sans-serif" }), []);
  useEffect(() => () => exitTexture.dispose(), [exitTexture]);

  return <group name="bus-cabin-details">
    <group name="bus-entry-seat" position={ENTRY_SEAT_POSITION}>
      <CharacterPart material={mats.seatFrame} position={[0, 0.83, SEAT_CUSHION_Z]} size={[0.55, 0.38, SEAT_BASE_DEPTH]} />
      <CharacterPart name="bus-entry-seat-cushion" material={mats.seat} position={[0, 1.05, SEAT_CUSHION_Z]} size={[0.68, 0.15, SEAT_CUSHION_DEPTH]} radius={0.055} detail={2} />
      <CharacterPart material={mats.seat} position={[0, 1.43, 0.29]} size={[0.66, 0.72, 0.13]} radius={0.055} detail={2} />
      <CharacterPart material={mats.seat} position={[0, 1.8, 0.29]} size={[0.54, 0.14, 0.14]} radius={0.045} />
      {[-1, 1].map(side => <group key={side}>
        <CharacterPart material={mats.seatFrame} position={[side * 0.3, 1.17, 0.12]} size={[0.035, 0.25, 0.035]} />
        <CharacterPart material={mats.seat} position={[side * 0.3, 1.3, 0.025]} size={[0.075, 0.065, 0.46]} />
      </group>)}
    </group>
    {[-1, 1].map((side) => <group key={side}>
      {/* Porte-bagages au-dessus des fenêtres, prolongé jusqu'à la paroi. */}
      <mesh material={mats.interiorWall} position={[side * 1.07, 2.88, cabinCenterZ + 0.2]}>
        <boxGeometry args={[0.35, 0.025, cabinLength - 1.1]} />
      </mesh>
      <mesh material={mats.chrome} position={[side * 0.89, 2.94, cabinCenterZ + 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, cabinLength - 1.1, 8]} />
      </mesh>
      {/* Les barres remontent au-dessus des télés, avec de vrais raccords au plafond. */}
      {grabRailSpans.map(([start, end]) => <mesh key={start} name="bus-grab-rail" material={mats.yellow}
        position={[side * GRAB_HANDLE_X, GRAB_RAIL_Y, (start + end) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, end - start, 12]} />
      </mesh>)}
      <mesh name="bus-grab-rail-bridge" material={mats.yellow} geometry={grabRailBridges.geometry}
        position={[side * GRAB_HANDLE_X, 0, 0]} dispose={null}
        userData={{ side, segments: grabRailBridges.segments, ceilingY: CABIN_CEILING_Y }} />
    </group>)}
    <CabinCeilingFixtures detailZs={detailZs} tvPositions={tvPositions} mats={mats} />
    {/* Coffrages fermés des passages de roue couvrant |x| ∈ [1.14, 1.258] et y ∈ [0.56, 1.14+]. */}
    <mesh name="bus-wheelhouses" material={mats.dark} geometry={wheelhouseGeo} dispose={null} />
    <mesh position={[0, 2.98, rearWallZ - 0.055]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[1.14, 0.21]} />
      <meshBasicMaterial map={exitTexture} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
    </mesh>
    {/* Extincteur entre le navigateur et la première rangée. */}
    <group position={[-1.12, 1.02, -2.15]}>
      <mesh material={mats.dark}>
        <boxGeometry args={[0.04, 0.4, 0.17]} />
      </mesh>
      <mesh position={[0.04, 0, 0]}>
        <cylinderGeometry args={[0.073, 0.073, 0.35, 14]} />
        <meshStandardMaterial color="#d93633" roughness={0.55} />
      </mesh>
      <mesh material={mats.chrome} position={[0.04, 0.2, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 0.055, 10]} />
      </mesh>
      <mesh material={mats.dark} position={[0.04, 0.23, 0]}>
        <boxGeometry args={[0.14, 0.025, 0.035]} />
      </mesh>
      <mesh position={[0.09, 0, 0]}>
        <boxGeometry args={[0.009, 0.1, 0.09]} />
        <meshStandardMaterial color="#f5f0de" roughness={0.8} />
      </mesh>
    </group>
  </group>;
});

/** Regroupe les 80 supports de porte-bagages et poignées suspendues en 4 draw calls instanciés. */
const CabinCeilingFixtures = memo(function CabinCeilingFixtures({
  detailZs,
  tvPositions,
  mats,
}: {
  detailZs: number[];
  tvPositions: TvPosition[];
  mats: Record<string, THREE.Material>;
}) {
  const bracketsRef = useRef<THREE.InstancedMesh>(null);
  const stemsRef = useRef<THREE.InstancedMesh>(null);
  const strapsRef = useRef<THREE.InstancedMesh>(null);
  const ringsRef = useRef<THREE.InstancedMesh>(null);
  const maxItems = Math.max(1, detailZs.length * 2);

  useLayoutEffect(() => {
    const brackets = bracketsRef.current;
    const stems = stemsRef.current;
    const straps = strapsRef.current;
    const rings = ringsRef.current;
    if (!brackets || !stems || !straps || !rings) return;
    const dummy = new THREE.Object3D();
    let rackIdx = 0;
    let handleIdx = 0;
    for (const side of [-1, 1]) {
      for (let i = 0; i < detailZs.length; i++) {
        const z = detailZs[i];
        dummy.position.set(side * 1.0675, 2.865, z);
        dummy.rotation.set(0, 0, Math.PI / 2);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        brackets.setMatrixAt(rackIdx, dummy.matrix);

        dummy.position.set(side * 0.89, 3.005, z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        stems.setMatrixAt(rackIdx, dummy.matrix);
        rackIdx += 1;

        if (isGrabHandleClearOfTv(z, tvPositions)) {
          dummy.position.set(side * GRAB_HANDLE_X, 2.82, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          straps.setMatrixAt(handleIdx, dummy.matrix);

          dummy.position.set(side * GRAB_HANDLE_X, 2.67, z);
          dummy.scale.set(1, 0.85, 1);
          dummy.updateMatrix();
          rings.setMatrixAt(handleIdx, dummy.matrix);
          handleIdx += 1;
        }
      }
    }
    brackets.count = rackIdx;
    brackets.visible = rackIdx > 0;
    brackets.instanceMatrix.needsUpdate = true;
    brackets.computeBoundingSphere();

    stems.count = rackIdx;
    stems.visible = rackIdx > 0;
    stems.instanceMatrix.needsUpdate = true;
    stems.computeBoundingSphere();

    straps.count = handleIdx;
    straps.visible = handleIdx > 0;
    straps.instanceMatrix.needsUpdate = true;
    straps.computeBoundingSphere();

    rings.count = handleIdx;
    rings.visible = handleIdx > 0;
    rings.instanceMatrix.needsUpdate = true;
    rings.computeBoundingSphere();
  }, [detailZs, tvPositions]);

  return (
    <>
      <instancedMesh key={`brackets-${maxItems}`} ref={bracketsRef} args={[undefined, undefined, maxItems]} material={mats.chrome} raycast={() => null}>
        <cylinderGeometry args={[0.014, 0.014, 0.355, 8]} />
      </instancedMesh>
      <instancedMesh key={`stems-${maxItems}`} ref={stemsRef} args={[undefined, undefined, maxItems]} material={mats.chrome} raycast={() => null}>
        <cylinderGeometry args={[0.014, 0.014, 0.28, 8]} />
      </instancedMesh>
      <instancedMesh key={`straps-${maxItems}`} ref={strapsRef} name="bus-grab-handle" args={[undefined, undefined, maxItems]} material={mats.dark} raycast={() => null}>
        <boxGeometry args={[0.027, 0.16, 0.027]} />
      </instancedMesh>
      <instancedMesh key={`rings-${maxItems}`} ref={ringsRef} name="bus-grab-handle-ring" args={[undefined, undefined, maxItems]} material={mats.yellow} raycast={() => null}>
        <torusGeometry args={[0.09, 0.015, 6, 16]} />
      </instancedMesh>
    </>
  );
});

export default BusCabinDetails;
