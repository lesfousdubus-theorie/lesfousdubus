"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { YOUTUBE_ID, type Phase } from "./constants";
import { loadYouTubeIframeApi, type YouTubePlayer } from "@/lib/youtube-player";

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
            cc_load_policy: 0,
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
              if (event.data === 1) {
                setAutoplayBlocked(false);
              }
            },
            onAutoplayBlocked: () => {
              const desired = desiredRef.current;
              if (desired.hasEntered && desired.tvOn && !desired.isMutedForFullscreen) {
                setAutoplayBlocked(true);
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
    };
  }, [applyDesiredPlayback]);



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
          <div ref={mountRef} data-bus-youtube-player style={{ width: "100%", height: "100%" }} />
          {tvOn && phase === "inside" && !isMutedForFullscreen && (
            <button
              data-tv-wheel-capture
              type="button"
              aria-label="Zone de zoom de la vue du bus. Utilise la molette ici pour zoomer, ou clique pour recentrer."
              onWheel={(event) => {
                event.preventDefault();
                event.stopPropagation();
                window.dispatchEvent(
                  new CustomEvent<number>("bus-zoom", { detail: event.deltaY * 0.04 }),
                );
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                window.dispatchEvent(new Event("bus-zoom-reset"));
              }}
              onPointerDown={(event) => event.stopPropagation()}
              title="Molette ici : zoomer dans le bus · clic : recentrer"
              style={{
                position: "absolute",
                top: 8,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 2,
                minWidth: 72,
                height: 28,
                padding: "0 10px",
                border: "1px solid rgba(255,255,255,0.32)",
                borderRadius: 999,
                background: "rgba(2,6,23,0.68)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.08em",
                cursor: "ns-resize",
                backdropFilter: "blur(4px)",
              }}
            >
              ↕ ZOOM
            </button>
          )}
          {(autoplayBlocked || apiFailed) && tvOn && hasEntered && (
            <button
              type="button"
              onClick={() => apiFailed ? window.location.reload() : window.dispatchEvent(new Event("bus-tv-user-play"))}
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
              {apiFailed ? "Réessayer la vidéo" : "▶ Lancer la vidéo"}
            </button>
          )}
        </div>
      </Html>
    </group>
  );
}
