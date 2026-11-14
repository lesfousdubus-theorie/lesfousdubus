"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { mountYouTubePlayer, type YouTubePlayer } from "@/lib/youtube-player";
import { PARTY_YOUTUBE_ID, PARTY_TITLE, createPartyDanceGate, samplePartyDanceGate } from "@/lib/bus-party";
import { emitBusAudioEvent, onBusAudioEvent, type BusMusicTrack } from "@/lib/bus-audio";

export const BGM_YOUTUBE_ID = "63RzVcR1qHg";
export { PARTY_YOUTUBE_ID } from "@/lib/bus-party";
const MUSIC_RESUME_MS = 1800;
const MUSIC_PRELOAD_SECONDS = 15;
const MUSIC_PRELOAD_TIMEOUT_MS = 20_000;

interface MusicSlot {
  track: BusMusicTrack;
  videoId: string;
  title: string;
  player: YouTubePlayer | null;
  ready: boolean;
  warming: boolean;
  warmTimer: number | null;
  restart: boolean;
  error: boolean;
  disconnect: (() => void) | null;
}

function createSlot(track: BusMusicTrack): MusicSlot {
  return {
    track, videoId: track === "party" ? PARTY_YOUTUBE_ID : BGM_YOUTUBE_ID,
    title: track === "party" ? PARTY_TITLE : "Life in Pieces",
    player: null, ready: false, warming: false, warmTimer: null, restart: false, error: false, disconnect: null,
  };
}

interface BackgroundMusicPlayerProps {
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  onPlaybackError?: (message: string) => void;
  suspendedForVideo?: boolean;
  volume?: number;
  partyOn?: boolean;
  onPartyPlaybackError?: () => void;
}

export default function BackgroundMusicPlayer({
  playing, onPlayingChange, onPlaybackError, suspendedForVideo = false,
  volume = 85, partyOn = false, onPartyPlaybackError,
}: BackgroundMusicPlayerProps) {
  const backgroundMountRef = useRef<HTMLDivElement>(null);
  const partyMountRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef({ background: createSlot("background"), party: createSlot("party") });
  const activeTrackRef = useRef<BusMusicTrack>("background");
  const desiredPlayingRef = useRef(playing);
  const desiredPartyRef = useRef(partyOn);
  const desiredSuspendedRef = useRef(suspendedForVideo);
  const desiredVolumeRef = useRef(volume);
  const busAudioFocusRef = useRef(false);
  const resumeAfterVideoRef = useRef(false);
  const fadePendingRef = useRef(false);
  const fadeStartedRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const startTimerRef = useRef<number | null>(null);
  const danceGateRef = useRef(createPartyDanceGate());
  const dancingRef = useRef(false);

  const shouldPlay = useCallback((slot: MusicSlot) =>
    slot.track === (desiredPartyRef.current ? "party" : "background") &&
    (desiredPlayingRef.current || desiredPartyRef.current) &&
    !desiredSuspendedRef.current && !busAudioFocusRef.current, []);

  const publishPlayback = useCallback(() => {
    const slot = slotsRef.current[desiredPartyRef.current ? "party" : "background"];
    const requested = desiredPlayingRef.current || desiredPartyRef.current;
    let elapsed = 0, duration = 0, state = -1;
    try {
      if (slot.ready && slot.player) {
        elapsed = slot.player.getCurrentTime(); duration = slot.player.getDuration();
        state = slot.player.getPlayerState();
      }
    } catch { /* A late poll can overlap iframe teardown. */ }
    duration = Number.isFinite(duration) && duration > 0 ? duration : 0;
    elapsed = Number.isFinite(elapsed) ? Math.max(0, Math.min(elapsed, duration || elapsed)) : 0;
    emitBusAudioEvent("musicPlayback", {
      track: slot.track, title: slot.title, requested, ready: slot.ready,
      state: slot.error ? "error" : !slot.ready ? "loading"
        : requested && (desiredSuspendedRef.current || busAudioFocusRef.current) ? "suspended"
        : requested ? state === 1 ? "playing" : "loading" : "paused",
      elapsed: slot.warming ? 0 : elapsed, duration,
    });
  }, []);

  const reportDance = useCallback((dancing: boolean) => {
    if (dancingRef.current === dancing) return;
    dancingRef.current = dancing;
    emitBusAudioEvent("partyDance", dancing);
  }, []);
  const updateDance = useCallback(() => {
    const slot = slotsRef.current.party;
    try {
      reportDance(Boolean(slot.ready && slot.player && samplePartyDanceGate(danceGateRef.current,
        shouldPlay(slot), slot.player.getPlayerState(), slot.player.getCurrentTime(), slot.player.getVideoUrl())));
    } catch { reportDance(false); }
  }, [reportDance, shouldPlay]);
  const clearStartTimer = useCallback(() => {
    if (startTimerRef.current !== null) window.clearTimeout(startTimerRef.current);
    startTimerRef.current = null;
  }, []);
  const clearFade = useCallback(() => {
    if (fadeTimerRef.current !== null) window.clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = null; fadeStartedRef.current = null; fadePendingRef.current = false;
  }, []);
  const stopWarmup = useCallback((slot: MusicSlot) => {
    if (slot.warmTimer !== null) window.clearInterval(slot.warmTimer);
    slot.warmTimer = null; slot.warming = false;
  }, []);
  const startFade = useCallback(() => {
    if (!fadePendingRef.current || fadeStartedRef.current !== null) return;
    fadePendingRef.current = false;
    let previous = performance.now(), elapsed = 0;
    fadeStartedRef.current = previous;
    const tick = () => {
      const slot = slotsRef.current[activeTrackRef.current];
      if (!slot.player || !shouldPlay(slot)) { clearFade(); return; }
      // A slow frame or a throttled tab must not turn the fade into a volume jump.
      const now = performance.now();
      elapsed += Math.min(120, now - previous);
      previous = now;
      const progress = Math.min(1, elapsed / MUSIC_RESUME_MS);
      try { slot.player.setVolume(Math.round(desiredVolumeRef.current * progress * progress * (3 - 2 * progress))); }
      catch { clearFade(); return; }
      if (progress < 1) fadeTimerRef.current = window.setTimeout(tick, 60);
      else clearFade();
    };
    fadeTimerRef.current = window.setTimeout(tick, 60);
  }, [clearFade, shouldPlay]);
  const reportFailure = useCallback((slot: MusicSlot, message: string, reconnect = false) => {
    const requested = shouldPlay(slot);
    slot.error = true;
    stopWarmup(slot);
    try { slot.player?.mute(); slot.player?.pauseVideo(); } catch { /* Unavailable iframe. */ }
    if (reconnect) {
      slot.disconnect?.();
      slot.disconnect = null;
      slot.player = null;
      slot.ready = false;
    }
    if (requested) {
      clearStartTimer();
      clearFade();
      reportDance(false);
      if (slot.track === "party") desiredPartyRef.current = false;
      else desiredPlayingRef.current = false;
      queueMicrotask(() => {
        if (slot.track === "party") onPartyPlaybackError?.();
        else onPlayingChange(false);
        onPlaybackError?.(`${message} Réessayez avec le bouton ${slot.track === "party" ? "Fête" : "Musique"}.`);
      });
    }
    publishPlayback();
  }, [clearStartTimer, clearFade, onPlayingChange, onPlaybackError, onPartyPlaybackError,
    reportDance, shouldPlay, stopWarmup, publishPlayback]);

  const applyDesiredPlayback = useCallback(() => {
    clearStartTimer();
    const nextTrack = desiredPartyRef.current ? "party" : "background";
    const changed = activeTrackRef.current !== nextTrack;
    if (changed) {
      clearFade(); reportDance(false);
      activeTrackRef.current = nextTrack;
      if (nextTrack === "party") {
        slotsRef.current.party.restart = true;
        danceGateRef.current.waitingForIntro = true;
      }
      resumeAfterVideoRef.current = nextTrack === "background";
    }
    const slot = slotsRef.current[nextTrack];
    try {
      // Both songs retain their own buffered iframe. Silence the old source
      // synchronously, before unmuting the selected one inside the click.
      for (const other of Object.values(slotsRef.current)) {
        if (other === slot || !other.ready || !other.player) continue;
        if (other.warming && !desiredPlayingRef.current && !desiredPartyRef.current) continue;
        stopWarmup(other);
        try { other.player.mute(); other.player.pauseVideo(); }
        catch { reportFailure(other, "Le lecteur YouTube ne répond plus.", true); }
      }
      const player = slot.player;
      if (!slot.ready || !player) { publishPlayback(); return; }
      const requested = desiredPlayingRef.current || desiredPartyRef.current;
      if (shouldPlay(slot)) {
        if (slot.warming) slot.restart = true;
        stopWarmup(slot);
        if (slot.restart) { slot.restart = false; player.seekTo(0, true); }
        if (resumeAfterVideoRef.current) {
          resumeAfterVideoRef.current = false; clearFade();
          fadePendingRef.current = true; player.setVolume(0);
        } else if (!fadePendingRef.current && fadeStartedRef.current === null) player.setVolume(desiredVolumeRef.current);
        startTimerRef.current = window.setTimeout(() => {
          startTimerRef.current = null;
          if (!shouldPlay(slot) || slot.player !== player) return;
          try {
            if (player.getPlayerState() !== 1) reportFailure(slot, "YouTube n’a pas démarré la lecture.");
          } catch { reportFailure(slot, "Le lecteur YouTube ne répond plus.", true); }
        }, 12_000);
        player.unMute(); player.playVideo();
        if (player.getPlayerState() === 1) { clearStartTimer(); startFade(); }
      } else {
        if (requested) resumeAfterVideoRef.current = true;
        else resumeAfterVideoRef.current = false;
        clearFade(); reportDance(false);
        // TV initialization and focus notifications must not cancel a silent
        // preload before its buffer is ready. An explicit play takes over above.
        if (!slot.warming) { player.mute(); player.pauseVideo(); }
      }
      publishPlayback();
    } catch { reportFailure(slot, "Le lecteur YouTube ne répond plus.", true); }
  }, [clearStartTimer, clearFade, startFade, reportFailure, reportDance, shouldPlay, stopWarmup, publishPlayback]);

  const connectSlot = useCallback((slot: MusicSlot) => {
    const host = slot.track === "party" ? partyMountRef.current : backgroundMountRef.current;
    if (!host || slot.disconnect) return;
    slot.error = false;
    slot.disconnect = mountYouTubePlayer(host, {
      id: slot.track === "party" ? "party-music-iframe" : "bgm-iframe",
      title: `Musique ${slot.track === "party" ? "de fête" : "de fond"} — ${slot.title}`,
      allow: "autoplay; encrypted-media",
      audioOnly: true,
      width: 200, height: 200, videoId: slot.videoId,
      playerVars: { autoplay: 0, controls: 0, rel: 0, playsinline: 1 },
      onUnavailable: () => reportFailure(slot, "Le lecteur YouTube n’a pas pu être chargé.", true),
      events: {
        onReady: ({ target }) => {
          slot.ready = true;
          slot.player = target;
          // The iframe can finish loading just after a gesture. Try that
          // request now, then let the same HUD button retry if autoplay is denied.
          if (shouldPlay(slot)) { applyDesiredPlayback(); return; }
          target.mute();
          target.setVolume(desiredVolumeRef.current);
          slot.warming = true;
          const started = performance.now();
          slot.warmTimer = window.setInterval(() => {
            if (shouldPlay(slot)) { stopWarmup(slot); return; }
            try {
              const duration = target.getDuration();
              const buffered = (target.getVideoLoadedFraction?.() ?? 0) * duration;
              if (buffered < Math.min(MUSIC_PRELOAD_SECONDS, duration || MUSIC_PRELOAD_SECONDS)
                && performance.now() - started < MUSIC_PRELOAD_TIMEOUT_MS) return;
              stopWarmup(slot);
              target.mute(); target.pauseVideo(); target.seekTo(0, true);
              publishPlayback();
            } catch { reportFailure(slot, "Le lecteur YouTube ne répond plus.", true); }
          }, 120);
          target.playVideo();
          publishPlayback();
        },
        onStateChange: event => {
          if (!slot.ready) return;
          const audible = shouldPlay(slot);
          if (slot.track === "party" && event.data === 0) {
            danceGateRef.current.waitingForIntro = true;
            slot.restart = true;
          }
          if (event.data === 1 && !audible && !slot.warming) {
            event.target.mute();
            event.target.pauseVideo();
          } else if (event.data === 1 && audible) {
            clearStartTimer();
            startFade();
          } else if (event.data === 0 && audible) {
            slot.restart = false;
            event.target.seekTo(0, true);
            applyDesiredPlayback();
          }
          if (slot.track === "party") updateDance();
          publishPlayback();
        },
        onAutoplayBlocked: () => {
          // Offscreen muted preloads may be refused on Safari. A real click
          // must still get a chance to use this very same player.
          stopWarmup(slot);
          if (shouldPlay(slot)) reportFailure(slot, "Le navigateur a bloqué la lecture.");
          else publishPlayback();
        },
        onError: () => reportFailure(slot, "YouTube ne peut pas lire cette piste pour le moment.", true),
      },
    });
  }, [applyDesiredPlayback, clearStartTimer, startFade, reportFailure, shouldPlay, stopWarmup, updateDance, publishPlayback]);

  const syncPlayback = useCallback(() => {
    const slot = slotsRef.current[desiredPartyRef.current ? "party" : "background"];
    if (shouldPlay(slot)) connectSlot(slot);
    applyDesiredPlayback();
  }, [applyDesiredPlayback, connectSlot, shouldPlay]);

  useEffect(() => {
    const slots = Object.values(slotsRef.current);
    slots.forEach(connectSlot);
    return () => {
      clearStartTimer(); clearFade(); reportDance(false);
      for (const slot of slots) {
        stopWarmup(slot);
        slot.disconnect?.();
        slot.disconnect = null;
        slot.ready = false;
        slot.player = null;
      }
    };
  }, [connectSlot, clearStartTimer, clearFade, reportDance, stopWarmup]);

  useEffect(() => {
    const danceTimer = window.setInterval(updateDance, 100);
    const snapshotTimer = window.setInterval(publishPlayback, 250);
    return () => { window.clearInterval(danceTimer); window.clearInterval(snapshotTimer); };
  }, [updateDance, publishPlayback]);
  useEffect(() => onBusAudioEvent("musicSnapshot", publishPlayback), [publishPlayback]);
  useEffect(() => onBusAudioEvent("musicSeek", detail => {
    const slot = slotsRef.current[desiredPartyRef.current ? "party" : "background"];
    if (detail.track !== slot.track || !Number.isFinite(detail.seconds) || !slot.ready || !slot.player) return;
    try {
      const duration = slot.player.getDuration();
      if (!Number.isFinite(duration) || duration <= 0) return;
      const seconds = Math.max(0, Math.min(detail.seconds, duration));
      if (slot.track === "party") danceGateRef.current.waitingForIntro = false;
      slot.restart = false; slot.player.seekTo(seconds, true);
      if (!shouldPlay(slot)) { slot.player.mute(); slot.player.pauseVideo(); }
      updateDance(); publishPlayback();
    } catch { reportFailure(slot, "Impossible de déplacer la lecture.", true); }
  }), [shouldPlay, updateDance, publishPlayback, reportFailure]);
  useEffect(() => onBusAudioEvent("musicToggle", detail => {
    if (desiredPartyRef.current) return;
    desiredPlayingRef.current = detail.playing; desiredSuspendedRef.current = detail.suspendedForVideo;
    slotsRef.current.background.error = false;
    syncPlayback();
  }), [syncPlayback]);
  useEffect(() => onBusAudioEvent("partyToggle", detail => {
    desiredPartyRef.current = detail.enabled; desiredSuspendedRef.current = detail.suspendedForVideo;
    slotsRef.current.party.error = false;
    syncPlayback();
  }), [syncPlayback]);
  useEffect(() => onBusAudioEvent("tvFocus", active => {
    busAudioFocusRef.current = active; syncPlayback();
  }), [syncPlayback]);
  useLayoutEffect(() => {
    desiredPlayingRef.current = playing; desiredPartyRef.current = partyOn;
    desiredSuspendedRef.current = suspendedForVideo; syncPlayback();
  }, [playing, partyOn, suspendedForVideo, syncPlayback]);
  useEffect(() => {
    desiredVolumeRef.current = volume;
    for (const slot of Object.values(slotsRef.current)) {
      if (!slot.ready || !slot.player) continue;
      try {
        if (slot.track === activeTrackRef.current && fadePendingRef.current) slot.player.setVolume(0);
        else if (slot.track !== activeTrackRef.current || fadeStartedRef.current === null) slot.player.setVolume(volume);
      } catch { /* Player readiness can change while the iframe is torn down. */ }
    }
  }, [volume]);

  return <div className="pointer-events-none fixed -left-[9999px] top-0 h-[200px] w-[200px]" aria-hidden="true">
    <div ref={backgroundMountRef} className="h-full w-full" /><div ref={partyMountRef} className="h-full w-full" />
  </div>;
}
