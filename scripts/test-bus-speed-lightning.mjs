import assert from "node:assert/strict";
import { build } from "esbuild";

const { outputFiles } = await build({
  stdin: {
    contents: 'export * from "./src/lib/bus-speed-lightning";',
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const {
  SPEED_LIGHTNING_THRESHOLD,
  SPEED_LIGHTNING_PALETTES,
  buildRibbonIndices,
  buildRibbonStrip,
  createBoltPath,
  getLightningZones,
  getSpeedLightningIntensity,
  mulberry32,
  pickBoltAnchor,
} = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);

// --- Seuil x2 ---
assert.equal(SPEED_LIGHTNING_THRESHOLD, 2.0);
assert.equal(getSpeedLightningIntensity(0.3), 0);
assert.equal(getSpeedLightningIntensity(1), 0);
assert.equal(getSpeedLightningIntensity(1.5), 0);
assert.equal(getSpeedLightningIntensity(Number.NaN), 0);
const at2 = getSpeedLightningIntensity(2);
const at25 = getSpeedLightningIntensity(2.5);
const at3 = getSpeedLightningIntensity(3);
assert(at2 > 0.4 && at2 < 0.7, `x2 visible mais pas max (${at2})`);
assert(at25 > at2 && at25 < at3, "intensité croissante 2 -> 2.5 -> 3");
assert.equal(at3, 1);
assert.equal(getSpeedLightningIntensity(4), 1, "plafonné à 1 au-delà de x3");

// --- RNG déterministe ---
const rngA = mulberry32(42);
const rngB = mulberry32(42);
for (let i = 0; i < 10; i++) assert.equal(rngA(), rngB(), "mulberry32 reproductible");

// --- Ancres bornées sur la coque ---
const zones = getLightningZones(2.08, 5.65);
assert.equal(zones.frontZ, -5.3);
assert(zones.midZ > -3.8 && zones.midZ <= 4.85, `midZ borné (${zones.midZ})`);
assert(zones.rearZ > zones.midZ, "rearZ après midZ");
const rng = mulberry32(7);
for (let i = 0; i < 200; i++) {
  const { anchor, outward } = pickBoltAnchor(rng, zones.frontZ, zones.midZ, zones.rearZ);
  assert(Math.abs(anchor[0]) <= 1.6, `ancre x bornée (${anchor[0]})`);
  assert(anchor[1] >= 0.6 && anchor[1] <= 3.7, `ancre y bornée (${anchor[1]})`);
  assert(anchor[2] >= -6.3 && anchor[2] <= 6.0, `ancre z bornée (${anchor[2]})`);
  assert(Math.hypot(...outward) > 0.5, "direction extérieure non nulle");
}

// --- Tracés dentelés ---
const rng2 = mulberry32(99);
let branchCount = 0;
for (let i = 0; i < 100; i++) {
  const { anchor, outward } = pickBoltAnchor(rng2, zones.frontZ, zones.midZ, zones.rearZ);
  const path = createBoltPath(rng2, anchor, outward, 8, 2.2);
  assert.equal(path.points.length, 9, "segments + 1 points");
  assert.deepEqual(path.points[0], anchor, "le tracé démarre sur la coque");
  assert(path.paletteIndex === 0 || path.paletteIndex === 1, "palette valide");
  const first = path.points[0];
  const last = path.points[path.points.length - 1];
  const dist = Math.hypot(last[0] - first[0], last[1] - first[1], last[2] - first[2]);
  assert(dist > 0.8, `le tracé s'éloigne de la coque (${dist})`);
  // Dentelé : au moins un changement de direction marqué (style manga).
  let maxTurn = 0;
  for (let s = 1; s < path.points.length - 1; s++) {
    const a = path.points[s];
    const b = path.points[s - 1];
    const c = path.points[s + 1];
    const v1 = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const v2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const dot = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2])
      / (Math.hypot(...v1) * Math.hypot(...v2) || 1);
    maxTurn = Math.max(maxTurn, 1 - dot);
  }
  assert(maxTurn > 0.05, "tracé dentelé (pas une ligne droite)");
  if (path.branch) {
    branchCount++;
    assert.equal(path.branch.length, 4, "fourche de 3 segments");
    assert(
      path.points.some((p) => p[0] === path.branch[0][0] && p[1] === path.branch[0][1] && p[2] === path.branch[0][2]),
      "la fourche démarre sur le tracé principal",
    );
  }
}
assert(branchCount > 10 && branchCount < 90, `fourches occasionnelles (${branchCount}/100)`);

// --- Ruban face caméra, largeur effilée ---
const strip = buildRibbonStrip([[0, 1, 0], [0.5, 1.2, 0.5], [1, 1.4, 1]], 0.2, 0.04, [0, 2, -10]);
assert.equal(strip.length, 3 * 2 * 3, "2 sommets × 3 composantes par point");
const widthAt = (i) => Math.hypot(strip[i * 6] - strip[i * 6 + 3], strip[i * 6 + 1] - strip[i * 6 + 4], strip[i * 6 + 2] - strip[i * 6 + 5]);
assert(widthAt(0) > widthAt(2), "largeur effilée de la base à la pointe");
assert(Math.abs(widthAt(0) - 0.2) < 1e-9, "largeur de base respectée");
assert(Math.abs(widthAt(2) - 0.04) < 1e-9, "largeur de pointe respectée");
// Le ruban est perpendiculaire à la vue : milieu du segment = point du tracé.
const mid = [(strip[0] + strip[3]) / 2, (strip[1] + strip[4]) / 2, (strip[2] + strip[5]) / 2];
assert(Math.abs(mid[0]) < 1e-9 && Math.abs(mid[1] - 1) < 1e-9 && Math.abs(mid[2]) < 1e-9, "milieu = point du tracé");

// --- Indices du ruban ---
const indices = buildRibbonIndices(9, 0);
assert.equal(indices.length, 8 * 6, "8 quads = 16 triangles");
assert.equal(Math.max(...indices), 17, "dernier sommet = 2×9-1");
const offsetIndices = buildRibbonIndices(4, 18);
assert.equal(Math.min(...offsetIndices), 18, "décalage de sommet respecté");

// --- Palettes : violet électrique + bleu royal ---
assert.equal(SPEED_LIGHTNING_PALETTES.length, 2);
assert(SPEED_LIGHTNING_PALETTES[0].includes("#d946ef"), "violet électrique présent");
assert(SPEED_LIGHTNING_PALETTES[1].includes("#60a5fa"), "bleu royal présent");

console.log("bus-speed-lightning: OK");
