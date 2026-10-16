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
    export { TV_HANDLE_CLEARANCE_Z } from './src/lib/bus-interior-geometry';
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
  getBusRearWallZ, BUS_FRONT_Z, PASSENGER_SEAT_X, getPassengerSkeleton, TV_HANDLE_CLEARANCE_Z, TV_POSITION } = await import(
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
const raycaster = new THREE.Raycaster(), target = new THREE.Vector3(), direction = new THREE.Vector3();
const gridColumns = 19, gridRows = 11;
const report = { eyeHeights: eyes, columns: PASSENGER_SEAT_X, screenGrid: [gridColumns, gridRows], rays: 0,
  mountedRings: 0, mountedStraps: 0, mountedRails: 0, legacyRailObstructions: 0, minimumSideClearance: Infinity, minimumScreenDepthGap: Infinity, cases: [] };
assert(TV_HANDLE_CLEARANCE_Z >= 3.2, "Every television must retain at least 3.2 m of longitudinal handle clearance behind its mount.");
for (const rows of [6, 18, 256, 2000]) for (const focusRow of new Set([0, Math.floor(rows / 2), rows - 1])) {
  const rowZs = getRenderedRowIndices(rows, focusRow).map(getSeatRowZ);
  const tvPositions = getTvPositions(rows, TV_POSITION), rearWallZ = getBusRearWallZ(rows);
  const cabin = mount({ type: BusCabinDetails, props: { mats, cabinLength: rearWallZ - BUS_FRONT_Z,
    cabinCenterZ: (BUS_FRONT_Z + rearWallZ) / 2, rearWallZ, rowZs, wheelPositions: [], tvPositions } });
  const handles = cabin.getObjectsByProperty("name", "bus-grab-handle");
  const rings = cabin.getObjectsByProperty("name", "bus-grab-handle-ring");
  const rails = cabin.getObjectsByProperty("name", "bus-grab-rail");
  // Positive control: the same production cylinders at the previous aisle
  // location must reproduce the obscured upper display that prompted the fix.
  const legacyRails = rows === 18 && focusRow === 0 ? rails.map(rail => {
    const clone = rail.clone(); clone.position.x = Math.sign(rail.position.x) * .35;
    clone.updateMatrixWorld(true); return clone;
  }) : [];
  const handleMeshes = handles.flatMap(handle => handle.children.filter(child => child.isMesh));
  const occluders = [...handleMeshes, ...rails];
  cabin.updateMatrixWorld(true);
  const handleBounds = handleMeshes.map(mesh => new THREE.Box3().setFromObject(mesh));
  assert(rings.length === handles.length && handleMeshes.length === rings.length * 2, "Each actual handle consists of its torus and its suspension strap.");
  assert(new Set(handles.map(handle => handle.userData.z)).size <= 10 && handles.length <= 20, "Cabin decoration remains capped at ten detailed rows, with two handles per row.");
  assert(rings.every(ring => ring.geometry.type === "TorusGeometry"), "Raycasts must use the production torus triangles.");
  assert(rails.length === 2 && rails.every(rail => rail.geometry.type === "CylinderGeometry"), "Both production longitudinal grab rails must be included in the sightline check.");
  for (const rail of rails) {
    const bounds = new THREE.Box3().setFromObject(rail);
    const sideClearance = Math.min(Math.abs(bounds.min.x), Math.abs(bounds.max.x)) - Math.max(...PASSENGER_SEAT_X.map(Math.abs));
    assert(sideClearance > .025, "The real grab rails must stay outside the eye-to-display cone, rather than crossing the display's upper corners.");
    assert(Math.abs(rail.position.y - 2.9) < 1e-8
      && Math.abs(rail.geometry.parameters.height - (rearWallZ - BUS_FRONT_Z - 1.6)) < 1e-8,
    "Moving the rails sideways must preserve their roof height and full cabin length.");
  }
  for (const handle of handles) {
    const z = handle.userData.z;
    for (const [, , screenZ] of tvPositions) {
      assert(z < screenZ - .15 || z > screenZ + TV_HANDLE_CLEARANCE_Z, "Front and rear repeat screens must receive the same actual empty handle zone.");
    }
  }
  for (const bounds of handleBounds) {
    const sideClearance = Math.min(Math.abs(bounds.min.x), Math.abs(bounds.max.x)) - Math.max(...PASSENGER_SEAT_X.map(Math.abs));
    report.minimumSideClearance = Math.min(report.minimumSideClearance, sideClearance);
    assert(sideClearance > .025, "Actual straps and ring triangles stay outside all four seat-eye columns, even before aiming toward the central screen.");
  }
  let caseRays = 0;
  for (let screenIndex = 0; screenIndex < tvPositions.length; screenIndex++) {
    const pos = tvPositions[screenIndex];
    const frame = mount({ type: BusTvFrame, props: { pos, idx: screenIndex, tvOn: true, isActive: true, visible: true,
      mats, tvOffTex: texture, posterTex: texture } });
    frame.updateMatrixWorld(true);
    const screen = frame.getObjectByName("bus-tv-display");
    screen.geometry.computeBoundingBox();
    const screenBounds = screen.geometry.boundingBox;
    const screenZ = screen.getWorldPosition(new THREE.Vector3()).z;
    for (const bounds of handleBounds) {
      const before = screenZ - bounds.max.z, after = bounds.min.z - screenZ;
      // Check the actual mesh extremities, allowing only the physical thickness
      // between the television mount, display surface and handle triangle skin.
      assert(before > .15 || after > TV_HANDLE_CLEARANCE_Z - .08, "Real ring and strap geometry must stay out of the screen's empty longitudinal zone.");
      if (after > 0) report.minimumScreenDepthGap = Math.min(report.minimumScreenDepthGap, after);
    }
    assert(Math.abs(screenBounds.max.x - screenBounds.min.x - 1.26) < 1e-6
      && Math.abs(screenBounds.max.y - screenBounds.min.y - .70875) < 1e-6, "The sightline grid covers the real television display, including all four corners.");
    const eligibleRows = Array.from({ length: rows }, (_, row) => row).filter(row => getSeatRowZ(row) + .03 - pos[2] >= 2.5);
    assert(eligibleRows.length > 0, "Every mounted television has real rows behind it.");
    // Near, middle and far eyes exercise both steep and almost parallel views.
    const viewerRows = new Set([eligibleRows[0], eligibleRows[Math.floor(eligibleRows.length / 2)], eligibleRows.at(-1)]);
    for (const row of viewerRows) for (const x of PASSENGER_SEAT_X) for (const eye of eyes) {
      raycaster.ray.origin.set(x, eye.y, getSeatRowZ(row) + .03);
      for (let gx = 0; gx < gridColumns; gx++) for (let gy = 0; gy < gridRows; gy++) {
        target.set(THREE.MathUtils.lerp(screenBounds.min.x, screenBounds.max.x, gx / (gridColumns - 1)),
          THREE.MathUtils.lerp(screenBounds.min.y, screenBounds.max.y, gy / (gridRows - 1)), 0).applyMatrix4(screen.matrixWorld);
        direction.subVectors(target, raycaster.ray.origin);
        raycaster.far = direction.length() - 1e-6;
        raycaster.ray.direction.copy(direction).normalize();
        const intersections = raycaster.intersectObjects(occluders, false);
        assert(intersections.length === 0, `${rows} rows / focus ${focusRow} / screen ${screenIndex} / row ${row} / column ${x} / ${eye.id}: a real handle, strap or grab rail obscures the display grid.`);
        if (legacyRails.length && raycaster.intersectObjects(legacyRails, false).length) report.legacyRailObstructions++;
        report.rays++; caseRays++;
      }
    }
    frame.traverse(object => { if (object.isMesh) object.geometry.dispose(); });
  }
  report.mountedRings += rings.length;
  report.mountedStraps += handleMeshes.length - rings.length;
  report.mountedRails += rails.length;
  report.cases.push({ rows, focusRow, renderedRows: rowZs.length, televisions: tvPositions.length, rings: rings.length, rails: rails.length, rays: caseRays });
  cabin.traverse(object => { if (object.isMesh && object.geometry.type !== "RoundedBoxGeometry") object.geometry.dispose(); });
}
assert(report.rays > 10000 && report.mountedRings > 0 && report.mountedStraps > 0, "The test must cover real rings, real straps and thousands of screen sightlines.");
assert(report.legacyRailObstructions > 0, "The same raycast grid must detect the prior rail obstruction, rather than passing an insensitive fixture.");
report.minimumSideClearance = Number(report.minimumSideClearance.toFixed(6));
report.minimumScreenDepthGap = Number(report.minimumScreenDepthGap.toFixed(6));
if (process.env.BUS_TV_HANDLE_OUTPUT) await writeFile(process.env.BUS_TV_HANDLE_OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
material.dispose(); texture.dispose(); delete globalThis.document;
console.log("Mounted TV/handle clearance passed:", JSON.stringify(report));
