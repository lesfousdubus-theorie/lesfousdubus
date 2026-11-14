import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { build } from "esbuild";

// Mount the production JSX: the test never rebuilds the handles or their torus.
const compiled = await build({
  stdin: { contents: `export * as THREE from 'three';
    export { default as BusCabinDetails } from './src/components/bus/BusCabinDetails';
    export { BusTvFrame } from './src/components/bus/BusTv';
    export { getRenderedRowIndices, getSeatRowZ, getTvPositions, getBusRearWallZ, BUS_FRONT_Z } from './src/lib/bus-layout';
    export { PASSENGER_SEAT_X } from './src/lib/bus-occupancy';
    export { getPassengerSkeleton } from './src/lib/passenger-proportions';
    export { GRAB_HANDLE_X, TV_HANDLE_CLEARANCE_Z, getGrabRailSpans } from './src/lib/bus-interior-geometry';
    export { TV_POSITION } from './src/components/bus/constants';`,
    resolveDir: process.cwd(), sourcefile: "tv-handle-clearance.ts" },
  bundle: true, platform: "node", format: "esm", write: false, jsx: "automatic", logLevel: "silent",
  plugins: [{ name: "mount-hooks", setup(builder) {
    builder.onResolve({ filter: /^(react|react\/jsx-runtime|@react-three\/fiber|@react-three\/drei)$/ }, args => ({ path: args.path, namespace: "mount-hooks" }));
    builder.onLoad({ filter: /.*/, namespace: "mount-hooks" }, ({ path }) => ({ contents:
      path === "react" ? `export const useMemo=fn=>fn(); export const useEffect=()=>{};
        export const useRef=current=>({current}); export const useCallback=fn=>fn;
        export const useState=current=>[current,()=>{}];`
        : path === "react/jsx-runtime" ? `export const Fragment=Symbol.for('tv-clearance-fragment');
          export const jsx=(type,props)=>({type,props}); export const jsxs=jsx;`
          : path === "@react-three/fiber" ? "export const useFrame=()=>{};"
            : "export const Html=()=>null;" }));
  } }],
});
const { THREE, BusCabinDetails, BusTvFrame, getRenderedRowIndices, getSeatRowZ, getTvPositions,
  getBusRearWallZ, BUS_FRONT_Z, PASSENGER_SEAT_X, getPassengerSkeleton, GRAB_HANDLE_X, TV_HANDLE_CLEARANCE_Z, getGrabRailSpans, TV_POSITION } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`,
);
const context = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }) }, { get: (target, key) => target[key] ?? (() => {}) });
globalThis.document = { createElement: () => ({ width: 512, height: 96, getContext: () => context }) };
const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
const mats = new Proxy({}, { get: () => material });
const texture = new THREE.Texture();
const children = value => Array.isArray(value) ? value.flatMap(children) : value == null || value === false ? [] : [value];
function mount(element) {
  if (!element) return new THREE.Group();
  if (typeof element.type === "function") return mount(element.type(element.props));
  if (typeof element.type === "symbol") {
    const root = new THREE.Group();
    for (const child of children(element.props.children)) root.add(mount(child));
    return root;
  }
  const props = element.props;
  const object = element.type === "mesh" ? new THREE.Mesh(props.geometry, props.material ?? material) : new THREE.Group();
  object.name = props.name ?? "";
  object.userData = props.userData ?? {};
  if (props.position) object.position.fromArray(props.position);
  if (props.rotation) object.rotation.fromArray(props.rotation);
  if (props.scale) object.scale.fromArray(props.scale);
  if (props.visible !== undefined) object.visible = props.visible;
  for (const child of children(props.children)) {
    const geometries = { boxGeometry: THREE.BoxGeometry, planeGeometry: THREE.PlaneGeometry,
      cylinderGeometry: THREE.CylinderGeometry, torusGeometry: THREE.TorusGeometry };
    if (geometries[child.type]) object.geometry = new geometries[child.type](...child.props.args);
    else if (!String(child.type).endsWith("Material")) object.add(mount(child));
  }
  return object;
}
const eyes = ["luffy", "chopper"].map(id => {
  const rig = getPassengerSkeleton(id);
  return { id, y: .64 + rig.seatedHipHeight + rig.neckAboveHip + rig.headAboveNeck + .02 };
});
// Inspect the mounted cylinders, not a second copy of the production route.
// A capped tube may end at another tube or in the ceiling; nowhere else.
const ceilingUndersideY = 3.14;
function pipeSegment(mesh) {
  assert.equal(mesh.geometry.type, "CylinderGeometry", `${mesh.name} remains a real rounded tube.`);
  const { height, radiusTop, radiusBottom } = mesh.geometry.parameters;
  return { mesh, radius: Math.max(radiusTop, radiusBottom),
    start: new THREE.Vector3(0, -height / 2, 0).applyMatrix4(mesh.matrixWorld),
    end: new THREE.Vector3(0, height / 2, 0).applyMatrix4(mesh.matrixWorld) };
}
function mergedPipeSegments(mesh) {
  const { geometry } = mesh, positions = geometry.getAttribute("position"), segments = [];
  assert(geometry.groups.length > 0, "Merged connections retain geometry groups so their actual tubes can be inspected.");
  const pipeCount = mesh.userData.segments?.length;
  assert(Number.isInteger(pipeCount) && pipeCount > 0 && geometry.groups.length >= pipeCount,
    "Merged tube metadata identifies actual geometry ranges, including every connection.");
  for (const group of geometry.groups.slice(0, pipeCount)) {
    const bounds = new THREE.Box3(), vertex = new THREE.Vector3();
    for (let offset = group.start; offset < group.start + group.count; offset++) {
      const index = geometry.index ? geometry.index.getX(offset) : offset;
      vertex.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld); bounds.expandByPoint(vertex);
    }
    const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const axis = size.y > size.z ? "y" : "z";
    // Junction spheres/ceiling plates follow these cylinder groups. Derive
    // endpoints from vertices, independently of the metadata coordinates.
    assert(size[axis] > .044 + 1e-5, "Each declared tube is present as a physical cylinder, not a junction sphere.");
    const start = center.clone(), end = center.clone();
    start[axis] = bounds.min[axis]; end[axis] = bounds.max[axis];
    assert([.028, .044].some(diameter => Math.abs(size.x - diameter) < 1e-5),
      "Actual connection cylinders use the original 22 mm rail radius or 14 mm ceiling fixings.");
    segments.push({ mesh, radius: size.x / 2, start, end });
  }
  assert(segments.length > 0, "Merged rail connection contains actual cylindrical tube geometry.");
  return segments;
}
function pipeConnectivity(meshes) {
  const pipes = meshes.flatMap(mesh => mesh.geometry.type === "CylinderGeometry" ? [pipeSegment(mesh)] : mergedPipeSegments(mesh));
  const neighbours = pipes.map(() => new Set()), floating = [], anchors = new Set();
  const segment = new THREE.Line3(), nearest = new THREE.Vector3();
  pipes.forEach((pipe, index) => {
    for (const endpoint of [pipe.start, pipe.end]) {
      const anchored = endpoint.y + pipe.radius >= ceilingUndersideY - 1e-4;
      if (anchored) anchors.add(index);
      let joined = anchored;
      pipes.forEach((other, otherIndex) => {
        if (index === otherIndex) return;
        segment.set(other.start, other.end).closestPointToPoint(endpoint, true, nearest);
        if (endpoint.distanceTo(nearest) <= pipe.radius + other.radius + 1e-4) {
          neighbours[index].add(otherIndex); neighbours[otherIndex].add(index); joined = true;
        }
      });
      if (!joined) floating.push({ name: pipe.mesh.name, position: endpoint.toArray() });
    }
  });
  const anchoredPipes = new Set(anchors), pending = [...anchors];
  for (let cursor = 0; cursor < pending.length; cursor++) for (const adjacent of neighbours[pending[cursor]]) {
    if (!anchoredPipes.has(adjacent)) { anchoredPipes.add(adjacent); pending.push(adjacent); }
  }
  let components = 0;
  const visited = new Set();
  for (let index = 0; index < pipes.length; index++) {
    if (visited.has(index)) continue;
    components++; const component = [index]; visited.add(index);
    for (let cursor = 0; cursor < component.length; cursor++) for (const adjacent of neighbours[component[cursor]]) {
      if (!visited.has(adjacent)) { visited.add(adjacent); component.push(adjacent); }
    }
  }
  return { pipes, floating, anchors: anchors.size, unanchored: pipes.length - anchoredPipes.size, components };
}
function connectionRaycastParts(mesh) {
  // Keep every actual production triangle, split only into its existing ranges
  // for bounded raycasting. A long merged mesh's whole-bus bounding sphere
  // would otherwise send every test ray through every remote support triangle.
  const source = mesh.geometry, attribute = source.getAttribute("position");
  return source.groups.map(group => {
    const coordinates = new Float32Array(group.count * 3);
    for (let offset = 0; offset < group.count; offset++) {
      const index = source.index ? source.index.getX(group.start + offset) : group.start + offset;
      coordinates[offset * 3] = attribute.getX(index);
      coordinates[offset * 3 + 1] = attribute.getY(index);
      coordinates[offset * 3 + 2] = attribute.getZ(index);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(coordinates, 3));
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const part = new THREE.Mesh(geometry, material); part.name = mesh.name;
    part.matrix.copy(mesh.matrixWorld); part.matrixAutoUpdate = false; part.updateMatrixWorld(true);
    return part;
  });
}
const raycaster = new THREE.Raycaster(), target = new THREE.Vector3(), direction = new THREE.Vector3();
const gridColumns = 19, gridRows = 11;
const report = { eyeHeights: eyes, columns: PASSENGER_SEAT_X, screenGrid: [gridColumns, gridRows], rays: 0,
  mountedRings: 0, mountedStraps: 0, mountedRails: 0, mountedConnections: 0, connectedPipeEnds: 0,
  floatingEndsDetectedInControl: 0, ceilingAnchors: 0,
  unsplitRailObstructions: 0, centralHandleX: GRAB_HANDLE_X, cases: [] };
assert.equal(GRAB_HANDLE_X, .35, "Restore the original aisle grab-handle location instead of moving it beside the windows.");
assert(TV_HANDLE_CLEARANCE_Z >= 3.2, "Every television retains its local longitudinal handle clearance.");
assert.deepEqual(getGrabRailSpans(-5, 12, [[0, 2.55, 0], [0, 2.55, 2]]), [[-5, -.15], [5.2, 12]], "Overlapping television gaps merge without duplicate rail fragments.");
assert.deepEqual(getGrabRailSpans(-5, 12, []), [[-5, 12]], "With no screen, the original grab rails remain continuous.");
for (const rows of [6, 18, 256, 2000]) for (const focusRow of new Set([0, Math.floor(rows / 2), rows - 1])) {
  const rowZs = getRenderedRowIndices(rows, focusRow).map(getSeatRowZ);
  const tvPositions = getTvPositions(rows, TV_POSITION), rearWallZ = getBusRearWallZ(rows);
  const cabinLength = rearWallZ - BUS_FRONT_Z, cabinCenterZ = (BUS_FRONT_Z + rearWallZ) / 2;
  const cabin = mount({ type: BusCabinDetails, props: { mats, cabinLength,
    cabinCenterZ, rearWallZ, rowZs, wheelPositions: [], tvPositions } });
  const handles = cabin.getObjectsByProperty("name", "bus-grab-handle");
  const rings = cabin.getObjectsByProperty("name", "bus-grab-handle-ring");
  const rails = cabin.getObjectsByProperty("name", "bus-grab-rail");
  const connections = cabin.getObjectsByProperty("name", "bus-grab-rail-bridge");
  const handleMeshes = handles.flatMap(handle => handle.children.filter(child => child.isMesh));
  const lowerOccluders = [...handleMeshes, ...rails];
  cabin.updateMatrixWorld(true);
  const connectionParts = connections.flatMap(connectionRaycastParts);
  const occluders = [...lowerOccluders, ...connectionParts];
  assert(rings.length === handles.length && handleMeshes.length === rings.length * 2, "Each handle retains its original ring and suspension strap.");
  assert(new Set(handles.map(handle => handle.userData.z)).size <= 10 && handles.length <= 20, "Decoration stays capped at ten detailed rows, with two handles per row.");
  assert(rings.every(ring => ring.geometry.type === "TorusGeometry" && ring.geometry.parameters.radius === .09
    && ring.geometry.parameters.tube === .015 && ring.scale.y === .85), "Preserve the original torus shape and size.");
  const expectedSpans = getGrabRailSpans(BUS_FRONT_Z + 1.2, rearWallZ - .4, tvPositions);
  assert(rails.length === expectedSpans.length * 2 && rails.length <= (tvPositions.length + 1) * 2,
    "Only the screen gaps split the two original rails, with a bounded number of fragments.");
  for (const mesh of lowerOccluders) {
    assert(Math.abs(Math.abs(mesh.position.x) - .35) < 1e-8, "Every rail, strap and ring returns to the original central aisle position.");
    const bounds = new THREE.Box3().setFromObject(mesh);
    for (const [, , screenZ] of tvPositions) {
      assert(bounds.max.z <= screenZ - .15 + 1e-4 || bounds.min.z >= screenZ + TV_HANDLE_CLEARANCE_Z - 1e-4,
        `Actual ${mesh.name} at ${mesh.position.toArray()} spans ${bounds.min.z}..${bounds.max.z}, inside local TV zone ${screenZ - .15}..${screenZ + TV_HANDLE_CLEARANCE_Z}.`);
    }
  }
  for (const side of [-1, 1]) {
    const sideRails = rails.filter(rail => Math.sign(rail.position.x) === side).sort((a, b) => a.position.z - b.position.z);
    sideRails.forEach((rail, index) => {
      const bounds = new THREE.Box3().setFromObject(rail);
      assert(Math.abs(bounds.min.z - expectedSpans[index][0]) < 1e-4
        && Math.abs(bounds.max.z - expectedSpans[index][1]) < 1e-4,
        "The original full-length rail remains everywhere outside the television gaps.");
    });
  }
  for (const rail of rails) {
    assert(rail.geometry.type === "CylinderGeometry" && Math.abs(rail.position.y - 2.9) < 1e-8
      && rail.geometry.parameters.radiusTop === .022, "Splitting the original rails preserves their roof height and thickness.");
  }
  assert(connections.length === 2, "A single merged connection mesh per side keeps the extra draw calls bounded at two.");
  const connectivity = pipeConnectivity([...rails, ...connections]);
  assert.equal(connectivity.floating.length, 0,
    `Every actual tube end meets another tube or the ceiling: ${JSON.stringify(connectivity.floating)}`);
  assert.equal(connectivity.unanchored, 0, "Each part of the complete rail network is secured to the ceiling.");
  assert.equal(connectivity.components, 2, "Each side forms one continuous pipe assembly from front to rear, with no detached rail fragments.");
  assert(connectivity.anchors >= 4, "Both ends of both complete rails have ceiling fixtures.");
  assert(connectivity.pipes.length <= 2 * (8 * tvPositions.length + 4), "Tube count grows only with the capped screen count, never passenger rows.");
  const floatingControl = pipeConnectivity(rails);
  assert(floatingControl.floating.length > 0 && floatingControl.unanchored === rails.length,
    "Positive control: the previous split rails without connection pieces have loose ends and no ceiling support.");
  for (const side of [-1, 1]) {
    const sidePipes = connectivity.pipes.filter(pipe => Math.sign(pipe.start.x) === side);
    const totalBounds = new THREE.Box3();
    for (const pipe of sidePipes) { totalBounds.expandByPoint(pipe.start); totalBounds.expandByPoint(pipe.end); }
    assert(Math.abs(totalBounds.min.z - (BUS_FRONT_Z + 1.2)) < 1e-4
      && Math.abs(totalBounds.max.z - (rearWallZ - .4)) < 1e-4,
      "The actual connected rail assembly reaches the same full length as the original rail.");
    assert(Math.abs(totalBounds.max.y - ceilingUndersideY) < 1e-4,
      "The actual ceiling mounts extend to the ceiling surface, including before and behind televisions.");
  }
  // Positive control: intact original rails must recreate an obstruction at a
  // secondary screen, proving the local clearance test can detect a missing gap.
  const unsplitRails = [-1, 1].map(side => {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, cabinLength - 1.6, 12), material);
    rail.position.set(side * .35, 2.9, cabinCenterZ + .4); rail.rotation.x = Math.PI / 2;
    rail.updateMatrixWorld(true); return rail;
  });
  let caseRays = 0;
  for (let screenIndex = 0; screenIndex < tvPositions.length; screenIndex++) {
    const pos = tvPositions[screenIndex];
    const frame = mount({ type: BusTvFrame, props: { pos, idx: screenIndex, tvOn: true, isActive: true, visible: true,
      mats, tvOffTex: texture, posterTex: texture } });
    frame.updateMatrixWorld(true);
    const screen = frame.getObjectByName("bus-tv-display");
    screen.geometry.computeBoundingBox();
    const screenBounds = screen.geometry.boundingBox;
    assert(Math.abs(screenBounds.max.x - screenBounds.min.x - 1.26) < 1e-6
      && Math.abs(screenBounds.max.y - screenBounds.min.y - .70875) < 1e-6, "Raycasts cover the actual display and its corners.");
    const viewerRows = Array.from({ length: rows }, (_, row) => row).filter(row => {
      const distance = getSeatRowZ(row) + .03 - pos[2];
      return distance > .1 && distance <= TV_HANDLE_CLEARANCE_Z;
    });
    assert(viewerRows.length > 0, `TV ${screenIndex} at ${pos[2]} in ${rows} rows has no real seat within its cleared viewing zone.`);
    for (const row of viewerRows) for (const x of PASSENGER_SEAT_X) for (const eye of eyes) {
      raycaster.ray.origin.set(x, eye.y, getSeatRowZ(row) + .03);
      for (let gx = 0; gx < gridColumns; gx++) for (let gy = 0; gy < gridRows; gy++) {
        target.set(THREE.MathUtils.lerp(screenBounds.min.x, screenBounds.max.x, gx / (gridColumns - 1)),
          THREE.MathUtils.lerp(screenBounds.min.y, screenBounds.max.y, gy / (gridRows - 1)), 0).applyMatrix4(screen.matrixWorld);
        direction.subVectors(target, raycaster.ray.origin);
        raycaster.far = direction.length() - 1e-6;
        raycaster.ray.direction.copy(direction).normalize();
        const intersections = raycaster.intersectObjects(occluders, false);
        assert(intersections.length === 0, `${rows} rows / focus ${focusRow} / screen ${screenIndex} / row ${row} / column ${x} / ${eye.id}: a handle or rail intrudes into the local TV clearance.`);
        if (raycaster.intersectObjects(unsplitRails, false).length) report.unsplitRailObstructions++;
        report.rays++; caseRays++;
      }
    }
    frame.traverse(object => { if (object.isMesh) object.geometry.dispose(); });
  }
  for (const rail of unsplitRails) rail.geometry.dispose();
  for (const part of connectionParts) part.geometry.dispose();
  report.mountedRings += rings.length;
  report.mountedStraps += handleMeshes.length - rings.length;
  report.mountedRails += rails.length;
  report.mountedConnections += connections.length;
  report.connectedPipeEnds += connectivity.pipes.length * 2;
  report.ceilingAnchors += connectivity.anchors;
  report.floatingEndsDetectedInControl += floatingControl.floating.length;
  report.cases.push({ rows, focusRow, renderedRows: rowZs.length, televisions: tvPositions.length, rings: rings.length,
    rails: rails.length, connectionMeshes: connections.length, connectedPipes: connectivity.pipes.length,
    ceilingAnchors: connectivity.anchors, connectedAssemblies: connectivity.components,
    floatingEnds: connectivity.floating.length, rays: caseRays });
  cabin.traverse(object => { if (object.isMesh && object.geometry.type !== "RoundedBoxGeometry") object.geometry.dispose(); });
}
assert(report.rays > 10000 && report.mountedRings > 0 && report.mountedStraps > 0, "Exercise real rings, straps and thousands of rays within the cleared TV zones.");
assert(report.unsplitRailObstructions > 0, "The same ray grid detects an original continuous rail crossing a secondary display.");
if (process.env.BUS_TV_HANDLE_OUTPUT) await writeFile(process.env.BUS_TV_HANDLE_OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
material.dispose(); texture.dispose(); delete globalThis.document;
console.log("Original central handles and local TV clearance passed:", JSON.stringify(report));
