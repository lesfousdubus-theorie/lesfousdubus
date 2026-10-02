"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Phase } from "./constants";
import { YOUTUBE_ID, THEORY_VIDEO_URL } from "@/lib/theory-video";
import { loadYouTubeIframeApi, type YouTubePlayer } from "@/lib/youtube-player";

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
    <group key={`tv-frame-${idx}-${pos[2]}`} position={pos} visible={visible}>
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
      <mesh position={[0, 0, 0.053]}>
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
  isMutedForFullscreen: boolean;
  reducedMotion: boolean;
  playbackSuspended: boolean;
  audioMuted: boolean;
}

export function BusTvPlayer({
  pos,
  tvOn,
  phase,
  hasEntered,
  isMutedForFullscreen,
  reducedMotion,
  playbackSuspended,
  audioMuted,
}: BusTvPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mountElement, setMountElement] = useState<HTMLDivElement | null>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const createdPlayerRef = useRef<YouTubePlayer | null>(null);
  const warmTimerRef = useRef<number | null>(null);
  const volumeTimerRef = useRef<number | null>(null);
  const warmingRef = useRef(true);
  const desiredRef = useRef({
    tvOn,
    phase,
    hasEntered,
    isMutedForFullscreen,
    playbackSuspended,
    audioMuted,
  });
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const shaderUniforms = useMemo(() => ({ uVisible: { value: 1.0 } }), []);

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
    try {
      if (!desired.hasEntered) {
        player.pauseVideo();
        player.seekTo(0, true);
        player.mute();
        return;
      }
      if (!desired.tvOn || desired.isMutedForFullscreen || desired.playbackSuspended) {
        player.pauseVideo();
        return;
      }

      const targetVolume = desired.phase === "outside" || desired.phase === "exiting" ? 25 : 100;
      if (desired.audioMuted) {
        if (volumeTimerRef.current !== null) window.clearTimeout(volumeTimerRef.current);
        player.mute();
      } else {
        rampVolume(targetVolume, desired.phase === "entering" || desired.phase === "exiting" ? 900 : 300);
      }
      player.playVideo();
    } catch {
      playerRef.current = null;
      // L'échec peut arriver pendant un effet React ; notifier à la microtâche
      // suivante évite une mise à jour d'état synchrone pendant ce rendu.
      queueMicrotask(() => setApiFailed(true));
    }
  }, [rampVolume]);

  useEffect(() => {
    desiredRef.current = {
      tvOn,
      phase,
      hasEntered,
      isMutedForFullscreen,
      playbackSuspended,
      audioMuted,
    };
    if (hasEntered && warmingRef.current) {
      warmingRef.current = false;
      if (warmTimerRef.current !== null) {
        window.clearTimeout(warmTimerRef.current);
        warmTimerRef.current = null;
      }
    }
    applyDesiredPlayback();
  }, [tvOn, phase, hasEntered, isMutedForFullscreen, playbackSuspended, audioMuted, applyDesiredPlayback]);

  useEffect(() => {
    let cancelled = false;
    if (!mountElement) return;

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

              // Si l'utilisateur est déjà entré pendant le chargement de l'API,
              // on honore immédiatement l'état demandé au lieu d'ajouter 900 ms
              // de préchauffage muet après coup.
              if (desiredRef.current.hasEntered) {
                warmingRef.current = false;
                applyDesiredPlayback();
                return;
              }

              // Préchargement réel avant l'entrée : le lecteur démarre brièvement
              // en muet pour amorcer le flux, puis revient exactement à 0.
              try {
                readyPlayer.mute();
                readyPlayer.setVolume(0);
                readyPlayer.playVideo();
              } catch {
                playerRef.current = null;
                setApiFailed(true);
                return;
              }
              warmTimerRef.current = window.setTimeout(() => {
                warmTimerRef.current = null;
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
              }, 900);
            },
            onStateChange: (event) => {
              if (!cancelled && event.data === 1) {
                setAutoplayBlocked(false);
              }
            },
            onAutoplayBlocked: () => {
              if (cancelled) return;
              const desired = desiredRef.current;
              if (desired.hasEntered && desired.tvOn && !desired.isMutedForFullscreen) {
                setAutoplayBlocked(true);
              }
            },
            onError: () => {
              if (!cancelled) setApiFailed(true);
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setApiFailed(true);
      });

    return () => {
      cancelled = true;
      if (warmTimerRef.current !== null) window.clearTimeout(warmTimerRef.current);
      if (volumeTimerRef.current !== null) window.clearTimeout(volumeTimerRef.current);
      createdPlayerRef.current?.destroy?.();
      createdPlayerRef.current = null;
      playerRef.current = null;
    };
  }, [applyDesiredPlayback, mountElement]);



  useEffect(() => {
    const onUserPlay = () => {
      const player = playerRef.current;
      if (!player) return;
      if (warmTimerRef.current !== null) {
        window.clearTimeout(warmTimerRef.current);
        warmTimerRef.current = null;
      }
      warmingRef.current = false;
      try {
        if (desiredRef.current.audioMuted) player.mute();
        else {
          player.unMute();
          player.setVolume(100);
        }
        player.playVideo();
        setAutoplayBlocked(false);
      } catch {
        playerRef.current = null;
        setApiFailed(true);
      }
    };
    window.addEventListener("bus-tv-user-play", onUserPlay);
    return () => {
      window.removeEventListener("bus-tv-user-play", onUserPlay);
    };
  }, []);

  useFrame(({ camera }) => {
    const visible = tvOn && !isMutedForFullscreen;
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
          pointerEvents: tvOn && phase === "inside" && !isMutedForFullscreen ? "auto" : "none",
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
