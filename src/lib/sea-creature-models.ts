import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

type Point = [number, number, number];
type Paint = string | ((x: number, y: number, z: number) => string);
type Outline = [number, number][];
type Joint = { group: THREE.Group; axis: "x" | "y" | "z"; amplitude: number; offset: number };

export type SeaCreatureMotion = "breach" | "surface" | "rise";
export interface SeaCreatureModel {
  group: THREE.Group;
  joints: Joint[];
  motion: SeaCreatureMotion;
  scale: number;
}

const WHITE = "#fff1ce";
const BLACK = "#151329";
const COLORS = new Map<string, THREE.Color>();

function colorFor(hex: string) {
  let color = COLORS.get(hex);
  if (!color) {
    color = new THREE.Color(hex);
    COLORS.set(hex, color);
  }
  return color;
}

class Sculpture {
  private readonly geometry: THREE.BufferGeometry[] = [];
  private readonly matrix = new THREE.Matrix4();

  constructor(private readonly material: THREE.Material, private readonly detail: number) {}

  private add(geometry: THREE.BufferGeometry, paint: Paint, position: Point, size: Point = [1, 1, 1], rotation: Point = [0, 0, 0]) {
    const plain = geometry.index ? geometry.toNonIndexed() : geometry;
    if (geometry !== plain) geometry.dispose();
    plain.deleteAttribute("uv");
    const positions = plain.getAttribute("position");
    const colors = new Float32Array(positions.count * 3);
    const solid = typeof paint === "string" ? colorFor(paint) : null;
    for (let i = 0; i < positions.count; i += 3) {
      const color = solid ?? colorFor((paint as Exclude<Paint, string>)(
        (positions.getX(i) + positions.getX(i + 1) + positions.getX(i + 2)) / 3,
        (positions.getY(i) + positions.getY(i + 1) + positions.getY(i + 2)) / 3,
        (positions.getZ(i) + positions.getZ(i + 1) + positions.getZ(i + 2)) / 3,
      ));
      for (let j = i; j < i + 3; j++) color.toArray(colors, j * 3);
    }
    plain.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.matrix.compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...size));
    plain.applyMatrix4(this.matrix);
    this.geometry.push(plain);
  }

  oval(paint: Paint, position: Point, size: Point, rotation?: Point) {
    this.add(new THREE.SphereGeometry(1, this.detail, Math.max(6, this.detail / 2)), paint, position, size, rotation);
  }

  spike(paint: string, position: Point, radius: number, length: number, rotation?: Point) {
    this.add(new THREE.ConeGeometry(radius, length, 6), paint, position, undefined, rotation);
  }

  torus(paint: string, position: Point, radius: number, thickness: number, rotation?: Point) {
    this.add(new THREE.TorusGeometry(radius, thickness, 6, this.detail), paint, position, undefined, rotation);
  }

  blade(paint: string, position: Point, outline: Outline, thickness: number, roll = 0) {
    const shape = new THREE.Shape();
    shape.moveTo(...outline[0]);
    outline.slice(1).forEach(point => shape.lineTo(...point));
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
    geometry.translate(0, 0, -thickness / 2);
    this.add(geometry, paint, position, undefined, [0, -Math.PI / 2, roll]);
  }

  tube(paint: Paint, points: Point[], radius: number, tip: number) {
    const path = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    const steps = (points.length - 1) * 5;
    const sides = this.detail >= 16 ? 8 : 6;
    const geometry = new THREE.TubeGeometry(path, steps, 1, sides);
    const position = geometry.getAttribute("position");
    const center = new THREE.Vector3();
    for (let ring = 0; ring <= steps; ring++) {
      const t = ring / steps;
      path.getPointAt(t, center);
      const width = THREE.MathUtils.lerp(radius, tip, t);
      for (let edge = 0; edge <= sides; edge++) {
        const i = ring * (sides + 1) + edge;
        position.setXYZ(i, center.x + (position.getX(i) - center.x) * width,
          center.y + (position.getY(i) - center.y) * width,
          center.z + (position.getZ(i) - center.z) * width);
      }
    }
    geometry.computeVertexNormals();
    this.add(geometry, paint, [0, 0, 0]);
  }

  attach(group: THREE.Group) {
    const merged = mergeGeometries(this.geometry);
    this.geometry.forEach(geometry => geometry.dispose());
    group.add(new THREE.Mesh(merged, this.material));
  }
}

function eyes(b: Sculpture, x: number, y: number, z: number, radius: number, iris: string, brow?: string) {
  for (const side of [-1, 1]) {
    const roll = side * -0.18;
    if (brow) b.oval(brow, [side * x, y + radius * .55, z - .05], [radius * 1.28, radius * .53, radius * 1.12], [0, 0, roll]);
    b.oval(BLACK, [side * x, y, z], [radius * .98, radius * 1.08, radius * 1.02]);
    b.oval(WHITE, [side * (x + radius * .15), y, z + radius * .13], [radius * .91, radius, radius]);
    b.oval(iris, [side * (x + radius * .62), y - radius * .07, z + radius * .63], [radius * .52, radius * .69, radius * .52]);
    b.oval(BLACK, [side * (x + radius * .84), y - radius * .07, z + radius * .83], [radius * .29, radius * .51, radius * .30]);
    b.oval("#ffffff", [side * (x + radius * .90), y + radius * .11, z + radius * 1.01], [radius * .14, radius * .16, radius * .14]);
  }
}

function grin(b: Sculpture, width: number, y: number, z: number, tooth: number, count: number, sharp = true) {
  b.oval(BLACK, [0, y, z], [width * 1.10, tooth * 1.20, tooth * 1.52]);
  for (let i = 0; i < count; i++) {
    const across = 2 * i / (count - 1) - 1;
    const point: Point = [across * width * .92, y + tooth * (sharp ? .34 : .18), z + tooth * (1.24 - across * across)];
    if (sharp) b.spike(WHITE, point, width / (count + .6), tooth * 1.45, [0, 0, Math.PI]);
    else b.oval(WHITE, point, [width / count, tooth * .65, tooth * .64]);
  }
}

function mottled(base: string, mark: string, belly: string, frequency: number): Paint {
  return (x, y, z) => y < -.43 ? belly
    : Math.sin(x * frequency + z * 4.1) * Math.cos(z * frequency - y * 4.7)
      + Math.sin(y * frequency + x * 5.8) * .45 > .31 ? mark : base;
}

function joint(model: SeaCreatureModel, builder: Sculpture, position: Point, axis: Joint["axis"], amplitude: number, offset: number) {
  const group = new THREE.Group();
  group.position.set(...position);
  model.group.add(group);
  model.joints.push({ group, axis, amplitude, offset });
  builder.attach(group);
}

const TAIL: Outline = [[.12, 0], [-1.15, 1.15], [-2.45, 1.50], [-2.05, .48], [-1.60, 0], [-2.05, -.45], [-2.45, -1.44], [-1.13, -1.05]];

type Fish = {
  id: string; skin: Paint; lip: string; fin: string; eye: string; silhouette: "orca" | "puffer" | "mottled" | "blue" | "black" | "green";
  size: Point; scale: number; motion: SeaCreatureMotion;
};

const FISH: Fish[] = [
  { id: "orca", skin: mottled("#20202c", "#f2ebdc", "#f7edda", 4), lip: "#e2e8df", fin: "#50a39d", eye: "#c32f4e", silhouette: "orca", size: [1.48,1.55,3.42], scale: 3.25, motion: "breach" },
  { id: "puffer", skin: "#f6963e", lip: "#f7b861", fin: "#9c4c44", eye: "#4dccbd", silhouette: "puffer", size: [2.08,1.65,2.55], scale: 2.55, motion: "surface" },
  { id: "mottled-king", skin: mottled("#bea34b", "#664424", "#f3cc74", 8), lip: "#dfc46d", fin: "#b34139", eye: "#e56350", silhouette: "mottled", size: [2.45,1.78,3.8], scale: 3.65, motion: "rise" },
  { id: "blue-king", skin: mottled("#637fc4", "#403979", "#a9b4ef", 4), lip: "#8c9bd7", fin: "#963f58", eye: "#647dba", silhouette: "blue", size: [1.57,1.67,3.02], scale: 2.7, motion: "breach" },
  { id: "dark-king", skin: "#262440", lip: "#594565", fin: "#59496d", eye: "#e34353", silhouette: "black", size: [1.06,1.35,3.88], scale: 2.85, motion: "breach" },
  { id: "green-king", skin: mottled("#398466", "#1f5153", "#a9bf78", 6), lip: "#f5afa1", fin: "#297d79", eye: "#e8a257", silhouette: "green", size: [2.0,1.25,2.82], scale: 2.65, motion: "surface" },
];

function fish(model: SeaCreatureModel, make: () => Sculpture, spec: Fish) {
  const b = make();
  const [x, y, z] = spec.size;
  const round = spec.silhouette === "puffer";
  const flat = spec.silhouette === "orca" || spec.silhouette === "mottled";
  b.oval(spec.skin, [0, .12, -z * .31], spec.size);
  b.oval(spec.skin, [0, .45, z * .39], [x * .94, y * .83, z * .62]);
  b.oval(spec.lip, [0, -.33, z * .75], [x * .91, y * .51, z * .42]);
  eyes(b, x * .70, .58 + y * .36, z * .65, round ? .40 : .31, spec.eye, spec.silhouette === "black" ? "#bd913e" : undefined);
  grin(b, x * .78, -.43, z * 1.145, round ? .16 : .31, flat ? 10 : 8, spec.silhouette === "orca" || spec.silhouette === "black");
  if (round) {
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7 - .5) * Math.PI * 1.46 + row * .14;
        b.spike(spec.fin, [Math.sin(angle) * (x - .18), .45 + Math.cos(angle) * y, .7 - row * 1.44], .20, .57, [0, 0, -angle]);
      }
    }
  } else {
    b.blade(spec.fin,[0,y * .68,-.65],[[1.85,0],[.86,.95],[.21,1.62],[-.52,1.45],[-1.86,.1]],.29);
    b.blade(spec.fin,[0,y * .48,-2.43],[[.68,0],[.1,.66],[-.91,.27],[-1.39,0]],.16);
  }
  b.attach(model.group);

  const tail = make();
  tail.tube(spec.skin, [[0,0,.35],[0,.04,-.64],[0,.14,-1.88]], x * .49, .32);
  tail.blade(spec.fin, [0,.15,-1.61], TAIL, .21, spec.silhouette === "orca" ? Math.PI / 2 : 0);
  joint(model, tail, [0,.05,-z * 1.06], spec.silhouette === "orca" ? "x" : "y", .42, .17);
  for (const side of [-1,1]) {
    const paddle = make();
    paddle.oval(spec.fin, [side * .62,-.24,-.37], [.91,.22,.56], [0,side * .54,side * -.42]);
    joint(model, paddle, [side * x * .83,-.39,.16], "z", side * .35, 1.2);
  }
}

type Serpent = "lord" | "cobra" | "scarlet" | "spotted";
function serpent(model: SeaCreatureModel, make: () => Sculpture, kind: Serpent) {
  const lord = kind === "lord", cobra = kind === "cobra", scarlet = kind === "scarlet";
  const skin = lord ? "#635b3d" : cobra ? "#487833" : scarlet ? "#9b353f" : "#93b6ad";
  const fin = lord ? "#6fabcc" : cobra ? "#d0b446" : scarlet ? "#db6361" : "#648491";
  const neckPaint: Paint = (x,y,z) => kind === "spotted"
    ? (Math.sin(x * 9 + y * 6) * Math.cos(z * 7 - y * 4) > .60 ? "#365366" : skin)
    : Math.sin(y * 5 + z * 1.6) > .10 && (!lord || z > .7) ? fin : skin;
  const b = make();
  b.oval(skin,[0,.13,-1.85],[1.1,.90,2.68]);
  b.tube(neckPaint, [[0,-.24,-3.7],[.28,.22,-2.7],[.02,.69,-1.12],[0,1.95,-.18],[0,3.3,.18],[0,4.04,.90],[0,4.12,1.88]], lord ? .88 : .70, .63);
  if (lord || scarlet) {
    const outline: Outline = [[-2.3,0],[-1.8,1.04],[-1.4,.63],[-1.12,1.55],[-.62,1.00],[-.11,2.14],[.31,1.38],[.79,2.65],[1.0,1.65],[1.55,2.55],[1.42,0]];
    b.blade(fin,[0,.65,-1.05],outline,.16);
  }
  b.attach(model.group);

  const head = make();
  if (cobra) {
    head.oval("#d8dfbd",[0,.05,-.48],[1.83,1.30,.34]);
    head.oval("#173f3e",[0,.02,-.23],[1.68,1.19,.32]);
    for (const side of [-1,1]) for (let stripe = 0; stripe < 3; stripe++) {
      head.oval(stripe % 2 ? skin : fin,[side * (1.23 - stripe * .31),-.16,.02],[.22,.92 - stripe * .12,.14],[0,0,side * -.37]);
    }
  } else if (scarlet) {
    for (const side of [-1,1]) {
      head.oval("#5a2131",[side * .89,.2,-.20],[.72,.95,.48],[0,0,-side * .49]);
      head.spike(fin,[side * 1.22,.87,-.12],.34,1.53,[0,0,-side * .72]);
      head.oval(fin,[side * 1.14,-.23,.29],[.70,.24,.52],[0,0,side * -.30]);
    }
  }
  head.oval(skin,[0,.16,.32],[lord ? .83 : .66,.70,lord ? 1.39 : .92]);
  head.oval(lord ? "#83764a" : fin,[0,-.18,lord ? 1.28 : .78],[lord ? .69 : .65,.29,lord ? .88 : .48]);
  eyes(head,lord ? .56 : .53,.48,lord ? .87 : .54,lord ? .21 : .28,lord ? "#d32032" : cobra ? "#7765e1" : "#e8af48",lord ? "#5b4d30" : undefined);
  grin(head,lord ? .62 : .50,-.30,lord ? 1.88 : 1.13,.18,7,lord || scarlet);
  if (lord) for (const side of [-1,1]) head.tube(fin, [[side * .51,.62,.16],[side * .64,.88,-.16],[side * .61,1.09,-.36]], .14, .035);
  joint(model,head,[0,4.08,1.66],"y",cobra ? .29 : .17,.9);

  const tail = make();
  tail.tube(neckPaint, [[0,0,.15],[.15,.35,-1.25],[.78,.52,-2.57],[1.0,.85,-3.8]], .85, .12);
  tail.blade(fin,[1,.83,-3.63],[[.20,0],[-.79,1.25],[-1.55,.86],[-1.12,.21],[-1.29,-.53],[-.52,-.41]],.12);
  joint(model,tail,[0,.18,-3.95],"y",.45,2.3);
}

function momoo(model: SeaCreatureModel, make: () => Sculpture) {
  const b = make();
  const hide = mottled("#eff2df", "#236953", "#d5c8a5", 4.2);
  const scales: Paint = (x,y,z) => Math.sin(y * 8 + Math.sin(x * 9 + z * 7)) > .8 ? "#997856" : "#b69a76";
  b.oval(hide,[0,.05,-1.32],[1.84,1.77,3.12]);
  b.tube(scales, [[0,-.53,.67],[0,.11,1.17],[0,1.6,1.4],[0,2.7,1.58]], 1.02, .71);
  for (let i = 0; i < 5; i++) b.spike("#d5ceb0",[0,1.58 - i * .13,-.43 - i * .61],.23,.84,[Math.PI * -.12,0,0]);
  b.attach(model.group);

  const head = make();
  head.oval(hide,[0,.13,.20],[1.15,1.02,1.35]);
  head.oval("#efb590",[0,-.25,1.24],[.90,.55,.63]);
  head.torus("#e6b956",[0,-.43,1.77],.24,.055);
  eyes(head,.67,.48,.90,.32,"#494a35");
  for (const side of [-1,1]) {
    head.oval("#557761",[side * .92,.61,-.25],[.61,.26,.39],[0,0,side * .24]);
    head.tube("#efe1b0",[[side * .65,.80,-.19],[side * .95,1.27,-.1],[side * .94,1.67,-.06]],.22,.025);
    head.oval("#985f57",[side * .34,-.11,1.77],[.14,.10,.07]);
  }
  joint(model,head,[0,2.7,1.72],"y",.23,.3);

  const tail = make();
  tail.tube(hide,[[0,0,.45],[0,.25,-.83],[0,.65,-2.34]],.81,.25);
  tail.blade("#417d65",[0,.63,-2.12],TAIL,.19);
  joint(model,tail,[0,.17,-3.59],"y",.37,1.3);
  for (const side of [-1,1]) {
    const fin = make();
    fin.oval("#96a796",[side * .71,-.18,-.59],[1.03,.28,.57],[0,side * .65,side * -.48]);
    joint(model,fin,[side * 1.40,-.46,-.55],"z",side * .28,1.08);
  }
}

function beaked(model: SeaCreatureModel, make: () => Sculpture) {
  const pink = "#c57891", plume = "#f0d5d4", deep = "#803b67";
  const b = make();
  b.oval(deep,[0,.15,-1.52],[1.54,1.32,3.6]);
  b.tube(pink,[[0,-.48,-1.4],[0,.59,-.61],[0,2.2,-.54],[0,3.05,.05],[0,4.54,.43],[0,5.65,1.29]],.65,.44);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * .4;
      b.oval(plume,[Math.sin(a) * .49,1.3 + row * 1.49 + Math.cos(a) * .17,(row === 2 ? .55 : -.55) + Math.cos(a) * .39],[.48,.30,.49]);
    }
  }
  b.blade("#8e617e",[0,.85,-2.64],[[1.3,0],[.45,.92],[-.51,1.26],[-1.64,0]],.18);
  b.attach(model.group);

  const head = make();
  head.oval(deep,[0,.03,.37],[.75,.60,.82]);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    head.oval(plume,[Math.sin(a) * .50,.56 + Math.cos(a) * .16,-.10 + Math.cos(a) * .48],[.44,.40,.47]);
  }
  head.tube("#edb14c",[[0,.05,.86],[0,-.09,1.41],[0,-.39,1.92],[0,-.70,2.12]],.35,.06);
  eyes(head,.49,.23,.67,.24,"#b1567a");
  joint(model,head,[0,5.58,1.33],"y",.24,.7);
}

function surume(model: SeaCreatureModel, make: () => Sculpture) {
  const ochre = "#c8914e", shadow = "#896147", inner = "#427f91";
  const b = make();
  b.oval(mottled(ochre, "#ab7742", shadow, 7),[0,.22,-.35],[2.16,1.28,2.83]);
  b.oval(ochre,[0,.40,1.52],[1.66,1.23,1.32]);
  b.oval("#e6aa61",[0,-.06,2.52],[.74,.58,.63]);
  eyes(b,.91,1.15,1.94,.37,"#886240",shadow);
  grin(b,1.12,-.43,2.43,.26,9,false);
  b.attach(model.group);

  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8;
    const stretch = i % 2 ? 3.02 : 3.85;
    const arm = make();
    arm.tube((x,y,z) => y < .0 && Math.cos(x * 2 + z * .3) > 0 ? inner : ochre,
      [[0,0,0],[0,.2,1.18],[.17,.48,2.35],[.39,1.07,stretch],[.55,1.65,stretch + .14],[.62,1.78,stretch - .50]],.57,.035);
    for (let cup = 0; cup < 5; cup++) {
      arm.torus("#70a6ae",[cup * .077,.04 + cup * .14,.74 + cup * .57],.195 - cup * .021,.041,[Math.PI / 2 + .22,0,0]);
    }
    joint(model,arm,[Math.sin(a) * 1.43,-.34,Math.cos(a) * 1.52],"x",.27,i * .63);
    model.joints[model.joints.length - 1].group.rotation.y = a;
  }
}

export function createSeaCreatures(material: THREE.Material, lowPower: boolean): SeaCreatureModel[] {
  const make = () => new Sculpture(material, lowPower ? 10 : 16);
  const build = (name: string, motion: SeaCreatureMotion, scale: number, sculpt: (model: SeaCreatureModel) => void) => {
    const model: SeaCreatureModel = { group: new THREE.Group(), joints: [], motion, scale };
    model.group.name = `sea-creature-${name}`;
    model.group.visible = false;
    sculpt(model);
    return model;
  };
  return [
    build("lord-of-the-coast", "breach", 2.97, model => serpent(model,make,"lord")),
    build("momoo", "surface", 3.18, model => momoo(model,make)),
    build("surume", "rise", 3.15, model => surume(model,make)),
    build("orca", "breach", FISH[0].scale, model => fish(model,make,FISH[0])),
    build("spotted-serpent", "surface", 2.42, model => serpent(model,make,"spotted")),
    build("cobra", "rise", 2.56, model => serpent(model,make,"cobra")),
    build("feathered-king", "surface", 2.40, model => beaked(model,make)),
    build("puffer", "breach", FISH[1].scale, model => fish(model,make,FISH[1])),
    build("scarlet-serpent", "breach", 2.68, model => serpent(model,make,"scarlet")),
    ...FISH.slice(2).map(spec => build(spec.id,spec.motion,spec.scale,model => fish(model,make,spec))),
  ];
}
