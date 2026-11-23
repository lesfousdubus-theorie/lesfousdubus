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

export default function BusGraffiti({ doors, rearWallZ, wheelPositions }: {
  doors: BusDoorLayout[];
  rearWallZ: number;
  wheelPositions: [number, number][];
}) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const [materials, setMaterials] = useState<THREE.MeshStandardMaterial[]>([]);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let nextIndex = 0;
    const created: THREE.MeshStandardMaterial[] = [];

    const createNext = () => {
      if (cancelled || nextIndex >= THEORY_SIGN_MESSAGES.length) return;
      const index = nextIndex;
      const { lines } = THEORY_SIGN_MESSAGES[index];
      const material = new THREE.MeshStandardMaterial({
        map: makeGraffitiTexture({
          text: lines.join("\n"),
          width: 1024,
          height: 342,
          ...PALETTES[index % PALETTES.length],
          angle: index % 2 === 0 ? -.035 : .045,
          decorationWidthScale: .76,
        }),
        transparent: true,
        alphaTest: .03,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        roughness: .45,
      });
      created.push(material);
      nextIndex += 1;
      setMaterials([...created]);
      if (nextIndex < THEORY_SIGN_MESSAGES.length) {
        frame = requestAnimationFrame(createNext);
      }
    };

    frame = requestAnimationFrame(createNext);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      geometry.dispose();
      for (const material of created) {
        material.map?.dispose();
        material.dispose();
      }
    };
  }, [geometry]);

  // One instanced batch per slogan, even when the bus spans many doors.
  const tags = useMemo(() => {
    const axles = [...new Set(wheelPositions.map(([, z]) => z))];
    return getBusGraffitiPlacements(doors, rearWallZ, axles);
  }, [doors, rearWallZ, wheelPositions]);
  const tagsKey = tags.map(({ message, side, z, width }) => `${message}:${side}:${z}:${width}`).join("|");

  const batches = useMemo(() => {
    if (!tagsKey || materials.length === 0) return [];
    const byMessage = new Map<number, Array<{ side: number; z: number; width: number }>>();
    for (const entry of tagsKey.split("|")) {
      const [messageStr, sideStr, zStr, widthStr] = entry.split(":");
      const message = Number(messageStr);
      if (message >= materials.length) continue;
      const item = { side: Number(sideStr), z: Number(zStr), width: Number(widthStr) };
      const group = byMessage.get(message);
      if (group) group.push(item);
      else byMessage.set(message, [item]);
    }
    const transform = new THREE.Object3D();
    return [...byMessage].flatMap(([message, instances]) => {
      const material = materials[message];
      if (!material) return [];
      const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
      mesh.name = `bus-side-slogan-${THEORY_SIGN_MESSAGES[message].id}`;
      instances.forEach(({ side, width, z }, index) => {
        transform.position.set(side * 1.342, SIDE_LABEL_Y, z);
        transform.rotation.y = side * Math.PI / 2;
        transform.scale.set(width, Math.min(.78, width / 3), 1);
        transform.updateMatrix();
        mesh.setMatrixAt(index, transform.matrix);
      });
      mesh.computeBoundingSphere();
      return [mesh];
    });
  }, [tagsKey, geometry, materials]);

  useEffect(() => () => batches.forEach(mesh => mesh.dispose()), [batches]);

  return <group name="bus-theory-graffiti">{batches.map(mesh =>
    <primitive key={mesh.name} object={mesh} raycast={() => null} />,
  )}</group>;
}
