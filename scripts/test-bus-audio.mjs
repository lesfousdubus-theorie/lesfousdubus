import assert from "node:assert/strict";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/lib/bus-audio.ts"], bundle: true, write: false,
  format: "esm", platform: "node", logLevel: "silent",
});
const { BUS_AUDIO_EVENTS, emitBusAudioEvent, onBusAudioEvent, getBusAudioOwner } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`,
);

// Every combination has exactly one owner; disabling a higher-priority source
// must return the channel to the next requested source, including silence.
for (let mask = 0; mask < 16; mask++) {
  const requests = {
    theoryVideoPlaying: Boolean(mask & 8), partyOn: Boolean(mask & 4),
    busVideoPlaying: Boolean(mask & 2), bgmPlaying: Boolean(mask & 1),
  };
  const expected = [
    [requests.theoryVideoPlaying, "theory"], [requests.partyOn, "party"],
    [requests.busVideoPlaying, "tv"], [requests.bgmPlaying, "background"],
  ].find(([active]) => active)?.[1] ?? null;
  assert.equal(getBusAudioOwner(requests), expected, JSON.stringify(requests));
}

assert.deepEqual(BUS_AUDIO_EVENTS, {
  tvPrepare: "bus-tv-user-prepare", tvPlay: "bus-tv-user-play", tvFocus: "bus-tv-audio-focus",
  partyFocus: "bus-party-audio-focus", musicToggle: "bus-music-user-toggle",
  partyToggle: "bus-music-party-toggle", partyDance: "bus-party-dance",
  musicPlayback: "bus-music-playback", musicSnapshot: "bus-music-snapshot", musicSeek: "bus-music-seek",
});

const target = new EventTarget();
const payloads = { tvPrepare: undefined, tvPlay: undefined, tvFocus: false, partyFocus: true,
  musicToggle: { playing: true, suspendedForVideo: false },
  partyToggle: { enabled: false, suspendedForVideo: true }, partyDance: false,
  musicPlayback: {track:"party",title:"Party At Baratie",requested:true,ready:true,state:"playing",elapsed:12,duration:180},
  musicSnapshot: undefined, musicSeek: {track:"background",seconds:42} };
for (const [name, detail] of Object.entries(payloads)) {
  let calls = 0;
  const stop = onBusAudioEvent(name, received => {
    calls++;
    assert.equal(received, detail, "Payloads must pass through without cloning or coercion.");
  }, target);
  emitBusAudioEvent(name, detail, target);
  assert.equal(calls, 1, `${name} must be delivered before dispatch returns.`);
  stop(); stop();
  emitBusAudioEvent(name, detail, target);
  assert.equal(calls, 1, `${name} must stop after cleanup.`);
}

// Mirroring the two React roots: party focus first pauses TV, which immediately
// releases its focus, before the music player's party command runs.
const order = [];
const stopTv = onBusAudioEvent("partyFocus", active => {
  order.push(`tv-party-focus:${active}`);
  emitBusAudioEvent("tvFocus", false, target);
  order.push("tv-paused");
}, target);
const stopMusicFocus = onBusAudioEvent("tvFocus", active => order.push(`music-tv-focus:${active}`), target);
const stopMusicParty = onBusAudioEvent("partyToggle", detail => order.push(`music-party:${detail.enabled}`), target);
queueMicrotask(() => order.push("microtask"));
emitBusAudioEvent("partyFocus", true, target);
emitBusAudioEvent("partyToggle", { enabled: true, suspendedForVideo: false }, target);
order.push("gesture-returned");
assert.deepEqual(order, ["tv-party-focus:true", "music-tv-focus:false", "tv-paused", "music-party:true", "gesture-returned"]);
await Promise.resolve();
assert.equal(order.at(-1), "microtask");
stopTv(); stopMusicFocus(); stopMusicParty();

let firstRoot = 0, secondRoot = 0;
const stopFirst = onBusAudioEvent("partyDance", () => firstRoot++, target);
const stopSecond = onBusAudioEvent("partyDance", () => secondRoot++, target);
stopFirst();
emitBusAudioEvent("partyDance", true, target);
assert.equal(firstRoot, 0);
assert.equal(secondRoot, 1, "Cleaning up one root must preserve the other root's subscription.");
stopSecond();

// Default target follows window; commands without data remain plain Events and
// retain the established public DOM protocol used by interaction tests.
const previousWindow = globalThis.window;
globalThis.window = target;
let prepared = false;
const stopPrepare = onBusAudioEvent("tvPrepare", detail => { assert.equal(detail, undefined); prepared = true; });
emitBusAudioEvent("tvPrepare");
assert(prepared);
stopPrepare();
let nativeDetail;
target.addEventListener("bus-music-user-toggle", event => { nativeDetail = event.detail; }, { once: true });
emitBusAudioEvent("musicToggle", payloads.musicToggle);
assert.equal(nativeDetail, payloads.musicToggle);
if (previousWindow === undefined) delete globalThis.window;
else globalThis.window = previousWindow;

console.log("Bus audio contract passed: 16 priority combinations, synchronous cross-root dispatch, typed channels and cleanup.");
