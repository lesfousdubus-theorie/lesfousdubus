import type { BusMusicPlayback } from "./bus-audio";
import { PARTY_CHILL_START, PARTY_DANCE_END, PARTY_DANCE_START, PARTY_FINALE_PEAK, PARTY_FINALE_START } from "./bus-party";

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
  const inFinaleTail = clock.elapsed >= PARTY_FINALE_START && clock.elapsed < PARTY_DANCE_END;
  const interpolation = (clock.playing || inFinaleTail) ? Math.max(0, Math.min(inFinaleTail ? 0.8 : 0.5, (now - clock.sampledAt) / 1000)) : 0;
  return clock.elapsed + interpolation;
}

export const partyMusicClock = createPartyClock();
let frameTime: number | null = null;
let frameElapsed: number | null = null;

export function updatePartyDanceFrame(now: number) {
  if (!partyMusicClock.valid) {
    frameTime = null;
    frameElapsed = null;
    return;
  }
  const elapsed = readPartyClock(partyMusicClock, now);
  frameElapsed = elapsed;
  frameTime = Math.max(0, elapsed - PARTY_FIRST_BEAT);
}

export function clearPartyDanceClock() {
  partyMusicClock.valid = false;
  frameTime = null;
  frameElapsed = null;
}

/** Progression 0→1 de la phase chill (1:39 → 1:49). */
export function getPartyDanceChillMix() {
  const elapsed = frameElapsed ?? (partyMusicClock.valid ? readPartyClock(partyMusicClock, typeof performance !== "undefined" ? performance.now() : 0) : null);
  if (elapsed === null) return 0;
  const t = Math.max(0, Math.min(1, (elapsed - PARTY_CHILL_START) / 1.0));
  return t * t * (3 - 2 * t);
}

/** Impulsion rapide 0→1→0 du final « Wouh ! » : montée à 1:49.55, sommet à 1:49.75 (arrêt musique), descente jusqu'à 1:50.15. */
export function getPartyDanceFinaleMix() {
  const elapsed = frameElapsed ?? (partyMusicClock.valid ? readPartyClock(partyMusicClock, typeof performance !== "undefined" ? performance.now() : 0) : null);
  if (elapsed === null || elapsed < PARTY_FINALE_START || elapsed >= PARTY_DANCE_END) return 0;
  if (elapsed <= PARTY_FINALE_PEAK) {
    const up = Math.max(0, Math.min(1, (elapsed - PARTY_FINALE_START) / (PARTY_FINALE_PEAK - PARTY_FINALE_START)));
    return up * up * (3 - 2 * up);
  }
  const down = Math.max(0, Math.min(1, (elapsed - PARTY_FINALE_PEAK) / (PARTY_DANCE_END - PARTY_FINALE_PEAK)));
  return 1 - down * down * (3 - 2 * down);
}

/** Le temps de scène ne sert qu'aux bancs de test sans lecteur musical. */
export function getPartyDanceTime(fallback: number) {
  return frameTime ?? Math.max(0, fallback);
}
