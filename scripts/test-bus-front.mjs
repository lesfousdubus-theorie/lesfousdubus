import assert from "node:assert/strict";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/lib/bus-front-geometry.ts"],
  bundle: true,
  format: "esm",
  platform: "neutral",
  write: false,
  logLevel: "silent",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`;
const {
  FRONT_BADGE_CENTER_Y, FRONT_BADGE_RADIUS, FRONT_GRILLE_CENTER_Y,
  FRONT_GRILLE_HEIGHT, FRONT_GRILLE_SLAT_HEIGHT, FRONT_GRILLE_SLAT_YS,
} = await import(moduleUrl);

const badgeBottom = FRONT_BADGE_CENTER_Y - FRONT_BADGE_RADIUS;
const grilleBottom = FRONT_GRILLE_CENTER_Y - FRONT_GRILLE_HEIGHT / 2;
const grilleTop = FRONT_GRILLE_CENTER_Y + FRONT_GRILLE_HEIGHT / 2;
assert(badgeBottom - grilleTop >= 0.04,
  "The grille must leave a visible gap below the Mont Corvo badge.");
for (const y of FRONT_GRILLE_SLAT_YS) {
  assert(y - FRONT_GRILLE_SLAT_HEIGHT / 2 >= grilleBottom,
    "A grille slat extends below its backing panel.");
  assert(y + FRONT_GRILLE_SLAT_HEIGHT / 2 <= grilleTop,
    "A grille slat extends into the badge clearance.");
}

console.log("Bus front geometry checks passed.");
