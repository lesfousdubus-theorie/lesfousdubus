import assert from "node:assert/strict";
import { build } from "esbuild";
import * as THREE from "three";

async function load(path) {
  const compiled = await build({ entryPoints: [path], bundle: true, format: "esm", platform: "node", packages: "external", write: false, logLevel: "silent" });
  // Le module temporaire doit rester sous le dépôt pour résoudre three.
  const { writeFile, unlink } = await import("node:fs/promises");
  const { pathToFileURL } = await import("node:url");
  const { resolve } = await import("node:path");
  const temporary = resolve(`scripts/.vehicle-check-${process.pid}-${Math.random().toString(16).slice(2)}.mjs`);
  await writeFile(temporary, compiled.outputFiles[0].text);
  try { return await import(pathToFileURL(temporary).href); }
  finally { await unlink(temporary); }
}

const { createLowerBodyGeometry, WHEEL_RADIUS, WHEEL_ARCH_RADIUS } = await load("src/components/bus/BusBodyGeometry.ts");
const { getSeatRowZ, getBusRearWallZ, BUS_DOOR, BUS_FRONT_Z, DOOR_FRONT_Z, DOOR_REAR_Z, splitAtDoor, CREW_SEATS, ENTRY_SEAT_POSITION, SEAT_CUSHION_DEPTH, SEAT_CUSHION_Z, SEAT_BASE_DEPTH } = await load("src/lib/bus-layout.ts");
const { ENTRY_STEPS, getEntryStepPose } = await load("src/lib/bus-door.ts");
const { getWalkingLegPose, THIGH_LENGTH, SHIN_LENGTH, STANDING_HIP_HEIGHT, SEATED_HIP_HEIGHT, SEATED_HIP_Z, CABIN_FLOOR_Y } = await load("src/lib/passenger-gait.ts");
const { createDprSample, sampleSceneDpr } = await load("src/lib/scene-performance.ts");
const { getCharacterShape } = await load("src/components/bus/CharacterShapes.tsx");
const { encodeLedText, DESTINATION_MESSAGE, LED_COLUMNS, getLedOffset, GRAND_LINE_STOPS, getRandomDestinationStart, getDestinationStartOffset } = await load("src/lib/bus-destinations.ts");
const { getExteriorMaxDistance, getBusCameraFar, obstructsBusView } = await load("src/lib/bus-camera.ts");
const {createJourneyState,updateJourney,getPassengerWalkPath,getJourneyTiming,ENTRY_WALK_START,EXIT_WALK_START,ARRIVAL_STOP_TIME}=await load("src/lib/bus-journey.ts");
const { BUS_CREW, BUS_RELAY, BUS_NAKAMA_SEATS, countPeopleOnBoard } = await load("src/lib/bus-crew.ts");
const {createPassengerPose,samplePassengerPose,blendPassengerPose,getHighFiveArm}=await load("src/lib/passenger-motion.ts");
const {NAKAMA_ROSTER}=await load("src/components/bus/passenger-archetypes.ts");
const signatures=[...NAKAMA_ROSTER.map(character=>character.id),"foudubustv","kamal","kyta"];
for(const party of [false,true]) {
  const distinct=new Set();
  for(const id of signatures) {
    const sequence=[];
    for(const time of [0,.2,.6,1,2,5,9]) {
      const p=createPassengerPose();samplePassengerPose(p,time,0,0,.34,.5,party,false,id);
      assert(p.celebrating&&p.gesture===id,`${id} must have its own horn and party signature.`);
      assert(Object.values(p).filter(value=>typeof value==='number').every(Number.isFinite));
      assert(p.rightKick>=0&&p.rightKick<=.45&&p.bob>=0&&p.bob<.04,'Kicks and bounce stay bounded to the seat.');
      sequence.push([p.leftX,p.rightX,p.leftZ,p.rightZ,p.leftElbowX,p.rightElbowX,p.rightKick]);
    }
    distinct.add(JSON.stringify(sequence));
    const a=createPassengerPose(),b=createPassengerPose();
    samplePassengerPose(a,0,0,0,.34,Infinity,true,true,id);samplePassengerPose(b,19,0,0,.34,Infinity,true,true,id);
    assert.deepEqual(a,b,`${id} keeps an intentional fixed signature in reduced motion.`);
  }
  assert.equal(distinct.size,signatures.length,'All sixteen characters and the three guides must have different choreographies.');
}
for(const width of [.30,.34,.36,.38])for(const side of [-1,1]){
  const {shoulder,elbow}=getHighFiveArm(side,width);
  const x=side*(width/2-.018)+.20*Math.sin(shoulder)+.22*Math.sin(shoulder+elbow);
  const y=-.20*Math.cos(shoulder)-.22*Math.cos(shoulder+elbow);
  assert(Math.abs(x-side*.22)<1e-8&&Math.abs(y-.20)<1e-8,"Neighbour greetings must place both hands at the middle of the same bench.");
}
for(let t=0;t<80;t+=.03)for(const mode of ["normal","horn","party","reduced"]){
  const pose=createPassengerPose();samplePassengerPose(pose,t,3,-1,.34,mode==='horn'?.5:Infinity,mode==='party',mode==='reduced');
  assert(Object.values(pose).filter(value=>typeof value==='number').every(Number.isFinite),"Every social/party joint must remain finite.");
  assert(pose.bob>=0&&pose.bob<.04,"Celebrations must never sink the seated feet below the floor or float far above it.");
  if(mode==='horn'||mode==='party')assert(pose.celebrating&&pose.leftX>2&&pose.rightX>2,"Horn and party reactions must raise both arms.");
  if(mode==='reduced')assert(pose.bob===0&&pose.rootYaw===0&&pose.headPitch===0&&!pose.games,"Reduced motion must suppress idle gestures and games.");
}
const reducedA=createPassengerPose(),reducedB=createPassengerPose();
samplePassengerPose(reducedA,1,2,1,.34,Infinity,true,true);samplePassengerPose(reducedB,20,2,1,.34,Infinity,true,true);
assert.deepEqual(reducedA,reducedB,"Reduced-motion celebrations must use a fixed pose.");
const settle=createPassengerPose(),raised=createPassengerPose();samplePassengerPose(raised,2,0,1,.34,Infinity,true,false);
blendPassengerPose(settle,raised,1/60,false);assert(settle.leftX>.12&&settle.leftX<raised.leftX,"Gesture changes must ease into their target pose.");
assert.deepEqual(BUS_CREW.map(member=>member.name),["Kamal","Kyta","FoudubusTV"],"The relay must be credited as permanent crew after the two guides.");
assert.equal(BUS_RELAY.url,"https://x.com/FoudubusTV_");
assert.equal(BUS_NAKAMA_SEATS,NAKAMA_ROSTER.length,"Every permanent model needs its own physical place.");
assert.equal(countPeopleOnBoard(0),BUS_CREW.length+BUS_NAKAMA_SEATS,"An empty visitor list still includes the guides and all permanent models.");
assert.equal(countPeopleOnBoard(12),12+BUS_CREW.length+BUS_NAKAMA_SEATS,"Permanent models must not consume or renumber registered visitor seats.");

for (const rows of [6, 10, 180, 2000]) {
  const rearWall = getBusRearWallZ(rows);
  const length = rearWall + 4.6;
  const center = (-4.6 + rearWall) / 2;
  const wheels = [-4.3, rearWall - 1.6];
  if (rows >= 10) wheels.push(center);
  const geometry = createLowerBodyGeometry(length, wheels.map(z => z - center));
  const positions = geometry.getAttribute("position");
  for (const value of positions.array) assert(Number.isFinite(value), "Body vertices must stay finite, including a clipped front arch.");
  const panel = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  panel.position.z = center;
  panel.updateMatrixWorld();
  const ray = new THREE.Raycaster();
  for (const z of wheels) {
    ray.set(new THREE.Vector3(2, 0.9, z), new THREE.Vector3(-1, 0, 0));
    assert.equal(ray.intersectObject(panel).length, 0, "Bodywork must not cover the upper part of a tyre.");
    ray.set(new THREE.Vector3(2, 1.5, z), new THREE.Vector3(-1, 0, 0));
    assert(ray.intersectObject(panel).length > 0, "The panel must remain closed above the wheel arch.");
  }
  assert(WHEEL_ARCH_RADIUS - WHEEL_RADIUS >= 0.1, "The arch needs clearance for its bevel and the tyre.");
  assert(getExteriorMaxDistance(length) >= 140, "Small buses must allow much more than the former 32-unit retreat.");
  assert(getBusCameraFar(length) > getExteriorMaxDistance(length) + length, "The longer retreat must not clip the bus at high capacities.");
  geometry.dispose();
  panel.material.dispose();
}

// La baie droite est réellement vide sur toute la hauteur d'un piéton.
const rearWall = getSeatRowZ(6);
const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const panels = splitAtDoor(BUS_FRONT_Z, rearWall).map(([from, to]) => {
  const center = (from + to) / 2;
  const panel = new THREE.Mesh(createLowerBodyGeometry(to - from, [-4.3, rearWall - 1.6].map(z => z - center)), material);
  panel.position.set(BUS_DOOR.x, 0, center);
  panel.updateMatrixWorld();
  return panel;
});
const ray = new THREE.Raycaster();
for (const y of [0.7, 1, 1.5]) for (const z of [DOOR_FRONT_Z + 0.12, BUS_DOOR.z, DOOR_REAR_Z - 0.12]) {
  ray.set(new THREE.Vector3(2, y, z), new THREE.Vector3(-1, 0, 0));
  assert.equal(ray.intersectObjects(panels).length, 0, "The doorway must be an actual opening, including near both jambs.");
}
for (const [name, [x, , z]] of Object.entries(CREW_SEATS)) {
  const overlapsEntrance = x + 0.42 > BUS_DOOR.innerX && z + 0.39 > DOOR_FRONT_Z && z - 0.34 < DOOR_REAR_Z;
  assert(!overlapsEntrance, `${name}'s seat must not occupy the stairwell, including its back and armrest.`);
}
assert.equal(CREW_SEATS.kamal[2],CREW_SEATS.kyta[2],"The two guides must sit side by side.");
assert(CREW_SEATS.kamal[0]<-0.7&&CREW_SEATS.kyta[0]>0.7,"Both guides must sit near their respective window.");
assert(ENTRY_SEAT_POSITION[0] + 0.34 < -0.45, "The extra chair must leave the center aisle clear.");
assert(ENTRY_SEAT_POSITION[2] - 0.34 > CREW_SEATS.kamal[2] + 0.39, "The chair must clear the navigator's backrest.");
assert(ENTRY_SEAT_POSITION[2] + 0.36 < getSeatRowZ(0) - 0.35, "The chair must clear the first passenger row.");
assert(Math.abs(0.64 + SEATED_HIP_HEIGHT - SHIN_LENGTH - 0.08 - CABIN_FLOOR_Y) < 1e-8, "Seated shoes must meet the cabin floor.");
const calfRear = SEATED_HIP_Z - THIGH_LENGTH + 0.06;
assert(SEAT_CUSHION_Z - SEAT_CUSHION_DEPTH / 2 > calfRear + 0.02, "The cushion must leave clearance behind the seated calves.");
assert(SEAT_CUSHION_Z - SEAT_BASE_DEPTH / 2 > calfRear + 0.02, "The seat base must not conceal or intersect the lower legs.");
assert(SEAT_CUSHION_Z - SEAT_CUSHION_DEPTH / 2 < SEATED_HIP_Z - 0.1, "The shortened cushion must still support the pelvis.");
for (const row of [0, 3, 20]) for (const phase of ["entering", "exiting"]) {
  const state = createJourneyState(), seatZ = getSeatRowZ(row), path = getPassengerWalkPath(seatZ);
  const distance = path.slice(1).reduce((sum, point, index) => sum + point.distanceTo(path[index]), 0);
  const timing = getJourneyTiming(seatZ);
  const start = phase === "entering" ? ENTRY_WALK_START : EXIT_WALK_START;
  const end = phase === "entering" ? timing.entrySitStart : timing.exitWalkEnd;
  const duration = end - start, dt = 1 / 240, expected = distance / (duration * .92);
  const speeds = [];
  updateJourney(state, phase, start + duration * .1, seatZ, 1);
  const previous = state.position.clone();
  for (let t = start + duration * .1 + dt; t < start + duration * .9; t += dt) {
    updateJourney(state, phase, t, seatZ, 1);
    speeds.push(previous.distanceTo(state.position) / dt);
    previous.copy(state.position);
  }
  assert(speeds.every(speed => speed > expected * .65 && speed < expected * 1.01), "Walking must never stop and restart at each stair or aisle segment.");
  assert(speeds.filter(speed => Math.abs(speed / expected - 1) < .02).length > speeds.length * .95, "Cruising walking speed must follow distance consistently in both directions.");
}
const journey=createJourneyState();
const journeyTiming=getJourneyTiming(getSeatRowZ(3));
for(const phase of ["entering","exiting"]){
  let crossed=false;
  const duration=phase==="entering"?journeyTiming.entryDuration:journeyTiming.exitDuration;
  for(let t=0;t<=duration;t+=0.01){
    updateJourney(journey,phase,t,getSeatRowZ(3),1);
    assert(Number.isFinite(journey.position.x+journey.position.y+journey.position.z));
    if(journey.walking){
      assert(journey.drive<1e-8,"The bus must be completely stopped while the passenger walks.");
      assert(journey.doorOpen,"Walking only starts once the door is open.");
    }
    if(journey.position.x>1.2&&journey.position.x<1.4){
      crossed=true;
      assert.equal(journey.position.z,BUS_DOOR.z,"The passenger must use the doorway.");
      assert(journey.doorOpen);
      assert(journey.position.y>=0.24,"Feet must climb the first step.");
    }
    if(phase==="entering"&&journey.cameraBlend>0)assert.equal(journey.sitting,1,"The camera can only join the head after the passenger sits down.");
    if(phase==="exiting"&&t>=EXIT_WALK_START&&t<=journeyTiming.exitWalkEnd)assert.equal(journey.cameraBlend,0,"Exiting must be observed from outside.");
    if(t<ARRIVAL_STOP_TIME)assert(!journey.doorOpen,"Doors must stay closed during braking.");
  }
  assert(crossed,"Both journeys must cross the doorway.");
  updateJourney(journey,phase,duration,getSeatRowZ(3),1);
  assert(journey.completed);
}
updateJourney(journey,"entering",journeyTiming.entryCameraTime,getSeatRowZ(3),1);
assert.equal(journey.sitting,1);
assert(journey.position.distanceTo(new THREE.Vector3(0.72,0.64,getSeatRowZ(3)))<1e-8);
assert(getSeatRowZ(0) - 0.35 > DOOR_REAR_Z + 0.3, "The first seat cushion needs clearance behind the entrance.");
assert(-4.3 + WHEEL_ARCH_RADIUS < DOOR_FRONT_Z, "The entrance must not overlap the front wheel arch.");
assert(BUS_DOOR.bottom >= 0.5, "Door leaves must end at the body sill.");
for (let index = 0; index < ENTRY_STEPS.length; index++) {
  const stowed = getEntryStepPose(index, 0), deployed = getEntryStepPose(index, 1);
  assert(stowed.x + ENTRY_STEPS[index].width / 2 < BUS_DOOR.x, "Retracted steps must fit inside the body.");
  assert(stowed.y - 0.08 >= BUS_DOOR.bottom, "Stowed steps must not hang beneath the sill.");
  assert.deepEqual(deployed, {x: ENTRY_STEPS[index].x, y: ENTRY_STEPS[index].y});
  assert.equal(getEntryStepPose(index, 0.3).y, stowed.y, "The first movement must be a level slide.");
}
for (let angle = 0; angle < Math.PI * 2; angle += 0.01) {
  const {upper, lower, ankle} = getWalkingLegPose(angle, STANDING_HIP_HEIGHT, 1);
  const footY = STANDING_HIP_HEIGHT - THIGH_LENGTH * Math.cos(upper) - SHIN_LENGTH * Math.cos(upper + lower);
  assert(footY >= 0.079, "A walking foot must never sink below the ground.");
  assert(Math.abs(footY - (0.08 + Math.max(0, Math.sin(angle)) * 0.11)) < 1e-6, "Knees must follow the lifted foot rather than remain rigid.");
  assert(Math.abs(upper + lower + ankle) < 1e-8, "The shoe must stay level during the stride.");
}
for (const dt of [1/60, 0.6, 1.2]) {
  const sample = createDprSample(1);
  for(let time=0;time<24;time+=dt)sampleSceneDpr(sample,dt,1,0.75);
  assert.equal(sample.dpr,dt<0.02?1:0.75,"Very slow frames must reduce resolution; a stable 60 FPS must preserve it.");
  for(let frame=0;frame<60*40;frame++)sampleSceneDpr(sample,1/60,1,0.75);
  assert(sample.dpr>0.99,"Quality must recover after sustained smooth rendering.");
}
for(let sit=0;sit<=1;sit+=.01){
  const hip=STANDING_HIP_HEIGHT+(SEATED_HIP_HEIGHT-STANDING_HIP_HEIGHT)*sit;
  const pose=getWalkingLegPose(0,hip,0,sit);
  const footY=hip-THIGH_LENGTH*Math.cos(pose.upper)-SHIN_LENGTH*Math.cos(pose.upper+pose.lower);
  assert(Math.abs(footY-(.08-.01*sit))<1e-6,"Feet must remain planted throughout sitting and standing up.");
  if(sit>.99)assert(Math.abs(pose.upper-Math.PI/2)<.02&&Math.abs(pose.lower+Math.PI/2)<.02,"Sitting must align horizontal thighs and vertical shins.");
}
const idle = createDprSample(1);
for (const dt of [0,-1,NaN,Infinity])assert.equal(sampleSceneDpr(idle,dt,1,0.75),null);
assert.equal(idle.elapsed,0,"Invalid frame samples must not poison adaptation.");
const face = getCharacterShape([0.24, 0.27, 0.23], 0.038);
assert.equal(face, getCharacterShape([0.24, 0.27, 0.23], 0.038), "Repeated characters should share geometry.");
for (const attribute of ["position", "normal"]) assert([...face.getAttribute(attribute).array].every(Number.isFinite), "Rounded faces must have finite geometry and normals.");
const faceMesh = new THREE.Mesh(face, material);
faceMesh.updateMatrixWorld();
for (const x of [-0.055, 0.055]) {
  ray.set(new THREE.Vector3(x, 0.02, -1), new THREE.Vector3(0, 0, 1));
  assert(ray.intersectObject(faceMesh)[0].point.z > -0.123, "Eye geometry must lie entirely in front of the skin.");
}
for (const panel of panels) panel.geometry.dispose();
material.dispose();

assert.deepEqual(GRAND_LINE_STOPS, [
  "Shells Town", "Orange Town", "Île de Gaimon", "Syrup Village", "Baratie", "Arlong Park",
  "Loguetown", "Cactus Island", "Little Garden", "Drum Island", "Alabasta", "Jaya", "Skypiea",
  "Long Ring Long Land", "Water 7", "Enies Lobby", "Thriller Bark", "Archipel Sabaody",
  "Île des Hommes-Poissons", "Punk Hazard", "Dressrosa", "Zou", "Whole Cake Island", "Wano",
  "Egghead", "Elbaf", "Lodestar", "Laugh Tale",
], "The board must follow the new 28-stop itinerary exactly.");
assert.deepEqual(encodeLedText("Île d'Amigasa"), encodeLedText("ILE D'AMIGASA"), "French names need complete readable glyphs.");
const columns = encodeLedText(DESTINATION_MESSAGE);
assert(columns.length > LED_COLUMNS, "The full itinerary must scroll beyond the visible board.");
assert(columns.some(value => value > 0), "The destination must contain lit LEDs.");
assert(columns.every(value => value < 256), "Seven-row glyphs must fit within the nine-row matrix.");
assert(getLedOffset(1, columns.length) > getLedOffset(0, columns.length), "The itinerary must advance with time.");
assert.equal(getLedOffset(columns.length / 18, columns.length), 0, "The full itinerary must loop cleanly.");
for (let index = 0; index < GRAND_LINE_STOPS.length; index++) {
  assert.equal(getRandomDestinationStart(() => (index + 0.5) / GRAND_LINE_STOPS.length), index, "Every stop must be a possible starting point.");
  const start = getDestinationStartOffset(index);
  const firstStop = encodeLedText(GRAND_LINE_STOPS[index]);
  assert.deepEqual(columns.slice(start, start + firstStop.length), firstStop, "The first displayed stop must start with a complete glyph.");
  assert.equal(getLedOffset(columns.length / 18, columns.length, start), start, "A full cycle must return to the chosen starting stop.");
}
assert.equal(getRandomDestinationStart(() => 0), 0);
assert.equal(getRandomDestinationStart(() => 1 - Number.EPSILON), 27);
assert.equal(getLedOffset(1, columns.length, getDestinationStartOffset(27)), (getDestinationStartOffset(27) + 18) % columns.length, "Laugh Tale must wrap into Grand Line then Shells Town.");
assert.throws(() => encodeLedText("GRAND LINE?"), /Unsupported/, "Unknown glyphs must not silently remove a destination.");

// Une roue orientée sur l'essieu X garde cet axe pendant toute sa rotation.
const support = new THREE.Group();
support.rotation.z = Math.PI / 2;
const spin = new THREE.Group();
support.add(spin);
for (const angle of [0, 0.4, 1.5, Math.PI, Math.PI * 1.8]) {
  spin.rotation.y = angle;
  support.updateMatrixWorld(true);
  const axle = new THREE.Vector3(0, 1, 0).transformDirection(spin.matrixWorld);
  assert(axle.distanceTo(new THREE.Vector3(-1, 0, 0)) < 1e-6, "The wheel must never swivel horizontally.");
}
spin.rotation.y = 0;
support.updateMatrixWorld(true);
const before = new THREE.Vector3(-WHEEL_RADIUS, 0, 0).applyMatrix4(spin.matrixWorld);
spin.rotation.y = 0.001;
support.updateMatrixWorld(true);
const after = new THREE.Vector3(-WHEEL_RADIUS, 0, 0).applyMatrix4(spin.matrixWorld);
assert(after.z > before.z, "The tyre's contact point must move opposite to forward travel (-Z).");

const view = new THREE.Ray(new THREE.Vector3(0, 2, -20), new THREE.Vector3(0, 0, 1));
const hit = new THREE.Vector3();
assert(obstructsBusView(view, new THREE.Box3(new THREE.Vector3(-2, 0, -15), new THREE.Vector3(2, 5, -10)), 20, hit), "A foreground prop must not mask the bus.");
assert(obstructsBusView(view, new THREE.Box3(new THREE.Vector3(-2, 0, -25), new THREE.Vector3(2, 5, -19)), 20, hit), "A camera inside a cloud must retain a clear view.");
assert(!obstructsBusView(view, new THREE.Box3(new THREE.Vector3(-2, 0, 5), new THREE.Vector3(2, 5, 10)), 20, hit), "Background scenery must remain visible.");
assert(!obstructsBusView(view, new THREE.Box3(new THREE.Vector3(5, 0, -15), new THREE.Vector3(8, 5, -10)), 20, hit), "Scenery beside the line of sight must remain visible.");
console.log("Bus door clearance, boarding route, LED matrix, wheel axes, camera range and occlusion checks passed.");
