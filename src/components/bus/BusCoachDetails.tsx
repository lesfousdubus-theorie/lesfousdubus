"use client";

import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { BUS_FRONT_Z, getBusDoorBounds, splitAtDoors, type BusDoorLayout } from "@/lib/bus-layout";
import BusSpanMeshes from "./BusSpanMeshes";
import StaticMeshBatch from "./StaticMeshBatch";
import { WHEEL_ARCH_RADIUS, WHEEL_CENTER_Y } from "./BusBodyGeometry";

interface Props {
  mats: Record<string, THREE.Material>;
  cabinLength: number;
  cabinCenterZ: number;
  hullStartZ?: number;
  hullEndZ?: number;
  rearWallZ: number;
  wheelPositions: [number, number][];
  doors: BusDoorLayout[];
}

/** Équipements fixes : aucune lumière ou réflexion temps réel supplémentaire. */
const BusCoachDetails = memo(function BusCoachDetails({ mats, hullStartZ = BUS_FRONT_Z, hullEndZ, rearWallZ, wheelPositions, doors }: Props) {
  const spanEndZ = hullEndZ ?? rearWallZ;
  const wheelZs = useMemo(
    () => [...new Set(wheelPositions.map(([, z]) => z))].sort((a, b) => a - b),
    [wheelPositions],
  );
  const rearAxle = wheelZs[wheelZs.length - 1] ?? -4.3;
  const showServiceHatch = rearWallZ - rearAxle >= 1.45;
  const lowerTrimRuns = useMemo(() => {
    const runs: [number, number][] = [];
    let start = Math.max(-4.6, hullStartZ);
    for (const z of wheelZs) {
      const end = Math.min(spanEndZ, z - WHEEL_ARCH_RADIUS - 0.04);
      if (end > start) runs.push([start, end]);
      start = Math.max(start, z + WHEEL_ARCH_RADIUS + 0.04);
    }
    if (start < spanEndZ) runs.push([start, spanEndZ]);
    return runs;
  }, [hullStartZ, spanEndZ, wheelZs]);

  const wheelArchGeo = useMemo(
    () => new THREE.TorusGeometry(WHEEL_ARCH_RADIUS + 0.02, 0.035, 8, 28, Math.PI),
    [],
  );
  const mudflapGeo = useMemo(() => new THREE.BoxGeometry(0.22, 0.36, 0.04), []);
  useEffect(() => () => {
    wheelArchGeo.dispose();
    mudflapGeo.dispose();
  }, [wheelArchGeo, mudflapGeo]);

  return <group name="bus-coach-details">
    {[-1, 1].map((side) => <group key={side}>
      {/* Joints en caoutchouc continus autour des baies vitrées. */}
      {[1.77, 2.73].map(y => <BusSpanMeshes key={y} spans={splitAtDoors(hullStartZ, spanEndZ, doors, side > 0)} material={mats.dark} x={side * 1.325} y={y} width={0.025} height={0.045} />)}
      <BusSpanMeshes spans={lowerTrimRuns.flatMap(([from, to]) => splitAtDoors(from, to, doors, side > 0))} material={mats.yellow} x={side * 1.35} y={0.57} width={0.024} height={0.07} />
      {wheelZs.map((z) => <group key={z} position={[side * 1.36, WHEEL_CENTER_Y, z]}>
        <mesh geometry={wheelArchGeo} material={mats.bodyDark} rotation={[0, Math.PI / 2, 0]} dispose={null} />
        {/* Bavette derrière chaque roue, fixée à la carrosserie. */}
        {!(side > 0 && doors.some(door => { const { frontZ, rearZ } = getBusDoorBounds(door); const flapZ = z + WHEEL_ARCH_RADIUS + 0.06; return flapZ >= frontZ - 0.13 && flapZ <= rearZ + 0.13; })) && (
          <mesh name={`bus-mudflap-${side}-${z}`} geometry={mudflapGeo} material={mats.tire} position={[-side * 0.08, -0.23, WHEEL_ARCH_RADIUS + 0.06]} dispose={null} />
        )}
      </group>)}
    </group>)}

    {/* Avant fixe (rétroviseurs, ouïes, feux de gabarit avant) : fusionné une seule fois pour toute la session. */}
    <StaticMeshBatch name="bus-coach-details-front" cacheKey="front">
      {[-1, 1].map((side) => <group key={side}>
        <group position={[side * 1.355, 0.76, -2.3]}>
          <RoundedBox args={[0.04, 0.11, 0.23]} radius={0.018} smoothness={1} bevelSegments={2} material={mats.dark} />
          <mesh material={mats.orange} position={[side * 0.025, 0, 0]}>
            <boxGeometry args={[0.014, 0.065, 0.17]} />
          </mesh>
        </group>
        {/* Petites ouïes sur les côtés du capot. */}
        {[-5.55, -5.3, -5.05].map((z) => <mesh key={z} material={mats.dark} position={[side * 1.207, 1.4, z]}>
          <boxGeometry args={[0.015, 0.045, 0.15]} />
        </mesh>)}
        <CoachMirror side={side} mats={mats} />
      </group>)}
    </StaticMeshBatch>

    {/* Arrière ancré en Z = rearWallZ : se déplace par translation sans jamais re-fusionner StaticMeshBatch. */}
    <group position={[0, 0, rearWallZ]}>
      <StaticMeshBatch name="bus-coach-details-rear" cacheKey={`rear:${showServiceHatch ? 1 : 0}`}>
        {[-1, 1].map((side) => <group key={side} position={[side * 1.355, 0.76, -0.25]}>
          <RoundedBox args={[0.04, 0.11, 0.23]} radius={0.018} smoothness={1} bevelSegments={2} material={mats.dark} />
          <mesh material={mats.orange} position={[side * 0.025, 0, 0]}>
            <boxGeometry args={[0.014, 0.065, 0.17]} />
          </mesh>
        </group>)}

        {/* Trappe de service et poignée, masquée si le passage de roue arrière s'en approche (cas 9k+1). */}
        {showServiceHatch && <group position={[-1.345, 1.04, -0.4]}>
          <RoundedBox args={[0.022, 0.59, 0.56]} radius={0.009} smoothness={1} bevelSegments={2} material={mats.dark} />
          <mesh material={mats.bodyDark} position={[-0.013, 0, 0]}>
            <boxGeometry args={[0.015, 0.55, 0.52]} />
          </mesh>
          <mesh material={mats.chrome} position={[-0.025, 0.13, 0]}>
            <boxGeometry args={[0.02, 0.025, 0.12]} />
          </mesh>
        </group>}

        {/* Ventilation moteur sous la baie arrière. */}
        <group position={[0, 1.34, 0.06]}>
          <RoundedBox args={[1.18, 0.64, 0.035]} radius={0.016} smoothness={1} bevelSegments={2} material={mats.dark} />
          {[-0.21, -0.105, 0, 0.105, 0.21].map((y) => <mesh key={y} material={mats.bodyDark} position={[0, y, 0.022]} rotation={[0.15, 0, 0]}>
            <boxGeometry args={[1.07, 0.045, 0.025]} />
          </mesh>)}
        </group>
        {[-1.03, 1.03].map((x) => <group key={x} position={[x, 1.24, 0.07]}>
          <RoundedBox args={[0.26, 0.62, 0.06]} radius={0.025} smoothness={1} bevelSegments={2} material={mats.dark} />
          {[mats.red, mats.orange, mats.chrome].map((material, index) => <mesh key={index} material={material} position={[0, 0.18 - index * 0.18, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.078, 0.078, 0.015, 16]} />
          </mesh>)}
        </group>)}
        {/* Capot de ventilation sur le pavillon arrière. */}
        <group position={[0, 3.51, -0.8]}>
          <RoundedBox args={[1.25, 0.2, 0.92]} radius={0.075} smoothness={2} bevelSegments={2} material={mats.interiorWall} />
          {[-0.28, -0.14, 0, 0.14, 0.28].map((z) => <mesh key={z} material={mats.dark} position={[0, 0.107, z]}>
            <boxGeometry args={[0.89, 0.012, 0.055]} />
          </mesh>)}
        </group>
      </StaticMeshBatch>
    </group>
  </group>;
});

export default BusCoachDetails;

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
