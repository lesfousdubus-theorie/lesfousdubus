/** Shared DOM contract for the page and the Three.js React root. */
export const BUS_AUDIO_EVENTS = {
  tvPrepare: "bus-tv-user-prepare",
  tvPlay: "bus-tv-user-play",
  tvFocus: "bus-tv-audio-focus",
  partyFocus: "bus-party-audio-focus",
  musicToggle: "bus-music-user-toggle",
  partyToggle: "bus-music-party-toggle",
  partyDance: "bus-party-dance",
  musicPlayback: "bus-music-playback",
  musicSnapshot: "bus-music-snapshot",
  musicSeek: "bus-music-seek",
} as const;

export type BusMusicTrack = "background" | "party";
export interface BusMusicPlayback {
  track: BusMusicTrack;
  title: string;
  requested: boolean;
  ready: boolean;
  state: "loading" | "playing" | "paused" | "suspended" | "error";
  elapsed: number;
  duration: number;
}

export const INITIAL_MUSIC_PLAYBACK: BusMusicPlayback = {
  track: "background", title: "Life in Pieces", requested: false,
  ready: false, state: "loading", elapsed: 0, duration: 0,
};

interface BusAudioDetails {
  tvPrepare: undefined;
  tvPlay: undefined;
  tvFocus: boolean;
  partyFocus: boolean;
  musicToggle: { playing: boolean; suspendedForVideo: boolean };
  partyToggle: { enabled: boolean; suspendedForVideo: boolean };
  partyDance: boolean;
  musicPlayback: BusMusicPlayback;
  musicSnapshot: undefined;
  musicSeek: { track: BusMusicTrack; seconds: number };
}

type AudioEvent = keyof BusAudioDetails;
type EmitArguments<Key extends AudioEvent> = BusAudioDetails[Key] extends undefined
  ? [detail?: undefined, target?: EventTarget]
  : [detail: BusAudioDetails[Key], target?: EventTarget];

/** Dispatch synchronously: player commands must stay inside the user's gesture. */
export function emitBusAudioEvent<Key extends AudioEvent>(name: Key, ...args: EmitArguments<Key>) {
  const [detail, target = window] = args;
  target.dispatchEvent(detail === undefined ? new Event(BUS_AUDIO_EVENTS[name])
    : new CustomEvent(BUS_AUDIO_EVENTS[name], { detail }));
}

/** The caller owns this subscription; returning its cleanup fits React effects. */
export function onBusAudioEvent<Key extends AudioEvent>(
  name: Key,
  listener: (detail: BusAudioDetails[Key]) => void,
  target: EventTarget = window,
) {
  const handle = (event: Event) => listener((event as CustomEvent<BusAudioDetails[Key]>).detail);
  target.addEventListener(BUS_AUDIO_EVENTS[name], handle);
  return () => target.removeEventListener(BUS_AUDIO_EVENTS[name], handle);
}

export interface BusAudioRequests {
  theoryVideoPlaying: boolean;
  partyOn: boolean;
  busVideoPlaying: boolean;
  bgmPlaying: boolean;
}

/** Theory video > party > bus TV > background music. Silence wins over a lower source. */
export function getBusAudioOwner(requests: BusAudioRequests): "theory" | "party" | "tv" | "background" | null {
  if (requests.theoryVideoPlaying) return "theory";
  if (requests.partyOn) return "party";
  if (requests.busVideoPlaying) return "tv";
  if (requests.bgmPlaying) return "background";
  return null;
}
