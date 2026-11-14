import assert from "node:assert/strict";
import { build } from "esbuild";

async function load(path) {
  const result = await build({ entryPoints: [path], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
}

const { DOOR_FRONT_Z, DOOR_REAR_Z, BUS_FRONT_Z, getSeatRowZ } = await load("src/lib/bus-layout.ts");
const {
  DOOR_FRAME_X, DOOR_FRAME_THICKNESS, DOOR_INNER_TRIM_X, DOOR_INNER_TRIM_DEPTH,
  DOOR_INNER_TRIM_HALF_Z, INTERIOR_RAIL_X, INTERIOR_RAIL_DEPTH,
  INTERIOR_RAIL_JOINT_GAP, getInteriorRailSpans, isWindowPillarClearOfDoor,
} = await load("src/lib/bus-interior-geometry.ts");
const { createConfettiSeeds, getConfettiZ, CONFETTI_DENSE_SPAN } = await load("src/lib/bus-confetti.ts");

const bodyInside = 1.26;
const frameInside = DOOR_FRAME_X - DOOR_FRAME_THICKNESS / 2;
const trimInside = DOOR_INNER_TRIM_X - DOOR_INNER_TRIM_DEPTH / 2;
const railInside = INTERIOR_RAIL_X - INTERIOR_RAIL_DEPTH / 2;
assert(bodyInside - frameInside > 0.01, "Blue structural jambs must have a real depth separation from the body panels.");
assert(frameInside - trimInside > 0.04, "The inner trim must have its own surface rather than a coincident blue face.");
assert(railInside - trimInside > 0.01, "Rails and inner jambs must have distinct inside planes.");
assert(DOOR_INNER_TRIM_X + DOOR_INNER_TRIM_DEPTH / 2 > frameInside, "The trim must join the structural jamb without a hole through the wall.");
const rails = getInteriorRailSpans(BUS_FRONT_Z + 0.05, getSeatRowZ(6) - 0.05, true);
assert.equal(rails.length, 2);
assert(Math.abs(DOOR_FRONT_Z - DOOR_INNER_TRIM_HALF_Z - rails[0][1] - INTERIOR_RAIL_JOINT_GAP) < 1e-9);
assert(Math.abs(rails[1][0] - DOOR_REAR_Z - DOOR_INNER_TRIM_HALF_Z - INTERIOR_RAIL_JOINT_GAP) < 1e-9);
assert.deepEqual(getInteriorRailSpans(DOOR_FRONT_Z, DOOR_REAR_Z, true), [], "No inner rail may cross the door opening.");
assert.deepEqual(getInteriorRailSpans(-4, 5, false), [[-4, 5]], "The wall opposite the door stays continuous.");
for (const edge of [DOOR_FRONT_Z, DOOR_REAR_Z]) {
  for (const offset of [-0.11, -0.05, 0, 0.05, 0.11]) {
    assert(!isWindowPillarClearOfDoor(edge + offset), "A window pillar touching the door trim must be omitted.");
  }
}
assert(isWindowPillarClearOfDoor(DOOR_FRONT_Z - 0.2));
assert(isWindowPillarClearOfDoor(DOOR_REAR_Z + 0.2));

for (const count of [120, 420]) for (const rows of [6, 12, 180, 2000]) {
  const from = BUS_FRONT_Z + 0.35, to = getSeatRowZ(rows) - 0.35;
  const seeds = createConfettiSeeds(count, to - from);
  assert.equal(seeds.length, count, "The GPU instance budget must stay fixed when the bus expands.");
  const globalSeeds = seeds.filter(seed => !seed.local);
  const zones = [0, 0, 0];
  for (const seed of globalSeeds) {
    const z = getConfettiZ(seed, from, to, 0);
    zones[Math.min(2, Math.floor((z - from) / (to - from) * 3))]++;
    assert(Number.isFinite(z) && z >= from && z <= to);
  }
  assert(zones.every(n => n >= globalSeeds.length * 0.3), "Confetti must cover the front, middle and rear even in virtualized buses.");
  assert(Math.min(...globalSeeds.map(seed => seed.z)) < 0.02 && Math.max(...globalSeeds.map(seed => seed.z)) > 0.98, "The entire usable cabin length must receive confetti.");
  for (const focusZ of [from - 50, from + 2, (from + to) / 2, to - 2, to + 50]) {
    const localZs = seeds.filter(seed => seed.local).map(seed => getConfettiZ(seed, from, to, focusZ));
    assert(localZs.every(z => Number.isFinite(z) && z >= from && z <= to), "The dense visible layer must remain inside the cabin.");
    if (localZs.length) assert(Math.max(...localZs) - Math.min(...localZs) <= CONFETTI_DENSE_SPAN, "Local density must not grow with passenger capacity.");
  }
}
console.log("Door trim clearances and whole-cabin confetti coverage passed.");
