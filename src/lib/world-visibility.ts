import { Box3, Frustum, Matrix4, Mesh, Ray, Vector3, type Camera, type Object3D } from "three";

const CLEARANCE = .28;
const RELEASE_MARGIN = .24;

export function cacheSceneryBounds(object: Object3D, parentZ: number) {
  const bounds = new Box3();
  const solids: Box3[] = [];
  const anchor = new Vector3(0, 0, -parentZ);
  object.updateWorldMatrix(true, true);
  object.traverse(child => {
    if (!(child instanceof Mesh)) return;
    const geometry = child.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const shapes: Box3[] = geometry.userData.occlusionBounds ?? [geometry.boundingBox!];
    for (const shape of shapes) {
      if (shape.isEmpty()) continue;
      const local = shape.clone().applyMatrix4(child.matrixWorld).translate(anchor);
      bounds.union(local);
      solids.push(local);
    }
  });
  return { object, bounds, solids, hiddenByCamera: false };
}

export type SceneryBounds = ReturnType<typeof cacheSceneryBounds>;

export function createSceneryVisibility() {
  const frustum = new Frustum();
  const projection = new Matrix4();
  const whole = new Box3();
  const candidate = new Box3();
  const offset = new Vector3();
  const origin = new Vector3();
  const hit = new Vector3();
  const aim = new Vector3();
  const sightlines = Array.from({ length: 3 }, () => ({ ray: new Ray(), limitSquared: 0 }));
  let count = 0;

  const addSightline = (x: number, y: number, z: number) => {
    aim.set(x, y, z);
    if (!frustum.containsPoint(aim)) return;
    const sightline = sightlines[count++];
    sightline.ray.origin.copy(origin);
    sightline.ray.direction.subVectors(aim, origin);
    const distance = sightline.ray.direction.length();
    sightline.limitSquared = Math.max(0, distance - .35) ** 2;
    sightline.ray.direction.normalize();
  };

  const blocksSightline = (box: Box3) => {
    for (let i = 0; i < count; i++) {
      const { ray, limitSquared } = sightlines[i];
      if (ray.intersectBox(box, hit) && origin.distanceToSquared(hit) < limitSquared) return true;
    }
    return false;
  };

  return {
    begin(camera: Camera, centerZ: number, cabinLength: number, outside: boolean, focus?: Vector3) {
      camera.updateMatrixWorld();
      origin.setFromMatrixPosition(camera.matrixWorld);
      frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      count = 0;
      if (!outside) return;
      if (focus) {
        addSightline(focus.x, focus.y + .9, focus.z);
      } else {
        addSightline(0, 1.7, centerZ);
        addSightline(0, 1.7, centerZ - cabinLength * .37);
        addSightline(0, 1.7, centerZ + cabinLength * .37);
      }
    },
    update(block: SceneryBounds, z: number, contactOnly = false) {
      offset.set(0, 0, z);
      const margin = block.hiddenByCamera ? CLEARANCE + RELEASE_MARGIN : CLEARANCE;
      whole.copy(block.bounds).translate(offset).expandByScalar(margin);
      if (!frustum.intersectsBox(whole) && !whole.containsPoint(origin)) {
        block.object.visible = false;
        block.hiddenByCamera = false;
        return;
      }

      const contact = whole.containsPoint(origin);
      const obstruction = !contactOnly && blocksSightline(whole);
      block.hiddenByCamera = (contact || obstruction) && block.solids.some(shape => {
        candidate.copy(shape).translate(offset).expandByScalar(margin);
        return (contact && candidate.containsPoint(origin)) || (obstruction && blocksSightline(candidate));
      });
      block.object.visible = !block.hiddenByCamera;
    },
  };
}
