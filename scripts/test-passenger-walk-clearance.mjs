import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { build } from "esbuild";

// Execute the real avatar frame callback and mount its real JSX in Three. The
// small hook shim provides refs without a renderer; it does not replace shapes,
// proportions, gait, journey timing, or either seated/standing body component.
const frameCallbacks = [];
globalThis.__passengerWalkFrames = frameCallbacks;
const compiled = await build({
  stdin: { contents: `export * as THREE from 'three';
    export { OBB } from 'three/addons/math/OBB.js';
    export { default as BoardingAvatar } from './src/components/bus/BoardingAvatar';
    export { Passenger } from './src/components/bus/Passengers';
    export { NAKAMA_ROSTER } from './src/components/bus/passenger-archetypes';
    export * from './src/lib/bus-journey';
    export { getSeatRowZ, getNearestBusDoor } from './src/lib/bus-layout';
    export { PASSENGER_SEAT_X } from './src/lib/bus-occupancy';`,
    resolveDir: process.cwd(), sourcefile: "passenger-walk-test.ts" },
  bundle: true, format: "esm", platform: "node", write: false,
  jsx: "automatic", logLevel: "silent",
  plugins: [{ name: "test-hooks", setup(builder) {
    builder.onResolve({ filter: /^(react|react\/jsx-runtime|@react-three\/fiber)$/ }, args => ({ path: args.path, namespace: "test-hooks" }));
    builder.onLoad({ filter: /.*/, namespace: "test-hooks" }, ({ path }) => ({ contents: path === "react"
      ? `export const useRef = current => ({ current });
         export const useMemo = fn => fn(); export const useCallback = fn => fn;
         export const useEffect = () => {}; export const useLayoutEffect = () => {};
         export const memo = component => component;`
      : path === "react/jsx-runtime"
        ? `export const Fragment = Symbol.for('walk-test-fragment');
           export const jsx = (type, props) => ({ type, props }); export const jsxs = jsx;`
        : `export const useFrame = callback => globalThis.__passengerWalkFrames.push(callback);` }));
  } }],
});
const { THREE, OBB, BoardingAvatar, Passenger, NAKAMA_ROSTER, createJourneyState,
  beginJourney, updateJourney,
  getSeatRowZ, getNearestBusDoor, PASSENGER_SEAT_X } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`,
);
// A focused rig change can check its actual walking meshes against every seated
// character, while the default command retains the complete roster regression.
const requestedModels = process.env.BUS_WALK_CLEARANCE_MODELS?.split(",").map(id => id.trim()).filter(Boolean);
if (requestedModels) for (const id of requestedModels) {
  assert(NAKAMA_ROSTER.some(archetype => archetype.id === id), `Unknown walking model: ${id}`);
}
const walkingIndices = NAKAMA_ROSTER.map((archetype, index) => ({ archetype, index }))
  .filter(({ archetype }) => !requestedModels || requestedModels.includes(archetype.id))
  .map(({ index }) => index);
const material = new THREE.MeshStandardMaterial();
const context = new Proxy({}, { get: () => () => {} });
globalThis.document = { createElement: () => ({ width: 256, height: 256, getContext: () => context }) };
const children = value => Array.isArray(value) ? value.flatMap(children) : value == null || value === false ? [] : [value];
function mount(element) {
  if (!element) return new THREE.Group();
  if (typeof element.type === "function") return mount(element.type(element.props));
  if (typeof element.type === "symbol") {
    const fragment = new THREE.Group();
    for (const child of children(element.props.children)) fragment.add(mount(child));
    return fragment;
  }
  const props = element.props;
  const object = element.type === "mesh" ? new THREE.Mesh(props.geometry, props.material ?? material) : new THREE.Group();
  object.name = props.name ?? "";
  if (props.position) object.position.fromArray(props.position);
  if (props.rotation) object.rotation.fromArray(props.rotation);
  if (props.scale) object.scale.fromArray(props.scale);
  if (props.visible !== undefined) object.visible = props.visible;
  for (const child of children(props.children)) {
    const type = child.type;
    const geometries = { sphereGeometry: THREE.SphereGeometry, cylinderGeometry: THREE.CylinderGeometry,
      coneGeometry: THREE.ConeGeometry, torusGeometry: THREE.TorusGeometry,
      planeGeometry: THREE.PlaneGeometry, boxGeometry: THREE.BoxGeometry };
    if (geometries[type]) object.geometry = new geometries[type](...child.props.args);
    else object.add(mount(child));
  }
  if (typeof props.ref === "function") props.ref(object);
  else if (props.ref) props.ref.current = object;
  return object;
}
const bodyNames = new Set(["nakama-torso", "nakama-pelvis", "nakama-seated-legs", "nakama-shoes", "nakama-skirt"]);
const coreMeshes = root => {
  const parts = [];
  root.traverse(object => {
    if (!object.isMesh) return;
    for (let node = object; node && node !== root; node = node.parent) {
      if (bodyNames.has(node.name) || node.name.startsWith("avatar-thigh-")) { parts.push(object); break; }
    }
  });
  return parts;
};
const bounds = mesh => {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
};
const volume = mesh => ({ mesh, zOffset: 0, box: bounds(mesh), obb: new OBB().fromBox3(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld) });
const staticPeers = [];
for (let column = 0; column < 4; column++) for (const archetype of NAKAMA_ROSTER) {
  const root = mount({ type: Passenger, props: { seat: { x: PASSENGER_SEAT_X[column], z: 0 }, index: 0,
    archetype, hornPulse: 0, reducedMotion: true } });
  root.updateMatrixWorld(true);
  staticPeers.push({ id: archetype.id, column, volumes: coreMeshes(root).map(volume) });
}
// Adjacent backrests use the actual row spacing and seat mesh dimensions. Their
// real mounted dimensions are independently covered by the vehicle/door audit.
const backrests = [-.72,.72].map(x => new THREE.Box3(
  new THREE.Vector3(x-.475, 1.09, -1.2+.33-.06),
  new THREE.Vector3(x+.475, 1.67, -1.2+.33+.06),
)).map(box => ({ box, obb: new OBB().fromBox3(box), rectangular: true }));
const intersection = new THREE.Box3();
const size = new THREE.Vector3();
const report = { models: NAKAMA_ROSTER.length, walkingModels: walkingIndices.map(index => NAKAMA_ROSTER[index].id), seatColumns: PASSENGER_SEAT_X, phases: ["entering", "exiting"],
  dt: 1 / 120, inspectedFrames: 0, checkedVolumePairs: 0, overlappingWorldBoxes: 0, rotatedBoxFalsePositives: 0, minimumAabbSeparation: Infinity };
const camera = new THREE.PerspectiveCamera(); camera.position.set(10, 10, 10);
// Maximum volume separation along a world axis is a conservative clearance:
// if positive, the complete rounded meshes cannot intersect.
function inspect(avatar, obstacle, label) {
  const avatarBox = avatar.box, obstacleBox = obstacle.box;
  report.checkedVolumePairs++;
  const separation = Math.max(obstacleBox.min.x-avatarBox.max.x, avatarBox.min.x-obstacleBox.max.x,
    obstacleBox.min.y-avatarBox.max.y, avatarBox.min.y-obstacleBox.max.y,
    obstacleBox.min.z-avatarBox.max.z, avatarBox.min.z-obstacleBox.max.z);
  report.minimumAabbSeparation = Math.min(report.minimumAabbSeparation, separation);
  intersection.copy(avatarBox).intersect(obstacleBox).getSize(size);
  if (size.x * size.y * size.z < 1e-10) return;
  report.overlappingWorldBoxes++;
  if (!avatar.obb.intersectsOBB(obstacle.obb)) return;
  // Rounded shins can share their enclosing OBB's corner with a rectangular
  // backrest while the real triangles remain clear. Resolve that case against
  // the actual vertex positions, without accepting a penetration tolerance.
  if (obstacle.rectangular) {
    const positions = avatar.mesh.geometry.attributes.position, indices = avatar.mesh.geometry.index;
    const triangle = new THREE.Triangle();
    const vertex = (target, at) => target.fromBufferAttribute(positions, indices ? indices.getX(at) : at)
      .applyMatrix4(avatar.mesh.matrixWorld).add(new THREE.Vector3(0,0,avatar.zOffset));
    let contact = false;
    for (let at = 0; at < (indices?.count ?? positions.count); at += 3) {
      vertex(triangle.a, at); vertex(triangle.b, at+1); vertex(triangle.c, at+2);
      if (obstacleBox.intersectsTriangle(triangle)) { contact = true; break; }
    }
    if (!contact) { report.rotatedBoxFalsePositives++; return; }
  }
  assert.fail(`${label}: actual walking core/leg volume intersects an occupied seat or preceding backrest (${JSON.stringify({ separation, avatar: avatarBox, obstacle: obstacleBox })}).`);
}
for (let column = 0; column < 4; column++) for (const index of walkingIndices) {
  for (const phase of report.phases) {
    const state = createJourneyState(), ref = { current: state };
    const seatZ = getSeatRowZ(3), door = getNearestBusDoor(seatZ, 6);
    beginJourney(state, phase, seatZ, door, PASSENGER_SEAT_X[column]);
    const callbackIndex = frameCallbacks.length;
    const root = mount({ type: BoardingAvatar, props: { journey: ref, passengerIndex: index,
      physicalSeatIndex: 12 + column, partyOn: false, hornPulse: 0, reducedMotion: true } });
    const animate = frameCallbacks[callbackIndex];
    const parts = coreMeshes(root);
    assert(parts.length > 6 && root.getObjectByName("nakama-torso-body"), "The check mounts real standing torso, pelvis, legs and shoes.");
    const end = phase === "entering" ? state.timing.entrySitStart : state.timing.exitWalkEnd;
    for (let time = 0; time <= end; time += report.dt) {
      updateJourney(state, phase, time, seatZ, 1, door, PASSENGER_SEAT_X[column]);
      animate({ camera, clock: { elapsedTime: time } }, report.dt);
      if (!state.walking || Math.abs(state.position.z-seatZ) > .75 || state.position.y < .63) continue;
      root.updateMatrixWorld(true);
      report.inspectedFrames++;
      const volumes = parts.map(volume).map(part => {
        part.box.translate(new THREE.Vector3(0,0,-seatZ)); part.obb.center.z -= seatZ; part.zOffset = -seatZ; return part;
      });
      const peers = staticPeers.filter(peer => peer.column !== column);
      for (const part of volumes) {
        for (const peer of peers) for (const obstacle of peer.volumes) inspect(part, obstacle,
          `${NAKAMA_ROSTER[index].id} ${phase} column ${column}, peer ${peer.id} column ${peer.column}, t=${time.toFixed(3)}`);
        for (const backrest of backrests) inspect(part, backrest,
          `${NAKAMA_ROSTER[index].id} ${phase} column ${column}, preceding backrest, t=${time.toFixed(3)}`);
      }
    }
    updateJourney(state, phase, phase === "entering" ? state.timing.entryDuration : 0, seatZ, 1, door, PASSENGER_SEAT_X[column]);
    assert.equal(state.position.x, PASSENGER_SEAT_X[column], "Both entering and the start of exiting retain the real assigned column.");
    assert.equal(state.position.z, seatZ);
  }
}
assert(report.inspectedFrames > 50 * walkingIndices.length && report.checkedVolumePairs > 5000 * walkingIndices.length);
report.minimumAabbSeparation = Number(report.minimumAabbSeparation.toFixed(6));
if (process.env.BUS_WALK_CLEARANCE_OUTPUT) await writeFile(process.env.BUS_WALK_CLEARANCE_OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
delete globalThis.__passengerWalkFrames;
console.log("Real boarding body clearance passed:", JSON.stringify(report));
