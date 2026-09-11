"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import Bus from "./Bus";
import World from "./World";
import DayNight from "./DayNight";
import Weather from "./Weather";
import CameraRig from "./CameraRig";
import { computeNumRows } from "./Passengers";
import {
  DEFAULT_CAMERA_POS,
  type PassengerProfile,
  type Phase,
  type WorldState,
} from "./constants";

interface SceneProps {
  phase: Phase;
  headlights: boolean;
  hornPulse: number;
  tvOn: boolean;
  worldRef: React.RefObject<WorldState>;
  onArrived: (phase: "inside" | "outside") => void;
  onToggleTv?: () => void;
  passengerCount?: number;
  currentSeatRow?: number;
  isMutedForFullscreen?: boolean;
  hasEntered?: boolean;
  passengerProfiles?: PassengerProfile[];
  currentPassengerSeatIndex?: number | null;
  onPassengerSelect?: (passenger: PassengerProfile) => void;
  modeOverride?: "day" | "night" | null;
}

function FrameScheduler({ fps }: { fps: number }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    let frame = 0;
    let previous = 0;
    const interval = 1000 / fps;
    const tick = (now: number) => {
      if (now - previous >= interval) {
        previous = now - ((now - previous) % interval);
        invalidate();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fps, invalidate]);
  return null;
}

export default function Scene({
  phase,
  headlights,
  hornPulse,
  tvOn,
  worldRef,
  onArrived,
  onToggleTv,
  passengerCount = 0,
  currentSeatRow = 3,
  isMutedForFullscreen = false,
  hasEntered = false,
  passengerProfiles = [],
  currentPassengerSeatIndex = null,
  onPassengerSelect,
  modeOverride,
}: SceneProps) {
  const lowPower = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    return window.innerWidth < 768 || navigator.hardwareConcurrency <= 4 || memory <= 4;
  }, []);
  // Calcul géométrique de la cabine pour la caméra
  const numRows = useMemo(() => computeNumRows(passengerCount), [passengerCount]);
  const rearWallZ = useMemo(() => -2.6 + numRows * 1.2, [numRows]);
  const cabinLength = useMemo(() => rearWallZ + 4.6, [rearWallZ]);
  const cabinCenterZ = useMemo(() => (-4.6 + rearWallZ) / 2, [rearWallZ]);

  // Position Z du regard du passager (rangée choisie)
  const clampedRow = Math.max(0, Math.min(numRows - 1, currentSeatRow));
  const currentSeatZ = -2.6 + clampedRow * 1.2 + 0.15;

  return (
    <Canvas
      shadows="percentage"
      frameloop="demand"
      dpr={lowPower ? 1 : Math.min(window.devicePixelRatio, 1.35)}
      camera={{ position: DEFAULT_CAMERA_POS.toArray(), fov: 55, near: 0.1, far: 2000 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
    >
      <FrameScheduler fps={lowPower ? 30 : 45} />
      <DayNight worldRef={worldRef} modeOverride={modeOverride} lowPower={lowPower} />
      <Weather worldRef={worldRef} lowPower={lowPower} />
      <Suspense fallback={null}>
        <Bus
          headlights={headlights}
          hornPulse={hornPulse}
          tvOn={tvOn}
          phase={phase}
          worldRef={worldRef}
          onToggleTv={onToggleTv}
          passengerCount={passengerCount}
          reservedRow={clampedRow}
          isMutedForFullscreen={isMutedForFullscreen}
          hasEntered={hasEntered}
          passengerProfiles={passengerProfiles}
          currentPassengerSeatIndex={currentPassengerSeatIndex}
          onPassengerSelect={onPassengerSelect}
        />
      </Suspense>
      <World worldRef={worldRef} />
      <CameraRig
        phase={phase}
        onArrived={onArrived}
        cabinLength={cabinLength}
        cabinCenterZ={cabinCenterZ}
        currentSeatZ={currentSeatZ}
      />
    </Canvas>
  );
}
