"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

interface Props {
  spans: Array<[number, number]>;
  x: number;
  y: number;
  width: number;
  height: number;
  material: THREE.Material;
  name?: string;
  planeSide?: number;
  castShadow?: boolean;
}

/** Toutes les découpes partagent un seul draw call instancié, sans allocation géométrique par tronçon. */
export default function BusSpanMeshes({ spans, x, y, width, height, material, name, planeSide, castShadow = false }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const key = spans.map(([from, to]) => `${from}:${to}`).join(",");
  const capacity = Math.max(16, Math.ceil(spans.length / 64) * 64);
  const originZ = spans.length > 0
    ? (spans[Math.floor(spans.length / 2)][0] + spans[Math.floor(spans.length / 2)][1]) * 0.5
    : 0;

  const geometry = useMemo(
    () => (planeSide === undefined ? new THREE.BoxGeometry(1, 1, 1) : new THREE.PlaneGeometry(1, 1)),
    [planeSide],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!key) {
      mesh.count = 0;
      mesh.visible = false;
      return;
    }
    const pairs = key.split(",");
    const dummy = new THREE.Object3D();
    let minFrom = Infinity;
    let maxTo = -Infinity;
    for (let i = 0; i < pairs.length; i++) {
      const [from, to] = pairs[i].split(":").map(Number);
      if (from < minFrom) minFrom = from;
      if (to > maxTo) maxTo = to;
      dummy.position.set(x, y, (from + to) * 0.5 - originZ);
      dummy.rotation.set(0, planeSide !== undefined ? (planeSide * Math.PI) / 2 : 0, 0);
      dummy.scale.set(
        planeSide !== undefined ? to - from : width,
        height,
        planeSide !== undefined ? 1 : to - from,
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = pairs.length;
    mesh.visible = true;
    mesh.instanceMatrix.needsUpdate = true;
    if (Number.isFinite(minFrom) && Number.isFinite(maxTo)) {
      const centerZ = (minFrom + maxTo) * 0.5 - originZ;
      const halfZ = Math.max(0.5, (maxTo - minFrom) * 0.5);
      const radius = Math.hypot(width * 0.5, height * 0.5, halfZ);
      mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(x, y, centerZ), radius);
    }
  }, [key, originZ, x, y, width, height, planeSide, capacity]);

  if (!spans.length) return null;
  return (
    <instancedMesh
      key={`span-${capacity}-${planeSide ?? "box"}`}
      ref={meshRef}
      name={name}
      position={[0, 0, originZ]}
      args={[geometry, material, capacity]}
      count={spans.length}
      castShadow={castShadow}
      dispose={null}
      raycast={planeSide === undefined ? undefined : () => null}
    />
  );
}
