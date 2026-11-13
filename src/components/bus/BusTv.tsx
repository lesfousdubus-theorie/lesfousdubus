"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Phase } from "./constants";
import type { JourneyState } from "@/lib/bus-journey";
import { YOUTUBE_ID, THEORY_VIDEO_URL } from "@/lib/theory-video";
import { createInitialCaptionReset, isYouTubePlaybackActive, mountYouTubePlayer, type YouTubePlayer } from "@/lib/youtube-player";
import { emitBusAudioEvent, onBusAudioEvent } from "@/lib/bus-audio";
import BusTvScreen, { TV_SCREEN_WIDTH, TV_SCREEN_HEIGHT } from "./BusTvScreen";

interface BusTvFrameProps {
  pos: [number, number, number];
  idx: number;
  tvOn: boolean;
  isActive: boolean;
  visible: boolean;
  mats: Record<string, THREE.Material>;
  tvOffTex: THREE.CanvasTexture;
  posterTex: THREE.Texture;
}

export function BusTvFrame({
  pos,
  idx,
  tvOn,
  isActive,
  visible,
  mats,
  tvOffTex,
  posterTex,
}: BusTvFrameProps) {
  return (
    <group name="bus-tv-frame" userData={{ index: idx }} key={`tv-frame-${idx}-${pos[2]}`} position={pos} visible={visible}>
      <mesh material={mats.dark} castShadow>
        <boxGeometry args={[1.36, 0.82, 0.08]} />
      </mesh>
      <mesh position={[0, 0, -0.041]}>
        <planeGeometry args={[1.34, 0.8]} />
        <meshStandardMaterial color="#0c1017" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh material={mats.yellow} position={[0, 0, 0.041]}>
        <boxGeometry args={[1.34, 0.8, 0.01]} />
      </mesh>
      <mesh material={mats.seatFrame} position={[0, 0.52, -0.08]}>
        <boxGeometry args={[0.16, 0.45, 0.16]} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[1.28, 0.73]} />
        <meshBasicMaterial color="#05070c" side={THREE.DoubleSide} />
      </mesh>
      <mesh name="bus-tv-display" position={[0, 0, 0.053]}>
        <planeGeometry args={[TV_SCREEN_WIDTH, TV_SCREEN_HEIGHT]} />
        <meshStandardMaterial
          map={tvOn ? posterTex : tvOffTex}
          color={tvOn ? "#ffffff" : "#05070b"}
          emissive="#ffffff"
          emissiveMap={tvOn ? posterTex : tvOffTex}
          emissiveIntensity={tvOn ? (isActive ? 0.52 : 0.32) : 0}
          roughness={tvOn ? 0.42 : 0.25}
          metalness={tvOn ? 0.06 : 0.8}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.48, 0.275, 0.058]} visible={tvOn && !isActive}>
        <planeGeometry args={[0.18, 0.07]} />
        <meshBasicMaterial color="#cc1f2f" toneMapped={false} />
      </mesh>
    </group>
  );
}

interface BusTvPlayerProps {
  pos: [number, number, number];
  tvOn: boolean;
  phase: Phase;
  hasEntered: boolean;
  journey: React.RefObject<JourneyState>;
  isMutedForFullscreen: boolean;
  playbackSuspended: boolean;
  onPlaybackChange?: (active: boolean) => void;
}

export function BusTvPlayer({
  pos,
  tvOn,
  phase,
  hasEntered,
  journey,
  isMutedForFullscreen,
  playbackSuspended,
  onPlaybackChange,
}: BusTvPlayerProps) {
  const [mountElement, setMountElement] = useState<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);
  const startTimerRef = useRef<number | null>(null);
  const warmTimerRef = useRef<number | null>(null);
  const volumeTimerRef = useRef<number | null>(null);
  const exitVolumeRef = useRef<number | null>(null);
  const warmingRef = useRef(true);
  const playbackActiveRef = useRef(false);
  const partyAudioRef = useRef(false);
  const resumeAfterPartyRef = useRef(false);
  const reportPlayback = useCallback((active: boolean) => {
    if (playbackActiveRef.current === active) return;
    playbackActiveRef.current = active;
    emitBusAudioEvent("tvFocus", active);
    onPlaybackChange?.(active);
  }, [onPlaybackChange]);
  const desiredRef = useRef({
    tvOn,
    phase,
    hasEntered,
    isMutedForFullscreen,
    playbackSuspended,
  });
  const [playerStatus, setPlayerStatus] = useState<"loading" | "ready" | "blocked" | "error">("loading");

  const stopVolumeRamp = useCallback(() => {
    if (volumeTimerRef.current !== null) window.clearTimeout(volumeTimerRef.current);
    volumeTimerRef.current = null;
  }, []);

  const rampVolume = useCallback((target: number, duration = 650) => {
    const player = playerRef.current;
    if (!player) return;
    if (volumeTimerRef.current !== null) window.clearTimeout(volumeTimerRef.current);

    let from = target;
    try {
      from = player.getVolume();
      player.unMute();
    } catch {
      return;
    }

    const startedAt = performance.now();
    const tick = () => {
      const activePlayer = playerRef.current;
      if (!activePlayer) {
        volumeTimerRef.current = null;
        return;
      }
      const progress = Math.min(1, (performance.now() - startedAt) / Math.max(1, duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      try {
        activePlayer.setVolume(Math.round(from + (target - from) * eased));
      } catch {
        volumeTimerRef.current = null;
        return;
      }
      if (progress < 1) {
        volumeTimerRef.current = window.setTimeout(tick, 50);
      } else {
        volumeTimerRef.current = null;
      }
    };
    volumeTimerRef.current = window.setTimeout(tick, 50);
  }, []);

  const clearStartTimer = useCallback(() => {
    if (startTimerRef.current !== null) window.clearTimeout(startTimerRef.current);
    startTimerRef.current = null;
  }, []);

  const stopWarmup = useCallback(() => {
    if (warmTimerRef.current !== null) window.clearTimeout(warmTimerRef.current);
    warmTimerRef.current = null;
    warmingRef.current = false;
  }, []);

  const stopPlayer = useCallback(() => {
    clearStartTimer();
    stopWarmup();
    stopVolumeRamp();
    disconnectRef.current?.();
    disconnectRef.current = null;
    playerRef.current = null;
    reportPlayback(false);
  }, [clearStartTimer, reportPlayback, stopVolumeRamp, stopWarmup]);

  const failPlayer = useCallback(() => {
    stopPlayer();
    setPlayerStatus("error");
  }, [stopPlayer]);

  const shouldPlay = useCallback(() => {
    const desired = desiredRef.current;
    return !partyAudioRef.current && desired.hasEntered && desired.tvOn && desired.phase !== "entering"
      && !desired.isMutedForFullscreen && !desired.playbackSuspended;
  }, []);

  const applyDesiredPlayback = useCallback((fromClick = false) => {
    const player = playerRef.current;
    if (!player || warmingRef.current) return;
    const desired = desiredRef.current;
    try {
      if (!shouldPlay()) {
        clearStartTimer();
        stopVolumeRamp();
        player.mute();
        player.pauseVideo();
        reportPlayback(false);
        return;
      }
      const playing = player.getPlayerState() === 1;
      if (fromClick) setPlayerStatus(playing ? "ready" : "loading");
      if (startTimerRef.current !== null && !fromClick && !playing) return;
      clearStartTimer();
      stopVolumeRamp();
      exitVolumeRef.current = null;
      // Reserve sound before unmuting, only once the iframe can take commands.
      // A refusal or a missing playback event releases it below.
      reportPlayback(true);
      if (desired.phase === "outside") { player.setVolume(25); player.unMute(); }
      else if (desired.phase === "exiting") player.unMute();
      else rampVolume(100, 300);
      if (playing) return;
      startTimerRef.current = window.setTimeout(() => {
        startTimerRef.current = null;
        try {
          if (!shouldPlay() || playerRef.current !== player || player.getPlayerState() === 1) return;
          reportPlayback(false);
          setPlayerStatus("blocked");
        } catch { failPlayer(); }
      }, 10_000);
      player.playVideo();
    } catch { failPlayer(); }
  }, [clearStartTimer, failPlayer, rampVolume, reportPlayback, shouldPlay, stopVolumeRamp]);

  useEffect(() => {
    const previous = desiredRef.current;
    if (partyAudioRef.current && hasEntered && tvOn && phase !== "entering"
      && (previous.tvOn !== tvOn || previous.hasEntered !== hasEntered || previous.phase !== phase)) {
      resumeAfterPartyRef.current = true;
    }
    desiredRef.current = { tvOn, phase, hasEntered, isMutedForFullscreen, playbackSuspended };
    if (hasEntered && warmingRef.current) {
      stopWarmup();
      try { playerRef.current?.seekTo(0, true); } catch { queueMicrotask(failPlayer); return; }
    }
    applyDesiredPlayback();
  }, [tvOn, phase, hasEntered, isMutedForFullscreen, playbackSuspended, applyDesiredPlayback, stopWarmup, failPlayer]);

  // A pending start can reserve audio only for the bounded start attempt.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!playerRef.current || warmingRef.current) return;
      try {
        const state = playerRef.current.getPlayerState();
        if (state === 1 && shouldPlay()) clearStartTimer();
        if (startTimerRef.current !== null && shouldPlay()) return;
        reportPlayback(shouldPlay() && isYouTubePlaybackActive(state, playbackActiveRef.current));
      } catch { /* The iframe may be changing state. */ }
    }, 250);
    return () => window.clearInterval(timer);
  }, [clearStartTimer, reportPlayback, shouldPlay]);

  const connectPlayer = useCallback(() => {
    if (!mountElement || disconnectRef.current) return;
    warmingRef.current = !desiredRef.current.hasEntered;
    const resetInitialCaptions = createInitialCaptionReset();
    disconnectRef.current = mountYouTubePlayer(mountElement, {
      id: "tv-primary-iframe",
      title: "La théorie des Fous du Bus",
      allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen",
      width: 560,
      height: 315,
      videoId: YOUTUBE_ID,
      playerVars: { autoplay: 0, controls: 1, rel: 0, playsinline: 1, cc_load_policy: 0, iv_load_policy: 3 },
      onUnavailable: failPlayer,
      events: {
        onReady: ({ target }) => {
          resetInitialCaptions(target);
          playerRef.current = target;
          setPlayerStatus("ready");
          if (desiredRef.current.hasEntered) {
            stopWarmup();
            if (partyAudioRef.current && desiredRef.current.tvOn) resumeAfterPartyRef.current = true;
            applyDesiredPlayback();
            return;
          }

          // Prepare the opening in silence when the browser allows it.
          target.mute();
          target.setVolume(0);
          const deadline = performance.now() + 15_000;
          const waitForBuffer = () => {
            if (!warmingRef.current) return;
            try {
              const duration = target.getDuration();
              const buffered = (target.getVideoLoadedFraction?.() ?? 0) * duration;
              if (target.getPlayerState() === 1 && buffered >= Math.min(8, duration || 8)
                || performance.now() >= deadline) {
                stopWarmup();
                target.mute();
                target.pauseVideo();
                target.seekTo(0, true);
                return;
              }
              warmTimerRef.current = window.setTimeout(waitForBuffer, 200);
            } catch { failPlayer(); }
          };
          warmTimerRef.current = window.setTimeout(waitForBuffer, 200);
          target.playVideo();
        },
        onStateChange: ({ target, data }) => {
          if (data === 1) {
            resetInitialCaptions(target);
            if (shouldPlay()) {
              clearStartTimer();
              setPlayerStatus("ready");
            }
          }
          if (startTimerRef.current !== null && shouldPlay()) return;
          reportPlayback(!warmingRef.current && shouldPlay() && isYouTubePlaybackActive(data, playbackActiveRef.current));
        },
        onAutoplayBlocked: () => {
          if (warmingRef.current) stopWarmup();
          clearStartTimer();
          reportPlayback(false);
          if (shouldPlay()) setPlayerStatus("blocked");
        },
        onApiChange: ({ target }) => resetInitialCaptions(target),
        onError: failPlayer,
      },
    });
  }, [applyDesiredPlayback, clearStartTimer, failPlayer, mountElement, reportPlayback, shouldPlay, stopWarmup]);

  useEffect(() => {
    connectPlayer();
    return stopPlayer;
  }, [connectPlayer, stopPlayer]);

  useEffect(() => onBusAudioEvent("partyFocus", active => {
    if (active) {
      resumeAfterPartyRef.current = playbackActiveRef.current || startTimerRef.current !== null;
      partyAudioRef.current = true;
      applyDesiredPlayback();
    } else {
      partyAudioRef.current = false;
      if (resumeAfterPartyRef.current) applyDesiredPlayback();
      resumeAfterPartyRef.current = false;
    }
  }), [applyDesiredPlayback]);

  useEffect(() => {
    const onUserPrepare = () => {
      const player = playerRef.current;
      if (!player) { connectPlayer(); return; }
      stopVolumeRamp();
      try {
        player.mute();
        player.setVolume(0);
        player.playVideo();
        if (!warmingRef.current) {
          player.pauseVideo();
          if (!desiredRef.current.hasEntered) player.seekTo(0, true);
        }
        reportPlayback(false);
      } catch { failPlayer(); }
    };
    const onUserPlay = () => {
      if (!shouldPlay()) return;
      if (!disconnectRef.current) {
        setPlayerStatus("loading");
        connectPlayer();
      } else if (!playerRef.current) {
        setPlayerStatus("loading");
      }
      if (playerRef.current) applyDesiredPlayback(true);
    };
    const stopPrepare = onBusAudioEvent("tvPrepare", onUserPrepare);
    const stopPlay = onBusAudioEvent("tvPlay", onUserPlay);
    const stopToggle = onBusAudioEvent("tvToggle", enabled => {
      desiredRef.current.tvOn = enabled;
      if (enabled) onUserPlay();
      else applyDesiredPlayback();
    });
    return () => { stopPrepare(); stopPlay(); stopToggle(); };
  }, [applyDesiredPlayback, connectPlayer, failPlayer, reportPlayback, shouldPlay, stopVolumeRamp]);

  useFrame(() => {
    const desired = desiredRef.current;
    const trip = journey.current;
    if (!shouldPlay() || desired.phase !== "exiting" || trip.phase !== "exiting" || warmingRef.current) return;
    const volume = Math.round(25 + 75 * trip.cameraBlend);
    if (volume === exitVolumeRef.current || !playerRef.current) return;
    try {
      playerRef.current.setVolume(volume);
      exitVolumeRef.current = volume;
    } catch { /* The iframe may be changing state. */ }
  });

  const isScreenOn = useCallback(() => shouldPlay() && !warmingRef.current, [shouldPlay]);
  const showRetry = playerStatus === "blocked" || playerStatus === "error";

  return <group position={pos}>
    <BusTvScreen isOn={isScreenOn} interactive={tvOn && phase === "inside" && !isMutedForFullscreen}>
      <div ref={setMountElement} data-bus-youtube-player style={{ width: "100%", height: "100%" }} />
      {showRetry && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#07142b] text-center text-white">
          <button type="button" onClick={() => emitBusAudioEvent("tvPlay")}
            aria-label={playerStatus === "blocked" ? "Lancer la vidéo" : "Réessayer la vidéo"}
            className="rounded-full bg-[#ffd23f] px-7 py-3 text-[30px] font-black text-[#07142b] focus-visible:outline-4 focus-visible:outline-white">
            {playerStatus === "blocked" ? "Lancer la vidéo" : "Réessayer la vidéo"}
          </button>
          {playerStatus === "error" && <a href={THEORY_VIDEO_URL} target="_blank" rel="noopener noreferrer"
            className="text-[23px] font-bold underline focus-visible:outline-4 focus-visible:outline-white">
            Voir la vidéo sur YouTube
          </a>}
        </div>
      )}
    </BusTvScreen>
  </group>;
}
