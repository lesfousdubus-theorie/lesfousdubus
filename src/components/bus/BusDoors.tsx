"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getNearestBusDoor, type BusDoorLayout } from "@/lib/bus-layout";
import type { JourneyState } from "@/lib/bus-journey";
import { DOOR_FRAME_X, DOOR_FRAME_THICKNESS, DOOR_JAMB_HALF_Z } from "@/lib/bus-interior-geometry";
import type { Phase } from "./constants";
import BusDoor from "./BusDoor";

interface Props {
  doors: BusDoorLayout[];
  totalDoorCount?: number;
  numRows: number;
  focusZ: number;
  mats: Record<string, THREE.Material>;
  phase: Phase;
  journey: React.RefObject<JourneyState>;
  reducedMotion: boolean;
  lowPower: boolean;
}

/** Seules les portes proches sont articulées ; les autres gardent leur vraie baie. */
const BusDoors = memo(function BusDoors({ doors, totalDoorCount, numRows, focusZ, mats, phase, journey, reducedMotion, lowPower }: Props) {
  const [focus, setFocus] = useState(() => getNearestBusDoor(focusZ, numRows).index);
  const focusRef = useRef(focus);
  const [active, setActive] = useState(0);
  const activeRef = useRef(active);
  useFrame(({ camera }) => {
    const nextActive = journey.current.doorIndex ?? 0;
    // Hors embarquement/débarquement, toutes les portes restent fermées : éviter de permuter les portes
    // articulées et de ré-uploader les instances de portes lors des déplacements caméra ou de rangée.
    const nextFocus = (phase === "outside" || phase === "inside") ? nextActive : getNearestBusDoor(camera.position.z, numRows).index;
    if (nextFocus !== focusRef.current) { focusRef.current = nextFocus; setFocus(nextFocus); }
    if (nextActive !== activeRef.current) { activeRef.current = nextActive; setActive(nextActive); }
  });
  const doorTotal = totalDoorCount ?? doors.length;
  const detailed = useMemo(() => {
    const indices = new Set([0, focus, active]);
    if (phase !== "outside" || doorTotal <= 10) {
      const lastDoorIndex = doors[doors.length - 1]?.index ?? 0;
      indices.add(lastDoorIndex);
      if (!lowPower) {
        indices.add(focus - 1); indices.add(focus + 1);
        indices.add(active - 1); indices.add(active + 1);
      }
    }
    return doors.filter(door => indices.has(door.index));
  }, [doors, doorTotal, focus, active, lowPower, phase]);
  const distant = useMemo(() => doors.filter(door => !detailed.includes(door)), [doors, detailed]);
  return <group name="bus-passenger-doors" userData={{ totalDoors: doorTotal, detailedDoors: detailed.length }}>
    {detailed.map(door => <BusDoor key={door.index} door={door} mats={mats} phase={phase} journey={journey} reducedMotion={reducedMotion} />)}
    <ClosedDoors doors={distant} mats={mats} />
  </group>;
});

export default BusDoors;

type DoorPart = { size: [number, number, number]; position: [number, number, number] };

function createClosedGeometry(parts: DoorPart[], extraShapes: THREE.BufferGeometry[] = []) {
  const shapes = [
    ...parts.map(({ size, position }) => new THREE.BoxGeometry(...size).translate(...position)),
    ...extraShapes,
  ];
  const geometry = mergeGeometries(shapes, false)!;
  shapes.forEach(shape => shape.dispose());
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

const DOOR_CHUNK_SIZE = 128;
const NEAR_DOOR_DETAIL_WINDOW_M = 150;
const NEAR_DOOR_DETAIL_CAPACITY = 36;

/**
 * Les portes fermées sont découpées en tronçons Z frustum-cullés (~64 portes / ~700 m) pour
 * l'enveloppe visible au loin, tandis que les micro-détails (charnières chrome et rampes
 * intérieures) suivent uniquement les portes proches de la caméra (±150 m).
 */
function ClosedDoors({ doors, mats }: { doors: BusDoorLayout[]; mats: Record<string, THREE.Material> }) {
  const geometries = useMemo(() => {
    const width = 1.26, front = -width / 2, rear = width / 2;
    const leafWidth = width / 2 - 0.047;
    const body: DoorPart[] = [], dark: DoorPart[] = [], yellowBelt: DoorPart[] = [], frame: DoorPart[] = [], chrome: DoorPart[] = [];
    const chromeCylinders: THREE.BufferGeometry[] = [];
    for (const z of [front, rear]) {
      frame.push({ size: [DOOR_FRAME_THICKNESS, 2.26, DOOR_JAMB_HALF_Z * 2], position: [DOOR_FRAME_X, 1.63, z] });
    }
    // Enveloppe extérieure fusionnée (6 boîtes propres au lieu de 13 boîtes superposées) : identique visuellement, -54 % triangles.
    dark.push({ size: [0.085, 2.24, 0.05], position: [1.36, 1.63, front + 0.045] });
    dark.push({ size: [0.085, 2.24, 0.05], position: [1.36, 1.63, rear - 0.045] });
    dark.push({ size: [0.085, 2.2, 0.06], position: [1.36, 1.63, 0] });
    for (const y of [0.54, 1.42, 2.74]) {
      dark.push({ size: [DOOR_FRAME_THICKNESS, 0.07, width], position: [DOOR_FRAME_X, y, 0] });
    }
    body.push({ size: [0.07, 0.87, width - 0.16], position: [1.34, 0.965, 0] });
    yellowBelt.push({ size: [0.018, 0.05, width - 0.18], position: [1.376, 1.37, 0] });
    for (const direction of [1, -1]) {
      const hinge = direction > 0 ? front + 0.045 : rear - 0.045;
      chrome.push({ size: [0.03, 0.18, 0.022], position: [1.411, 1.34, hinge + direction * (leafWidth - 0.09)] });
      for (const y of [0.63, 2.55]) {
        chromeCylinders.push(new THREE.CylinderGeometry(0.035, 0.035, 0.15, 6).translate(1.34, y, hinge));
      }
    }
    const railCylinders = [
      new THREE.CylinderGeometry(0.027, 0.027, 2.08, 8).translate(1.1, 1.68, rear + 0.1),
      new THREE.CylinderGeometry(0.022, 0.022, 0.14, 6).rotateZ(Math.PI / 2).translate(1.17, 2.7, rear + 0.1),
    ];
    const glass = new THREE.PlaneGeometry(width - 0.18, 1.28).rotateY(Math.PI / 2).translate(1.34, 2.065, 0);
    glass.computeBoundingBox();
    glass.computeBoundingSphere();
    return {
      shell: {
        body: createClosedGeometry(body),
        dark: createClosedGeometry(dark),
        yellow: createClosedGeometry(yellowBelt),
        bodyDark: createClosedGeometry(frame),
        windowGlass: glass,
        floor: createClosedGeometry([{ size: [0.96, 0.1, width], position: [0.88, 0.58, 0] }]),
      },
      nearDetails: {
        chrome: createClosedGeometry(chrome, chromeCylinders),
        yellow: createClosedGeometry([], railCylinders),
      },
    };
  }, []);
  useEffect(() => () => {
    Object.values(geometries.shell).forEach(geometry => geometry.dispose());
    Object.values(geometries.nearDetails).forEach(geometry => geometry.dispose());
  }, [geometries]);

  const chunks = useMemo(() => {
    const out: Array<{ key: number; doors: BusDoorLayout[]; centerZ: number; radius: number }> = [];
    for (let i = 0; i < doors.length; i += DOOR_CHUNK_SIZE) {
      const slice = doors.slice(i, i + DOOR_CHUNK_SIZE);
      const z0 = slice[0].z;
      const z1 = slice[slice.length - 1].z;
      out.push({
        key: i,
        doors: slice,
        centerZ: (z0 + z1) * 0.5,
        radius: Math.abs(z1 - z0) * 0.5 + 4,
      });
    }
    return out;
  }, [doors]);

  if (!doors.length) return null;
  return <group name="bus-distant-doors" userData={{ count: doors.length }}>
    {chunks.map((chunk) =>
      Object.entries(geometries.shell).map(([material, geometry]) => (
        <ClosedDoorChunkInstances
          key={`shell-${chunk.key}-${material}`}
          doors={chunk.doors}
          centerZ={chunk.centerZ}
          radius={chunk.radius}
          geometry={geometry}
          material={mats[material]}
        />
      )),
    )}
    {Object.entries(geometries.nearDetails).map(([material, geometry]) => (
      <NearClosedDoorDetails
        key={`near-${material}`}
        doors={doors}
        geometry={geometry}
        material={mats[material]}
      />
    ))}
  </group>;
}

function ClosedDoorChunkInstances({
  doors,
  centerZ,
  radius,
  geometry,
  material,
}: {
  doors: BusDoorLayout[];
  centerZ: number;
  radius: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < doors.length; i++) {
      mesh.setMatrixAt(i, matrix.makeTranslation(0, 0, doors[i].z - centerZ));
    }
    mesh.count = doors.length;
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(1.2, 1.65, 0), radius);
    mesh.instanceMatrix.needsUpdate = true;
  }, [centerZ, doors, radius]);
  return (
    <instancedMesh
      name="bus-closed-door-instances"
      ref={ref}
      position={[0, 0, centerZ]}
      args={[geometry, material, DOOR_CHUNK_SIZE]}
      count={doors.length}
      frustumCulled
      dispose={null}
      raycast={() => null}
    />
  );
}

function NearClosedDoorDetails({
  doors,
  geometry,
  material,
}: {
  doors: BusDoorLayout[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const lastCamZRef = useRef(Number.NaN);
  const matrixRef = useRef<THREE.Matrix4 | null>(null);
  const windowed = doors.length > NEAR_DOOR_DETAIL_CAPACITY;
  const capacity = Math.max(1, windowed ? NEAR_DOOR_DETAIL_CAPACITY : doors.length);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = (matrixRef.current ??= new THREE.Matrix4());
    const initial = Math.min(doors.length, capacity);
    const originZ = initial > 0 ? doors[Math.floor(initial / 2)].z : 0;
    mesh.position.z = originZ;
    for (let i = 0; i < initial; i++) {
      mesh.setMatrixAt(i, matrix.makeTranslation(0, 0, doors[i].z - originZ));
    }
    mesh.count = initial;
    mesh.visible = initial > 0;
    mesh.instanceMatrix.needsUpdate = true;
    lastCamZRef.current = Number.NaN;
  }, [capacity, doors]);

  useFrame(({ camera }) => {
    const mesh = ref.current;
    if (!mesh || !windowed) return;
    const camZ = camera.position.z;
    if (Number.isFinite(lastCamZRef.current) && Math.abs(camZ - lastCamZRef.current) < 36) return;
    lastCamZRef.current = camZ;
    const originZ = Math.round(camZ / 16) * 16;
    mesh.position.z = originZ;
    const matrix = (matrixRef.current ??= new THREE.Matrix4());
    let out = 0;
    for (let i = 0; i < doors.length && out < capacity; i++) {
      const z = doors[i].z;
      if (Math.abs(z - camZ) > NEAR_DOOR_DETAIL_WINDOW_M) continue;
      mesh.setMatrixAt(out++, matrix.makeTranslation(0, 0, z - originZ));
    }
    mesh.count = out;
    mesh.visible = out > 0;
    if (out > 0) mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      name="bus-closed-door-near-details"
      ref={ref}
      args={[geometry, material, capacity]}
      frustumCulled={false}
      dispose={null}
      raycast={() => null}
    />
  );
}
