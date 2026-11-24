export const PARTY_YOUTUBE_ID = "RbZMoeHdR3I";
export const PARTY_TITLE = "Party At Baratie";
export const PARTY_DANCE_START = 8;
export const PARTY_CHILL_START = 99; // 1:39 — balancement chill en mode bouclier
export const PARTY_FINALE_START = 108.95; // 1:48.95 — début du lever de mains (« Wouh ! »)
export const PARTY_FINALE_PEAK = 109.15; // 1:49.15 — sommet mains levées sur le dernier pic sonore
export const PARTY_DANCE_END = 109.55; // 1:49.55 — mains redescendues, arrêt complet de la danse

export function createPartyDanceGate() { return { waitingForIntro: true }; }

/** L'API peut encore renvoyer la fin de la boucle précédente après seekTo(0). */
export function samplePartyDanceGate(gate: ReturnType<typeof createPartyDanceGate>, requested: boolean,
  playerState: number, time: number, videoUrl: string) {
  let videoId: string | null = null;
  try { videoId = new URL(videoUrl).searchParams.get("v"); } catch { return false; }
  if (!requested || videoId !== PARTY_YOUTUBE_ID || !Number.isFinite(time) || time < 0) return false;
  if (time < PARTY_DANCE_START) gate.waitingForIntro = false;
  const activePlayback = playerState === 1 || (playerState === 0 && time >= PARTY_FINALE_START);
  return activePlayback && !gate.waitingForIntro && time >= PARTY_DANCE_START && time < PARTY_DANCE_END;
}
