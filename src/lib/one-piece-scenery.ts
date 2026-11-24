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
  abyss: new THREE.MeshStandardMaterial({ color: "#050914", roughness: 1 }),
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

function oasisPalm(b: Builder, x: number, y: number, z: number, height: number, lowPower: boolean) {
  b.cylinder("wood", [x, y + height / 2, z], 0.14, 0.24, height, 7, [0.06, 0, 0.08]);
  const topX = x + height * 0.04;
  const topY = y + height;
  const fronds = lowPower ? 5 : 7;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2;
    b.box(
      i % 2 ? "leaf" : "leafLight",
      [topX + Math.cos(a) * 0.95, topY + 0.15, z + Math.sin(a) * 0.95],
      [1.75, 0.12, 0.42],
      [0, -a, -0.32],
    );
  }
}

function alabasta(b: Builder, lowPower: boolean) {
  // ALABASTA — Plateau d'Alubarna, Palais Royal des Nefertari, Tour de l'Horloge et grand escalier cérémoniel.
  // 1. Plateau rocheux en grès chaud avec contreforts sculptés.
  b.cylinder("sandstone", [0, 4.2, 0], 15.4, 17.6, 8.4, 16);
  b.cylinder("sandLight", [0, 8.45, 0], 15.9, 15.6, 0.65, 16);
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const x = Math.cos(angle) * 15.4, z = Math.sin(angle) * 15.4;
    b.cylinder(i % 3 ? "sandstone" : "sandLight", [x, 3.85, z], 0.65, 1.35, 7.7 + Math.sin(i * 3) * 0.65, 6);
  }

  // 2. Palais Royal d'Alubarna (marbre crème, coupoles turquoise royales, incrustations géométriques et or).
  b.cylinder("cream", [0, 9.2, 0], 12.8, 13.7, 1.0, 16);
  b.box("sandLight", [0, 12.9, 0], [11.6, 6.8, 12.2]);
  b.box("cream", [-0.1, 16.35, 0], [12.5, 0.65, 13.0]);
  b.box("turquoise", [-0.1, 16.8, 0], [12.1, 0.25, 12.6]);
  // Pavillon supérieur et grande coupole turquoise royale avec flèche dorée.
  b.box("cream", [-1.2, 18.0, 0], [7.2, 3.0, 8.2]);
  b.dome("turquoise", [-1.2, 19.55, 0], 4.35, [1, 1.28, 1]);
  b.ring("gold", [-1.2, 19.65, 0], 4.3, 0.14);
  b.cylinder("gold", [-1.2, 25.4, 0], 0, 0.24, 1.8, 8);
  b.sphere("gold", [-1.2, 26.35, 0], 0.36);

  // 4 minarets à coupoles turquoise + ailes latérales du palais.
  for (const side of [-1, 1]) {
    palaceTower(b, -2.5, 9.6, side * 8.2, 7.9, 1.55);
    palaceTower(b, 6.4, 9.6, side * 6.6, 10.4, 1.38);
    b.box("cream", [-1.2, 11.3, side * 10.9], [9.2, 3.2, 3.3]);
    b.dome("turquoise", [-2.0, 12.95, side * 10.9], 1.7, [1.2, 0.88, 1]);
    b.cylinder("gold", [-2.0, 14.6, side * 10.9], 0, 0.1, 0.65, 6);
  }
  // Arches de façade (une seule fois, dégagées du portail central z = 0 pour éviter tout z-fighting).
  for (const z of [-4.2, -2.2, 2.2, 4.2]) {
    arch(b, -5.88, 10.0, z, 0.85, 2.6);
    if (!lowPower) b.box("lamp", [-5.94, 10.95, z], [0.05, 1.25, 0.48]);
  }
  // Incrustations géométriques turquoise et or caractéristiques d'Alubarna.
  for (const z of [-4.8, -3.2, 3.2, 4.8]) {
    b.box("turquoise", [-5.84, 14.15, z], [0.14, 3.9, 0.46]);
    b.box("gold", [-5.94, 15.75, z], [0.16, 0.45, 0.72], [0, 0, 0.1]);
  }
  // Grand portail royal central + tapis turquoise.
  arch(b, -5.92, 10.0, 0, 2.2, 4.8);
  b.box("turquoise", [-6.2, 9.85, 0], [3.5, 0.18, 3.6]);

  // 3. Grand escalier cérémoniel plein (rampe en pierre ancrée sans vide sous les marches).
  for (let i = 0; i < 16; i++) {
    const x = -7.6 - i * 0.62;
    const topY = 9.4 - i * 0.56;
    const stepH = Math.max(0.45, topY);
    b.box(i % 3 ? "sandLight" : "cream", [x, stepH / 2, 0], [0.7, stepH, 4.2]);
    for (const side of [-1, 1]) {
      b.box("sandstone", [x, topY + 0.42, side * 2.35], [0.72, 0.85, 0.48]);
    }
  }

  if (!lowPower) {
    // Quartier d'Alubarna ceinturant le plateau : maisons blanches/ocre à dômes et auvents de souk.
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.42 + i * Math.PI * 0.14;
      const hx = Math.cos(a) * 12.2 + 0.4, hz = Math.sin(a) * 12.2;
      const hh = 2.0 + (i % 3) * 0.6;
      b.box(i % 2 ? "cream" : "peach", [hx, 8.75 + hh / 2, hz], [2.7, hh, 2.5]);
      b.box("sandLight", [hx, 8.75 + hh + 0.1, hz], [3.0, 0.22, 2.8]);
      if (i % 2 === 0) b.dome("cream", [hx, 8.75 + hh + 0.2, hz], 0.95, [1, 0.75, 1]);
      b.box(i % 2 ? "turquoise" : "coral", [hx - 1.4, 9.6, hz], [0.95, 0.14, 2.2], [0, 0, 0.28]);
    }
    // Rempart crénelé blanc tout autour du plateau d'Alubarna.
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      b.box("cream", [Math.cos(a) * 13.6, 9.15, Math.sin(a) * 13.6], [0.72, 0.9, 0.72]);
    }
    // Obélisques ancrés au pied (y = 0) et sur le plateau (y = 8.75, sans flottement !) + braseros royaux.
    for (const side of [-1, 1]) {
      b.cylinder("sandstone", [-18.2, 2.2, side * 3.8], 0.35, 0.6, 4.4, 4);
      b.cylinder("gold", [-18.2, 4.75, side * 3.8], 0, 0.35, 0.72, 4);
      b.cylinder("sandstone", [-9.6, 10.65, side * 3.5], 0.28, 0.45, 3.8, 4);
      b.cylinder("gold", [-9.6, 12.85, side * 3.5], 0, 0.28, 0.62, 4);
      b.cylinder("sandstone", [-8.0, 9.65, side * 2.5], 0.44, 0.54, 1.1, 8);
      b.sphere("lamp", [-8.0, 10.45, side * 2.5], 0.42);
    }
    // 4. La célèbre Tour de l'Horloge d'Alubarna (h = 17.5 m), bien visible sur la place ouest !
    const cx = -16.8, cz = -10.4;
    b.box("sandstone", [cx, 0.9, cz], [3.8, 1.8, 3.8]);
    b.box("cream", [cx, 7.6, cz], [3.0, 11.8, 3.0]);
    b.box("turquoise", [cx, 13.5, cz], [3.2, 0.4, 3.2]);
    b.box("sandLight", [cx, 13.9, cz], [3.4, 0.38, 3.4]);
    b.dome("turquoise", [cx, 14.15, cz], 1.72, [1, 1.22, 1]);
    b.cylinder("gold", [cx, 16.9, cz], 0, 0.16, 1.5, 8);
    // Cadran doré de l'horloge + aiguilles orientés vers le bus (-X).
    b.cylinder("cream", [cx - 1.55, 11.2, cz], 0.95, 0.95, 0.14, 16, [0, 0, Math.PI / 2]);
    b.ring("gold", [cx - 1.62, 11.2, cz], 0.95, 0.08, [0, Math.PI / 2, 0]);
    b.box("dark", [cx - 1.65, 11.42, cz], [0.08, 0.56, 0.08]);
    b.box("dark", [cx - 1.66, 11.2, cz + 0.26], [0.08, 0.08, 0.5]);
    arch(b, cx - 1.52, 2.0, cz, 1.1, 2.5, "cream");
    b.box("lamp", [cx - 1.56, 7.2, cz], [0.06, 1.4, 0.72]);
  }
}

function venetianHouse(
  b: Builder,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  color: MaterialKey,
  lowPower: boolean,
  domed = false,
) {
  const depth = width * 0.84;
  // Socle en pierre ancré dans le sol/la terrasse pour éviter tout flottement.
  b.box("cream", [x, y + 0.22, z], [width + 0.24, 0.56, depth + 0.24]);
  b.box(color, [x, y + height / 2, z], [width, height, depth]);
  // Corniche supérieure en pierre claire.
  b.box("cream", [x, y + height - 0.14, z], [width + 0.36, 0.32, depth + 0.36]);
  if (domed) {
    b.cylinder("cream", [x, y + height + 0.45, z], width * 0.36, width * 0.4, 0.9, 12);
    b.dome("turquoise", [x, y + height + 0.85, z], width * 0.38, [1, 1.15, 1]);
    b.cylinder("gold", [x, y + height + 0.85 + width * 0.44 + 0.35, z], 0, 0.08, 0.75, 6);
  } else {
    b.roof("roof", [x, y + height, z], width + 0.75, depth + 0.65, 1.15);
    b.box("cream", [x + width * 0.24, y + height + 1.05, z + depth * 0.18], [0.34, 0.95, 0.38]);
    b.box("roof", [x + width * 0.24, y + height + 1.56, z + depth * 0.18], [0.46, 0.12, 0.5]);
  }
  const floors = lowPower ? 2 : Math.max(2, Math.min(4, Math.floor(height / 2.2)));
  for (let floor = 0; floor < floors; floor++) {
    const wy = y + 0.9 + floor * (height - 1.9) / Math.max(1, floors - 1);
    for (const side of [-1, 1]) {
      // Façades est/ouest (tournées vers le bus) avec fenêtres vénitiennes et lueurs chaudes.
      const lit = (floor + (side > 0 ? 1 : 0)) % 2 === 0;
      arch(b, x - width / 2 - 0.05, wy, z + side * width * 0.23, 0.52, 1.05);
      if (lit && !lowPower) {
        b.box("lamp", [x - width / 2 - 0.09, wy + 0.38, z + side * width * 0.23], [0.04, 0.62, 0.36]);
      }
      // Façades nord/sud.
      b.box(lit ? "lamp" : "dark", [x + side * width * 0.23, wy + 0.38, z - depth / 2 - 0.04], [0.5, 0.92, 0.07]);
      if (!lowPower) {
        b.box(lit ? "dark" : "lamp", [x + side * width * 0.23, wy + 0.38, z + depth / 2 + 0.04], [0.5, 0.92, 0.07]);
      }
    }
    if (!lowPower && floor === 1) {
      b.box("cream", [x - width / 2 - 0.32, wy - 0.08, z], [0.68, 0.14, depth * 0.72]);
      b.box("cream", [x - width / 2 - 0.62, wy + 0.18, z], [0.09, 0.38, depth * 0.72]);
      b.box("turquoise", [x - width / 2 - 0.32, wy + 1.05, z], [0.52, 0.08, depth * 0.68], [0, 0, -0.25]);
    }
  }
}

function yagaraGondola(
  b: Builder,
  x: number,
  y: number,
  z: number,
  dir: 1 | -1,
  canopy: MaterialKey,
  lowPower: boolean,
) {
  // Coque de gondole vénitienne effilée.
  b.sphere("dark", [x, y + 0.14, z], 1, [0.76, 0.26, 2.35]);
  b.sphere("wood", [x, y + 0.26, z], 1, [0.58, 0.12, 1.95]);
  // Proue et poupe relevées typiques de Water 7.
  b.box("gold", [x, y + 0.42, z + dir * 2.15], [0.16, 0.42, 0.24], [dir * 0.35, 0, 0]);
  // Yagara Bull devant la gondole (corps turquoise, cou élancé, tête et crête).
  const yz = z - dir * 2.55;
  b.sphere("turquoise", [x, y + 0.24, yz], 0.56, [0.82, 0.62, 1.25]);
  b.cylinder("turquoise", [x, y + 0.62, yz - dir * 0.48], 0.24, 0.32, 0.76, 8, [-dir * 0.28, 0, 0]);
  b.sphere("turquoise", [x, y + 0.96, yz - dir * 0.66], 0.32, [0.88, 0.82, 1.15]);
  b.box("foam", [x, y + 1.14, yz - dir * 0.46], [0.1, 0.26, 0.34], [dir * 0.3, 0, 0]);
  if (!lowPower) {
    // Harnais doré et dais coloré au-dessus des passagers.
    b.box("gold", [x, y + 0.48, z - dir * 1.4], [0.62, 0.07, 1.35]);
    b.box(canopy, [x, y + 1.12, z + dir * 0.15], [1.08, 0.14, 1.95]);
    b.box("cream", [x, y + 1.03, z + dir * 0.15], [1.12, 0.06, 2.0]);
    for (const sx of [-0.46, 0.46]) {
      for (const sz of [-0.68, 0.98]) {
        b.cylinder("wood", [x + sx, y + 0.68, z + dir * sz], 0.045, 0.05, 0.84, 6);
      }
    }
    b.sphere("lamp", [x, y + 0.72, z + dir * 1.9], 0.14);
  }
}

function venetianBridge(b: Builder, centerX: number, z: number, lowPower: boolean) {
  const steps = lowPower ? 9 : 13;
  const span = 8.4;
  // Culées massives en pierre ancrées sur chaque berge du canal.
  for (const edge of [-1, 1]) {
    b.box("cream", [centerX + edge * (span / 2 + 0.25), 0.38, z], [1.2, 0.96, 3.2]);
    b.box("sandLight", [centerX + edge * (span / 2 + 0.25), 0.9, z], [1.3, 0.14, 3.32]);
  }
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bx = centerX - span / 2 + t * span;
    const archH = Math.sin(t * Math.PI);
    const y = 0.58 + archH * 1.55;
    b.box("cream", [bx, y, z], [span / steps + 0.12, 0.34, 2.9]);
    // Garde-corps vénitiens avec colonnettes.
    for (const side of [-1, 1]) {
      b.box("cream", [bx, y + 0.68, z + side * 1.38], [span / steps + 0.14, 0.16, 0.22]);
      if (i % 2 === 0) {
        b.box("sandLight", [bx, y + 0.38, z + side * 1.38], [0.18, 0.58, 0.18]);
      }
    }
  }
  if (!lowPower) {
    // 4 lanternes vénitiennes aux entrées du pont.
    for (const edge of [-1, 1]) {
      for (const side of [-1, 1]) {
        const lx = centerX + edge * (span / 2 + 0.15);
        const lz = z + side * 1.45;
        b.cylinder("dark", [lx, 1.75, lz], 0.06, 0.09, 1.8, 6);
        b.sphere("lamp", [lx, 2.75, lz], 0.24);
      }
    }
  }
}

function waterSeven(b: Builder, lowPower: boolean) {
  // La cité-fontaine monumentale de Water 7, centrée sur wx ≈ 35.6 (x_local = 2.6),
  // dégagée du canal est (x_local = -11, wx = 22) et dans la berge est (wx <= 48).
  const cx = 2.6;

  // 1. Socle portuaire en pierre claire + 4 terrasses circulaires en gradins avec canaux annulaires.
  const tiers = [
    { r: 11.4, bottom: 0.0, h: 3.4 },
    { r: 9.1, bottom: 3.4, h: 3.7 },
    { r: 6.9, bottom: 7.1, h: 3.9 },
    { r: 4.8, bottom: 11.0, h: 3.9 },
  ];

  // Bassin-lagon turquoise au pied de l'île-fontaine.
  b.cylinder("water", [cx, 0.18, 0], 12.2, 12.4, 0.32, 28);
  b.ring("foam", [cx, 0.38, 0], 11.8, 0.22);

  for (let ti = 0; ti < tiers.length; ti++) {
    const { r, bottom, h } = tiers[ti];
    // Mur de soutènement en pierre calcaire + corniche supérieure + parapet.
    b.cylinder("cream", [cx, bottom + h / 2, 0], r, r + 0.55, h, 28);
    b.cylinder("sandLight", [cx, bottom + h - 0.18, 0], r + 0.24, r + 0.24, 0.34, 28);
    // Canal annulaire bleu turquoise + écume sur chaque terrasse.
    b.cylinder("water", [cx, bottom + h + 0.06, 0], r - 0.08, r - 0.08, 0.16, 28);
    b.ring("foam", [cx, bottom + h + 0.18, 0], r - 0.26, 0.13);
    // Frise turquoise architecturale à la base de chaque niveau.
    b.cylinder("turquoise", [cx, bottom + 0.32, 0], r + 0.48, r + 0.54, 0.44, 28);

    // Arches d'aqueduc et cascades d'eau plongeant d'un étage à l'autre.
    const flowCount = lowPower ? 6 : 10;
    for (let flow = 0; flow < flowCount; flow++) {
      const angle = (flow / flowCount) * Math.PI * 2 + ti * 0.22;
      const ca = Math.cos(angle), sa = Math.sin(angle);
      const rEdge = r + 0.22;
      // Bec d'aqueduc en pierre au sommet de chaque chute.
      b.box("sandLight", [cx + ca * (r + 0.08), bottom + h - 0.12, sa * (r + 0.08)], [0.55, 0.38, 1.35], [0, -angle, 0]);
      // Rideau d'eau légèrement incliné vers l'extérieur + filet d'écume.
      b.box("water", [cx + ca * (rEdge + 0.18), bottom + h / 2, sa * (rEdge + 0.18)], [0.22, h + 0.12, 1.05], [0, -angle, 0.06]);
      if (!lowPower) {
        b.box("foam", [cx + ca * (rEdge + 0.28), bottom + h * 0.48, sa * (rEdge + 0.28)], [0.08, h * 0.82, 0.22], [0, -angle, 0.06]);
        b.sphere("foam", [cx + ca * (rEdge + 0.34), bottom + 0.28, sa * (rEdge + 0.34)], 0.42, [0.9, 0.42, 1.25]);
      }
      // Arches sombres sculptées dans la muraille entre les chutes.
      if (!lowPower && ti < 3) {
        const midA = angle + Math.PI / flowCount;
        const rWall = r + 0.24;
        b.box("dark", [cx + Math.cos(midA) * rWall, bottom + h * 0.46, Math.sin(midA) * rWall], [0.16, h * 0.52, 1.05], [0, -midA, 0]);
      }
    }
  }

  // 2. Grande Fontaine Sommitale emblématique de Water 7 (y = 14.9 → 26.8).
  b.cylinder("cream", [cx, 16.7, 0], 2.9, 3.8, 3.6, 20);
  b.cylinder("sandLight", [cx, 18.6, 0], 3.55, 3.1, 0.55, 20);
  // Vasque supérieure débordante.
  b.cylinder("water", [cx, 18.95, 0], 3.3, 3.3, 0.22, 20);
  b.ring("foam", [cx, 19.1, 0], 3.1, 0.16);
  // Flèche centrale sculptée de la fontaine.
  b.cylinder("cream", [cx, 20.8, 0], 1.15, 2.0, 3.5, 16);
  b.cylinder("turquoise", [cx, 22.65, 0], 1.55, 1.25, 0.48, 16);
  b.cylinder("cream", [cx, 23.6, 0], 0.65, 1.05, 1.6, 12);
  b.cylinder("gold", [cx, 24.55, 0], 0.18, 0.42, 0.45, 10);
  // Panache d'eau jaillissant du sommet + 6 arcs d'eau retombant dans la vasque.
  b.sphere("water", [cx, 25.4, 0], 1.15, [0.75, 1.45, 0.75]);
  b.sphere("foam", [cx, 26.25, 0], 0.72, [1.1, 0.65, 1.1]);
  const jetCount = lowPower ? 4 : 8;
  for (let j = 0; j < jetCount; j++) {
    const a = (j / jetCount) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    b.curve(
      "water",
      [
        [cx + ca * 0.45, 25.0, sa * 0.45],
        [cx + ca * 1.75, 24.1, sa * 1.75],
        [cx + ca * 2.65, 21.8, sa * 2.65],
        [cx + ca * 2.95, 19.05, sa * 2.95],
      ],
      0.24,
      10,
    );
    if (!lowPower) {
      b.curve(
        "foam",
        [
          [cx + ca * 0.55, 25.25, sa * 0.55],
          [cx + ca * 1.85, 24.3, sa * 1.85],
          [cx + ca * 2.75, 22.0, sa * 2.75],
        ],
        0.1,
        8,
      );
    }
  }

  // 3. Maisons vénitiennes et palais densément étagés sur CHAQUE terrasse (posés proprement sur les rebords sans clipping).
  const terraceRing = (
    count: number,
    ringRadius: number,
    baseY: number,
    minW: number,
    minH: number,
    angleOffset: number,
    skipAngle?: number,
  ) => {
    const palette: MaterialKey[] = ["coral", "peach", "cream", "blueHouse", "sandLight"];
    for (let i = 0; i < count; i++) {
      if (lowPower && i % 2 === 1) continue;
      const a = angleOffset + (i / count) * Math.PI * 2;
      if (skipAngle !== undefined && Math.abs(Math.atan2(Math.sin(a - skipAngle), Math.cos(a - skipAngle))) < 0.42) continue;
      const hx = cx + Math.cos(a) * ringRadius;
      const hz = Math.sin(a) * ringRadius;
      const w = minW + (i % 3) * 0.28;
      const h = minH + ((i * 7) % 4) * 0.65;
      const domed = !lowPower && i % 4 === 1;
      venetianHouse(b, hx, baseY, hz, w, h, palette[(i + Math.round(baseY)) % palette.length], lowPower, domed);
    }
  };
  // Terrasse 0 (y = 3.4, rebord entre r = 9.1 et 11.4 → r = 10.25)
  terraceRing(12, 10.25, 3.4, 2.15, 3.6, 0.15);
  // Terrasse 1 (y = 7.1, rebord entre r = 6.9 et 9.1 → r = 8.0)
  terraceRing(9, 8.0, 7.1, 1.95, 3.5, 0.45, -0.32);
  // Terrasse 2 (y = 11.0, rebord entre r = 4.8 et 6.9 → r = 5.85)
  terraceRing(6, 5.85, 11.0, 1.75, 3.2, 0.85, -0.32);

  // 4. Siège de la Galley-La (Manoir d'Iceburg) + Tour de l'Horloge sur les hauteurs face au bus.
  // Manoir d'Iceburg sur la terrasse supérieure nord-ouest (bien visible depuis la route).
  const mx = cx - 4.9, mz = -3.1, my = 11.0;
  b.box("cream", [mx, my + 2.1, mz], [2.9, 4.2, 3.2]);
  b.box("sandLight", [mx, my + 4.3, mz], [3.2, 0.34, 3.5]);
  b.cylinder("cream", [mx, my + 5.05, mz], 1.15, 1.3, 1.2, 12);
  b.dome("turquoise", [mx, my + 5.65, mz], 1.32, [1, 1.25, 1]);
  b.cylinder("gold", [mx, my + 7.45, mz], 0, 0.12, 1.0, 6);
  if (!lowPower) {
    // Colonnade & fenêtre lumineuse du manoir tournées vers le bus (-X).
    for (const cz of [-1.1, -0.35, 0.35, 1.1]) {
      b.cylinder("cream", [mx - 1.62, my + 1.4, mz + cz], 0.11, 0.13, 2.8, 6);
    }
    b.box("sandLight", [mx - 1.62, my + 2.9, mz], [0.42, 0.24, 2.7]);
    b.box("lamp", [mx - 1.48, my + 3.55, mz], [0.06, 0.75, 1.35]);
  }

  // Tour de l'Horloge Galley-La dominant la cité-fontaine.
  const tx = cx + 5.1, tz = -1.7;
  b.cylinder("coral", [tx, 12.6, tz], 1.32, 1.68, 12.2, 8);
  b.cylinder("cream", [tx, 18.85, tz], 1.82, 1.82, 0.48, 8);
  b.dome("turquoise", [tx, 19.1, tz], 1.85, [1, 1.15, 1]);
  b.cylinder("gold", [tx, 21.85, tz], 0, 0.14, 1.4, 6);
  // Cadran d'horloge orienté vers le bus (-X) avec aiguilles.
  b.cylinder("cream", [tx - 1.38, 17.2, tz], 0.82, 0.82, 0.14, 16, [0, 0, Math.PI / 2]);
  b.ring("gold", [tx - 1.45, 17.2, tz], 0.82, 0.07, [0, Math.PI / 2, 0]);
  b.box("dark", [tx - 1.48, 17.38, tz], [0.08, 0.5, 0.08]);
  b.box("dark", [tx - 1.49, 17.2, tz + 0.22], [0.08, 0.08, 0.44]);

  // 5. Passerelle piétonne vénitienne enjambant le canal est (x_local = -11, wx = 22).
  venetianBridge(b, -11.0, -9.0, lowPower);

  // 6. Dock 1 de la Galley-La : quai en bois, cale sèche avec coque en chantier, grue navale et Yagara Bull.
  b.box("wood", [-13.3, 0.66, 9.5], [2.8, 0.24, 10.6]);
  for (const px of [-14.4, -12.2]) {
    for (const pz of [4.8, 8.0, 11.2, 14.4]) {
      b.cylinder("wood", [px, 0.25, pz], 0.12, 0.14, 0.88, 6);
    }
  }
  // Yagara Bull + gondole amarrée le long du quai dans le canal (x_local = -10.7, wx = 22.3).
  yagaraGondola(b, -10.7, 0.12, 11.8, 1, "coral", lowPower);

  if (!lowPower) {
    // Cale de chantier naval avec coque de navire en bois en construction sur tréteaux.
    b.box("wood", [-13.6, 1.1, 11.4], [1.4, 0.55, 3.6]);
    b.sphere("wood", [-13.6, 1.45, 11.4], 1, [0.95, 0.48, 2.2]);
    b.box("cream", [-13.6, 1.92, 11.4], [1.45, 0.14, 3.2]);
    b.cylinder("wood", [-13.6, 3.1, 11.4], 0.1, 0.14, 2.4, 6);
    // Grue navale de la Galley-La posée sur le quai, flèche treillis orientée vers le canal.
    b.cylinder("metal", [-13.6, 3.4, 6.2], 0.24, 0.36, 6.6, 8);
    b.box("metal", [-11.8, 6.45, 6.2], [4.4, 0.3, 0.34], [0, 0, 0.16]);
    b.box("metal", [-12.6, 5.4, 6.2], [2.4, 0.16, 0.18], [0, 0, 0.62]);
    b.cylinder("gold", [-9.9, 5.25, 6.2], 0.05, 0.05, 2.6, 6);
    b.box("wood", [-9.9, 3.75, 6.2], [1.4, 0.48, 0.95]);
    // Arche d'entrée bleue "Dock 1" et lanternes de port sur le quai.
    for (const pz of [4.8, 14.4]) {
      b.cylinder("dark", [-14.4, 1.85, pz], 0.07, 0.1, 2.2, 6);
      b.sphere("lamp", [-14.4, 3.05, pz], 0.26);
    }
  }
}

function skypiea(b: Builder, lowPower: boolean) {
  // 1. Mer Blanche-Blanche : socle de nuages épais et vaporeux soutenant Upper Yard.
  const cloudCount = lowPower ? 8 : 14;
  for (let i = 0; i < cloudCount; i++) {
    const a = (i / cloudCount) * Math.PI * 2;
    b.sphere(i % 3 ? "cloud" : "cloudShade", [Math.cos(a) * 10.2, 3.6 + Math.sin(i * 1.3) * 0.55, Math.sin(a) * 9.2], 5.4, [1.08, 0.54, 0.94]);
  }
  b.sphere("cloud", [0, 4.1, 0], 11.2, [1.22, 0.44, 1.05]);

  // 2. Upper Yard (le Vearth, fragment de Jaya projeté dans le ciel) : terre réelle + jungle tropicale dense.
  b.cylinder("elbafCliff", [0.4, 6.2, 0.4], 9.2, 10.6, 2.2, 12);
  b.cylinder("foliageDeep", [0.4, 7.45, 0.4], 9.4, 9.5, 0.55, 12);
  const jungleMounds: Array<[number, number, number, number, MaterialKey]> = [
    [-6.2, 8.2, -4.6, 3.2, "foliageDeep"],
    [-7.6, 8.0, 2.8, 2.9, "leaf"],
    [-3.2, 8.3, 6.4, 3.0, "foliageDeep"],
    [7.2, 8.1, -5.8, 2.8, "leaf"],
    [6.8, 8.0, 5.6, 2.9, "foliageDeep"],
    [-1.2, 8.2, -6.5, 2.7, "leafLight"],
  ];
  for (const [jx, jy, jz, jr, mat] of jungleMounds) {
    b.sphere(mat, [jx, jy, jz], jr, [1.2, 0.62, 1.1]);
  }
  if (!lowPower) {
    // Arbres géants de la jungle d'Upper Yard autour des ruines.
    for (const [tx, tz, th] of [[-7.4, -3.5, 5.4], [-6.8, 5.2, 4.8], [8.2, -4.2, 4.6], [7.8, 4.8, 5.0]]) {
      b.cylinder("elbafBark", [tx, 7.6 + th * 0.45, tz], 0.35, 0.62, th, 7);
      b.sphere("foliageDeep", [tx, 7.8 + th, tz], 2.25, [1.28, 0.62, 1.18]);
      b.sphere("leafLight", [tx + 0.7, 8.4 + th, tz - 0.5], 1.45, [1.1, 0.55, 1.05]);
    }
  }

  // 3. Cité antique de Shandora : pyramide mésoaméricaine à degrés en pierre et or + escalier central + Ponéglyphe.
  for (let i = 0; i < 4; i++) {
    const w = 10.6 - i * 1.75;
    const d = 10.2 - i * 1.65;
    const y = 8.15 + i * 1.05;
    b.box(i % 2 === 0 ? "rock" : "oldGold", [3.6, y, 0], [w, 1.0, d]);
    b.box("gold", [3.6, y + 0.52, 0], [w + 0.14, 0.14, d + 0.14]);
  }
  // Escalier monumental orienté vers la route (-x) pour grimper la pyramide.
  for (let s = 0; s < 6; s++) {
    b.box(s % 2 === 0 ? "rockLight" : "oldGold", [-1.6 + s * 0.48, 8.0 + s * 0.68, 0], [1.15, 0.68, 2.7]);
  }
  // Colonnes dorées sculptées et vestiges de Shandora.
  if (!lowPower) {
    for (const z of [-6.4, 6.4]) {
      for (let i = 0; i < 3; i++) {
        const x = 0.2 + i * 3.1;
        const h = 3.2 + (i % 2) * 1.3;
        b.cylinder("rock", [x, 7.7 + h * 0.5, z], 0.42, 0.62, h, 8);
        b.box("gold", [x, 7.8 + h, z], [1.3, 0.34, 1.3]);
      }
      b.box("oldGold", [3.3, 11.4, z], [7.6, 0.5, 1.05]);
    }
    // Ponéglyphe de Shandora (monolithe sombre gravé d'or) et braseros sacrés au pied de l'escalier.
    b.box("dark", [-3.2, 8.85, 0], [1.65, 2.3, 1.65]);
    b.box("gold", [-4.05, 8.85, 0], [0.08, 1.55, 1.05]);
    for (const side of [-1, 1]) {
      b.cylinder("oldGold", [-2.7, 8.35, side * 3.4], 0.48, 0.34, 1.35, 8);
      b.sphere("lamp", [-2.7, 9.25, side * 3.4], 0.44);
    }
  }

  // 4. Giant Jack : haricot géant colossal jaillissant du cœur d'Upper Yard jusque très haut dans les nuages.
  for (let strand = 0; strand < 3; strand++) {
    const points: Point[] = [];
    for (let i = 0; i <= 18; i++) {
      const a = i * 0.46 + (strand * Math.PI * 2) / 3;
      const swayX = Math.sin(i * 0.22) * 1.35;
      const swayZ = Math.cos(i * 0.18) * 0.9;
      points.push([-3.4 + swayX + Math.cos(a) * 1.25, 5.2 + i * 1.85, 1.6 + swayZ + Math.sin(a) * 1.25]);
    }
    const mat: MaterialKey = strand === 0 ? "foliageDeep" : strand === 1 ? "leafLight" : "leaf";
    b.curve(mat, points, strand === 1 ? 0.78 : 1.08, 42);
  }
  for (let i = 0; i < (lowPower ? 6 : 9); i++) {
    const a = i * 1.72;
    const y = 10.5 + i * 2.95;
    const x = -3.4 + Math.cos(a) * 4.4;
    const z = 1.6 + Math.sin(a) * 4.4;
    b.sphere(i % 2 ? "leaf" : "leafLight", [x, y, z], 2.35, [1.75, 0.18, 0.78]);
    b.curve("foliageDeep", [[-3.4, y - 1.1, 1.6], [x * 0.55 - 1.5, y - 0.35, z * 0.55 + 0.7], [x, y, z]], 0.24, 7);
  }

  // 5. Beffroi d'Or et Cloche d'Or de Shandora : hissés tout en haut dans une couronne de nuages au sommet du Giant Jack.
  const bx = 2.4;
  const by = 22.4;
  const bz = 0.6;
  b.sphere("cloud", [bx, by - 0.9, bz], 6.4, [1.18, 0.42, 1.05]);
  b.sphere("cloudShade", [bx - 3.6, by - 1.4, bz + 2.2], 3.5, [1.1, 0.48, 0.95]);
  b.sphere("cloud", [bx + 3.8, by - 1.2, bz - 1.8], 3.6, [1.1, 0.48, 0.95]);
  // Socle doré à degrés du beffroi céleste.
  for (let i = 0; i < 3; i++) {
    b.box(i % 2 ? "gold" : "oldGold", [bx, by + i * 0.48, bz], [7.8 - i * 1.1, 0.48, 6.8 - i * 1.0]);
  }
  for (const side of [-1, 1]) {
    b.cylinder("oldGold", [bx + side * 2.9, by + 5.6, bz], 0.46, 0.64, 8.6, 8);
    b.box("gold", [bx + side * 2.9, by + 2.8, bz], [1.4, 0.48, 1.4]);
    b.box("gold", [bx + side * 2.9, by + 9.6, bz], [1.6, 0.46, 1.6]);
    b.curve("gold", [[bx + side * 3.8, by + 10.3, bz], [bx + side * 2.5, by + 11.2, bz], [bx + side * 1.6, by + 10.6, bz]], 0.22, 10);
  }
  b.box("oldGold", [bx, by + 10.0, bz], [8.2, 0.6, 1.15]);
  b.box("gold", [bx, by + 10.5, bz], [7.2, 0.28, 1.4]);
  b.cylinder("oldGold", [bx, by + 8.5, bz], 0.13, 0.13, 2.5, 8);
  const bellProfile = [[0.0, 0], [2.45, 0], [2.5, 0.22], [2.05, 0.55], [1.55, 1.35], [1.4, 3.15], [1.05, 3.6], [0.45, 3.8], [0, 3.8]];
  b.add(new THREE.LatheGeometry(bellProfile.map(([r, y]) => new THREE.Vector2(r, y)), 20), "gold", [bx, by + 2.5, bz]);
  b.ring("oldGold", [bx, by + 2.8, bz], 2.38, 0.14);
  b.ring("oldGold", [bx, by + 4.95, bz], 1.48, 0.12);
  b.sphere("oldGold", [bx, by + 2.2, bz], 0.4);

  // 6. Rubans de nuages blancs s'enroulant autour du Giant Jack.
  b.curve("cloud", [[-10.5, 6.2, -4.5], [-12.2, 11.5, -6.5], [-8.8, 17.2, -7.2], [-3.2, 22.0, -5.8], [2.5, 24.8, -4.2]], 0.75, 24);
  if (!lowPower) {
    b.curve("cloudShade", [[-9.5, 13.5, 5.5], [-5.2, 18.0, 7.6], [1.2, 21.8, 6.2], [6.8, 25.4, 2.4]], 0.58, 18);
  }
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

function machiyaHouse(
  b: Builder,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  facingX: 1 | -1,
  lowPower: boolean,
) {
  // Maison traditionnelle de la Capitale des Fleurs (bois sombre, enduit crème, toit jade, shoji lumineux face au bus).
  b.box("rockLight", [x, y + 0.25, z], [w + 0.3, 0.5, d + 0.3]);
  b.box("wood", [x, y + h * 0.32, z], [w, h * 0.58, d]);
  b.box("cream", [x, y + h * 0.78, z], [w * 0.96, h * 0.42, d * 0.96]);
  b.roof("jadeRoof", [x, y + h, z], w + 1.2, d + 1.2, 1.35);
  b.box("gold", [x, y + h + 1.36, z], [0.14, 0.14, d * 0.52]);
  const fx = x + facingX * (w / 2 + 0.05);
  // Fenêtres shoji chaudes + auvent vermillon orientés vers le bus.
  b.box("lamp", [fx, y + h * 0.42, z], [0.08, h * 0.38, d * 0.58]);
  b.box("vermilion", [fx + facingX * 0.22, y + h * 0.66, z], [0.55, 0.12, d * 0.78], [0, 0, facingX * -0.22]);
  if (!lowPower) {
    b.box("lamp", [fx, y + h * 0.82, z], [0.08, h * 0.22, d * 0.42]);
    // Petites lanternes rouges chochin suspendues sous l'auvent.
    for (const lz of [-d * 0.32, d * 0.32]) {
      b.sphere("vermilion", [fx + facingX * 0.32, y + h * 0.52, z + lz], 0.22, [0.85, 1.15, 0.85]);
    }
  }
}

function wano(b: Builder, lowPower: boolean) {
  // WANO KUNI — La Capitale des Fleurs (Hana no Miyako), le Château du Shogun sur son cerisier-rocher géant,
  // et le majestueux Mont Fuji enneigé en arrière-plan (palette ukiyo-e : vermillon, jade, crème, or et sakura rose).

  // 1. Le Mont Fuji de Wano (Fuji-yama) en arrière-plan nord-est, couronné de neige et entouré de nuages ukiyo-e.
  const fx = 6.8, fz = -10.5;
  b.cylinder("dark", [fx, 9.5, fz], 3.4, 12.2, 19.0, 16);
  b.cylinder("rock", [fx, 22.8, fz], 1.5, 4.1, 8.2, 16);
  b.cylinder("snow", [fx, 28.4, fz], 1.15, 2.55, 4.2, 16);
  b.dome("snow", [fx, 30.45, fz], 1.18, [1, 0.35, 1]);
  // Nuages blancs stylisés ukiyo-e flottant à mi-pente du Mont Fuji.
  if (!lowPower) {
    for (const [cx, cy, cz, sx, sz] of [
      [fx - 6.8, 17.5, fz + 3.2, 3.8, 1.9],
      [fx + 4.8, 19.2, fz + 4.0, 3.2, 1.8],
      [fx - 2.5, 22.8, fz + 3.8, 2.8, 1.5],
    ]) {
      b.sphere("cloud", [cx, cy, cz], 1.0, [sx, 0.72, sz]);
    }
  }

  // 2. Douves turquoise et colline-forteresse ishigaki au pied du Château du Shogun.
  const cx = -1.6;
  b.cylinder("water", [cx, 0.16, 1.0], 12.4, 12.6, 0.28, 20);
  b.ring("foam", [cx, 0.34, 1.0], 11.8, 0.2);
  // Remparts en pierre en pente (ishigaki) + pelouse verte.
  b.cylinder("rock", [cx, 1.9, 1.0], 9.4, 11.4, 3.8, 12);
  b.cylinder("rockLight", [cx, 3.9, 1.0], 9.7, 9.5, 0.35, 12);
  b.cylinder("elbafGrass", [cx, 4.2, 1.0], 9.3, 9.5, 0.38, 12);

  // 3. Arbre-rocher Sakura géant portant le Château du Shogun + 4 grandes branches fleuries.
  b.curve("wood", [[cx, 3.2, 1.0], [cx + 1.2, 8.0, 1.8], [cx - 0.8, 13.5, 0.6], [cx, 17.8, 1.0]], 4.0, 18);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.curve(
      "wood",
      [
        [cx + Math.cos(a) * 8.6, 3.8, 1.0 + Math.sin(a) * 7.8],
        [cx + Math.cos(a) * 5.2, 5.2, 1.0 + Math.sin(a) * 4.8],
        [cx, 9.5, 1.0],
      ],
      0.78,
      10,
    );
  }
  const branchSpecs: Array<[number, number, number, number]> = [
    [-8.2, 13.8, -2.5, 4.8],
    [8.0, 14.2, 3.8, 4.6],
    [-6.2, 15.2, 6.2, 4.2],
    [5.8, 13.2, -5.8, 4.0],
  ];
  for (const [bx, by, bz, size] of branchSpecs.filter((_, i) => !lowPower || i < 2)) {
    b.curve("wood", [[cx, 10.5, 1.0], [cx + bx * 0.55, by - 0.8, 1.0 + bz * 0.55], [cx + bx, by, 1.0 + bz]], 1.05, 10);
    cherryTree(b, cx + bx, by - 1.1, 1.0 + bz, size, lowPower);
  }

  // 4. Château du Shogun (4 étages féodaux : rempart ishigaki, murs crème, piliers vermillon, toits jade et Shachihoko d'or).
  b.box("rock", [cx, 17.5, 1.0], [9.8, 2.2, 9.0]);
  b.box("cream", [cx, 18.7, 1.0], [10.2, 0.45, 9.4]);
  for (let tier = 0; tier < 4; tier++) {
    const y = 18.9 + tier * 2.85;
    const width = 9.0 - tier * 1.55;
    const depth = 8.0 - tier * 1.25;
    b.box("cream", [cx, y + 1.15, 1.0], [width, 2.35, depth]);
    // Balcon vermillon ceinturant chaque étage.
    b.box("vermilion", [cx, y + 0.28, 1.0], [width + 0.35, 0.24, depth + 0.35]);
    for (const side of [-1, 1]) {
      // Piliers vermillon et fenêtres shoji lumineuses face au bus (-X).
      b.box("vermilion", [cx - width / 2 - 0.08, y + 1.18, 1.0 + side * depth * 0.38], [0.22, 2.4, 0.22]);
      b.box("lamp", [cx - width / 2 - 0.04, y + 1.28, 1.0 + side * depth * 0.17], [0.12, 1.1, 0.72]);
      b.box("gold", [cx - width / 2 - 0.12, y + 1.28, 1.0 + side * depth * 0.17], [0.14, 0.08, 0.82]);
      // Fenêtres lumineuses aussi sur les côtés nord/sud.
      if (!lowPower) {
        b.box("lamp", [cx, y + 1.28, 1.0 + side * (depth / 2 + 0.04)], [width * 0.36, 1.0, 0.1]);
      }
    }
    b.roof("jadeRoof", [cx, y + 2.35, 1.0], width + 4.0, depth + 3.5, 1.7);
    b.box("gold", [cx, y + 4.1, 1.0], [0.18, 0.18, depth * 0.58]);
  }
  // Shachihoko dorés emblématiques au sommet du donjon.
  for (const side of [-1, 1]) {
    b.curve("gold", [[cx, 31.3, 1.0 + side * 1.4], [cx, 32.5, 1.0 + side * 2.1], [cx, 33.1, 1.0 + side * 1.3]], 0.22, 10);
  }

  // 5. Pont arqué vermillon (Taiko-bashi) au-dessus d'un ruisseau fleuri + Grand Torii vermillon.
  b.box("water", [-12.5, 0.14, -9.5], [4.2, 0.14, 14.0]);
  for (let i = 0; i < 11; i++) {
    const x = -16.2 + i * 0.72, y = 0.78 + Math.sin((i / 10) * Math.PI) * 1.35;
    b.box("wood", [x, y, -9.5], [0.78, 0.22, 3.2]);
    for (const side of [-1, 1]) {
      b.box("vermilion", [x, y + 1.08, -9.5 + side * 1.56], [0.76, 0.16, 0.18]);
      if (i % 2 === 0) {
        b.box("vermilion", [x, y + 0.58, -9.5 + side * 1.56], [0.16, 1.28, 0.16]);
        if (!lowPower && (i === 0 || i === 10)) b.sphere("gold", [x, y + 1.26, -9.5 + side * 1.56], 0.15);
      }
    }
  }
  for (const ax of [-16.2, -9.0]) {
    b.box("rockLight", [ax, 0.4, -9.5], [0.95, 0.85, 3.3]);
  }
  // Grand Torii vermillon à l'entrée du pont.
  for (const z of [-11.8, -7.2]) {
    b.cylinder("rock", [-16.0, 0.4, z], 0.42, 0.5, 0.8, 8);
    b.cylinder("vermilion", [-16.0, 3.4, z], 0.28, 0.38, 6.4, 10);
  }
  b.box("vermilion", [-16.0, 5.8, -9.5], [0.52, 0.36, 5.8]);
  b.box("gold", [-16.12, 6.25, -9.5], [0.22, 0.85, 0.65]);
  b.curve("jadeRoof", [[-16.0, 6.75, -13.2], [-16.0, 6.3, -9.5], [-16.0, 6.75, -5.8]], 0.3, 12);

  // 6. Quartier animé de la Capitale des Fleurs (maisons machiya, lanternes de festival et cerisiers en fleurs).
  if (!lowPower) {
    cherryTree(b, -10.5, sceneryTerrainHeight(3, SET_PIECE_OFFSET_X - 10.5, 13.5) - 0.06, 13.5, 4.8, false);
    cherryTree(b, -9.5, sceneryTerrainHeight(3, SET_PIECE_OFFSET_X - 9.5, -16.5) - 0.06, -16.5, 4.4, false);
    // Allée de lanternes chaudes du Festival du Feu.
    for (let i = 0; i < 6; i++) {
      const z = -6.0 + i * 3.4;
      b.cylinder("wood", [-13.2, 1.85, z], 0.09, 0.13, 3.7, 6);
      b.sphere("lamp", [-13.2, 3.65, z], 0.42, [0.85, 1.15, 0.85]);
      b.cylinder("vermilion", [-13.2, 4.1, z], 0.24, 0.24, 0.12, 8);
    }
    // 5 maisons traditionnelles machiya de la Capitale des Fleurs.
    const town: Array<[number, number, number, number, number]> = [
      [-14.6, 2.2, 3.8, 3.4, 3.6],
      [-14.4, 8.2, 3.6, 4.2, 3.8],
      [-7.2, -16.8, 4.2, 3.6, 3.8],
      [-5.2, 16.0, 4.4, 3.8, 4.0],
      [2.8, 16.5, 4.0, 3.4, 3.6],
    ];
    for (const [hx, hz, hw, hh, hd] of town) {
      const hy = sceneryTerrainHeight(3, SET_PIECE_OFFSET_X + hx, hz) - 0.06;
      machiyaHouse(b, hx, hy, hz, hw, hh, hd, -1, false);
    }
    // Étendards dorés sur la terrasse du château.
    for (const side of [-1, 1]) {
      b.cylinder("vermilion", [cx - 4.7, 20.4, 1.0 + side * 4.2], 0.07, 0.09, 3.2, 6);
      b.box("gold", [cx - 4.7, 21.3, 1.0 + side * 4.6], [0.1, 1.35, 0.78]);
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
  if (!lowPower) {
    // Fenêtres lumineuses et boucliers nordiques dorés sur la façade d'Aurust Castle.
    for (const fz of [-2.4, 2.4]) {
      b.box("lamp", [x - 2.86, y + 2.35, z + fz], [.08, 1.15, .62]);
      b.cylinder("gold", [x - 2.9, y + 4.15, z + fz], .42, .42, .12, 10, [0, 0, Math.PI / 2]);
    }
  }
  for (const [dx, dz, h, radius] of [[-.6, -2.88, 9.8, 1.51], [-.3, 2.6, 7.3, 1.19], [2.05, .25, 12.55, 1.13]]) {
    const tx = x + dx, tz = z + dz;
    b.cylinder("castle", [tx, y + h / 2, tz], radius * .92, radius, h, 12);
    b.cylinder("cream", [tx, y + h, tz], radius * 1.13, radius, .45, 12);
    b.cylinder("roof", [tx, y + h + 1.57, tz], 0, radius * 1.17, 3.25, 12);
    b.sphere("gold", [tx, y + h + 3.25, tz], .2);
    arch(b, tx - radius * .98, y + h * .61, tz, .36, .93, "castle");
    if (!lowPower) {
      b.box("lamp", [tx - radius * 1.0, y + h * .64, tz], [.06, .72, .3]);
      b.cylinder("gold", [tx, y + h + 3.9, tz], .04, .05, 1.4, 6);
      b.box("vermilion", [tx, y + h + 4.25, tz - .55], [.08, .55, 1.1]);
    }
  }
  const blocks = lowPower ? 5 : 8;
  for (let i = 0; i < blocks; i++) {
    b.box("castle", [x - 2.72, y + 4.54, z - 3.62 + i * 7.24 / (blocks - 1)], [.36, .55, .46]);
  }
}

function elbafColossalSword(b: Builder, x: number, y: number, z: number, lowPower: boolean) {
  // La gigantesque épée mythique plantée en biais dans les falaises d'Elbaf (visible dès l'approche).
  const tiltZ = 0.16;
  const tiltX = -0.08;
  // Lame monumentale en acier sombre + nervure centrale dorée/métallique.
  b.box("metal", [x, y + 7.2, z], [1.95, 15.2, .42], [tiltX, .15, tiltZ]);
  b.box("castle", [x - .22, y + 7.3, z], [1.1, 14.4, .5], [tiltX, .15, tiltZ]);
  if (!lowPower) {
    // Rune lumineuse cyan gravée le long de la lame géante.
    b.box("neonCyan", [x - .36, y + 8.6, z + .24], [.22, 5.2, .12], [tiltX, .15, tiltZ]);
  }
  // Garde nordique massive en or vieilli.
  const gx = x - Math.sin(tiltZ) * 14.8;
  const gy = y + Math.cos(tiltZ) * 14.8;
  const gz = z - Math.sin(tiltX) * 14.8;
  b.box("oldGold", [gx, gy, gz], [6.4, 1.05, 1.15], [tiltX, .15, tiltZ]);
  b.box("gold", [gx, gy, gz], [6.8, .38, 1.28], [tiltX, .15, tiltZ]);
  // Poignée en bois sombre + pommeau sphérique doré au sommet.
  const hx = x - Math.sin(tiltZ) * 17.8;
  const hy = y + Math.cos(tiltZ) * 17.8;
  const hz = z - Math.sin(tiltX) * 17.8;
  b.cylinder("wood", [hx, hy, hz], .42, .48, 5.2, 10, [tiltX, .15, tiltZ]);
  const px = x - Math.sin(tiltZ) * 20.6;
  const py = y + Math.cos(tiltZ) * 20.6;
  const pz = z - Math.sin(tiltX) * 20.6;
  b.sphere("gold", [px, py, pz], .95);
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
  elbafColossalSword(b, 5.4, 9.75, -1.5, lowPower);
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

function worldGovEmblem(b: Builder, x: number, y: number, z: number, scale: number, rotY = 0) {
  const s = scale;
  const sin = Math.sin(rotY), cos = Math.cos(rotY);
  b.box("gold", [x, y, z], [0.12 * s, 0.16 * s, 1.9 * s], [0, rotY, 0]);
  b.box("gold", [x, y, z], [0.12 * s, 1.35 * s, 0.16 * s], [0, rotY, 0]);
  for (const [dy, dz] of [[0, 0], [0.64 * s, 0], [-0.64 * s, 0], [0, 0.92 * s], [0, -0.92 * s]]) {
    b.sphere("gold", [x + dz * sin, y + dy, z + dz * cos], 0.19 * s);
  }
}

function eniesLobby(b: Builder, lowPower: boolean) {
  // ENIES LOBBY — L'Île Judiciaire en plein après-midi perpétuel, suspendue au-dessus d'un gouffre océanique sans fond.
  // Palette canonique One Piece :
  // - Abîme circulaire noir profond + rideau de cascades turquoise/écume à 360°
  // - Îlot rocheux en surplomb (falaise chaude + herbe verte ensoleillée)
  // - Ville basse en terre cuite / brique rouge + Palais & Tour de la Justice en marbre blanc, toits vert jade et or
  // - Pont de l'Hésitation derrière la Tour de la Justice menant aux gigantesques Portes de la Justice blanches et acier.

  const chasmX = -2.0;

  // 1. Le gouffre océanique circulaire sans fond (trou noir béant entouré d'un anneau de cascades).
  b.cylinder("abyss", [chasmX, 0.22, 0], 13.6, 13.6, 0.28, 28);
  // Anneau extérieur d'eau océanique se déversant dans le trou + rideau de chute d'eau + brume épaisse.
  b.ring("water", [chasmX, 0.56, 0], 13.7, 0.85);
  b.ring("foam", [chasmX, 0.68, 0], 13.2, 0.45);
  const cascadeCount = lowPower ? 14 : 24;
  for (let i = 0; i < cascadeCount; i++) {
    const a = (i / cascadeCount) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    // Dégager légèrement l'axe des Portes de la Justice (+X) pour montrer le courant Tarai.
    if (ca > 0.78 && Math.abs(sa) < 0.52) continue;
    const rx = chasmX + ca * 13.2, rz = sa * 13.2;
    // Lèvre d'eau qui plonge vers le trou noir central.
    b.box("water", [rx, 1.05, rz], [0.55, 1.45, 3.2], [0, -a, 0.22]);
    if (!lowPower) {
      b.box("foam", [chasmX + ca * 12.75, 0.9, sa * 12.75], [0.28, 1.25, 0.75], [0, -a, 0.22]);
      if (i % 2 === 0) {
        b.sphere("cloud", [chasmX + ca * 12.2, 0.55, sa * 12.2], 0.95, [1.1, 0.48, 1.45]);
      }
    }
  }

  // 2. L'Île suspendue en surplomb au-dessus du gouffre : pilier rocheux effilé vers le bas + plateau herbeux vert.
  // Pilier central s'enfonçant dans le vide noir (forme caractéristique en champignon/éperon rocheux).
  b.cylinder("elbafCliff", [-5.8, 1.85, 0], 6.4, 3.3, 3.5, 16);
  b.cylinder("sandstone", [-5.8, 3.55, 0], 6.8, 6.2, 0.75, 16);
  // Pelouse vert ensoleillé sur le dessus de l'îlot suspendu.
  b.cylinder("elbafGrass", [-5.8, 4.02, 0], 6.55, 6.65, 0.34, 16);
  // Second éperon rocheux plus étroit supportant la Tour de la Justice juste au bord du vide.
  b.cylinder("elbafCliff", [0.8, 1.9, 0], 3.8, 1.9, 3.6, 14);
  b.cylinder("elbafGrass", [0.8, 3.82, 0], 3.7, 3.75, 0.3, 14);

  // Passerelle d'accès reliant le bord ouest du gouffre (côté bus) à l'île suspendue.
  b.box("snow", [-13.6, 3.75, 0], [5.8, 0.55, 3.8]);
  for (const side of [-1, 1]) b.box("cream", [-13.6, 4.25, side * 1.75], [5.8, 0.48, 0.24]);
  b.cylinder("elbafCliff", [-15.8, 1.9, 0], 1.1, 1.5, 3.8, 10);

  // 3. Quartier en terre cuite / brique rouge + Porte Principale sur l'avant de l'île suspendue (x = -11 .. -8).
  const clayHouses: Array<[number, number, number, number, MaterialKey]> = [
    [-10.2, -4.4, 2.3, 2.8, "coral"],
    [-10.2, 4.4, 2.3, 2.8, "coral"],
    [-7.8, -5.2, 2.5, 3.4, "sandstone"],
    [-7.8, 5.2, 2.5, 3.4, "sandstone"],
  ];
  for (const [hx, hz, hw, hh, mat] of clayHouses) {
    b.box(mat, [hx, 4.15 + hh / 2, hz], [hw, hh, hw * 0.9]);
    b.roof("roof", [hx, 4.15 + hh, hz], hw + 0.45, hw * 0.9 + 0.45, 0.9);
    if (!lowPower) {
      b.box("lamp", [hx - hw / 2 - 0.04, 4.15 + hh * 0.55, hz], [0.06, 0.75, 0.55]);
    }
  }
  // Grande Porte d'Entrée blanche et jade devant le Tribunal.
  for (const side of [-1, 1]) {
    b.box("snow", [-11.2, 5.8, side * 1.9], [1.1, 3.4, 1.1]);
    b.roof("jadeRoof", [-11.2, 7.5, side * 1.9], 1.55, 1.55, 0.85);
  }
  b.box("snow", [-11.2, 7.1, 0], [0.95, 0.9, 3.8]);
  b.box("jadeRoof", [-11.2, 7.7, 0], [1.15, 0.36, 4.2]);

  // 4. Le Grand Tribunal (Courthouse) en marbre blanc, toit vert jade et or, sur l'île suspendue (x = -6.2).
  b.box("snow", [-6.2, 6.9, 0], [5.4, 5.5, 8.6]);
  b.box("cream", [-6.2, 9.75, 0], [5.9, 0.42, 9.1]);
  b.roof("jadeRoof", [-6.2, 9.96, 0], 6.4, 9.6, 2.2);
  // Colonnade blanche face au bus (-X) + emblème doré à 5 points.
  for (const cz of [-3.4, -1.7, 1.7, 3.4]) {
    b.cylinder("snow", [-9.05, 6.8, cz], 0.24, 0.28, 5.1, 8);
  }
  arch(b, -8.92, 4.2, 0, 1.9, 3.4, "snow");
  worldGovEmblem(b, -9.02, 8.7, 0, 0.72);
  if (!lowPower) {
    for (const fz of [-2.55, 2.55]) b.box("lamp", [-8.94, 7.1, fz], [0.06, 1.0, 0.55]);
  }

  // Pont-levis au-dessus du vide entre le Tribunal et la Tour de la Justice.
  b.box("wood", [-2.6, 4.25, 0], [2.4, 0.36, 3.2]);
  for (const side of [-1, 1]) b.box("snow", [-2.6, 4.68, side * 1.5], [2.4, 0.45, 0.18]);

  // 5. La Tour de la Justice (QG du CP9) — marbre blanc éclatant, toits vert jade, coupole et tours jumelles (x = 0.8).
  const tx = 0.8;
  b.box("snow", [tx, 9.2, 0], [5.4, 10.6, 9.8]);
  b.box("cream", [tx, 14.65, 0], [6.0, 0.55, 10.4]);
  b.roof("jadeRoof", [tx, 14.95, 0], 6.5, 10.9, 2.4);
  // Coupole blanche & jade couronnant la Tour de la Justice.
  b.cylinder("snow", [tx, 17.85, 0], 2.0, 2.25, 1.5, 14);
  b.dome("jadeRoof", [tx, 18.6, 0], 2.08, [1, 1.15, 1]);
  b.cylinder("gold", [tx, 21.65, 0], 0, 0.14, 1.4, 8);

  // Colonnade & grand fronton de la Tour de la Justice face au Tribunal (-X).
  for (const cz of [-4.2, -2.5, 2.5, 4.2]) {
    b.cylinder("snow", [tx - 2.85, 9.2, cz], 0.28, 0.34, 10.0, 8);
  }
  b.box("jadeRoof", [tx - 2.78, 12.6, 0], [0.22, 1.8, 3.8]);
  worldGovEmblem(b, tx - 2.94, 12.6, 0, 0.98);
  if (!lowPower) {
    for (const fy of [6.8, 10.2]) {
      for (const fz of [-3.3, 3.3]) b.box("lamp", [tx - 2.74, fy, fz], [0.06, 1.25, 0.65]);
    }
  }

  // Tours de garde jumelles blanches à toits vert jade + Drapeau du Gouvernement Mondial.
  for (const side of [-1, 1]) {
    const tz = side * 6.5;
    b.cylinder("elbafCliff", [tx, 1.9, tz], 2.1, 1.1, 3.6, 10);
    b.box("snow", [tx, 11.4, tz], [3.6, 15.2, 3.6]);
    b.box("cream", [tx, 19.15, tz], [4.1, 0.42, 4.1]);
    b.roof("jadeRoof", [tx, 19.36, tz], 4.5, 4.5, 2.4);
    if (!lowPower) {
      b.box("lamp", [tx - 1.84, 15.5, tz], [0.06, 1.45, 0.75]);
      b.box("lamp", [tx - 1.84, 10.8, tz], [0.06, 1.25, 0.68]);
      b.sphere("lamp", [tx, 21.95, tz], 0.38);
    }
  }
  // Mât et célèbre drapeau blanc du Gouvernement Mondial flottant sur la tour nord.
  if (!lowPower) {
    b.cylinder("gold", [tx - 1.2, 21.8, -6.5], 0.06, 0.09, 4.8, 6);
    b.box("snow", [tx - 1.2, 23.1, -8.0], [0.12, 1.85, 2.9]);
    worldGovEmblem(b, tx - 1.28, 23.1, -8.0, 0.62);
  }

  // 6. Le Pont de l'Hésitation (DERRIÈRE la Tour de la Justice, tendu au-dessus du gouffre vers les Portes de la Justice).
  b.box("snow", [6.1, 4.35, 0], [6.4, 0.65, 3.6]);
  for (const side of [-1, 1]) {
    b.box("cream", [6.1, 4.88, side * 1.68], [6.4, 0.46, 0.24]);
  }
  for (const px of [4.6, 7.6]) {
    for (const pz of [-1.45, 1.45]) b.cylinder("snow", [px, 2.2, pz], 0.34, 0.44, 4.3, 8);
  }

  // 7. Les colossales Portes de la Justice en acier blanc-argenté (h = 36 m), entrouvertes sur le courant Tarai.
  b.sphere("foam", [10.6, 0.6, 0], 2.0, [1.7, 0.38, 2.4]);
  for (const side of [-1, 1]) {
    const gz = side * 7.2;
    const tilt = side * -0.15;
    const sinT = Math.sin(tilt), cosT = Math.cos(tilt);
    // Vantail monumental blanc-argenté (couleur canonique lumineuse des Portes de la Justice).
    b.box("snow", [10.6, 18.0, gz], [2.5, 36, 10.6], [0, tilt, 0]);
    // Pilier-charnière massif sur le bord extérieur.
    b.box("castle", [10.6 - side * 5.1 * sinT, 18.0, gz + side * 5.1 * cosT], [3.3, 36.6, 2.2], [0, tilt, 0]);
    // Couronnement supérieur & flèche dorée.
    b.box("cream", [10.6, 36.3, gz], [3.1, 1.15, 11.4], [0, tilt, 0]);
    b.box("jadeRoof", [10.6, 37.1, gz], [2.8, 0.65, 10.8], [0, tilt, 0]);
    b.cylinder("gold", [10.6, 38.9, gz], 0, 0.78, 3.0, 8);
    // Nervures et traverses métalliques rivetées.
    b.box("metal", [9.3, 18.0, gz], [0.28, 33, 0.9], [0, tilt, 0]);
    for (const h of [5.5, 12.5, 19.5, 26.5, 33.0]) {
      b.box("metal", [10.6, h, gz], [2.75, 0.7, 10.8], [0, tilt, 0]);
    }
    b.box("foam", [10.2, 0.5, gz], [3.6, 0.7, 11.0], [0, tilt, 0]);
    if (!lowPower) {
      worldGovEmblem(b, 9.15, 23.6, gz, 1.85, tilt);
    }
  }
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
      // Oasis de Yuba / Nanohana : bassin turquoise, écume, vrais palmiers à palmes et tentes de bazar.
      b.add(new THREE.CylinderGeometry(5.3, 5.5, 0.24, 24), "water", [-28, 0.14, -32], [0, 0, 0], [1.2, 1, 0.96]);
      b.add(new THREE.TorusGeometry(5.35, 0.4, 6, 24), "sandLight", [-28, 0.24, -32], [Math.PI / 2, 0, 0], [1.2, 0.96, 0.72]);
      if (!lowPower) {
        b.add(new THREE.TorusGeometry(4.85, 0.12, 5, 24), "foam", [-28, 0.27, -32], [Math.PI / 2, 0, 0], [1.2, 0.96, 1]);
      }
      // Ruines antiques de Sandora : colonnade alignée portant solidement son linteau + Ponéglyphe.
      const ruinBaseY = sampleMaxTerrainHeight(0, -34, -22, 33, 37, 2) - 0.1;
      b.box("sandstone", [-28.1, ruinBaseY / 2 + 0.18, 35], [10.6, ruinBaseY + 0.36, 3.2]);
      for (let i = 0; i < 4; i++) {
        const rx = -32 + i * 2.6;
        const colH = i < 3 ? 4.8 : 2.9;
        b.cylinder("sandstone", [rx, ruinBaseY + 0.36 + colH / 2, 35], 0.42, 0.54, colH, 8);
        b.box("sandLight", [rx, ruinBaseY + 0.36 + colH + 0.18, 35], [1.3, 0.36, 1.2]);
      }
      b.box("sandstone", [-29.4, ruinBaseY + 5.75, 35], [6.6, 0.58, 1.15]);
      if (!lowPower) {
        // 5 palmiers d'oasis à vraies palmes vertes.
        for (const [px, pz, ph] of [
          [-22.2, -28.5, 4.4],
          [-23.0, -35.8, 3.8],
          [-33.8, -35.5, 4.6],
          [-34.2, -28.8, 4.0],
          [-28.5, -38.2, 4.2],
        ]) {
          oasisPalm(b, px, sceneryTerrainHeight(0, px, pz) - 0.05, pz, ph, false);
        }
        // Tentes de bazar d'Alabasta (corail & turquoise) + pavillon blanc à coupole.
        for (const [tx, tz, roofCol] of [[-23, -21, "coral"], [-31, -18, "turquoise"]] as Array<[number, number, MaterialKey]>) {
          const tentY = sceneryTerrainHeight(0, tx, tz) - 0.02;
          b.box("sandLight", [tx, tentY + 0.32, tz], [3.6, 0.64, 3.0]);
          b.box("dark", [tx + 1.82, tentY + 0.52, tz], [0.08, 0.95, 1.1]);
          b.roof(roofCol, [tx, tentY + 0.62, tz], 4.2, 3.5, 1.7);
          b.sphere("lamp", [tx + 2.0, tentY + 1.4, tz + 1.3], 0.22);
        }
        // Ponéglyphe royal d'Alabasta encadré de deux braseros devant les ruines.
        const poneY = sceneryTerrainHeight(0, -28.1, 32.2) - 0.02;
        b.box("dark", [-28.1, poneY + 1.05, 32.2], [1.5, 2.1, 1.5]);
        b.box("gold", [-27.32, poneY + 1.12, 32.2], [0.06, 1.35, 0.95]);
        for (const bz of [30.2, 34.2]) {
          b.cylinder("sandstone", [-26.2, poneY + 0.55, bz], 0.26, 0.34, 1.1, 6);
          b.sphere("lamp", [-26.2, poneY + 1.25, bz], 0.26);
        }
      }
    }
  }
  if (zone === 1) {
    const x = side * 22;
    // Canal vénitien turquoise avec berges en pierre claire, bordure d'écume et bornes d'amarrage.
    b.box("water", [x, 0.13, 0], [3.6, 0.12, 144]);
    for (const offset of [-2.1, 2.1]) {
      b.box("cream", [x + offset, 0.22, 0], [0.55, 0.34, 144]);
      b.box("sandLight", [x + offset, 0.41, 0], [0.62, 0.08, 144]);
    }
    if (!lowPower) {
      for (const offset of [-1.72, 1.72]) b.box("foam", [x + offset, 0.2, 0], [0.12, 0.04, 144]);
      // Réverbères vénitiens et bornes d'amarrage le long de la promenade du canal.
      for (let z = -56; z <= 56; z += 28) {
        if (Math.abs(z + 44) < 6 || Math.abs(z - 37) < 6) continue;
        const px = x - side * 2.25;
        b.cylinder("dark", [px, 1.55, z], 0.06, 0.09, 2.6, 6);
        b.sphere("lamp", [px, 2.92, z], 0.22);
        b.cylinder("wood", [x - side * 1.9, 0.45, z + 6], 0.11, 0.13, 0.6, 6);
      }
    }
    // Ponts vénitiens arqués en pierre enjambant le canal.
    for (const z of [-44, 37]) {
      venetianBridge(b, x, z, lowPower);
    }
    // Gondoles Yagara Bull glissant sur les canaux.
    if (!lowPower) {
      yagaraGondola(b, x, 0.12, -18, 1, "coral", lowPower);
      yagaraGondola(b, x, 0.12, 14, -1, "blueHouse", lowPower);
    }
    if (side < 0) {
      // Quartier vénitien dense sur la berge ouest face à la cité-fontaine.
      const westHouses: Array<[number, number, number, number, MaterialKey, boolean]> = [
        [-31.5, -56, 4.4, 6.2, "coral", false],
        [-34.5, -36, 4.8, 8.0, "peach", true],
        [-31.0, -18, 4.2, 5.8, "blueHouse", false],
        [-35.0, -2, 5.0, 9.2, "cream", true],
        [-31.8, 16, 4.5, 6.6, "coral", false],
        [-34.8, 34, 4.7, 7.8, "blueHouse", false],
        [-32.0, 52, 4.4, 6.0, "peach", false],
      ];
      westHouses
        .filter((_, i) => !lowPower || i % 2 === 0)
        .forEach(([hx, hz, hw, hh, col, domed]) => {
          const hy = sceneryTerrainHeight(1, hx, hz) - 0.12;
          venetianHouse(b, hx, hy, hz, hw, hh, col, lowPower, domed);
        });
      // Voie ferrée maritime du Puffing Tom sur viaduc en bois + rails métalliques.
      for (const rx of [-43, -41.2]) b.box("metal", [rx, 1.2, 1], [0.14, 0.16, 120]);
      for (let i = 0; i < (lowPower ? 8 : 16); i++) {
        const z = -56 + i * (lowPower ? 16 : 7.5);
        b.box("wood", [-42.1, 1.02, z], [3.5, 0.22, 0.62]);
        if (i % 2 === 0) {
          b.cylinder("wood", [-43.1, 0.26, z], 0.22, 0.28, 1.72, 6);
          b.cylinder("wood", [-41.1, 0.26, z], 0.22, 0.28, 1.72, 6);
        }
      }
      if (!lowPower) {
        // Puffing Tom (Train des Mers) : proue requin emblématique, chaudière cerclée d'or, panache de vapeur et 2 wagons.
        b.box("dark", [-42.1, 2.02, -12], [2.2, 1.55, 5.6]);
        b.cylinder("dark", [-42.1, 2.48, -15.0], 0.88, 0.92, 3.0, 12, [Math.PI / 2, 0, 0]);
        // Bagues dorées sur la chaudière et chasse-vagues avant.
        for (const bz of [-14.0, -15.4]) b.ring("gold", [-42.1, 2.48, bz], 0.9, 0.08, [0, 0, 0]);
        b.box("vermilion", [-42.1, 1.62, -16.75], [2.1, 0.72, 1.2], [0.35, 0, 0]);
        // Cheminée + panache de vapeur blanche.
        b.cylinder("vermilion", [-42.1, 3.65, -15.4], 0.34, 0.24, 1.35, 8);
        b.sphere("cloud", [-42.1, 4.75, -14.8], 0.85, [1.0, 0.7, 1.2]);
        b.sphere("cloud", [-42.1, 5.45, -13.2], 1.1, [1.05, 0.72, 1.35]);
        b.sphere("cloud", [-42.1, 6.0, -11.1], 1.25, [1.1, 0.68, 1.5]);
        // Phare avant lumineux + cabine vitrée.
        b.sphere("lamp", [-42.1, 2.48, -16.6], 0.34);
        b.box("lamp", [-42.1, 2.38, -10.8], [2.24, 0.56, 1.6]);
        // 2 wagons passagers bleus et crème avec fenêtres illuminées.
        for (const wz of [-5.2, 1.2]) {
          b.box("metal", [-42.1, 1.58, wz - 3.2], [0.55, 0.24, 1.4]);
          b.box("blueHouse", [-42.1, 2.08, wz], [2.1, 1.55, 5.1]);
          b.box("cream", [-42.1, 2.92, wz], [2.22, 0.22, 5.25]);
          for (const fz of [-1.4, 0, 1.4]) {
            b.box("lamp", [-42.1, 2.18, wz + fz], [2.16, 0.55, 0.85]);
          }
        }
      }
    }
  }
  if (zone === 2) {
    // Bancs de nuages d'îles célestes le long de la Mer Blanche-Blanche.
    for (let i = 0; i < (lowPower ? 3 : 6); i++) {
      const x = side * (24 + (i % 3) * 7), z = -54 + i * 21;
      b.sphere(i % 3 ? "cloud" : "cloudShade", [x, 0.35, z], 1, [7.6, 1.25 + (i % 2) * 0.75, 5.2]);
      b.sphere("cloud", [x + side * 3.1, 1.05, z + 1.4], 2.6, [1.3, 0.65, 1]);
    }
    if (side < 0) {
      // Angel Island : Milky Road (fleuve de nuages turquoise et blanc), Porte du Paradis ailée, maisons-nuages et Waver.
      b.curve("cloudShade", [[-29, 0.85, -56], [-35, 1.05, -26], [-26, 0.85, 6], [-35, 1.05, 48]], 2.1, 26);
      b.curve("foam", [[-29, 1.28, -56], [-35, 1.48, -26], [-26, 1.28, 6], [-35, 1.48, 48]], 1.45, 26);
      b.curve("water", [[-29, 1.46, -56], [-35, 1.66, -26], [-26, 1.46, 6], [-35, 1.66, 48]], 0.85, 26);
      if (!lowPower) {
        // Porte du Paradis (Heaven's Gate) avec arches ailées au-dessus de la Milky Road.
        for (const z of [-22, 28]) {
          for (const x of [-40, -30.5]) {
            b.cylinder("cloud", [x, 3.3, z], 0.55, 0.78, 6.6, 10);
            b.ring("gold", [x, 6.25, z], 0.68, 0.12);
          }
          b.curve("cloud", [[-40, 6.4, z], [-35.25, 8.2, z], [-30.5, 6.4, z]], 0.52, 14);
          b.curve("gold", [[-39.4, 6.6, z], [-35.25, 8.4, z], [-31.1, 6.6, z]], 0.16, 12);
          // Ailes d'ange sculptées de chaque côté de la porte.
          b.curve("cloud", [[-40.5, 5.4, z], [-43.4, 7.0, z], [-44.8, 8.8, z]], 0.42, 10);
          b.curve("cloud", [[-30.0, 5.4, z], [-27.1, 7.0, z], [-25.7, 8.8, z]], 0.42, 10);
          b.sphere("lamp", [-35.25, 7.25, z], 0.36);
        }
        // Petites maisons-nuages arrondies d'Angel Island (Lovely Street) + Waver sur la Milky Road.
        for (const [hx, hz, roofMat] of [[-23.5, -39, "blueHouse"], [-23.8, 16, "blossomLight"]] as Array<[number, number, MaterialKey]>) {
          b.sphere("cloud", [hx, 0.8, hz], 2.5, [1.2, 0.45, 1.1]);
          b.cylinder("cream", [hx, 2.2, hz], 1.55, 1.75, 2.2, 12);
          b.sphere(roofMat, [hx, 3.45, hz], 1.7, [1.12, 0.78, 1.12]);
          b.ring("cloud", [hx, 3.25, hz], 1.75, 0.28);
          b.box("dark", [hx + 1.65, 1.85, hz], [0.16, 1.1, 0.7]);
        }
        // Waver (bateau à Dial) glissant sur la Milky Road.
        b.sphere("cream", [-26.2, 2.15, -3], 0.72, [0.75, 0.34, 1.9]);
        b.box("turquoise", [-26.2, 3.25, -3], [0.1, 1.6, 1.35]);
        b.sphere("gold", [-26.2, 2.25, -1.5], 0.24);
      }
    } else if (!lowPower) {
      // Côté Upper Yard : affleurements de Vearth (terre + jungle dense) et pierres dorées de Shandora.
      for (const [vx, vz] of [[25.5, -38], [26.5, 36]]) {
        b.sphere("elbafCliff", [vx, 0.55, vz], 4.2, [1.25, 0.42, 1.15]);
        b.sphere("foliageDeep", [vx - 1.1, 1.65, vz - 0.8], 2.1, [1.2, 0.65, 1.1]);
        b.sphere("leaf", [vx + 1.4, 1.55, vz + 0.9], 1.75, [1.15, 0.62, 1.1]);
        b.box("rock", [vx, 1.45, vz], [2.4, 0.9, 2.2]);
        b.box("gold", [vx, 1.96, vz], [2.5, 0.14, 2.3]);
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
      const cherryAY = sceneryTerrainHeight(3, -27.5, -15) - 0.05;
      const cherryBY = sceneryTerrainHeight(3, -33.5, 33) - 0.05;
      cherryTree(b, -27.5, cherryAY, -15, 5.0, lowPower);
      cherryTree(b, -33.5, cherryBY, 33, 5.4, lowPower);
      // Maison de thé d'O-Tsuru et quartier machiya orientés face au bus (+X) avec fenêtres shoji lumineuses.
      const houseY = sceneryTerrainHeight(3, -29, 4) - 0.04;
      machiyaHouse(b, -29, houseY, 4, 6.6, 4.4, 5.4, 1, lowPower);
      if (!lowPower) {
        const house2Y = sceneryTerrainHeight(3, -30.5, 16) - 0.04;
        machiyaHouse(b, -30.5, house2Y, 16, 4.8, 3.8, 4.4, 1, false);
        // Grand Torii vermillon bordant le chemin de la Capitale des Fleurs côté ouest.
        const toriiY = sceneryTerrainHeight(3, -22.5, -4) - 0.04;
        for (const tz of [-6.0, -2.0]) {
          b.cylinder("rock", [-22.5, toriiY + 0.35, tz], 0.38, 0.46, 0.7, 8);
          b.cylinder("vermilion", [-22.5, toriiY + 3.0, tz], 0.24, 0.34, 5.6, 10);
        }
        b.box("vermilion", [-22.5, toriiY + 5.1, -4], [0.46, 0.34, 5.2]);
        b.box("gold", [-22.38, toriiY + 5.5, -4], [0.2, 0.72, 0.56]);
        b.curve("jadeRoof", [[-22.5, toriiY + 5.95, -7.2], [-22.5, toriiY + 5.55, -4], [-22.5, toriiY + 5.95, -0.8]], 0.26, 10);
        // Tapis de pétales de sakura roses sous les cerisiers et lanternes Toro en pierre.
        for (const [px, py, pz] of [[-27.5, cherryAY, -15], [-33.5, cherryBY, 33]] as const) {
          b.sphere("blossomLight", [px, py + 0.08, pz], 3.3, [1.25, 0.06, 1.15]);
        }
        for (const lz of [-8, 4, 16]) {
          const lanternY = sceneryTerrainHeight(3, -23.5, lz) - 0.03;
          b.cylinder("rock", [-23.5, lanternY + 0.8, lz], 0.22, 0.3, 1.6, 6);
          b.box("lamp", [-23.5, lanternY + 1.85, lz], [0.5, 0.55, 0.5]);
          b.box("rock", [-23.5, lanternY + 2.25, lz], [0.78, 0.24, 0.78]);
        }
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
        // Drakkar des géants d'Elbaf sur la grève : coque, boucliers dorés, proue dragon et voile rayée rouge/crème.
        const drakkarY = sceneryTerrainHeight(6, -41.4, 34);
        b.sphere("wood", [-41.4, drakkarY + 0.45, 34], 1.32, [1.1, .55, 3.05]);
        b.cylinder("elbafBark", [-41.4, drakkarY + 2.6, 34], .12, .16, 4.4, 8);
        b.box("vermilion", [-41.4, drakkarY + 3.45, 34.25], [1.7, 1.85, .14]);
        b.box("cream", [-41.4, drakkarY + 3.45, 34.27], [.55, 1.85, .16]);
        b.cylinder("oldGold", [-41.4, drakkarY + 1.35, 30.4], .12, .34, 1.4, 6, [.45, 0, 0]);
        b.sphere("gold", [-41.4, drakkarY + 2.0, 30.05], .28);
        for (const sz of [32.4, 34.0, 35.6]) {
          for (const sideS of [-1, 1]) {
            b.cylinder("gold", [-41.4 + sideS * 1.28, drakkarY + 0.72, sz], .32, .32, .08, 8, [0, 0, Math.PI / 2]);
          }
        }
        // Pierres runiques lumineuses et braseros nordiques bordant le chemin.
        for (const rz of [-36, -6, 20]) {
          const ry = sceneryTerrainHeight(6, -17.8, rz) - 0.04;
          b.cylinder("rock", [-17.8, ry + 1.15, rz], .28, .44, 2.3, 6);
          b.box("neonCyan", [-17.42, ry + 1.35, rz], [.08, .85, .14]);
          b.sphere("lamp", [-17.8, ry + 2.45, rz], .22);
        }
      }
    } else {
      elbafLodge(b, 17.2, sceneryTerrainHeight(6, 17.2, -43.3) - 0.04, -43.3, 2.65, lowPower);
      elbafLodge(b, 17.7, sceneryTerrainHeight(6, 17.7, 32.9) - 0.04, 32.9, 2.92, lowPower, -1, "jadeRoof");
    }
  }
  if (zone === 7) {
    // Enies Lobby : promenade judiciaire en marbre blanc, entablement vert jade et contrastes ville basse terre cuite.
    const x = side * 22;
    b.box("snow", [x, 0.24, 0], [2.8, 0.42, 134]);
    b.box("cream", [x, 0.5, 0], [3.0, 0.12, 134]);
    // Entablement blanc et frise vert jade reliant les colonnes (dégagé devant le passage vers l'île suspendue côté est).
    const segments: Array<[number, number]> = side > 0 ? [[-60, -15], [15, 60]] : [[-60, 60]];
    for (const [zStart, zEnd] of segments) {
      const len = zEnd - zStart;
      const zMid = (zStart + zEnd) / 2;
      b.box("snow", [x, 4.75, zMid], [1.35, 0.48, len]);
      b.box("jadeRoof", [x, 5.08, zMid], [1.55, 0.2, len + 0.4]);
    }
    const step = lowPower ? 24 : 12;
    for (let z = -58; z <= 58; z += step) {
      if (side > 0 && Math.abs(z) < 14) continue;
      b.box("cream", [x, 0.72, z], [1.25, 0.42, 1.25]);
      b.cylinder("snow", [x, 2.7, z], 0.36, 0.44, 3.8, 8);
      b.box("gold", [x, 4.46, z], [1.05, 0.14, 1.05]);
      if (!lowPower && Math.abs(z) % 24 < 6) {
        b.sphere("lamp", [x, 5.5, z], 0.28);
        b.box("snow", [x - side * 0.78, 3.4, z], [0.1, 1.5, 0.68]);
        b.box("gold", [x - side * 0.82, 3.4, z], [0.08, 0.28, 0.28]);
      }
    }
    if (side < 0) {
      // Palais judiciaires blancs à toits vert jade + maisons basses en terre cuite rouge de la vieille ville.
      for (const z of [-36, 26]) {
        b.box("cream", [-34, 0.45, z], [8.4, 0.9, 12.2]);
        b.box("snow", [-34, 3.55, z], [7.6, 5.6, 11.2]);
        b.box("cream", [-34, 6.45, z], [8.2, 0.38, 11.8]);
        b.roof("jadeRoof", [-34, 6.65, z], 8.6, 12.2, 2.2);
        for (const cz of [-4.2, -1.8, 1.8, 4.2]) {
          b.cylinder("snow", [-29.9, 3.5, z + cz], 0.32, 0.38, 5.4, 8);
        }
        b.box("dark", [-30.16, 2.2, z], [0.12, 2.8, 2.0]);
        if (!lowPower) {
          for (const fz of [-3.2, 3.2]) b.box("lamp", [-30.16, 4.2, z + fz], [0.08, 1.2, 0.85]);
          worldGovEmblem(b, -30.05, 5.45, z, 0.72);
        }
      }
      // Bâtiments anciens en terre cuite rouge / brique entre les palais judiciaires (contraste canonique).
      if (!lowPower) {
        for (const [bx, bz, bw, bh] of [[-32.5, -10, 4.2, 4.2], [-33.0, 4, 4.6, 4.8], [-32.5, -56, 4.0, 3.8]]) {
          b.box("coral", [bx, bh / 2, bz], [bw, bh, bw * 0.9]);
          b.roof("roof", [bx, bh, bz], bw + 0.6, bw * 0.9 + 0.6, 1.2);
          b.box("lamp", [bx + bw / 2 + 0.04, bh * 0.55, bz], [0.06, 0.9, 0.65]);
        }
      }
      // Viaduc du Sea Train sur piliers en pierre arrivant vers l'île judiciaire.
      for (const rx of [-43, -41.2]) b.box("metal", [rx, 1.18, 0], [0.14, 0.16, 122]);
      for (let i = 0; i < (lowPower ? 8 : 16); i++) {
        const z = -56 + i * (lowPower ? 15 : 7.5);
        b.box("wood", [-42.1, 0.96, z], [3.3, 0.22, 0.58]);
        if (i % 2 === 0) {
          b.cylinder("rock", [-43.1, 0.42, z], 0.24, 0.32, 0.96, 6);
          b.cylinder("rock", [-41.1, 0.42, z], 0.24, 0.32, 0.96, 6);
        }
      }
      if (!lowPower) {
        // Le Rocketman (prototype rouge du Train des Mers) fonçant vers Enies Lobby !
        b.box("vermilion", [-42.1, 2.06, -6], [2.2, 1.58, 5.6]);
        b.cylinder("vermilion", [-42.1, 2.48, -9.0], 0.86, 0.92, 2.8, 12, [Math.PI / 2, 0, 0]);
        b.box("metal", [-42.1, 1.62, -10.6], [2.1, 0.78, 1.2], [0.35, 0, 0]);
        b.cylinder("dark", [-42.1, 3.65, -9.2], 0.36, 0.26, 1.35, 8);
        b.sphere("cloud", [-42.1, 4.8, -8.4], 0.9, [1.0, 0.72, 1.3]);
        b.sphere("cloud", [-42.1, 5.55, -6.5], 1.15, [1.05, 0.72, 1.45]);
        b.sphere("lamp", [-42.1, 2.48, -10.5], 0.34);
        b.box("lamp", [-42.1, 2.38, -4.8], [2.24, 0.56, 1.5]);
        // Wagon blindé attelé derrière le Rocketman.
        b.box("metal", [-42.1, 1.58, -2.2], [0.55, 0.24, 1.4]);
        b.box("dark", [-42.1, 2.04, 0.8], [2.1, 1.5, 4.8]);
        b.box("vermilion", [-42.1, 2.86, 0.8], [2.2, 0.2, 4.95]);
        for (const fz of [-1.2, 0.8, 2.8]) b.box("lamp", [-42.1, 2.15, fz], [2.16, 0.5, 0.75]);
      }
    }
  }
  return b.finish();
}
