"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { YOUTUBE_ID, type Phase } from "./constants";
import { loadYouTubeIframeApi, type YouTubePlayer } from "@/lib/youtube-player";
import { updateBusVideoSnapshot } from "@/lib/bus-video-state";

interface BusTvFrameProps {
  pos: [number, number, number];
  idx: number;
  tvOn: boolean;
  isActive: boolean;
  mats: Record<string, THREE.Material>;
  tvOffTex: THREE.CanvasTexture;
  posterTex: THREE.Texture;
}

export function BusTvFrame({
  pos,
  idx,
  tvOn,
  isActive,
  mats,
  tvOffTex,
  posterTex,
}: BusTvFrameProps) {
  return (
    <group key={`tv-frame-${idx}-${pos[2]}`} position={pos}>
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
        {tvOn ? (
          <meshStandardMaterial
            map={posterTex}
            color="#ffffff"
            emissive="#ffffff"
            emissiveMap={posterTex}
            emissiveIntensity={isActive ? 0.52 : 0.32}
            roughness={0.42}
            metalness={0.06}
            toneMapped={false}
          />
        ) : (
          <meshStandardMaterial
            map={tvOffTex}
            color="#05070b"
            roughness={0.25}
            metalness={0.8}
            emissive="#000000"
            emissiveIntensity={0}
          />
        )}
      </mesh>
      {tvOn && !isActive && (
        <mesh position={[0.48, 0.275, 0.058]}>
          <planeGeometry args={[0.18, 0.07]} />
          <meshBasicMaterial color="#cc1f2f" toneMapped={false} />
        </mesh>
      )}
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
}

export function BusTvPlayer({
  pos,
  tvOn,
  phase,
  hasEntered,
  isMutedForFullscreen,
  reducedMotion,
  playbackSuspended,
}: BusTvPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const warmTimerRef = useRef<number | null>(null);
  const volumeFrameRef = useRef<number | null>(null);
  const warmingRef = useRef(true);
  const desiredRef = useRef({
    tvOn,
    phase,
    hasEntered,
    isMutedForFullscreen,
    playbackSuspended,
  });
  const [ready, setReady] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const shaderUniforms = useMemo(() => ({ uVisible: { value: 1.0 } }), []);

  const rampVolume = useCallback((target: number, duration = 650) => {
    const player = playerRef.current;
    if (!player) return;
    if (volumeFrameRef.current !== null) cancelAnimationFrame(volumeFrameRef.current);

    let from = target;
    try {
      from = player.getVolume();
      player.unMute();
    } catch {
      return;
    }

    const startedAt = performance.now();
    const tick = (now: number) => {
      const activePlayer = playerRef.current;
      if (!activePlayer) return;
      const progress = Math.min(1, (now - startedAt) / Math.max(1, duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      activePlayer.setVolume(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        volumeFrameRef.current = requestAnimationFrame(tick);
      } else {
        volumeFrameRef.current = null;
      }
    };
    volumeFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const applyDesiredPlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player || warmingRef.current) return;
    const desired = desiredRef.current;

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
    rampVolume(targetVolume, desired.phase === "entering" || desired.phase === "exiting" ? 900 : 300);
    player.playVideo();
  }, [rampVolume]);

  useEffect(() => {
    desiredRef.current = {
      tvOn,
      phase,
      hasEntered,
      isMutedForFullscreen,
      playbackSuspended,
    };
    updateBusVideoSnapshot({
      shouldBePlaying: hasEntered && tvOn && !playbackSuspended,
    });
    if (hasEntered && warmingRef.current) {
      warmingRef.current = false;
      if (warmTimerRef.current !== null) {
        window.clearTimeout(warmTimerRef.current);
        warmTimerRef.current = null;
      }
    }
    applyDesiredPlayback();
  }, [tvOn, phase, hasEntered, isMutedForFullscreen, playbackSuspended, applyDesiredPlayback]);

  useEffect(() => {
    let cancelled = false;
    const mount = mountRef.current;
    if (!mount) return;

    void loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;
        const player = new YT.Player(mountRef.current, {
          width: 560,
          height: 315,
          videoId: YOUTUBE_ID,
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              playerRef.current = event.target;
              const iframe = event.target.getIframe();
              iframe.id = "tv-primary-iframe";
              iframe.title = "La théorie des Fous du Bus";
              iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen");
              iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
              iframe.style.width = "100%";
              iframe.style.height = "100%";
              iframe.style.border = "0";
              iframe.style.display = "block";

              setReady(true);
              updateBusVideoSnapshot({ ready: true, autoplayBlocked: false });
              // Préchargement réel : le lecteur est initialisé immédiatement, démarre
              // brièvement en muet pour amorcer le flux, puis revient exactement à 0.
              event.target.mute();
              event.target.setVolume(0);
              event.target.playVideo();
              warmTimerRef.current = window.setTimeout(() => {
                warmTimerRef.current = null;
                if (!desiredRef.current.hasEntered) {
                  event.target.pauseVideo();
                  event.target.seekTo(0, true);
                  event.target.mute();
                }
                warmingRef.current = false;
                applyDesiredPlayback();
              }, 900);
            },
            onStateChange: (event) => {
              const activePlayer = event.target;
              updateBusVideoSnapshot({
                state: typeof event.data === "number" ? event.data : activePlayer.getPlayerState(),
                currentTime: activePlayer.getCurrentTime(),
                duration: activePlayer.getDuration(),
              });
              if (event.data === 1) {
                setAutoplayBlocked(false);
                updateBusVideoSnapshot({ autoplayBlocked: false });
              }
            },
            onAutoplayBlocked: () => {
              const desired = desiredRef.current;
              if (desired.hasEntered && desired.tvOn && !desired.isMutedForFullscreen) {
                setAutoplayBlocked(true);
                updateBusVideoSnapshot({ autoplayBlocked: true });
              }
            },
            onError: () => {
              setApiFailed(true);
            },
          },
        });
        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) setApiFailed(true);
      });

    return () => {
      cancelled = true;
      if (warmTimerRef.current !== null) window.clearTimeout(warmTimerRef.current);
      if (volumeFrameRef.current !== null) cancelAnimationFrame(volumeFrameRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
      updateBusVideoSnapshot({ ready: false, state: -1 });
    };
  }, [applyDesiredPlayback]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || !ready) return;
      try {
        updateBusVideoSnapshot({
          currentTime: player.getCurrentTime(),
          duration: player.getDuration(),
          state: player.getPlayerState(),
        });
      } catch {
        // Le lecteur peut être en cours de destruction lors d'un changement de page.
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [ready]);

  useEffect(() => {
    const onUserPlay = () => {
      const player = playerRef.current;
      if (!player) return;
      if (warmTimerRef.current !== null) {
        window.clearTimeout(warmTimerRef.current);
        warmTimerRef.current = null;
      }
      warmingRef.current = false;
      player.unMute();
      player.setVolume(100);
      player.playVideo();
      setAutoplayBlocked(false);
      updateBusVideoSnapshot({ autoplayBlocked: false });
    };
    const onSeek = (event: Event) => {
      const currentTime = (event as CustomEvent<{ currentTime?: number }>).detail?.currentTime;
      if (typeof currentTime !== "number" || !Number.isFinite(currentTime)) return;
      playerRef.current?.seekTo(Math.max(0, currentTime), true);
    };
    window.addEventListener("bus-tv-user-play", onUserPlay);
    window.addEventListener("bus-video-seek", onSeek);
    return () => {
      window.removeEventListener("bus-tv-user-play", onUserPlay);
      window.removeEventListener("bus-video-seek", onSeek);
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
          <div ref={mountRef} data-bus-youtube-player style={{ width: "100%", height: "100%" }} />
          {(autoplayBlocked || apiFailed) && tvOn && hasEntered && (
            <button
              type="button"
              onClick={() => apiFailed ? window.location.reload() : window.dispatchEvent(new Event("bus-tv-user-play"))}
              style={{
                position: "absolute",
                inset: 0,
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
              {apiFailed ? "Réessayer la vidéo" : "▶ Lancer la vidéo"}
            </button>
          )}
        </div>
      </Html>
    </group>
  );
}
