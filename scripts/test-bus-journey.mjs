import assert from "node:assert/strict";
import { build } from "esbuild";

const compiled = await build({ entryPoints: ["src/lib/bus-journey.ts"], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const journey = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
const layoutBuild = await build({ entryPoints: ["src/lib/bus-layout.ts"], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const layout = await import(`data:text/javascript;base64,${Buffer.from(layoutBuild.outputFiles[0].text).toString("base64")}`);
const { createJourneyState, beginJourney, updateJourney, getJourneyTiming, getPassengerWalkPath, PASSENGER_WALK_SPEED, ENTRY_WALK_START, EXIT_WALK_START, ARRIVAL_STOP_TIME } = journey;
const { computeNumRows, getSeatRowZ, getNearestBusDoor, getBusDoors } = layout;

const maxWalks = [];
for (const count of [24, 32, 36, 100, 500, 1000]) {
  const rows = computeNumRows(count);
  let maxWalk = 0;
  for (let row = 0; row < rows; row++) {
    const seatZ = getSeatRowZ(row);
    const door = getNearestBusDoor(seatZ, rows);
    const doors = getBusDoors(rows);
    assert(doors.every(other => Math.abs(seatZ - door.z) <= Math.abs(seatZ - other.z) + 1e-9), "Boarding must choose the nearest available door.");
    assert(Math.abs(seatZ - door.z) < 10, "A visitor must never traverse the entire expanding cabin.");
    const timing = getJourneyTiming(seatZ, door);
    const path = getPassengerWalkPath(seatZ, door);
    assert.equal(path[0].z, door.z);
    assert.equal(path[1].z, door.z);
    assert.equal(path[path.length - 1].z, seatZ);
    maxWalk = Math.max(maxWalk, timing.walkDistance);
    for (const phase of ["entering", "exiting"]) {
      const state = createJourneyState();
      beginJourney(state, phase, seatZ, door);
      const start = phase === "entering" ? ENTRY_WALK_START : EXIT_WALK_START;
      const end = phase === "entering" ? timing.entrySitStart : timing.exitWalkEnd;
      const duration = end - start;
      const expected = timing.walkDistance / (duration * 0.92);
      assert(expected <= PASSENGER_WALK_SPEED + 1e-9, "Long routes must extend time rather than speed up the avatar.");
      const dt = 1 / 240;
      updateJourney(state, phase, start + duration * 0.1, seatZ, 1, door);
      const previous = state.position.clone();
      const speeds = [];
      for (let time = start + duration * 0.1 + dt; time < start + duration * 0.9; time += dt) {
        updateJourney(state, phase, time, seatZ, 1, door);
        speeds.push(state.position.distanceTo(previous) / dt);
        previous.copy(state.position);
        assert(state.doorOpen && state.drive < 1e-9, "The bus stays stopped with the selected door open during walking.");
        assert.equal(state.doorIndex, door.index);
      }
      assert(speeds.every(speed => Number.isFinite(speed) && speed <= expected * 1.01), "Movement must remain finite and within the walking speed cap.");
      assert(speeds.filter(speed => Math.abs(speed / expected - 1) < 0.02).length > speeds.length * 0.95, "The stairs and aisle must share a steady cruising speed.");
      const finish = phase === "entering" ? timing.entryDuration : timing.exitDuration;
      updateJourney(state, phase, finish, seatZ, 1, door);
      assert(state.completed);
      if (phase === "entering") {
        assert.equal(state.sitting, 1);
        assert.equal(state.cameraBlend, 1);
      }
    }
  }
  maxWalks.push({ count, rows, maxWalk: Number(maxWalk.toFixed(3)) });
}

// Une nouvelle inscription n'altère ni l'ouverture sélectionnée ni la place
// pendant que l'avatar monte les marches. Un nouveau trajet peut les choisir.
const seatZ = getSeatRowZ(100);
const door = getNearestBusDoor(seatZ, 125);
const state = createJourneyState();
beginJourney(state, "entering", seatZ, door);
const timing = state.timing;
updateJourney(state, "entering", ARRIVAL_STOP_TIME + 0.1, seatZ, 1, door);
const otherDoor = getNearestBusDoor(getSeatRowZ(249), 250);
updateJourney(state, "entering", ENTRY_WALK_START + 0.1, getSeatRowZ(249), 1, otherDoor);
assert.equal(state.doorZ, door.z);
assert.equal(state.doorIndex, door.index);
assert.equal(state.seatZ, seatZ);
assert.equal(state.timing, timing);
updateJourney(state, "entering", timing.entryDuration, getSeatRowZ(249), 1, otherDoor);
assert.equal(state.position.z, seatZ, "The avatar must finish in the seat selected at departure.");
beginJourney(state, "exiting", getSeatRowZ(249), otherDoor);
assert.equal(state.doorIndex, otherDoor.index, "A later exit chooses its own closest door.");
assert.equal(state.waitingForSeat, false);

// Le vestibule peut coïncider avec le Z du siège dans les tests et diagnostics.
// Le segment d'allée de longueur nulle ne doit pas produire de NaN.
beginJourney(state, "entering", otherDoor.z, otherDoor);
for (let time = ENTRY_WALK_START; time <= state.timing.entryDuration; time += 0.01) {
  updateJourney(state, "entering", time, otherDoor.z, 1, otherDoor);
  assert(Number.isFinite(state.position.x + state.position.y + state.position.z + state.heading));
}
console.log("Nearest-door boarding and fixed walking pace passed:", JSON.stringify(maxWalks));
