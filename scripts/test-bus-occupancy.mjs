import assert from "node:assert/strict";
import { build } from "esbuild";
import { PerspectiveCamera } from "three";

async function load(path) {
  const compiled = await build({ entryPoints: [path], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
}
const { getBusOccupancy, getVisibleBusRowRange, getAvatarSeat, getPhysicalSeat, getVisitorRows, getBusPhysicalRows, getRegisteredSeat, getRegisteredSeatIndex, PASSENGER_SEAT_X } = await load("src/lib/bus-occupancy.ts");
const { getRenderedRowIndices, getNearestBusDoor, getSeatCountInRow, getSeatRowZ, getBusDoors, getBusRearWallZ, getBusDoorBounds, getWheelPositions } = await load("src/lib/bus-layout.ts");
const { BUS_CREW, countPeopleOnBoard } = await load("src/lib/bus-crew.ts");
const { createJourneyState, beginJourney, getPassengerWalkPath, updateJourney } = await load("src/lib/bus-journey.ts");
assert.equal(BUS_CREW.length, 3);
assert.equal(countPeopleOnBoard(0), 0, "Permanent crew at the front is not counted in passenger total.");
assert.equal(countPeopleOnBoard(2), 2, "Passenger count starts from visitor #1 without adding crew.");

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
    assert(person.seat.seatInRow < getSeatCountInRow(person.seat.row), "Nobody occupies the door-side steps.");
    assert(person.physicalSeatIndex >= 0 && person.physicalSeatIndex < result.numRows * 4);
  }
  assert([...benches.values()].every(count => count <= 2), "No bench may contain a third figure, including the current avatar.");
  assert(people.every(person => person.passengerKind === "visitor" || person.passengerKind === "avatar"), "No artificial passenger may be spawned.");
  assert(result.detailed.length <= (options.lowPower ? 2 : 8));
  assert(result.simplified.length <= 160);
  return result;
};
const base = { passengerCount: 4, seatCapacity: 4, reservedRow: 0, currentPassengerIndex: 0, avatarAboard: true, lowPower: false };
const first = check(base);
assert.equal(first.avatar.seat.x, -0.94, "The assigned first visitor uses the left outer slot.");
assert.deepEqual(first.detailed.filter(person => person.passengerKind === "visitor").map(person => person.index).sort(), [1, 2, 3]);
const occupiedBase = { ...base, passengerCount: 16, seatCapacity: 16 };
for(const lowPower of [false,true])for(const row of [0,1,3])for(const x of [-.72,.72]){
  const options={...occupiedBase,currentPassengerIndex:null,avatarAboard:false,lowPower,reservedRow:3,
    detailFocus:{x,z:getSeatRowZ(row)}};
  const focused=check(options),firstSeat=row*4+(x<0?0:2);
  assert([firstSeat,firstSeat+1].every(seat=>focused.detailed.some(person=>person.physicalSeatIndex===seat)),
    "A nearby bench has both complete costumes before boarding, independent of the reserved row and device budget.");
}
const moved = check({ ...occupiedBase, reservedRow: 1 });
const swapped = moved.detailed.find(person => person.passengerKind === "visitor" && person.index === 4);
assert(swapped && swapped.physicalSeatIndex === 0, "Moving to an occupied local slot swaps its visitor into the avatar's original place.");
assert.equal(swapped.index, 4, "Local relocation must preserve the visitor's persistent database identity.");
for (let column = 0; column < 4; column++) {
  const lateral = check({ ...occupiedBase, reservedRow: 1, reservedColumn: column });
  assert.equal(lateral.avatar.physicalSeatIndex, 4 + column, `Selecting lateral seat column ${column} places the avatar at slot ${4 + column}.`);
  assert.equal(lateral.avatar.seat.x, PASSENGER_SEAT_X[column], `Lateral column ${column} uses seat X coordinate ${PASSENGER_SEAT_X[column]}.`);
}
const emptyRow = getVisitorRows(16);
const movedToEmpty = check({ ...occupiedBase, reservedRow: emptyRow });
assert.equal(movedToEmpty.avatar.physicalSeatIndex, emptyRow * 4);
assert([...movedToEmpty.detailed, ...movedToEmpty.simplified].every(person => person.physicalSeatIndex === person.index), "Choosing an empty row must not create or relocate another person.");
const restored = check(occupiedBase);
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
assert.equal(empty.detailed.length, 0, "No visitor model appears before an actual visitor has joined.");
assert.equal(empty.simplified.length, 0);
const twoVisitors = check({ ...base, passengerCount: 2, seatCapacity: 2, currentPassengerIndex: null, avatarAboard: false });
assert.deepEqual(twoVisitors.detailed.map(person => person.index), [0, 1], "Only the two persisted visitors appear in the passenger area.");
for (let capacity = 0; capacity <= 32; capacity++) {
  const packed = check({ ...base, passengerCount: capacity, seatCapacity: capacity, currentPassengerIndex: null, avatarAboard: false });
  const seats = [...packed.detailed,...packed.simplified].map(person=>person.physicalSeatIndex).sort((a,b)=>a-b);
  assert.deepEqual(seats,Array.from({length:capacity},(_,index)=>index),
    "Every visitor keeps their persistent slot, with no additional default passengers.");
  assert.equal(getAvatarSeat(capacity,0,null).originSeatIndex,capacity,
    "The fallback seat follows the registered slots without reserving an NPC block.");
  assert.equal(getBusPhysicalRows(capacity), Math.max(6, Math.ceil((capacity + 1) / 4)), "The bus reserves only visitor rows and one fallback slot.");
}

// A 34-seat section has eight full rows followed by two places opposite its door.
const longCapacity = 104;
const longRows = getBusPhysicalRows(longCapacity);
const longBus = check({ ...base, passengerCount: longCapacity, seatCapacity: longCapacity, currentPassengerIndex: null, avatarAboard: false });
assert.equal(longBus.detailed.length + longBus.simplified.length, longCapacity);
for (const person of [...longBus.detailed, ...longBus.simplified]) {
  assert.equal(getRegisteredSeatIndex(person.seat.row, person.seat.seatInRow), person.index);
  const registered = getRegisteredSeat(person.index);
  assert.deepEqual(registered, { row: person.seat.row, column: person.seat.seatInRow });
}
for (const door of getBusDoors(longRows).slice(1)) {
  const occupants = [...longBus.detailed, ...longBus.simplified].filter(person => person.seat.z === door.z);
  assert.deepEqual(occupants.map(person => person.seat.x).sort((a, b) => a - b), [-0.94, -0.5]);
  assert.deepEqual(getNearestBusDoor(door.z, longRows), door);
  for (const { seat } of occupants) {
    const path = getPassengerWalkPath(seat.z, door, seat.x);
    assert.equal(path[0].z, door.z, "The visitor enters through the door opposite their bench.");
    assert(path.some(point => point.x === 0 && point.z === door.z), "The path reaches the aisle before turning into the bench.");
    assert.deepEqual(path.at(-1).toArray(), [seat.x, .64, seat.z]);
  }
}
const vestibuleSwap = check({ ...base, passengerCount: longCapacity, seatCapacity: longCapacity, reservedRow: 8, reservedColumn: 3 });
assert.equal(vestibuleSwap.avatar.seat.seatInRow, 1, "The avatar stays on the bench across from the door.");
assert([...vestibuleSwap.detailed, ...vestibuleSwap.simplified].some(person => person.index === 33 && person.physicalSeatIndex === 0),
  "The displaced visitor keeps their database identity and moves to the avatar's original seat.");
assert.deepEqual(getRegisteredSeat(34), { row: 9, column: 0 }, "Seats resume on both sides after a vestibule.");

for (const numRows of [6, 9, 10, 18, 37, 1000]) {
  const doors = getBusDoors(numRows), rearWall = getBusRearWallZ(numRows);
  const positions = getWheelPositions(rearWall, doors);
  assert.equal(positions.length, 4, "Extending the bus preserves two axles and creates no middle wheels.");
  const axleZs = [...new Set(positions.map(([, z]) => z))];
  assert.equal(axleZs.length, 2);
  for (const z of axleZs) for (const door of doors) {
    const { frontZ, rearZ } = getBusDoorBounds(door);
    assert(z + .66 < frontZ || z - .66 > rearZ, "The wheel keeps each door well open.");
  }
}
const outside = check({...base,avatarAboard:false});
assert.deepEqual(outside.detailed.map(person=>person.index).sort(),[1,2,3],
  "A local visitor who has left must not respawn as a seated registry passenger.");
for (const lowPower of [false,true]) {
  const departed=check({...occupiedBase,avatarAboard:false,lowPower,reservedRow:1});
  assert([...departed.detailed,...departed.simplified].every(person=>person.index!==0),
    "The departed visitor stays absent in both detailed and instanced rendering.");
}
check({ ...base, passengerCount: 3, seatCapacity: 8, currentPassengerIndex: 1, vacantSeatRanges: [[0, 0, 0], [4, 7, 1]], reservedRow: 0 });

const sparse = check({ ...base, passengerCount: 50000, seatCapacity: 100000, currentPassengerIndex: null, avatarAboard: false, vacantSeatRanges: [[0, 49999, 0]] });
assert(sparse.detailed.filter(person => person.passengerKind === "visitor").every(person => person.index >= 50000), "Sparse layout candidates must come from occupied visitor slots.");
const hugeDefault = check({ ...base, passengerCount: 100000000, seatCapacity: 100000000, avatarAboard: false, currentPassengerIndex: null });
assert(hugeDefault.detailed.length + hugeDefault.simplified.length <= 8 + 160, "Default row virtualization must stay bounded even without a supplied list.");

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

  beginJourney(state,"entering",avatar.seat.z,door,avatar.seat.x,true);
  for(let time=0;time<=state.timing.entryDuration+0.1;time+=0.1){
    updateJourney(state,"entering",time,0,1,undefined,0.72);
    assert.equal(state.sitting,1);
    assert.equal(state.walking,false);
    assert.equal(state.avatarVisible,true);
    assert.equal(state.doorOpen,false);
    assert.deepEqual(state.position.toArray(),[avatar.seat.x,0.64,avatar.seat.z],
      "An already seated visitor must never teleport to the pavement while the camera boards.");
  }
  assert.equal(state.completed,true);
  beginJourney(state,"exiting",avatar.seat.z,door,avatar.seat.x);
  assert.equal(state.entryFromSeat,false,"Exiting still uses the real door after a seated entry.");
  updateJourney(state,"exiting",state.timing.exitWalkEnd,avatar.seat.z,1,door,avatar.seat.x);
  assert.deepEqual(state.position.toArray(),[3.3,0,door.z]);
  beginJourney(state,"entering",avatar.seat.z,door,avatar.seat.x);
  assert.equal(state.entryFromSeat,false,"Reboarding after leaving must restore the walking entry.");
}

// Champ de vision caméra : masquer hors champ, conserver 100 % des sièges visibles même au loin.
const frustumCam = new PerspectiveCamera(55, 16 / 9, 0.2, 2000);
frustumCam.position.set(120, 35, 35);
frustumCam.lookAt(0, 1.9, 35);
const farRows = getBusPhysicalRows(240);
const farVisibleRange = getVisibleBusRowRange(frustumCam, null, farRows);
assert.equal(farVisibleRange.minRow, 0, "Far overview includes the front row");
assert.equal(farVisibleRange.maxRow, farRows - 1, "Far overview includes the rear row");
const preservedFar = getBusOccupancy({
  passengerCount: 240,
  seatCapacity: 240,
  reservedRow: 3,
  currentPassengerIndex: null,
  avatarAboard: false,
  lowPower: true,
  detailLimit: 2,
  simplifiedLimit: 120,
  visibleRowRange: farVisibleRange,
  preserveVisibleSeats: true,
});
assert.equal(
  preservedFar.detailed.length + preservedFar.simplified.length,
  240,
  "All visible passengers remain seated when zoomed out even above simplifiedLimit",
);

frustumCam.position.set(0, 1.85, getSeatRowZ(20));
frustumCam.lookAt(0, 1.85, -4);
const forwardRange = getVisibleBusRowRange(frustumCam, null, farRows);
assert(forwardRange.minRow === 0 && forwardRange.maxRow <= 22, "Rows behind the camera are culled");

frustumCam.position.set(0, 4, -30);
frustumCam.lookAt(0, 4, -200);
const offscreenRange = getVisibleBusRowRange(frustumCam, null, farRows);
assert(offscreenRange.minRow > offscreenRange.maxRow, "Bus completely outside view produces empty range");
const hiddenOffscreen = getBusOccupancy({
  passengerCount: 240,
  seatCapacity: 240,
  reservedRow: 3,
  currentPassengerIndex: null,
  avatarAboard: false,
  lowPower: false,
  visibleRowRange: offscreenRange,
  preserveVisibleSeats: true,
});
assert.equal(hiddenOffscreen.detailed.length + hiddenOffscreen.simplified.length, 0, "Offscreen passengers are hidden");

console.log("Bus occupancy passed: no artificial passengers, unchanged visitor IDs, real avatar columns, local visitor swaps, max two per bench, sparse vacancies and bounded rendering through 100000000 visitors.");
