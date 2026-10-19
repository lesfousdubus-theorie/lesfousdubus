import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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
};

export interface SceneryBatch {
  material: THREE.MeshStandardMaterial;
  geometry: THREE.BufferGeometry;
}

class Builder {
  private pieces = new Map<MaterialKey, THREE.BufferGeometry[]>();

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
    const group = this.pieces.get(material) ?? [];
    group.push(plain);
    this.pieces.set(material, group);
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
    return Array.from(this.pieces, ([key, pieces]) => {
      const geometry = mergeGeometries(pieces, false)!;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      pieces.forEach((piece) => piece.dispose());
      return { material: SCENERY_MATERIALS[key], geometry };
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
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.55 + i * Math.PI / 6;
      const x = Math.cos(a) * 11.6 + 0.5, z = Math.sin(a) * 11.6;
      b.box(i % 2 ? "cream" : "peach", [x, 10.0, z], [2.7, 1.8 + i % 2, 2.5]);
      b.box("sandLight", [x, 11.0 + (i % 2) * 0.5, z], [3, 0.2, 2.8]);
    }
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      b.box("cream", [Math.cos(a) * 13.1, 10, Math.sin(a) * 13.1], [0.7, 0.85, 0.7]);
    }
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
  // Dock and a long, dark gondola / Yagara boat at the foot of the city.
  b.box("wood", [-16.8, 0.65, 7], [4.6, 0.22, 3.0]);
  b.sphere("dark", [-18, 0.8, 11], 1, [0.85, 0.38, 3]);
  b.sphere("wood", [-18, 1.0, 11], 1, [0.65, 0.14, 2.5]);
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
    }
  }
}

const BUILDERS = [alabasta, waterSeven, skypiea, wano, drum];
export const SET_PIECE_OFFSET_X = 33;

/** Geometry is local to an island; every authored vertex stays clear of the road. */
export function createOnePieceScenery(zone: number, lowPower = false): SceneryBatch[] {
  const builder = new Builder();
  BUILDERS[Math.max(0, Math.min(4, zone))](builder, lowPower);
  return builder.finish();
}

function dune(b: Builder, x: number, z: number, scale: Point, light = false) {
  b.sphere(light ? "sandLight" : "sandstone", [x, 0.15, z], 1, scale);
  b.curve("sandLight", [[x - scale[0] * 0.65, 0.3, z + scale[2] * 0.3], [x, scale[1] * 0.95, z], [x + scale[0] * 0.8, 0.25, z - scale[2] * 0.2]], 0.12, 10);
}

/** Low, authored terrain details retain the route's open sightlines. */
export function createOnePieceForeground(zone: number, side: number, lowPower = false): SceneryBatch[] {
  const b = new Builder();
  if (zone === 0) {
    for (let i = 0; i < (lowPower ? 3 : 6); i++) {
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
          b.roof("gold", [-36, 6.9, z], 10, 2.4, 1.2);
        }
      }
    }
  }
  if (zone === 3) {
    // Rice paddies are actual recessed colored plots with earthen banks.
    for (let i = 0; i < (lowPower ? 3 : 5); i++) {
      const z = -52 + i * 25;
      b.box("leafLight", [side * 32, 0.2, z], [17, 0.12, 13]);
      for (const offset of [-7, 7]) b.box("sandLight", [side * 32, 0.32, z + offset], [18, 0.28, 0.65]);
      for (const offset of [-9, 9]) b.box("sandLight", [side * 32 + offset, 0.32, z], [0.65, 0.28, 14]);
      if (!lowPower) for (let row = 0; row < 5; row++) b.box("leaf", [side * 32 - 6 + row * 3, 0.35, z], [0.22, 0.3, 11]);
    }
    if (side < 0) {
      cherryTree(b, -28, 0.2, -24, 4.8, lowPower);
      cherryTree(b, -34, 0.2, 33, 5.3, lowPower);
      b.box("wood", [-29, 2.1, 4], [6.7, 4.2, 5]);
      b.roof("jadeRoof", [-29, 4.3, 4], 8.1, 6.4, 1.8);
      for (const z of [2.4, 4, 5.6]) b.box("lamp", [-32.4, 2.3, z], [0.09, 1.5, 0.6]);
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
    }
  }
  return b.finish();
}
