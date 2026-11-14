"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { loadYouTubeIframeApi, type YouTubePlayer } from "@/lib/youtube-player";
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
}

function createSlot(track: BusMusicTrack): MusicSlot {
  return {
    track, videoId: track === "party" ? PARTY_YOUTUBE_ID : BGM_YOUTUBE_ID,
    title: track === "party" ? PARTY_TITLE : "Life in Pieces",
    player: null, ready: false, warming: false, warmTimer: null, restart: false, error: false,
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
  const apiFailedRef = useRef(false);
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
      state: apiFailedRef.current || slot.error ? "error" : !slot.ready ? "loading"
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
    fadePendingRef.current = false; fadeStartedRef.current = performance.now();
    const tick = () => {
      const slot = slotsRef.current[activeTrackRef.current];
      if (!slot.player || !shouldPlay(slot)) { clearFade(); return; }
      const progress = Math.min(1, (performance.now() - fadeStartedRef.current!) / MUSIC_RESUME_MS);
      try { slot.player.setVolume(Math.round(desiredVolumeRef.current * progress * progress * (3 - 2 * progress))); }
      catch { clearFade(); return; }
      if (progress < 1) fadeTimerRef.current = window.setTimeout(tick, 60);
      else clearFade();
    };
    fadeTimerRef.current = window.setTimeout(tick, 60);
  }, [clearFade, shouldPlay]);
  const reportFailure = useCallback((message: string) => {
    clearStartTimer(); clearFade(); reportDance(false);
    const wasParty = desiredPartyRef.current;
    const slot = slotsRef.current[wasParty ? "party" : "background"];
    slot.error = true; stopWarmup(slot);
    try { slot.player?.mute(); slot.player?.pauseVideo(); } catch { /* Unavailable iframe. */ }
    const requested = desiredPlayingRef.current || wasParty;
    if (wasParty) desiredPartyRef.current = false;
    else desiredPlayingRef.current = false;
    publishPlayback();
    queueMicrotask(() => {
      if (wasParty) onPartyPlaybackError?.();
      else onPlayingChange(false);
      if (requested) onPlaybackError?.(wasParty ? message.replaceAll("Musique", "Fête") : message);
    });
  }, [clearStartTimer, clearFade, onPlayingChange, onPlaybackError, onPartyPlaybackError, reportDance, stopWarmup, publishPlayback]);

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
    try {
      // Both songs retain their own buffered iframe. Silence the old source
      // synchronously, before unmuting the selected one inside the click.
      for (const slot of Object.values(slotsRef.current)) {
        if (slot.track === nextTrack || !slot.ready || !slot.player) continue;
        if (slot.warming && !desiredPlayingRef.current && !desiredPartyRef.current) continue;
        stopWarmup(slot); slot.player.mute(); slot.player.pauseVideo();
      }
      const slot = slotsRef.current[nextTrack], player = slot.player;
      if (!slot.ready || !player) { publishPlayback(); return; }
      const requested = desiredPlayingRef.current || desiredPartyRef.current;
      if (shouldPlay(slot)) {
        stopWarmup(slot);
        if (slot.restart) { slot.restart = false; player.seekTo(0, true); }
        if (resumeAfterVideoRef.current) {
          resumeAfterVideoRef.current = false; clearFade();
          fadePendingRef.current = true; player.setVolume(0);
        } else if (!fadePendingRef.current && fadeStartedRef.current === null) player.setVolume(desiredVolumeRef.current);
        startTimerRef.current = window.setTimeout(() => {
          startTimerRef.current = null;
          if (shouldPlay(slot) && player.getPlayerState() !== 1) {
            reportFailure("YouTube n’a pas démarré la lecture. Réessayez avec le bouton Musique.");
          }
        }, 12000);
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
    } catch { reportFailure("Le lecteur YouTube n’est pas prêt. Réessayez dans un instant."); }
  }, [clearStartTimer, clearFade, startFade, reportFailure, reportDance, shouldPlay, stopWarmup, publishPlayback]);

  useEffect(() => {
    let cancelled = false;
    const slots = slotsRef.current;
    void loadYouTubeIframeApi().then((YT) => {
      if (cancelled) return;
      for (const slot of Object.values(slots)) {
        const mount = slot.track === "party" ? partyMountRef.current : backgroundMountRef.current;
        if (!mount) continue;
        const player = new YT.Player(mount, {
          width: 200, height: 200, videoId: slot.videoId, host: "https://www.youtube-nocookie.com",
          playerVars: { autoplay: 1, mute: 1, controls: 0, rel: 0, playsinline: 1, origin: window.location.origin },
          events: {
            onReady: event => {
              if (cancelled) return;
              slot.ready = true; slot.player = event.target;
              event.target.mute(); event.target.setVolume(desiredVolumeRef.current);
              const iframe = event.target.getIframe();
              iframe.title = `Musique ${slot.track === "party" ? "de fête" : "de fond"} — ${slot.title}`;
              iframe.setAttribute("allow", "autoplay; encrypted-media");
              iframe.tabIndex = -1;
              iframe.setAttribute("loading", "eager");
              iframe.id = slot.track === "party" ? "party-music-iframe" : "bgm-iframe";
              Object.assign(iframe.style, { display: "block", width: "200px", height: "200px" });
              if (shouldPlay(slot)) { applyDesiredPlayback(); return; }
              // Prepare actual media before the first click, not just the API.
              // A nonzero fraction can be a tiny partial segment: keep warming
              // until there is enough buffered audio for an immediate start.
              slot.warming = true;
              const started = performance.now();
              slot.warmTimer = window.setInterval(() => {
                if (cancelled || shouldPlay(slot)) { stopWarmup(slot); return; }
                try {
                  const duration = event.target.getDuration();
                  const bufferedSeconds = (event.target.getVideoLoadedFraction?.() ?? 0) * duration;
                  const buffered = duration > 0 && bufferedSeconds >= Math.min(MUSIC_PRELOAD_SECONDS, duration);
                  if (!buffered && performance.now() - started < MUSIC_PRELOAD_TIMEOUT_MS) return;
                  stopWarmup(slot); event.target.mute(); event.target.pauseVideo(); event.target.seekTo(0, true);
                  publishPlayback();
                } catch { stopWarmup(slot); }
              }, 120);
              event.target.playVideo(); publishPlayback();
            },
            onStateChange: event => {
              if (cancelled || !slot.ready) return;
              const audible = shouldPlay(slot);
              if (slot.track === "party" && event.data === 0) {
                danceGateRef.current.waitingForIntro = true; slot.restart = true;
              }
              if (event.data === 1 && !audible && !slot.warming) {
                event.target.mute(); event.target.pauseVideo();
              } else if (event.data === 1 && audible) {
                clearStartTimer(); startFade();
              } else if (event.data === 0 && audible) {
                slot.restart = false; event.target.seekTo(0, true); event.target.playVideo();
              }
              if (slot.track === "party") updateDance();
              publishPlayback();
            },
            onAutoplayBlocked: () => {
              if (cancelled) return;
              stopWarmup(slot);
              if (shouldPlay(slot)) reportFailure("La lecture a été bloquée par le navigateur. Cliquez à nouveau sur Musique.");
              else publishPlayback();
            },
            onError: () => {
              if (cancelled) return;
              slot.error = true; stopWarmup(slot);
              if (shouldPlay(slot)) reportFailure("YouTube ne peut pas lire la musique pour le moment. Réessayez avec Musique.");
              else publishPlayback();
            },
          },
        });
        slot.player = player;
      }
    }).catch(() => {
      if (!cancelled) { apiFailedRef.current = true; reportFailure("Le lecteur YouTube n’a pas pu être chargé. Actualisez la page pour réessayer."); }
    });
    return () => {
      cancelled = true; clearStartTimer(); clearFade(); reportDance(false);
      for (const slot of Object.values(slots)) {
        stopWarmup(slot); slot.ready = false;
        try { slot.player?.destroy(); } catch { /* Cleanup remains safe after an iframe error. */ }
        slot.player = null;
      }
    };
  }, [applyDesiredPlayback, clearStartTimer, clearFade, startFade, reportFailure, reportDance, updateDance, shouldPlay, stopWarmup, publishPlayback]);

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
    } catch { reportFailure("Impossible de déplacer la lecture. Réessayez avec Musique."); }
  }), [shouldPlay, updateDance, publishPlayback, reportFailure]);
  useEffect(() => onBusAudioEvent("musicToggle", detail => {
    if (desiredPartyRef.current) return;
    desiredPlayingRef.current = detail.playing; desiredSuspendedRef.current = detail.suspendedForVideo;
    slotsRef.current.background.error = false;
    if (apiFailedRef.current) reportFailure("Le lecteur YouTube n’a pas pu être chargé. Actualisez la page pour réessayer.");
    else applyDesiredPlayback();
  }), [applyDesiredPlayback, reportFailure]);
  useEffect(() => onBusAudioEvent("partyToggle", detail => {
    desiredPartyRef.current = detail.enabled; desiredSuspendedRef.current = detail.suspendedForVideo;
    slotsRef.current.party.error = false;
    if (apiFailedRef.current) reportFailure("Le lecteur YouTube n’a pas pu être chargé. Actualisez la page pour réessayer.");
    else applyDesiredPlayback();
  }), [applyDesiredPlayback, reportFailure]);
  useEffect(() => onBusAudioEvent("tvFocus", active => {
    busAudioFocusRef.current = active; applyDesiredPlayback();
  }), [applyDesiredPlayback]);
  useLayoutEffect(() => {
    desiredPlayingRef.current = playing; desiredPartyRef.current = partyOn;
    desiredSuspendedRef.current = suspendedForVideo; applyDesiredPlayback();
  }, [playing, partyOn, suspendedForVideo, applyDesiredPlayback]);
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
    <div ref={backgroundMountRef} /><div ref={partyMountRef} />
  </div>;
}
