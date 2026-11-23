"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { getBusGraffitiPlacements, THEORY_SIGN_MESSAGES } from "@/lib/bus-theory-signs";
import type { BusDoorLayout } from "@/lib/bus-layout";
import { makeGraffitiTexture } from "@/lib/textures";
import { SIDE_LABEL_Y } from "./BusBodyGeometry";

const PALETTES = [
  { color: "#fff1a8", stroke: "#071952", accent: "#ef3340" },
  { color: "#ffdc4a", stroke: "#34145f", accent: "#22d3ee" },
  { color: "#f7d6e0", stroke: "#3b0a2a", accent: "#ff9f1c" },
  { color: "#baf7d0", stroke: "#053d33", accent: "#ff6b35" },
  { color: "#bde7ff", stroke: "#071f5c", accent: "#ff4da6" },
];

function BusGraffitiGroup({
  message,
  geometry,
  instances,
}: {
  message: number;
  geometry: THREE.PlaneGeometry;
  instances: Array<{ side: number; z: number; width: number }>;
}) {
  const material = useMemo(() => {
    const { lines } = THEORY_SIGN_MESSAGES[message];
    const map = makeGraffitiTexture({
      text: lines.join("\n"),
      width: 1024,
      height: 342,
      ...PALETTES[message % PALETTES.length],
      angle: message % 2 === 0 ? -0.035 : 0.045,
      decorationWidthScale: 0.76,
    });
    map.anisotropy = 4;
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
  }, [message]);

  useEffect(() => () => {
    material.map?.dispose();
    material.dispose();
  }, [material]);

  const mesh = useMemo(() => {
    const transform = new THREE.Object3D();
    const instanced = new THREE.InstancedMesh(geometry, material, instances.length);
    instanced.name = `bus-side-slogan-${THEORY_SIGN_MESSAGES[message].id}`;
    instances.forEach(({ side, width, z }, index) => {
      transform.position.set(side * 1.342, SIDE_LABEL_Y, z);
      transform.rotation.y = side * Math.PI / 2;
      transform.scale.set(width, Math.min(0.78, width / 3), 1);
      transform.updateMatrix();
      instanced.setMatrixAt(index, transform.matrix);
    });
    instanced.computeBoundingSphere();
    return instanced;
  }, [geometry, instances, material, message]);

  useEffect(() => () => { mesh.dispose(); }, [mesh]);

  return <primitive object={mesh} raycast={() => null} />;
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

  const [mountedCount, setMountedCount] = useState(1);

  useEffect(() => {
    if (mountedCount >= grouped.length) return;
    const timer = window.setTimeout(() => {
      setMountedCount((prev) => Math.min(grouped.length, prev + 1));
    }, 45);
    return () => window.clearTimeout(timer);
  }, [grouped.length, mountedCount]);

  const visibleGroups = useMemo(
    () => grouped.slice(0, mountedCount),
    [grouped, mountedCount],
  );

  return (
    <group name="bus-theory-graffiti">
      {visibleGroups.map(([message, instances]) => (
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
