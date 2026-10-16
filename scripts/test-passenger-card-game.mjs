import assert from "node:assert/strict";
import { build } from "esbuild";
import * as THREE from "three";

async function load(path) {
  const compiled = await build({ entryPoints: [path], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
}
const cards = await load("src/lib/passenger-card-game.ts"), motion = await load("src/lib/passenger-motion.ts");
const { getPassengerProportions, getPassengerSkeleton } = await load("src/lib/passenger-proportions.ts");
const ids = ["luffy", "zoro", "nami", "usopp", "sanji", "chopper", "robin", "franky", "brook", "jinbe", "law", "ace", "sabo", "yamato", "shanks", "buggy", "doflamingo", "boa_hancock", "vivi", "mihawk"];
const full = Array.from({ length: 1000 }, (_, index) => ({ index, physicalSeatIndex: index }));
const pairs = cards.getPassengerCardPairs(full, ids);
assert.equal(pairs.length, cards.MAX_CARD_PAIRS, "The number of animated games must remain bounded at fourteen rendered pairs.");
assert.equal(new Set(pairs.flatMap(pair => [pair.firstSeat, pair.secondSeat])).size, pairs.length * 2, "No actor participates in two games.");
for (const pair of pairs) {
  assert.equal(pair.firstSeat ^ 1, pair.secondSeat);
  assert.equal(Math.floor(pair.firstSeat / 2), pair.pairIndex);
  assert.notEqual(ids[pair.firstSeat % ids.length], "shanks");
  assert.notEqual(ids[pair.secondSeat % ids.length], "shanks");
}
assert.equal(cards.getPassengerCardPairs([{ index: 0, physicalSeatIndex: 1 }, { index: 1, physicalSeatIndex: 2 }], ids).length, 0, "Adjacent actors across the aisle never exchange cards.");
assert.equal(cards.getPassengerCardPairs([{ index: 0, physicalSeatIndex: 0 }], ids).length, 0, "An empty seat, simplified actor or boarding avatar is not an invisible partner.");

const shoulder = new THREE.Quaternion(), upperBody = new THREE.Quaternion(), rootRotation = new THREE.Quaternion(), euler = new THREE.Euler();
function palm(out, pose, id, side, seatX) {
  const rig = getPassengerSkeleton(id), width = getPassengerProportions(id).torsoWidth;
  const left = side < 0;
  shoulder.setFromEuler(euler.set(left ? pose.leftX : pose.rightX, 0, left ? pose.leftZ : pose.rightZ));
  out.set(0, -rig.forearmLength, 0).applyEuler(euler.set(left ? pose.leftElbowX : pose.rightElbowX, 0, left ? pose.leftElbowZ : pose.rightElbowZ));
  out.y -= rig.upperArmLength; out.applyQuaternion(shoulder);
  out.add(new THREE.Vector3(side * (width / 2 - .018), rig.shoulderY, 0));
  upperBody.setFromEuler(euler.set(pose.torsoPitch, pose.torsoYaw, pose.torsoRoll)); out.applyQuaternion(upperBody);
  out.add(new THREE.Vector3(0, .64 + rig.seatedHipHeight + rig.torsoAboveHip, rig.seatedHipZ + .02));
  rootRotation.setFromEuler(euler.set(0, pose.rootYaw, 0)); out.applyQuaternion(rootRotation); out.x += seatX; out.y += pose.bob;
  return out;
}
const state = cards.createCardGameState(), poses = [motion.createPassengerPose(), motion.createPassengerPose()];
const targets = [motion.createPassengerPose(), motion.createPassengerPose()], palms = [new THREE.Vector3(), new THREE.Vector3()];
const card = new THREE.Vector3(), previous = new THREE.Vector3();
let exchanges = 0, maximumContactDistance = 0, maximumCardStep = 0, maximumCardStepAt = null, samples = 0;
for (let firstIndex = 0; firstIndex < ids.length; firstIndex++) {
  if (ids[firstIndex] === "shanks") continue;
  const first = ids[firstIndex], second = ids[(firstIndex + 1) % ids.length] === "shanks" ? "chopper" : ids[(firstIndex + 1) % ids.length];
  Object.assign(poses[0], motion.createPassengerPose()); Object.assign(poses[1], motion.createPassengerPose());
  let priorOwner = null, priorActive = false;
  for (let frame = 0; frame < 26 * 120; frame++) {
    const time = frame / 120;
    cards.sampleCardGame(state, time, 0);
    for (let actor = 0; actor < 2; actor++) {
      const id = actor ? second : first, side = actor ? -1 : 1;
      motion.samplePassengerPose(targets[actor], time, firstIndex * 17 + actor * 9, side, getPassengerProportions(id).torsoWidth, Infinity, false, false, id, 0);
      motion.blendPassengerPose(poses[actor], targets[actor], 1 / 120, false);
      palm(palms[actor], poses[actor], id, side, actor * .44);
      assert(Object.values(poses[actor]).filter(value => typeof value === "number").every(Number.isFinite), "No joint becomes non-finite during a deal.");
    }
    if (state.active) {
      assert.equal(poses[0].games, true); assert.equal(poses[1].games, true);
      card.lerpVectors(palms[0], palms[1], state.handoff);
      if (priorActive && card.distanceTo(previous) > maximumCardStep) { maximumCardStep = card.distanceTo(previous); maximumCardStepAt = { first, second, time, handoff: state.handoff }; }
      previous.copy(card);
      if (state.transfer) maximumContactDistance = Math.max(maximumContactDistance, palms[0].distanceTo(palms[1]));
      if (priorOwner !== null && priorOwner !== state.owner) exchanges++;
      priorOwner = state.owner;
    }
    priorActive = state.active; samples++;
  }
}
assert.equal(exchanges, 38, "Every pair must deal once in each direction in a round.");
assert(maximumContactDistance < .012, `Palms must actually meet when ownership changes, measured ${maximumContactDistance} m.`);
assert(maximumCardStep < .014, `An attached card must not teleport, measured ${maximumCardStep} m/frame at 120 Hz.`);
for (const blocked of [true]) {
  cards.sampleCardGame(state, 17.9, 0, blocked); assert.equal(state.active, false);
}
for (const mode of ["party", "horn", "reduced", "alone"]) {
  const pose = motion.createPassengerPose();
  motion.samplePassengerPose(pose, 17.9, 0, mode === "alone" ? 0 : 1, .33, mode === "horn" ? .5 : Infinity, mode === "party", mode === "reduced", "luffy", mode === "alone" ? null : 0);
  assert.equal(pose.games, false, `${mode} must stop the shared game without ghost card movements.`);
}
for (const pairIndex of [0, 1, 8, 42, 50000]) {
  const time = 17.9 - pairIndex * 5.1;
  cards.sampleCardGame(state, time, pairIndex); assert.equal(state.active, true);
  assert(Math.abs(state.handoff - .5) < 1e-8, "A pair keeps the same shared musical/scene phase regardless of its database indices.");
}

// Mount the real square/Brook/Franky/Chopper hands and card JSX. This catches a
// good mathematical skeleton whose visual hand is offset or whose cards float.
globalThis.__cardFrames = [];
globalThis.__cardLayouts = [];
const mountedCode = await build({
  stdin: { contents: `export {default as CardGame, getPassengerCardActor} from './src/components/bus/PassengerCardGame';
    export {Passenger} from './src/components/bus/Passengers';
    export {PassengerForearm} from './src/components/bus/PassengerIdentity';
    export {NAKAMA_ROSTER} from './src/components/bus/passenger-archetypes';`, resolveDir: process.cwd(), sourcefile: "mounted-cards.tsx" },
  bundle: true, format: "esm", platform: "node", write: false, jsx: "automatic", logLevel: "silent",
  plugins: [{ name: "card-hooks", setup(builder) {
    builder.onResolve({ filter: /^(react|react\/jsx-runtime|@react-three\/fiber)$/ }, args => ({ path: args.path, namespace: "card-hooks" }));
    builder.onLoad({ filter: /.*/, namespace: "card-hooks" }, ({ path }) => ({ contents: path === "react"
      ? `export const useRef = current => ({current}); export const useMemo = fn => fn();
         export const useCallback = fn => fn; export const memo = fn => fn; export const useEffect = () => {};
         export const useLayoutEffect = fn => globalThis.__cardLayouts.push(fn);`
      : path === "react/jsx-runtime" ? "export const Fragment = Symbol.for('card-fragment'); export const jsx = (type, props) => ({type, props}); export const jsxs = jsx;"
        : "export const useFrame = (callback, priority = 0) => globalThis.__cardFrames.push({callback, priority});" }));
  } }],
});
const mounted = await import(`data:text/javascript;base64,${Buffer.from(mountedCode.outputFiles[0].text).toString("base64")}`);
const material = new THREE.MeshStandardMaterial(), mats = Object.fromEntries(["skin", "red", "steel", "shirt"].map(name => [name, material]));
const flatten = values => Array.isArray(values) ? values.flatMap(flatten) : values == null || values === false ? [] : [values];
function mount(element) {
  if (!element) return new THREE.Group();
  if (typeof element.type === "function") return mount(element.type(element.props));
  const props = element.props;
  const node = element.type === "mesh" ? new THREE.Mesh(props.geometry, props.material ?? material) : new THREE.Group();
  node.name = props.name ?? ""; node.userData = props.userData ?? {};
  if (props.position) node.position.fromArray(props.position);
  if (props.rotation) node.rotation.fromArray(props.rotation);
  if (props.scale) node.scale.fromArray(props.scale);
  if (props.visible !== undefined) node.visible = props.visible;
  for (const child of flatten(props.children)) node.add(mount(child));
  if (typeof props.ref === "function") props.ref(node);
  else if (props.ref) props.ref.current = node;
  return node;
}
let actualContactGap = 0, mountedPairs = 0;
for (const [firstId, secondId] of [["luffy", "zoro"], ["nami", "usopp"], ["chopper", "robin"], ["brook", "franky"], ["jinbe", "chopper"]]) {
  const world = new THREE.Group(), registry = new Map(), rigs = [];
  for (const [actor, id] of [firstId, secondId].entries()) {
    const rig = getPassengerSkeleton(id), shape = getPassengerProportions(id), archetype = mounted.NAKAMA_ROSTER.find(item => item.id === id);
    const actorRoot = new THREE.Group(); actorRoot.position.x = actor * .44; world.add(actorRoot);
    const upper = new THREE.Group(); upper.position.set(0, .64 + rig.seatedHipHeight + rig.torsoAboveHip, rig.seatedHipZ + .02); actorRoot.add(upper);
    const arms = [], elbows = [];
    for (const [armIndex, side] of [-1, 1].entries()) {
      const arm = new THREE.Group(); arm.position.set(side * (shape.torsoWidth / 2 - .018), rig.shoulderY, 0); upper.add(arm);
      const elbow = new THREE.Group(); elbow.position.y = -rig.upperArmLength; arm.add(elbow);
      const scale = new THREE.Group(); scale.scale.set(rig.armWidthScale, rig.armScale, rig.armWidthScale); elbow.add(scale);
      scale.add(mount({ type: mounted.PassengerForearm, props: { archetype, mats, side, width: shape.armWidth, handName: `nakama-hand-${armIndex ? "right" : "left"}` } }));
      arms.push(arm); elbows.push(elbow);
    }
    registry.set(actor, mounted.getPassengerCardActor(actorRoot)); rigs.push({ id, shape, arms, elbows });
  }
  globalThis.__cardFrames.length = 0;
  const game = mount({ type: mounted.CardGame, props: { pair: { pairIndex: 0, firstSeat: 0, secondSeat: 1 }, actors: registry, hornPulse: 0, partyOn: false, reducedMotion: false } });
  world.add(game);
  for (let frame = 0; frame < 26 * 60; frame++) {
    const time = frame / 60;
    for (const [actor, rig] of rigs.entries()) {
      const pose = motion.createPassengerPose(); motion.samplePassengerPose(pose, time, actor, actor ? -1 : 1, rig.shape.torsoWidth, Infinity, false, false, rig.id, 0);
      rig.arms[0].rotation.set(pose.leftX, 0, pose.leftZ); rig.arms[1].rotation.set(pose.rightX, 0, pose.rightZ);
      rig.elbows[0].rotation.set(pose.leftElbowX, 0, pose.leftElbowZ); rig.elbows[1].rotation.set(pose.rightElbowX, 0, pose.rightElbowZ);
    }
    world.updateMatrixWorld(true); globalThis.__cardFrames[0].callback({ clock: { elapsedTime: time } }); world.updateMatrixWorld(true);
    if (!game.visible) continue;
    for (const actor of [0, 1]) {
      const hand = registry.get(actor).hands[actor ? 1 : 0], deck = game.getObjectByName(`card-deck-seat-${actor}`);
      const expected = hand.object.localToWorld(hand.front.clone()), actual = deck.getWorldPosition(new THREE.Vector3());
      assert(actual.distanceTo(expected) < 1e-8, "The actual fan must remain exactly attached to the rendered outer palm.");
    }
    if (game.userData.transfer) {
      const cardBox = new THREE.Box3().setFromObject(game.getObjectByName("card-exchange-0"));
      const firstHand = registry.get(0).hands[1].object, secondHand = registry.get(1).hands[0].object;
      for (const hand of [firstHand, secondHand]) {
        const box = new THREE.Box3().setFromObject(hand);
        const gap = Math.max(0, box.min.x - cardBox.max.x, cardBox.min.x - box.max.x, box.min.y - cardBox.max.y, cardBox.min.y - box.max.y, box.min.z - cardBox.max.z, cardBox.min.z - box.max.z);
        actualContactGap = Math.max(actualContactGap, gap);
      }
      assert(actualContactGap < .003, `Transferred card contact gap ${actualContactGap} m for ${firstId}/${secondId} at ${time}, including actual Chopper/Brook/Franky palms.`);
    }
  }
  mountedPairs++;
}

// Exercise real Passenger callbacks as well as the real card callback. Mounting
// cards first deliberately reverses subscription order; R3F's priority order
// must still animate each palm before reading it for the card in the same frame.
globalThis.document = { body: { style: {} }, createElement: () => ({ width: 256, height: 256,
  getContext: () => new Proxy({}, { get: (_target, key) => key === "measureText" ? text => ({ width: text.length * 40 }) : () => {} }) }) };
globalThis.__cardFrames.length = 0; globalThis.__cardLayouts.length = 0;
const priorityWorld = new THREE.Group(), priorityActors = new Map();
const priorityGame = mount({ type: mounted.CardGame, props: { pair: { pairIndex: 0, firstSeat: 0, secondSeat: 1 }, actors: priorityActors, hornPulse: 0, partyOn: false, reducedMotion: false } });
priorityWorld.add(priorityGame);
for (const [actor, id] of ["nami", "usopp"].entries()) priorityWorld.add(mount({ type: mounted.Passenger, props: {
  seat: { x: actor * .44, z: 0, row: 0, seatInRow: actor }, index: actor, physicalSeatIndex: actor,
  archetype: mounted.NAKAMA_ROSTER.find(item => item.id === id), hornPulse: 0, reducedMotion: false,
  peerSide: actor ? -1 : 1, cardPairIndex: 0, cardActors: priorityActors, head: { type: "group", props: {} },
} }));
for (const effect of globalThis.__cardLayouts) effect();
assert.equal(priorityActors.size, 2, "Real Passenger layout effects must register both rendered hand rigs.");
assert.equal(globalThis.__cardFrames[0].priority, -1, "The deliberately first-mounted card uses the pre-render read priority.");
assert.equal(globalThis.__cardFrames.filter(frame => frame.priority === -2).length, 2, "Both real Passenger callbacks run before the card read.");
const orderedFrames = [...globalThis.__cardFrames].sort((a, b) => a.priority - b.priority);
let checkedPriorityFrames = 0, maximumSameFrameAttachmentError = 0, actualPalmTravel = 0;
const lastPalm = new THREE.Vector3(), worldPalm = new THREE.Vector3();
for (let frame = 0; frame < 9 * 120; frame++) {
  const time = 15 + frame / 120, state = { clock: { elapsedTime: time } };
  for (const registered of orderedFrames) registered.callback(state, 1 / 120);
  priorityWorld.updateMatrixWorld(true);
  if (!priorityGame.visible) continue;
  for (const actor of [0, 1]) {
    const hand = priorityActors.get(actor).hands[actor ? 1 : 0];
    worldPalm.copy(hand.front); hand.object.localToWorld(worldPalm);
    const deck = priorityGame.getObjectByName(`card-deck-seat-${actor}`).getWorldPosition(new THREE.Vector3());
    const error = worldPalm.distanceTo(deck); maximumSameFrameAttachmentError = Math.max(maximumSameFrameAttachmentError, error);
    assert(error < 1e-8, `A real moving palm and its card must match in the same frame, without one-frame lag: ${error} m at ${time}.`);
    if (!actor) { if (checkedPriorityFrames) actualPalmTravel += worldPalm.distanceTo(lastPalm); lastPalm.copy(worldPalm); }
  }
  checkedPriorityFrames++;
}
assert(actualPalmTravel > .05 && checkedPriorityFrames > 500, "The priority check must cover moving hands and both deals rather than a static rest pose.");
console.log("Card games passed: real rendered neighbors only, fourteen-pair bound, shared physical-bench clocks, two alternating transfers, palms in contact, fixed bones, continuous cards, reduced motion and party/horn interruption.");
console.log(JSON.stringify({ samples, exchanges, maximumContactDistance, maximumCardStep, maximumCardStepAt, maximumPairs: pairs.length, mountedPairs, actualContactGap,
  checkedPriorityFrames, maximumSameFrameAttachmentError, actualPalmTravel }));
