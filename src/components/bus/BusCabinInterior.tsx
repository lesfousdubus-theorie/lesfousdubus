"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
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
  hullStartZ?: number;
  hullEndZ?: number;
  rearWallZ: number;
  rows: number[];
  wheelPositions: [number, number][];
  tvPositions: TvPosition[];
  doors: BusDoorLayout[];
}

/** Cabin fixtures stay in the vehicle's existing coordinate system: no wrapper group. */
const BusCabinInterior = memo(function BusCabinInterior({ mats, cabinLength, cabinCenterZ, hullStartZ = BUS_FRONT_Z, hullEndZ, rearWallZ, rows,
  wheelPositions, tvPositions, doors }: Props) {
  const spanEndZ = hullEndZ ?? rearWallZ;
  const startsAtFront = hullStartZ <= BUS_FRONT_Z + 0.01;
  const endsAtRear = spanEndZ >= rearWallZ - 0.01;
  const railStartZ = startsAtFront ? hullStartZ + 0.05 : hullStartZ;
  const railEndZ = endsAtRear ? spanEndZ - 0.05 : spanEndZ;
  const neonStartZ = startsAtFront ? hullStartZ + 0.7 : hullStartZ;
  const neonEndZ = endsAtRear ? spanEndZ - 0.7 : spanEndZ;
  const unitBoxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useEffect(() => () => unitBoxGeo.dispose(), [unitBoxGeo]);
  const rowZs = useMemo(() => rows.map(getSeatRowZ), [rows]);
  const leftRailSpans = useMemo(() => getInteriorRailSpans(railStartZ, railEndZ, false, doors), [railStartZ, railEndZ, doors]);
  const rightRailSpans = useMemo(() => getInteriorRailSpans(railStartZ, railEndZ, true, doors), [railStartZ, railEndZ, doors]);
  return <>
      {/* ---------- INTÉRIEUR DU BUS ---------- */}
      <BusCabinDetails mats={mats} cabinLength={cabinLength} cabinCenterZ={cabinCenterZ} hullStartZ={hullStartZ} hullEndZ={spanEndZ} rearWallZ={rearWallZ} rowZs={rowZs} wheelPositions={wheelPositions} tvPositions={tvPositions} />
      {/* Habillage intérieur du toit extensible (abaissé de 14 mm sous la face inférieure du toit à y=3,15 pour zéro Z-fighting) */}
      <mesh geometry={unitBoxGeo} material={mats.interiorWall} position={[0, 3.136, (railStartZ + railEndZ) / 2]} scale={[2.5, 0.02, Math.max(0.5, railEndZ - railStartZ)]} dispose={null} />

      {/* Bandeaux intérieurs continus : ils habillent proprement le raccord entre
          le plafond et les vitres, sans faces bleues superposées ni interstices. */}
      {[-1, 1].map((sx) => {
        const railSpans = sx > 0 ? rightRailSpans : leftRailSpans;
        return (
        <group key={`window-headliner-${sx}`}>
          <mesh geometry={unitBoxGeo} material={mats.interiorWall} position={[sx * 1.248, 2.98, (railStartZ + railEndZ) / 2]} scale={[0.012, 0.4, Math.max(0.5, railEndZ - railStartZ - 0.02)]} dispose={null} />
          <BusSpanMeshes spans={railSpans} name="bus-interior-window-top-rail" material={mats.bodyDark} x={sx * INTERIOR_RAIL_X} y={2.74} width={INTERIOR_RAIL_DEPTH} height={0.072} />
          <BusSpanMeshes spans={railSpans} name="bus-interior-window-bottom-rail" material={mats.bodyDark} x={sx * INTERIOR_RAIL_X} y={1.74} width={INTERIOR_RAIL_DEPTH} height={0.072} />
        </group>
        );
      })}

      {/* Néons de plafond lumineux continus */}
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} geometry={unitBoxGeo} material={mats.ceilingLight} position={[x, 3.116, (neonStartZ + neonEndZ) / 2]} scale={[0.14, 0.03, Math.max(0.5, neonEndZ - neonStartZ)]} dispose={null} />
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
  const originZ = benches.length > 0 ? benches[Math.floor(benches.length / 2)][1] : 0;
  useLayoutEffect(() => {
    const refs = [cushion, back, base, headrest];
    const offsets = [[1.05, SEAT_CUSHION_Z], [1.38, 0.33], [0.82, SEAT_CUSHION_Z], [1.7, 0.33]];
    const matrix = new THREE.Matrix4();
    refs.forEach((meshRef, part) => {
      if (!meshRef.current) return;
      benches.forEach(([x, z], index) => {
        matrix.makeTranslation(x, offsets[part][0], z - originZ + offsets[part][1]);
        meshRef.current!.setMatrixAt(index, matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      // Le bus peut s'allonger : les bornes de visibilité doivent suivre les instances.
      meshRef.current.computeBoundingSphere();
    });
  }, [benches, originZ]);
  const count = benches.length;
  // Capacité fixe large pour éviter toute recréation de buffer GPU lors du défilement caméra.
  const capacity = Math.max(384, Math.ceil(count / 128) * 128);
  return (
    <group position={[0, 0, originZ]}>
      <instancedMesh key={`sc-${capacity}`} name="bus-seat-cushions" ref={cushion} args={[undefined, undefined, capacity]} count={count} material={seatMaterial} raycast={() => null}>
        <boxGeometry args={[0.95, 0.15, SEAT_CUSHION_DEPTH]} />
      </instancedMesh>
      <instancedMesh key={`sb-${capacity}`} ref={back} args={[undefined, undefined, capacity]} count={count} material={seatMaterial} raycast={() => null}>
        <boxGeometry args={[0.95, 0.58, 0.12]} />
      </instancedMesh>
      <instancedMesh key={`sbase-${capacity}`} ref={base} args={[undefined, undefined, capacity]} count={count} material={frameMaterial} raycast={() => null}>
        <boxGeometry args={[0.85, 0.36, SEAT_BASE_DEPTH]} />
      </instancedMesh>
      <instancedMesh key={`sh-${capacity}`} ref={headrest} args={[undefined, undefined, capacity]} count={count} material={frameMaterial} raycast={() => null}>
        <boxGeometry args={[0.95, 0.05, 0.08]} />
      </instancedMesh>
    </group>
  );
}
