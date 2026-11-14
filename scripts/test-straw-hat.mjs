import assert from "node:assert/strict";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/components/bus/StrawHatGeometry.ts"],
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const { createStrawHatGeometry } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
const { hatGeo, ribbonGeo } = createStrawHatGeometry();
const positions = hatGeo.getAttribute("position");
const normals = hatGeo.getAttribute("normal");
let innerPoles = 0;
let outerPoles = 0;
for (let i = 0; i < positions.count; i++) {
  const normal = [normals.getX(i), normals.getY(i), normals.getZ(i)];
  assert(normal.every(Number.isFinite));
  assert(Math.abs(Math.hypot(...normal) - 1) < 1e-5, "Hat normals must have unit length.");
  if (Math.hypot(positions.getX(i), positions.getZ(i)) < 0.00001) {
    if (positions.getY(i) < 1.075) {
      innerPoles++;
      assert(normals.getY(i) < -0.99, "The inner apex must face into the hat, not towards the sun.");
    } else {
      outerPoles++;
      assert(normals.getY(i) > 0.99, "The outer apex must face upwards.");
    }
  }
}
assert(innerPoles > 0 && outerPoles > 0, "Both surfaces must close at the axis without a pinhole.");
hatGeo.dispose();
ribbonGeo.dispose();
console.log("Straw hat checks passed (closed apexes, inward/outward unit normals).");
