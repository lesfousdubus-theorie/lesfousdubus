import assert from "node:assert/strict";
import { build } from "esbuild";
import * as THREE from "three";

async function load(path) {
  const compiled = await build({ entryPoints: [path], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
}
const motion = await load("src/lib/passenger-motion.ts"), facial = await load("src/lib/passenger-expressions.ts");
const { getPassengerProportions } = await load("src/lib/passenger-proportions.ts");
const ids = ["luffy", "zoro", "nami", "usopp", "sanji", "chopper", "robin", "franky", "brook", "jinbe", "law", "ace", "sabo", "yamato", "shanks", "buggy", "doflamingo", "boa_hancock", "vivi", "mihawk"];
const fields = Object.keys(motion.createPassengerPose()).filter(key => typeof motion.createPassengerPose()[key] === "number");
const pose = motion.createPassengerPose(), previous = motion.createPassengerPose(), expression = facial.createFacialExpression();
const partySignatures = new Set(), hornSignatures = new Set(), chatSignatures = new Set(), faceSignatures = new Set();
const shoulder = new THREE.Quaternion(), elbow = new THREE.Quaternion(), body = new THREE.Quaternion(), root = new THREE.Quaternion();
const vector = new THREE.Vector3(), shoulderPoint = new THREE.Vector3(), elbowPoint = new THREE.Vector3(), handPoint = new THREE.Vector3();
const euler = new THREE.Euler(), axis = new THREE.Vector3(0, 1, 0);
const handRotation = new THREE.Quaternion(), handMatrix = new THREE.Matrix4(), handScale = new THREE.Vector3(1.015, 1, 1.015);
const handBox = new THREE.Box3(), handSize = new THREE.Vector3(), handZero = new THREE.Vector3();
let samples = 0, maximumPartyFootprint = 0, maximumPartyStep = 0;
for (const id of ids) {
  const width = getPassengerProportions(id).torsoWidth, signature = [], horn = [], chat = [], face = [];
  for (const time of [.17, .63, 1.4, 2.2, 3.7, 6.1, 10.2, 15.4, 30.6]) {
    motion.samplePassengerPose(pose, time, 0, 1, width, Infinity, true, false, id);
    signature.push(fields.map(field => pose[field]));
    motion.samplePassengerPose(pose, 0, 0, 1, width, time % 1.6 + .05, false, false, id);
    horn.push(fields.map(field => pose[field]));
    motion.samplePassengerPose(pose, time % 5 + 1.1, 0, 1, width, Infinity, false, false, id);
    chat.push(fields.map(field => pose[field]));
    facial.sampleFacialExpression(expression, time, 0, id, "party", false); face.push([expression.opening, expression.width, expression.smile]);
  }
  partySignatures.add(JSON.stringify(signature)); hornSignatures.add(JSON.stringify(horn)); chatSignatures.add(JSON.stringify(chat)); faceSignatures.add(JSON.stringify(face));
  const reducedStart = motion.createPassengerPose(), reducedEnd = motion.createPassengerPose();
  motion.samplePassengerPose(reducedStart, 0, 0, 1, width, Infinity, true, true, id);
  motion.samplePassengerPose(reducedEnd, 123, 0, 1, width, Infinity, true, true, id);
  assert.deepEqual(reducedStart, reducedEnd, `${id} must retain one deliberate still party signature in reduced motion.`);
  for (const mode of ["social", "party", "horn"]) for (const peer of [-1, 1]) {
    for (let frame = 0; frame < 60 * 60; frame++) {
      const time = frame / 60, hornElapsed = mode === "horn" ? time % 6 : Infinity;
      motion.samplePassengerPose(pose, time, 0, peer, width, hornElapsed, mode === "party", false, id);
      assert(fields.every(field => Number.isFinite(pose[field])), `${id} must keep every animated joint finite.`);
      assert(pose.bob >= 0 && pose.bob <= .036001 && pose.rightKick >= 0 && pose.rightKick <= .45, "Seated feet and knee gestures stay in the established range.");
      assert(Math.abs(pose.torsoYaw) <= .25 && Math.abs(pose.torsoPitch) <= .12 && Math.abs(pose.torsoRoll) <= .12 && Math.abs(pose.rootYaw) <= .081, `${id} ${mode} at ${time}: torso motion stays small enough to preserve the seated pelvis and attached neck.`);
      assert(Math.abs(pose.headYaw) < 1 && Math.abs(pose.headPitch) < .45, "Expressions and attention never twist the neck to an extreme angle.");
      if (mode === "party" && frame) {
        const change = Math.max(...fields.map(field => Math.abs(pose[field] - previous[field])));
        maximumPartyStep = Math.max(maximumPartyStep, change);
        assert(change < .20, `${id} must blend between dance and attack phrases without sudden angular jumps.`);
      }
      Object.assign(previous, pose);
      if (frame % 10 === 0) {
        body.setFromEuler(euler.set(pose.torsoPitch, pose.torsoYaw, pose.torsoRoll)); root.setFromAxisAngle(axis, pose.rootYaw);
        for (const side of [-1, 1]) {
          const left = side < 0;
          shoulder.setFromEuler(euler.set(left ? pose.leftX : pose.rightX, 0, left ? pose.leftZ : pose.rightZ));
          elbow.setFromEuler(euler.set(left ? pose.leftElbowX : pose.rightElbowX, 0, left ? pose.leftElbowZ : pose.rightElbowZ));
          shoulderPoint.set(side * (width / 2 - .018), .145, 0);
          elbowPoint.set(0, -.20, 0).applyQuaternion(shoulder).add(shoulderPoint);
          handPoint.set(0, -.22, 0).applyQuaternion(elbow); handPoint.y -= .20; handPoint.applyQuaternion(shoulder).add(shoulderPoint);
          assert(Math.abs(shoulderPoint.distanceTo(elbowPoint) - .20) < 1e-9 && Math.abs(elbowPoint.distanceTo(handPoint) - .22) < 1e-9, "Dance angles must preserve both connected arm-bone lengths.");
          vector.copy(handPoint).multiply(handScale).applyQuaternion(body).applyQuaternion(root);
          if (mode === "party") {
            const dimensions = id === "franky" ? [.13, .085, .14] : id === "jinbe" ? [.116, .081, .119] : [.1, .08, .105];
            handSize.fromArray(dimensions);
            handRotation.copy(root).multiply(body).multiply(shoulder).multiply(elbow);
            handMatrix.compose(vector, handRotation, handScale);
            handBox.setFromCenterAndSize(handZero, handSize).applyMatrix4(handMatrix);
            const footprint = Math.max(Math.abs(handBox.min.x), Math.abs(handBox.max.x));
            maximumPartyFootprint = Math.max(maximumPartyFootprint, footprint);
            assert(footprint < .36, `${id}'s party hand bounds ${footprint.toFixed(4)} must stay inside the window line even in the outer seat columns at ${time}.`);
          }
          assert(vector.length() < .64, "A gesture never sends a hand far beyond its own seated body.");
        }
      }
      facial.sampleFacialExpression(expression, time, 0, id, pose.activity, false);
      assert([expression.opening, expression.smile, expression.width, expression.teeth].every(Number.isFinite));
      assert(expression.opening >= 0 && expression.opening <= 1 && expression.width > .7 && expression.width < 1.4);
      samples++;
    }
  }
  const current = motion.createPassengerPose(), target = motion.createPassengerPose();
  motion.samplePassengerPose(current, 2.3, 0, 1, width, Infinity, true, false, id);
  for (let frame = 0; frame < 120; frame++) {
    motion.samplePassengerPose(target, 0, 0, 0, width, Infinity, false, true, id);
    motion.blendPassengerPose(current, target, 1 / 60, false);
  }
  assert(fields.every(field => Math.abs(current[field] - target[field]) < 1e-7), "Stopping restores the actual resting joint configuration without a frozen dance.");
}
for (const [name, signatures] of [["party", partySignatures], ["horn", hornSignatures], ["chat", chatSignatures], ["face", faceSignatures]]) assert.equal(signatures.size, ids.length, `All twenty characters must have distinct ${name} signatures with the same sample index.`);
console.log("Twenty-character motion passed: individual party/horn/chat/expression signatures, 60-second cadences, continuous phrasing, fixed arm lengths, limited window footprint, seated feet, reduced motion and full return to rest.");
console.log(JSON.stringify({ samples, characters: ids, maximumPartyStep, maximumPartyFootprint, distinct: { party: partySignatures.size, horn: hornSignatures.size, chat: chatSignatures.size, face: faceSignatures.size } }));
