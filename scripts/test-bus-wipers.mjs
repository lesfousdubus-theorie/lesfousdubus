import assert from "node:assert/strict";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/lib/bus-wipers.ts"],
  bundle: true,
  format: "esm",
  platform: "neutral",
  write: false,
  logLevel: "silent",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`;
const { advanceWiperAngle, WIPER_PARK_ANGLE } = await import(moduleUrl);

const motion = { phase: 0, running: false, cyclesPerSecond: 0.4 };
assert.equal(advanceWiperAngle(motion, false, 0, 1, 0.02), WIPER_PARK_ANGLE, "Dry blades must stay folded at the windshield base.");

for (let frame = 0; frame < 120; frame++) advanceWiperAngle(motion, true, 0.2, 0.3, 0.016);
const slowRate = motion.cyclesPerSecond;
for (let frame = 0; frame < 120; frame++) advanceWiperAngle(motion, true, 0.9, 0.3, 0.016);
const heavyRainRate = motion.cyclesPerSecond;
assert(heavyRainRate > slowRate + 0.15, "Stronger rain must increase the cadence at the same bus speed.");
const beforeAcceleration = motion.phase;
advanceWiperAngle(motion, true, 0.9, 3, 0.016);
const phaseAdvance = (motion.phase - beforeAcceleration + Math.PI * 2) % (Math.PI * 2);
assert(phaseAdvance > 0 && phaseAdvance < 0.2, "Changing speed must preserve the wiper phase.");
for (let frame = 0; frame < 120; frame++) advanceWiperAngle(motion, true, 0.9, 3, 0.016);
assert(motion.cyclesPerSecond > heavyRainRate + 0.25, "Faster driving must increase the cadence in the same rain.");

motion.phase = Math.PI;
assert(advanceWiperAngle(motion, true, 0.9, 3, 0) < 0, "The active blades must swing across the windshield.");
let angle = 0;
for (let frame = 0; frame < 150; frame++) angle = advanceWiperAngle(motion, false, 0, 3, 0.02);
assert.equal(motion.running, false, "The blades must finish the cycle after rain stops.");
assert.equal(motion.phase, 0, "The blades must park at the same angle after rain stops.");
assert.equal(angle, WIPER_PARK_ANGLE);

console.log("Bus wiper motion checks passed.");
