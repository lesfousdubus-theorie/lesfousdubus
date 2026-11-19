import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { setSceneryParts } from "./world-visibility";

type Point = [number, number, number];
type MaterialKey = keyof typeof SCENERY_MATERIALS;

const elbafFlowTime = { value: 0 };

export function setElbafWaterTime(time: number) {
  elbafFlowTime.value = time;
}

const TERRAIN_RELIEF = [1.1, 0.32, 0.55, 0.65, 1.05, 0.45, 0.64, 0.25];

function smoothstep(start: number, end: number, value: number) {
  const t = THREE.MathUtils.clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}

function sceneryTerrainHeight(zone: number, x: number, z: number) {
  const wave = Math.sin(z * 0.11 + x * 0.21 + zone) * 0.5 + Math.sin(z * 0.23 - x * 0.13) * 0.27;
  const shoulder = smoothstep(7, 17, Math.abs(x));
  const shore = 1 - smoothstep(38, 48, Math.abs(x));
  const canal = zone === 1 ? 1 - smoothstep(1.4, 3.5, Math.abs(Math.abs(x) - 22)) : 0;
  const oasis = zone === 0 ? 1 - smoothstep(4.8, 9.2, Math.hypot((x + 28) / 1.2, z + 32)) : 0;
  return 0.008 + shoulder * shore * Math.max(0, 0.35 + wave) * TERRAIN_RELIEF[zone] * (1 - canal) * (1 - oasis) - canal * 0.06;
}

function sampleMaxTerrainHeight(zone: number, x0: number, x1: number, z0: number, z1: number, step = 1.0) {
  let max = 0.008;
  for (let x = x0; x <= x1; x += step) {
    for (let z = z0; z <= z1; z += step) {
      max = Math.max(max, sceneryTerrainHeight(zone, x, z));
    }
  }
  return Math.max(max, sceneryTerrainHeight(zone, x1, z1));
}

// Shared materials keep façade details in the same meshes without allocating
// textures or lights for each destination.
export const SCENERY_MATERIALS = {
  sandstone: new THREE.MeshStandardMaterial({ color: "#c9894d", roughness: 1 }),
  sandLight: new THREE.MeshStandardMaterial({ color: "#f3d49a", roughness: 0.94 }),
  cream: new THREE.MeshStandardMaterial({ color: "#fff0ca", roughness: 0.91 }),
  turquoise: new THREE.MeshStandardMaterial({ color: "#358f9f", roughness: 0.62 }),
  water: new THREE.MeshStandardMaterial({ color: "#43bdd7", roughness: 0.25, metalness: 0.08 }),
  foam: new THREE.MeshStandardMaterial({ color: "#c6f0ed", roughness: 0.75 }),
  coral: new THREE.MeshStandardMaterial({ color: "#cc7258", roughness: 0.9 }),
  peach: new THREE.MeshStandardMaterial({ color: "#e8ae7b", roughness: 0.9 }),
  blueHouse: new THREE.MeshStandardMaterial({ color: "#9db9c3", roughness: 0.9 }),
  roof: new THREE.MeshStandardMaterial({ color: "#9c4b3e", roughness: 0.84 }),
  dark: new THREE.MeshStandardMaterial({ color: "#293e4c", roughness: 0.9 }),
  cloud: new THREE.MeshStandardMaterial({ color: "#fffdf2", roughness: 1 }),
  cloudShade: new THREE.MeshStandardMaterial({ color: "#d5e5e5", roughness: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: "#5b9c54", roughness: 0.95 }),
  leafLight: new THREE.MeshStandardMaterial({ color: "#b5d884", roughness: 0.95 }),
  gold: new THREE.MeshStandardMaterial({ color: "#efbd42", metalness: 0.55, roughness: 0.36 }),
  oldGold: new THREE.MeshStandardMaterial({ color: "#ac7e35", metalness: 0.34, roughness: 0.58 }),
  wood: new THREE.MeshStandardMaterial({ color: "#694245", roughness: 0.95 }),
  vermilion: new THREE.MeshStandardMaterial({ color: "#a64c51", roughness: 0.91 }),
  jadeRoof: new THREE.MeshStandardMaterial({ color: "#346b6f", roughness: 0.8 }),
  blossom: new THREE.MeshStandardMaterial({ color: "#e98caa", roughness: 1 }),
  blossomLight: new THREE.MeshStandardMaterial({ color: "#ffd1d7", roughness: 1 }),
  rock: new THREE.MeshStandardMaterial({ color: "#70849c", roughness: 1 }),
  rockLight: new THREE.MeshStandardMaterial({ color: "#9bb1c4", roughness: 1 }),
  snow: new THREE.MeshStandardMaterial({ color: "#f4faff", roughness: 1 }),
  castle: new THREE.MeshStandardMaterial({ color: "#d5deef", roughness: 0.91 }),
  pine: new THREE.MeshStandardMaterial({ color: "#34666c", roughness: 1 }),
  lamp: new THREE.MeshStandardMaterial({ color: "#ffda8d", emissive: "#f39b38", emissiveIntensity: 0.45, roughness: 0.8 }),
  neonCyan: new THREE.MeshStandardMaterial({ color: "#8ff6ff", emissive: "#1cd4ff", emissiveIntensity: 0.75, roughness: 0.35 }),
  metal: new THREE.MeshStandardMaterial({ color: "#8d9db0", metalness: 0.62, roughness: 0.38 }),
  foliageDeep: new THREE.MeshStandardMaterial({ color: "#2d6f43", roughness: 0.94 }),
  eggCobalt: new THREE.MeshStandardMaterial({ color: "#1762df", roughness: 0.53 }),
  eggIndigo: new THREE.MeshStandardMaterial({ color: "#24398e", roughness: 0.53 }),
  eggAqua: new THREE.MeshStandardMaterial({ color: "#21bddd", roughness: 0.52 }),
  eggRed: new THREE.MeshStandardMaterial({ color: "#eb5147", roughness: 0.58 }),
  eggOrange: new THREE.MeshStandardMaterial({ color: "#ff981f", roughness: 0.56 }),
  eggYellow: new THREE.MeshStandardMaterial({ color: "#ffcc39", roughness: 0.52 }),
  eggMint: new THREE.MeshStandardMaterial({ color: "#50c6ab", roughness: 0.73 }),
  eggWindow: new THREE.MeshStandardMaterial({ color: "#b7faff", emissive: "#43d9ff", emissiveIntensity: 0.5, roughness: 0.34 }),
  eggTube: new THREE.MeshStandardMaterial({ color: "#a6edff", emissive: "#45baff", emissiveIntensity: 0.16,
    transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.28 }),
  elbafCliff: new THREE.MeshStandardMaterial({ color: "#957d6b", roughness: 1 }),
  elbafBark: new THREE.MeshStandardMaterial({ color: "#946139", roughness: 1 }),
  elbafGrass: new THREE.MeshStandardMaterial({ color: "#8fc344", roughness: 1 }),
  elbafRainbow: new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide,
    transparent: true, opacity: .68, depthWrite: false, toneMapped: false }),
  elbafFalls: new THREE.MeshStandardMaterial({ color: "#70bfea", emissive: "#51a7e2", emissiveIntensity: .24,
    side: THREE.DoubleSide, transparent: true, opacity: .93, depthWrite: false }),
};

SCENERY_MATERIALS.elbafRainbow.onBeforeCompile = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", `
    outgoingLight = diffuseColor.rgb;
    #include <opaque_fragment>
  `);
};

SCENERY_MATERIALS.elbafFalls.onBeforeCompile = (shader) => {
  shader.uniforms.elbafFlowTime = elbafFlowTime;
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vElbafFlow;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvElbafFlow = position;");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nuniform float elbafFlowTime;\nvarying vec3 vElbafFlow;")
    .replace("#include <color_fragment>", `
      #include <color_fragment>
      float stream = sin(vElbafFlow.z * 17.0 + sin(vElbafFlow.z * 5.0)) * .36;
      float flow = sin(vElbafFlow.y * 2.1 + elbafFlowTime * 5.8 + vElbafFlow.z * 4.2);
      float foam = smoothstep(.22, .95, .34 + stream + flow * .27);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86, .98, 1.0), .21 + foam * .72);
    `);
};

export interface SceneryBatch {
  material: THREE.MeshStandardMaterial;
  geometry: THREE.BufferGeometry;
  section: number | null;
}

class Builder {
  private pieces = new Map<string, { key: MaterialKey; section: number | null; shapes: THREE.BufferGeometry[] }>();

  constructor(private readonly splitForeground = false) {}

  add(geometry: THREE.BufferGeometry, material: MaterialKey, position: Point, rotation: Point = [0, 0, 0], scale: Point = [1, 1, 1]) {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    );
    const plain = geometry.index ? geometry.toNonIndexed() : geometry;
    if (plain !== geometry) geometry.dispose();
    for (const attr of Object.keys(plain.attributes)) {
      if (attr !== "position" && attr !== "normal" && !(material === "elbafRainbow" && attr === "color")) {
        plain.deleteAttribute(attr);
      }
    }
    if (!plain.hasAttribute("normal")) plain.computeVertexNormals();
    plain.applyMatrix4(matrix);
    plain.computeBoundingBox();
    const bounds = plain.boundingBox!;
    // Les canaux et autres bandes continues gardent leur lot d'origine.
    const section = this.splitForeground && bounds.max.y > .5 && bounds.max.z - bounds.min.z < 28
      ? Math.floor((bounds.min.z + bounds.max.z) / 44) : null;
    const id = `${material}:${section}`;
    const group = this.pieces.get(id) ?? { key: material, section, shapes: [] };
    group.shapes.push(plain);
    this.pieces.set(id, group);
  }

  box(material: MaterialKey, position: Point, size: Point, rotation: Point = [0, 0, 0]) {
    this.add(new THREE.BoxGeometry(...size), material, position, rotation);
  }

  cylinder(material: MaterialKey, position: Point, top: number, bottom: number, height: number, segments = 12, rotation: Point = [0, 0, 0]) {
    this.add(new THREE.CylinderGeometry(top, bottom, height, segments), material, position, rotation);
  }

  sphere(material: MaterialKey, position: Point, radius: number, scale: Point = [1, 1, 1], segments = 12) {
    this.add(new THREE.SphereGeometry(radius, segments, 8), material, position, [0, 0, 0], scale);
  }

  dome(material: MaterialKey, position: Point, radius: number, scale: Point = [1, 1, 1]) {
    this.add(new THREE.SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), material, position, [0, 0, 0], scale);
  }

  ring(material: MaterialKey, position: Point, radius: number, tube: number, rotation: Point = [Math.PI / 2, 0, 0]) {
    this.add(new THREE.TorusGeometry(radius, tube, 5, 24), material, position, rotation);
  }

  curve(material: MaterialKey, points: Point[], radius: number, segments = 16) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    this.add(new THREE.TubeGeometry(curve, segments, radius, 6, false), material, [0, 0, 0]);
  }

  // A hip roof with raised eave corners, rather than a four-sided cone.
  roof(material: MaterialKey, position: Point, width: number, depth: number, height: number) {
    const perimeter = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
    const vertices: number[] = [];
    const rings = [[1, 1, 0], [0.71, 0.73, height * 0.28], [0.1, 0.55, height]];
    const vertex = (ring: number, edge: number): Point => {
      const [x, z] = perimeter[edge % 8];
      const [w, d, y] = rings[ring];
      return [x * width * w / 2, y + (ring === 0 && edge % 2 === 0 ? height * 0.22 : 0), z * depth * d / 2];
    };
    for (let ring = 0; ring < 2; ring++) {
      for (let edge = 0; edge < 8; edge++) {
        const a = vertex(ring, edge), b = vertex(ring, edge + 1);
        const c = vertex(ring + 1, edge + 1), d = vertex(ring + 1, edge);
        vertices.push(...a, ...c, ...b, ...a, ...d, ...c);
      }
    }
    // Fermer le sommet au faîtage (ring 2) et le soffite sous ring 0 (-Y) contre le backface culling.
    const ridgeTop: Point = [0, height, 0];
    const soffitCenter: Point = [0, 0, 0];
    for (let edge = 0; edge < 8; edge++) {
      const topA = vertex(2, edge), topB = vertex(2, edge + 1);
      vertices.push(...ridgeTop, ...topB, ...topA);
      const botA = vertex(0, edge), botB = vertex(0, edge + 1);
      vertices.push(...soffitCenter, ...botA, ...botB);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    this.add(geometry, material, position);
  }

  finish(): SceneryBatch[] {
    return Array.from(this.pieces.values(), ({ key, section, shapes }) => {
      const geometry = mergeGeometries(shapes, false)!;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      setSceneryParts(geometry, shapes);
      shapes.forEach((shape) => shape.dispose());
      return { material: SCENERY_MATERIALS[key], geometry, section };
    });
  }
}

function arch(b: Builder, x: number, y: number, z: number, width: number, height: number, wall: MaterialKey = "cream") {
  // Entrances/windows face west, towards the road, with a rounded stone crown.
  b.box("dark", [x, y + height * 0.36, z], [0.09, height * 0.72, width]);
  b.dome("dark", [x - 0.005, y + height * 0.72, z], width / 2, [0.08, 1, 1]);
  b.box(wall, [x - 0.08, y + height * 0.35, z - width * 0.6], [0.2, height * 0.75, width * 0.16]);
  b.box(wall, [x - 0.08, y + height * 0.35, z + width * 0.6], [0.2, height * 0.75, width * 0.16]);
}

function palaceTower(b: Builder, x: number, y: number, z: number, height: number, radius: number) {
  b.cylinder("cream", [x, y + height / 2, z], radius * 0.9, radius, height);
  b.cylinder("sandLight", [x, y + height * 0.8, z], radius * 1.12, radius * 1.12, 0.4);
  b.cylinder("sandLight", [x, y + height, z], radius * 1.15, radius, 0.45);
  b.dome("turquoise", [x, y + height + 0.2, z], radius * 1.17, [1, 1.35, 1]);
  b.cylinder("gold", [x, y + height + radius * 1.65, z], 0, 0.16, radius * 0.8, 6);
  arch(b, x - radius * 0.94, y + height * 0.52, z, radius * 0.58, radius * 1.4);
}

function alabasta(b: Builder, lowPower: boolean) {
  // Wide terraced mesa and a blue-domed palace, with a ceremonial stair
  // descending toward the bus. The cliff has actual irregular rock ribs.
  b.cylinder("sandstone", [0, 4.2, 0], 15.4, 17.5, 8.4, 14);
  b.cylinder("sandLight", [0, 8.4, 0], 15.8, 15.6, 0.65, 14);
  for (let i = 0; i < 14; i++) {
    const angle = i / 14 * Math.PI * 2;
    const x = Math.cos(angle) * 15.3, z = Math.sin(angle) * 15.3;
    b.cylinder(i % 3 ? "sandstone" : "sandLight", [x, 3.8, z], 0.6, 1.3, 7.6 + Math.sin(i * 3) * 0.7, 5);
  }
  b.cylinder("cream", [0, 9.15, 0], 12.7, 13.6, 1.0, 14);
  b.box("sandLight", [0, 12.8, 0], [11.5, 6.8, 12]);
  b.box("cream", [-0.1, 16.2, 0], [12.4, 0.65, 12.8]);
  b.box("cream", [-1.3, 17.7, 0], [7, 3.0, 8]);
  b.dome("turquoise", [-1.3, 19.25, 0], 4.2, [1, 1.25, 1]);
  b.cylinder("gold", [-1.3, 24.7, 0], 0, 0.25, 1.5, 6);
  b.sphere("gold", [-1.3, 25.5, 0], 0.35);
  for (const side of [-1, 1]) {
    palaceTower(b, -2.5, 9.5, side * 8.2, 7.7, 1.55);
    palaceTower(b, 6.5, 9.5, side * 6.5, 10.0, 1.35);
    b.box("cream", [-1.2, 11.2, side * 10.9], [9, 3.0, 3.2]);
    b.dome("turquoise", [-2, 12.8, side * 10.9], 1.65, [1.2, 0.8, 1]);
    for (let z = -4; z <= 4; z += 2) arch(b, -5.88, 10.0, z, 0.8, 2.5);
  }
  // Blue façade reliefs echo Alubarna's long geometric vertical inlays.
  for (const z of [-4.6, -3.1, 3.1, 4.6]) {
    b.box("turquoise", [-5.79, 14.05, z], [0.12, 3.9, 0.45]);
    b.box("gold", [-5.9, 15.6, z], [0.14, 0.45, 0.7], [0, 0, 0.1]);
  }
  arch(b, -5.9, 10, 0, 2, 4.6);
  b.box("turquoise", [-6.2, 9.9, 0], [3.4, 0.16, 3.5]);
  for (let i = 0; i < 17; i++) {
    const x = -7.5 - i * 0.64, y = 9.5 - i * 0.59;
    b.box(i % 3 ? "sandLight" : "cream", [x, y - 0.14, 0], [0.7, 0.58, 4.1]);
    for (const side of [-1, 1]) b.box("sandstone", [x, y + 0.45, side * 2.4], [0.72, 0.8, 0.5]);
  }
  if (!lowPower) {
    // Low city walls and rooftop awnings make the palace read as a kingdom.
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.28 + i * Math.PI * 0.14;
      const x = Math.cos(a) * 11.6 + 0.5, z = Math.sin(a) * 11.6;
      b.box(i % 2 ? "cream" : "peach", [x, 10.0, z], [2.7, 1.8 + i % 2, 2.5]);
      b.box("sandLight", [x, 11.0 + (i % 2) * 0.5, z], [3, 0.2, 2.8]);
      b.box(i % 2 ? "turquoise" : "coral", [x - 1.4, 10.2, z], [0.9, 0.14, 2.2], [0, 0, 0.28]);
    }
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      b.box("cream", [Math.cos(a) * 13.1, 10, Math.sin(a) * 13.1], [0.7, 0.85, 0.7]);
    }
    // Obélisques au pied et au sommet du grand escalier royal d'Alubarna, plus braseros dorés.
    for (const side of [-1, 1]) {
      b.cylinder("sandstone", [-18.2, 2.2, side * 3.8], 0.35, 0.6, 4.4, 4);
      b.cylinder("gold", [-18.2, 4.75, side * 3.8], 0, 0.35, 0.7, 4);
      b.cylinder("sandstone", [-9.6, 11.6, side * 3.4], 0.28, 0.45, 3.8, 4);
      b.cylinder("gold", [-9.6, 13.8, side * 3.4], 0, 0.28, 0.6, 4);
      b.cylinder("sandstone", [-8.0, 9.9, side * 2.5], 0.45, 0.55, 1.0, 8);
      b.sphere("lamp", [-8.0, 10.65, side * 2.5], 0.42);
    }
    // Tour de l'horloge d'Alubarna sur le côté ouest de la place, dégagée de la falaise.
    b.box("cream", [-17.2, 4.8, -9.8], [2.6, 9.6, 2.6]);
    b.dome("turquoise", [-17.2, 9.8, -9.8], 1.5, [1, 1.2, 1]);
    b.cylinder("gold", [-17.2, 11.9, -9.8], 0, 0.14, 1.0, 6);
    b.cylinder("sandLight", [-18.55, 7.6, -9.8], 0.75, 0.75, 0.12, 12, [0, 0, Math.PI / 2]);
  }
}

function venetianHouse(b: Builder, x: number, y: number, z: number, width: number, height: number, color: MaterialKey, lowPower: boolean) {
  b.box(color, [x, y + height / 2, z], [width, height, width * 0.82]);
  b.box("cream", [x, y + height - 0.15, z], [width + 0.4, 0.35, width * 0.82 + 0.4]);
  b.roof("roof", [x, y + height, z], width + 0.8, width + 0.1, 1.2);
  b.box("roof", [x + width * 0.25, y + height + 1.2, z + 0.4], [0.42, 1.25, 0.55]);
  const floors = lowPower ? 2 : Math.max(2, Math.floor(height / 2.4));
  for (let floor = 0; floor < floors; floor++) {
    const wy = y + 1 + floor * (height - 2) / Math.max(1, floors - 1);
    for (const side of [-1, 1]) {
      arch(b, x - width / 2 - 0.06, wy, z + side * width * 0.23, 0.55, 1.1);
      b.box("dark", [x + side * width * 0.24, wy + 0.4, z - width * 0.41 - 0.03], [0.58, 1.1, 0.07]);
    }
    if (!lowPower && floor === 1) {
      b.box("cream", [x - width / 2 - 0.35, wy - 0.1, z], [0.75, 0.15, width * 0.7]);
      b.box("dark", [x - width / 2 - 0.66, wy + 0.15, z], [0.07, 0.4, width * 0.7]);
    }
  }
}

function waterSeven(b: Builder, lowPower: boolean) {
  // La grande fontaine reste centrée dans wx <= 46 et dégagée du canal est (wx = 22, x_local = -11).
  const cx = 2.2;
  for (let tier = 0; tier < 4; tier++) {
    const radius = 10.0 - tier * 1.95, bottom = tier * 4.1;
    b.cylinder("cream", [cx, bottom + 1.8, 0], radius, radius + 0.65, 3.6, 24);
    b.cylinder("water", [cx, bottom + 3.65, 0], radius + 0.06, radius + 0.06, 0.18, 24);
    b.ring("foam", [cx, bottom + 3.77, 0], radius - 0.15, 0.15);
    b.cylinder("turquoise", [cx, bottom + 0.28, 0], radius + 0.55, radius + 0.55, 0.4, 24);
    const count = lowPower ? 6 : 10;
    for (let flow = 0; flow < count; flow++) {
      const angle = flow / count * Math.PI * 2;
      const r = radius + 0.1;
      b.box("water", [cx + Math.cos(angle) * r, bottom + 1.8, Math.sin(angle) * r], [0.18, 3.7, 1.3], [0, -angle, 0]);
      if (!lowPower) b.box("foam", [cx + Math.cos(angle) * (r + 0.08), bottom + 1.5, Math.sin(angle) * (r + 0.08)], [0.06, 2.7, 0.16], [0, -angle, 0]);
    }
  }
  b.cylinder("cream", [cx, 18, 0], 2.2, 3.4, 3.9, 16);
  b.cylinder("water", [cx, 20, 0], 2.3, 2.3, 0.2, 16);
  b.cylinder("cream", [cx, 21.3, 0], 0.9, 1.5, 2.5, 12);
  b.sphere("water", [cx, 22.9, 0], 1.1, [0.65, 1.4, 0.65]);
  b.ring("foam", [cx, 20.15, 0], 2.05, 0.13);
  const houses: [number, number, number, number, number, MaterialKey][] = [
    [-2.8, 3.8, -7.2, 2.6, 5.2, "coral"], [1.5, 3.8, -9.2, 2.9, 6.4, "peach"],
    [5.8, 3.8, -8.5, 3.1, 5.6, "cream"], [8.8, 3.8, -4.8, 2.7, 7.2, "blueHouse"],
    [9.5, 3.8, 1.8, 2.7, 5.5, "coral"], [6.8, 3.8, 7.6, 3.0, 6.1, "peach"],
    [1.2, 3.8, 9.2, 2.8, 4.8, "blueHouse"], [-3.2, 3.8, 7.2, 2.6, 6.2, "coral"],
    [4.8, 11.9, -3.2, 2.4, 5.4, "peach"], [5.6, 7.9, 4.8, 2.6, 6.0, "cream"],
  ];
  houses.filter((_, i) => !lowPower || i % 2 === 0).forEach((house) => venetianHouse(b, ...house, lowPower));
  // Tour de l'horloge Galley-La sur le haut de la fontaine.
  b.cylinder("coral", [cx + 4.8, 11.5, -1.5], 1.4, 1.75, 14.5, 8);
  b.cylinder("cream", [cx + 4.8, 18.9, -1.5], 1.85, 1.85, 0.5, 8);
  b.dome("turquoise", [cx + 4.8, 19.2, -1.5], 1.9, [1, 1.1, 1]);
  b.cylinder("gold", [cx + 4.8, 21.9, -1.5], 0, 0.14, 1.3, 6);
  b.cylinder("cream", [cx + 3.35, 17.1, -1.5], 0.8, 0.8, 0.12, 16, [0, 0, Math.PI / 2]);
  b.box("dark", [cx + 3.24, 17.28, -1.5], [0.08, 0.52, 0.08]);
  b.box("dark", [cx + 3.23, 17.1, -1.27], [0.08, 0.08, 0.45]);
  // Passerelle piétonne arquée enjambant perpendiculairement le canal (x_local = -11, wx = 22).
  for (let step = 0; step <= 12; step++) {
    const bx = -15.0 + step * (8.0 / 12);
    const y = 0.55 + Math.sin(step / 12 * Math.PI) * 1.45;
    b.box("cream", [bx, y, -8], [0.74, 0.36, 2.8]);
    for (const side of [-1, 1]) {
      b.box("cream", [bx, y + 0.65, -8 + side * 1.35], [0.75, 0.15, 0.22]);
      if (step % 2 === 0) b.box("cream", [bx, y + 0.36, -8 + side * 1.35], [0.18, 0.65, 0.18]);
    }
  }
  for (const bx of [-15.0, -7.0]) b.box("cream", [bx, 0.28, -8], [0.9, 0.56, 2.8]);
  // Quai en bois sur pilotis ancrés au fond, Yagara Bull sur l'eau du canal et grue Galley-La.
  b.box("wood", [-13.0, 0.65, 7.0], [2.4, 0.22, 6.0]);
  for (const px of [-13.9, -12.1]) {
    for (const pz of [4.4, 7.0, 9.6]) b.cylinder("wood", [px, 0.25, pz], 0.11, 0.13, 0.86, 6);
  }
  b.sphere("dark", [-10.6, 0.24, 11.2], 1, [0.75, 0.28, 2.5]);
  b.sphere("wood", [-10.6, 0.38, 11.2], 1, [0.58, 0.12, 2.1]);
  if (!lowPower) {
    // Yagara Bull amarré le long du quai dans le canal (wx ≈ 22.4).
    b.sphere("turquoise", [-10.6, 0.56, 8.7], 0.48, [0.8, 0.8, 1.05]);
    b.box("coral", [-10.6, 1.18, 11.2], [1.05, 0.14, 2.0]);
    for (const pz of [10.4, 12.0]) b.cylinder("wood", [-10.6, 0.78, pz], 0.06, 0.06, 0.76, 6);
    // Grue navale de Galley-La posée sur le quai, flèche orientée vers le canal (+X).
    b.cylinder("metal", [-13.5, 3.0, 5.4], 0.22, 0.32, 6.0, 8);
    b.box("metal", [-11.8, 5.85, 5.4], [4.0, 0.26, 0.28], [0, 0, 0.16]);
    b.cylinder("gold", [-10.0, 4.85, 5.4], 0.05, 0.05, 2.4, 6);
    b.box("wood", [-10.0, 3.45, 5.4], [1.3, 0.5, 1.0]);
    // Lanternes chaudes ancrées sur le quai et aux entrées de la passerelle.
    for (const [lx, ly, lz] of [[-13.9, 1.75, 4.4], [-13.9, 1.75, 9.6], [-15.0, 1.1, -9.8], [-7.0, 1.1, -9.8]]) {
      b.cylinder("dark", [lx, ly, lz], 0.07, 0.1, 2.2, 6);
      b.sphere("lamp", [lx, ly + 1.2, lz], 0.28);
    }
  }
}

function skypiea(b: Builder, lowPower: boolean) {
  // Floating scalloped cloud shelf with a golden city on top.
  const cloudCount = lowPower ? 7 : 13;
  for (let i = 0; i < cloudCount; i++) {
    const a = i / cloudCount * Math.PI * 2;
    b.sphere(i % 3 ? "cloud" : "cloudShade", [Math.cos(a) * 9, 4 + Math.sin(i) * 0.45, Math.sin(a) * 8], 5.2, [1.05, 0.55, 0.9]);
  }
  b.sphere("cloud", [0, 4.4, 0], 10, [1.2, 0.45, 1]);
  b.cylinder("oldGold", [0, 7, 1.5], 8.6, 9.5, 0.8, 12);
  // Three thick strands entwine: the Giant Jack reads as a climbing beanstalk.
  for (let strand = 0; strand < 3; strand++) {
    const points: Point[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = i * 0.48 + strand * Math.PI * 2 / 3;
      points.push([-5 + Math.cos(a) * 1.15, 5 + i * 1.9, 2 + Math.sin(a) * 1.15]);
    }
    b.curve(strand === 1 ? "leafLight" : "leaf", points, strand === 1 ? 0.75 : 1.05, 40);
  }
  for (let i = 0; i < (lowPower ? 5 : 8); i++) {
    const a = i * 1.78, y = 10 + i * 3.1;
    const x = -5 + Math.cos(a) * 4.1, z = 2 + Math.sin(a) * 4.1;
    b.sphere(i % 2 ? "leaf" : "leafLight", [x, y, z], 2.2, [1.7, 0.18, 0.72]);
    b.curve("leaf", [[-5, y - 1.2, 2], [x * 0.55 - 2.2, y - 0.4, z * 0.55], [x, y, z]], 0.22, 7);
  }
  // Shandora: a stepped golden plinth, carved columns, central hanging bell.
  for (let i = 0; i < 4; i++) b.box(i % 2 ? "gold" : "oldGold", [6, 7.5 + i * 0.55, 0], [11 - i * 1.3, 0.55, 10 - i * 1.2]);
  for (const side of [-1, 1]) {
    b.cylinder("oldGold", [6 + side * 3.5, 13.5, 0], 0.55, 0.75, 9.5, 8);
    b.box("gold", [6 + side * 3.5, 10.4, 0], [1.65, 0.55, 1.65]);
    b.box("gold", [6 + side * 3.5, 17.9, 0], [1.8, 0.5, 1.8]);
    b.curve("gold", [[6 + side * 4.5, 18.7, 0], [6 + side * 3, 19.7, 0], [6 + side * 2, 19, 0]], 0.25, 10);
  }
  b.box("oldGold", [6, 18.4, 0], [9.6, 0.65, 1.2]);
  b.box("gold", [6, 18.9, 0], [8.5, 0.3, 1.5]);
  b.cylinder("oldGold", [6, 16.7, 0], 0.14, 0.14, 2.8, 8);
  const bellProfile = [[0.0, 0], [2.8, 0], [2.85, 0.25], [2.3, 0.6], [1.75, 1.5], [1.6, 3.5], [1.2, 4.0], [0.5, 4.2], [0, 4.2]];
  b.add(new THREE.LatheGeometry(bellProfile.map(([r, y]) => new THREE.Vector2(r, y)), 20), "gold", [6, 10.1, 0]);
  b.ring("oldGold", [6, 10.4, 0], 2.7, 0.16);
  b.ring("oldGold", [6, 12.8, 0], 1.69, 0.13);
  b.sphere("oldGold", [6, 9.8, 0], 0.45);
  if (!lowPower) {
    for (const z of [-7.2, 7.2]) {
      for (let i = 0; i < 3; i++) {
        const x = -0.5 + i * 3.3;
        b.cylinder("oldGold", [x, 9, z], 0.45, 0.7, 3.3 + (i % 2) * 1.4, 8);
        b.box("gold", [x, 10.75 + (i % 2) * 0.7, z], [1.4, 0.35, 1.4]);
      }
      b.box("oldGold", [2.8, 11.3, z], [8.4, 0.55, 1.1]);
    }
    // Ponéglyphe de Shandora (socle sombre gravé d'or) et braseros sacrés sur l'esplanade dorée.
    b.box("dark", [-1.2, 8.6, 0], [1.7, 2.4, 1.7]);
    b.box("gold", [-2.07, 8.6, 0], [0.08, 1.6, 1.1]);
    for (const side of [-1, 1]) {
      b.cylinder("oldGold", [-1.0, 8.1, side * 4.0], 0.5, 0.35, 1.4, 8);
      b.sphere("lamp", [-1.0, 9.05, side * 4.0], 0.45);
    }
    // Petit îlot nuageux suspendu avec son arbre céleste à côté du Giant Jack.
    b.sphere("cloud", [-12.5, 14.5, 6.5], 2.8, [1.2, 0.45, 1]);
    b.cylinder("wood", [-12.5, 15.8, 6.5], 0.18, 0.28, 1.4, 6);
    b.sphere("leafLight", [-12.5, 16.8, 6.5], 1.25, [1.15, 0.65, 1.15]);
  }
  // A long white cloud ribbon curls upward behind the beanstalk.
  b.curve("cloud", [[-11, 5.7, -4], [-13, 8, -7], [-10, 12, -9], [-5, 16, -8], [1, 19, -6]], 0.7, 22);
}

function cherryTree(b: Builder, x: number, y: number, z: number, size: number, lowPower: boolean) {
  b.curve("wood", [[x, y, z], [x - size * 0.15, y + size * 0.6, z], [x + size * 0.1, y + size * 1.4, z]], size * 0.12, 8);
  for (const side of [-1, 1]) b.curve("wood", [[x, y + size * 0.6, z], [x + side * size * 0.5, y + size, z], [x + side * size * 0.9, y + size * 1.35, z]], size * 0.065, 7);
  const lobes = lowPower ? 4 : 7;
  for (let i = 0; i < lobes; i++) {
    const a = i / lobes * Math.PI * 2;
    b.sphere(i % 2 ? "blossom" : "blossomLight", [x + Math.cos(a) * size * 0.72, y + size * 1.4 + Math.sin(i * 4) * size * 0.15, z + Math.sin(a) * size * 0.5], size * 0.75, [1.15, 0.62, 0.9]);
  }
  b.sphere("blossomLight", [x, y + size * 1.85, z], size * 0.77, [1.2, 0.55, 1]);
}

function wano(b: Builder, lowPower: boolean) {
  // The Flower Capital's castle rises from a curved, living tree-rock,
  // with an asymmetric crown of blossoms rather than a plain red cylinder.
  b.cylinder("rockLight", [0, 1.8, 0], 11, 13, 3.6, 10);
  b.cylinder("leaf", [0, 3.8, 0], 11.3, 11.5, 0.5, 10);
  b.curve("wood", [[0, 2, 0], [1.5, 7, 1], [-1, 13, 0], [0, 18, 0]], 3.7, 20);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    b.curve("wood", [[Math.cos(a) * 10, 3, Math.sin(a) * 8], [Math.cos(a) * 6, 4.1, Math.sin(a) * 5], [0, 9, 0]], 0.65, 12);
  }
  for (const side of [-1, 1]) {
    b.curve("wood", [[0, 9, 0], [side * 6, 12.5, 0], [side * 10, 13.7, side * 3]], 1.1, 12);
    cherryTree(b, side * 9, 12.7, side * 3, 4.3, lowPower);
  }
  b.box("rockLight", [0, 17.3, 0], [9.4, 2, 8.5]);
  b.box("cream", [0, 18.4, 0], [9.8, 0.45, 9]);
  for (let tier = 0; tier < 4; tier++) {
    const y = 18.6 + tier * 2.8, width = 8.8 - tier * 1.55, depth = 7.8 - tier * 1.25;
    b.box("cream", [0, y + 1.15, 0], [width, 2.3, depth]);
    b.box("vermilion", [-width / 2 - 0.06, y + 0.3, 0], [0.2, 0.26, depth + 0.3]);
    for (const side of [-1, 1]) {
      b.box("vermilion", [-width / 2 - 0.08, y + 1.15, side * depth * 0.38], [0.22, 2.4, 0.22]);
      b.box("dark", [-width / 2 - 0.03, y + 1.27, side * depth * 0.17], [0.14, 1.15, 0.7]);
      b.box("gold", [-width / 2 - 0.12, y + 1.27, side * depth * 0.17], [0.16, 0.08, 0.8]);
    }
    b.roof("jadeRoof", [0, y + 2.35, 0], width + 3.8, depth + 3.3, 1.65);
    b.box("gold", [0, y + 4.05, 0], [0.16, 0.16, depth * 0.55]);
  }
  // Paired curling roof finials, deliberately visible against the sky.
  for (const side of [-1, 1]) b.curve("gold", [[0, 30.8, side * 1.5], [0, 31.8, side * 2.1], [0, 32.3, side * 1.5]], 0.2, 9);
  // Vermilion bridge and a torii on the approach, both outside the road.
  for (let i = 0; i < 11; i++) {
    const x = -16 + i * 0.7, y = 0.8 + Math.sin(i / 10 * Math.PI) * 1.25;
    b.box("wood", [x, y, -10], [0.76, 0.22, 3.1]);
    for (const side of [-1, 1]) {
      b.box("vermilion", [x, y + 1.1, -10 + side * 1.55], [0.74, 0.16, 0.18]);
      if (i % 2 === 0) b.box("vermilion", [x, y + 0.6, -10 + side * 1.55], [0.16, 1.3, 0.16]);
    }
  }
  for (const ax of [-16, -9]) {
    b.box("rockLight", [ax, 0.4, -10], [0.9, 0.85, 3.2]);
    b.box("rockLight", [ax + (ax < -12 ? -0.65 : 0.65), 0.2, -10], [0.65, 0.44, 3.1]);
  }
  for (const z of [-12.2, -7.8]) b.cylinder("vermilion", [-15.7, 3.2, z], 0.28, 0.38, 6.6, 10);
  b.box("vermilion", [-15.7, 5.9, -10], [0.55, 0.38, 6]);
  b.curve("jadeRoof", [[-15.7, 6.6, -13.4], [-15.7, 6.2, -10], [-15.7, 6.6, -6.6]], 0.28, 10);
  if (!lowPower) {
    cherryTree(b, -9.8, sceneryTerrainHeight(3, SET_PIECE_OFFSET_X - 9.8, 11) - 0.06, 11, 4.4, false);
    for (let i = 0; i < 5; i++) {
      const z = -7 + i * 3.5;
      b.cylinder("wood", [-11, 1.8, z], 0.09, 0.13, 3.6, 6);
      b.sphere("lamp", [-11, 3.6, z], 0.45, [0.85, 1.15, 0.85]);
      b.cylinder("vermilion", [-11, 4.08, z], 0.25, 0.25, 0.11, 8);
    }
    // Maisons de la Capitale des Fleurs dégagées du rocher et bannières ancrées sur la terrasse.
    for (const [hx, hz] of [[-7.5, -14.8], [-5.5, 14.2], [-14.8, 1.5]]) {
      b.box("wood", [hx, 1.5, hz], [3.6, 3.0, 3.4]);
      b.roof("jadeRoof", [hx, 3.0, hz], 4.8, 4.5, 1.35);
      b.box("lamp", [hx - 1.85, 1.7, hz], [0.08, 1.2, 1.6]);
    }
    for (const side of [-1, 1]) {
      b.cylinder("vermilion", [-4.6, 20.1, side * 4.1], 0.07, 0.09, 3.2, 6);
      b.box("gold", [-4.6, 21.0, side * 4.5], [0.1, 1.3, 0.75]);
    }
  }
}

function drum(b: Builder, lowPower: boolean) {
  // The Drum Rockies have narrow walls, flared snow crowns and vertical
  // buttresses. Their unequal heights leave a clear outline for the castle.
  const mesas: [number, number, number, number][] = [[0, 0, 26, 5.4], [-10.5, 7, 17.5, 4.6], [10, -6, 21.5, 4.9], [9, 10, 13.5, 4.1]];
  for (const [x, z, height, radius] of mesas) {
    b.cylinder("rock", [x, height / 2, z], radius * 0.9, radius * 1.1, height, 11);
    b.cylinder("rockLight", [x, height - 1.3, z], radius * 1.08, radius * 0.87, 2.2, 11);
    b.cylinder("snow", [x, height + 0.15, z], radius * 1.15, radius * 1.13, 0.85, 12);
    b.dome("snow", [x, height + 0.55, z], radius * 1.12, [1, 0.12, 1]);
    const ribs = lowPower ? 6 : 11;
    for (let rib = 0; rib < ribs; rib++) {
      const a = rib / ribs * Math.PI * 2;
      const offset = radius * 0.9;
      b.cylinder(rib % 3 ? "rock" : "rockLight", [x + Math.cos(a) * offset, height * 0.44, z + Math.sin(a) * offset], 0.3, 0.65, height * 0.84, 5);
      if (!lowPower) b.cylinder("snow", [x + Math.cos(a) * radius, height - 1.0 - (rib % 3) * 0.3, z + Math.sin(a) * radius], 0.13, 0, 2 + rib % 3, 5);
    }
  }
  // Kureha's isolated castle, perched on the tallest snowy mesa.
  const base = 26.8;
  b.box("castle", [0, base + 2.2, 0], [7.1, 4.4, 5.8]);
  b.roof("dark", [0, base + 4.5, 0], 8.3, 6.8, 2.2);
  b.roof("snow", [0, base + 4.62, 0], 7.8, 6.5, 2.1);
  const towers: [number, number, number][] = [[-3.4, -2.3, 7.4], [-3.4, 2.3, 6.6], [3.4, -2.3, 8.5], [3.4, 2.3, 7.3]];
  for (const [x, z, height] of towers) {
    b.cylinder("castle", [x, base + height / 2, z], 1.05, 1.35, height, 10);
    b.cylinder("snow", [x, base + height - 0.2, z], 1.4, 1.4, 0.4, 10);
    b.cylinder("dark", [x, base + height + 1.15, z], 0, 1.65, 2.5, 10);
    b.cylinder("snow", [x, base + height + 1.6, z], 0, 1.2, 1.7, 10);
    arch(b, x - 1.08, base + height * 0.63, z, 0.44, 1.3, "castle");
  }
  b.cylinder("castle", [1, base + 5.5, 0], 1.35, 1.6, 11, 10);
  b.cylinder("dark", [1, base + 12.3, 0], 0, 2.0, 3.5, 10);
  b.cylinder("snow", [1, base + 12.9, 0], 0, 1.45, 2.5, 10);
  // Drapeau pirate de sakura du Dr. Hiriluk au sommet du donjon.
  b.cylinder("metal", [1, base + 15.6, 0], 0.08, 0.1, 3.4, 6);
  b.box("dark", [1, base + 16.4, 1.1], [0.1, 1.45, 2.1]);
  b.sphere("blossom", [0.94, base + 16.4, 1.1], 0.34);
  for (const [py, pz] of [[0.34, 0], [-0.34, 0], [0, 0.34], [0, -0.34]]) {
    b.sphere("blossomLight", [0.92, base + 16.4 + py, 1.1 + pz], 0.18);
  }
  arch(b, -3.62, base + 0.2, 0, 1.6, 3.1, "castle");
  for (const z of [-2.2, 2.2]) arch(b, -3.64, base + 2.3, z, 0.62, 1.6, "castle");
  // A winding, pale path and little snowbound village give the sheer heights scale.
  b.curve("snow", [[-16, 0.4, -14], [-13, 0.5, -7], [-16, 0.4, 0], [-12, 0.6, 11]], 1.0, 20);
  if (!lowPower) {
    for (let i = 0; i < 3; i++) {
      const x = -10 + i * 4.8, z = -12 + (i % 2) * 1.7;
      b.box(i % 2 ? "wood" : "castle", [x, 1.3, z], [3.2, 2.6, 3.4]);
      b.roof("dark", [x, 2.6, z], 4, 4.3, 1.6);
      b.roof("snow", [x, 2.74, z], 3.9, 4.2, 1.6);
      b.box("lamp", [x - 1.63, 1.4, z], [0.1, 0.65, 0.65]);
      b.box("rock", [x + 0.8, 3.7, z + 0.6], [0.45, 1.2, 0.55]);
      b.sphere("cloudShade", [x + 0.8, 4.7, z + 0.6], 0.48, [1.1, 0.8, 1.1]);
    }
    // Téléphérique du mont Drum : pylône de départ, câble, bras porteur et cabine éclairée.
    b.box("rock", [-13.5, 2.1, -5.5], [1.8, 4.2, 1.8]);
    b.box("metal", [-13.5, 4.3, -5.5], [2.0, 0.3, 2.0]);
    b.curve("metal", [[-13.5, 4.3, -5.5], [-8.5, 15.2, -2.5], [-3.8, base + 1.5, -0.5]], 0.07, 16);
    b.cylinder("metal", [-8.5, 14.85, -2.5], 0.08, 0.08, 0.75, 6);
    b.box("vermilion", [-8.5, 13.7, -2.5], [1.6, 1.6, 1.8]);
    b.box("lamp", [-9.32, 13.8, -2.5], [0.08, 0.55, 1.0]);
  }
}

function eggheadTower(b: Builder, x: number, z: number, radius: number, height: number,
  body: MaterialKey, trim: MaterialKey, lowPower: boolean, front = -1) {
  const drum = (material: MaterialKey, y: number, top: number, bottom: number, depth: number) =>
    b.cylinder(material, [x, y * height, z], radius * top, radius * bottom, depth * height, 16);
  drum("snow", .13, .9, .96, .26);
  drum(body, .34, 1, .91, .23);
  drum("eggWindow", .48, 1.01, 1.01, .14);
  drum(body, .62, .96, 1.02, .18);
  drum(trim, .71, 1, .96, .04);
  b.dome(body, [x, height * .7, z], radius * .97, [1, height * .29 / radius, 1]);
  for (const y of [.23, .405, .555, .685]) b.ring(trim, [x, height * y, z], radius * .99, .052 * radius);
  const pillars = lowPower ? 8 : 12;
  for (let i = 0; i < pillars; i++) {
    const a = i * Math.PI * 2 / pillars;
    b.box(trim, [x + Math.cos(a) * radius * 1.01, height * .48, z + Math.sin(a) * radius * 1.01],
      [radius * .09, height * .13, radius * .085], [0, -a, 0]);
  }
  const rise = .14 / .29;
  const across = Math.sqrt(1 - rise * rise);
  const angle = Math.atan2(across / (radius * .97), rise / (height * .29));
  const porthole = (offset: number): Point => [
    x + front * (radius * .97 * across + Math.sin(angle) * offset),
    height * .84 + Math.cos(angle) * offset, z,
  ];
  const tilt: Point = [0, 0, -front * angle];
  b.cylinder(trim, porthole(.15), radius * .2, radius * .2, .26, 12, tilt);
  b.cylinder("eggWindow", porthole(.31), radius * .145, radius * .145, .08, 12, tilt);
  const doorX = x + front * radius * .96;
  const doorHeight = height * .17;
  b.box("dark", [doorX, .06 + doorHeight / 2, z], [.18, doorHeight, radius * .4]);
  b.dome("dark", [doorX, .06 + doorHeight, z], radius * .2, [.12, .78, 1]);
}

function eggheadTube(b: Builder, points: Point[], radius: number, lowPower: boolean) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const segments = lowPower ? 18 : 28;
  b.add(new THREE.TubeGeometry(curve, segments, radius, lowPower ? 8 : 12), "eggTube", [0, 0, 0]);
  const normal = new THREE.Vector3(0, 0, 1);
  const tangent = new THREE.Vector3(), center = new THREE.Vector3();
  const rotation = new THREE.Quaternion(), euler = new THREE.Euler();
  const collarCount = lowPower ? 5 : 8;
  for (let i = 0; i < collarCount; i++) {
    const t = i / (collarCount - 1);
    curve.getPointAt(t, center);
    curve.getTangentAt(t, tangent);
    euler.setFromQuaternion(rotation.setFromUnitVectors(normal, tangent));
    b.ring("eggYellow", [center.x, center.y, center.z], radius * 1.04, radius * .09, [euler.x, euler.y, euler.z]);
  }
  const rail = (offset: number): Point[] => points.map(([x, y, z]) => [x - radius * .45, y + radius * offset, z]);
  b.curve("eggWindow", rail(.88), .045, segments);
  b.curve("eggAqua", rail(-.88), .05, segments);
}

function eggheadPalm(b: Builder, x: number, z: number, height: number, lowPower: boolean, yBase = 0) {
  b.curve("peach", [[x, yBase, z], [x + .22, yBase + height * .44, z - .13], [x + .65, yBase + height, z]], height * .064, 8);
  const leaves = lowPower ? 4 : 6;
  for (let i = 0; i < leaves; i++) {
    const a = i * Math.PI * 2 / leaves;
    const dx = Math.cos(a), dz = Math.sin(a);
    b.add(new THREE.SphereGeometry(1, 8, 5), i % 2 ? "leafLight" : "leaf",
      [x + .65 + dx * height * .27, yBase + height + .1, z + dz * height * .27],
      [0, -a, -.22], [height * .42, height * .044, height * .13]);
  }
  b.sphere("eggOrange", [x + .64, yBase + height - .1, z], height * .08);
}

const VEGAPUNK_LETTERS = {
  V: ["10001", "10001", "10001", "01010", "00100"],
  E: ["11111", "10000", "11110", "10000", "11111"],
  G: ["01110", "10000", "10111", "10001", "01110"],
  A: ["01110", "10001", "11111", "10001", "10001"],
  P: ["11110", "10001", "11110", "10000", "10000"],
  U: ["10001", "10001", "10001", "10001", "01110"],
  N: ["10001", "11001", "10101", "10011", "10001"],
  K: ["10001", "10010", "11100", "10010", "10001"],
};

function vegapunkSign(b: Builder, x: number, y: number, z: number, unit: number) {
  const name = "VEGA PUNK";
  for (let i = 0; i < name.length; i++) {
    const glyph = VEGAPUNK_LETTERS[name[i] as keyof typeof VEGAPUNK_LETTERS];
    if (!glyph) continue;
    for (const [row, line] of glyph.entries()) {
      for (const run of line.matchAll(/1+/g)) {
        const width = run[0].length;
        const column = (run.index ?? 0) + (width - 1) * .5;
        b.box("eggYellow", [x, y + (2 - row) * unit, z + (i * 6 + column - 26) * unit],
          [.085, unit * .9, unit * (width - .1)]);
      }
    }
  }
}

function egghead(b: Builder, lowPower: boolean) {
  b.box("snow", [-5.9, .21, 0], [13, .42, 44]);
  // Au fond, le laboratoire sur son nuage dépasse la Fabriophase.
  for (let i = 0; i < (lowPower ? 8 : 12); i++) {
    const a = i * Math.PI * 2 / (lowPower ? 8 : 12);
    b.sphere(i % 3 ? "cloud" : "cloudShade", [5.4 + Math.cos(a) * 5.3, 20.6 + Math.sin(i * 1.8) * .5,
      -2 + Math.sin(a) * 8], 3.35, [1, .63, 1.1]);
  }
  b.sphere("cloud", [5.2, 21.2, -2], 7.1, [1, .49, 1.25]);
  b.sphere("snow", [5, 26, -2], 4.75, [1, 1.36, 1.05], 18);
  b.ring("eggAqua", [5, 24.2, -2], 4.56, .12, [1.48, .15, -.16]);
  b.dome("eggRed", [5, 31.8, -2], 1.34, [1, .74, 1]);
  b.curve("eggYellow", [[5, 32.25, -2], [5.1, 33.35, -2.02], [5.58, 33.8, -2.21]], .14, 8);

  eggheadTower(b, -6.6, -15.5, 4.8, 14.8, "eggCobalt", "eggIndigo", lowPower);
  b.cylinder("eggYellow", [-6.6, 16.1, -15.5], .22, 1.18, 2.95, 12);
  b.sphere("eggAqua", [-6.6, 17.8, -15.5], .64);
  b.ring("eggWindow", [-6.6, 16.65, -15.5], 1.64, .075, [1.02, 0, .38]);

  eggheadTower(b, -5.2, 16, 4.3, 12.1, "eggOrange", "eggRed", lowPower);
  b.cylinder("eggYellow", [-5.2, 15.4, 16], .7, 1.25, 7.1, 16);
  b.cylinder("eggCobalt", [-5.2, 18.9, 16], 2.14, .74, 1.6, 16);
  b.sphere("eggRed", [-5.2, 20.15, 16], 4.26, [1, .25, 1], 16);
  b.dome("eggCobalt", [-5.2, 20.4, 16], 2.58, [1, .52, 1]);
  b.ring("eggWindow", [-5.2, 19.6, 16], 3.41, .13);

  // Le globe et sa signalétique Vegapunk donnent un repère au milieu des tours.
  b.cylinder("eggRed", [-4.5, 2.8, 0], 2.1, 2.75, 5.6, 16);
  b.cylinder("eggIndigo", [-4.5, 5.8, 0], 2.56, 2.1, 1.2, 16);
  b.cylinder("snow", [-4.5, 10.25, 0], .72, 1.08, 8.3, 12);
  b.curve("eggRed", [[-5.48, 6.6, .62], [-5.5, 8.85, -.72], [-5.24, 11.1, .66], [-5.15, 14.0, -.48]], .21, 16);
  b.cylinder("eggOrange", [-4.5, 14.2, 0], 3.16, 1.1, 1.28, 16);
  b.sphere("eggAqua", [-4.5, 17.1, 0], 3.24, [1, 1.04, 1], 18);
  b.ring("eggIndigo", [-4.5, 15.0, 0], 3.07, .2);
  b.box("eggIndigo", [-7.55, 17.25, 0], [.42, 1.45, 6.34]);
  vegapunkSign(b, -7.79, 17.25, 0, .109);
  b.cylinder("eggYellow", [-4.5, 20.68, 0], .08, .15, 1.4, 8);
  b.ring("eggOrange", [-4.5, 21.1, 0], .7, .055, [1.08, .18, .22]);

  // Un anneau suspendu encadre une capsule et rappelle les enseignes de la ville.
  b.ring("eggAqua", [-6.6, 18.7, 8.6], 3.45, .22, [1.1, .28, -.21]);
  b.ring("eggWindow", [-6.6, 18.7, 8.6], 3.5, .063, [1.1, .28, -.21]);
  b.sphere("eggRed", [-6.6, 18.65, 8.6], 1.22, [1, .81, 1]);
  b.dome("snow", [-6.6, 18.83, 8.6], 1.2, [1, .55, 1]);
  b.box("eggWindow", [-7.76, 18.64, 8.6], [.12, .22, .63]);

  eggheadTower(b, 3.9, -27, 3.65, 10.8, "eggMint", "eggAqua", lowPower);
  eggheadTower(b, 3.7, 28.2, 3.6, 10.8, "snow", "eggAqua", lowPower);
  eggheadTower(b, 6.5, -11.2, 3.05, 11.4, "eggOrange", "eggYellow", lowPower);
  eggheadTower(b, 7, -.6, 3.2, 13.2, "eggMint", "eggAqua", lowPower);
  eggheadTower(b, 7.6, 17, 3.25, 10, "eggAqua", "eggIndigo", lowPower);
  if (!lowPower) {
    eggheadTower(b, 6.1, 7.3, 2.9, 11.2, "eggRed", "eggOrange", lowPower);
    eggheadTower(b, 1.3, -34, 2.65, 7.8, "eggOrange", "eggYellow", lowPower);
    eggheadTower(b, -.4, -7.1, 2.05, 6.6, "eggRed", "eggOrange", lowPower);
  }

  eggheadTube(b, [[-6.7, 10.8, -18.4], [-10, 10.82, -12.2], [-10.6, 13.5, -6], [-8.9, 13, 2.2],
    [-9.2, 10.1, 10.2], [-7.25, 10.1, 14.2]], .72, lowPower);
  eggheadTube(b, [[2.4, 8.6, -27], [-2.55, 9.65, -23], [-6.7, 11.4, -18.6]], .64, lowPower);
  eggheadTube(b, [[-5.3, 15, 16], [-9.3, 14.9, 21], [-6, 12.8, 26], [.7, 8.55, 28]], .65, lowPower);
}

function elbafBeam(b: Builder, material: MaterialKey, start: Point, end: Point, radius: number, taper = .8) {
  const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
  const center = new THREE.Vector3(...start).addScaledVector(direction, .5);
  const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  const { x, y, z } = new THREE.Euler().setFromQuaternion(rotation);
  b.cylinder(material, center.toArray(), radius * taper, radius, direction.length(), 7, [x, y, z]);
}

function elbafTerrace(b: Builder, x: number, z: number, floor: number, top: number,
  width: number, length: number, lowPower: boolean) {
  const height = top - floor;
  const sides = lowPower ? 9 : 13;
  b.add(new THREE.CylinderGeometry(.92, 1.07, height, sides), "elbafCliff",
    [x, floor + height / 2, z], [0, .12, 0], [width, 1, length]);
  b.add(new THREE.CylinderGeometry(.94, .98, .5, sides), "foliageDeep",
    [x, top - .2, z], [0, .12, 0], [width, 1, length]);
  b.add(new THREE.CylinderGeometry(.93, .94, .23, sides), "elbafGrass",
    [x, top + .055, z], [0, .12, 0], [width, 1, length]);
  for (let i = 0; i < sides; i++) {
    const angle = (i + .35) * Math.PI * 2 / sides;
    const ridge = i % 3;
    b.add(new THREE.CylinderGeometry(.65, 1.13, height * (.73 + ridge * .08), 5), ridge ? "elbafCliff" : "sandstone",
      [x + Math.cos(angle) * width * .93, floor + height * (.43 + ridge * .024), z + Math.sin(angle) * length * .93],
      [.07 * Math.sin(angle), -angle, .2 * Math.cos(angle)], [width * .13, 1, length * .115]);
  }
}

function elbafLodge(b: Builder, x: number, y: number, z: number, size: number, lowPower: boolean,
  front = -1, roof: MaterialKey = "roof") {
  const depth = size * 1.12, width = size, wall = size * .66;
  const rise = size * .73, span = size * .67;
  b.box("elbafCliff", [x, y + .1 * size, z], [depth * 1.04, size * .2, width * 1.04]);
  b.box("sandLight", [x, y + wall * .54, z], [depth, wall, width]);
  const shape = new THREE.Shape().moveTo(-width / 2, 0).lineTo(width / 2, 0).lineTo(0, rise).closePath();
  const gableDepth = depth - 0.04;
  const gable = new THREE.ExtrudeGeometry(shape, { depth: gableDepth, bevelEnabled: false }).translate(0, 0, -gableDepth / 2);
  b.add(gable, "elbafBark", [x, y + wall, z], [0, Math.PI / 2, 0]);
  const angle = Math.atan2(rise, span);
  for (const side of [-1, 1]) {
    b.box(roof, [x, y + wall + rise * .46, z + side * span / 2],
      [depth * 1.18, size * .07, Math.hypot(rise, span)], [side * angle, 0, 0]);
    for (const t of lowPower ? [.6] : [.28, .53, .78]) {
      b.box(t > .6 ? "leaf" : "wood", [x, y + wall + rise * (1 - t) + size * .025, z + side * span * t],
        [depth * 1.19, size * .046, size * .105], [side * angle, 0, 0]);
    }
  }
  const face = x + front * depth * .5;
  const faceY = y + wall;
  elbafBeam(b, "wood", [face, faceY + rise, z], [face - front * depth, faceY + rise, z], size * .046, 1);
  for (const side of [-1, 1]) {
    elbafBeam(b, "wood", [face + front * .07, faceY - size * .13, z + side * span],
      [face + front * .07, faceY + rise * 1.13, z - side * size * .12], size * .035);
    b.box("wood", [face + front * .025, y + wall * .56, z + side * width * .37], [.14, wall, size * .065]);
    b.box("lamp", [face + front * .045, y + wall * .67, z + side * width * .29], [.1, size * .16, size * .12]);
  }
  b.box("dark", [face + front * .055, y + wall * .3, z], [.16, wall * .54, size * .27]);
  b.box("wood", [face + front * .035, faceY + .05, z], [.18, size * .1, width * 1.09]);
}

function elbafPine(b: Builder, x: number, y: number, z: number, height: number) {
  b.cylinder("elbafBark", [x, y + height * .25, z], height * .045, height * .067, height * .5, 6);
  for (let i = 0; i < 3; i++) {
    b.cylinder(i === 0 ? "foliageDeep" : "leaf", [x, y + height * (.37 + i * .19), z],
      .05, height * (.26 - i * .054), height * (.48 - i * .067), 7);
  }
}

function elbafTree(b: Builder, x: number, y: number, z: number, size: number, lowPower: boolean) {
  const point = (dx: number, dy: number, dz: number): Point => [x + dx * size, y + dy * size, z + dz * size];
  const split = point(-.4, 16, -.25);
  elbafBeam(b, "elbafBark", point(0, 0, 0), split, 3.7 * size, .62);
  elbafBeam(b, "elbafBark", split, point(.7, 28, .3), 2.36 * size, .53);
  b.sphere("elbafBark", split, 2.34 * size, [1, .8, 1]);
  for (const side of [-1, 1]) {
    elbafBeam(b, "elbafBark", split, point(-1.2, 25, side * 5.3), size * 1.42, .28);
    elbafBeam(b, "wood", point(-2.1, 2, side * 2), point(-2, 17, side * 1.7), size * .66, .48);
    b.curve("elbafBark", [point(-.15, 8, side * 1.5), point(-4.7, 2.7, side * 4.4), point(-7.4, -.3, side * 5.4)],
      size * 1.13, 10);
    b.sphere("foliageDeep", point(-2.1, 26.4, side * 5.6), size * 5.2, [1.02, .52, 1.24]);
    b.sphere("leaf", point(-1.2, 28.1, side * 6.3), size * 4.8, [.96, .56, 1.22]);
  }
  b.sphere("foliageDeep", point(0, 28.2, 0), size * 6.7, [1, .55, 1.22]);
  b.sphere("leaf", point(.1, 30.3, 0), size * 6.25, [1, .57, 1.26]);
  b.sphere("elbafGrass", point(-.25, 32, -1.9), size * 4.7, [1.04, .48, 1.38]);
  if (!lowPower) {
    for (const side of [-1, 1]) b.sphere("elbafGrass", point(-1.65, 29.7, side * 8.2), size * 3.25, [1, .55, 1.13]);
  }
}

function elbafFalls(b: Builder, x: number, z: number, top: number, bottom: number, width: number) {
  const rim: Point[] = [[x + 1.55, top + .2, width], [x + .1, top + .15, width * .94],
    [x - 1.12, top - .94, width * .86], [x - 1.58, bottom + .86, width * .76], [x - 1.92, bottom + .08, width]];
  const vertices: number[] = [];
  const point = (row: number, column: number): Point => {
    const [px, y, w] = rim[row];
    const side = column / 3 - 1;
    return [px + side * side * .12 + column % 2 * .04, y, z + side * w / 2];
  };
  for (let row = 0; row < rim.length - 1; row++) {
    for (let col = 0; col < 6; col++) {
      const left = point(row, col), right = point(row, col + 1);
      const nextLeft = point(row + 1, col), nextRight = point(row + 1, col + 1);
      vertices.push(...left, ...right, ...nextRight, ...left, ...nextRight, ...nextLeft);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  b.add(geometry, "elbafFalls", [0, 0, 0]);
  if (bottom > 0.1 && bottom < 1.0) {
    b.cylinder("elbafCliff", [x - 1.95, bottom / 2, z], width * .92, width * 1.05, bottom + .04, 12);
  }
  b.sphere("water", [x - 1.95, bottom + .04, z], width * .95, [1.01, .052, .87]);
  for (const side of [-1, 0, 1]) {
    b.sphere("foam", [x - 2.03 - Math.abs(side) * .36, bottom + .13, z + side * width * .34],
      width * .42, [1, .17, .68]);
  }
}

function elbafStoneBridge(b: Builder, x: number, z: number, deck: number, span: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-span, 0);
  shape.lineTo(-span, deck);
  shape.quadraticCurveTo(0, deck + 2.9, span, deck);
  shape.lineTo(span, 0);
  shape.lineTo(span * .78, 0);
  shape.bezierCurveTo(span * .78, deck * 1.06, -span * .78, deck * 1.06, -span * .78, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 2.9, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -1.45);
  b.add(geometry, "elbafCliff", [x, 0, z], [0, Math.PI / 2, 0]);
  const height = (fraction: number) => deck + 1.45 * (1 - fraction * fraction);
  for (const side of [-1, 1]) {
    const edge = x + side * 1.42;
    b.curve("sandstone", [-1, -.5, 0, .5, 1].map(t => [edge, height(t) + .16, z + t * span]), .13, 12);
    b.curve("wood", [-1, -.5, 0, .5, 1].map(t => [edge, height(t) + .82, z + t * span]), .071, 12);
    for (const t of [-1, -.75, -.5, -.25, 0, .25, .5, .75, 1]) {
      b.box("sandLight", [edge, height(t) + .41, z + t * span], [.18, .74, .19]);
    }
  }
}

function elbafRopeBridge(b: Builder, x: number, z1: number, z2: number, startY: number, endY: number, lowPower: boolean) {
  const floor = (t: number) => THREE.MathUtils.lerp(startY, endY, t) - Math.sin(t * Math.PI) * 1.2;
  const boards = lowPower ? 10 : 16;
  const spacing = (z2 - z1) / boards;
  for (let i = 0; i < boards; i++) {
    const t = (i + .5) / boards;
    const rise = floor((i + 1) / boards) - floor(i / boards);
    b.box("elbafBark", [x, floor(t), THREE.MathUtils.lerp(z1, z2, t)],
      [1.53, .17, Math.hypot(spacing, rise) * .98], [-Math.atan2(rise, spacing), 0, 0]);
  }
  for (const side of [-1, 1]) {
    const edge = x + side * .76;
    b.curve("wood", [0, .25, .5, .75, 1].map(t => [edge, floor(t) - .06, THREE.MathUtils.lerp(z1, z2, t)]), .077, 12);
    b.curve("wood", [0, .25, .5, .75, 1].map(t => [edge, floor(t) + 1, THREE.MathUtils.lerp(z1, z2, t)]), .073, 12);
    for (const t of [0, .25, .5, .75, 1]) {
      b.box("wood", [edge, floor(t) + .52, THREE.MathUtils.lerp(z1, z2, t)], [.13, 1.1, .14]);
    }
  }
}

function elbafCastle(b: Builder, x: number, y: number, z: number, lowPower: boolean) {
  b.box("castle", [x, y + 2.05, z], [5.65, 4.1, 7.9]);
  b.box("cream", [x, y + 4.18, z], [5.95, .39, 8.2]);
  arch(b, x - 2.86, y + .15, z, 1.57, 2.8, "castle");
  for (const [dx, dz, h, radius] of [[-.6, -2.88, 9.8, 1.51], [-.3, 2.6, 7.3, 1.19], [2.05, .25, 12.55, 1.13]]) {
    const tx = x + dx, tz = z + dz;
    b.cylinder("castle", [tx, y + h / 2, tz], radius * .92, radius, h, 12);
    b.cylinder("cream", [tx, y + h, tz], radius * 1.13, radius, .45, 12);
    b.cylinder("roof", [tx, y + h + 1.57, tz], 0, radius * 1.17, 3.25, 12);
    b.sphere("gold", [tx, y + h + 3.25, tz], .18);
    arch(b, tx - radius * .98, y + h * .61, tz, .36, .93, "castle");
  }
  const blocks = lowPower ? 5 : 8;
  for (let i = 0; i < blocks; i++) {
    b.box("castle", [x - 2.72, y + 4.54, z - 3.62 + i * 7.24 / (blocks - 1)], [.36, .55, .46]);
  }
}

function elbafRainbow(b: Builder, lowPower: boolean) {
  const colors = ["#f26e64", "#ffa162", "#ffe581", "#bce381", "#83d8ec", "#8da7ed", "#c29ce3"];
  const positions: number[] = [], tints: number[] = [];
  const segments = lowPower ? 20 : 32;
  for (const [band, color] of colors.entries()) {
    const tint = new THREE.Color(color);
    const point = (segment: number, edge: number): Point => {
      const angle = segment * Math.PI / segments;
      const offset = (band + edge) * .34;
      return [12.9, 8.5 + Math.sin(angle) * (22.5 - offset), -.8 + Math.cos(angle) * (25.8 - offset)];
    };
    for (let segment = 0; segment < segments; segment++) {
      const a = point(segment, 0), b = point(segment, 1), c = point(segment + 1, 1), d = point(segment + 1, 0);
      positions.push(...a, ...b, ...c, ...a, ...c, ...d);
      for (let i = 0; i < 6; i++) tints.push(tint.r, tint.g, tint.b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(tints, 3));
  geometry.computeVertexNormals();
  b.add(geometry, "elbafRainbow", [0, 0, 0]);
}

function elbaf(b: Builder, lowPower: boolean) {
  // Deux falaises en terrasses encadrent le passage et la grande arche de pierre.
  elbafTerrace(b, -5.2, -20.6, -.2, 7, 9.2, 11.7, lowPower);
  elbafTerrace(b, 1.2, -23.3, 6.9, 14.5, 5.8, 7.9, lowPower);
  elbafTerrace(b, -5.2, 15.6, -.2, 6.6, 9.2, 11.4, lowPower);
  elbafTerrace(b, 4.1, 18.3, 6.45, 12.5, 6.5, 7.9, lowPower);
  elbafTerrace(b, -10.9, -33.4, -.2, 4.9, 5.3, 5.4, lowPower);
  elbafTerrace(b, 5.2, -1, -.2, 9.75, 5.8, 9, lowPower);

  elbafFalls(b, -14.16, -23.8, 7.05, .28, 4.05);
  elbafFalls(b, -15.7, -33.4, 5, .28, 3.1);
  elbafFalls(b, -13.2, 12, 6.68, .26, 3.65);
  elbafFalls(b, -4.39, -26.5, 14.54, 6.93, 2.35);
  elbafFalls(b, -.15, -.15, 9.82, .65, 4.4);
  const river = new THREE.Shape().moveTo(-21, -.95)
    .bezierCurveTo(-11, -1.45, -8.2, 2.4, -2.1, -2)
    .quadraticCurveTo(1.15, -.75, -.7, 1.65)
    .bezierCurveTo(-9, 3.5, -12.6, 4.25, -21, 3.04).closePath();
  b.add(new THREE.ExtrudeGeometry(river, { depth: .72, bevelEnabled: false, curveSegments: 14 }),
    "water", [0, -.02, 0], [-Math.PI / 2, 0, 0]);
  elbafStoneBridge(b, -9.7, -2.2, 5.85, 9.4);

  elbafTree(b, 8.1, 12, 17.6, 1, lowPower);
  elbafTree(b, 7.22, 13.9, -23.3, .65, lowPower);
  elbafCastle(b, -.1, 14.62, -24.5, lowPower);
  elbafRainbow(b, lowPower);
  elbafRopeBridge(b, -.4, -19.2, 13.3, 14.65, 12.7, lowPower);
  for (const [z, y] of [[-37.5, 20], [34.4, 19.1]]) {
    b.sphere("cloudShade", [14.6, y, z], 3.8, [1.15, .49, 1.5]);
    b.sphere("cloud", [13.8, y + 1.1, z + 1.2], 3.65, [1, .67, 1.24]);
    b.sphere("cloud", [13.5, y + .1, z - 3], 2.25, [1.04, .7, 1.2]);
  }

  const houses: [x: number, y: number, z: number, width: number, roof?: MaterialKey][] = [
    [-7.9, 7.16, -15.1, 3.3, "roof"], [-5.1, 7.12, -20, 3.75, "jadeRoof"], [-9.8, 7.16, -26.7, 2.8],
    [-11.6, 5.05, -34.5, 2.78, "roof"], [-7.9, 6.76, 9.2, 3.2, "roof"], [-9.8, 6.78, 19.4, 4.35, "roof"],
    [2.15, 12.65, 18.1, 4.25, "jadeRoof"], [-2.2, 6.75, 15.2, 2.85, "roof"], [3, 9.95, 2.75, 3.45, "roof"],
  ];
  for (const [x, y, z, width, roof] of houses) elbafLodge(b, x, y, z, width, lowPower, -1, roof);
  // Un second chalet repose sur un épaulement du tronc principal.
  elbafBeam(b, "elbafBark", [8, 16.4, 18], [4, 20.1, 24.6], 1.17, .53);
  b.box("elbafBark", [4.8, 20.1, 24.3], [3.95, .53, 4]);
  elbafLodge(b, 4.8, 20.36, 24.3, 2.8, lowPower, -1, "roof");
  for (const [x, y, z, height] of [[-5.1, 7.17, -10.3, 3.9], [-11.7, 6.74, 5.5, 3.8], [-4.9, 6.78, 24.3, 4.45],
    [-2.9, 14.69, -29.2, 3.65], [5, 10, 5.4, 4.22], [1.4, 12.67, 23.4, 3.7]]) {
    elbafPine(b, x, y, z, height);
  }
  if (!lowPower) {
    for (let i = 0; i < 7; i++) {
      const height = .31 + i * .81;
      b.box(i % 3 ? "sandLight" : "sandstone", [-7.7 + i * .87, 6.6 + height / 2, 13.8], [.9, height, 2.3]);
    }
  }
}

function eniesLobby(b: Builder, lowPower: boolean) {
  // Gouffre circulaire de la cascade : anneau de falaise et rideau d'eau tombant dans l'abîme (au-dessus du relief <= 0.29 m).
  b.cylinder("dark", [-2, 0.24, 0], 11.2, 11.2, 0.36, 20);
  const segments = lowPower ? 12 : 20;
  for (let i = 0; i < segments; i++) {
    const a = i / segments * Math.PI * 2;
    // Laisser une ouverture face au bus pour que la cascade reste lisible depuis le pont.
    if (Math.cos(a) < -0.68) continue;
    const x = -2 + Math.cos(a) * 12.6, z = Math.sin(a) * 12.6;
    b.box("rock", [x, 1.65, z], [2.4, 3.3, 3.8], [0, -a, 0]);
    b.box("water", [-2 + Math.cos(a) * 11.3, 1.6, Math.sin(a) * 11.3], [0.35, 3.0, 3.4], [0, -a, 0]);
    b.box("foam", [-2 + Math.cos(a) * 11.0, 0.72, Math.sin(a) * 11.0], [0.65, 1.0, 3.5], [0, -a, 0]);
  }
  b.ring("foam", [-2, 0.50, 0], 10.3, 0.35);

  // Esplanade et pont d'accès côté bus menant à la Tour de la Justice.
  b.box("castle", [-11.5, 2.0, 0], [10.5, 1.1, 5.2]);
  for (const px of [-15, -11.5, -8]) {
    for (const pz of [-2.1, 2.1]) b.cylinder("rockLight", [px, 1.0, pz], 0.45, 0.55, 2.0, 8);
  }

  // Tour de la Justice ancrée sur son socle, colonnade dégagée du portail et tours latérales.
  b.box("rockLight", [-4.5, 1.0, 0], [8.4, 2.0, 14.2]);
  b.box("castle", [-4.5, 7.0, 0], [7.8, 10.4, 13.6]);
  b.box("cream", [-4.5, 12.4, 0], [8.4, 0.6, 14.2]);
  b.roof("dark", [-4.5, 12.7, 0], 8.8, 14.4, 2.4);
  for (const z of [-6.0, -4.1, -2.2, 2.2, 4.1, 6.0]) {
    b.cylinder("cream", [-8.55, 7.05, z], 0.38, 0.45, 10.1, 10);
  }
  arch(b, -8.45, 2.5, 0, 2.6, 5.4, "castle");
  b.box("dark", [-8.48, 10.6, 0], [0.2, 1.5, 3.4]);
  b.box("gold", [-8.58, 10.6, 0], [0.1, 0.16, 1.9]);
  b.box("gold", [-8.58, 10.6, 0], [0.1, 1.05, 0.16]);
  for (const side of [-1, 1]) {
    b.box("castle", [-3.8, 9.05, side * 8.4], [4.4, 18.1, 4.4]);
    b.roof("dark", [-3.8, 18.1, side * 8.4], 5.2, 5.2, 2.6);
    arch(b, -6.05, 13.8, side * 8.4, 1.2, 2.6, "castle");
  }
  if (!lowPower) {
    // Emblème des 5 points du Gouvernement Mondial et bannières sur le pont.
    for (const [dy, dz] of [[0, 0], [0.52, 0], [-0.52, 0], [0, 0.92], [0, -0.92]]) {
      b.sphere("gold", [-8.62, 10.6 + dy, dz], 0.16);
    }
    for (const px of [-15.2, -12.0]) {
      for (const side of [-1, 1]) {
        b.cylinder("metal", [px, 3.6, side * 2.4], 0.06, 0.08, 2.2, 6);
        b.box("blueHouse", [px, 3.9, side * 2.4], [0.08, 1.2, 0.55]);
        b.sphere("lamp", [px, 4.85, side * 2.4], 0.22);
      }
    }
    for (const side of [-1, 1]) b.sphere("lamp", [-3.8, 20.9, side * 8.4], 0.45);
  }

  // La monumentale Porte de la Justice en arrière-plan, entrouverte vers la mer.
  for (const side of [-1, 1]) {
    const gz = side * 6.8;
    const tilt = side * -0.14;
    b.box("castle", [9.2, 16.5, gz], [2.4, 33, 10.5], [0, tilt, 0]);
    b.box("metal", [9.2, 33.2, gz], [2.8, 1.1, 11.2], [0, tilt, 0]);
    b.box("dark", [8.0, 16.5, gz], [0.3, 30, 0.9], [0, tilt, 0]);
    for (const h of [6, 13, 20, 27]) {
      b.box("metal", [9.2, h, gz], [2.65, 0.65, 10.7], [0, tilt, 0]);
    }
    b.cylinder("gold", [9.2, 35.0, gz], 0, 0.75, 2.8, 6);
    if (!lowPower) {
      b.box("gold", [7.70, 23.5, gz], [0.18, 2.6, 0.35], [0, tilt, 0]);
      b.box("gold", [7.70, 23.5, gz], [0.18, 0.35, 2.6], [0, tilt, 0]);
      for (const [dy, dz] of [[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]]) {
        b.sphere("gold", [7.66 + dz * Math.sin(tilt), 23.5 + dy, gz + dz * Math.cos(tilt)], 0.34);
      }
    }
  }
  b.box("dark", [10.8, 16.5, 0], [0.8, 32, 3.2]);
}

const BUILDERS = [alabasta, waterSeven, skypiea, wano, drum, egghead, elbaf, eniesLobby];
export const SET_PIECE_OFFSET_X = 33;

/** Geometry is local to an island; every authored vertex stays clear of the road. */
export function createOnePieceScenery(zone: number, lowPower = false): SceneryBatch[] {
  const builder = new Builder();
  BUILDERS[Math.max(0, Math.min(BUILDERS.length - 1, zone))](builder, lowPower);
  return builder.finish();
}

function dune(b: Builder, x: number, z: number, scale: Point, light = false) {
  b.sphere(light ? "sandLight" : "sandstone", [x, 0.15, z], 1, scale);
  b.curve("sandLight", [[x - scale[0] * 0.65, 0.3, z + scale[2] * 0.3], [x, scale[1] * 0.95, z], [x + scale[0] * 0.8, 0.25, z - scale[2] * 0.2]], 0.12, 10);
}

/** Low, authored terrain details retain the route's open sightlines. */
export function createOnePieceForeground(zone: number, side: number, lowPower = false): SceneryBatch[] {
  const b = new Builder(true);
  if (zone === 0) {
    for (let i = 0; i < (lowPower ? 3 : 6); i++) {
      if (side < 0 && i === 1) continue;
      dune(b, side * (27 + (i % 2) * 9), -55 + i * 22, [8 + i % 3, 1.0 + i % 2 * 0.65, 5.5], i % 2 === 0);
    }
    if (side < 0) {
      // Oasis creusée avec bassin d'eau visible et margelle ancrée au sol.
      b.add(new THREE.CylinderGeometry(5.2, 5.4, 0.24, 24), "turquoise", [-28, 0.14, -32], [0, 0, 0], [1.18, 1, 0.95]);
      b.add(new THREE.TorusGeometry(5.25, 0.38, 6, 24), "sandLight", [-28, 0.24, -32], [Math.PI / 2, 0, 0], [1.18, 0.95, 0.72]);
      for (let i = 0; i < 4; i++) {
        b.cylinder("sandstone", [-32 + i * 2.6, 1.9 + i % 2, 35], 0.45, 0.6, 3.8 + i % 2 * 2, 7);
        b.box("sandLight", [-32 + i * 2.6, 3.9 + i % 2 * 2, 35], [1.4, 0.4, 1.2]);
      }
      b.box("sandstone", [-29, 5.9, 35], [6, 0.55, 1.1], [0, 0, 0.04]);
      if (!lowPower) {
        // Palmiers de l'oasis, tente nomade au sol et Ponéglyphe dégagé devant les ruines.
        for (const [px, pz] of [[-22.5, -28], [-33.5, -36]]) {
          b.cylinder("wood", [px, 2.05, pz], 0.16, 0.24, 4.1, 7);
          b.sphere("leaf", [px, 4.15, pz], 1.4, [1.2, 0.45, 1.2]);
        }
        const tentY = sceneryTerrainHeight(0, -23, -21) - 0.02;
        b.box("sandLight", [-23, tentY + 0.22, -21], [3.4, 0.44, 2.8]);
        b.box("dark", [-24.68, tentY + 0.44, -21], [0.1, 0.88, 1.0]);
        b.roof("coral", [-23, tentY + 0.40, -21], 3.9, 3.3, 1.65);
        b.box("dark", [-28.1, 1.0, 32.8], [1.4, 2.0, 1.4]);
        b.box("gold", [-27.38, 1.1, 32.8], [0.06, 1.3, 0.9]);
      }
    }
  }
  if (zone === 1) {
    const x = side * 22;
    b.box("water", [x, 0.13, 0], [3.5, 0.12, 144]);
    for (const offset of [-2.1, 2.1]) b.box("cream", [x + offset, 0.2, 0], [0.45, 0.3, 144]);
    for (const z of [-44, 37]) {
      // Small arched bridges cross the canal, perpendicular to the route.
      for (let i = 0; i < 9; i++) {
        const bx = x - 3.6 + i * 0.9;
        const y = 0.8 + Math.sin(i / 8 * Math.PI) * 1.25;
        b.box("cream", [bx, y, z], [0.95, 0.3, 2.8]);
        for (const edge of [-1, 1]) b.box("cream", [bx, y + 0.65, z + edge * 1.35], [0.96, 0.18, 0.16]);
      }
    }
    if (!lowPower) {
      for (const gz of [-18, 14]) {
        b.sphere("dark", [x, 0.28, gz], 0.8, [0.65, 0.3, 2.1]);
        b.sphere("turquoise", [x, 0.48, gz - 1.4], 0.38, [0.7, 0.7, 0.9]);
      }
    }
    if (side < 0) {
      const colors: MaterialKey[] = ["coral", "peach", "blueHouse"];
      for (let i = 0; i < (lowPower ? 2 : 4); i++) {
        venetianHouse(b, -34 - (i % 2) * 2, 0, -43 + i * 29, 4.5, 5.5 + i % 2 * 2.4, colors[i % 3], lowPower);
      }
      // Sea-train railway hugs the far bank on timber piles, rails posés sans vide sur les traverses.
      for (const rx of [-43, -41.2]) b.box("dark", [rx, 1.2, 1], [0.14, 0.16, 116]);
      for (let i = 0; i < (lowPower ? 8 : 15); i++) {
        const z = -54 + i * (lowPower ? 15 : 8);
        b.box("wood", [-42.1, 1.02, z], [3.4, 0.2, 0.6]);
        if (i % 2 === 0) b.cylinder("wood", [-42.1, 0.24, z], 0.3, 0.4, 1.72, 6);
      }
      if (!lowPower) {
        // Locomotive du Puffing Tom et wagon posés sur les rails avec attelage.
        b.box("dark", [-42.1, 2.02, -12], [2.1, 1.5, 5.4]);
        b.cylinder("metal", [-42.1, 2.35, -14.8], 0.75, 0.75, 2.4, 10, [Math.PI / 2, 0, 0]);
        b.cylinder("vermilion", [-42.1, 3.35, -15.3], 0.3, 0.24, 1.1, 8);
        b.sphere("cloud", [-42.1, 4.4, -14.8], 0.8, [1, 0.7, 1.2]);
        b.sphere("lamp", [-42.1, 2.2, -16.1], 0.32);
        b.box("metal", [-42.1, 1.6, -8.5], [0.5, 0.25, 1.8]);
        b.box("blueHouse", [-42.1, 2.02, -5.2], [2.0, 1.45, 5.0]);
      }
    }
  }
  if (zone === 2) {
    for (let i = 0; i < (lowPower ? 3 : 6); i++) {
      const x = side * (24 + i % 3 * 7), z = -54 + i * 21;
      b.sphere(i % 3 ? "cloud" : "cloudShade", [x, 0.3, z], 1, [7.5, 1.2 + i % 2 * 0.8, 5]);
      b.sphere("cloud", [x + side * 3.1, 1.0, z + 1.4], 2.6, [1.3, 0.65, 1]);
    }
    if (side < 0) {
      // White Sea's stepped cloud road curls between the cloud banks.
      b.curve("cloudShade", [[-29, 0.9, -54], [-35, 1.1, -28], [-26, 0.8, 5], [-35, 1.1, 44]], 1.8, 26);
      b.curve("cloud", [[-29, 1.3, -54], [-35, 1.5, -28], [-26, 1.2, 5], [-35, 1.5, 44]], 1.4, 26);
      if (!lowPower) {
        for (const z of [-21, 26]) {
          for (const x of [-40, -32]) b.cylinder("cream", [x, 3.25, z], 0.4, 0.6, 6.5, 8);
          b.box("cream", [-36, 6.5, z], [9.5, 0.6, 1.3]);
          b.roof("gold", [-36, 6.8, z], 10, 2.4, 1.2);
          b.sphere("lamp", [-36, 5.8, z], 0.38);
        }
        // Arbres-nuages célestes et petit Waver posé sur la route blanche.
        for (const [cx, cz] of [[-24, -40], [-25, 14]]) {
          b.cylinder("cream", [cx, 1.6, cz], 0.2, 0.3, 3.4, 7);
          b.sphere("cloud", [cx, 3.7, cz], 1.5, [1.2, 0.6, 1.1]);
        }
        b.sphere("cream", [-26.5, 2.85, -4], 0.7, [0.7, 0.35, 1.8]);
        b.box("turquoise", [-26.5, 4.05, -4], [0.1, 1.7, 1.4]);
      }
    }
  }
  if (zone === 3) {
    // Rizières en terrasses calées sur la hauteur locale du relief.
    for (let i = 0; i < (lowPower ? 3 : 5); i++) {
      if (side < 0 && i === 2) continue;
      const z = -52 + i * 25;
      const paddyY = sampleMaxTerrainHeight(3, side * 32 - 9.5, side * 32 + 9.5, z - 7.5, z + 7.5) + 0.08;
      b.box("sandstone", [side * 32, paddyY / 2, z], [18.4, paddyY, 14.4]);
      b.box("leafLight", [side * 32, paddyY + 0.04, z], [17, 0.12, 13]);
      for (const offset of [-7, 7]) b.box("sandLight", [side * 32, paddyY + 0.14, z + offset], [18, 0.28, 0.65]);
      for (const offset of [-9, 9]) b.box("sandLight", [side * 32 + offset, paddyY + 0.14, z], [0.65, 0.28, 14]);
      if (!lowPower) {
        for (let row = 0; row < 5; row++) b.box("leaf", [side * 32 - 6 + row * 3, paddyY + 0.18, z], [0.22, 0.3, 11]);
        if (i % 2 === 0) {
          b.cylinder("wood", [side * 30, paddyY + 0.85, z], 0.08, 0.1, 1.8, 6);
          b.cylinder("sandLight", [side * 30, paddyY + 1.8, z], 0.1, 0.75, 0.45, 8);
        }
      }
    }
    if (side < 0) {
      const cherryAY = sceneryTerrainHeight(3, -28, -14.5) - 0.05;
      const cherryBY = sceneryTerrainHeight(3, -34, 33) - 0.05;
      cherryTree(b, -28, cherryAY, -14.5, 4.8, lowPower);
      cherryTree(b, -34, cherryBY, 33, 5.3, lowPower);
      const houseY = sceneryTerrainHeight(3, -29, 4) - 0.03;
      b.box("wood", [-29, houseY + 2.1, 4], [6.7, 4.2, 5]);
      b.roof("jadeRoof", [-29, houseY + 4.2, 4], 8.1, 6.4, 1.8);
      for (const z of [2.4, 4, 5.6]) b.box("lamp", [-32.4, houseY + 2.3, z], [0.09, 1.5, 0.6]);
      if (!lowPower) {
        for (const [px, py, pz] of [[-28, cherryAY, -14.5], [-34, cherryBY, 33]] as const) {
          b.sphere("blossomLight", [px, py + 0.08, pz], 3.1, [1.2, 0.06, 1.1]);
        }
        const lanternY = sceneryTerrainHeight(3, -24, 4) - 0.03;
        b.cylinder("rock", [-24, lanternY + 0.8, 4], 0.22, 0.3, 1.6, 6);
        b.box("lamp", [-24, lanternY + 1.85, 4], [0.5, 0.55, 0.5]);
        b.box("rock", [-24, lanternY + 2.25, 4], [0.76, 0.24, 0.76]);
      }
    }
  }
  if (zone === 4) {
    for (let i = 0; i < (lowPower ? 3 : 5); i++) {
      const x = side * (27 + i % 3 * 7), z = -50 + i * 24;
      b.sphere("snow", [x, 0.2, z], 1, [7, 1.1 + (i % 2) * 0.7, 5.5]);
    }
    if (side < 0) {
      // A sparse blue-green forest, with heavy, layered snow caps.
      for (let i = 0; i < (lowPower ? 4 : 8); i++) {
        const x = -27 - (i % 3) * 6, z = -55 + i * 15;
        const size = 0.8 + (i % 3) * 0.2;
        b.cylinder("wood", [x, size, z], 0.18, 0.3, size * 2, 6);
        for (let tier = 0; tier < 3; tier++) {
          b.cylinder("pine", [x, size * (2.1 + tier * 1.5), z], 0, size * (2.4 - tier * 0.5), size * 3, 8);
          b.cylinder("snow", [x, size * (2.75 + tier * 1.5), z], 0, size * (1.8 - tier * 0.42), size * 1.8, 8);
        }
      }
      if (!lowPower) {
        // Lanternes enneigées et clôtures en bois bordant la piste de Drum.
        for (const z of [-42, -14, 14, 42]) {
          b.cylinder("wood", [-22.5, 1.2, z], 0.1, 0.14, 2.4, 6);
          b.sphere("lamp", [-22.5, 2.5, z], 0.32);
          b.box("snow", [-22.5, 2.86, z], [0.65, 0.18, 0.65]);
        }
      }
    }
  }
  if (zone === 5) {
    const sidewalk = side * 13.2;
    for (let i = 0; i < 22; i++) {
      const z = -63 + i * 6;
      const h = sampleMaxTerrainHeight(5, sidewalk - 1.9, sidewalk + 1.9, z - 3, z + 3) + 0.12;
      b.box("snow", [sidewalk, h / 2, z], [3.7, h, 6.04]);
      b.box("eggMint", [sidewalk - side * 1.73, h + 0.04, z], [0.18, 0.12, 6.04]);
    }
    for (const z of [-49, -26, -5, 18, 38, 55]) {
      const h = sampleMaxTerrainHeight(5, side * 17.4 - 1.9, side * 17.4 + 1.9, z - 1.9, z + 1.9) + 0.34;
      b.cylinder("snow", [side * 17.4, h / 2, z], 1.73, 1.85, h, 12);
      b.cylinder("leafLight", [side * 17.4, h + 0.04, z], 1.57, 1.69, 0.12, 12);
      eggheadPalm(b, side * 17.4, z, z === -26 || z === 18 ? 4.8 : 3.4, lowPower, h + 0.04);
    }
    if (side > 0) {
      eggheadTower(b, 19.7, 8.2, 2.37, 5.2, "snow", "eggOrange", lowPower);
      eggheadTower(b, 23, -38, 2.46, 5.6, "eggRed", "eggOrange", lowPower);
    } else {
      eggheadTower(b, -26, -23, 3.45, 8.95, "eggAqua", "eggCobalt", lowPower, 1);
      eggheadTower(b, -28, 12, 3.1, 7.2, "eggRed", "eggOrange", lowPower, 1);
      eggheadTower(b, -33, 30, 3.45, 10.8, "eggCobalt", "eggIndigo", lowPower, 1);
      eggheadTube(b, [[-26, 7.3, -23], [-21.5, 8.1, -14], [-21, 8.25, -1], [-25.5, 6.5, 11]], .59, lowPower);
    }
  }
  if (zone === 6) {
    // Chemin et clairières calés sur le relief réel, au pied des terrasses.
    const pathX = side * 20;
    for (let i = 0; i < 24; i++) {
      const z = -56.5 + i * 4.92;
      const h = sampleMaxTerrainHeight(6, pathX - 1.5, pathX + 1.5, z - 2.6, z + 2.6) + 0.08;
      b.box("sandLight", [pathX, h / 2, z], [2.9, h, 5.0]);
    }
    for (const [z, height] of [[-53, 4.1], [-38, 5.6], [-13, 4.85], [11, 5.0], [29, 4.4], [50, 5.9]]) {
      elbafPine(b, side * 23.6, sceneryTerrainHeight(6, side * 23.6, z) - 0.04, z, height);
    }
    if (side < 0) {
      elbafTerrace(b, -33.4, -22, -.17, 3.1, 6.2, 8.2, lowPower);
      elbafTerrace(b, -34.9, 15, -.17, 4.1, 6.3, 8.8, lowPower);
      elbafLodge(b, -33.9, 3.27, -23, 3.25, lowPower, 1, "jadeRoof");
      elbafLodge(b, -35.1, 4.28, 16, 3.9, lowPower, 1);
      elbafLodge(b, -27.1, sceneryTerrainHeight(6, -27.1, 25.7) - 0.04, 25.7, 3.1, lowPower, 1);
      elbafPine(b, -34.9, 4.19, 20.7, 4.85);
      elbafPine(b, -32.2, 3.25, -27.6, 3.9);
      elbafRopeBridge(b, -33.9, -14.2, 6.6, 3.2, 4.26, lowPower);
      if (!lowPower) {
        // Drakkar sur la grève.
        const drakkarY = sceneryTerrainHeight(6, -41.4, 34);
        b.sphere("wood", [-41.4, drakkarY + 0.45, 34], 1.32, [1.1, .55, 3.05]);
        b.cylinder("elbafBark", [-41.4, drakkarY + 2.6, 34], .12, .16, 4.2, 8);
        b.box("vermilion", [-41.4, drakkarY + 3.35, 34.25], [1.5, 1.75, .12]);
        b.cylinder("oldGold", [-41.4, drakkarY + 1.3, 30.5], .1, .33, 1.25, 6, [.45, 0, 0]);
      }
    } else {
      elbafLodge(b, 17.2, sceneryTerrainHeight(6, 17.2, -43.3) - 0.04, -43.3, 2.65, lowPower);
      elbafLodge(b, 17.7, sceneryTerrainHeight(6, 17.7, 32.9) - 0.04, 32.9, 2.92, lowPower, -1, "jadeRoof");
    }
  }
  if (zone === 7) {
    // Enies Lobby : colonnades judiciaires et bordure de cascade écumante.
    const x = side * 22;
    b.box("castle", [x, 0.22, 0], [2.4, 0.34, 130]);
    for (let i = 0; i < (lowPower ? 5 : 9); i++) {
      const z = -56 + i * (lowPower ? 28 : 14);
      b.cylinder("cream", [x, 2.3, z], 0.35, 0.42, 4.2, 8);
      b.box("castle", [x, 4.5, z], [1.2, 0.35, 1.2]);
      if (!lowPower && i % 2 === 0) b.sphere("lamp", [x, 4.92, z], 0.28);
    }
    if (side < 0) {
      for (const z of [-35, 25]) {
        b.box("castle", [-34, 2.8, z], [7.5, 5.6, 11]);
        b.roof("dark", [-34, 5.6, z], 8.4, 11.8, 2.0);
        for (const cz of [-3, 0, 3]) b.cylinder("cream", [-30.1, 2.8, z + cz], 0.34, 0.38, 5.2, 8);
      }
      // Ligne du Sea Train sur pilotis arrivant vers l'île judiciaire.
      for (const rx of [-43, -41.2]) b.box("metal", [rx, 1.15, 0], [0.14, 0.16, 120]);
      for (let i = 0; i < (lowPower ? 8 : 15); i++) {
        const z = -54 + i * (lowPower ? 15 : 8);
        b.box("wood", [-42.1, 0.92, z], [3.2, 0.2, 0.55]);
        if (i % 2 === 0) b.cylinder("rock", [-42.1, 0.42, z], 0.28, 0.38, 0.85, 6);
      }
      if (!lowPower) {
        b.box("vermilion", [-42.1, 1.98, -5], [2.0, 1.5, 5.2]);
        b.sphere("lamp", [-42.1, 2.05, -7.8], 0.3);
      }
    }
  }
  return b.finish();
}
