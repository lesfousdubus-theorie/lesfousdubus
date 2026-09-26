"use client";

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Bus from "./Bus";
import World from "./World";
import DayNight from "./DayNight";
import Weather from "./Weather";
import CameraRig from "./CameraRig";
import { computeNumRows, getActiveTvIndex, getTvPositions } from "@/lib/bus-layout";
import {
  DEFAULT_CAMERA_POS,
  TV_POSITION,
  type Phase,
  type WorldState,
} from "./constants";
import type { PassengerProfile } from "@/types/passenger";

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
  uiPaused?: boolean;
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
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const cappedDpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelBudget = window.innerWidth * window.innerHeight * cappedDpr * cappedDpr;
  return {
    hidden: document.hidden,
    // La petite dimension reste stable quand un téléphone pivote, contrairement
    // à innerWidth seul. On tient aussi compte du coût réel en pixels.
    lowPower: constrainedNetwork
      || navigator.hardwareConcurrency <= 4
      || memory <= 4
      || (coarsePointer && shortSide < 900)
      || pixelBudget > 5_000_000,
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

function AdaptiveDpr({ lowPower }: { lowPower: boolean }) {
  const setDpr = useThree((state) => state.setDpr);
  const baseDpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.15 : 1.6);
  const sampleRef = useRef({ elapsed: 0, frames: 0, dpr: baseDpr });

  useEffect(() => {
    sampleRef.current = { elapsed: 0, frames: 0, dpr: baseDpr };
    setDpr(baseDpr);
  }, [baseDpr, setDpr]);

  useFrame((_, dt) => {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.25) return;
    const sample = sampleRef.current;
    sample.elapsed += dt;
    sample.frames += 1;
    if (sample.elapsed < 1.5) return;

    const fps = sample.frames / sample.elapsed;
    let nextDpr = sample.dpr;
    if (fps < 48) {
      nextDpr = Math.max(0.85, sample.dpr - 0.15);
    } else if (fps > 100) {
      nextDpr = Math.min(sample.dpr, lowPower ? 1 : 1.25);
    } else if (fps > 57 && sample.dpr < baseDpr) {
      nextDpr = Math.min(baseDpr, sample.dpr + 0.1);
    }

    if (Math.abs(nextDpr - sample.dpr) >= 0.04) {
      sample.dpr = nextDpr;
      setDpr(nextDpr);
    }
    sample.elapsed = 0;
    sample.frames = 0;
  });

  return null;
}

function WebGLContextGuard({ setLost }: { setLost: (lost: boolean) => void }) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (event: Event) => {
      event.preventDefault();
      setLost(true);
    };
    const onRestored = () => {
      gl.resetState();
      setLost(false);
      invalidate();
    };
    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost, false);
      canvas.removeEventListener("webglcontextrestored", onRestored, false);
    };
  }, [gl, invalidate, setLost]);

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
  uiPaused = false,
  hasEntered = false,
  passengerProfiles = [],
  currentPassengerSeatIndex = null,
  onPassengerSelect,
  modeOverride,
}: SceneProps) {
  const { hidden, lowPower, reducedMotion } = useSceneRuntimeState();
  const [contextLost, setContextLost] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const renderPaused = hidden || contextLost || uiPaused;
  const playbackSuspended = hidden || contextLost;
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
  const tvPositions = useMemo(() => getTvPositions(numRows, TV_POSITION), [numRows]);
  const tvTargetZ = tvPositions[getActiveTvIndex(tvPositions, clampedRow)][2];

  return (
    <SceneErrorBoundary>
      <div className="absolute inset-0">
      <Canvas
      shadows={lowPower ? false : "basic"}
      frameloop={renderPaused ? "demand" : "always"}
      dpr={Math.min(window.devicePixelRatio, lowPower ? 1.15 : 1.6)}
      camera={{ position: DEFAULT_CAMERA_POS.toArray(), fov: 55, near: 0.1, far: cameraFar }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
      onCreated={() => setCanvasReady(true)}
      fallback={<div aria-hidden={canvasReady}><SceneFallback /></div>}
    >
      <WebGLContextGuard setLost={setContextLost} />
      <AdaptiveDpr lowPower={lowPower} />
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
          playbackSuspended={playbackSuspended}
        />
      </Suspense>
      <World worldRef={worldRef} reducedMotion={reducedMotion} lowPower={lowPower} />
      <CameraRig
        phase={phase}
        onArrived={onArrived}
        cabinLength={cabinLength}
        cabinCenterZ={cabinCenterZ}
        cameraFar={cameraFar}
        currentSeatZ={currentSeatZ}
        tvTargetZ={tvTargetZ}
        reducedMotion={reducedMotion}
      />
      </Canvas>
      {contextLost && (
        <SceneFallback reason="Le moteur graphique a été suspendu par l’appareil. Le contexte WebGL est en cours de restauration ; vous pouvez aussi relancer l’expérience." />
      )}
      </div>
    </SceneErrorBoundary>
  );
}
