"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Phase } from "./constants";
import type { JourneyState } from "@/lib/bus-journey";
import { YOUTUBE_ID, THEORY_VIDEO_URL } from "@/lib/theory-video";
import { createInitialCaptionReset, isYouTubePlaybackActive, mountYouTubePlayer, type YouTubePlayer } from "@/lib/youtube-player";
import { emitBusAudioEvent, getFreeViewTvVolume, onBusAudioEvent, OUTSIDE_TV_VOLUME } from "@/lib/bus-audio";
import { getLocale, pickLocale, useLocale } from "@/lib/i18n";
import BusPartyTv from "./BusPartyTv";
import BusTvScreen, { TV_SCREEN_WIDTH, TV_SCREEN_HEIGHT } from "./BusTvScreen";

interface BusTvFrameProps {
  pos: [number, number, number];
  idx: number;
  tvOn: boolean;
  isActive: boolean;
  visible?: boolean;
  mats: Record<string, THREE.Material>;
  tvOffTex: THREE.CanvasTexture;
  posterTex: THREE.Texture;
  partyCards: THREE.Texture[] | null;
  reducedMotion: boolean;
}

/** Regroupe les boîtiers + écrans des N télés en 6 draw calls instanciés (même avec 40+ télés toutes les 4 rangées). */
export const BusTvHousings = memo(function BusTvHousings({
  positions,
  mats,
  tvOn = false,
  activeIdx = 0,
  tvOffTex,
  posterTex,
  hideScreens = false,
}: {
  positions: Array<[number, number, number]>;
  mats: Record<string, THREE.Material>;
  tvOn?: boolean;
  activeIdx?: number;
  tvOffTex?: THREE.CanvasTexture;
  posterTex?: THREE.Texture;
  hideScreens?: boolean;
}) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const backRef = useRef<THREE.InstancedMesh>(null);
  const frameRef = useRef<THREE.InstancedMesh>(null);
  const mountRef = useRef<THREE.InstancedMesh>(null);
  const bezelRef = useRef<THREE.InstancedMesh>(null);
  const screenRef = useRef<THREE.InstancedMesh>(null);
  const count = positions.length;

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const sets: Array<[React.RefObject<THREE.InstancedMesh | null>, number, number, number]> = [
      [bodyRef, 0, 0, 0],
      [backRef, 0, 0, -0.041],
      [frameRef, 0, 0, 0.041],
      [mountRef, 0, 0.52, -0.08],
      // Devant la face avant du cadre jaune (0.041 + 0.005 = 0.046) pour rester noir tant que la vidéo ne tourne pas.
      [bezelRef, 0, 0, 0.049],
    ];
    for (const [ref, ox, oy, oz] of sets) {
      const mesh = ref.current;
      if (!mesh) continue;
      for (let i = 0; i < count; i++) {
        const [x, y, z] = positions[i];
        mesh.setMatrixAt(i, m.makeTranslation(x + ox, y + oy, z + oz));
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    const screen = screenRef.current;
    if (screen) {
      for (let i = 0; i < count; i++) {
        if (tvOn && i === activeIdx) {
          screen.setMatrixAt(i, zero);
        } else {
          const [x, y, z] = positions[i];
          screen.setMatrixAt(i, m.makeTranslation(x, y, z + 0.053));
        }
      }
      screen.count = count;
      screen.instanceMatrix.needsUpdate = true;
      screen.computeBoundingSphere();
    }
  }, [activeIdx, count, positions, tvOn]);

  if (!count) return null;
  // Capacité par paliers de 32 pour éviter de détruire/recréer les 6 InstancedMesh quand la fenêtre glisse.
  const capacity = Math.max(32, Math.ceil(count / 32) * 32);
  // Les écrans éteints ou non actifs restent bien noirs (tvOffTex) au lieu d'afficher l'affiche orange.
  const screenMap = tvOffTex ?? posterTex;
  return (
    <group name="bus-tv-housings">
      <instancedMesh key={`tv-body-${capacity}`} ref={bodyRef} args={[undefined, undefined, capacity]} count={count} material={mats.dark} castShadow raycast={() => null}>
        <boxGeometry args={[1.36, 0.82, 0.08]} />
      </instancedMesh>
      <instancedMesh key={`tv-back-${capacity}`} ref={backRef} args={[undefined, undefined, capacity]} count={count} raycast={() => null}>
        <planeGeometry args={[1.34, 0.8]} />
        <meshStandardMaterial color="#0c1017" roughness={0.7} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh key={`tv-frame-${capacity}`} ref={frameRef} args={[undefined, undefined, capacity]} count={count} material={mats.yellow} raycast={() => null}>
        <boxGeometry args={[1.34, 0.8, 0.01]} />
      </instancedMesh>
      <instancedMesh key={`tv-mount-${capacity}`} ref={mountRef} args={[undefined, undefined, capacity]} count={count} material={mats.seatFrame} raycast={() => null}>
        <boxGeometry args={[0.16, 0.45, 0.16]} />
      </instancedMesh>
      <instancedMesh key={`tv-bezel-${capacity}`} ref={bezelRef} args={[undefined, undefined, capacity]} count={count} raycast={() => null}>
        <planeGeometry args={[1.28, 0.73]} />
        <meshBasicMaterial color="#05070c" side={THREE.DoubleSide} />
      </instancedMesh>
      {screenMap && (
        <instancedMesh
          key={`tv-screen-${capacity}`}
          ref={screenRef}
          args={[undefined, undefined, capacity]}
          count={count}
          visible={!hideScreens}
          raycast={() => null}
        >
          <planeGeometry args={[TV_SCREEN_WIDTH, TV_SCREEN_HEIGHT]} />
          <meshStandardMaterial
            key={tvOn ? "tv-on" : "tv-off"}
            map={screenMap}
            color="#05070b"
            emissive="#000000"
            emissiveIntensity={0}
            roughness={0.25}
            metalness={0.8}
            toneMapped={false}
          />
        </instancedMesh>
      )}
    </group>
  );
});

export function BusTvFrame({
  pos,
  idx,
  tvOn,
  isActive,
  visible = true,
  mats,
  tvOffTex,
  posterTex,
  partyCards,
  reducedMotion,
  withHousing = true,
}: BusTvFrameProps & { withHousing?: boolean }) {
  const showPoster = tvOn && !partyCards && !isActive;
  return (
    <group name="bus-tv-frame" userData={{ index: idx }} position={pos} visible={visible}>
      {withHousing && (
        <>
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
          <mesh position={[0, 0, 0.049]}>
            <planeGeometry args={[1.28, 0.73]} />
            <meshBasicMaterial color="#05070c" side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
      {partyCards ? <BusPartyTv cards={partyCards} index={idx} reducedMotion={reducedMotion} /> : (
        <mesh name="bus-tv-display" position={[0, 0, 0.053]}>
          <planeGeometry args={[TV_SCREEN_WIDTH, TV_SCREEN_HEIGHT]} />
          <meshStandardMaterial
            map={showPoster ? posterTex : tvOffTex}
            color={showPoster ? "#ffffff" : "#05070b"}
            emissive="#ffffff"
            emissiveMap={showPoster ? posterTex : tvOffTex}
            emissiveIntensity={showPoster ? 0.65 : 0}
            roughness={tvOn ? 0.35 : 0.25}
            metalness={tvOn ? 0.1 : 0.8}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

interface BusTvPlayerProps {
  pos: [number, number, number];
  tvOn: boolean;
  partyOn?: boolean;
  phase: Phase;
  freeView: boolean;
  busGroup: React.RefObject<THREE.Group | null>;
  visitCameraRef: React.RefObject<THREE.Camera | null>;
  rearWallZ: number;
  hasEntered: boolean;
  journey: React.RefObject<JourneyState>;
  isMutedForFullscreen: boolean;
  playbackSuspended: boolean;
  onPlaybackChange?: (active: boolean) => void;
}

export const BusTvPlayer = memo(function BusTvPlayer({
  pos,
  tvOn,
  partyOn = false,
  phase,
  freeView,
  busGroup,
  visitCameraRef,
  rearWallZ,
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
  const dynamicVolume = useRef({ sent: null as number | null, nextUpdateAt: 0, listener: new THREE.Vector3() });
  const warmingRef = useRef(true);
  const playbackActiveRef = useRef(false);
  const partyAudioRef = useRef(false);
  const resumeAfterPartyRef = useRef(false);
  const manualPauseRef = useRef(false);
  const endedRef = useRef(false);
  const reportPlayback = useCallback((active: boolean) => {
    if (playbackActiveRef.current === active) return;
    playbackActiveRef.current = active;
    emitBusAudioEvent("tvFocus", active);
    onPlaybackChange?.(active);
  }, [onPlaybackChange]);
  const desiredRef = useRef({
    tvOn,
    partyOn,
    phase,
    freeView,
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
    manualPauseRef.current = false;
    endedRef.current = false;
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
    return !partyAudioRef.current && !desired.partyOn && desired.hasEntered && desired.tvOn
      && desired.phase === "inside"
      && !desired.isMutedForFullscreen && !desired.playbackSuspended;
  }, []);

  const applyDesiredPlayback = useCallback((fromClick = false) => {
    const player = playerRef.current;
    if (!player || warmingRef.current) return;
    const desired = desiredRef.current;
    if (fromClick) endedRef.current = false;
    try {
      if (!shouldPlay() || (!fromClick && (manualPauseRef.current || endedRef.current))) {
        clearStartTimer();
        stopVolumeRamp();
        if (!shouldPlay()) {
          player.mute();
          player.pauseVideo();
        }
        reportPlayback(false);
        return;
      }
      const playing = player.getPlayerState() === 1;
      if (fromClick) setPlayerStatus(playing ? "ready" : "loading");
      if (startTimerRef.current !== null && !fromClick && !playing) return;
      clearStartTimer();
      stopVolumeRamp();
      dynamicVolume.current.sent = null;
      dynamicVolume.current.nextUpdateAt = 0;
      // Reserve sound before unmuting, only once the iframe can take commands.
      // A refusal or a missing playback event releases it below.
      reportPlayback(true);
      if (desired.phase === "outside") { player.setVolume(OUTSIDE_TV_VOLUME); player.unMute(); }
      else if (desired.phase === "exiting" || desired.freeView) player.unMute();
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
    if (!previous.tvOn && tvOn) {
      manualPauseRef.current = false;
      endedRef.current = false;
    }
    if (partyAudioRef.current && hasEntered && tvOn && phase !== "entering"
      && (previous.tvOn !== tvOn || previous.hasEntered !== hasEntered || previous.phase !== phase)) {
      resumeAfterPartyRef.current = true;
    }
    desiredRef.current = { tvOn, partyOn, phase, freeView, hasEntered, isMutedForFullscreen, playbackSuspended };
    if (hasEntered && warmingRef.current) {
      stopWarmup();
      try { playerRef.current?.seekTo(0, true); } catch { queueMicrotask(failPlayer); return; }
    }
    applyDesiredPlayback();
  }, [tvOn, partyOn, phase, freeView, hasEntered, isMutedForFullscreen, playbackSuspended, applyDesiredPlayback, stopWarmup, failPlayer]);

  // A pending start can reserve audio only for the bounded start attempt.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!playerRef.current || warmingRef.current) return;
      if (manualPauseRef.current || endedRef.current) {
        reportPlayback(false);
        return;
      }
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
      title: pickLocale(getLocale(), "La théorie des Fous du Bus", "The Bus Fools Theory"),
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
          if (data === 0) {
            endedRef.current = true;
            clearStartTimer();
            stopVolumeRamp();
            reportPlayback(false);
            return;
          }
          if (data === 1) {
            endedRef.current = false;
            resetInitialCaptions(target);
            if (!warmingRef.current && shouldPlay()) {
              manualPauseRef.current = false;
            }
            if (shouldPlay()) {
              clearStartTimer();
              setPlayerStatus("ready");
            }
          } else if (data === 2 && !warmingRef.current && shouldPlay() && startTimerRef.current === null) {
            manualPauseRef.current = true;
            clearStartTimer();
            stopVolumeRamp();
            reportPlayback(false);
            return;
          }
          if (startTimerRef.current !== null && shouldPlay()) return;
          reportPlayback(!warmingRef.current && !manualPauseRef.current && !endedRef.current && shouldPlay() && isYouTubePlaybackActive(data, playbackActiveRef.current));
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
  }, [applyDesiredPlayback, clearStartTimer, failPlayer, mountElement, reportPlayback, shouldPlay, stopVolumeRamp, stopWarmup]);

  useEffect(() => {
    if (desiredRef.current.hasEntered || desiredRef.current.phase !== "outside") {
      connectPlayer();
    }
    return stopPlayer;
  }, [connectPlayer, stopPlayer]);

  useEffect(() => {
    if (hasEntered || phase !== "outside") {
      connectPlayer();
    }
  }, [hasEntered, phase, connectPlayer]);

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
      manualPauseRef.current = false;
      endedRef.current = false;
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
      if (enabled) {
        manualPauseRef.current = false;
        endedRef.current = false;
        onUserPlay();
      }
      else applyDesiredPlayback();
    });
    return () => { stopPrepare(); stopPlay(); stopToggle(); };
  }, [applyDesiredPlayback, connectPlayer, failPlayer, reportPlayback, shouldPlay, stopVolumeRamp]);

  useFrame(({ camera }) => {
    const desired = desiredRef.current;
    const trip = journey.current;
    const player = playerRef.current;
    if (!player || !shouldPlay() || warmingRef.current || manualPauseRef.current || endedRef.current) return;
    const state = dynamicVolume.current;
    let volume: number;
    if (desired.phase === "exiting" && trip.phase === "exiting") {
      volume = Math.round(OUTSIDE_TV_VOLUME + (100 - OUTSIDE_TV_VOLUME) * trip.cameraBlend);
    } else if (desired.phase === "inside" && desired.freeView && busGroup.current) {
      const now = performance.now();
      if (now < state.nextUpdateAt) return;
      state.nextUpdateAt = now + 80;
      // Le mur des messages a sa propre caméra. Le son suit la caméra de visite.
      const listener = visitCameraRef.current ?? camera;
      busGroup.current.worldToLocal(listener.getWorldPosition(state.listener));
      volume = getFreeViewTvVolume(state.listener.x, state.listener.y, state.listener.z, rearWallZ);
    } else return;
    if (volume === state.sent) return;
    try {
      player.setVolume(volume);
      state.sent = volume;
    } catch { /* The iframe may be changing state. */ }
  });

  const handleActivate = useCallback(() => {
    endedRef.current = false;
    manualPauseRef.current = false;
    emitBusAudioEvent("tvPlay");
  }, []);

  const locale = useLocale();
  const isScreenOn = useCallback(() => shouldPlay() && !warmingRef.current, [shouldPlay]);
  const interactive = tvOn && phase === "inside" && !freeView && !partyOn && !isMutedForFullscreen;
  const showRetry = playerStatus === "blocked" || playerStatus === "error";

  return <group position={pos}>
    <BusTvScreen isOn={isScreenOn} interactive={interactive}>
      <div ref={setMountElement} data-bus-youtube-player style={{ width: "100%", height: "100%" }} />
      {showRetry && (
        <div
          data-bus-tv-overlay=""
          style={{ pointerEvents: "none" }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#070b24] px-6 py-4 text-center text-white sm:gap-4"
        >
          <p className="max-w-[440px] text-base font-bold leading-snug text-[#dfe5ff] sm:text-xl">
            {playerStatus === "blocked"
              ? pickLocale(locale, "La lecture automatique a été bloquée.", "Autoplay was blocked.")
              : pickLocale(locale, "Le lecteur vidéo ne répond pas.", "The video player is not responding.")}
          </p>
          <button
            type="button"
            style={{ pointerEvents: interactive ? "auto" : "none" }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleActivate}
            aria-label={playerStatus === "blocked"
              ? pickLocale(locale, "Lancer la vidéo", "Play video")
              : pickLocale(locale, "Réessayer la vidéo", "Retry video")}
            className="bus-btn-primary inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-6 py-2.5 text-lg font-semibold focus-visible:outline-none sm:px-7 sm:py-3 sm:text-2xl"
          >
            {playerStatus === "blocked"
              ? pickLocale(locale, "Lancer la vidéo", "Play video")
              : pickLocale(locale, "Réessayer la vidéo", "Retry video")}
          </button>
          {playerStatus === "error" && (
            <a
              href={THEORY_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ pointerEvents: interactive ? "auto" : "none" }}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-1.5 text-base font-semibold text-[#c4b5fd] underline underline-offset-4 hover:text-white focus-visible:outline-none sm:text-xl"
            >
              {pickLocale(locale, "Voir la vidéo sur YouTube", "Watch on YouTube")}
            </a>
          )}
        </div>
      )}
    </BusTvScreen>
  </group>;
});
