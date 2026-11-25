"use client";

import { createContext, useContext } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

type Vec3 = [number, number, number];
const shapes = new Map<string, THREE.BufferGeometry>();

/**
 * Active le mode basse géométrie (BoxGeometry 12 triangles au lieu de RoundedBoxGeometry 108-300 triangles)
 * pour les archétypes instanciés des centaines de passagers assis, sans retirer aucun détail visuel.
 */
export const CharacterLowPolyContext = createContext(false);
export function useCharacterLowPoly() {
  return useContext(CharacterLowPolyContext);
}

/** Géométries partagées : volumes biseautés en gros plan, boîtes exactes pour les micro-pièces ou la foule instanciée. */
export function getCharacterShape(size: Vec3, radius = Math.min(...size) * 0.18, detail = 1, lowPoly = false) {
  const isMicroPart = Math.min(...size) <= 0.038 || Math.max(...size) <= 0.075;
  const usePlainBox = lowPoly || detail <= 0 || isMicroPart;
  const key = usePlainBox ? `box:${size.join(":")}` : `rbox:${[...size, radius, detail].join(":")}`;
  let shape = shapes.get(key);
  if (!shape) {
    shape = usePlainBox
      ? new THREE.BoxGeometry(...size)
      : new RoundedBoxGeometry(...size, detail, radius);
    shapes.set(key, shape);
  }
  return shape;
}

export function CharacterPart({ size, radius, detail, ...props }: {
  size: Vec3; radius?: number; detail?: number; material: THREE.Material;
  position?: Vec3; rotation?: Vec3; name?: string; castShadow?: boolean;
}) {
  const lowPoly = useCharacterLowPoly();
  return <mesh {...props} geometry={getCharacterShape(size, radius, detail, lowPoly)} dispose={null} />;
}

/** Les pièces immobiles d'un même matériau partagent un seul appel de rendu. */
export function joinCharacterParts(parts: Array<{ size: Vec3; position: Vec3 }>, lowPoly = false) {
  const geometries = parts.map(({ size, position }) => {
    const base = getCharacterShape(size, undefined, 1, lowPoly);
    const cloned = base.index ? base.toNonIndexed() : base.clone();
    cloned.translate(...position);
    return cloned;
  });
  const joined = mergeGeometries(geometries)!;
  geometries.forEach(geometry => geometry.dispose());
  return joined;
}
