"use client";

import PartyMusicClock from "./PartyMusicClock";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { BasicShadowMap, PCFShadowMap, type Camera } from "three";
import Bus from "./Bus";
import World from "./World";
import DayNight from "./DayNight";
import Weather from "./Weather";
import CameraRig from "./CameraRig";
import BoardingController from "./BoardingController";
import BoardingAvatar from "./BoardingAvatar";
import { createJourneyState } from "@/lib/bus-journey";
import { getAvatarSeat, getBusPhysicalRows } from "@/lib/bus-occupancy";
import { getBusCameraFar, getExteriorMaxDistance } from "@/lib/bus-camera";
import { getActiveTvIndex, getTvPositions, getBusRearWallZ, BUS_FRONT_Z } from "@/lib/bus-layout";
import {
  DEFAULT_CAMERA_POS,
  TV_POSITION,
  type Phase,
  type WorldState,
} from "./constants";
import type { PassengerProfile } from "@/types/passenger";
import { isPassengerAvatarId } from "@/lib/passenger-avatar";
import { THEORY_VIDEO_URL } from "@/lib/theory-video";
import {
  DEFAULT_GRAPHICS_SETTINGS,
  classifyGpuHardware,
  createPerformanceMonitor,
  getSceneGeometryBudgets,
  resolveGraphicsProfile,
  sampleScenePerformance,
  syncPerformanceMonitorProfile,
  type GraphicsQualityTier,
  type GraphicsSettings,
  type PerformanceMonitor,
  type ResolvedGraphicsProfile,
  type SceneGraphicsTelemetry,
} from "@/lib/scene-performance";
import { BusFrontIcon, ExternalArrowIcon } from "../ui/BusIcons";

interface SceneProps {
  phase: Phase;
  freeView?: boolean;
  letterShortcutsEnabled?: boolean;
  graphicsSettings?: GraphicsSettings;
  onTelemetryChange?: (telemetry: SceneGraphicsTelemetry) => void;
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
  initialStatsReady?: boolean;
  vacantSeatRanges?: Array<[number, number, number]>;
  currentSeatRow?: number;
  currentSeatColumn?: number | null;
  isMutedForFullscreen?: boolean;
  uiPaused?: boolean;
  messagesBackdrop?: boolean;
  hasEntered?: boolean;
  boardingPending?: boolean;
  boardingFromSeat?: boolean;
  passengerProfiles?: PassengerProfile[];
  profileRevision?: number;
  currentPassengerSeatIndex?: number | null;
  currentPassengerName?: string;
  currentPassengerAvatarId?: string | null;
  onPassengerSelect?: (passenger: PassengerProfile) => void;
  modeOverride?: "day" | "night" | null;
  resetViewToken?: number;
  onAvailabilityChange?: (available: boolean) => void;
  onReadTheory?: () => void;
}

function SceneFallback({ reason = "La 3D n’est pas disponible sur cet appareil.", onReadTheory }: { reason?: string; onReadTheory?: () => void }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#79c2ff] to-[#174f91] text-center text-white">
      <div className="bus-scene-fallback absolute inset-x-3 bottom-3 top-52 grid place-items-center overflow-y-auto sm:top-52 lg:top-40">
      <div role="status" className="bus-case-solid max-w-md rounded-2xl p-5">
        <div className="bus-icon-badge mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl" aria-hidden="true">
          <BusFrontIcon className="h-9 w-9" />
        </div>
        <p className="text-lg font-black text-white">Le bus reste au dépôt</p>
        <p className="mt-2 text-sm text-[#dfe5ff]">{reason}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-x-2 gap-y-2.5">
        {onReadTheory && (
          <button
            type="button"
            onClick={onReadTheory}
            className="bus-btn-primary inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-5 py-2.5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b24]"
          >
            Lire la théorie
          </button>
        )}
        <a
          href={THEORY_VIDEO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bus-btn-secondary inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[1.125rem] px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b24]"
        >
          Voir la vidéo
          <ExternalArrowIcon />
        </a>
        <button
          type="button"
          className="bus-btn-secondary inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[1.125rem] px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#947eef] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b24]"
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
      ? <SceneFallback onReadTheory={this.props.onReadTheory} reason="Le chargement de la scène a échoué. Tu peux relancer l’expérience." />
      : this.props.children;
  }
}

interface GpuProbeParams {
  renderer: string | null;
  maxTextureSize: number;
  maxSamples: number;
}

function readWebGLParams(context: WebGL2RenderingContext | WebGLRenderingContext): GpuProbeParams {
  let renderer: string | null = null;
  try {
    const debugInfo = context.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      const unmasked = context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      if (typeof unmasked === "string" && unmasked.trim()) renderer = unmasked.trim();
    }
    if (!renderer) {
      const basic = context.getParameter(context.RENDERER);
      if (typeof basic === "string" && basic.trim()) renderer = basic.trim();
    }
  } catch {
    /* Certains navigateurs bloquent la lecture du nom GPU. */
  }
  let maxTextureSize = 8192;
  let maxSamples = 4;
  try {
    const texSize = context.getParameter(context.MAX_TEXTURE_SIZE);
    if (typeof texSize === "number" && Number.isFinite(texSize)) maxTextureSize = texSize;
    if ("MAX_SAMPLES" in context) {
      const samples = context.getParameter((context as WebGL2RenderingContext).MAX_SAMPLES);
      if (typeof samples === "number" && Number.isFinite(samples)) maxSamples = samples;
    }
  } catch {
    /* Ignorer si l'attribut n'est pas exposé. */
  }
  return { renderer, maxTextureSize, maxSamples };
}

function readSceneRuntimeState() {
  if (typeof window === "undefined") {
    return {
      hidden: false,
      constrainedNetwork: false,
      hardwareConcurrency: 8,
      deviceMemory: 8,
      coarsePointer: false,
      shortSide: 900,
      devicePixelRatio: 1,
      reducedMotion: false,
    };
  }
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const constrainedNetwork = connection?.saveData === true
    || connection?.effectiveType === "slow-2g"
    || connection?.effectiveType === "2g";
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  return {
    hidden: document.hidden,
    constrainedNetwork,
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    deviceMemory,
    coarsePointer,
    // La petite dimension reste stable quand un téléphone pivote, contrairement à innerWidth seul.
    shortSide,
    devicePixelRatio: window.devicePixelRatio || 1,
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
      setState((previous) => {
        const next = readSceneRuntimeState();
        return previous.hidden === next.hidden
          && previous.constrainedNetwork === next.constrainedNetwork
          && previous.hardwareConcurrency === next.hardwareConcurrency
          && previous.deviceMemory === next.deviceMemory
          && previous.coarsePointer === next.coarsePointer
          && previous.shortSide === next.shortSide
          && previous.devicePixelRatio === next.devicePixelRatio
          && previous.reducedMotion === next.reducedMotion
          ? previous
          : next;
      });
    };
    const frame = requestAnimationFrame(update);
    window.addEventListener("resize", update, { passive: true });
    document.addEventListener("visibilitychange", update);
    reducedQuery.addEventListener("change", update);
    connection?.addEventListener?.("change", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      document.removeEventListener("visibilitychange", update);
      reducedQuery.removeEventListener("change", update);
      connection?.removeEventListener?.("change", update);
    };
  }, []);

  return state;
}

function useWebGLProbe() {
  const [probeState, setProbeState] = useState<{ supported: boolean | null; params: GpuProbeParams | null }>({
    supported: null,
    params: null,
  });
  useEffect(() => {
    // Le fallback HTML d'un <canvas> reste invisible quand le navigateur
    // sait afficher un canvas mais ne peut pas créer de contexte WebGL2.
    const frame = requestAnimationFrame(() => {
      const probe = document.createElement("canvas");
      let context: WebGL2RenderingContext | null = null;
      try {
        context = probe.getContext("webgl2", { powerPreference: "high-performance" });
        if (!context) {
          setProbeState({ supported: false, params: null });
        } else {
          setProbeState({ supported: true, params: readWebGLParams(context) });
        }
      } catch {
        setProbeState({ supported: false, params: null });
      } finally {
        context?.getExtension("WEBGL_lose_context")?.loseContext();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return probeState;
}

function PerformanceDirector({
  recommendedTier,
  activeAutoTier,
  canPromoteTier,
  isAutoPreset,
  adaptiveFps,
  profile,
  refreshKey,
  dprKey,
  paused,
  canRefreshPaused,
  onAutoTierChange,
  onDprChange,
}: {
  recommendedTier: GraphicsQualityTier;
  activeAutoTier: GraphicsQualityTier;
  canPromoteTier: boolean;
  isAutoPreset: boolean;
  adaptiveFps: boolean;
  profile: ResolvedGraphicsProfile;
  refreshKey: string;
  dprKey: string;
  paused: boolean;
  canRefreshPaused: boolean;
  onAutoTierChange: (next: { baseTier: GraphicsQualityTier; tier: GraphicsQualityTier }) => void;
  onDprChange: (next: { key: string; dpr: number }) => void;
}) {
  const setDpr = useThree((state) => state.setDpr);
  const get = useThree((state) => state.get);
  const advance = useThree((state) => state.advance);
  const monitorRef = useRef<PerformanceMonitor | null>(null);
  const mountedRefreshRef = useRef<string | null>(null);

  useEffect(() => {
    if (!monitorRef.current) {
      monitorRef.current = createPerformanceMonitor({
        tier: activeAutoTier,
        recommendedTier,
        canPromoteTier,
        initialDpr: profile.maxDpr,
      });
    } else {
      syncPerformanceMonitorProfile(monitorRef.current, {
        tier: activeAutoTier,
        recommendedTier,
        canPromoteTier,
        maxDpr: profile.maxDpr,
        minDpr: profile.minDpr,
      });
    }
    if (get().viewport.dpr !== profile.maxDpr) setDpr(profile.maxDpr);
  }, [activeAutoTier, canPromoteTier, dprKey, get, profile.maxDpr, profile.minDpr, recommendedTier, setDpr]);

  useEffect(() => {
    const previous = mountedRefreshRef.current;
    mountedRefreshRef.current = refreshKey;
    if (previous && previous !== refreshKey && paused && canRefreshPaused) {
      // Actualise une image derrière le modal Paramètres pour refléter portée, ombres et densité.
      const frame = requestAnimationFrame(() => advance(get().clock.elapsedTime + 0.001));
      return () => cancelAnimationFrame(frame);
    }
  }, [advance, canRefreshPaused, get, paused, refreshKey]);

  useFrame((_, dt) => {
    const monitor = (monitorRef.current ??= createPerformanceMonitor({
      tier: activeAutoTier,
      recommendedTier,
      canPromoteTier,
      initialDpr: profile.maxDpr,
    }));
    const result = sampleScenePerformance(monitor, dt, {
      minDpr: profile.minDpr,
      maxDpr: profile.maxDpr,
      adaptiveFps,
      isAutoPreset,
    });
    if (result.dprChanged) {
      setDpr(result.dpr);
      onDprChange({ key: dprKey, dpr: result.dpr });
    }
    if (result.tierChanged) {
      onAutoTierChange({ baseTier: recommendedTier, tier: result.tier });
    }
  });

  return null;
}

/** Laisse 1 image par vSync jusqu'à 90 Hz sans sauter sur gigue et plafonne les écrans 120/144 Hz+. */
function CappedFrameLoop({ paused }: { paused: boolean }) {
  const advance = useThree((state) => state.advance);
  const clock = useThree((state) => state.clock);

  useEffect(() => {
    if (paused) return;
    const minFrameInterval = 1000 / 106;
    let frame = 0;
    let origin: number | null = null;
    let lastTick: number | null = null;
    let sinceRender = minFrameInterval;

    const tick = (now: number) => {
      if (origin === null) origin = now - clock.elapsedTime * 1000;
      if (lastTick !== null) {
        const elapsed = now - lastTick;
        if (elapsed > 100) {
          // Recale l'horloge après un gel pour garder un dt sain dans sampleSceneDpr.
          origin = now - (clock.elapsedTime * 1000 + 100);
          sinceRender = minFrameInterval;
        } else {
          sinceRender += elapsed;
        }
      }
      lastTick = now;
      if (sinceRender >= minFrameInterval) {
        advance((now - origin) / 1000);
        sinceRender = 0;
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
  const advance = useThree((state) => state.advance);

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
      advance(performance.now() / 1000);
    };
    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost, false);
      canvas.removeEventListener("webglcontextrestored", onRestored, false);
    };
  }, [advance, gl, invalidate, setLost]);

  return null;
}

function SuspenseReady({ onReady }: { onReady: (ready: boolean) => void }) {
  useEffect(() => {
    onReady(true);
    return () => onReady(false);
  }, [onReady]);

  return null;
}

export default function Scene({
  phase,
  freeView = false,
  headlights,
  hornPulse,
  letterShortcutsEnabled = true,
  graphicsSettings = DEFAULT_GRAPHICS_SETTINGS,
  onTelemetryChange,
  partyOn = false,
  partyDancing = false,
  tvOn,
  onVideoPlaybackChange,
  worldRef,
  onArrived,
  passengerCount = 0,
  seatCapacity = passengerCount,
  initialStatsReady = true,
  vacantSeatRanges = [],
  currentSeatRow = 3,
  currentSeatColumn = null,
  isMutedForFullscreen = false,
  uiPaused = false,
  messagesBackdrop = false,
  hasEntered = false,
  boardingPending = false,
  boardingFromSeat = false,
  passengerProfiles = [],
  profileRevision = 0,
  currentPassengerSeatIndex = null,
  currentPassengerName = "",
  currentPassengerAvatarId = null,
  onPassengerSelect,
  modeOverride,
  resetViewToken = 0,
  onAvailabilityChange,
  onReadTheory,
}: SceneProps) {
  const runtimeState = useSceneRuntimeState();
  const { hidden, reducedMotion } = runtimeState;
  const webGLProbe = useWebGLProbe();
  const [canvasGpuParams, setCanvasGpuParams] = useState<GpuProbeParams | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [busReady, setBusReady] = useState(false);

  const effectiveGpuParams = canvasGpuParams ?? webGLProbe.params;
  const hardware = useMemo(() => classifyGpuHardware({
    renderer: effectiveGpuParams?.renderer,
    maxTextureSize: effectiveGpuParams?.maxTextureSize,
    maxSamples: effectiveGpuParams?.maxSamples,
    hardwareConcurrency: runtimeState.hardwareConcurrency,
    deviceMemory: runtimeState.deviceMemory,
    coarsePointer: runtimeState.coarsePointer,
    shortSide: runtimeState.shortSide,
    devicePixelRatio: runtimeState.devicePixelRatio,
    constrainedNetwork: runtimeState.constrainedNetwork,
  }), [effectiveGpuParams, runtimeState]);

  const recommendedTier = runtimeState.constrainedNetwork ? "low" : hardware.recommendedTier;
  const [autoTierOverride, setAutoTierOverride] = useState<{ baseTier: GraphicsQualityTier; tier: GraphicsQualityTier } | null>(null);
  const activeAutoTier = autoTierOverride && autoTierOverride.baseTier === recommendedTier
    ? autoTierOverride.tier
    : recommendedTier;

  const profile = useMemo(
    () => resolveGraphicsProfile(graphicsSettings, activeAutoTier, runtimeState.devicePixelRatio),
    [graphicsSettings, activeAutoTier, runtimeState.devicePixelRatio],
  );
  const dprKey = `${profile.activeTier}:${profile.pixelQuality}:${profile.maxDpr}:${profile.minDpr}:${graphicsSettings.adaptiveFps}`;
  const [dprOverride, setDprOverride] = useState<{ key: string; dpr: number } | null>(null);
  const sceneDpr = dprOverride && dprOverride.key === dprKey ? dprOverride.dpr : profile.maxDpr;

  useEffect(() => {
    onAvailabilityChange?.(canvasReady && busReady && !contextLost);
  }, [busReady, canvasReady, contextLost, onAvailabilityChange]);
  const renderPaused = hidden || contextLost || uiPaused;
  const playbackSuspended = hidden || contextLost;
  // Calcul géométrique de la cabine pour la caméra
  const numRows = useMemo(() => getBusPhysicalRows(seatCapacity), [seatCapacity]);
  const rearWallZ = useMemo(() => getBusRearWallZ(numRows), [numRows]);
  const cabinLength = useMemo(() => rearWallZ - BUS_FRONT_Z, [rearWallZ]);
  const cabinCenterZ = useMemo(() => (BUS_FRONT_Z + rearWallZ) / 2, [rearWallZ]);
  const budgets = useMemo(
    () => getSceneGeometryBudgets(profile, cabinLength, getExteriorMaxDistance(cabinLength)),
    [profile, cabinLength],
  );
  const cameraFar = useMemo(
    () => Math.max(getBusCameraFar(cabinLength, profile.baseCameraFar), budgets.cameraFar),
    [budgets.cameraFar, cabinLength, profile.baseCameraFar],
  );
  const refreshKey = `${profile.activeTier}:${profile.drawDistance}:${profile.pixelQuality}:${profile.shadows}:${profile.worldDensity}:${budgets.fogFar}:${budgets.bridgeLength}:${sceneDpr}`;

  const lastTelemetryRef = useRef<SceneGraphicsTelemetry | null>(null);
  useEffect(() => {
    if (!onTelemetryChange) return;
    const next: SceneGraphicsTelemetry = {
      gpuLabel: hardware.gpuLabel,
      recommendedTier,
      activeTier: profile.activeTier,
      currentDpr: sceneDpr,
      fogFar: budgets.fogFar,
    };
    const previous = lastTelemetryRef.current;
    if (
      previous
      && previous.gpuLabel === next.gpuLabel
      && previous.recommendedTier === next.recommendedTier
      && previous.activeTier === next.activeTier
      && Math.abs(previous.currentDpr - next.currentDpr) < 0.01
      && previous.fogFar === next.fogFar
    ) {
      return;
    }
    lastTelemetryRef.current = next;
    onTelemetryChange(next);
  }, [budgets.fogFar, hardware.gpuLabel, onTelemetryChange, profile.activeTier, recommendedTier, sceneDpr]);

  const journey=useRef(createJourneyState());
  const visitCameraRef = useRef<Camera>(null);

  // Position Z du regard du passager (rangée choisie)
  const clampedRow = Math.max(0, Math.min(numRows - 1, currentSeatRow));
  const avatarSeat = getAvatarSeat(seatCapacity, clampedRow, currentPassengerSeatIndex, currentSeatColumn);
  const currentSeatZ = avatarSeat.seat.z + 0.03;
  const currentSeatX = avatarSeat.seat.x;
  const tvPositions = useMemo(() => getTvPositions(numRows, TV_POSITION), [numRows]);
  const tvTargetZ = tvPositions[getActiveTvIndex(tvPositions, clampedRow)][2];
  const currentPassengerProfile = useMemo<PassengerProfile | undefined>(() => {
    if (currentPassengerSeatIndex === null) return undefined;
    return passengerProfiles.find((p) => p.seatIndex === currentPassengerSeatIndex) ?? {
      seatIndex: currentPassengerSeatIndex,
      displayName: currentPassengerName,
      comment: null,
      avatarId: isPassengerAvatarId(currentPassengerAvatarId) ? currentPassengerAvatarId : null,
    };
  }, [currentPassengerSeatIndex, currentPassengerName, currentPassengerAvatarId, passengerProfiles]);

  if (webGLProbe.supported === false) return <SceneFallback onReadTheory={onReadTheory} />;
  if (webGLProbe.supported === null) return <div role="status" className="sr-only">Préparation de la scène 3D…</div>;

  return (
    <SceneErrorBoundary onAvailabilityChange={onAvailabilityChange} onReadTheory={onReadTheory}>
      <div className="absolute inset-0">
      <Canvas
      className="bus-scene-canvas"
      shadows={profile.canvasShadows}
      frameloop="never"
      dpr={sceneDpr}
      camera={{ position: DEFAULT_CAMERA_POS.toArray(), fov: 55, near: 0.2, far: cameraFar }}
      gl={{ antialias: profile.antialias, alpha: false, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", touchAction: "none", isolation: "isolate" }}
      onCreated={({ gl }) => {
        if (profile.canvasShadows !== false) {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = profile.canvasShadows === "basic" ? BasicShadowMap : PCFShadowMap;
        }
        setCanvasReady(true);
        const context = gl.getContext();
        if (context) {
          const next = readWebGLParams(context);
          setCanvasGpuParams((prev) =>
            prev
            && prev.renderer === next.renderer
            && prev.maxTextureSize === next.maxTextureSize
            && prev.maxSamples === next.maxSamples
              ? prev
              : next,
          );
        }
      }}
      fallback={<div aria-hidden={canvasReady}><SceneFallback onReadTheory={onReadTheory} /></div>}
    >
      <WebGLContextGuard setLost={setContextLost} />
      <PartyMusicClock />
      <CappedFrameLoop paused={renderPaused} />
      <PerformanceDirector
        recommendedTier={recommendedTier}
        activeAutoTier={activeAutoTier}
        canPromoteTier={hardware.canPromoteTier}
        isAutoPreset={graphicsSettings.preset === "auto"}
        adaptiveFps={graphicsSettings.adaptiveFps}
        profile={profile}
        refreshKey={refreshKey}
        dprKey={dprKey}
        paused={renderPaused}
        canRefreshPaused={!hidden && !contextLost}
        onAutoTierChange={setAutoTierOverride}
        onDprChange={setDprOverride}
      />
      <BoardingController phase={phase} journey={journey} worldRef={worldRef} seatZ={currentSeatZ-0.03} seatX={currentSeatX}
        numRows={numRows} boardingPending={boardingPending} boardingFromSeat={boardingFromSeat} reducedMotion={reducedMotion}/>
      <DayNight
        worldRef={worldRef}
        modeOverride={modeOverride}
        lowPower={profile.lowPower}
        reducedMotion={reducedMotion}
        cameraFar={cameraFar}
        fogNear={budgets.fogNear}
        fogFar={budgets.fogFar}
        shadowsEnabled={profile.canvasShadows !== false}
        shadowMapSize={profile.shadowMapSize}
        shadowsType={profile.canvasShadows}
        shadowsQuality={profile.shadows}
        starCount={profile.starCount}
        cabinCenterZ={cabinCenterZ}
        cabinLength={cabinLength}
      />
      <Weather
        worldRef={worldRef}
        lowPower={profile.lowPower}
        rainCount={profile.rainCount}
        snowCount={profile.snowCount}
        reducedMotion={reducedMotion}
        cabinCenterZ={cabinCenterZ}
        cabinLength={cabinLength}
      />
      <Suspense fallback={null}>
        <SuspenseReady onReady={setBusReady} />
        <Bus
          headlights={headlights}
          hornPulse={hornPulse}
          partyOn={partyOn}
          partyDancing={partyDancing}
          tvOn={tvOn}
          onVideoPlaybackChange={onVideoPlaybackChange}
          phase={phase}
          freeView={freeView}
          messagesBackdrop={messagesBackdrop}
          visitCameraRef={visitCameraRef}
          journey={journey}
          worldRef={worldRef}
          passengerCount={passengerCount}
          seatCapacity={seatCapacity}
          vacantSeatRanges={vacantSeatRanges}
          reservedRow={clampedRow}
          reservedColumn={currentSeatColumn}
          isMutedForFullscreen={isMutedForFullscreen}
          hasEntered={hasEntered}
          boardingPending={boardingPending}
          passengerProfiles={passengerProfiles}
          profileRevision={profileRevision}
          currentPassengerSeatIndex={currentPassengerSeatIndex}
          onPassengerSelect={onPassengerSelect}
          reducedMotion={reducedMotion}
          lowPower={profile.lowPower}
          detailedPassengerLimit={profile.detailedPassengerLimit}
          simplifiedPassengerLimit={profile.simplifiedPassengerLimit}
          playbackSuspended={playbackSuspended}
        />
      </Suspense>
      <BoardingAvatar journey={journey} physicalSeatIndex={avatarSeat.physicalSeatIndex} passengerIndex={currentPassengerSeatIndex} avatarId={currentPassengerAvatarId} profile={currentPassengerProfile} onSelect={phase !== "inside" || freeView ? onPassengerSelect : undefined} partyOn={partyDancing} hornPulse={hornPulse} reducedMotion={reducedMotion} firstPerson={phase === "inside" && !freeView}/>
      <World
        worldRef={worldRef}
        reducedMotion={reducedMotion}
        lowPower={profile.lowPower}
        propFraction={profile.propFraction}
        islandCullDistance={budgets.islandCullDistance}
        propCullDistance={budgets.propCullDistance}
        bridgeLengthOverride={budgets.bridgeLength}
        seaCreatureSlots={profile.seaCreatureSlots}
        seaCreatureCullAhead={profile.seaCreatureCullAhead}
        seaCreatureCullBehind={profile.seaCreatureCullBehind}
        phase={phase}
        cabinCenterZ={cabinCenterZ}
        cabinLength={cabinLength}
      />
      <CameraRig
        letterShortcutsEnabled={letterShortcutsEnabled}
        resetViewToken={resetViewToken}
        phase={phase}
        freeView={freeView}
        messagesBackdrop={messagesBackdrop}
        journey={journey}
        onArrived={onArrived}
        cabinLength={cabinLength}
        cabinCenterZ={cabinCenterZ}
        cameraFar={cameraFar}
        visitCameraRef={visitCameraRef}
        initialStatsReady={initialStatsReady}
        inputsPaused={renderPaused || messagesBackdrop}
        currentSeatZ={currentSeatZ}
        currentSeatX={currentSeatX}
        currentPassengerSeatIndex={currentPassengerSeatIndex}
        currentPassengerAvatarId={currentPassengerAvatarId}
        tvTargetZ={tvTargetZ}
        reducedMotion={reducedMotion}
      />
      </Canvas>
      {contextLost && (
        <SceneFallback onReadTheory={onReadTheory} reason="Le moteur graphique a été suspendu par l’appareil. Le contexte WebGL est en cours de restauration ; tu peux aussi relancer l’expérience." />
      )}
      </div>
    </SceneErrorBoundary>
  );
}
