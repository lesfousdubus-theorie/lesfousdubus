"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { makeLabelTexture } from "@/lib/textures";
import { ENTRY_SEAT_POSITION, SEAT_CUSHION_DEPTH, SEAT_CUSHION_Z, SEAT_BASE_DEPTH, type TvPosition } from "@/lib/bus-layout";
import { CABIN_CEILING_Y, GRAB_HANDLE_X, GRAB_RAIL_BRIDGE_Y, GRAB_RAIL_Y, getGrabRailBridgeSpans, getGrabRailSpans, isGrabHandleClearOfTv } from "@/lib/bus-interior-geometry";
import { CharacterPart } from "./CharacterShapes";

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

export default function BusCabinDetails({ mats, cabinLength, cabinCenterZ, rearWallZ, rowZs, wheelPositions, tvPositions }: Props) {
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
      {/* Porte-bagages au-dessus des fenêtres, sans empiéter sur l'allée. */}
      <mesh material={mats.interiorWall} position={[side * 1.055, 2.88, cabinCenterZ + 0.2]}>
        <boxGeometry args={[0.32, 0.025, cabinLength - 1.1]} />
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
      {detailZs.map((z) => <group key={z}>
        <mesh material={mats.chrome} position={[side * 1.055, 2.96, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.014, 0.014, 0.32, 8]} />
        </mesh>
        {/* Chaque écran garde son espace libre, y compris les rappels arrière. */}
        {isGrabHandleClearOfTv(z, tvPositions) && <group name="bus-grab-handle" userData={{ z, side }}>
          <mesh material={mats.dark} position={[side * GRAB_HANDLE_X, 2.82, z]}>
            <boxGeometry args={[0.027, 0.16, 0.027]} />
          </mesh>
          <mesh name="bus-grab-handle-ring" material={mats.yellow} position={[side * GRAB_HANDLE_X, 2.67, z]} scale={[1, 0.85, 1]}>
            <torusGeometry args={[0.09, 0.015, 6, 16]} />
          </mesh>
        </group>}
      </group>)}
    </group>)}
    {/* Les passages de roue sont fermés côté cabine, sous les fenêtres. */}
    {wheelPositions.map(([x, z], index) => <mesh key={`wheelhouse-${index}`} material={mats.dark} position={[Math.sign(x) * 1.25, 0.55, z]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.66, 0.66, 0.025, 24, 1, false, 0, Math.PI]} />
    </mesh>)}
    <mesh position={[0, 2.98, rearWallZ - 0.055]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[1.14, 0.21]} />
      <meshBasicMaterial map={exitTexture} />
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
}
