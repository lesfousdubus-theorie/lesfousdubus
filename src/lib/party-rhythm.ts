import type { BusMusicPlayback } from "./bus-audio";
import { PARTY_DANCE_START } from "./bus-party";

// Quatre pulsations en 1,905 s, mesurées sur l'extrait Apple Music de Party At Baratie.
export const PARTY_BPM = 126;
export const PARTY_BEAT_SECONDS = 60 / PARTY_BPM;
export const PARTY_FIRST_BEAT = Math.ceil(PARTY_DANCE_START / PARTY_BEAT_SECONDS) * PARTY_BEAT_SECONDS;
export const PARTY_PHRASE_SECONDS = 8 * PARTY_BEAT_SECONDS;

export function createPartyClock() {
  return { elapsed: 0, sampledAt: 0, playing: false, valid: false };
}
export type PartyClock = ReturnType<typeof createPartyClock>;

export function syncPartyClock(clock: PartyClock, playback: Pick<BusMusicPlayback, "track" | "state" | "elapsed">, now: number) {
  clock.valid = playback.track === "party" && Number.isFinite(playback.elapsed);
  clock.elapsed = clock.valid ? Math.max(0, playback.elapsed) : 0;
  clock.playing = clock.valid && playback.state === "playing";
  clock.sampledAt = now;
}

export function readPartyClock(clock: PartyClock, now: number) {
  // Le lecteur envoie un relevé toutes les 250 ms. On limite l'interpolation si un relevé manque.
  const interpolation = clock.playing ? Math.max(0, Math.min(.5, (now - clock.sampledAt) / 1000)) : 0;
  return clock.elapsed + interpolation;
}

export const partyMusicClock = createPartyClock();
let frameTime: number | null = null;

export function updatePartyDanceFrame(now: number) {
  frameTime = partyMusicClock.valid ? Math.max(0, readPartyClock(partyMusicClock, now) - PARTY_FIRST_BEAT) : null;
}

export function clearPartyDanceClock() {
  partyMusicClock.valid = false;
  frameTime = null;
}

/** Le temps de scène ne sert qu'aux bancs de test sans lecteur musical. */
export function getPartyDanceTime(fallback: number) {
  return frameTime ?? Math.max(0, fallback);
}
