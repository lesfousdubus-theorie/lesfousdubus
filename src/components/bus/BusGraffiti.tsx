"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getBusGraffitiPlacements, getTheorySignMessages } from "@/lib/bus-theory-signs";
import type { BusDoorLayout } from "@/lib/bus-layout";
import { useLocale } from "@/lib/i18n";
import { makeGraffitiTexture } from "@/lib/textures";
import { SIDE_LABEL_Y } from "./BusBodyGeometry";

const PALETTES = [
  { color: "#fff1a8", stroke: "#071952", accent: "#ef3340" },
  { color: "#ffdc4a", stroke: "#34145f", accent: "#22d3ee" },
  { color: "#f7d6e0", stroke: "#3b0a2a", accent: "#ff9f1c" },
  { color: "#baf7d0", stroke: "#053d33", accent: "#ff6b35" },
  { color: "#bde7ff", stroke: "#071f5c", accent: "#ff4da6" },
];

const GRAFFITI_WINDOW_M = 360;
const GRAFFITI_WINDOW_CAPACITY = 48;

function BusGraffitiGroup({
  message,
  geometry,
  instances,
}: {
  message: number;
  geometry: THREE.PlaneGeometry;
  instances: Array<{ side: number; z: number; width: number }>;
}) {
  const locale = useLocale();
  const signMessage = getTheorySignMessages(locale)[message];
  const material = useMemo(() => {
    const map = makeGraffitiTexture({
      text: signMessage.lines.join("\n"),
      width: 512,
      height: 170,
      ...PALETTES[message % PALETTES.length],
      angle: message % 2 === 0 ? -0.035 : 0.045,
      decorationWidthScale: 0.76,
    });
    map.anisotropy = 2;
    return new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      alphaTest: 0.03,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      roughness: 0.45,
    });
  }, [message, signMessage]);

  useEffect(() => () => {
    material.map?.dispose();
    material.dispose();
  }, [material]);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const scratchRef = useRef<THREE.Object3D | null>(null);
  const lastCamZRef = useRef(Number.NaN);
  const windowed = instances.length > GRAFFITI_WINDOW_CAPACITY;
  const capacity = Math.max(1, windowed ? GRAFFITI_WINDOW_CAPACITY : instances.length);

  useLayoutEffect(() => {
    const instanced = meshRef.current;
    if (!instanced) return;
    const scratch = (scratchRef.current ??= new THREE.Object3D());
    const initialCount = Math.min(instances.length, capacity);
    for (let index = 0; index < initialCount; index++) {
      const { side, width, z } = instances[index];
      scratch.position.set(side * 1.348, SIDE_LABEL_Y, z);
      scratch.rotation.y = (side * Math.PI) / 2;
      scratch.scale.set(width, Math.min(0.78, width / 3), 1);
      scratch.updateMatrix();
      instanced.setMatrixAt(index, scratch.matrix);
    }
    instanced.count = initialCount;
    instanced.visible = initialCount > 0;
    instanced.instanceMatrix.needsUpdate = true;
    instanced.computeBoundingSphere();
    lastCamZRef.current = Number.NaN;
  }, [capacity, instances]);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh || !windowed) return;
    const camZ = camera.position.z;
    if (Number.isFinite(lastCamZRef.current) && Math.abs(camZ - lastCamZRef.current) < 48) return;
    lastCamZRef.current = camZ;
    const scratch = (scratchRef.current ??= new THREE.Object3D());
    let out = 0;
    for (let i = 0; i < instances.length && out < capacity; i++) {
      const { side, width, z } = instances[i];
      if (Math.abs(z - camZ) > GRAFFITI_WINDOW_M) continue;
      scratch.position.set(side * 1.348, SIDE_LABEL_Y, z);
      scratch.rotation.y = (side * Math.PI) / 2;
      scratch.scale.set(width, Math.min(0.78, width / 3), 1);
      scratch.updateMatrix();
      mesh.setMatrixAt(out++, scratch.matrix);
    }
    mesh.count = out;
    mesh.visible = out > 0;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      key={`graffiti-${signMessage.id}-${capacity}`}
      ref={meshRef}
      name={`bus-side-slogan-${signMessage.id}`}
      args={[geometry, material, capacity]}
      count={Math.min(instances.length, capacity)}
      frustumCulled={false}
      dispose={null}
      raycast={() => null}
    />
  );
}

export default function BusGraffiti({ doors, rearWallZ, wheelPositions }: {
  doors: BusDoorLayout[];
  rearWallZ: number;
  wheelPositions: [number, number][];
}) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  useEffect(() => () => { geometry.dispose(); }, [geometry]);

  // One instanced batch per slogan, even when the bus spans many doors.
  const tags = useMemo(() => {
    const axles = [...new Set(wheelPositions.map(([, z]) => z))];
    return getBusGraffitiPlacements(doors, rearWallZ, axles);
  }, [doors, rearWallZ, wheelPositions]);

  const grouped = useMemo(() => {
    const byMessage = new Map<number, Array<{ side: number; z: number; width: number }>>();
    for (const { message, side, z, width } of tags) {
      const group = byMessage.get(message);
      if (group) group.push({ side, z, width });
      else byMessage.set(message, [{ side, z, width }]);
    }
    return [...byMessage];
  }, [tags]);

  return (
    <group name="bus-theory-graffiti">
      {grouped.map(([message, instances]) => (
        <BusGraffitiGroup
          key={message}
          message={message}
          geometry={geometry}
          instances={instances}
        />
      ))}
    </group>
  );
}
