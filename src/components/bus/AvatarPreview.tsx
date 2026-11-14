"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { createJourneyState } from "@/lib/bus-journey";
import { getPassengerProportions, getPassengerSkeleton } from "@/lib/passenger-proportions";
import type { PassengerAvatarId } from "@/lib/passenger-avatar";
import BoardingAvatar from "./BoardingAvatar";

function FallbackNotice({ message, onFallbackChange }: { message: string; onFallbackChange?: (active: boolean) => void }) {
  const onFallbackChangeRef = useRef(onFallbackChange);
  useEffect(() => {
    onFallbackChangeRef.current = onFallbackChange;
  }, [onFallbackChange]);

  useEffect(() => {
    onFallbackChangeRef.current?.(true);
    return () => {
      onFallbackChangeRef.current?.(false);
    };
  }, []);

  return <p role="status" className="grid h-full place-items-center px-5 text-center text-sm text-[#d8e3ff]">{message}</p>;
}

class PreviewBoundary extends Component<{ children: ReactNode; onFallbackChange?: (active: boolean) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <FallbackNotice message="L’aperçu 3D est indisponible. Tu peux toujours choisir ton personnage avec les flèches." onFallbackChange={this.props.onFallbackChange} />
      : this.props.children;
  }
}

function useWebGLSupport() {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const probe = document.createElement("canvas");
      let context: WebGL2RenderingContext | null = null;
      try {
        context = probe.getContext("webgl2");
        setSupported(Boolean(context));
      } catch {
        setSupported(false);
      } finally {
        context?.getExtension("WEBGL_lose_context")?.loseContext();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return supported;
}

function createPreviewJourney() {
  const journey = createJourneyState();
  journey.phase = "inside";
  journey.avatarVisible = true;
  return journey;
}

function PreviewCharacter({ avatarId, rotation }: { avatarId: PassengerAvatarId; rotation: number }) {
  const journey = useRef(createPreviewJourney());
  const size = useThree(state => state.size);
  const rig = getPassengerSkeleton(avatarId);
  const proportions = getPassengerProportions(avatarId);
  const height = rig.standingHipHeight + rig.neckAboveHip + rig.headAboveNeck + proportions.headHeight / 2 + 0.32;
  return <>
    <OrthographicCamera makeDefault position={[0, height / 2, 5]} zoom={size.height / (height * 1.15)} />
    {/* Les personnages regardent vers -Z ; la caméra de l’aperçu est côté +Z. */}
    <group rotation={[0, Math.PI + rotation, 0]}>
    <BoardingAvatar key={avatarId} journey={journey} avatarId={avatarId} passengerIndex={0} physicalSeatIndex={0}
      partyOn={false} hornPulse={0} reducedMotion />
    </group>
  </>;
}

export default function AvatarPreview({
  avatarId,
  rotation,
  onFallbackChange,
}: {
  avatarId: PassengerAvatarId;
  rotation: number;
  onFallbackChange?: (active: boolean) => void;
}) {
  const webGLSupported = useWebGLSupport();
  const onFallbackChangeRef = useRef(onFallbackChange);
  useEffect(() => {
    onFallbackChangeRef.current = onFallbackChange;
  }, [onFallbackChange]);

  if (webGLSupported === false) {
    return <FallbackNotice
      message="Ton appareil ne permet pas l’aperçu 3D. Les flèches restent disponibles pour choisir."
      onFallbackChange={onFallbackChange}
    />;
  }
  if (webGLSupported === null) {
    return <p role="status" className="grid h-full place-items-center text-sm text-[#dce7ff]">Chargement du personnage…</p>;
  }

  return <PreviewBoundary onFallbackChange={onFallbackChange}>
    <Canvas orthographic frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 1, 5], zoom: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      onCreated={() => onFallbackChangeRef.current?.(false)}
      fallback={<p className="p-5 text-center text-sm text-[#d8e3ff]">Ton appareil ne permet pas l’aperçu 3D. Les flèches restent disponibles pour choisir.</p>}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 5, 4]} intensity={3} />
      <directionalLight position={[-3, 2, -2]} intensity={1.2} color="#a9c8ff" />
      <PreviewCharacter avatarId={avatarId} rotation={rotation} />
    </Canvas>
  </PreviewBoundary>;
}
