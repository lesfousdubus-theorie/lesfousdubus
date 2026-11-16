import assert from "node:assert/strict";
import { build } from "esbuild";

const { outputFiles } = await build({
  stdin: {
    contents: 'export * from "./src/lib/bus-camera"; export * from "./src/lib/world-visibility"; export { BoxGeometry, Group, Mesh, PerspectiveCamera, PlaneGeometry, SphereGeometry, Vector2, Vector3 } from "three"; export { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";',
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const { BoxGeometry, Group, Mesh, PerspectiveCamera, PlaneGeometry, SphereGeometry, Vector2, Vector3,
  MIN_ORBIT_DISTANCE, ORBIT_CAMERA_FLOOR, cacheSceneryBounds, createSceneryVisibility, dollyOrbitCamera,
  mergeGeometries, setSceneryParts, wheelZoomRatio } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`
);

assert.equal(wheelZoomRatio(0, 0, 720), 1);
assert.equal(wheelZoomRatio(2, 1, 720), wheelZoomRatio(32, 0, 720));
assert(Math.abs(wheelZoomRatio(-120, 0, 720) * wheelZoomRatio(120, 0, 720) - 1) < 1e-10);

const camera = new PerspectiveCamera(55, 1.6, .1, 500);
const pivot = new Vector3(0, 2, 0);
const cursor = new Vector2(.53, .21);
camera.position.set(18, 5, 0);
camera.lookAt(pivot);
camera.updateMatrixWorld();
const position = camera.position.clone();
const orientation = camera.quaternion.clone();
const targetUnderCursor = new Vector3(cursor.x, cursor.y, .99).unproject(camera);
const logWheel = Math.log(wheelZoomRatio(-120, 0, 720));
dollyOrbitCamera(camera, pivot, cursor, logWheel, 140);
camera.updateMatrixWorld();
const projected = targetUnderCursor.project(camera);
assert(Math.hypot(projected.x - cursor.x, projected.y - cursor.y) < 1e-8, "Keep the scene point under the cursor.");
assert(camera.quaternion.equals(orientation), "An off-center zoom should move the pivot without tilting.");
assert(Math.abs(pivot.z) > .5, "The orbit pivot should move along the bus.");
dollyOrbitCamera(camera, pivot, cursor, -logWheel, 140);
assert(camera.position.distanceTo(position) < 1e-8, "One matching outward step should restore the wide view.");

const center = new Vector2();
camera.position.set(MIN_ORBIT_DISTANCE, 1.5, 0);
pivot.set(0, 1.5, 0);
camera.lookAt(pivot);
for (let i = 0; i < 4; i++) dollyOrbitCamera(camera, pivot, center, logWheel, 140);
assert(camera.position.x < -.5, "Keep moving through the pivot near the bus.");
assert(Math.abs(camera.position.distanceTo(pivot) - MIN_ORBIT_DISTANCE) < 1e-8);
const beforeReversing = camera.position.x;
dollyOrbitCamera(camera, pivot, center, -logWheel, 140);
assert(camera.position.x - beforeReversing > .4, "Retreat remains responsive after traversing the pivot.");

camera.position.set(.92, ORBIT_CAMERA_FLOOR, 0);
pivot.set(-.5, -.38, 0);
camera.lookAt(pivot);
dollyOrbitCamera(camera, pivot, center, logWheel, 140);
assert.equal(camera.position.y, ORBIT_CAMERA_FLOOR);
assert(camera.position.x < .55, "The floor should preserve horizontal travel.");
camera.position.set(140, 1.5, 0);
pivot.set(0, 1.5, 0);
camera.lookAt(pivot);
dollyOrbitCamera(camera, pivot, center, -logWheel, 140);
assert.equal(camera.position.x, 140, "Keep the maximum overview distance.");

const visibility = createSceneryVisibility();
const begin = (x, y, z, aim = [0, 1.7, 0]) => {
  camera.position.set(x, y, z);
  camera.lookAt(...aim);
  visibility.begin(camera);
};
const fixture = (geometry, x, y, z) => {
  const mesh = new Mesh(geometry);
  mesh.position.set(x, y, z);
  return cacheSceneryBounds(mesh, 0);
};

const foreground = fixture(new BoxGeometry(2, 2, 2), 5, 1.7, 0);
const background = fixture(new BoxGeometry(2, 2, 2), -5, 1.7, 0);
begin(12, 2.1, 0);
visibility.update(foreground, 0);
visibility.update(background, 0);
assert.equal(foreground.object.visible, true, "Looking through a decoration does not mean the camera is inside it.");
assert.equal(background.object.visible, true);

begin(5, 1.7, 0);
visibility.update(foreground, 0);
assert.equal(foreground.object.visible, false);
begin(6.005, 1.7, 0);
visibility.update(foreground, 0);
assert.equal(foreground.object.visible, true, "Restore the mesh on the first frame outside its surface.");

const sphere = fixture(new SphereGeometry(1, 20, 16), 5, 1.7, 0);
begin(5.82, 2.52, 0);
visibility.update(sphere, 0);
assert.equal(sphere.object.visible, true, "A corner of the bounding box is outside the solid.");
begin(5.5, 2.2, 0);
visibility.update(sphere, 0);
assert.equal(sphere.object.visible, false);

const pieces = [-2.6, 2.6].map(z => {
  const piece = new BoxGeometry(2, 2, 2).toNonIndexed().translate(0, 0, z);
  piece.computeBoundingBox();
  return piece;
});
const combined = mergeGeometries(pieces);
setSceneryParts(combined, pieces);
const merged = fixture(combined, 5, 1.7, 0);
begin(5, 1.7, 0);
visibility.update(merged, 0);
assert.equal(merged.object.visible, true, "The gap between merged parts must remain visible.");
begin(5, 1.7, 2.6);
visibility.update(merged, 0);
assert.equal(merged.object.visible, false, "Contact still works on a part of a merged mesh.");
const unplaced = new Group(), moving = new Mesh(new BoxGeometry(2, 2, 2));
unplaced.position.set(3, 1.7, 8);
unplaced.rotation.y = .3;
unplaced.add(moving);
const rotated = cacheSceneryBounds(unplaced, 8);
begin(3, 1.7, 18);
visibility.update(rotated, 18);
assert.equal(rotated.object.visible, false, "Account for the panorama translating between frames.");
visibility.update(rotated, 16);
assert.equal(rotated.object.visible, true);

const plane = fixture(new PlaneGeometry(2, 2), 5, 1.7, 0);
begin(5, 1.7, 0, [4, 1.7, 0]);
visibility.update(plane, 0);
assert.equal(plane.object.visible, true, "A single surface has no volume to enter.");

console.log("Camera wheel, cursor-anchored orbit, close travel and exact scenery contact passed.");
