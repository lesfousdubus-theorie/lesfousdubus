export const PARTY_YOUTUBE_ID = "RbZMoeHdR3I";
export const PARTY_TITLE = "Party At Baratie";
export const PARTY_DANCE_START = 8;

export function createPartyDanceGate() { return { waitingForIntro: true }; }

/** L'API peut encore renvoyer la fin de la boucle précédente après seekTo(0). */
export function samplePartyDanceGate(gate: ReturnType<typeof createPartyDanceGate>, requested: boolean,
  playerState: number, time: number, videoUrl: string) {
  let videoId: string | null = null;
  try { videoId = new URL(videoUrl).searchParams.get("v"); } catch { return false; }
  if (!requested || videoId !== PARTY_YOUTUBE_ID || !Number.isFinite(time) || time < 0) return false;
  if (time < PARTY_DANCE_START) gate.waitingForIntro = false;
  return playerState===1 && !gate.waitingForIntro && time >= PARTY_DANCE_START;
}
