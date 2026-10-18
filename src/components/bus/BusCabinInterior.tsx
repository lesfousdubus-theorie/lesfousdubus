"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { BUS_FRONT_Z, SEAT_CUSHION_DEPTH, SEAT_CUSHION_Z, SEAT_BASE_DEPTH, type BusDoorLayout, type TvPosition } from "@/lib/bus-layout";
import { getInteriorRailSpans, INTERIOR_RAIL_X, INTERIOR_RAIL_DEPTH } from "@/lib/bus-interior-geometry";
import BusCabinDetails from "./BusCabinDetails";
import BusSpanMeshes from "./BusSpanMeshes";
import type { BusMaterials } from "./useBusResources";

interface Props {
  mats: BusMaterials;
  cabinLength: number;
  cabinCenterZ: number;
  rearWallZ: number;
  rowZs: number[];
  wheelPositions: [number, number][];
  tvPositions: TvPosition[];
  doors: BusDoorLayout[];
  interiorLightZs: number[];
  interiorLights: RefObject<THREE.PointLight[]>;
}

/** Cabin fixtures stay in the vehicle's existing coordinate system: no wrapper group. */
export default function BusCabinInterior({ mats, cabinLength, cabinCenterZ, rearWallZ, rowZs: SEAT_ROWS,
  wheelPositions, tvPositions, doors, interiorLightZs, interiorLights }: Props) {
  return <>
      {/* ---------- INTÉRIEUR DU BUS ---------- */}
      <BusCabinDetails mats={mats} cabinLength={cabinLength} cabinCenterZ={cabinCenterZ} rearWallZ={rearWallZ} rowZs={SEAT_ROWS} wheelPositions={wheelPositions} tvPositions={tvPositions} />
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

      {/* Éclairages intérieurs chauds et bien répartis le long du bus */}
      {interiorLightZs.map((lz, idx) => (
        <pointLight
          key={`interior-light-${idx}`}
          ref={(el: THREE.PointLight | null) => {
            if (el) interiorLights.current[idx] = el;
          }}
          position={[0, 2.85, lz]}
          color="#fff4db"
          intensity={4.5}
          distance={Math.max(9.5, cabinLength / 2)}
          decay={1.5}
        />
      ))}

      {/* Les sièges gardent leur quantité exacte mais partagent quatre draw calls. */}
      <SeatInstances rows={SEAT_ROWS} seatMaterial={mats.seat} frameMaterial={mats.seatFrame} />

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
  useLayoutEffect(() => {
    const refs = [cushion, back, base, headrest];
    const offsets = [[1.05, SEAT_CUSHION_Z], [1.38, 0.33], [0.82, SEAT_CUSHION_Z], [1.7, 0.33]];
    const matrix = new THREE.Matrix4();
    refs.forEach((meshRef, part) => {
      if (!meshRef.current) return;
      let index = 0;
      for (const z of rows) {
        for (const x of [-0.72, 0.72]) {
          matrix.makeTranslation(x, offsets[part][0], z + offsets[part][1]);
          meshRef.current.setMatrixAt(index++, matrix);
        }
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
      // Le bus peut s'allonger : les bornes de visibilité doivent suivre les instances.
      meshRef.current.computeBoundingSphere();
    });
  }, [rows]);
  const count = rows.length * 2;
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
