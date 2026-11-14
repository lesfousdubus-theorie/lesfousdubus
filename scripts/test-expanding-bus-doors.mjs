import assert from "node:assert/strict";
import { build } from "esbuild";
import { writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import * as THREE from "three";

async function load(path) {
  const result = await build({ entryPoints: [path], bundle: true, format: "esm", platform: "node", packages: "external", write: false, logLevel: "silent" });
  const file = resolve(`scripts/.door-layout-${process.pid}-${Math.random().toString(16).slice(2)}.mjs`);
  await writeFile(file, result.outputFiles[0].text);
  try { return await import(pathToFileURL(file).href); } finally { await unlink(file); }
}
const { getSeatRowZ, getBusRearWallZ, getBusDoors, getBusDoorBounds, getNearestBusDoor,
  splitAtDoors, getWheelZClearOfDoors, BUS_FRONT_Z } = await load("src/lib/bus-layout.ts");
const { getInteriorRailSpans, isWindowPillarClearOfDoor } = await load("src/lib/bus-interior-geometry.ts");
const { createLowerBodyGeometry } = await load("src/components/bus/BusBodyGeometry.ts");
const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const ray = new THREE.Raycaster();
for (const rows of [6, 8, 9, 16, 17, 25, 125, 250, 2000]) {
  const doors = getBusDoors(rows), rear = getBusRearWallZ(rows);
  assert.equal(doors.length, Math.ceil(rows / 8));
  assert(Math.abs(rear - getSeatRowZ(rows - 1) - 1.2) < 1e-8, "The rear wall must not add an unused vestibule.");
  const wheels = [-4.3, getWheelZClearOfDoors(rear - 1.6, doors, rear), getWheelZClearOfDoors((rear + BUS_FRONT_Z) / 2, doors, rear)];
  const panels = splitAtDoors(BUS_FRONT_Z, rear, doors).map(([from, to]) => {
    const centre = (from + to) / 2;
    const mesh = new THREE.Mesh(createLowerBodyGeometry(to - from, wheels.map(z => z - centre)), material);
    mesh.position.set(1.3, 0, centre); mesh.updateMatrixWorld(); return mesh;
  });
  for (const door of doors) {
    const { frontZ, rearZ } = getBusDoorBounds(door);
    for (const y of [.7, 1, 1.5]) for (const z of [frontZ + .12, door.z, rearZ - .12]) {
      ray.set(new THREE.Vector3(2, y, z), new THREE.Vector3(-1, 0, 0));
      assert.equal(ray.intersectObjects(panels).length, 0, "Every added doorway must be an actual cut in the body.");
    }
    assert(!isWindowPillarClearOfDoor(door.z, doors));
    for (const [from, to] of getInteriorRailSpans(BUS_FRONT_Z, rear, true, doors)) {
      assert(to <= frontZ || from >= rearZ, "No rail may cross a doorway.");
    }
    if (door.index > 0) {
      const nextRow = door.index * 8, previous = getSeatRowZ(nextRow - 1), next = getSeatRowZ(nextRow);
      assert(previous + .39 < frontZ - .13, "The preceding bench must clear the open door leaves.");
      assert(next - .5 > rearZ + .13, "The next passenger's feet must clear the stairwell.");
    }
  }
  for (let row = 0; row < rows; row++) {
    const z = getSeatRowZ(row), nearest = getNearestBusDoor(z, rows);
    assert(doors.every(door => Math.abs(z - nearest.z) <= Math.abs(z - door.z) + 1e-8));
  }
  for (const z of wheels.slice(1)) for (const door of doors) {
    const bounds = getBusDoorBounds(door);
    assert(z + .66 <= bounds.frontZ || z - .66 >= bounds.rearZ, "Extra axles must clear the door stairs.");
  }
  panels.forEach(panel => panel.geometry.dispose());
}
for (let row = 0; row < 8; row++) assert(Math.abs(getSeatRowZ(row) - (-1.55 + row * 1.2)) < 1e-9, "The original short bus must retain its seat positions.");
material.dispose();
console.log("Expanding doors passed: real openings, free vestibules, rails, wheel clearance and nearest doors through 2000 rows.");
