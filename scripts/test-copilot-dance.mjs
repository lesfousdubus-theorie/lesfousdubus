import assert from "node:assert/strict";
import { build } from "esbuild";
import * as THREE from "three";
import { OBB } from "three/addons/math/OBB.js";

async function load(path) {
  const compiled = await build({ entryPoints: [path], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
}
const arms = await load("src/lib/driver-arms.ts"), motion = await load("src/lib/passenger-motion.ts");
const { sampleCopilotDance, COPILOT_DANCE_GESTURES } = await load("src/lib/copilot-dance.ts");
const { DRIVER_ARM_FIELDS, DRIVER_UPPER_ARM, DRIVER_FOREARM, DRIVER_SHOULDER_X, DRIVER_SHOULDER_Z, DRIVER_HAND_SIZE, DRIVER_SEAT_POSITIONS, DRIVER_DASHBOARD, NAVIGATOR_BAR, getDriverArmRest, getDriverReactionGain, normalizeDriverHornArms, prepareDriverArmTarget, solveDriverArmTarget } = arms;
const material = new THREE.MeshBasicMaterial(), measured = [];
const panels = Object.values(DRIVER_DASHBOARD).map(({ position, size }) => new OBB().fromBox3(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(...position), new THREE.Vector3(...size))));
panels.push(new OBB().fromBox3(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(.84, 1.48, -4.42), new THREE.Vector3(.68, .18, .14))));
const bar = new OBB().fromBox3(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(.84, NAVIGATOR_BAR.y, NAVIGATOR_BAR.z), new THREE.Vector3(NAVIGATOR_BAR.width, NAVIGATOR_BAR.radius * 2, NAVIGATOR_BAR.radius * 2)));
const gestures = new Set(), signatures = new Map();
let samples = 0;
for (const reduced of [false, true]) for (const scenario of ["continuous", "loop-and-horn"]) {
  const root = new THREE.Group(), torso = new THREE.Group(), neck = new THREE.Vector3(), inverse = new THREE.Quaternion();
  root.position.set(DRIVER_SEAT_POSITIONS.kyta[0], 0, DRIVER_SEAT_POSITIONS.kyta[2] - .05);
  torso.position.set(0, 1.48, .14); root.add(torso);
  const joints = [-1, 1].map(side => {
    const rest = getDriverArmRest("kyta", side), shoulder = new THREE.Group(), elbow = new THREE.Group(), wrist = new THREE.Group();
    shoulder.position.set(side * DRIVER_SHOULDER_X, .14, DRIVER_SHOULDER_Z - .14);
    elbow.position.y = -DRIVER_UPPER_ARM; wrist.position.y = -DRIVER_FOREARM;
    torso.add(shoulder); shoulder.add(elbow); elbow.add(wrist);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(.098, DRIVER_UPPER_ARM + .016, .098), material); upper.position.y = -DRIVER_UPPER_ARM / 2; shoulder.add(upper);
    const fore = new THREE.Mesh(new THREE.BoxGeometry(.087, DRIVER_FOREARM + .012, .087), material); fore.position.y = -DRIVER_FOREARM / 2; elbow.add(fore);
    const palm = new THREE.Mesh(new THREE.BoxGeometry(...DRIVER_HAND_SIZE), material); wrist.add(palm);
    const restHand = new THREE.Quaternion().setFromEuler(new THREE.Euler(rest.shoulderX, rest.shoulderYaw, 0, "YXZ"))
      .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rest.elbowX, 0, 0)))
      .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rest.wristX, 0, 0)));
    return { side, rest, shoulder, elbow, wrist, palm, parts: [upper, fore, palm], restHand,
      handTarget: new THREE.Vector3(), targetShoulder: new THREE.Quaternion(), targetElbow: new THREE.Quaternion(), handRotation: new THREE.Quaternion(),
      shoulderOffset: shoulder.position.clone(), solution: { shoulderX: 0, shoulderYaw: 0, elbowX: 0 } };
  });
  const pose = motion.createPassengerPose(), target = motion.createPassengerPose(), dance = { active: false, recovering: false, start: 0, yaw: 0, pitch: 0, roll: 0 };
  let gain = 0, staticSignature = null, hornReturnUntil = 0;
  for (let frame = 0; frame < 60 * 120; frame++) {
    const time = frame / 120, cycle = time % 20;
    const party = scenario === "continuous" ? time < 55 : cycle >= 8 && cycle < 16;
    const hornElapsed = scenario === "loop-and-horn" && cycle >= 18 ? cycle - 18 : Infinity;
    if (Number.isFinite(hornElapsed)) hornReturnUntil = time + 1.5;
    if (party && !dance.active) dance.start = time;
    dance.active = party;
    if (party) dance.recovering = true;
    else if (gain < .001) dance.recovering = false;
    motion.samplePassengerPose(target, time, 19, 0, .36, hornElapsed, party, reduced, "kyta");
    if (party) sampleCopilotDance(target, time - dance.start, reduced);
    const reactionGain = getDriverReactionGain(party, hornElapsed, reduced);
    if (target.celebrating && !party) normalizeDriverHornArms(target, reactionGain);
    if (target.celebrating && !pose.celebrating) for (const field of DRIVER_ARM_FIELDS) pose[field] = target[field];
    if (!target.celebrating) for (const field of DRIVER_ARM_FIELDS) target[field] = pose[field];
    motion.blendPassengerPose(pose, target, 1 / 120, reduced);
    gain = reduced ? reactionGain : THREE.MathUtils.damp(gain, reactionGain, 12, 1 / 120);
    root.position.y = pose.bob; root.rotation.y = pose.rootYaw;
    dance.yaw = reduced ? 0 : THREE.MathUtils.damp(dance.yaw, party ? pose.torsoYaw : 0, 12, 1 / 120);
    dance.pitch = reduced ? 0 : THREE.MathUtils.damp(dance.pitch, party ? pose.torsoPitch : 0, 12, 1 / 120);
    dance.roll = reduced ? 0 : THREE.MathUtils.damp(dance.roll, party ? pose.torsoRoll : 0, 12, 1 / 120);
    torso.rotation.set(dance.pitch, dance.yaw, dance.roll); torso.scale.set(1.009, 1, 1.009);
    inverse.copy(torso.quaternion).invert(); neck.set(0, .32, 0).applyQuaternion(torso.quaternion);
    assert(Math.abs(neck.length() - .32) < 1e-9, "The head anchor must keep its distance from the torso while swaying.");
    for (const joint of joints) {
      const left = joint.side < 0;
      joint.targetShoulder.setFromEuler(new THREE.Euler((left ? pose.leftX : pose.rightX) + (left ? 0 : .25), 0, left ? pose.leftZ : pose.rightZ));
      joint.targetElbow.setFromEuler(new THREE.Euler(left ? pose.leftElbowX : pose.rightElbowX, 0, left ? pose.leftElbowZ : pose.rightElbowZ));
      joint.handTarget.set(0, -DRIVER_FOREARM, 0).applyQuaternion(joint.targetElbow); joint.handTarget.y -= DRIVER_UPPER_ARM;
      joint.handTarget.applyQuaternion(joint.targetShoulder); joint.handRotation.copy(joint.targetShoulder).multiply(joint.targetElbow);
      if (dance.recovering) joint.handTarget.y = Math.max(.20, joint.handTarget.y);
      prepareDriverArmTarget(joint.handTarget, joint.rest.target, gain, "kyta");
      joint.handTarget.add(joint.shoulderOffset).applyQuaternion(inverse).sub(joint.shoulderOffset).clampLength(.0001, DRIVER_UPPER_ARM + DRIVER_FOREARM - .0001);
      solveDriverArmTarget(joint.handTarget, joint.solution);
      joint.shoulder.quaternion.setFromEuler(new THREE.Euler(joint.solution.shoulderX, joint.solution.shoulderYaw, 0, "YXZ"));
      joint.elbow.rotation.set(joint.solution.elbowX, 0, 0);
      joint.wrist.quaternion.copy(joint.shoulder.quaternion).multiply(joint.elbow.quaternion).invert().multiply(inverse).multiply(joint.restHand.clone().slerp(joint.handRotation, gain));
    }
    root.updateMatrixWorld(true);
    const signature = joints.map(joint => joint.wrist.getWorldPosition(new THREE.Vector3()).toArray());
    if (party && !reduced && scenario === "continuous") {
      gestures.add(pose.gesture);
      if (!signatures.has(pose.gesture) && (time - dance.start) % 3 > 1) signatures.set(pose.gesture, { hands: signature, head: [pose.headYaw, pose.headPitch], body: [dance.pitch, dance.yaw, dance.roll] });
    }
    if (party && reduced) {
      if (!staticSignature) staticSignature = signature;
      assert.deepEqual(signature, staticSignature, "Reduced motion must retain one completely static party pose.");
    }
    for (const joint of joints) for (const part of joint.parts) {
      part.geometry.computeBoundingBox();
      const volume = new OBB().fromBox3(part.geometry.boundingBox).applyMatrix4(part.matrixWorld);
      assert(panels.every(panel => !panel.intersectsOBB(volume)), `Kyta's ${joint.side < 0 ? "left" : "right"} arm must clear the dashboard at ${time.toFixed(3)} s (${scenario}, reduced=${reduced}, ${pose.gesture}).`);
      // Le klaxon existant est conservé ; la nouvelle chorégraphie vérifie la barre pendant
      // la fête, son retour et le repos. Tous les scénarios vérifient le tableau entier.
      assert(part !== joint.palm || (time < hornReturnUntil && !dance.recovering) || !bar.intersectsOBB(volume), `Kyta's ${joint.side < 0 ? "left" : "right"} arm must not cross the navigator bar at ${time.toFixed(3)} s (${scenario}, reduced=${reduced}, ${pose.gesture}, part=${joint.parts.indexOf(part)}, center=${volume.center.toArray()}, half=${volume.halfSize.toArray()}).`);
    }
    samples++;
  }
  if (scenario === "continuous") for (const joint of joints) {
    const position = joint.wrist.getWorldPosition(new THREE.Vector3());
    assert(position.distanceTo(new THREE.Vector3(DRIVER_SEAT_POSITIONS.kyta[0] + joint.side * NAVIGATOR_BAR.handOffset, NAVIGATOR_BAR.handY, NAVIGATOR_BAR.z)) < .004, "After stopping, both hands must return to their original bar support points within the three-millimetre breathing motion.");
    const palmBounds = new THREE.Box3().setFromObject(joint.palm);
    assert(Math.abs(palmBounds.min.y - NAVIGATOR_BAR.y - NAVIGATOR_BAR.radius) < .003, "At rest the palms must touch the top of the bar without being suspended above it.");
  }
  measured.push({ scenario, reducedMotion: reduced, finalHands: joints.map(joint => joint.wrist.getWorldPosition(new THREE.Vector3()).toArray()) });
  joints.forEach(joint => joint.parts.forEach(part => part.geometry.dispose()));
}
assert.equal(gestures.size, COPILOT_DANCE_GESTURES.length, "The full dance must show all five distinct gestures.");
const choreography = [...signatures.values()];
assert(new Set(choreography.map(sample => JSON.stringify(sample.hands))).size === 5, "Every phase must have a distinct pair of hand positions.");
assert(new Set(choreography.map(sample => JSON.stringify(sample.head))).size === 5 && new Set(choreography.map(sample => JSON.stringify(sample.body))).size === 5, "Head and torso must join each distinct phrase of the dance.");
material.dispose();
console.log("Copilot dance checks passed: five gestures, moving head/torso, fixed-length square hands, 60 seconds per full/reduced continuous/loop/horn scenario, dashboard clearance, party/return palm-bar clearance and return to both original supports.");
console.log(JSON.stringify({ samples, gestures: [...gestures], choreography: [...signatures.entries()], measured }));
