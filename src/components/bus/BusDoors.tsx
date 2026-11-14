"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getNearestBusDoor, type BusDoorLayout } from "@/lib/bus-layout";
import type { JourneyState } from "@/lib/bus-journey";
import { DOOR_FRAME_X, DOOR_FRAME_THICKNESS, DOOR_JAMB_HALF_Z, DOOR_INNER_TRIM_X, DOOR_INNER_TRIM_DEPTH, DOOR_INNER_TRIM_HALF_Z } from "@/lib/bus-interior-geometry";
import type { Phase } from "./constants";
import BusDoor from "./BusDoor";

interface Props {
  doors: BusDoorLayout[];
  numRows: number;
  focusZ: number;
  mats: Record<string, THREE.Material>;
  phase: Phase;
  journey: React.RefObject<JourneyState>;
  reducedMotion: boolean;
  lowPower: boolean;
}

/** Seules les portes proches sont articulées ; les autres gardent leur vraie baie. */
export default function BusDoors({ doors, numRows, focusZ, mats, phase, journey, reducedMotion, lowPower }: Props) {
  const [focus, setFocus] = useState(() => getNearestBusDoor(focusZ, numRows).index);
  const focusRef = useRef(focus);
  const [active, setActive] = useState(0);
  const activeRef = useRef(active);
  useFrame(({ camera }) => {
    const nextFocus = getNearestBusDoor(camera.position.z, numRows).index;
    const nextActive = journey.current.doorIndex ?? 0;
    if (nextFocus !== focusRef.current) { focusRef.current = nextFocus; setFocus(nextFocus); }
    if (nextActive !== activeRef.current) { activeRef.current = nextActive; setActive(nextActive); }
  });
  const detailed = useMemo(() => {
    const indices = new Set([0, doors.length - 1, focus, active]);
    if (!lowPower) {
      indices.add(focus - 1); indices.add(focus + 1);
      indices.add(active - 1); indices.add(active + 1);
    }
    return doors.filter(door => indices.has(door.index));
  }, [doors, focus, active, lowPower]);
  const distant = useMemo(() => doors.filter(door => !detailed.includes(door)), [doors, detailed]);
  return <group name="bus-passenger-doors" userData={{ totalDoors: doors.length, detailedDoors: detailed.length }}>
    {detailed.map(door => <BusDoor key={door.index} door={door} mats={mats} phase={phase} journey={journey} reducedMotion={reducedMotion} />)}
    <ClosedDoors doors={distant} capacity={doors.length} mats={mats} />
  </group>;
}

type DoorPart = { size: [number, number, number]; position: [number, number, number] };

function createClosedGeometry(parts: DoorPart[]) {
  const shapes = parts.map(({ size, position }) => new THREE.BoxGeometry(...size).translate(...position));
  const geometry = mergeGeometries(shapes, false)!;
  shapes.forEach(shape => shape.dispose());
  return geometry;
}

/** Les portes fermées partagent six géométries et six draw calls au total. */
function ClosedDoors({ doors, capacity, mats }: { doors: BusDoorLayout[]; capacity: number; mats: Record<string, THREE.Material> }) {
  const geometries = useMemo(() => {
    const width = 1.26, front = -width / 2, rear = width / 2;
    const leafWidth = width / 2 - 0.047;
    const body: DoorPart[] = [], dark: DoorPart[] = [], yellow: DoorPart[] = [], frame: DoorPart[] = [];
    for (const z of [front, rear]) {
      frame.push({ size: [DOOR_FRAME_THICKNESS, 2.26, DOOR_JAMB_HALF_Z * 2], position: [DOOR_FRAME_X, 1.63, z] });
      frame.push({ size: [DOOR_INNER_TRIM_DEPTH, 2.26, DOOR_INNER_TRIM_HALF_Z * 2], position: [DOOR_INNER_TRIM_X, 1.63, z] });
      dark.push({ size: [0.015, 2.26, 0.065], position: [1.395, 1.63, z] });
    }
    for (const direction of [1, -1]) {
      const hinge = direction > 0 ? front + 0.045 : rear - 0.045;
      const center = hinge + direction * leafWidth / 2;
      body.push({ size: [0.07, 0.87, leafWidth - 0.05], position: [1.34, 0.965, center] });
      for (const edge of [hinge, hinge + direction * leafWidth]) dark.push({ size: [0.085, 2.2, 0.045], position: [1.36, 1.63, edge] });
      for (const y of [0.54, 1.42, 2.72]) dark.push({ size: [0.085, 0.055, leafWidth], position: [1.36, y, center] });
      yellow.push({ size: [0.018, 0.05, leafWidth - 0.06], position: [1.382, 1.72, center] });
    }
    dark.push({ size: [DOOR_FRAME_THICKNESS, 0.08, width], position: [DOOR_FRAME_X, 2.76, 0] });
    const glassParts = [1, -1].map(direction => {
      const hinge = direction > 0 ? front + 0.045 : rear - 0.045;
      return new THREE.PlaneGeometry(leafWidth - 0.07, 1.28).rotateY(Math.PI / 2).translate(1.34, 2.065, hinge + direction * leafWidth / 2);
    });
    const glass = mergeGeometries(glassParts, false)!;
    glassParts.forEach(shape => shape.dispose());
    return {
      body: createClosedGeometry(body), dark: createClosedGeometry(dark), yellow: createClosedGeometry(yellow),
      bodyDark: createClosedGeometry(frame), windowGlass: glass,
      floor: createClosedGeometry([{ size: [0.94, 0.1, width - 0.1], position: [0.88, 0.58, 0] }]),
    };
  }, []);
  useEffect(() => () => Object.values(geometries).forEach(geometry => geometry.dispose()), [geometries]);
  return <group name="bus-distant-doors" userData={{ count: doors.length }}>
    {Object.entries(geometries).map(([material, geometry]) => <ClosedDoorInstances key={`${material}-${capacity}`} doors={doors} capacity={capacity} geometry={geometry} material={mats[material]} castShadow={material !== "windowGlass"} />)}
  </group>;
}

function ClosedDoorInstances({ doors, capacity, geometry, material, castShadow }: { doors: BusDoorLayout[]; capacity: number; geometry: THREE.BufferGeometry; material: THREE.Material; castShadow: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const matrix = new THREE.Matrix4();
    doors.forEach((door, index) => ref.current!.setMatrixAt(index, matrix.makeTranslation(0, 0, door.z)));
    ref.current.count = doors.length;
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [doors]);
  return <instancedMesh name="bus-closed-door-instances" ref={ref} args={[geometry, material, capacity]} castShadow={castShadow} raycast={() => null} />;
}
