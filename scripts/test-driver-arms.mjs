import assert from "node:assert/strict";
import { build } from "esbuild";
import * as THREE from "three";
import { OBB } from "three/addons/math/OBB.js";

async function load(path) {
  const compiled = await build({ entryPoints: [path], bundle: true, platform: "node", format: "esm", write: false });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
}
const { getDriverArmRest, DRIVER_UPPER_ARM, DRIVER_FOREARM, DRIVER_DASHBOARD, STEERING_WHEEL,
  DRIVER_SEAT_POSITIONS, DRIVER_SHOULDER_Z, NAVIGATOR_BAR, DRIVER_HAND_SIZE,
  DRIVER_ARM_FIELDS, getDriverReactionGain, normalizeDriverHornArms, prepareDriverArmTarget, solveDriverArmTarget } = await load("src/lib/driver-arms.ts");
const { createPassengerPose, samplePassengerPose, blendPassengerPose } = await load("src/lib/passenger-motion.ts");
const dashboardBounds = Object.values(DRIVER_DASHBOARD).map(({ position, size }) =>
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(...position), new THREE.Vector3(...size)));
const fittings = [
  { position: [.84, 1.48, -4.42], size: [.68, .18, .14] },
  { position: [-.84, 1.76, -4.50], size: [.72, .04, .20], rotation: [-.18, 0, 0] },
  { position: [-1.19, 1.65, -4.50], size: [.03, .22, .20] },
  { position: [-.49, 1.65, -4.50], size: [.03, .22, .20] },
  { position: [-1.20, 1.10, -4.47], size: [.06, .92, .26] },
  { position: [1.20, 1.10, -4.47], size: [.06, .92, .26] },
].map(({ position, size, rotation }) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size)); mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation); mesh.updateMatrixWorld();
  const bounds = new THREE.Box3().setFromObject(mesh); mesh.geometry.dispose(); return bounds;
});
const panelOBBs = [...dashboardBounds, ...fittings].map(bounds => new OBB().fromBox3(bounds));
const palmGeometry = new THREE.BoxGeometry(...DRIVER_HAND_SIZE);
const material = new THREE.MeshBasicMaterial();
const measurements = [];
const wheel = new THREE.Mesh(new THREE.TorusGeometry(STEERING_WHEEL.radius, .024, 14, 36), material);
wheel.position.set(DRIVER_SEAT_POSITIONS.kamal[0], STEERING_WHEEL.y, STEERING_WHEEL.z);
wheel.rotation.x = STEERING_WHEEL.tilt; wheel.updateMatrixWorld();
const wheelBounds = new THREE.Box3().setFromObject(wheel);
let minimumTorsoGap = Infinity, minimumKneeGap = Infinity;

for (const driver of ["kamal", "kyta"]) for (const side of [-1, 1]) {
  const rest = getDriverArmRest(driver, side);
  const restingTarget = new THREE.Vector3(); prepareDriverArmTarget(restingTarget, rest.target, 0, driver);
  assert(restingTarget.distanceTo(new THREE.Vector3(...rest.target)) < 1e-9,
    "The dashboard clearance guard must preserve the actual wheel or rail grip at rest.");
  const origin = new THREE.Vector3(DRIVER_SEAT_POSITIONS[driver][0] + side * .19, 1.62, DRIVER_SEAT_POSITIONS[driver][2] - .05 + DRIVER_SHOULDER_Z);
  const shoulder = new THREE.Group(); shoulder.position.copy(origin);
  shoulder.rotation.set(rest.shoulderX, rest.shoulderYaw, 0, "YXZ");
  const elbow = new THREE.Group(); elbow.position.y = -DRIVER_UPPER_ARM; elbow.rotation.x = rest.elbowX;
  const wrist = new THREE.Group(); wrist.position.y = -DRIVER_FOREARM; wrist.rotation.x = rest.wristX;
  shoulder.add(elbow); elbow.add(wrist);
  const palm = new THREE.Mesh(palmGeometry, material); wrist.add(palm);
  shoulder.updateMatrixWorld(true);
  const position = wrist.getWorldPosition(new THREE.Vector3());
  assert(position.distanceTo(origin.clone().add(new THREE.Vector3(...rest.target))) < 1e-9,
    `${driver}'s ${side < 0 ? "left" : "right"} wrist must reach its grip with the intended bone lengths.`);
  const bounds = new THREE.Box3().setFromObject(palm);
  assert(dashboardBounds.every(panel => !panel.intersectsBox(bounds)), `${driver}'s resting palm must clear the dashboard.`);
  if (driver === "kamal") {
    const steeringLocal = position.clone().sub(new THREE.Vector3(-.84, STEERING_WHEEL.y, STEERING_WHEEL.z))
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), -STEERING_WHEEL.tilt);
    assert(Math.abs(Math.hypot(steeringLocal.x, steeringLocal.y) - STEERING_WHEEL.radius) < 1e-9,
      "Both of Kamal's palms must rest on the steering rim, rather than hover ahead of it.");
    assert(Math.abs(steeringLocal.z) < 1e-9, "Steering grips must share the tilted wheel plane.");
  } else {
    assert(Math.abs(position.x - (.84 + side * NAVIGATOR_BAR.handOffset)) < 1e-9 &&
      Math.abs(position.y - NAVIGATOR_BAR.handY) < 1e-9 && Math.abs(position.z - NAVIGATOR_BAR.z) < 1e-9,
      "Kyta's two hands must be separated on the yellow bar, at actual reachable points.");
    assert(Math.abs(bounds.min.y - (NAVIGATOR_BAR.y + NAVIGATOR_BAR.radius)) < .002,
      "The square hands must rest on top of the bar without going through it.");
  }
  measurements.push({ driver, side, wrist: position.toArray(), dashboardGap: bounds.min.z - dashboardBounds[1].max.z });
}
// Les chaussures dépassent les tibias vers l'avant ; le panneau inférieur doit laisser cette place.
const toeFront = -4.08 + .12 - .28 - .035 - .234 / 2;
assert(toeFront - dashboardBounds[2].max.z > .10, "The recessed lower panel must clear the guides' toes by ten centimetres.");

// Les trajets de retour comptent autant que la pose finale.
for (const driver of ["kamal", "kyta"]) for (const side of [-1, 1]) for (const reduced of [false, true]) {
  const rest = getDriverArmRest(driver, side), root = new THREE.Group(), torso = new THREE.Group();
  const shoulder = new THREE.Group(), elbow = new THREE.Group(), wrist = new THREE.Group();
  root.position.set(DRIVER_SEAT_POSITIONS[driver][0], 0, DRIVER_SEAT_POSITIONS[driver][2] - .05);
  torso.position.set(0, 1.48, .14); shoulder.position.set(side * .19, .14, DRIVER_SHOULDER_Z - .14);
  elbow.position.y = -DRIVER_UPPER_ARM; wrist.position.y = -DRIVER_FOREARM;
  root.add(torso); torso.add(shoulder); shoulder.add(elbow); elbow.add(wrist);
  const handParts = [new THREE.Mesh(palmGeometry, material)];
  for (const part of handParts) wrist.add(part);
  const upperArm = new THREE.Mesh(new THREE.BoxGeometry(.098, DRIVER_UPPER_ARM + .016, .098), material);
  upperArm.position.y = -DRIVER_UPPER_ARM / 2; shoulder.add(upperArm);
  const forearm = new THREE.Mesh(new THREE.BoxGeometry(.087, DRIVER_FOREARM + .012, .087), material);
  forearm.position.y = -DRIVER_FOREARM / 2; elbow.add(forearm);
  const armParts = [...handParts, upperArm, forearm];
  const body = new THREE.Mesh(new THREE.BoxGeometry(.36, .52, .24), material);
  const knees = new THREE.Mesh(new THREE.BoxGeometry(.31, .14, .305), material);
  knees.position.set(0, 1.19, .12 - .14); root.add(knees); torso.add(body);
  const restShoulder = new THREE.Quaternion().setFromEuler(new THREE.Euler(rest.shoulderX, rest.shoulderYaw, 0, "YXZ"));
  const restElbow = new THREE.Quaternion().setFromEuler(new THREE.Euler(rest.elbowX, 0, 0));
  const restWrist = new THREE.Quaternion().setFromEuler(new THREE.Euler(rest.wristX, 0, 0));
  const restHand = restShoulder.clone().multiply(restElbow).multiply(restWrist);
  const targetShoulder = new THREE.Quaternion(), targetElbow = new THREE.Quaternion();
  const handTarget = new THREE.Vector3(), handRotation = new THREE.Quaternion(), solution = { shoulderX: 0, shoulderYaw: 0, elbowX: 0 };
  const pose = createPassengerPose(), target = createPassengerPose(), volume = new OBB();
  let gain = 0;
  for (let frame = 0; frame < 3600; frame++) {
    const time = frame / 60, cycle = time % 10, party = cycle < 4;
    const hornElapsed = cycle >= 7 ? cycle - 7 : Infinity;
    samplePassengerPose(target, time, driver === "kamal" ? 18 : 19, 0, .36, hornElapsed, party, reduced, driver);
    const reactionGain = getDriverReactionGain(party, hornElapsed, reduced);
    if (target.celebrating && !party) normalizeDriverHornArms(target, reactionGain);
    if (target.celebrating && !pose.celebrating) for (const key of DRIVER_ARM_FIELDS) pose[key] = target[key];
    if (!target.celebrating) for (const key of DRIVER_ARM_FIELDS) target[key] = pose[key];
    blendPassengerPose(pose, target, 1 / 60, reduced);
    gain = reduced ? reactionGain : THREE.MathUtils.damp(gain, reactionGain, 12, 1 / 60);
    root.position.y = pose.bob; root.rotation.y = pose.rootYaw;
    torso.scale.set(1.009, 1, 1.009); // Borne maximale de la respiration, sans raccourcir les os.
    targetShoulder.setFromEuler(new THREE.Euler((side < 0 ? pose.leftX : pose.rightX) + (driver === "kyta" && side > 0 ? .25 : 0), 0,
      side < 0 ? pose.leftZ : pose.rightZ));
    targetElbow.setFromEuler(new THREE.Euler(side < 0 ? pose.leftElbowX : pose.rightElbowX, 0,
      side < 0 ? pose.leftElbowZ : pose.rightElbowZ));
    handTarget.set(0, -DRIVER_FOREARM, 0).applyQuaternion(targetElbow); handTarget.y -= DRIVER_UPPER_ARM;
    handTarget.applyQuaternion(targetShoulder);
    handRotation.copy(targetShoulder).multiply(targetElbow);
    prepareDriverArmTarget(handTarget, rest.target, gain, driver); solveDriverArmTarget(handTarget, solution);
    shoulder.quaternion.setFromEuler(new THREE.Euler(solution.shoulderX, solution.shoulderYaw, 0, "YXZ"));
    elbow.rotation.set(solution.elbowX, 0, 0);
    wrist.quaternion.copy(shoulder.quaternion).multiply(elbow.quaternion).invert()
      .multiply(restHand.clone().slerp(handRotation, gain)); root.updateMatrixWorld(true);
    if (driver === "kamal") {
      const torsoBounds = new THREE.Box3().setFromObject(body), kneeBounds = new THREE.Box3().setFromObject(knees);
      const torsoGap = torsoBounds.min.z - wheelBounds.max.z, kneeGap = wheelBounds.min.y - kneeBounds.max.y;
      minimumTorsoGap = Math.min(minimumTorsoGap, torsoGap); minimumKneeGap = Math.min(minimumKneeGap, kneeGap);
      assert(torsoGap > .035, "The real steering rim must stay ahead of Kamal's shirt throughout the celebrations.");
      assert(kneeGap > .08, "The steering rim must stay above both knees, including the horn bounce.");
    }
    for (const part of armParts) {
      part.geometry.computeBoundingBox(); volume.fromBox3(part.geometry.boundingBox).applyMatrix4(part.matrixWorld);
      assert(panelOBBs.every(panel => !panel.intersectsOBB(volume)),
        `${driver} ${side < 0 ? "left" : "right"} hand must clear every dashboard panel at ${time.toFixed(3)} s (${pose.activity}, reduced=${reduced}).`);
    }
  }
  for (const part of handParts.slice(1)) part.geometry.dispose();
  upperArm.geometry.dispose(); forearm.geometry.dispose();
  body.geometry.dispose(); knees.geometry.dispose();
}
assert(DRIVER_SEAT_POSITIONS.kyta[2] === -4.03 && DRIVER_SEAT_POSITIONS.kamal[2] === -3.81,
  "Only the driver's seat moves back, preserving the front-right vestibule.");
wheel.geometry.dispose(); palmGeometry.dispose(); material.dispose();
console.log("Driver arm checks passed: simple square hands, fixed-length reach, both steering grips, rail supports, recessed footwell and 60 seconds of full/reduced party/horn transitions.");
console.log(JSON.stringify({ minimumTorsoGap, minimumKneeGap }));
console.log(JSON.stringify(measurements));
