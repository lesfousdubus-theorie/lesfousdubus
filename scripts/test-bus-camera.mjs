import assert from "node:assert/strict";
import { build } from "esbuild";

const { outputFiles } = await build({
  stdin: {
    contents: 'export * from "./src/lib/bus-camera"; export * from "./src/lib/world-visibility"; export { getWalkingLegPose } from "./src/lib/passenger-gait"; export { getPassengerSkeleton } from "./src/lib/passenger-proportions"; export { BoxGeometry, Group, Mesh, PerspectiveCamera, PlaneGeometry, SphereGeometry, Vector2, Vector3 } from "three"; export { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";',
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const { BoxGeometry, Group, Mesh, PerspectiveCamera, PlaneGeometry, SphereGeometry, Vector2, Vector3,
  ORBIT_CAMERA_FLOOR, cacheSceneryBounds, createBusExploration, createSceneryVisibility,
  getOverviewDistance, getPassengerSkeleton, getWalkingLegPose, mergeGeometries, setSceneryParts, wheelZoomRatio } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`
);

for (const id of ["luffy", "chopper", "brook"]) {
  const rig = getPassengerSkeleton(id);
  const rest = getWalkingLegPose(0, rig.standingHipHeight, 0, 0, id);
  for (const angle of Object.values(rest)) assert(Math.abs(angle) < 1e-6, `${id} stands with straight legs`);
  const seated = getWalkingLegPose(0, rig.seatedHipHeight, 0, 1, id);
  assert(seated.upper > .8 && seated.lower < -.8, `${id} can still bend to sit`);
}

assert.equal(wheelZoomRatio(0, 0, 720), 1);
assert.equal(wheelZoomRatio(2, 1, 720), wheelZoomRatio(32, 0, 720));
assert(Math.abs(wheelZoomRatio(-120, 0, 720) * wheelZoomRatio(120, 0, 720) - 1) < 1e-10);

const camera = new PerspectiveCamera(55, 1.6, .2, 500);
const exploration = createBusExploration();
const { pivot } = exploration;
const cabinRear = 8;
const maxDistance = 140;
const cursor = new Vector2();
const logWheel = Math.log(wheelZoomRatio(-120, 0, 720));
const zoom = (direction = 1) => exploration.zoom(camera, cursor, direction * logWheel, cabinRear, maxDistance);
function aim(position, point) {
  camera.position.fromArray(position);
  pivot.fromArray(point);
  camera.lookAt(pivot);
  camera.updateMatrixWorld();
}

const overviewOffset = new Vector3(7.5, 1.3, -8);
const longBus = 210;
const portrait = .48;
const overviewCamera = new PerspectiveCamera(55, portrait, .2, 1500);
overviewCamera.position.copy(overviewOffset).setLength(getOverviewDistance(longBus, portrait, overviewOffset));
overviewCamera.lookAt(0, 0, 0);
overviewCamera.updateMatrixWorld();
const distantCorner = new Vector3(1.6, 2.8, -longBus / 2 - .8).project(overviewCamera);
assert(Math.abs(distantCorner.x) <= .841 && Math.abs(distantCorner.y) <= .841, "Frame a long bus on a portrait screen.");

const bus = new Group();
const door = new Mesh(new BoxGeometry(.08, 2, 1));
door.position.set(1.3, 1.7, -3);
const floor = new Mesh(new BoxGeometry(2.6, .08, 12.6));
floor.position.set(0, .6, 1.7);
bus.add(door, floor);
bus.updateMatrixWorld(true);
aim([18, 5, 0], [0, 2, 0]);
const onDoor = new Vector3(1.34, 1.7, -3);
const projected = onDoor.clone().project(camera);
cursor.set(projected.x, projected.y);
const position = camera.position.clone();
const orientation = camera.quaternion.clone();
exploration.focus(camera, cursor, cabinRear, bus);
assert(pivot.distanceTo(onDoor) < 1e-6, "Select a real surface under the cursor.");
zoom();
camera.updateMatrixWorld();
const focusProjection = onDoor.clone().project(camera);
assert(focusProjection.z < projected.z, "Zoom advances toward the selected point.");
assert(Math.hypot(focusProjection.x - cursor.x, focusProjection.y - cursor.y) < 1e-6);
assert(camera.quaternion.equals(orientation), "Zoom preserves the camera angle.");
zoom(-1);
assert(camera.position.distanceTo(position) < 1e-8, "A reversed zoom follows the same ray.");
exploration.rotate(camera, -.3, .25, cabinRear, maxDistance);
camera.updateMatrixWorld();
const afterRotation = onDoor.clone().project(camera);
assert(Math.hypot(afterRotation.x - cursor.x, afterRotation.y - cursor.y) < 1e-6, "Orbit around the off-center door without reframing.");
const doorPivot = pivot.clone();
exploration.focus(camera, new Vector2(-.95, .95), cabinRear, bus);
assert(pivot.equals(doorPivot), "Keep the last pivot when pointing away from the bus.");

aim([0, 5.1, 0], [0, 1.8, 0]);
const roof = new Mesh(new BoxGeometry(2.68, .22, 12.6));
roof.position.set(0, 3.26, 1.7);
bus.add(roof);
bus.updateMatrixWorld(true);
cursor.set(0, 0);
exploration.focus(camera, cursor, cabinRear, bus);
assert(Math.abs(pivot.y - 3.37) < 1e-6, "Anchor to the roof when taking an overhead approach.");
for (let i = 0; i < 7; i++) zoom();
assert(camera.position.y < 2.3, "Travel through the roof and into the cabin.");
for (let i = 0; i < 12; i++) zoom();
assert.equal(camera.position.y, ORBIT_CAMERA_FLOOR);
const floorPosition = camera.position.clone();
const floorPivot = pivot.clone();
exploration.pan(camera, 0, .35, cabinRear, maxDistance);
assert.equal(camera.position.y, ORBIT_CAMERA_FLOOR);
assert(camera.position.distanceTo(floorPosition) > .8, "Move horizontally in an overhead view at floor height.");
assert(pivot.clone().sub(floorPivot).distanceTo(camera.position.clone().sub(floorPosition)) < 1e-8);
zoom(-1);
assert(camera.position.y > ORBIT_CAMERA_FLOOR + .3, "Reverse away from the ground immediately.");

aim([8, 2, 0], [0, 2, 0]);
exploration.rotate(camera, 0, .45, cabinRear, maxDistance);
assert(camera.position.y >= ORBIT_CAMERA_FLOOR);
assert(camera.getWorldDirection(new Vector3()).y > .4, "Look upward with the same orbit and the ground limit.");

aim([140, ORBIT_CAMERA_FLOOR, 0], [0, ORBIT_CAMERA_FLOOR, 0]);
zoom(-1);
assert(camera.position.length() < maxDistance + .001, "Keep the maximum zoom-out distance.");

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
