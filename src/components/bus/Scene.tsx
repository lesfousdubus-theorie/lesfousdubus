"use client";

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Bus from "./Bus";
import World from "./World";
import DayNight from "./DayNight";
import Weather from "./Weather";
import CameraRig from "./CameraRig";
import BoardingController from "./BoardingController";
import BoardingAvatar from "./BoardingAvatar";
import { createJourneyState } from "@/lib/bus-journey";
import { getAvatarSeat, getBusPhysicalRows } from "@/lib/bus-occupancy";
import { getBusCameraFar } from "@/lib/bus-camera";
import { getActiveTvIndex, getTvPositions, getBusRearWallZ, BUS_FRONT_Z } from "@/lib/bus-layout";
import {
  DEFAULT_CAMERA_POS,
  TV_POSITION,
  type Phase,
  type WorldState,
} from "./constants";
import type { PassengerProfile } from "@/types/passenger";
import { THEORY_VIDEO_URL } from "@/lib/theory-video";
import { createDprSample, sampleSceneDpr } from "@/lib/scene-performance";

interface SceneProps {
  phase: Phase;
  freeView?: boolean;
  letterShortcutsEnabled?: boolean;
  headlights: boolean;
  hornPulse: number;
  partyOn?: boolean;
  partyDancing?: boolean;
  tvOn: boolean;
  onVideoPlaybackChange?: (active: boolean) => void;
  worldRef: React.RefObject<WorldState>;
  onArrived: (phase: "inside" | "outside") => void;
  passengerCount?: number;
  seatCapacity?: number;
  vacantSeatRanges?: Array<[number, number, number]>;
  currentSeatRow?: number;
  isMutedForFullscreen?: boolean;
  uiPaused?: boolean;
  hasEntered?: boolean;
  boardingPending?: boolean;
  passengerProfiles?: PassengerProfile[];
  currentPassengerSeatIndex?: number | null;
  onPassengerSelect?: (passenger: PassengerProfile) => void;
  modeOverride?: "day" | "night" | null;
  resetViewToken?: number;
  onAvailabilityChange?: (available: boolean) => void;
  onReadTheory?: () => void;
}

function SceneFallback({ reason = "La 3D n’est pas disponible sur cet appareil.", onReadTheory }: { reason?: string; onReadTheory?: () => void }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#79c2ff] to-[#174f91] text-center text-white">
      <div className="bus-scene-fallback absolute inset-x-3 bottom-3 top-48 grid place-items-center overflow-y-auto sm:top-52 lg:top-40">
      <div role="status" className="max-w-md rounded-2xl border border-white/20 bg-[#07142b] p-5 shadow-2xl">
        <div className="mb-3 text-5xl" aria-hidden="true">🚌</div>
        <p className="text-lg font-black">Le bus reste au dépôt</p>
        <p className="mt-2 text-sm text-white/80">{reason}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
        {onReadTheory && <button type="button" onClick={onReadTheory} className="min-h-11 rounded-xl bg-[#ffd23f] px-4 py-2 font-black text-[#0d2190] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Lire la théorie</button>}
        <a href={THEORY_VIDEO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-white/30 px-4 py-2 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Voir la vidéo ↗</a>
        <button
          type="button"
          className="min-h-11 rounded-xl border border-white/30 px-4 py-2 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          onClick={() => window.location.reload()}
        >
          Réessayer
        </button>
        </div>
      </div>
      </div>
    </div>
  );
}

class SceneErrorBoundary extends Component<{ children: ReactNode; onAvailabilityChange?: (available: boolean) => void; onReadTheory?: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onAvailabilityChange?.(false);
    console.error("Impossible d’initialiser la scène 3D", error, info);
  }

  render() {
    return this.state.failed
      ? <SceneFallback onReadTheory={this.props.onReadTheory} reason="Le chargement de la scène a échoué. Vous pouvez relancer l’expérience." />
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

function useWebGLSupport() {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    // Le fallback HTML d'un <canvas> reste invisible quand le navigateur
    // sait afficher un canvas mais ne peut pas créer de contexte WebGL2.
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

function AdaptiveDpr({ lowPower, onDprChange }: { lowPower: boolean; onDprChange: (value: number) => void }) {
  const setDpr = useThree((state) => state.setDpr);
  const baseDpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.15 : 1.6);
  const sampleRef = useRef(createDprSample(baseDpr));

  useEffect(() => {
    sampleRef.current = createDprSample(baseDpr);
    setDpr(baseDpr);
    onDprChange(baseDpr);
  }, [baseDpr, setDpr, onDprChange]);

  useFrame((_, dt) => {
    const next = sampleSceneDpr(sampleRef.current, dt, baseDpr, lowPower ? 0.65 : 0.75);
    if (next !== null) { setDpr(next); onDprChange(next); }
  });

  return null;
}

/** Budget de 60 images par seconde pour les écrans à rafraîchissement élevé. */
function CappedFrameLoop({ paused }: { paused: boolean }) {
  const advance = useThree((state) => state.advance);
  const clock = useThree((state) => state.clock);

  useEffect(() => {
    if (paused) return;
    const frameInterval = 1000 / 60;
    let frame = 0;
    let origin: number | null = null;
    let lastTick: number | null = null;
    let frameBudget = 0;

    const tick = (now: number) => {
      if (origin === null) origin = now - clock.elapsedTime * 1000;
      if (lastTick !== null) {
        const elapsed = now - lastTick;
        frameBudget = elapsed > 100 ? frameInterval : frameBudget + elapsed;
      }
      lastTick = now;
      if (frameBudget >= frameInterval) {
        advance((now - origin) / 1000);
        // Pas de rattrapage en rafale après une pause ou une image lente.
        frameBudget = Math.min(frameBudget - frameInterval, frameInterval - 0.001);
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [advance, clock, paused]);

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
  freeView = false,
  headlights,
  hornPulse,
  letterShortcutsEnabled = true,
  partyOn = false,
  partyDancing = false,
  tvOn,
  onVideoPlaybackChange,
  worldRef,
  onArrived,
  passengerCount = 0,
  seatCapacity = passengerCount,
  vacantSeatRanges = [],
  currentSeatRow = 3,
  isMutedForFullscreen = false,
  uiPaused = false,
  hasEntered = false,
  boardingPending = false,
  passengerProfiles = [],
  currentPassengerSeatIndex = null,
  onPassengerSelect,
  modeOverride,
  resetViewToken = 0,
  onAvailabilityChange,
  onReadTheory,
}: SceneProps) {
  const { hidden, lowPower, reducedMotion } = useSceneRuntimeState();
  const webGLSupported = useWebGLSupport();
  const [contextLost, setContextLost] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [sceneDpr, setSceneDpr] = useState(1);
  useEffect(() => {
    onAvailabilityChange?.(canvasReady && !contextLost);
  }, [canvasReady, contextLost, onAvailabilityChange]);
  const renderPaused = hidden || contextLost || uiPaused;
  const playbackSuspended = hidden || contextLost;
  // Calcul géométrique de la cabine pour la caméra
  const numRows = useMemo(() => getBusPhysicalRows(seatCapacity), [seatCapacity]);
  const rearWallZ = useMemo(() => getBusRearWallZ(numRows), [numRows]);
  const cabinLength = useMemo(() => rearWallZ - BUS_FRONT_Z, [rearWallZ]);
  const cabinCenterZ = useMemo(() => (BUS_FRONT_Z + rearWallZ) / 2, [rearWallZ]);
  const cameraFar = useMemo(() => getBusCameraFar(cabinLength), [cabinLength]);
  const journey=useRef(createJourneyState());

  // Position Z du regard du passager (rangée choisie)
  const clampedRow = Math.max(0, Math.min(numRows - 1, currentSeatRow));
  const avatarSeat = getAvatarSeat(seatCapacity, clampedRow, currentPassengerSeatIndex);
  const currentSeatZ = avatarSeat.seat.z + 0.03;
  const currentSeatX = avatarSeat.seat.x;
  const tvPositions = useMemo(() => getTvPositions(numRows, TV_POSITION), [numRows]);
  const tvTargetZ = tvPositions[getActiveTvIndex(tvPositions, clampedRow)][2];

  if (webGLSupported === false) return <SceneFallback onReadTheory={onReadTheory} />;
  if (webGLSupported === null) return <div role="status" className="sr-only">Préparation de la scène 3D…</div>;

  return (
    <SceneErrorBoundary onAvailabilityChange={onAvailabilityChange} onReadTheory={onReadTheory}>
      <div className="absolute inset-0">
      <Canvas
      shadows={lowPower ? false : "basic"}
      frameloop="never"
      dpr={sceneDpr}
      camera={{ position: DEFAULT_CAMERA_POS.toArray(), fov: 55, near: 0.1, far: cameraFar }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
      onCreated={() => setCanvasReady(true)}
      fallback={<div aria-hidden={canvasReady}><SceneFallback onReadTheory={onReadTheory} /></div>}
    >
      <WebGLContextGuard setLost={setContextLost} />
      <CappedFrameLoop paused={renderPaused} />
      <AdaptiveDpr lowPower={lowPower} onDprChange={setSceneDpr} />
      <BoardingController phase={phase} journey={journey} worldRef={worldRef} seatZ={currentSeatZ-0.03} seatX={currentSeatX}
        numRows={numRows} boardingPending={boardingPending} reducedMotion={reducedMotion}/>
      <DayNight worldRef={worldRef} modeOverride={modeOverride} lowPower={lowPower} reducedMotion={reducedMotion} />
      <Weather worldRef={worldRef} lowPower={lowPower} reducedMotion={reducedMotion} />
      <Suspense fallback={null}>
        <Bus
          headlights={headlights}
          hornPulse={hornPulse}
          partyOn={partyOn}
          partyDancing={partyDancing}
          tvOn={tvOn}
          onVideoPlaybackChange={onVideoPlaybackChange}
          phase={phase}
          freeView={freeView}
          journey={journey}
          worldRef={worldRef}
          passengerCount={passengerCount}
          seatCapacity={seatCapacity}
          vacantSeatRanges={vacantSeatRanges}
          reservedRow={clampedRow}
          isMutedForFullscreen={isMutedForFullscreen}
          hasEntered={hasEntered}
          boardingPending={boardingPending}
          passengerProfiles={passengerProfiles}
          currentPassengerSeatIndex={currentPassengerSeatIndex}
          onPassengerSelect={onPassengerSelect}
          reducedMotion={reducedMotion}
          lowPower={lowPower}
          playbackSuspended={playbackSuspended}
        />
      </Suspense>
      <BoardingAvatar journey={journey} physicalSeatIndex={avatarSeat.physicalSeatIndex} passengerIndex={currentPassengerSeatIndex} partyOn={partyDancing} hornPulse={hornPulse} reducedMotion={reducedMotion}/>
      <World worldRef={worldRef} reducedMotion={reducedMotion} lowPower={lowPower} phase={freeView ? "outside" : phase} cabinCenterZ={cabinCenterZ} />
      <CameraRig
        letterShortcutsEnabled={letterShortcutsEnabled}
        resetViewToken={resetViewToken}
        phase={phase}
        freeView={freeView}
        journey={journey}
        onArrived={onArrived}
        cabinLength={cabinLength}
        cabinCenterZ={cabinCenterZ}
        cameraFar={cameraFar}
        currentSeatZ={currentSeatZ}
        currentSeatX={currentSeatX}
        currentPassengerSeatIndex={currentPassengerSeatIndex}
        tvTargetZ={tvTargetZ}
        reducedMotion={reducedMotion}
      />
      </Canvas>
      {contextLost && (
        <SceneFallback onReadTheory={onReadTheory} reason="Le moteur graphique a été suspendu par l’appareil. Le contexte WebGL est en cours de restauration ; vous pouvez aussi relancer l’expérience." />
      )}
      </div>
    </SceneErrorBoundary>
  );
}
