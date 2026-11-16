import { MathUtils, Vector3, type PerspectiveCamera, type Vector2 } from "three";

export const MIN_ORBIT_DISTANCE = 1.1;
export const ORBIT_CAMERA_FLOOR = 0.24;
const DOLLY_SPEED_FLOOR = 2.4;
const orbitForward = new Vector3();
const viewForward = new Vector3();
const dollyOffset = new Vector3();

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

/** Avance sur le rayon du curseur et décale le pivot en conservant l'angle de vue. */
export function dollyOrbitCamera(camera: PerspectiveCamera, target: Vector3, cursor: Vector2,
  logRatio: number, maxDistance: number) {
  const radius = orbitForward.subVectors(target, camera.position).length();
  if (!radius || !logRatio) return;
  orbitForward.divideScalar(radius);

  // Loin du pivot, la vitesse suit la distance. À proximité, elle devient constante
  // pour que la caméra continue d'avancer même quand son rayon d'orbite est minimal.
  const depth = radius > DOLLY_SPEED_FLOOR ? Math.log(radius / DOLLY_SPEED_FLOOR) : radius / DOLLY_SPEED_FLOOR - 1;
  const nextDepth = depth + logRatio;
  const nextRadius = DOLLY_SPEED_FLOOR * (nextDepth > 0 ? Math.exp(nextDepth) : 1 + nextDepth);
  const travel = radius - Math.min(nextRadius, maxDistance);

  camera.getWorldDirection(viewForward);
  dollyOffset.set(cursor.x, cursor.y, 0).unproject(camera).sub(camera.position).normalize();
  dollyOffset.multiplyScalar(travel / dollyOffset.dot(viewForward));
  dollyOffset.y = Math.max(dollyOffset.y, ORBIT_CAMERA_FLOOR - camera.position.y);
  const actualRadius = MathUtils.clamp(radius - dollyOffset.dot(viewForward), MIN_ORBIT_DISTANCE, maxDistance);
  camera.position.add(dollyOffset);
  target.copy(camera.position).addScaledVector(orbitForward, actualRadius);
}
