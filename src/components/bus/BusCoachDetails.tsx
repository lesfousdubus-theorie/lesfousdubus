"use client";

import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { BUS_FRONT_Z, getBusDoorBounds, splitAtDoors, type BusDoorLayout } from "@/lib/bus-layout";
import BusSpanMeshes from "./BusSpanMeshes";
import { WHEEL_ARCH_RADIUS, WHEEL_CENTER_Y } from "./BusBodyGeometry";

interface Props {
  mats: Record<string, THREE.Material>;
  cabinLength: number;
  cabinCenterZ: number;
  rearWallZ: number;
  wheelPositions: [number, number][];
  doors: BusDoorLayout[];
}

/** Équipements fixes : aucune lumière ou réflexion temps réel supplémentaire. */
export default function BusCoachDetails({ mats, rearWallZ, wheelPositions, doors }: Props) {
  const wheelZs = [...new Set(wheelPositions.map(([, z]) => z))].sort((a, b) => a - b);
  const lowerTrimRuns: [number, number][] = [];
  let start = -4.6;
  for (const z of wheelZs) {
    const end = Math.min(rearWallZ, z - WHEEL_ARCH_RADIUS - 0.04);
    if (end > start) lowerTrimRuns.push([start, end]);
    start = Math.max(start, z + WHEEL_ARCH_RADIUS + 0.04);
  }
  if (start < rearWallZ) lowerTrimRuns.push([start, rearWallZ]);

  return <group name="bus-coach-details">
    {[-1, 1].map((side) => <group key={side}>
      {/* Joints en caoutchouc continus autour des baies vitrées. */}
      {[1.77, 2.73].map(y => <BusSpanMeshes key={y} spans={splitAtDoors(BUS_FRONT_Z, rearWallZ, doors, side > 0)} material={mats.dark} x={side * 1.325} y={y} width={0.025} height={0.045} />)}
      <BusSpanMeshes spans={lowerTrimRuns.flatMap(([from, to]) => splitAtDoors(from, to, doors, side > 0))} material={mats.yellow} x={side * 1.35} y={0.57} width={0.024} height={0.07} />
      {wheelZs.map((z) => <group key={z} position={[side * 1.36, WHEEL_CENTER_Y, z]}>
        <mesh material={mats.bodyDark} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[WHEEL_ARCH_RADIUS + 0.02, 0.035, 8, 28, Math.PI]} />
        </mesh>
        {/* Bavette derrière chaque roue, fixée à la carrosserie. */}
        {!(side > 0 && doors.some(door => { const { frontZ, rearZ } = getBusDoorBounds(door); const flapZ = z + WHEEL_ARCH_RADIUS + 0.06; return flapZ >= frontZ - 0.13 && flapZ <= rearZ + 0.13; })) && <mesh name={`bus-mudflap-${side}-${z}`} material={mats.tire} position={[-side * 0.08, -0.23, WHEEL_ARCH_RADIUS + 0.06]}>
          <boxGeometry args={[0.22, 0.36, 0.04]} />
        </mesh>}
      </group>)}
      {[-2.0, rearWallZ - 0.25].map((z) => <group key={z} position={[side * 1.355, 0.76, z]}>
        <RoundedBox args={[0.04, 0.11, 0.23]} radius={0.018} smoothness={1} bevelSegments={2} material={mats.dark} />
        <mesh material={mats.orange} position={[side * 0.025, 0, 0]}>
          <boxGeometry args={[0.014, 0.065, 0.17]} />
        </mesh>
      </group>)}
      {/* Petites ouïes sur les côtés du capot. */}
      {[-5.55, -5.3, -5.05].map((z) => <mesh key={z} material={mats.dark} position={[side * 1.207, 1.4, z]}>
        <boxGeometry args={[0.015, 0.045, 0.15]} />
      </mesh>)}
      <CoachMirror side={side} mats={mats} />
    </group>)}

    {/* Trappe de service et poignée, à l'écart des passages de roue. */}
    <group position={[-1.345, 1.04, rearWallZ - 0.4]}>
      <RoundedBox args={[0.022, 0.59, 0.56]} radius={0.009} smoothness={1} bevelSegments={2} material={mats.dark} />
      <mesh material={mats.bodyDark} position={[-0.013, 0, 0]}>
        <boxGeometry args={[0.015, 0.55, 0.52]} />
      </mesh>
      <mesh material={mats.chrome} position={[-0.025, 0.13, 0]}>
        <boxGeometry args={[0.02, 0.025, 0.12]} />
      </mesh>
    </group>

    {/* Ventilation moteur sous la baie arrière. */}
    <group position={[0, 1.34, rearWallZ + 0.06]}>
      <RoundedBox args={[1.18, 0.64, 0.035]} radius={0.016} smoothness={1} bevelSegments={2} material={mats.dark} />
      {[-0.21, -0.105, 0, 0.105, 0.21].map((y) => <mesh key={y} material={mats.bodyDark} position={[0, y, 0.022]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[1.07, 0.045, 0.025]} />
      </mesh>)}
    </group>
    {[-1.03, 1.03].map((x) => <group key={x} position={[x, 1.24, rearWallZ + 0.07]}>
      <RoundedBox args={[0.26, 0.62, 0.06]} radius={0.025} smoothness={1} bevelSegments={2} material={mats.dark} />
      {[mats.red, mats.orange, mats.chrome].map((material, index) => <mesh key={index} material={material} position={[0, 0.18 - index * 0.18, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.078, 0.078, 0.015, 16]} />
      </mesh>)}
    </group>)}
    {/* Capot de ventilation sur le pavillon arrière. */}
    <group position={[0, 3.51, rearWallZ - 0.8]}>
      <RoundedBox args={[1.25, 0.2, 0.92]} radius={0.075} smoothness={2} bevelSegments={2} material={mats.interiorWall} />
      {[-0.28, -0.14, 0, 0.14, 0.28].map((z) => <mesh key={z} material={mats.dark} position={[0, 0.107, z]}>
        <boxGeometry args={[0.89, 0.012, 0.055]} />
      </mesh>)}
    </group>
  </group>;
}

function CoachMirror({ side, mats }: { side: number; mats: Record<string, THREE.Material> }) {
  return <group position={[side * 1.63, 2.41, -4.3]}>
    <mesh material={mats.dark} position={[-side * 0.19, 0.15, -0.02]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.025, 0.025, 0.39, 10]} />
    </mesh>
    <mesh material={mats.dark} position={[0, 0.1, -0.025]}>
      <cylinderGeometry args={[0.025, 0.025, 0.17, 10]} />
    </mesh>
    <RoundedBox args={[0.22, 0.53, 0.17]} radius={0.06} smoothness={2} bevelSegments={2} material={mats.dark} />
    <RoundedBox args={[0.17, 0.32, 0.025]} radius={0.01} smoothness={2} bevelSegments={2} material={mats.chrome} position={[0, 0.07, 0.087]} />
    <RoundedBox args={[0.17, 0.12, 0.025]} radius={0.01} smoothness={2} bevelSegments={2} material={mats.chrome} position={[0, -0.17, 0.087]} />
  </group>;
}
