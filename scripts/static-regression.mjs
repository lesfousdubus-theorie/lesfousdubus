import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

const busTv = read("src/components/bus/BusTv.tsx");
const bus = read("src/components/bus/Bus.tsx");
const experience = read("src/components/BusExperience.tsx");
const theory = read("src/components/TheoryModal.tsx");
const syncedVideo = read("src/components/SyncedTheoryVideo.tsx");
const scene = read("src/components/bus/Scene.tsx");
const css = read("src/app/globals.css");
const api = read("src/app/api/bus-entries/route.ts");

assert.equal((busTv.match(/new YT\.Player/g) ?? []).length, 1, "The bus must have exactly one YouTube player.");
assert.match(bus, /<BusTvPlayer[\s\S]*pos=\{activeTvPosition\}/, "The single player must follow the active TV.");
assert.match(bus, /<BusTvFrame/g, "Secondary TV frames must remain lightweight.");
assert.doesNotMatch(bus, /tvIframeRefs|primaryIframeRef|sendYoutubeCommand/, "Legacy multi-iframe synchronization must stay removed.");
assert.doesNotMatch(busTv, /unloadModule|cc_load_policy/, "Captions must not be forcibly removed from the standard YouTube player.");
assert.match(busTv, /playVideo\(\);[\s\S]*setTimeout/, "The player must warm up on initial load.");
assert.match(experience, /bus-tv-user-play/, "Entering the bus must trigger playback from the user gesture.");
assert.ok(
  experience.indexOf('window.dispatchEvent(new Event("bus-tv-user-play"))') < experience.indexOf('fetchJson<BusApiState & {', experience.indexOf("const enterBus")),
  "Playback must be requested before the registration request.",
);
assert.match(theory, /<SyncedTheoryVideo\s*\/>/, "The theory modal must use the synchronized player.");
assert.doesNotMatch(theory, /modestbranding|cc_load_policy/, "Deprecated/forced YouTube parameters must stay removed.");
assert.match(syncedVideo, /min-h-\[200px\]/, "The modal player must meet YouTube's mobile minimum height.");
assert.match(scene, /fps=\{lowPower \|\| reducedMotion \? 30 : 60\}/, "Frame pacing must stay aligned to 60/30 Hz.");
assert.match(scene, /webglcontextlost/, "WebGL context loss must be handled.");
assert.match(css, /safe-area-inset-bottom/, "HUD must respect device safe areas.");
assert.match(css, /orientation: landscape/, "Compact mobile landscape layout must remain covered.");
assert.match(css, /\.no-scrollbar/, "Horizontal tab bars need a real scrollbar utility.");
assert.doesNotMatch(css, /#tv-frame:fullscreen/, "Obsolete fullscreen CSS must stay removed.");
assert.doesNotMatch(experience, /animate-in\s+fade-in/, "Unsupported animation utility classes must stay removed.");
assert.match(api, /scopedIdentity/, "Rate limiting must isolate visitors sharing one IP.");
assert.match(api, /visitorId,\s*\n\s*\);/, "Visitor identity must participate in write rate limiting.");

console.log("Static regression checks passed.");
