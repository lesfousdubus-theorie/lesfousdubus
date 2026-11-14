import assert from "node:assert/strict";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/components/bus/tv-layout.ts"],
  bundle: true,
  format: "esm",
  platform: "neutral",
  write: false,
  logLevel: "silent",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`;
const { getActiveTvIndex, getTvPositions } = await import(moduleUrl);

const front = { x: 0, y: 2.55, z: -4.2 };
const shortBus = getTvPositions(4, front);
assert.equal(shortBus.length, 1);
assert.equal(getActiveTvIndex(shortBus, 3), 0);

const bus = getTvPositions(8, front);
assert.equal(bus.length, 2);
assert.equal(getActiveTvIndex(bus, 3), 0, "A screen behind the passenger must not be selected.");
assert.equal(getActiveTvIndex(bus, 5), 0, "A screen too close to the camera must not be selected.");
assert.equal(getActiveTvIndex(bus, 6), 1, "The rear screen should be used once it is in view.");
assert.equal(getActiveTvIndex(bus, 7), 1);

const longBus = getTvPositions(40, front);
assert(longBus.length <= 9, "The bus should mount at most eight secondary screens.");
assert(longBus.every((position, index) => index === 0 || position[2] > longBus[index - 1][2]));

console.log("TV layout regression checks passed.");
