"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { YOUTUBE_ID } from "./constants";

export function sendYoutubeCommand(
  iframe: HTMLIFrameElement | null,
  func: string,
  args: any[] = [],
) {
  if (!iframe?.contentWindow) return;
  try {
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*",
    );
  } catch {
    // ignore
  }
}

interface BusTvUnitProps {
  pos: [number, number, number];
  idx: number;
  tvOn: boolean;
  phase: "outside" | "entering" | "inside" | "exiting";
  hasEntered?: boolean;
  isPrimary: boolean;
  isMutedForFullscreen: boolean;
  mats: Record<string, THREE.Material>;
  tvOffTex: THREE.CanvasTexture;
  registerIframe: (index: number, iframe: HTMLIFrameElement | null, isPrimary: boolean) => void;
  youtubeTimeRef: React.RefObject<number>;
  youtubeStateRef: React.RefObject<number>;
  reducedMotion: boolean;
  playbackSuspended: boolean;
}

export default function BusTvUnit({
  pos,
  idx,
  tvOn,
  phase,
  hasEntered = false,
  isPrimary,
  isMutedForFullscreen,
  mats,
  tvOffTex,
  registerIframe,
  youtubeTimeRef,
  youtubeStateRef,
  reducedMotion,
  playbackSuspended,
}: BusTvUnitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial>(null);
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));
  const shaderUniforms = useMemo(() => ({ uVisible: { value: 1.0 } }), []);

  useFrame(({ camera }) => {
    // Synchronisation de l'uniforme du shader de découpe 3D
    if (shaderMatRef.current?.uniforms?.uVisible) {
      shaderMatRef.current.uniforms.uVisible.value = tvOn && !isMutedForFullscreen ? 1.0 : 0.0;
    }

    if (!containerRef.current) return;

    if (!tvOn || isMutedForFullscreen) {
      if (containerRef.current.style.visibility !== "hidden") {
        containerRef.current.style.visibility = "hidden";
      }
      return;
    }

    // Si la caméra est en avant de la TV (z < pos[2] + 0.04), on regarde le dos de la TV
    const isBehindTv = phase !== "inside" && camera.position.z < (pos[2] + 0.04);
    if (isBehindTv) {
      if (containerRef.current.style.visibility !== "hidden") {
        containerRef.current.style.visibility = "hidden";
      }
      return;
    }

    if (containerRef.current.style.visibility !== "visible") {
      containerRef.current.style.visibility = "visible";
    }
  });

  return (
    <group
      key={`tv-${idx}-${pos[2]}`}
      position={pos}
    >
      {/* Cadre de la télévision */}
      <mesh material={mats.dark} castShadow>
        <boxGeometry args={[1.36, 0.82, 0.08]} />
      </mesh>
      {/* Dos opaque noir de la télévision */}
      <mesh position={[0, 0, -0.041]}>
        <planeGeometry args={[1.34, 0.8]} />
        <meshStandardMaterial color="#0c1017" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* Bordure dorée One Piece */}
      <mesh material={mats.yellow} position={[0, 0, 0.041]}>
        <boxGeometry args={[1.34, 0.8, 0.01]} />
      </mesh>
      {/* Support de fixation au plafond bien visible et robuste */}
      <mesh material={mats.seatFrame} position={[0, 0.52, -0.08]}>
        <boxGeometry args={[0.16, 0.45, 0.16]} />
      </mesh>

      {/* Plaque d'occultation arrière noire */}
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[1.28, 0.73]} />
        <meshBasicMaterial color="#05070c" side={THREE.DoubleSide} />
      </mesh>

      {/* Fond de l'écran éteint : dalle noire élégante en verre sombre calée dans le cadre */}
      <mesh position={[0, 0, 0.053]} visible={!tvOn}>
        <planeGeometry args={[1.26, 0.70875]} />
        <meshStandardMaterial
          map={tvOffTex}
          color="#05070b"
          roughness={0.25}
          metalness={0.8}
          emissive="#000000"
          emissiveIntensity={0}
        />
      </mesh>

      {/* Toutes les TV affichent la même vidéo. Les écrans secondaires sont muets
          pour éviter plusieurs pistes audio superposées. */}
      <Html
        transform
        occlude="blending"
        onOcclude={() => {}}
        zIndexRange={[10, 0]}
        geometry={<planeGeometry args={[1.26, 0.70875]} />}
        material={
          <shaderMaterial
            ref={shaderMatRef}
            transparent
            blending={THREE.NoBlending}
            side={THREE.DoubleSide}
            depthTest={true}
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
        position={[0, 0, 0.052]}
        scale={0.00225}
        style={{
          userSelect: "none",
          pointerEvents: tvOn && phase === "inside" && !isMutedForFullscreen ? "auto" : "none",
        }}
      >
        <div
          ref={containerRef}
          id={`tv-frame-${idx}`}
          style={{
            position: "relative",
            width: 560,
            height: 315,
            background: "#000000",
            boxSizing: "border-box",
            borderRadius: 0,
            overflow: "hidden",
            border: 0,
            backfaceVisibility: "hidden",
            willChange: "transform, opacity",
            opacity: tvOn && !isMutedForFullscreen ? 1 : 0,
            visibility: tvOn && !isMutedForFullscreen ? "visible" : "hidden",
            transition: reducedMotion ? "none" : "opacity 0.2s ease",
          }}
        >
          <iframe
            id={`tv-iframe-${idx}`}
            width="560"
            height="315"
            src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?enablejsapi=1&autoplay=0&controls=1&rel=0&playsinline=1&iv_load_policy=3${origin ? `&origin=${encodeURIComponent(origin)}` : ""}`}
            title="La théorie des Fous du Bus"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="eager"
            ref={(iframe) => {
              registerIframe(idx, iframe, isPrimary);
            }}
            onLoad={(event) => {
              const iframe = event.currentTarget;
              iframe.contentWindow?.postMessage(
                JSON.stringify({ event: "listening", id: `tv-iframe-${idx}` }),
                "*",
              );
              // YouTube peut mémoriser une préférence de sous-titres. On les coupe
              // explicitement au démarrage, sans empêcher l'utilisateur de les
              // réactiver ensuite via le bouton CC du lecteur.
              sendYoutubeCommand(iframe, "unloadModule", ["captions"]);
              window.setTimeout(() => sendYoutubeCommand(iframe, "unloadModule", ["captions"]), 250);
              if (hasEntered && tvOn && !isMutedForFullscreen && !playbackSuspended) {
                if (isPrimary) {
                  sendYoutubeCommand(iframe, "unMute");
                  sendYoutubeCommand(iframe, "setVolume", [phase === "outside" ? 25 : 100]);
                } else {
                  sendYoutubeCommand(iframe, "mute");
                  if (youtubeTimeRef.current > 0.5) {
                    sendYoutubeCommand(iframe, "seekTo", [youtubeTimeRef.current, true]);
                  }
                }
                if (isPrimary || youtubeStateRef.current !== 2) sendYoutubeCommand(iframe, "playVideo");
              }
            }}
            style={{
              border: 0,
              display: "block",
              width: "100%",
              height: "100%",
              pointerEvents: "auto",
            }}
          />

        </div>
      </Html>
    </group>
  );
}
