"use client";

import { Component, Suspense, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from "react";
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
  passengerCount?: number;
  seatCapacity?: number;
  vacantSeatRanges?: Array<[number, number, number]>;
  currentSeatRow?: number;
  isMutedForFullscreen?: boolean;
  hasEntered?: boolean;
  passengerProfiles?: PassengerProfile[];
  currentPassengerSeatIndex?: number | null;
  onPassengerSelect?: (passenger: PassengerProfile) => void;
  modeOverride?: "day" | "night" | null;
}

function SceneFallback({ reason = "La 3D n’est pas disponible sur cet appareil." }: { reason?: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-[#79c2ff] to-[#174f91] p-6 text-center text-white">
      <div className="max-w-md rounded-2xl border border-white/20 bg-[#07142b]/85 p-6 shadow-2xl backdrop-blur-sm">
        <div className="mb-3 text-5xl" aria-hidden="true">🚌</div>
        <p className="text-lg font-black">Le bus reste au dépôt</p>
        <p className="mt-2 text-sm text-white/80">{reason}</p>
        <button
          type="button"
          className="mt-5 min-h-11 rounded-xl bg-[#ffd23f] px-4 py-2 font-black text-[#0d2190] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          onClick={() => window.location.reload()}
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Impossible d’initialiser la scène 3D", error, info);
  }

  render() {
    return this.state.failed
      ? <SceneFallback reason="Le chargement de la scène a échoué. Vous pouvez relancer l’expérience." />
      : this.props.children;
  }
}

function readSceneRuntimeState() {
  if (typeof window === "undefined") {
    return { hidden: false, lowPower: false, reducedMotion: false };
  }
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const constrainedNetwork = connection?.saveData === true
    || connection?.effectiveType === "slow-2g"
    || connection?.effectiveType === "2g";
  return {
    hidden: document.hidden,
    lowPower: constrainedNetwork || window.innerWidth < 768 || navigator.hardwareConcurrency <= 4 || memory <= 4,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

function useSceneRuntimeState() {
  const [state, setState] = useState(readSceneRuntimeState);

  useEffect(() => {
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string; addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void };
    }).connection;
    const update = () => {
      setState(readSceneRuntimeState());
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    document.addEventListener("visibilitychange", update);
    reducedQuery.addEventListener("change", update);
    connection?.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("visibilitychange", update);
      reducedQuery.removeEventListener("change", update);
      connection?.removeEventListener?.("change", update);
    };
  }, []);

  return state;
}

function FrameScheduler({ fps, active }: { fps: number; active: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
    if (!active) return;
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
  }, [active, fps, invalidate]);
  return null;
}

export default function Scene({
  phase,
  headlights,
  hornPulse,
  tvOn,
  worldRef,
  onArrived,
  passengerCount = 0,
  seatCapacity = passengerCount,
  vacantSeatRanges = [],
  currentSeatRow = 3,
  isMutedForFullscreen = false,
  hasEntered = false,
  passengerProfiles = [],
  currentPassengerSeatIndex = null,
  onPassengerSelect,
  modeOverride,
}: SceneProps) {
  const { hidden, lowPower, reducedMotion } = useSceneRuntimeState();
  const renderPaused = hidden;
  // Calcul géométrique de la cabine pour la caméra
  const numRows = useMemo(() => computeNumRows(seatCapacity), [seatCapacity]);
  const rearWallZ = useMemo(() => -2.6 + numRows * 1.2, [numRows]);
  const cabinLength = useMemo(() => rearWallZ + 4.6, [rearWallZ]);
  const cabinCenterZ = useMemo(() => (-4.6 + rearWallZ) / 2, [rearWallZ]);
  // OrbitControls peut s'éloigner de 2,2 longueurs depuis le centre. La marge
  // supplémentaire couvre alors l'extrémité opposée du bus, même à grande capacité.
  const cameraFar = useMemo(() => Math.max(2000, cabinLength * 3 + 100), [cabinLength]);

  // Position Z du regard du passager (rangée choisie)
  const clampedRow = Math.max(0, Math.min(numRows - 1, currentSeatRow));
  const currentSeatZ = -2.6 + clampedRow * 1.2 + 0.15;

  return (
    <SceneErrorBoundary>
      <Canvas
      shadows={lowPower ? false : "basic"}
      frameloop="demand"
      dpr={lowPower ? 1 : Math.min(window.devicePixelRatio, 1.35)}
      camera={{ position: DEFAULT_CAMERA_POS.toArray(), fov: 55, near: 0.1, far: cameraFar }}
      gl={{ antialias: !lowPower, alpha: true, powerPreference: lowPower ? "low-power" : "high-performance" }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
      fallback={<SceneFallback />}
    >
      <FrameScheduler fps={reducedMotion ? 8 : lowPower ? 24 : 45} active={!renderPaused} />
      <DayNight worldRef={worldRef} modeOverride={modeOverride} lowPower={lowPower} reducedMotion={reducedMotion} />
      <Weather worldRef={worldRef} lowPower={lowPower} reducedMotion={reducedMotion} />
      <Suspense fallback={null}>
        <Bus
          headlights={headlights}
          hornPulse={hornPulse}
          tvOn={tvOn}
          phase={phase}
          worldRef={worldRef}
          passengerCount={passengerCount}
          seatCapacity={seatCapacity}
          vacantSeatRanges={vacantSeatRanges}
          reservedRow={clampedRow}
          isMutedForFullscreen={isMutedForFullscreen}
          hasEntered={hasEntered}
          passengerProfiles={passengerProfiles}
          currentPassengerSeatIndex={currentPassengerSeatIndex}
          onPassengerSelect={onPassengerSelect}
          reducedMotion={reducedMotion}
          playbackSuspended={renderPaused}
        />
      </Suspense>
      <World worldRef={worldRef} reducedMotion={reducedMotion} />
      <CameraRig
        phase={phase}
        onArrived={onArrived}
        cabinLength={cabinLength}
        cabinCenterZ={cabinCenterZ}
        cameraFar={cameraFar}
        currentSeatZ={currentSeatZ}
        reducedMotion={reducedMotion}
      />
      </Canvas>
    </SceneErrorBoundary>
  );
}
