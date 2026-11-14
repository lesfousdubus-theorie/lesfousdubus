import assert from "node:assert/strict";
import { build } from "esbuild";
const result = await build({ entryPoints: ["src/lib/passenger-expressions.ts"], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const { createFacialExpression, sampleFacialExpression, blendFacialExpression } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
const characters = ["luffy", "zoro", "nami", "usopp", "sanji", "chopper", "robin", "franky", "brook", "jinbe", "law", "ace", "sabo", "yamato", "shanks", "buggy", "doflamingo", "boa_hancock", "vivi", "mihawk", "foudubustv", "kamal", "kyta"];
const signatures = new Set();
for (const id of characters) {
  const sequence = [];
  for (let time = 0; time < 12; time += .1) {
    const expression = createFacialExpression(); sampleFacialExpression(expression, time, 0, id, "party", false);
    assert.equal(expression.mood, "laugh");
    assert(expression.opening >= 0 && expression.opening <= 1 && expression.width > 0 && expression.width < 1.4);
    assert(Object.values(expression).filter(value => typeof value === "number").every(Number.isFinite));
    sequence.push(expression.opening);
  }
  assert(Math.max(...sequence) - Math.min(...sequence) > .2, "Celebrations must vary over time.");
  signatures.add(JSON.stringify(sequence));
  const first = createFacialExpression(), second = createFacialExpression();
  sampleFacialExpression(first, 0, 0, id, "party", true); sampleFacialExpression(second, 99, 0, id, "party", true);
  assert.deepEqual(first, second, "Reduced-motion expressions must remain still.");
  sampleFacialExpression(first, 2, 0, id, "idle", false);
  assert.equal(first.opening, 0, "The intro and stopped party restore the normal mouth.");
  sampleFacialExpression(first, .5, 0, id, "horn", false); assert.equal(first.mood, "cheer");
}
assert.equal(signatures.size, characters.length, "Each character should have a distinct laugh rhythm.");
for (const time of [1.2, 2.8, 4.0, 5.8]) {
  const first = createFacialExpression(), second = createFacialExpression();
  sampleFacialExpression(first, time, 0, "luffy", "chat", false);
  sampleFacialExpression(second, time, 1, "zoro", "chat", false);
  assert.notEqual(first.mood, second.mood, "Neighbours take turns speaking and listening.");
}
const current = createFacialExpression(), target = createFacialExpression();
sampleFacialExpression(target, 1, 0, "luffy", "party", false);
blendFacialExpression(current, target, 1 / 60, false);
assert(current.opening > 0 && current.opening < target.opening, "Expressions ease into their new shape.");
console.log("Expressions passed: distinct laughs, talking turns, horn reactions, settling and reduced motion.");
