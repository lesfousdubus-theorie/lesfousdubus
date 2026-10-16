"use client";

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

type Vec3 = [number, number, number];
const shapes = new Map<string, RoundedBoxGeometry>();

/** Géométries partagées : des volumes fermés, avec des normales continues. */
export function getCharacterShape(size: Vec3, radius = Math.min(...size) * 0.18, detail = 1) {
  const key = [...size, radius, detail].join(":");
  let shape = shapes.get(key);
  if (!shape) {
    shape = new RoundedBoxGeometry(...size, detail, radius);
    shapes.set(key, shape);
  }
  return shape;
}

export function CharacterPart({ size, radius, detail, ...props }: {
  size: Vec3; radius?: number; detail?: number; material: THREE.Material;
  position?: Vec3; rotation?: Vec3; name?: string; castShadow?: boolean;
}) {
  return <mesh {...props} geometry={getCharacterShape(size, radius, detail)} dispose={null} />;
}

/** Les pièces immobiles d'un même matériau partagent un seul appel de rendu. */
export function joinCharacterParts(parts: Array<{ size: Vec3; position: Vec3 }>) {
  const geometries = parts.map(({ size, position }) => getCharacterShape(size).clone().translate(...position));
  const joined = mergeGeometries(geometries)!;
  geometries.forEach(geometry => geometry.dispose());
  return joined;
}
