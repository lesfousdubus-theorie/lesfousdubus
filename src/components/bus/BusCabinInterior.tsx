"use client";

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { BUS_FRONT_Z, SEAT_CUSHION_DEPTH, SEAT_CUSHION_Z, SEAT_BASE_DEPTH, getSeatCountInRow, getSeatRowZ, type BusDoorLayout, type TvPosition } from "@/lib/bus-layout";
import { getInteriorRailSpans, INTERIOR_RAIL_X, INTERIOR_RAIL_DEPTH } from "@/lib/bus-interior-geometry";
import BusCabinDetails from "./BusCabinDetails";
import BusSpanMeshes from "./BusSpanMeshes";
import type { BusMaterials } from "./useBusResources";
import type { WorldState } from "./constants";

RectAreaLightUniformsLib.init();

interface Props {
  mats: BusMaterials;
  cabinLength: number;
  cabinCenterZ: number;
  rearWallZ: number;
  rows: number[];
  wheelPositions: [number, number][];
  tvPositions: TvPosition[];
  doors: BusDoorLayout[];
  worldRef: RefObject<WorldState>;
}

/** Cabin fixtures stay in the vehicle's existing coordinate system: no wrapper group. */
export default function BusCabinInterior({ mats, cabinLength, cabinCenterZ, rearWallZ, rows,
  wheelPositions, tvPositions, doors, worldRef }: Props) {
  const rowZs = useMemo(() => rows.map(getSeatRowZ), [rows]);
  const ceilingLight = useRef<THREE.RectAreaLight>(null);
  useFrame(() => {
    if (ceilingLight.current) ceilingLight.current.intensity = THREE.MathUtils.lerp(2.15, 0.85, worldRef.current.daylight);
  });
  return <>
      {/* ---------- INTÉRIEUR DU BUS ---------- */}
      <BusCabinDetails mats={mats} cabinLength={cabinLength} cabinCenterZ={cabinCenterZ} rearWallZ={rearWallZ} rowZs={rowZs} wheelPositions={wheelPositions} tvPositions={tvPositions} />
      {/* Habillage intérieur du toit extensible */}
      <mesh material={mats.interiorWall} position={[0, 3.15, cabinCenterZ]}>
        <boxGeometry args={[2.5, 0.02, cabinLength - 0.1]} />
      </mesh>

      {/* Bandeaux intérieurs continus : ils habillent proprement le raccord entre
          le plafond et les vitres, sans faces bleues superposées ni interstices. */}
      {[-1, 1].map((sx) => (
        <group key={`window-headliner-${sx}`}>
          <mesh material={mats.interiorWall} position={[sx * 1.248, 2.98, cabinCenterZ]}>
            <boxGeometry args={[0.012, 0.4, cabinLength - 0.12]} />
          </mesh>
          <BusSpanMeshes spans={getInteriorRailSpans(BUS_FRONT_Z + 0.05, rearWallZ - 0.05, sx > 0, doors)} name="bus-interior-window-top-rail" material={mats.bodyDark} x={sx * INTERIOR_RAIL_X} y={2.74} width={INTERIOR_RAIL_DEPTH} height={0.072} />
          <BusSpanMeshes spans={getInteriorRailSpans(BUS_FRONT_Z + 0.05, rearWallZ - 0.05, sx > 0, doors)} name="bus-interior-window-bottom-rail" material={mats.bodyDark} x={sx * INTERIOR_RAIL_X} y={1.74} width={INTERIOR_RAIL_DEPTH} height={0.072} />
        </group>
      ))}

      {/* Néons de plafond lumineux continus */}
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} material={mats.ceilingLight} position={[x, 3.13, cabinCenterZ]}>
          <boxGeometry args={[0.14, 0.03, cabinLength - 1.4]} />
        </mesh>
      ))}

      {/* Toute la rampe diffuse vers le bas, sans sources ponctuelles au-dessus des essieux. */}
      <rectAreaLight ref={ceilingLight} name="bus-cabin-ceiling-light" position={[0, 3.1, cabinCenterZ]}
        rotation={[-Math.PI / 2, 0, 0]} color="#fff4db" intensity={0.85} width={1.14} height={cabinLength - 0.12} />

      {/* Les sièges gardent leur quantité exacte mais partagent quatre draw calls. */}
      <SeatInstances rows={rows} seatMaterial={mats.seat} frameMaterial={mats.seatFrame} />

  </>;
}

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
