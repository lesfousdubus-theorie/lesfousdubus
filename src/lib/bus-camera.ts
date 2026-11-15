import { MathUtils, type Vector3 } from "three";

/** Recul généreux, adapté aussi aux bus qui s'allongent avec les passagers. */
export function getExteriorMaxDistance(cabinLength: number): number {
  return Math.max(140, cabinLength * 5);
}

export function getBusCameraFar(cabinLength: number): number {
  // L'extrémité du véhicule et le paysage restent dans le volume visible.
  return Math.max(2000, getExteriorMaxDistance(cabinLength) + cabinLength + 100);
}
export function wheelZoomRatio(delta: number, deltaMode: number, viewportHeight: number) {
  const pixels = delta * (deltaMode === 1 ? 16 : deltaMode === 2 ? viewportHeight : 1);
  return Math.exp(MathUtils.clamp(pixels, -240, 240) * 0.0015);
}

/** Sortie du volume de la caisse le long du rayon, en gardant le bus comme pivot. */
export function getExteriorOrbitFloor(direction: Vector3, cabinLength: number) {
  const { x, y, z } = direction;
  const alongWidth = 1.78 / Math.abs(x);
  const alongRoof = y > 0 ? 2.18 / y : Infinity;
  const alongLength = (cabinLength / 2 + .7) / Math.abs(z);
  return Math.max(.65, Math.min(alongWidth, alongRoof, alongLength));
}
