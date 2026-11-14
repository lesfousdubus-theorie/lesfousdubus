import assert from "node:assert/strict";
import { build } from "esbuild";

const compiled = await build({ entryPoints: ["src/lib/bus-party.ts"], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const { PARTY_YOUTUBE_ID, PARTY_DANCE_START, createPartyDanceGate, samplePartyDanceGate } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`,
);
assert.equal(PARTY_YOUTUBE_ID, "RbZMoeHdR3I", "The requested party song must be used.");
assert.equal(PARTY_DANCE_START, 8, "The beat and dances start eight seconds into the song.");
const url = `https://www.youtube.com/watch?v=${PARTY_YOUTUBE_ID}`;
const oldUrl = "https://www.youtube.com/watch?v=63RzVcR1qHg";
const sample = (gate, state, time, requested = true, videoUrl = url) => samplePartyDanceGate(gate, requested, state, time, videoUrl);

const first = createPartyDanceGate();
for (const time of [0, 0.05, 1, 4, 7, 7.999]) {
  assert.equal(sample(first, 1, time), false, `At ${time}s the party intro must not dance.`);
}
for (const time of [8, 8.001, 10, 45, 160]) {
  assert.equal(sample(first, 1, time), true, `At ${time}s the playing party song must dance.`);
}

// La pause conserve le point atteint : reprendre à dix secondes ne rejoue pas
// l'introduction et doit restaurer la danse à partir du temps réel du lecteur.
for (const state of [-1, 0, 2, 3, 5]) {
  assert.equal(sample(first, state, 10), false, `Player state ${state} must stop dancing.`);
  assert.equal(sample(first, 1, 10), true, "A playing resumption at 10s must dance without waiting for another intro.");
}
assert.equal(sample(first, 1, 10, false), false, "An off or suspended party must stop dancing.");
assert.equal(sample(first, 1, 10), true, "A party resumed after temporary suspension keeps its playback point.");
assert.equal(sample(first, 1, 100, true, oldUrl), false, "Old background-song metadata must never start party dances.");
assert.equal(sample(first, 0, 100), false, "The ended state must stop dances even if its currentTime remains at the end.");

// Au changement de piste, ni la fin de l'ancienne chanson ni un URL pas encore
// synchronisé ne constituent un accusé de démarrage à zéro.
const fresh = createPartyDanceGate();
for (const videoUrl of [oldUrl, "", "not-a-url", "https://www.youtube.com/watch", "https://www.youtube.com/watch?v=YoeP9w5UIlg"]) {
  assert.equal(sample(fresh, 1, 0, true, videoUrl), false);
  assert.equal(fresh.waitingForIntro, true, "Only the chosen party source may acknowledge its intro.");
}
for (const time of [8, 20, 100]) {
  assert.equal(sample(fresh, 1, time), false, "A stale end time must stay gated before the new intro is observed.");
}
assert.equal(sample(fresh, 1, 0), false);
assert.equal(sample(fresh, 1, 8), true);

const suspendedEnd = createPartyDanceGate();
assert.equal(sample(suspendedEnd, 1, 0), false);
assert.equal(sample(suspendedEnd, 1, 10), true);
assert.equal(sample(suspendedEnd, 0, 160, false), false, "A clip ending while suspended must stop dancers.");
// Contrat de onStateChange : l'état ended réarme la boucle même si shouldPlay
// est false ; le seek/play peut être différé jusqu'à la fin de la suspension.
suspendedEnd.waitingForIntro = true;
assert.equal(sample(suspendedEnd, 1, 160), false, "Resuming after a suspended end must reject its stale end time.");
assert.equal(sample(suspendedEnd, 3, 0), false);
assert.equal(suspendedEnd.waitingForIntro, false, "Correct-source buffering at zero acknowledges the new intro without dancing.");
assert.equal(sample(suspendedEnd, 1, 10), true, "A delayed playing event at 10s can dance after the zero-time acknowledgement.");
const pausedIntro = createPartyDanceGate();
assert.equal(sample(pausedIntro, 2, 3), false);
assert.equal(pausedIntro.waitingForIntro, false, "A paused correct-source intro can acknowledge the fresh loop.");
assert.equal(sample(pausedIntro, 1, 10), true);

// Chaque boucle réarme l'attente avant seekTo(0). YouTube peut encore exposer
// pendant plusieurs messages le temps de fin, avec le nouvel état playing.
for (let loop = 0; loop < 5; loop++) {
  fresh.waitingForIntro = true;
  assert.equal(sample(fresh, 0, 160), false);
  assert.equal(sample(fresh, 1, 160), false, "The old loop end must not bypass the intro after seekTo(0).");
  assert.equal(sample(fresh, 3, 160), false);
  assert.equal(sample(fresh, 2, 160), false);
  assert.equal(sample(fresh, 1, 0, true, oldUrl), false);
  assert.equal(fresh.waitingForIntro, true);
  assert.equal(sample(fresh, 3, 0), false, "Buffering at the next intro must not dance.");
  assert.equal(sample(fresh, 1, 0), false);
  assert.equal(sample(fresh, 1, 7.999), false);
  assert.equal(sample(fresh, 1, 8), true, "Every loop must restart its own dances at 8s.");
  assert.equal(sample(fresh, 2, 11), false);
  assert.equal(sample(fresh, 1, 11), true);
}
for (const time of [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
  assert.equal(sample(fresh, 1, time), false, "Invalid media times must not animate characters.");
}
console.log("Party timing passed: intro, 8s boundary, five loops, stale metadata, pause, buffering and resume.");
