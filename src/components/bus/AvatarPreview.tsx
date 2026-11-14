"use client";

import { Component, useRef, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { createJourneyState } from "@/lib/bus-journey";
import { getPassengerProportions, getPassengerSkeleton } from "@/lib/passenger-proportions";
import type { PassengerAvatarId } from "@/lib/passenger-avatar";
import BoardingAvatar from "./BoardingAvatar";

class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <p role="status" className="grid h-full place-items-center px-5 text-center text-sm text-[#d8e3ff]">L’aperçu 3D est indisponible. Tu peux toujours choisir ton personnage avec les flèches.</p>
      : this.props.children;
  }
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

export default function AvatarPreview({ avatarId, rotation }: { avatarId: PassengerAvatarId; rotation: number }) {
  return <PreviewBoundary>
    <Canvas orthographic frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 1, 5], zoom: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      fallback={<p className="p-5 text-center text-sm text-[#d8e3ff]">Ton appareil ne permet pas l’aperçu 3D. Les flèches restent disponibles pour choisir.</p>}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 5, 4]} intensity={3} />
      <directionalLight position={[-3, 2, -2]} intensity={1.2} color="#a9c8ff" />
      <PreviewCharacter avatarId={avatarId} rotation={rotation} />
    </Canvas>
  </PreviewBoundary>;
}
