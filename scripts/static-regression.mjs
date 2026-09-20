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
assert.match(busTv, /cc_load_policy:\s*0/, "The bus TV must request captions off by default.");
assert.match(busTv, /playVideo\(\);[\s\S]*setTimeout/, "The player must warm up on initial load.");
assert.match(experience, /bus-tv-user-play/, "Entering the bus must trigger playback from the user gesture.");
assert.match(experience, /hasEntered && phase === "outside"/, "The exterior TV toggle must remain available after the first ride.");
assert.match(experience, /Allumer la TV/, "The exterior TV control must be able to turn the TV back on.");
assert.ok(
  experience.indexOf('window.dispatchEvent(new Event("bus-tv-user-play"))') < experience.indexOf('fetchJson<BusApiState & {', experience.indexOf("const enterBus")),
  "Playback must be requested before the registration request.",
);
assert.match(theory, /<SyncedTheoryVideo\s*\/>/, "The theory modal must keep its dedicated video player.");
assert.doesNotMatch(theory, /modestbranding|cc_load_policy/, "Deprecated/forced YouTube parameters must stay removed.");
assert.match(syncedVideo, /min-h-\[200px\]/, "The modal player must meet YouTube's mobile minimum height.");
assert.doesNotMatch(syncedVideo, /getBusVideoSnapshot|requestBusVideoSeek/, "The modal video must stay independent from the bus TV timeline.");
assert.match(syncedVideo, /seekTo\(0, true\)/, "The modal video must start from the beginning.");
assert.match(syncedVideo, /cc_load_policy:\s*0/, "The modal video must request captions off by default.");
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
