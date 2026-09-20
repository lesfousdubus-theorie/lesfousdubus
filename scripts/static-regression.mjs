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
const cameraRig = read("src/components/bus/CameraRig.tsx");
const css = read("src/app/globals.css");
const api = read("src/app/api/bus-entries/route.ts");
const passengers = read("src/components/bus/Passengers.tsx");
const world = read("src/components/bus/World.tsx");
const weather = read("src/components/bus/Weather.tsx");
const youtubeLoader = read("src/lib/youtube-player.ts");

assert.equal((busTv.match(/new YT\.Player/g) ?? []).length, 1, "The bus must have exactly one YouTube player.");
assert.match(bus, /<BusTvPlayer[\s\S]*pos=\{activeTvPosition\}/, "The single player must follow the active TV.");
assert.match(bus, /<BusTvFrame/g, "Secondary TV frames must remain lightweight.");
assert.doesNotMatch(bus, /!reducedMotion && rainStrength/, "Rain must keep the windshield wipers animated even with reduced-motion enabled.");
assert.doesNotMatch(bus, /tvIframeRefs|primaryIframeRef|sendYoutubeCommand/, "Legacy multi-iframe synchronization must stay removed.");
assert.match(busTv, /cc_load_policy:\s*0/, "The bus TV must request captions off by default.");
assert.match(busTv, /playVideo\(\);[\s\S]*setTimeout/, "The player must warm up on initial load.");
assert.match(busTv, /data-tv-wheel-capture[\s\S]*bus-zoom/, "Mouse-wheel zoom must keep working over the TV surface.");
assert.match(busTv, /requestFullscreen/, "The TV overlay must preserve fullscreen interaction.");
assert.doesNotMatch(busTv, /bus-video-state|bus-video-seek/, "Obsolete synchronized-video state must stay removed.");
assert.match(experience, /bus-tv-user-play/, "Entering the bus must trigger playback from the user gesture.");
assert.match(experience, /hasEntered && phase === "outside"/, "The exterior TV toggle must remain available after the first ride.");
assert.match(experience, /Allumer la TV/, "The exterior TV control must be able to turn the TV back on.");
assert.ok(
  experience.indexOf('window.dispatchEvent(new Event("bus-tv-user-play"))') < experience.indexOf('fetchJson<BusApiState & {', experience.indexOf("const enterBus")),
  "Playback must be requested before the registration request.",
);
assert.match(theory, /<SyncedTheoryVideo\s*\/>/, "The theory modal must keep its dedicated video player.");
assert.doesNotMatch(theory, /Étape \{idx \+ 1\}/, "Theory cards must not display numbered step labels.");
assert.match(theory, /slice\(0, Math\.ceil[\s\S]*slice\(Math\.ceil/, "Desktop theory cards must use two independent sequential columns.");
assert.doesNotMatch(theory, /modestbranding|cc_load_policy/, "Deprecated/forced YouTube parameters must stay removed.");
assert.match(syncedVideo, /min-h-\[200px\]/, "The modal player must meet YouTube's mobile minimum height.");
assert.doesNotMatch(syncedVideo, /getBusVideoSnapshot|requestBusVideoSeek/, "The modal video must stay independent from the bus TV timeline.");
assert.match(syncedVideo, /autoplay:\s*0/, "The modal video must stay paused until the user presses play.");
assert.doesNotMatch(syncedVideo, /seekTo\(/, "The modal video must not seek or start itself during initialization.");
assert.match(syncedVideo, /cc_load_policy:\s*0/, "The modal video must request captions off by default.");
assert.match(scene, /frameloop=\{renderPaused \? "demand" : "always"\}/, "The active 3D scene must render at the display's native requestAnimationFrame cadence.");
assert.match(scene, /AdaptiveDpr/, "The scene must adapt pixel density instead of capping FPS.");
assert.match(scene, /renderPaused = hidden \|\| contextLost \|\| uiPaused/, "Covered modals must pause the hidden 3D render loop.");
assert.match(scene, /playbackSuspended = hidden \|\| contextLost/, "Pausing hidden 3D for UI must not implicitly destroy the TV playback state.");
assert.doesNotMatch(scene, /FrameScheduler|fps=\{/, "Artificial 30/60 FPS caps must stay removed.");
assert.match(cameraRig, /const transitionDt = Math\.min\(dt, 0\.05\)/, "Camera transitions must cap large frame deltas so animations cannot be skipped.");
assert.match(scene, /webglcontextlost/, "WebGL context loss must be handled.");
assert.match(css, /safe-area-inset-bottom/, "HUD must respect device safe areas.");
assert.match(css, /orientation: landscape/, "Compact mobile landscape layout must remain covered.");
assert.match(css, /theory-modal-in/, "The theory modal must use a supported CSS animation.");
assert.match(css, /\.no-scrollbar/, "Horizontal tab bars need a real scrollbar utility.");
assert.doesNotMatch(css, /#tv-frame:fullscreen/, "Obsolete fullscreen CSS must stay removed.");
assert.doesNotMatch(experience, /text-\[(?:8|9)px\]/, "Primary HUD text must not fall below 10px.");
assert.doesNotMatch(theory, /animate-in\s+fade-in/, "Unsupported theory modal animation utilities must stay removed.");
assert.match(api, /scopedIdentity/, "Rate limiting must isolate visitors sharing one IP.");
assert.match(api, /visitorId,\s*\n\s*\);/, "Visitor identity must participate in write rate limiting.");
assert.match(experience, /isValidVisitorId\(storedVisitorId\)/, "Corrupted stored visitor IDs must self-heal.");
assert.match(experience, /previousBodyOverflow[\s\S]*previousHtmlOverflow/, "Body and document overflow must restore independently.");


assert.match(passengers, /passengerCount <= BASE_ROWS \* 4/, "Row capacity must match the four logical passenger slots rendered per row.");
assert.doesNotMatch(passengers, /getSeatPositions/, "The obsolete camera-reserved seat helper must stay removed.");
assert.match(bus, /const frameDt = Math\.min\(dt, 0\.1\)/, "Bus animation must clamp long resume frames.");
assert.match(world, /const frameDt = Math\.min\(dt, 0\.1\)/, "World simulation must clamp long resume frames.");
assert.match(weather, /const frameDt = Math\.min\(dt, 0\.1\)/, "Weather simulation must clamp long resume frames.");
assert.match(youtubeLoader, /clearTimeout\(timeoutTimer\)/, "YouTube API timeout must be cleared after settling.");
assert.match(youtubeLoader, /script\.remove\(\)/, "A failed YouTube API script must be removable so a later attempt can retry.");
console.log("Static regression checks passed.");
