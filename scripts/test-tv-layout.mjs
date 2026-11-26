import assert from "node:assert/strict";
import { build } from "esbuild";

const compiled = await build({
  stdin: {
    contents: "export * from './src/lib/bus-layout'; export * from './src/lib/bus-theory-signs'; export * from './src/lib/bus-interior-geometry';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`;
const {
  getActiveTvIndex, getTvPositions, getBusDoors, getWindowedBusDoors, getBusRearWallZ, getWheelPositions,
  getBusDoorBounds, getBusGraffitiPlacements, getSeatRowZ, isWindowPillarClearOfDoor,
} = await import(moduleUrl);

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

const megaBusRearTvs = getTvPositions(5295, front, 5294);
assert(megaBusRearTvs.length <= 9, "Mega bus keeps bounded secondary screen count.");
const rearActiveIdx = getActiveTvIndex(megaBusRearTvs, 5294);
const rearDist = (megaBusRearTvs[rearActiveIdx] ? (5294 * 1.2) : 0);
assert(rearActiveIdx > 0, "Rear passenger selects a nearby rear TV.");
assert(
  megaBusRearTvs.some(([, , z]) => z > 6000),
  "Rear passenger on a 20k bus gets a TV right in front of their seat.",
);
void rearDist;

for (const rows of [6, 9, 10, 18, 41, 150]) {
  const doors = getBusDoors(rows);
  const rear = getBusRearWallZ(rows);
  const axles = [...new Set(getWheelPositions(rear, doors).map(([, z]) => z))];
  const tags = getBusGraffitiPlacements(doors, rear, axles);
  for (const tag of tags) {
    const left = tag.z - tag.width / 2, right = tag.z + tag.width / 2;
    assert(right <= rear && axles.every(z => left - z >= .719 || z - right >= .719));
    if (tag.side === 1) assert(doors.every(door => {
      const { frontZ, rearZ } = getBusDoorBounds(door);
      return right <= frontZ || left >= rearZ;
    }), "Tags must stay outside the door apertures.");
  }
  for (let i = 1; i < doors.length; i++) {
    const start = getBusDoorBounds(doors[i - 1]).rearZ;
    const end = getBusDoorBounds(doors[i]).frontZ;
    for (const side of [-1, 1]) {
      const inSection = tags.filter(tag => tag.side === side && tag.z - tag.width / 2 > start && tag.z + tag.width / 2 < end);
      assert.equal(inSection.length, 2, `Each full section has two tags per side, with ${rows} rows.`);
    }
  }

  // Vérification dichotomique des piliers vs porte
  for (const probeZ of [doors[0].z, doors[0].z - 1.0, doors.at(-1).z, doors.at(-1).z + 1.0]) {
    const expected = doors.every((door) => {
      const { frontZ, rearZ } = getBusDoorBounds(door);
      return probeZ < frontZ - 0.127 || probeZ > rearZ + 0.127;
    });
    assert.equal(isWindowPillarClearOfDoor(probeZ, doors), expected, "Binary-search pillar check matches exact door clearance.");
  }
}

// Bus 1 000 000 places : tags bornés, déterministes et absents des sauts de virtualisation
const megaRows = 264_706;
const megaWindowDoors = getWindowedBusDoors(megaRows, getSeatRowZ(130_000));
const megaRear = getBusRearWallZ(megaRows);
const megaAxles = [...new Set(getWheelPositions(megaRear, megaWindowDoors).map(([, z]) => z))];
const megaTags = getBusGraffitiPlacements(megaWindowDoors, megaRear, megaAxles);
assert(megaTags.length <= 400, `1M-seat bus keeps graffiti placements bounded (got ${megaTags.length}).`);
for (const tag of megaTags) {
  assert(tag.width <= 2.9, "No graffiti tag may span across a virtualization gap.");
}
const frontFullTags = getBusGraffitiPlacements(getBusDoors(36), getBusRearWallZ(36), [-4.3]);
for (let i = 0; i < 4; i++) {
  assert.deepEqual(megaTags[i], frontFullTags[i], "Windowed front tags keep deterministic slogan identity.");
}

console.log("TV layout and door-to-door graffiti checks passed.");
