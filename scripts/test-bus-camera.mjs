import assert from "node:assert/strict";
import { build } from "esbuild";

const { outputFiles } = await build({
  stdin: {
    contents: 'export * from "./src/lib/bus-camera"; export * from "./src/lib/world-visibility"; export { Box3, BoxGeometry, Mesh, PerspectiveCamera, Vector3 } from "three";',
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const { Box3, BoxGeometry, Mesh, PerspectiveCamera, Vector3, cacheSceneryBounds, createSceneryVisibility,
  getExteriorOrbitFloor, wheelZoomRatio } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);

assert.equal(wheelZoomRatio(0, 0, 720), 1);
assert.equal(wheelZoomRatio(2, 1, 720), wheelZoomRatio(32, 0, 720));
assert(Math.abs(wheelZoomRatio(-120, 0, 720) * wheelZoomRatio(120, 0, 720) - 1) < 1e-10);
assert.equal(getExteriorOrbitFloor(new Vector3(1, 0, 0), 52), 1.78);
assert.equal(getExteriorOrbitFloor(new Vector3(0, 0, 1), 52), 26.7);
assert.equal(getExteriorOrbitFloor(new Vector3(0, 1, 0), 52), 2.18);

const camera = new PerspectiveCamera(55, 1.6, .1, 500);
const visibility = createSceneryVisibility();
const begin = (x, y, z, outside = true) => {
  camera.position.set(x, y, z);
  camera.lookAt(0, 1.7, 0);
  visibility.begin(camera, 0, 14, outside);
};
const makeFixture = (x, y, z, parts) => {
  const mesh = new Mesh(new BoxGeometry(2, 2, 2));
  mesh.position.set(x, y, z);
  if (parts) mesh.geometry.userData.occlusionBounds = parts;
  return cacheSceneryBounds(mesh, 0);
};

const foreground = makeFixture(5, 1.7, 0);
const background = makeFixture(-5, 1.7, 0);
begin(12, 2.1, 0);
visibility.update(foreground, 0);
visibility.update(background, 0);
assert.equal(foreground.object.visible, false, "An obstacle between the lens and the bus must be hidden.");
assert.equal(background.object.visible, true, "A visible object behind the bus must remain.");

const gap = makeFixture(5, 1.7, 0, [-5.2, 5.2].map(z =>
  new Box3(new Vector3(-.4, -.4, z - .3), new Vector3(.4, .4, z + .3))));
visibility.update(gap, 0);
assert.equal(gap.object.visible, true, "A gap in a merged decoration must leave the actual shapes visible.");
visibility.update(foreground, 5.6);
assert.equal(foreground.object.visible, true, "The same moving object must reappear as soon as it clears the traces.");

begin(5, 1.7, 0, false);
visibility.update(foreground, 0);
assert.equal(foreground.object.visible, false, "Travel through a decoration must also be protected without sightline checks.");
begin(6.4, 1.7, 0, false);
visibility.update(foreground, 0);
assert.equal(foreground.object.visible, false, "Release hysteresis must avoid toggling at a boundary.");
begin(7, 1.7, 0, false);
visibility.update(foreground, 0);
assert.equal(foreground.object.visible, true);

console.log("Camera wheel, orbit clearance, visibility through scenery and restoration passed.");
