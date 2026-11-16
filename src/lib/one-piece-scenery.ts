import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { setSceneryParts } from "./world-visibility";

type Point = [number, number, number];
type MaterialKey = keyof typeof SCENERY_MATERIALS;

// One palette and one merged mesh per material. Small façade details add vertices,
// not draw calls; no textures or lights are allocated by a destination.
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
    plain.deleteAttribute("uv");
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
  for (let i = 0; i < 15; i++) {
    const x = -7.5 - i * 0.64, y = 9.5 - i * 0.59;
    b.box(i % 3 ? "sandLight" : "cream", [x, y, 0], [0.7, 0.3, 4.1]);
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
  // The great fountain is deliberately taller than the surrounding roofline.
  // Distinct pale retaining walls, turquoise ring-canals and falling water
  // make the circular stepped silhouette visible from the cabin.
  for (let tier = 0; tier < 4; tier++) {
    const radius = 18 - tier * 3.5, bottom = tier * 4.1;
    b.cylinder("cream", [0, bottom + 1.8, 0], radius, radius + 0.7, 3.6, 24);
    b.cylinder("water", [0, bottom + 3.65, 0], radius + 0.06, radius + 0.06, 0.18, 24);
    b.ring("foam", [0, bottom + 3.77, 0], radius - 0.15, 0.16);
    b.cylinder("turquoise", [0, bottom + 0.28, 0], radius + 0.6, radius + 0.6, 0.4, 24);
    const count = lowPower ? 6 : 10;
    for (let flow = 0; flow < count; flow++) {
      const angle = flow / count * Math.PI * 2;
      const r = radius + 0.1;
      b.box("water", [Math.cos(angle) * r, bottom + 1.8, Math.sin(angle) * r], [0.18, 3.7, 1.6], [0, -angle, 0]);
      if (!lowPower) b.box("foam", [Math.cos(angle) * (r + 0.08), bottom + 1.5, Math.sin(angle) * (r + 0.08)], [0.06, 2.7, 0.16], [0, -angle, 0]);
    }
  }
  b.cylinder("cream", [0, 18, 0], 2.6, 4.2, 3.9, 16);
  b.cylinder("water", [0, 20, 0], 2.7, 2.7, 0.2, 16);
  b.cylinder("cream", [0, 21.3, 0], 1.0, 1.7, 2.5, 12);
  b.sphere("water", [0, 22.9, 0], 1.2, [0.65, 1.4, 0.65]);
  b.ring("foam", [0, 20.15, 0], 2.45, 0.14);
  // A curved town nestles into the lower tiers; the west face remains open
  // for the fountain cascade rather than hidden behind a solid city wall.
  const houses: [number, number, number, number, number, MaterialKey][] = [
    [-8.7, 3.8, -11.1, 3.2, 5.7, "coral"], [-2.5, 3.8, -14.6, 3.7, 7.3, "peach"],
    [4.2, 3.8, -14.1, 4.2, 6.2, "cream"], [11.1, 3.8, -9.4, 3.5, 8.5, "blueHouse"],
    [13.6, 3.8, 2, 3.5, 6.1, "coral"], [8.4, 3.8, 11.2, 4.1, 6.8, "peach"],
    [-0.7, 3.8, 14.4, 3.6, 5.1, "blueHouse"], [-8.7, 3.8, 11.1, 3.3, 7.0, "coral"],
    [5.2, 11.9, -5.1, 3.0, 6.1, "peach"], [6.7, 7.9, 7.2, 3.2, 6.8, "cream"],
  ];
  houses.filter((_, i) => !lowPower || i % 2 === 0).forEach((house) => venetianHouse(b, ...house, lowPower));
  // Galley-La's clock tower with paired clock faces and a copper dome.
  b.cylinder("coral", [8.5, 11.5, -1.5], 1.5, 1.9, 14.5, 8);
  b.cylinder("cream", [8.5, 18.9, -1.5], 2, 2, 0.5, 8);
  b.dome("turquoise", [8.5, 19.2, -1.5], 2.05, [1, 1.1, 1]);
  b.cylinder("gold", [8.5, 21.9, -1.5], 0, 0.14, 1.3, 6);
  b.cylinder("cream", [6.93, 17.1, -1.5], 0.83, 0.83, 0.12, 16, [0, 0, Math.PI / 2]);
  b.box("dark", [6.82, 17.28, -1.5], [0.08, 0.54, 0.08]);
  b.box("dark", [6.81, 17.1, -1.27], [0.08, 0.08, 0.47]);
  // Three visible arches below a pedestrian bridge over the front canal.
  for (let step = 0; step < 13; step++) {
    const z = -12.8 + step * 0.78;
    const y = 1.25 + Math.sin(step / 12 * Math.PI) * 1.8;
    b.box("cream", [-14.9, y, z], [3, 0.38, 0.84]);
    for (const side of [-1, 1]) {
      b.box("cream", [-14.9 + side * 1.45, y + 0.65, z], [0.22, 0.15, 0.85]);
      if (step % 2 === 0) b.box("cream", [-14.9 + side * 1.45, y + 0.36, z], [0.18, 0.65, 0.18]);
    }
  }
  // Dock, Yagara Bull gondolas, Galley-La shipyard crane and warm canal lamps.
  b.box("wood", [-16.8, 0.65, 7], [4.6, 0.22, 3.0]);
  b.sphere("dark", [-18.2, 0.8, 12.2], 1, [0.85, 0.38, 3]);
  b.sphere("wood", [-18.2, 1.0, 12.2], 1, [0.65, 0.14, 2.5]);
  if (!lowPower) {
    // Yagara Bull avec auvent rayé et figure de proue turquoise dégagée du quai.
    b.sphere("turquoise", [-18.2, 1.15, 9.2], 0.55, [0.8, 0.8, 1.1]);
    b.box("coral", [-18.2, 1.68, 12.2], [1.1, 0.16, 2.2]);
    for (const pz of [11.3, 13.1]) b.cylinder("wood", [-18.2, 1.32, pz], 0.06, 0.06, 0.72, 6);
    // Grue navale de Galley-La sur le bord du quai, flèche orientée vers l'eau.
    b.cylinder("metal", [-18.4, 3.45, 6.4], 0.24, 0.32, 5.4, 8);
    b.box("metal", [-20.2, 6.0, 6.4], [4.4, 0.28, 0.3], [0, 0, -0.18]);
    b.cylinder("gold", [-22.1, 5.2, 6.4], 0.05, 0.05, 2.2, 6);
    b.box("wood", [-22.1, 3.9, 6.4], [1.4, 0.5, 1.1]);
    // Lanternes chaudes sur le quai et aux abords du pont.
    for (const [lx, ly, lz] of [[-18.7, 1.85, 5.8], [-18.7, 1.85, 8.2], [-16.2, 1.2, -13.3], [-16.2, 1.2, -2.9]]) {
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
  for (const z of [-12.2, -7.8]) b.cylinder("vermilion", [-15.7, 3.3, z], 0.28, 0.38, 6.2, 10);
  b.box("vermilion", [-15.7, 5.9, -10], [0.55, 0.38, 6]);
  b.curve("jadeRoof", [[-15.7, 6.6, -13.4], [-15.7, 6.2, -10], [-15.7, 6.6, -6.6]], 0.28, 10);
  if (!lowPower) {
    cherryTree(b, -9.8, 0.2, 11, 4.4, false);
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

function egghead(b: Builder, lowPower: boolean) {
  // Base industrielle et piliers soutenant la Labophase sur son nuage.
  b.cylinder("metal", [1, 5.2, 0], 4.2, 5.6, 10.4, 12);
  b.cylinder("neonCyan", [1, 5.4, 0], 2.1, 2.1, 9.8, 12);
  for (let i = 0; i < (lowPower ? 4 : 6); i++) {
    const a = i / (lowPower ? 4 : 6) * Math.PI * 2;
    b.cylinder("castle", [1 + Math.cos(a) * 6.5, 5.2, Math.sin(a) * 6.5], 0.7, 0.95, 10.2, 8);
  }
  // Plateau de nuages technologiques de la Labophase.
  const cloudLobes = lowPower ? 7 : 12;
  for (let i = 0; i < cloudLobes; i++) {
    const a = i / cloudLobes * Math.PI * 2;
    b.sphere(i % 2 ? "cloud" : "cloudShade", [1 + Math.cos(a) * 8.4, 10.4, Math.sin(a) * 8.4], 3.8, [1.1, 0.55, 1]);
  }
  b.sphere("cloud", [1, 10.8, 0], 9.2, [1.1, 0.35, 1.05]);
  b.cylinder("castle", [1, 11.8, 0], 8.2, 8.8, 1.2, 16);

  // Dôme-œuf géant de Punk Records surmonté de la pomme-antenne de Vegapunk.
  b.sphere("snow", [1, 17.5, 0], 5.6, [1, 1.38, 1], 18);
  b.cylinder("neonCyan", [1, 16.9, 0], 5.72, 5.72, 0.68, 20);
  b.ring("metal", [1, 14.5, 0], 5.45, 0.28);
  b.ring("neonCyan", [1, 20.6, 0], 4.7, 0.18);
  b.dome("vermilion", [1, 24.8, 0], 2.15, [1, 0.75, 1]);
  b.cylinder("cream", [1, 24.75, 0], 2.2, 2.2, 0.28, 14);
  b.cylinder("gold", [1, 27.2, 0], 0.14, 0.26, 3.2, 8);
  b.sphere("neonCyan", [1, 28.9, 0], 0.45);
  b.ring("neonCyan", [1, 27.6, 0], 1.25, 0.12);

  // Dômes-laboratoires périphériques et tube de transport lumineux.
  for (const side of [-1, 1]) {
    b.cylinder("castle", [-4.6, 13.4, side * 7.8], 2.2, 2.4, 2.4, 12);
    b.dome("snow", [-4.6, 14.6, side * 7.8], 2.2, [1, 0.85, 1]);
    b.box("neonCyan", [-6.82, 13.5, side * 7.8], [0.12, 0.65, 2.1]);
  }
  const tubePoints: Point[] = [[-11.5, 1.6, -8.5], [-9.2, 5.4, -6], [-6.2, 9.6, -3.5], [-4.5, 12.6, 0]];
  b.cylinder("metal", [-11.5, 0.85, -8.5], 0.8, 1.0, 1.7, 10);
  b.ring("neonCyan", [-11.5, 1.6, -8.5], 0.85, 0.12);
  b.curve("neonCyan", tubePoints, 0.34, 18);
  if (!lowPower) {
    const tubeCurve = new THREE.CatmullRomCurve3(tubePoints.map((p) => new THREE.Vector3(...p)));
    const zAxis = new THREE.Vector3(0, 0, 1);
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const pt = tubeCurve.getPoint(t);
      const tan = tubeCurve.getTangent(t).normalize();
      const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(zAxis, tan));
      b.ring("metal", [pt.x, pt.y, pt.z], 0.54, 0.1, [euler.x, euler.y, euler.z]);
    }
    // Anneau orbital holographique autour de Punk Records et projecteurs d'écrans sur la terrasse.
    b.ring("neonCyan", [1, 18.2, 0], 7.4, 0.13, [1.22, 0.35, 0.18]);
    for (const [hx, hy, hz] of [[-6.7, 14.3, -2.5], [-6.7, 14.7, 2.5]]) {
      b.cylinder("metal", [hx, 12.6, hz], 0.45, 0.55, 0.4, 8);
      b.box("neonCyan", [hx, hy, hz], [0.08, 1.6, 2.5]);
    }
    // Serre climatique végétale sur la terrasse de la Labophase.
    b.cylinder("neonCyan", [6.6, 12.6, 5.4], 2.3, 2.3, 0.24, 12);
    b.sphere("leaf", [6.6, 13.8, 5.4], 1.7, [1.1, 0.8, 1.1]);
    b.sphere("leafLight", [6.1, 14.5, 5.0], 1.1, [1, 0.8, 1]);
  }

  // Silhouette du robot géant (Emeth / Vegaforce) au pied de la Labophase.
  const rx = -8.5, rz = 8.2;
  for (const leg of [-1, 1]) b.cylinder("metal", [rx, 1.8, rz + leg * 1.1], 0.65, 0.75, 3.6, 8);
  b.box("castle", [rx, 5.4, rz], [3.2, 3.8, 4.1]);
  b.sphere("metal", [rx, 7.6, rz], 1.55, [1, 0.85, 1.1]);
  b.box("neonCyan", [rx - 1.48, 7.55, rz], [0.16, 0.38, 1.7]);
  for (const side of [-1, 1]) {
    b.sphere("vermilion", [rx, 6.6, rz + side * 2.55], 1.05, [0.95, 0.9, 0.95]);
    b.cylinder("metal", [rx - 0.3, 4.5, rz + side * 2.7], 0.52, 0.58, 3.4, 8);
    b.curve("oldGold", [[rx, 8.6, rz + side * 0.9], [rx - 0.3, 9.8, rz + side * 1.7], [rx - 0.1, 10.6, rz + side * 1.3]], 0.22, 8);
  }
}

function elbaf(b: Builder, lowPower: boolean) {
  // Socle rocheux nordique et cascade descendant des falaises d'Elbaf.
  b.cylinder("rock", [1, 2.8, 0], 13.5, 16.5, 5.6, 12);
  b.cylinder("foliageDeep", [1, 5.7, 0], 13.2, 13.7, 0.6, 12);
  for (let i = 0; i < (lowPower ? 5 : 9); i++) {
    const a = i / (lowPower ? 5 : 9) * Math.PI * 2;
    b.cylinder(i % 2 ? "rock" : "rockLight", [1 + Math.cos(a) * 14.5, 2.5, Math.sin(a) * 14.5], 1.1, 2.2, 5 + (i % 3), 6);
  }
  b.box("water", [-11.5, 2.8, 1.5], [1.2, 5.6, 3.6], [0, 0, 0.18]);
  b.sphere("foam", [-13.2, 0.35, 1.5], 2.2, [1.1, 0.35, 1.5]);

  // L'Arbre-Trésor Adam : racines géantes, tronc tressé colossal et canopée multi-étages.
  for (let strand = 0; strand < 3; strand++) {
    const offset = strand * Math.PI * 2 / 3;
    const pts: Point[] = [];
    for (let i = 0; i <= 7; i++) {
      const y = 4 + i * 3.6;
      const twist = offset + i * 0.35;
      const spread = Math.max(0.9, 2.6 - i * 0.22);
      pts.push([1.5 + Math.cos(twist) * spread, y, Math.sin(twist) * spread]);
    }
    b.curve("wood", pts, 2.2, 20);
  }
  for (let i = 0; i < (lowPower ? 4 : 6); i++) {
    const a = i / (lowPower ? 4 : 6) * Math.PI * 2;
    b.curve("wood", [[1.5, 7, 0], [1.5 + Math.cos(a) * 7, 4.8, Math.sin(a) * 7], [1.5 + Math.cos(a) * 12, 1.8, Math.sin(a) * 12]], 1.15, 10);
  }
  // Grandes branches et feuillage monumental.
  const branches: [Point, Point, number][] = [
    [[1.5, 17, 0], [-10, 21, -7], 1.2],
    [[1.5, 19, 0], [-9, 24, 8], 1.15],
    [[1.5, 21, 0], [11, 26, -6], 1.1],
    [[1.5, 23, 0], [10, 27, 7], 1.05],
  ];
  for (const [start, end, radius] of branches) {
    const mid: Point = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + 1.5, (start[2] + end[2]) / 2];
    b.curve("wood", [start, mid, end], radius, 10);
    b.sphere("foliageDeep", end, 6.2, [1.25, 0.52, 1.15]);
    b.sphere("leaf", [end[0], end[1] + 1.6, end[2]], 4.8, [1.15, 0.48, 1.1]);
  }
  b.sphere("foliageDeep", [1.5, 29.5, 0], 10.5, [1.25, 0.45, 1.2]);
  b.sphere("leaf", [1.5, 32, 0], 8.6, [1.15, 0.45, 1.1]);
  b.sphere("leafLight", [0.8, 34, -0.5], 6.0, [1.1, 0.42, 1.05]);

  // Hall viking / Château fondé sur un bastion rocheux ancré dans le plateau.
  b.box("rockLight", [-6.5, 8.55, -3.5], [7.2, 5.5, 9.2]);
  b.box("wood", [-6.5, 12.8, -3.5], [5.8, 3.2, 8.2]);
  b.roof("dark", [-6.5, 14.4, -3.5], 7.4, 9.8, 3.4);
  for (const side of [-1, 1]) {
    b.curve("gold", [[-6.5, 17.8, -3.5 + side * 4.4], [-6.5, 19.2, -3.5 + side * 5.2], [-6.5, 19.7, -3.5 + side * 4.5]], 0.2, 8);
  }
  for (let i = 0; i < 4; i++) {
    const sz = -6.5 + i * 2;
    b.cylinder(i % 2 ? "gold" : "vermilion", [-9.45, 12.7, sz], 0.58, 0.58, 0.16, 10, [0, 0, Math.PI / 2]);
    b.box("lamp", [-9.45, 13.7, sz], [0.1, 0.55, 0.45]);
  }
  if (!lowPower) {
    // Cabanes suspendues sous les branches d'Adam et braseros géants sur la terrasse du hall.
    for (const [hx, hy, hz] of [[-10.4, 17.6, -7.2], [-9.4, 20.4, 7.6]]) {
      b.cylinder("wood", [hx, hy + 2.1, hz], 0.14, 0.14, 2.8, 6);
      b.box("wood", [hx, hy, hz], [2.6, 2.0, 2.6]);
      b.roof("dark", [hx, hy + 1.0, hz], 3.5, 3.5, 1.5);
      b.box("lamp", [hx - 1.33, hy, hz], [0.08, 0.7, 0.9]);
    }
    for (const bz of [-7.2, 0.2]) {
      b.cylinder("rock", [-9.4, 11.95, bz], 0.52, 0.38, 1.3, 8);
      b.sphere("lamp", [-9.4, 12.85, bz], 0.48);
    }
    // Stèle de la fresque du Harley posée au pied ouest de la falaise.
    b.box("rockLight", [-17.2, 2.2, -7.2], [1.2, 4.4, 5.2]);
    b.box("gold", [-17.85, 2.4, -7.2], [0.08, 2.8, 4.0]);
    b.sphere("neonCyan", [-17.92, 3.0, -7.2], 0.55, [0.25, 1, 1]);
  }

  // Grande épée des géants plantée dans la falaise face au bus (garde et poignée alignées sur la lame).
  const swordRot: Point = [0.16, 0.2, 0.24];
  const swordAxis = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(...swordRot));
  const bladeCenter = new THREE.Vector3(-11.5, 6.2, 9.2);
  const guardPos = bladeCenter.clone().addScaledVector(swordAxis, 5.35);
  const hiltPos = bladeCenter.clone().addScaledVector(swordAxis, 6.8);
  b.box("metal", [bladeCenter.x, bladeCenter.y, bladeCenter.z], [1.1, 10.5, 0.28], swordRot);
  b.box("gold", [guardPos.x, guardPos.y, guardPos.z], [3.4, 0.55, 0.65], swordRot);
  b.cylinder("wood", [hiltPos.x, hiltPos.y, hiltPos.z], 0.22, 0.24, 2.5, 8, swordRot);
}

function eniesLobby(b: Builder, lowPower: boolean) {
  // Gouffre circulaire de la cascade : anneau de falaise et rideau d'eau tombant dans l'abîme.
  b.cylinder("dark", [-2, 0.12, 0], 11.2, 11.2, 0.2, 20);
  const segments = lowPower ? 12 : 20;
  for (let i = 0; i < segments; i++) {
    const a = i / segments * Math.PI * 2;
    // Laisser une ouverture face au bus pour que la cascade reste lisible depuis le pont.
    if (Math.cos(a) < -0.68) continue;
    const x = -2 + Math.cos(a) * 12.6, z = Math.sin(a) * 12.6;
    b.box("rock", [x, 1.4, z], [2.4, 2.8, 3.8], [0, -a, 0]);
    b.box("water", [-2 + Math.cos(a) * 11.3, 1.35, Math.sin(a) * 11.3], [0.35, 2.7, 3.4], [0, -a, 0]);
    b.box("foam", [-2 + Math.cos(a) * 11.0, 0.45, Math.sin(a) * 11.0], [0.65, 0.9, 3.5], [0, -a, 0]);
  }
  b.ring("foam", [-2, 0.25, 0], 10.3, 0.35);

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
      b.box("gold", [7.96, 23.5, gz], [0.16, 2.6, 0.35], [0, tilt, 0]);
      b.box("gold", [7.96, 23.5, gz], [0.16, 0.35, 2.6], [0, tilt, 0]);
      for (const [dy, dz] of [[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]]) {
        b.sphere("gold", [7.88, 23.5 + dy, gz + dz], 0.36);
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
      // An oasis and half-buried sandstone remains interrupt the desert.
      b.sphere("turquoise", [-28, 0.14, -32], 1, [7.2, 0.15, 5.8]);
      b.ring("sandLight", [-28, 0.16, -32], 5.7, 0.3);
      for (let i = 0; i < 4; i++) {
        b.cylinder("sandstone", [-32 + i * 2.6, 1.9 + i % 2, 35], 0.45, 0.6, 3.8 + i % 2 * 2, 7);
        b.box("sandLight", [-32 + i * 2.6, 3.9 + i % 2 * 2, 35], [1.4, 0.4, 1.2]);
      }
      b.box("sandstone", [-29, 5.9, 35], [6, 0.55, 1.1], [0, 0, 0.04]);
      if (!lowPower) {
        // Palmiers de l'oasis, tente nomade et Ponéglyphe dégagé devant les ruines.
        for (const [px, pz] of [[-22.5, -28], [-33.5, -36]]) {
          b.cylinder("wood", [px, 1.9, pz], 0.16, 0.24, 3.8, 7);
          b.sphere("leaf", [px, 4.0, pz], 1.4, [1.2, 0.45, 1.2]);
        }
        b.roof("coral", [-23, 0.2, -21], 3.8, 3.2, 1.8);
        b.box("dark", [-28.1, 1.0, 32.8], [1.4, 2.0, 1.4]);
        b.box("gold", [-27.38, 1.1, 32.8], [0.06, 1.3, 0.9]);
      }
    }
  }
  if (zone === 1) {
    const x = side * 22;
    b.box("water", [x, 0.13, 0], [3.5, 0.12, 132]);
    for (const offset of [-2.1, 2.1]) b.box("cream", [x + offset, 0.2, 0], [0.45, 0.3, 132]);
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
        venetianHouse(b, -34 - (i % 2) * 2, 0.4, -43 + i * 29, 4.5, 5.5 + i % 2 * 2.4, colors[i % 3], lowPower);
      }
      // Sea-train railway hugs the far bank on timber piles.
      for (const rx of [-43, -41.2]) b.box("dark", [rx, 1.2, 1], [0.14, 0.16, 116]);
      for (let i = 0; i < (lowPower ? 8 : 15); i++) {
        const z = -54 + i * (lowPower ? 15 : 8);
        b.box("wood", [-42.1, 0.95, z], [3.4, 0.2, 0.6]);
        if (i % 2 === 0) b.cylinder("wood", [-42.1, 0.2, z], 0.3, 0.4, 1.7, 6);
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
          for (const x of [-40, -32]) b.cylinder("cream", [x, 3.5, z], 0.4, 0.6, 6, 8);
          b.box("cream", [-36, 6.5, z], [9.5, 0.6, 1.3]);
          b.roof("gold", [-36, 6.8, z], 10, 2.4, 1.2);
          b.sphere("lamp", [-36, 5.8, z], 0.38);
        }
        // Arbres-nuages célestes et petit Waver posé sur la route blanche.
        for (const [cx, cz] of [[-24, -40], [-25, 14]]) {
          b.cylinder("cream", [cx, 1.7, cz], 0.2, 0.3, 3.2, 7);
          b.sphere("cloud", [cx, 3.7, cz], 1.5, [1.2, 0.6, 1.1]);
        }
        b.sphere("cream", [-26.5, 2.85, -4], 0.7, [0.7, 0.35, 1.8]);
        b.box("turquoise", [-26.5, 4.05, -4], [0.1, 1.7, 1.4]);
      }
    }
  }
  if (zone === 3) {
    // Rice paddies are actual recessed colored plots with earthen banks.
    for (let i = 0; i < (lowPower ? 3 : 5); i++) {
      if (side < 0 && i === 2) continue;
      const z = -52 + i * 25;
      b.box("leafLight", [side * 32, 0.2, z], [17, 0.12, 13]);
      for (const offset of [-7, 7]) b.box("sandLight", [side * 32, 0.32, z + offset], [18, 0.28, 0.65]);
      for (const offset of [-9, 9]) b.box("sandLight", [side * 32 + offset, 0.32, z], [0.65, 0.28, 14]);
      if (!lowPower) {
        for (let row = 0; row < 5; row++) b.box("leaf", [side * 32 - 6 + row * 3, 0.35, z], [0.22, 0.3, 11]);
        if (i % 2 === 0) {
          b.cylinder("wood", [side * 30, 1.0, z], 0.08, 0.1, 1.8, 6);
          b.cylinder("sandLight", [side * 30, 1.95, z], 0.1, 0.75, 0.45, 8);
        }
      }
    }
    if (side < 0) {
      cherryTree(b, -28, 0.2, -14.5, 4.8, lowPower);
      cherryTree(b, -34, 0.2, 33, 5.3, lowPower);
      b.box("wood", [-29, 2.1, 4], [6.7, 4.2, 5]);
      b.roof("jadeRoof", [-29, 4.2, 4], 8.1, 6.4, 1.8);
      for (const z of [2.4, 4, 5.6]) b.box("lamp", [-32.4, 2.3, z], [0.09, 1.5, 0.6]);
      if (!lowPower) {
        for (const [px, pz] of [[-28, -14.5], [-34, 33]]) {
          b.sphere("blossomLight", [px, 0.22, pz], 3.1, [1.2, 0.06, 1.1]);
        }
        b.cylinder("rock", [-24, 0.9, 4], 0.22, 0.3, 1.6, 6);
        b.box("lamp", [-24, 1.95, 4], [0.5, 0.55, 0.5]);
        b.box("rock", [-24, 2.35, 4], [0.76, 0.24, 0.76]);
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
    // Egghead : plateformes futuristes, bordures lumineuses cyan et modules de la Fabriophase.
    const x = side * 23;
    b.box("castle", [x, 0.16, 0], [3.2, 0.18, 128]);
    b.box("neonCyan", [x - side * 1.62, 0.26, 0], [0.16, 0.12, 128]);
    for (let i = 0; i < (lowPower ? 3 : 5); i++) {
      const z = -50 + i * 25;
      b.cylinder("metal", [side * 28, 1.4, z], 0.4, 0.5, 2.8, 8);
      b.ring("neonCyan", [side * 28, 3.0, z], 0.9, 0.11);
    }
    if (side < 0) {
      for (const z of [-38, 12]) {
        b.cylinder("castle", [-33, 1.8, z], 3.4, 3.8, 3.6, 12);
        b.dome("snow", [-33, 3.6, z], 3.4, [1, 0.78, 1]);
        b.ring("neonCyan", [-33, 3.6, z], 3.5, 0.14);
      }
      const conduit: Point[] = [[-39.5, 1.1, -55], [-38, 2.4, -15], [-39.5, 1.8, 30], [-37, 1.2, 56]];
      b.curve("neonCyan", conduit, 0.25, 24);
      for (const [cx, cy, cz] of conduit) {
        b.cylinder("metal", [cx, cy / 2, cz], 0.25, 0.34, cy, 8);
      }
      if (!lowPower) {
        // Mini véhicule Vega-Tank posé sur ses chenilles sur la passerelle.
        b.box("dark", [-23, 0.42, -14], [2.1, 0.34, 3.2]);
        b.box("metal", [-23, 0.88, -14], [1.9, 0.65, 3.0]);
        b.sphere("vermilion", [-23, 1.38, -14], 0.75, [0.9, 0.7, 1.1]);
        b.box("neonCyan", [-23, 1.4, -14.78], [0.95, 0.22, 0.16]);
      }
    }
  }
  if (zone === 6) {
    // Elbaf : reliefs rocheux nordiques, pierres runiques et village viking sur le rivage ouest.
    for (let i = 0; i < (lowPower ? 3 : 5); i++) {
      const x = side * (26 + (i % 2) * 8), z = -52 + i * 25;
      b.cylinder(i % 2 ? "rock" : "rockLight", [x, 0.9 + (i % 2) * 0.5, z], 2.2, 3.6, 1.8 + (i % 2), 7);
    }
    if (side < 0) {
      for (const z of [-36, 18]) {
        b.box("wood", [-33, 1.6, z], [6.5, 3.2, 8.2]);
        b.roof("dark", [-33, 3.2, z], 8.2, 9.6, 3.1);
        b.box("lamp", [-29.7, 1.7, z], [0.12, 0.8, 1.4]);
        if (!lowPower) {
          b.cylinder("wood", [-28.5, 0.6, z - 2.5], 0.55, 0.55, 1.2, 8);
          b.cylinder("wood", [-28.5, 0.6, z + 2.5], 0.55, 0.55, 1.2, 8);
        }
      }
      for (const z of [-12, 42]) {
        b.cylinder("rock", [-26, 2.2, z], 0.7, 1.2, 4.4, 6);
        b.box("gold", [-25.35, 2.4, z], [0.08, 2.2, 0.3]);
      }
      if (!lowPower) {
        // Drakkar viking complet amarré au bord du village d'Elbaf.
        b.sphere("wood", [-37, 0.85, -8], 1.5, [1.1, 0.55, 3.1]);
        b.cylinder("wood", [-37, 3.2, -8], 0.12, 0.16, 4.5, 8);
        b.cylinder("wood", [-37, 4.55, -7.8], 0.08, 0.08, 3.1, 6, [0, 0, Math.PI / 2]);
        b.box("vermilion", [-37, 3.5, -7.8], [2.8, 2.0, 0.12]);
        b.cylinder("gold", [-37, 1.7, -3.5], 0.1, 0.36, 1.4, 6, [0.45, 0, 0]);
      }
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
