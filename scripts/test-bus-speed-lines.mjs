import assert from "node:assert/strict";
import { build } from "esbuild";

const { outputFiles } = await build({
  stdin: {
    contents: 'export * from "./src/lib/bus-speed-lines";',
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const {
  SPEED_LINES_THRESHOLD,
  SPEED_LINES_AXIS_Y,
  SPEED_LINES_WINDOW_SPAN,
  SPEED_LINES_PALETTES,
  createSpeedLineSeeds,
  getSpeedLineDirection,
  getSpeedLineFade,
  getSpeedLinePosition,
  getSpeedLinesIntensity,
  getSpeedLinesVanishingPoint,
  getSpeedLinesWindow,
  mulberry32,
} = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);

// --- Seuil x2 ---
assert.equal(SPEED_LINES_THRESHOLD, 2.0);
assert.equal(getSpeedLinesIntensity(0.3), 0);
assert.equal(getSpeedLinesIntensity(1), 0);
assert.equal(getSpeedLinesIntensity(1.5), 0);
assert.equal(getSpeedLinesIntensity(Number.NaN), 0);
const at2 = getSpeedLinesIntensity(2);
const at25 = getSpeedLinesIntensity(2.5);
const at3 = getSpeedLinesIntensity(3);
assert(at2 > 0.4 && at2 < 0.7, `x2 visible mais pas max (${at2})`);
assert(at25 > at2 && at25 < at3, "intensité croissante 2 -> 2.5 -> 3");
assert.equal(at3, 1);
assert.equal(getSpeedLinesIntensity(4), 1, "plafonné à 1 au-delà de x3");

// --- RNG déterministe ---
const rngA = mulberry32(42);
const rngB = mulberry32(42);
for (let i = 0; i < 10; i++) assert.equal(rngA(), rngB(), "mulberry32 reproductible");

// --- Graines bornées sur les flancs et le toit (jamais dessous) ---
const rng = mulberry32(7);
const seeds = createSpeedLineSeeds(rng, 160);
assert.equal(seeds.length, 160, "nombre de lignes respecté");
for (const seed of seeds) {
  assert(Math.sin(seed.angle) > -0.8, `pas de ligne sous la coque (sin=${Math.sin(seed.angle)})`);
  assert(seed.radius >= 1.8 && seed.radius <= 6.3, `rayon borné (${seed.radius})`);
  assert(seed.phase >= 0 && seed.phase < 1, "phase 0..1");
  assert(seed.length >= 0.8 && seed.length <= 4.3, `longueur bornée (${seed.length})`);
  assert(seed.width >= 0.012 && seed.width <= 0.028, `épaisseur fine bornée (${seed.width})`);
  assert(seed.speedFactor >= 0.7 && seed.speedFactor <= 1.5, "vitesse relative bornée");
  assert(seed.paletteIndex === 0 || seed.paletteIndex === 1, "palette valide");
}

// --- Fenêtre collée à la coque, qui suit la caméra ---
const FRONT_Z = -4.6;
const shortWindow = getSpeedLinesWindow(-12.5, FRONT_Z, 5.65);
assert.equal(shortWindow.span, SPEED_LINES_WINDOW_SPAN);
assert.equal(shortWindow.start, FRONT_Z - 1.2, "bus court : fenêtre dès le nez, pas dans le vide devant");
const longFront = getSpeedLinesWindow(-12.5, FRONT_Z, 200);
assert.equal(longFront.start, FRONT_Z - 1.2, "caméra devant : fenêtre au nez du bus");
const longMid = getSpeedLinesWindow(100, FRONT_Z, 200);
assert.equal(longMid.start, 92, "caméra au milieu : fenêtre autour de la caméra");
const longRear = getSpeedLinesWindow(300, FRONT_Z, 200);
assert.equal(longRear.start, 200.5 - SPEED_LINES_WINDOW_SPAN, "caméra derrière : fenêtre à l'arrière");
const window = longMid;
const vp = getSpeedLinesVanishingPoint(window.start);
assert.equal(vp[0], 0);
assert.equal(vp[1], SPEED_LINES_AXIS_Y);
assert(vp[2] < window.start, "point de fuite devant la fenêtre");

// --- Défilement vers l'arrière (+Z) et bouclage ---
// Graine loin du bord de fenêtre pour éviter le bouclage sur l'intervalle testé.
const seed = seeds.find((s) => s.phase < 0.5);
const p0 = getSpeedLinePosition(seed, window.start, window.span, 0, 1);
const p1 = getSpeedLinePosition(seed, window.start, window.span, 0.5, 1);
assert(p1.position[2] > p0.position[2], "les lignes défilent vers l'arrière (+Z)");
assert(p0.position[2] >= window.start && p0.position[2] <= window.start + window.span, "position dans la fenêtre");
assert(p0.progress >= 0 && p0.progress < 1, "progression 0..1");
// Bouclage : après un temps long, la position reste dans la fenêtre.
const pLong = getSpeedLinePosition(seed, window.start, window.span, 100, 1);
assert(pLong.position[2] >= window.start && pLong.position[2] <= window.start + window.span, "bouclage dans la fenêtre");
// Sur le cylindre autour de l'axe.
assert(Math.abs(Math.hypot(p0.position[0], (p0.position[1] - SPEED_LINES_AXIS_Y) / 0.82) - seed.radius) < 1e-9, "position sur le cylindre");

// --- Direction radiante depuis le point de fuite ---
const dir = getSpeedLineDirection(p0.position, vp);
assert(Math.abs(Math.hypot(...dir) - 1) < 1e-9, "direction normalisée");
assert(dir[2] > 0, "la ligne pointe vers l'arrière depuis le point de fuite");
const dot = dir[0] * (p0.position[0] - vp[0]) + dir[1] * (p0.position[1] - vp[1]) + dir[2] * (p0.position[2] - vp[2]);
assert(dot > 0, "direction alignée avec le rayon du point de fuite");

// --- Fondu aux bords ---
assert.equal(getSpeedLineFade(0), 0, "invisible au bord avant");
assert.equal(getSpeedLineFade(1), 0, "invisible au bord arrière");
assert.equal(getSpeedLineFade(0.5), 1, "pleine opacité au centre");
assert(getSpeedLineFade(0.06) > 0 && getSpeedLineFade(0.06) < 1, "fondu progressif");

// --- Palettes : violet électrique + bleu royal ---
assert.equal(SPEED_LINES_PALETTES.length, 2);
assert(SPEED_LINES_PALETTES[0].includes("#d946ef"), "violet électrique présent");
assert(SPEED_LINES_PALETTES[1].includes("#60a5fa"), "bleu royal présent");

console.log("bus-speed-lines: OK");
