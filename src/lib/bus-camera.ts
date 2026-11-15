import { MathUtils } from "three";

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
