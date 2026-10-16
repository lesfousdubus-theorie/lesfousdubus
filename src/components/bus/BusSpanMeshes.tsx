"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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

/** Toutes les découpes partagent un seul draw call, quelle que soit la longueur. */
export default function BusSpanMeshes({ spans, x, y, width, height, material, name, planeSide, castShadow = false }: Props) {
  const key = spans.map(([from, to]) => `${from}:${to}`).join(",");
  const geometry = useMemo(() => {
    const segments = key ? key.split(",").map(pair => {
      const [from, to] = pair.split(":").map(Number);
      const shape = planeSide === undefined
        ? new THREE.BoxGeometry(width, height, to - from)
        : new THREE.PlaneGeometry(to - from, height);
      if (planeSide !== undefined) shape.rotateY(planeSide * Math.PI / 2);
      return shape.translate(x, y, (from + to) / 2);
    }) : [];
    const merged = segments.length ? mergeGeometries(segments, false) : new THREE.BufferGeometry();
    segments.forEach(segment => segment.dispose());
    return merged;
  }, [key, x, y, width, height, planeSide]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (!spans.length) return null;
  return <mesh name={name} geometry={geometry} material={material} castShadow={castShadow} raycast={planeSide === undefined ? undefined : () => null} />;
}
