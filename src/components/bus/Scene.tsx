"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import Bus from "./Bus";
import World from "./World";
import DayNight from "./DayNight";
import CameraRig from "./CameraRig";
import { computeNumRows } from "./Passengers";
import { DEFAULT_CAMERA_POS, type Phase, type WorldState } from "./constants";

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
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onStop?: () => void;
  onToggleFullscreen?: () => void;
  isMutedForFullscreen?: boolean;
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
  isPlaying = true,
  onTogglePlay,
  onStop,
  onToggleFullscreen,
  isMutedForFullscreen = false,
}: SceneProps) {
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
      shadows
      dpr={[1, 1.6]}
      camera={{ position: DEFAULT_CAMERA_POS.toArray(), fov: 55, near: 0.1, far: 2000 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
    >
      <DayNight worldRef={worldRef} />
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
          isPlaying={isPlaying}
          onTogglePlay={onTogglePlay}
          onStop={onStop}
          onToggleFullscreen={onToggleFullscreen}
          isMutedForFullscreen={isMutedForFullscreen}
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
