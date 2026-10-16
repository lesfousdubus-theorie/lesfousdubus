import assert from "node:assert/strict";
import { build } from "esbuild";
import * as THREE from "three";

const result = await build({ entryPoints: ["src/lib/world-geometry.ts"], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const { BRIDGE_MARKING_BOX } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
const geometry = new THREE.BoxGeometry(...BRIDGE_MARKING_BOX);
geometry.computeBoundingBox();
assert.deepEqual(geometry.boundingBox.getSize(new THREE.Vector3()).toArray().map(value => Math.round(value * 100) / 100), [0.16, 0.02, 960], "Segmentation must preserve the complete bridge marking volume.");
const position = geometry.attributes.position;
const index = geometry.index;
for (let i = 0; i < index.count; i += 3) {
  const z = [0, 1, 2].map(offset => position.getZ(index.getX(i + offset)));
  assert(z.every(Number.isFinite) && Math.max(...z) - Math.min(...z) <= 10, "No bridge marking triangle may span more than 10 m near the interior camera.");
}
geometry.dispose();
console.log("Bridge marking keeps its 960 m bounds with at most 10 m longitudinal triangles.");
