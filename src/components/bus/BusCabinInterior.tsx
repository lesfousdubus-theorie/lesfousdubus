"use client";

import { memo, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BUS_FRONT_Z, SEAT_CUSHION_DEPTH, SEAT_CUSHION_Z, SEAT_BASE_DEPTH, getSeatCountInRow, getSeatRowZ, type BusDoorLayout, type TvPosition } from "@/lib/bus-layout";
import { getInteriorRailSpans, INTERIOR_RAIL_X, INTERIOR_RAIL_DEPTH } from "@/lib/bus-interior-geometry";
import BusCabinDetails from "./BusCabinDetails";
import BusSpanMeshes from "./BusSpanMeshes";
import type { BusMaterials } from "./useBusResources";

interface Props {
  mats: BusMaterials;
  cabinLength: number;
  cabinCenterZ: number;
  rearWallZ: number;
  rows: number[];
  wheelPositions: [number, number][];
  tvPositions: TvPosition[];
  doors: BusDoorLayout[];
}

/** Cabin fixtures stay in the vehicle's existing coordinate system: no wrapper group. */
const BusCabinInterior = memo(function BusCabinInterior({ mats, cabinLength, cabinCenterZ, rearWallZ, rows,
  wheelPositions, tvPositions, doors }: Props) {
  const rowZs = useMemo(() => rows.map(getSeatRowZ), [rows]);
  const leftRailSpans = useMemo(() => getInteriorRailSpans(BUS_FRONT_Z + 0.05, rearWallZ - 0.05, false, doors), [rearWallZ, doors]);
  const rightRailSpans = useMemo(() => getInteriorRailSpans(BUS_FRONT_Z + 0.05, rearWallZ - 0.05, true, doors), [rearWallZ, doors]);
  return <>
      {/* ---------- INTÉRIEUR DU BUS ---------- */}
      <BusCabinDetails mats={mats} cabinLength={cabinLength} cabinCenterZ={cabinCenterZ} rearWallZ={rearWallZ} rowZs={rowZs} wheelPositions={wheelPositions} tvPositions={tvPositions} />
      {/* Habillage intérieur du toit extensible */}
      <mesh material={mats.interiorWall} position={[0, 3.15, cabinCenterZ]}>
        <boxGeometry args={[2.5, 0.02, cabinLength - 0.1]} />
      </mesh>

      {/* Bandeaux intérieurs continus : ils habillent proprement le raccord entre
          le plafond et les vitres, sans faces bleues superposées ni interstices. */}
      {[-1, 1].map((sx) => {
        const railSpans = sx > 0 ? rightRailSpans : leftRailSpans;
        return (
        <group key={`window-headliner-${sx}`}>
          <mesh material={mats.interiorWall} position={[sx * 1.248, 2.98, cabinCenterZ]}>
            <boxGeometry args={[0.012, 0.4, cabinLength - 0.12]} />
          </mesh>
          <BusSpanMeshes spans={railSpans} name="bus-interior-window-top-rail" material={mats.bodyDark} x={sx * INTERIOR_RAIL_X} y={2.74} width={INTERIOR_RAIL_DEPTH} height={0.072} />
          <BusSpanMeshes spans={railSpans} name="bus-interior-window-bottom-rail" material={mats.bodyDark} x={sx * INTERIOR_RAIL_X} y={1.74} width={INTERIOR_RAIL_DEPTH} height={0.072} />
        </group>
        );
      })}

      {/* Néons de plafond lumineux continus */}
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} material={mats.ceilingLight} position={[x, 3.13, cabinCenterZ]}>
          <boxGeometry args={[0.14, 0.03, cabinLength - 1.4]} />
        </mesh>
      ))}

      {/* Les sièges gardent leur quantité exacte mais partagent quatre draw calls. */}
      <SeatInstances rows={rows} seatMaterial={mats.seat} frameMaterial={mats.seatFrame} />

  </>;
});

export default BusCabinInterior;

function SeatInstances({
  rows,
  seatMaterial,
  frameMaterial,
}: {
  rows: number[];
  seatMaterial: THREE.Material;
  frameMaterial: THREE.Material;
}) {
  const cushion = useRef<THREE.InstancedMesh>(null);
  const back = useRef<THREE.InstancedMesh>(null);
  const base = useRef<THREE.InstancedMesh>(null);
  const headrest = useRef<THREE.InstancedMesh>(null);
  const benches = useMemo(() => rows.flatMap(row => {
    const z = getSeatRowZ(row);
    return getSeatCountInRow(row) === 2 ? [[-0.72, z]] : [[-0.72, z], [0.72, z]];
  }), [rows]);
  useLayoutEffect(() => {
    const refs = [cushion, back, base, headrest];
    const offsets = [[1.05, SEAT_CUSHION_Z], [1.38, 0.33], [0.82, SEAT_CUSHION_Z], [1.7, 0.33]];
    const matrix = new THREE.Matrix4();
    refs.forEach((meshRef, part) => {
      if (!meshRef.current) return;
      benches.forEach(([x, z], index) => {
        matrix.makeTranslation(x, offsets[part][0], z + offsets[part][1]);
        meshRef.current!.setMatrixAt(index, matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      // Le bus peut s'allonger : les bornes de visibilité doivent suivre les instances.
      meshRef.current.computeBoundingSphere();
    });
  }, [benches]);
  const count = benches.length;
  // Taille fixe : l'ajout d'une rangée ne recrée pas les quatre buffers GPU.
  const capacity = 180 * 2;
  return (
    <>
      <instancedMesh name="bus-seat-cushions" ref={cushion} args={[undefined, undefined, capacity]} count={count} material={seatMaterial} castShadow>
        <boxGeometry args={[0.95, 0.15, SEAT_CUSHION_DEPTH]} />
      </instancedMesh>
      <instancedMesh ref={back} args={[undefined, undefined, capacity]} count={count} material={seatMaterial} castShadow>
        <boxGeometry args={[0.95, 0.58, 0.12]} />
      </instancedMesh>
      <instancedMesh ref={base} args={[undefined, undefined, capacity]} count={count} material={frameMaterial}>
        <boxGeometry args={[0.85, 0.36, SEAT_BASE_DEPTH]} />
      </instancedMesh>
      <instancedMesh ref={headrest} args={[undefined, undefined, capacity]} count={count} material={frameMaterial}>
        <boxGeometry args={[0.95, 0.05, 0.08]} />
      </instancedMesh>
    </>
  );
}
