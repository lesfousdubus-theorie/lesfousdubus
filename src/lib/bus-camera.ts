/** Recul généreux, adapté aussi aux bus qui s'allongent avec les passagers. */
export function getExteriorMaxDistance(cabinLength: number): number {
  return Math.max(140, cabinLength * 5);
}

export function getBusCameraFar(cabinLength: number): number {
  // L'extrémité du véhicule et le paysage restent dans le volume visible.
  return Math.max(2000, getExteriorMaxDistance(cabinLength) + cabinLength + 100);
}
import type { Box3, Ray, Vector3 } from "three";


/** Écarter un décor entre la caméra et le bus, jamais celui derrière le bus. */
export function obstructsBusView(ray: Ray, bounds: Box3, busDistance: number, hit: Vector3): boolean {
  if (bounds.containsPoint(ray.origin)) return true;
  return ray.intersectBox(bounds, hit) !== null && ray.origin.distanceTo(hit) < busDistance - 2;
}
