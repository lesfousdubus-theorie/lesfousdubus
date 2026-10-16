import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const FITTED_COSTUME_CLEARANCE = .0015;
const costumes = new Map<string, THREE.BufferGeometry>();

/** The cloth follows the actual faceted torso, rather than a plane in front of it. */
export function getFittedCostumeGeometry(width: number, height: number, depth: number, radius = .045) {
  const key = [width, height, depth, radius].join(":");
  const existing = costumes.get(key);
  if (existing) return existing;
  const bodyGeometry = new RoundedBoxGeometry(width, height, depth, 2, radius);
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [];
  const bodyPositions = bodyGeometry.attributes.position, bodyNormals = bodyGeometry.attributes.normal;
  // Reuse the torso's triangle layout, including the rounded side edges. Merely
  // sampling a new plane can make its straight triangle chords pass through skin.
  for (let triangle = 0; triangle < bodyPositions.count; triangle += 3) {
    const frontNormal = bodyNormals.getZ(triangle) + bodyNormals.getZ(triangle + 1) + bodyNormals.getZ(triangle + 2);
    if (frontNormal >= -.00001) continue;
    for (let corner = 0; corner < 3; corner++) {
      const vertex = triangle + corner;
      const x = bodyPositions.getX(vertex), y = bodyPositions.getY(vertex), z = bodyPositions.getZ(vertex);
      const nx = bodyNormals.getX(vertex), ny = bodyNormals.getY(vertex), nz = bodyNormals.getZ(vertex);
      positions.push(x + nx * FITTED_COSTUME_CLEARANCE, y + ny * FITTED_COSTUME_CLEARANCE, z + nz * FITTED_COSTUME_CLEARANCE);
      normals.push(nx, ny, nz);
      uvs.push(.5 - x / width, .5 + y / height);
    }
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeBoundingBox();
  geometry.userData.fittedTorso = { width, height, depth, radius, clearance: FITTED_COSTUME_CLEARANCE };
  bodyGeometry.dispose();
  costumes.set(key, geometry);
  return geometry;
}
