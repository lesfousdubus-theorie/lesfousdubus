import assert from "node:assert/strict";
import { build } from "esbuild";
import * as THREE from "three";
import { writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const result = await build({ stdin: { contents: 'export * from "./src/lib/one-piece-scenery.ts"; export { obstructsBusView } from "./src/lib/bus-camera.ts";', resolveDir: process.cwd() }, bundle: true, format: "esm", platform: "node", packages: "external", write: false, logLevel: "silent" });
const temporary = resolve(`scripts/.scenery-check-${process.pid}.mjs`);
await writeFile(temporary, result.outputFiles[0].text);
try {
  const { createOnePieceScenery, createOnePieceForeground, SET_PIECE_OFFSET_X, obstructsBusView } = await import(pathToFileURL(temporary).href);
  const summaries = [];
  for (let zone = 0; zone < 5; zone++) {
    const vertexCounts = [];
    for (const lowPower of [false, true]) {
      const batches = createOnePieceScenery(zone, lowPower);
      const bounds = new THREE.Box3();
      let vertices = 0;
      for (const batch of batches) {
        const position = batch.geometry.getAttribute("position");
        const normal = batch.geometry.getAttribute("normal");
        for (const value of position.array) assert(Number.isFinite(value), `Zone ${zone} must have finite geometry.`);
        for (const value of normal.array) assert(Number.isFinite(value), `Zone ${zone} must have finite lighting normals.`);
        vertices += position.count;
        bounds.union(batch.geometry.boundingBox);
        batch.geometry.dispose();
      }
      bounds.translate(new THREE.Vector3(SET_PIECE_OFFSET_X, 0, 0));
      assert(bounds.min.x > 11, `Zone ${zone} must keep its landmark off the bus road and shoulder.`);
      assert(bounds.max.y >= 22 && bounds.max.y < 43, `Zone ${zone} needs a prominent but bounded skyline.`);
      assert(bounds.min.y > -1 && bounds.min.z > -23 && bounds.max.z < 23, `Zone ${zone} must fit its central island footprint.`);
      assert(batches.length <= 18, `Zone ${zone} must merge its landmark to at most 18 draw calls.`);
      // Real landmark bounds must hide a foreground destination during an
      // exterior orbit, while preserving it behind the bus. This prevents the
      // richer skylines from inheriting the old set-piece occlusion regression.
      const target = new THREE.Vector3(0, 1.9, 0);
      const frontCamera = new THREE.Vector3(100, 4, 0);
      const backCamera = new THREE.Vector3(-100, 4, 0);
      for (const [camera, shouldHide] of [[frontCamera, true], [backCamera, false]]) {
        const ray = new THREE.Ray(camera, target.clone().sub(camera).normalize());
        assert.equal(obstructsBusView(ray, bounds, camera.distanceTo(target), new THREE.Vector3()), shouldHide, `Zone ${zone} exterior orbit must protect the bus without discarding the skyline behind it.`);
      }
      assert(vertices < 125_000, `Zone ${zone} must keep geometry bounded.`);
      vertexCounts.push(vertices);
      let foregroundVertices = 0;
      for (const side of [-1, 1]) {
        const foreground = createOnePieceForeground(zone, side, lowPower);
        assert(foreground.length < 14, "Foreground detail must stay batched by material.");
        for (const batch of foreground) {
          const box = batch.geometry.boundingBox;
          assert(side < 0 ? box.max.x < -10 : box.min.x > 10, `Zone ${zone} foreground must leave the entire bus corridor open.`);
          const position = batch.geometry.getAttribute("position");
          for (const value of position.array) assert(Number.isFinite(value));
          foregroundVertices += position.count;
          batch.geometry.dispose();
        }
      }
      summaries.push({ zone, lowPower, landmarkCalls: batches.length, vertices, foregroundVertices, height: Number(bounds.max.y.toFixed(1)), roadClearance: Number(bounds.min.x.toFixed(1)) });
    }
    assert(vertexCounts[1] < vertexCounts[0], `Zone ${zone} must render a lighter mobile silhouette.`);
  }
  console.table(summaries);
  console.log("Five One Piece destinations preserve road clearance, skyline, finite geometry and reduced mobile detail.");
} finally {
  await unlink(temporary);
}
