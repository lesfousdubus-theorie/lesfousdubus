import {
  Box3, Frustum, Matrix4, Mesh, Ray, Vector3,
  type BufferGeometry, type Camera, type Object3D,
} from "three";

type SceneryPart = { bounds: Box3; start: number; end: number };
type SceneryMesh = {
  inverse: Matrix4;
  positions: ReturnType<BufferGeometry["getAttribute"]>;
  indices: ReturnType<BufferGeometry["getIndex"]>;
  parts: SceneryPart[];
};

/** Conserver les limites et les triangles de chaque pièce dans la géométrie fusionnée. */
export function setSceneryParts(combined: BufferGeometry, shapes: BufferGeometry[]) {
  let start = 0;
  combined.userData.sceneryParts = shapes.map(shape => {
    const end = start + shape.getAttribute("position").count;
    const part = { bounds: shape.boundingBox!, start, end };
    start = end;
    return part;
  });
}

export function cacheSceneryBounds(object: Object3D, parentZ: number) {
  const bounds = new Box3();
  const origin = new Matrix4().makeTranslation(0, 0, -parentZ);
  const meshes: SceneryMesh[] = [];
  object.updateWorldMatrix(true, true);
  object.traverse(child => {
    if (!(child instanceof Mesh)) return;
    const geometry: BufferGeometry = child.geometry;
    const positions = geometry.getAttribute("position");
    const indices = geometry.getIndex();
    if (!positions) return;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const localBounds = geometry.boundingBox!;
    if (localBounds.isEmpty()) return;
    const matrix = new Matrix4().multiplyMatrices(origin, child.matrixWorld);
    bounds.union(localBounds.clone().applyMatrix4(matrix));
    const parts: SceneryPart[] = geometry.userData.sceneryParts ?? [
      { bounds: localBounds, start: 0, end: indices?.count ?? positions.count },
    ];
    meshes.push({ inverse: matrix.invert(), positions, indices, parts });
  });
  return { object, bounds, meshes };
}

export type SceneryBounds = ReturnType<typeof cacheSceneryBounds>;

function hasOddCrossings(distances: number[]) {
  distances.sort((a, b) => a - b);
  let crossings = 0;
  let last = -1;
  for (const distance of distances) {
    if (distance <= 1e-7 || distance - last <= 1e-6) continue;
    crossings++;
    last = distance;
  }
  return crossings % 2 === 1;
}

export function createSceneryVisibility() {
  const frustum = new Frustum();
  const projection = new Matrix4();
  const worldBounds = new Box3();
  const offset = new Vector3();
  const eye = new Vector3();
  const eyeInZone = new Vector3();
  const localEye = new Vector3();
  const direction = new Vector3(.82, .43, .37).normalize();
  const forward = new Ray(new Vector3(), direction);
  const backward = new Ray(new Vector3(), direction.clone().negate());
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), hit = new Vector3();
  const outgoing: number[] = [], incoming: number[] = [];

  const isInside = (scenery: SceneryBounds) => {
    if (!scenery.bounds.containsPoint(eyeInZone)) return false;
    for (const { inverse, positions, indices, parts } of scenery.meshes) {
      localEye.copy(eyeInZone).applyMatrix4(inverse);
      forward.origin.copy(localEye);
      backward.origin.copy(localEye);
      for (const part of parts) {
        if (!part.bounds.containsPoint(localEye)) continue;
        outgoing.length = 0;
        incoming.length = 0;
        for (let i = part.start; i + 2 < part.end; i += 3) {
          a.fromBufferAttribute(positions, indices?.getX(i) ?? i);
          b.fromBufferAttribute(positions, indices?.getX(i + 1) ?? i + 1);
          c.fromBufferAttribute(positions, indices?.getX(i + 2) ?? i + 2);
          if (forward.intersectTriangle(a, b, c, false, hit)) outgoing.push(localEye.distanceTo(hit));
          if (backward.intersectTriangle(a, b, c, false, hit)) incoming.push(localEye.distanceTo(hit));
        }
        // La caméra doit avoir une sortie de chaque côté. Une face ouverte ne suffit pas.
        if (hasOddCrossings(outgoing) && hasOddCrossings(incoming)) return true;
      }
    }
    return false;
  };

  return {
    begin(camera: Camera) {
      camera.updateMatrixWorld();
      eye.setFromMatrixPosition(camera.matrixWorld);
      frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    },
    update(scenery: SceneryBounds, z: number) {
      offset.set(0, 0, z);
      eyeInZone.copy(eye).sub(offset);
      const inFrame = frustum.intersectsBox(worldBounds.copy(scenery.bounds).translate(offset));
      scenery.object.visible = inFrame && !isInside(scenery);
    },
  };
}
