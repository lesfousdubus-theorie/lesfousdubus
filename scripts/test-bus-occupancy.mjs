import assert from "node:assert/strict";
import { build } from "esbuild";

async function load(path) {
  const compiled = await build({ entryPoints: [path], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
}
const { getBusOccupancy, getAvatarSeat, getPhysicalSeat, getVisitorRows, getBusPhysicalRows, PERMANENT_NAKAMA_COUNT, PASSENGER_SEAT_X } = await load("src/lib/bus-occupancy.ts");
const { getRenderedRowIndices, getNearestBusDoor, getSeatRowZ } = await load("src/lib/bus-layout.ts");
const { NAKAMA_ROSTER } = await load("src/components/bus/passenger-archetypes.ts");
const { BUS_CREW, BUS_NAKAMA_SEATS, countPeopleOnBoard } = await load("src/lib/bus-crew.ts");
const { createJourneyState, beginJourney, updateJourney } = await load("src/lib/bus-journey.ts");
assert.equal(BUS_NAKAMA_SEATS, NAKAMA_ROSTER.length);
assert.equal(PERMANENT_NAKAMA_COUNT, 20);
assert.equal(countPeopleOnBoard(0), BUS_NAKAMA_SEATS + BUS_CREW.length, "The permanent models and three guides must all count independently of database visitors.");

const check = options => {
  const result = getBusOccupancy(options);
  const people = [...result.detailed, ...result.simplified];
  if (options.avatarAboard) people.push({ physicalSeatIndex: result.avatar.physicalSeatIndex, seat: result.avatar.seat, passengerKind: "avatar" });
  const indices = people.map(person => person.physicalSeatIndex);
  assert.equal(new Set(indices).size, indices.length, "Each mounted character or avatar must occupy a distinct real slot.");
  const benches = new Map();
  for (const person of people) {
    const key = `${person.seat.row}:${person.seat.seatInRow < 2 ? "left" : "right"}`;
    benches.set(key, (benches.get(key) ?? 0) + 1);
    assert.equal(person.seat.x, PASSENGER_SEAT_X[person.seat.seatInRow]);
    assert(person.physicalSeatIndex >= 0 && person.physicalSeatIndex < result.numRows * 4);
  }
  assert([...benches.values()].every(count => count <= 2), "No bench may contain a third figure, including the current avatar.");
  assert.equal(result.detailed.filter(person => person.passengerKind === "nakama").length, BUS_NAKAMA_SEATS);
  assert(result.detailed.length <= BUS_NAKAMA_SEATS + (options.lowPower ? 2 : 8));
  assert(result.simplified.length <= 160);
  return result;
};
const base = { passengerCount: 4, seatCapacity: 4, reservedRow: 0, currentPassengerIndex: 0, avatarAboard: true, lowPower: false };
const first = check(base);
assert.equal(first.avatar.seat.x, -0.94, "The assigned first visitor uses the left outer slot instead of joining Nami and Usopp on the right bench.");
assert.deepEqual(first.detailed.filter(person => person.passengerKind === "visitor").map(person => person.index).sort(), [1, 2, 3]);
const occupiedBase = { ...base, passengerCount: 16, seatCapacity: 16 };
const moved = check({ ...occupiedBase, reservedRow: 1 });
const swapped = moved.detailed.find(person => person.passengerKind === "visitor" && person.index === 4);
assert(swapped && swapped.physicalSeatIndex === 0, "Moving to an occupied local slot swaps its visitor into the avatar's original place.");
assert.equal(swapped.index, 4, "Local relocation must preserve the visitor's persistent database identity.");
const crewRow = getVisitorRows(16);
const withCrew = check({ ...occupiedBase, reservedRow: crewRow });
assert.equal(withCrew.detailed.find(person => person.passengerKind === "nakama" && person.index === 0).physicalSeatIndex, 0, "A permanent model can swap locally too, without overlapping the avatar.");
const restored = check(occupiedBase);
assert.equal(restored.detailed.find(person => person.passengerKind === "nakama" && person.index === 0).physicalSeatIndex, crewRow * 4);
assert.equal(restored.detailed.find(person => person.passengerKind === "visitor" && person.index === 4).physicalSeatIndex, 4);

for (const seatCapacity of [0, 4, 16, 24, 25, 500, 1000, 100_000]) for (const lowPower of [false, true]) {
  const numRows = getBusPhysicalRows(seatCapacity);
  for (const row of [0, Math.max(0, getVisitorRows(seatCapacity) - 1), getVisitorRows(seatCapacity), numRows - 1]) {
    const renderedRowIndices = getRenderedRowIndices(numRows, row);
    check({ passengerCount: seatCapacity, seatCapacity, reservedRow: row, currentPassengerIndex: seatCapacity ? seatCapacity - 1 : null, avatarAboard: true, lowPower, renderedRowIndices });
    check({ passengerCount: seatCapacity, seatCapacity, reservedRow: row, currentPassengerIndex: null, avatarAboard: true, lowPower, renderedRowIndices });
  }
}
const empty = check({ ...base, passengerCount: 0, seatCapacity: 0, currentPassengerIndex: null, avatarAboard: false });
assert.equal(empty.detailed.length, BUS_NAKAMA_SEATS, "All existing models appear before any actual visitor has joined.");
assert(empty.detailed.every(person => person.passengerKind === "nakama"));
for (let capacity = 0; capacity <= 32; capacity++) {
  const packed = check({ ...base, passengerCount: capacity, seatCapacity: capacity, currentPassengerIndex: null, avatarAboard: false });
  const seats = [...packed.detailed,...packed.simplified].map(person=>person.physicalSeatIndex).sort((a,b)=>a-b);
  assert.deepEqual(seats,Array.from({length:capacity+BUS_NAKAMA_SEATS},(_,index)=>index),
    "The permanent crew immediately follows visitor slots, with no empty row inserted between them.");
  assert.equal(getAvatarSeat(capacity,0,null).originSeatIndex,capacity+BUS_NAKAMA_SEATS,
    "The fallback seat belongs after the permanent crew.");
}
const outside = check({...base,avatarAboard:false});
assert.equal(outside.detailed.filter(person=>person.passengerKind==="visitor").length,4,
  "A stored visitor is hidden only when the boarding avatar actually represents them.");
check({ ...base, passengerCount: 3, seatCapacity: 8, currentPassengerIndex: 1, vacantSeatRanges: [[0, 0, 0], [4, 7, 1]], reservedRow: 0 });

const sparse = check({ ...base, passengerCount: 50000, seatCapacity: 100000, currentPassengerIndex: null, avatarAboard: false, vacantSeatRanges: [[0, 49999, 0]] });
assert(sparse.detailed.filter(person => person.passengerKind === "visitor").every(person => person.index >= 50000), "Sparse layout candidates must come from occupied visitor slots.");
const hugeDefault = check({ ...base, passengerCount: 100000000, seatCapacity: 100000000, avatarAboard: false, currentPassengerIndex: null });
assert(hugeDefault.detailed.length + hugeDefault.simplified.length <= BUS_NAKAMA_SEATS + 8 + 160, "Default row virtualization must stay bounded even without a supplied list.");

for (let column = 0; column < 4; column++) {
  const avatar = getAvatarSeat(1000, 249, column);
  assert.equal(avatar.seat.x, PASSENGER_SEAT_X[column]);
  const state = createJourneyState(), door = getNearestBusDoor(avatar.seat.z, getBusPhysicalRows(1000));
  beginJourney(state, "entering", avatar.seat.z, door, avatar.seat.x);
  updateJourney(state, "entering", state.timing.entryDuration, getSeatRowZ(0), 1, undefined, 0.72);
  assert(Math.abs(state.position.x - avatar.seat.x) < 1e-9 && Math.abs(state.position.z - avatar.seat.z) < 1e-9,
    "The locked boarding path must end in the assigned column even if props subsequently change.");
  updateJourney(state, "inside", 0, avatar.seat.z, 1, undefined, avatar.seat.x);
  assert.equal(state.position.x, getPhysicalSeat(avatar.physicalSeatIndex).x);
}
console.log("Bus occupancy passed: all 20 permanent models, unchanged visitor IDs, real avatar columns, local visitor/NPC swaps, max two per bench, sparse vacancies and bounded rendering through 100000 visitors.");
