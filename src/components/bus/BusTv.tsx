"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Phase } from "./constants";
import type { JourneyState } from "@/lib/bus-journey";
import { YOUTUBE_ID, THEORY_VIDEO_URL } from "@/lib/theory-video";
import { createInitialCaptionReset, isYouTubePlaybackActive, loadYouTubeIframeApi, type YouTubePlayer } from "@/lib/youtube-player";

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
        <planeGeometry args={[1.26, 0.70875]} />
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
  reducedMotion: boolean;
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
  reducedMotion,
  playbackSuspended,
  onPlaybackChange,
}: BusTvPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mountElement, setMountElement] = useState<HTMLDivElement | null>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const createdPlayerRef = useRef<YouTubePlayer | null>(null);
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
    window.dispatchEvent(new CustomEvent("bus-tv-audio-focus", { detail: active }));
    onPlaybackChange?.(active);
  }, [onPlaybackChange]);
  const desiredRef = useRef({
    tvOn,
    phase,
    hasEntered,
    isMutedForFullscreen,
    playbackSuspended,
  });
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const shaderUniforms = useMemo(() => ({ uVisible: { value: 1.0 } }), []);

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

  const applyDesiredPlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player || warmingRef.current) return;
    const desired = desiredRef.current;
    stopVolumeRamp();
    exitVolumeRef.current = null;
    try {
      if (!desired.hasEntered) {
        player.pauseVideo();
        reportPlayback(false);
        player.seekTo(0, true);
        player.mute();
        return;
      }
      if (partyAudioRef.current) {
        player.pauseVideo();reportPlayback(false);return;
      }
      if (desired.phase === "entering" || !desired.tvOn || desired.isMutedForFullscreen || desired.playbackSuspended) {
        player.pauseVideo();
        reportPlayback(false);
        return;
      }

      // La caméra reste aux yeux au début de la sortie. Son mouvement, suivi
      // dans useFrame, commande ensuite le fondu vers le volume extérieur.
      reportPlayback(true);
      if (desired.phase === "outside") { player.setVolume(25); player.unMute(); }
      else if (desired.phase === "exiting") player.unMute();
      else rampVolume(100, 300);
      player.playVideo();
    } catch {
      reportPlayback(false);
      playerRef.current = null;
      // L'échec peut arriver pendant un effet React ; notifier à la microtâche
      // suivante évite une mise à jour d'état synchrone pendant ce rendu.
      queueMicrotask(() => setApiFailed(true));
    }
  }, [rampVolume, reportPlayback, stopVolumeRamp]);

  useEffect(() => {
    const previous=desiredRef.current;
    if(partyAudioRef.current&&hasEntered&&tvOn&&phase!=="entering"&&(previous.tvOn!==tvOn||previous.hasEntered!==hasEntered||previous.phase!==phase))resumeAfterPartyRef.current=true;
    desiredRef.current = {
      tvOn,
      phase,
      hasEntered,
      isMutedForFullscreen,
      playbackSuspended,
    };
    if (hasEntered && warmingRef.current) {
      warmingRef.current = false;
      if (warmTimerRef.current !== null) {
        window.clearTimeout(warmTimerRef.current);
        warmTimerRef.current = null;
      }
      // Un premier embarquement rapide peut arriver avant la fin du tampon.
      // Revenir au début avant de rendre le préchargement muet audible.
      try { playerRef.current?.seekTo(0, true); } catch { /* API encore en chargement. */ }
    }
    applyDesiredPlayback();
  }, [tvOn, phase, hasEntered, isMutedForFullscreen, playbackSuspended, applyDesiredPlayback]);

  // Certains contrôles intégrés mettent à jour l'état sans émettre d'événement.
  // Une pause ou une fin de vidéo doit néanmoins libérer la musique de fond.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      const desired = desiredRef.current;
      if (!player || warmingRef.current) return;
      try {
        const state = player.getPlayerState();
        if (state === -1 || state === 5) return; // Lecture demandée, encore en préparation.
        const audible = !partyAudioRef.current && desired.hasEntered && desired.tvOn && desired.phase !== "entering"
          && !desired.isMutedForFullscreen && !desired.playbackSuspended;
        reportPlayback(audible && isYouTubePlaybackActive(state, playbackActiveRef.current));
      } catch { /* Le lecteur peut être détruit pendant sa réponse. */ }
    }, 250);
    return () => window.clearInterval(timer);
  }, [reportPlayback]);

  useEffect(() => {
    let cancelled = false;
    if (!mountElement) return;
    const resetInitialCaptions = createInitialCaptionReset();

    void loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !mountElement.isConnected) return;
        createdPlayerRef.current = new YT.Player(mountElement, {
          width: 560,
          height: 315,
          videoId: YOUTUBE_ID,
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            playsinline: 1,
            cc_load_policy: 0,
            iv_load_policy: 3,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              const readyPlayer = event.target;
              resetInitialCaptions(readyPlayer);
              if (
                typeof readyPlayer.playVideo !== "function"
                || typeof readyPlayer.pauseVideo !== "function"
                || typeof readyPlayer.seekTo !== "function"
                || typeof readyPlayer.mute !== "function"
                || typeof readyPlayer.unMute !== "function"
                || typeof readyPlayer.getVolume !== "function"
                || typeof readyPlayer.setVolume !== "function"
                || typeof readyPlayer.getIframe !== "function"
              ) {
                setApiFailed(true);
                return;
              }
              playerRef.current = readyPlayer;
              let iframe: HTMLIFrameElement;
              try {
                iframe = readyPlayer.getIframe();
              } catch {
                playerRef.current = null;
                setApiFailed(true);
                return;
              }
              iframe.id = "tv-primary-iframe";
              iframe.title = "La théorie des Fous du Bus";
              iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen");
              iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
              iframe.style.width = "100%";
              iframe.style.height = "100%";
              iframe.style.border = "0";
              iframe.style.display = "block";

              // Une API prête pendant ou après l'embarquement doit respecter
              // cette phase, sans ajouter un nouveau préchauffage en lecture.
              if (desiredRef.current.hasEntered) {
                warmingRef.current = false;
                if(partyAudioRef.current&&desiredRef.current.tvOn)resumeAfterPartyRef.current=true;
                applyDesiredPlayback();
                return;
              }

              // Précharger le début du flux en muet dès l'arrivée sur le site.
              try {
                readyPlayer.mute();
                readyPlayer.setVolume(0);
                readyPlayer.playVideo();
              } catch {
                playerRef.current = null;
                setApiFailed(true);
                return;
              }
              const deadline = performance.now() + 15000;
              const waitForBuffer = () => {
                warmTimerRef.current = null;
                if (cancelled || !warmingRef.current) return;
                let buffered = false;
                try {
                  const duration = readyPlayer.getDuration();
                  const fraction = readyPlayer.getVideoLoadedFraction?.() ?? 0;
                  buffered = readyPlayer.getPlayerState() === 1 && (duration > 0
                    ? fraction * duration >= Math.min(8, duration)
                    : readyPlayer.getCurrentTime() > 0.5);
                } catch { /* Attendre la prochaine réponse du lecteur. */ }
                if (!buffered && performance.now() < deadline) {
                  warmTimerRef.current = window.setTimeout(waitForBuffer, 200);
                  return;
                }
                if (!desiredRef.current.hasEntered) {
                  try {
                    readyPlayer.pauseVideo();
                    readyPlayer.seekTo(0, true);
                    readyPlayer.mute();
                  } catch {
                    playerRef.current = null;
                    setApiFailed(true);
                    return;
                  }
                }
                warmingRef.current = false;
                applyDesiredPlayback();
              };
              warmTimerRef.current = window.setTimeout(waitForBuffer, 200);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              if (event.data === 1) resetInitialCaptions(event.target);
              const desired = desiredRef.current;
              const audible = !partyAudioRef.current && !warmingRef.current && desired.hasEntered && desired.tvOn
                && desired.phase !== "entering"
                && !desired.isMutedForFullscreen && !desired.playbackSuspended;
              reportPlayback(audible && isYouTubePlaybackActive(event.data, playbackActiveRef.current));
              if (event.data === 1) {
                setAutoplayBlocked(false);
              }
            },
            onAutoplayBlocked: () => {
              if (cancelled) return;
              reportPlayback(false);
              const desired = desiredRef.current;
              if (!partyAudioRef.current && desired.hasEntered && desired.phase !== "entering" && desired.tvOn && !desired.isMutedForFullscreen && !desired.playbackSuspended) {
                setAutoplayBlocked(true);
              }
            },
            onApiChange: (event) => {
              if (!cancelled) resetInitialCaptions(event.target);
            },
            onError: () => {
              if (!cancelled) { reportPlayback(false); setApiFailed(true); }
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) { reportPlayback(false); setApiFailed(true); }
      });

    return () => {
      cancelled = true;
      reportPlayback(false);
      if (warmTimerRef.current !== null) window.clearTimeout(warmTimerRef.current);
      if (volumeTimerRef.current !== null) window.clearTimeout(volumeTimerRef.current);
      createdPlayerRef.current?.destroy?.();
      createdPlayerRef.current = null;
      playerRef.current = null;
    };
  }, [applyDesiredPlayback, mountElement, reportPlayback]);



  useEffect(() => {
    const onPartyFocus = (event: Event) => {
      const active = (event as CustomEvent<boolean>).detail;
      if (active) {
        resumeAfterPartyRef.current = playbackActiveRef.current;
        partyAudioRef.current = true;
        stopVolumeRamp();
        try { playerRef.current?.pauseVideo(); } catch { /* API encore en préparation. */ }
        reportPlayback(false);
      } else {
        partyAudioRef.current = false;
        if (resumeAfterPartyRef.current) applyDesiredPlayback();
        resumeAfterPartyRef.current = false;
      }
    };
    window.addEventListener("bus-party-audio-focus", onPartyFocus);
    return () => window.removeEventListener("bus-party-audio-focus", onPartyFocus);
  }, [applyDesiredPlayback, reportPlayback, stopVolumeRamp]);

  useEffect(() => {
    const onUserPrepare = () => {
      const player = playerRef.current;
      if (!player) return;
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
      } catch {
        reportPlayback(false);
        playerRef.current = null;
        setApiFailed(true);
      }
    };
    const onUserPlay = () => {
      if (!desiredRef.current.hasEntered || desiredRef.current.phase === "entering") return;
      applyDesiredPlayback();
      setAutoplayBlocked(false);
    };
    window.addEventListener("bus-tv-user-prepare", onUserPrepare);
    window.addEventListener("bus-tv-user-play", onUserPlay);
    return () => {
      window.removeEventListener("bus-tv-user-prepare", onUserPrepare);
      window.removeEventListener("bus-tv-user-play", onUserPlay);
    };
  }, [applyDesiredPlayback, reportPlayback, stopVolumeRamp]);

  useFrame(({ camera }) => {
    const desired = desiredRef.current;
    const trip = journey.current;
    if (!partyAudioRef.current && desired.phase === "exiting" && trip.phase === "exiting" && desired.hasEntered
      && desired.tvOn && !desired.isMutedForFullscreen && !desired.playbackSuspended && !warmingRef.current) {
      const volume = Math.round(25 + 75 * trip.cameraBlend);
      if (volume !== exitVolumeRef.current && playerRef.current) {
        try {
          playerRef.current.setVolume(volume);
          exitVolumeRef.current = volume;
        } catch { /* Le lecteur peut être détruit entre deux images. */ }
      }
    }
    const visible = tvOn && !partyAudioRef.current && !isMutedForFullscreen && !warmingRef.current;
    if (shaderMatRef.current?.uniforms?.uVisible) {
      shaderMatRef.current.uniforms.uVisible.value = visible ? 1.0 : 0.0;
    }
    if (!containerRef.current) return;

    const isBehindTv = phase !== "inside" && camera.position.z < pos[2] + 0.04;
    const nextVisibility = visible && !isBehindTv ? "visible" : "hidden";
    if (containerRef.current.style.visibility !== nextVisibility) {
      containerRef.current.style.visibility = nextVisibility;
    }
  });

  return (
    <group position={pos}>
      <Html
        transform
        pointerEvents={tvOn && phase === "inside" && !isMutedForFullscreen ? "auto" : "none"}
        occlude="blending"
        zIndexRange={[10, 0]}
        geometry={<planeGeometry args={[1.26, 0.70875]} />}
        material={
          <shaderMaterial
            ref={shaderMatRef}
            transparent
            blending={THREE.NoBlending}
            side={THREE.DoubleSide}
            depthTest
            depthWrite={false}
            uniforms={shaderUniforms}
            vertexShader={`
              void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              uniform float uVisible;
              void main() {
                if (uVisible < 0.5) discard;
                gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
              }
            `}
          />
        }
        distanceFactor={400}
        position={[0, 0, 0.054]}
        scale={0.00225}
        style={{
          userSelect: "none",
        }}
      >
        <div
          ref={containerRef}
          id="tv-frame"
          style={{
            position: "relative",
            width: 560,
            height: 315,
            background: "#000",
            overflow: "hidden",
            opacity: tvOn && !isMutedForFullscreen ? 1 : 0,
            visibility: tvOn && !isMutedForFullscreen ? "visible" : "hidden",
            transition: reducedMotion ? "none" : "opacity 0.2s ease",
          }}
        >
          <div ref={setMountElement} data-bus-youtube-player style={{ width: "100%", height: "100%" }} />
          {autoplayBlocked && !apiFailed && tvOn && hasEntered && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("bus-tv-user-play"))}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 3,
                display: "grid",
                placeItems: "center",
                border: 0,
                background: "rgba(2, 6, 23, 0.82)",
                color: "#ffd23f",
                fontSize: 34,
                fontWeight: 900,
                cursor: "pointer",
              }}
              aria-label="Lancer la vidéo"
            >
              ▶ Lancer la vidéo
            </button>
          )}
          {apiFailed && tvOn && hasEntered && (
            <a
              href={THEORY_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Voir la vidéo sur YouTube"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 3,
                display: "grid",
                placeItems: "center",
                background: "rgba(2, 6, 23, 0.88)",
                color: "#ffd23f",
                fontSize: 30,
                fontWeight: 900,
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              ▶ Voir sur YouTube
            </a>
          )}
        </div>
      </Html>
    </group>
  );
}
