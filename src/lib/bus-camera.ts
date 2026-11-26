import { Box3, InstancedMesh, MathUtils, Mesh, Quaternion, Raycaster, Vector3, type Object3D, type PerspectiveCamera, type Vector2 } from "three";
import { BUS_DOOR, BUS_FRONT_Z } from "./bus-layout";

export const ORBIT_CAMERA_FLOOR = 0.24;
const CLOSE_TRAVEL_DISTANCE = 2.4;
const MIN_PIVOT_DEPTH = 0.4;
const MAX_PITCH = Math.PI / 2 - 0.04;
const UP = new Vector3(0, 1, 0);

const MAX_EXTERIOR_DISTANCE = 2200;
const MAX_CAMERA_FAR_CABIN = 1600;

export function getExteriorMaxDistance(cabinLength: number): number {
  return Math.min(MAX_EXTERIOR_DISTANCE, Math.max(140, cabinLength * 5));
}

export function getBusCameraFar(cabinLength: number, minimumFar = 2000): number {
  // Borner cameraFar à ~3,9 km (bien au-delà du brouillard à 2,56 km) préserve la précision du depth buffer 24 bits
  // et supprime le Z-fighting / tremblement des surfaces intérieures sur les bus de 300k–1M passagers.
  const effectiveCabin = Math.min(cabinLength, MAX_CAMERA_FAR_CABIN);
  return Math.max(minimumFar, getExteriorMaxDistance(effectiveCabin) + effectiveCabin + 100);
}

export function wheelZoomRatio(delta: number, deltaMode: number, viewportHeight: number) {
  const pixels = delta * (deltaMode === 1 ? 16 : deltaMode === 2 ? viewportHeight : 1);
  return Math.exp(MathUtils.clamp(pixels, -240, 240) * 0.0015);
}

export function getOverviewDistance(cabinLength: number, aspect: number, offset: Vector3) {
  const back = offset.clone().normalize();
  const right = new Vector3().crossVectors(UP, back).normalize();
  const up = new Vector3().crossVectors(back, right);
  const corner = new Vector3();
  const halfHeight = Math.tan(MathUtils.degToRad(55 / 2)) * .84;
  const halfWidth = halfHeight * aspect;
  let distance = offset.length() * 1.15;
  for (const x of [-1.6, 1.6]) {
    for (const y of [-1.9, 2.8]) {
      for (const z of [-cabinLength / 2 - .8, cabinLength / 2 + .4]) {
        corner.set(x, y, z);
        const projection = Math.max(Math.abs(corner.dot(right)) / halfWidth, Math.abs(corner.dot(up)) / halfHeight);
        distance = Math.max(distance, corner.dot(back) + projection);
      }
    }
  }
  return distance;
}

/** En vue libre, le point d'orbite peut rester hors du centre de l'écran. */
export function createBusExploration() {
  const pivot = new Vector3();
  const forward = new Vector3();
  const right = new Vector3();
  const offset = new Vector3();
  const next = new Vector3();
  const raycaster = new Raycaster();
  const bounds = new Box3();
  const yaw = new Quaternion();
  const pitch = new Quaternion();

  function keepAboveGround(camera: PerspectiveCamera) {
    camera.position.y = Math.max(camera.position.y, ORBIT_CAMERA_FLOOR);
  }

  function limitTravel(camera: PerspectiveCamera, rearZ: number, maxDistance: number) {
    const closestZ = MathUtils.clamp(camera.position.z, BUS_FRONT_Z, rearZ);
    const distance = Math.hypot(camera.position.x, camera.position.y, camera.position.z - closestZ);
    if (distance > maxDistance) {
      const scale = maxDistance / distance;
      camera.position.x *= scale;
      camera.position.y *= scale;
      camera.position.z = closestZ + (camera.position.z - closestZ) * scale;
    }
    keepAboveGround(camera);
  }

  function aimRay(camera: PerspectiveCamera, cursor: Vector2) {
    camera.updateMatrixWorld();
    raycaster.setFromCamera(cursor, camera);
  }

  const boxHit = new Vector3();

  function focus(camera: PerspectiveCamera, cursor: Vector2, rearZ: number, bus: Object3D | undefined) {
    if (!bus) return;
    aimRay(camera, cursor);
    bus.updateWorldMatrix(true, false);
    const baseY = bus.matrixWorld.elements[13];
    bounds.min.set(-BUS_DOOR.x - .3, baseY + .25, BUS_FRONT_Z - .8);
    bounds.max.set(BUS_DOOR.x + .3, baseY + 4.7, rearZ + .4);
    if (!raycaster.ray.intersectsBox(bounds)) return;

    const parts: Mesh[] = [];
    let skippedHeavy = false;
    bus.traverseVisible(object => {
      if (!(object instanceof Mesh) || object instanceof InstancedMesh || !object.layers.test(camera.layers)) return;
      const posAttr = object.geometry?.attributes?.position;
      if (posAttr && posAttr.count > 2500) {
        skippedHeavy = true;
        return;
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.some(material => material.visible && !material.transparent)) parts.push(object);
    });
    raycaster.near = Math.max(camera.near, MIN_PIVOT_DEPTH);
    raycaster.far = camera.far;
    const [hit] = raycaster.intersectObjects(parts, false);
    if (hit) {
      pivot.copy(hit.point);
    } else if (skippedHeavy && raycaster.ray.intersectBox(bounds, boxHit)) {
      pivot.copy(boxHit);
    }
  }

  function zoom(camera: PerspectiveCamera, cursor: Vector2, gesture: number, rearZ: number, maxDistance: number) {
    aimRay(camera, cursor);
    camera.getWorldDirection(forward);
    const depth = MathUtils.clamp(offset.subVectors(pivot, camera.position).dot(forward), 0, maxDistance);
    // Échelle logarithmique à distance, vitesse constante à proximité.
    const scaledDepth = depth / CLOSE_TRAVEL_DISTANCE;
    const step = (scaledDepth > 1 ? Math.log(scaledDepth) : scaledDepth - 1) + gesture;
    const nextDepth = CLOSE_TRAVEL_DISTANCE * (step > 0 ? Math.exp(step) : 1 + step);
    const travel = depth - nextDepth;
    offset.copy(raycaster.ray.direction).multiplyScalar(travel / raycaster.ray.direction.dot(forward));
    next.copy(camera.position);
    camera.position.add(offset);
    limitTravel(camera, rearZ, maxDistance);

    // La caméra peut traverser sa cible, y compris le toit. Reprendre un pivot devant elle.
    const pivotDepth = offset.subVectors(pivot, camera.position).dot(forward);
    if (offset.subVectors(camera.position, next).lengthSq() > 1e-10 && pivotDepth < MIN_PIVOT_DEPTH) {
      pivot.copy(camera.position).addScaledVector(forward, CLOSE_TRAVEL_DISTANCE);
      pivot.y = Math.max(pivot.y, ORBIT_CAMERA_FLOOR);
    }
  }

  function rotate(camera: PerspectiveCamera, azimuth: number, elevation: number, rearZ: number, maxDistance: number) {
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const currentPitch = Math.asin(MathUtils.clamp(forward.y, -1, 1));
    const pitchChange = MathUtils.clamp(currentPitch + elevation, -MAX_PITCH, MAX_PITCH) - currentPitch;
    yaw.setFromAxisAngle(UP, azimuth);
    right.set(1, 0, 0).applyQuaternion(camera.quaternion).applyQuaternion(yaw);
    pitch.setFromAxisAngle(right, pitchChange).multiply(yaw);
    camera.position.sub(pivot).applyQuaternion(pitch).add(pivot);
    camera.quaternion.premultiply(pitch).normalize();
    limitTravel(camera, rearZ, maxDistance);
  }

  function pan(camera: PerspectiveCamera, horizontal: number, forwardMotion: number, rearZ: number, maxDistance: number) {
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, UP);
    const distance = Math.max(CLOSE_TRAVEL_DISTANCE, camera.position.distanceTo(pivot));
    const scale = 2 * distance * Math.tan(MathUtils.degToRad(camera.fov / 2));
    next.copy(camera.position);
    camera.position.addScaledVector(right, horizontal * scale).addScaledVector(forward, forwardMotion * scale);
    limitTravel(camera, rearZ, maxDistance);
    pivot.add(offset.subVectors(camera.position, next));
  }

  return { pivot, focus, zoom, rotate, pan };
}
