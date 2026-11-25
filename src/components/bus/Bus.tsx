"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { TV_POSITION, type WorldState } from "./constants";
import type { PassengerProfile } from "@/types/passenger";
import Passengers from "./Passengers";
import BusRelayPassenger from "./BusRelayPassenger";
import BusConfetti from "./BusConfetti";
import BusPartyLights from "./BusPartyLights";
import BusSpeedLines from "./BusSpeedLines";
import type { JourneyState } from "@/lib/bus-journey";
import { BusTvFrame, BusTvHousings, BusTvPlayer } from "./BusTv";
import { usePartyTvCards } from "./BusPartyTv";
import { getRenderedRowIndices, getActiveTvIndex, getCabinTvPositions, getSeatRowZ, getBusDoors, getBusRearWallZ, getWheelPositions, BUS_FRONT_Z, FIRST_SEAT_Z, type TvPosition } from "@/lib/bus-layout";
import { createVisibleBusRowRangeScratch, getBusPhysicalRows, getVisibleBusRowRange } from "@/lib/bus-occupancy";
import { advanceWiperAngle } from "@/lib/bus-wipers";
import BusExterior, { PillarInstances } from "./BusExterior";
import BusCabinInterior from "./BusCabinInterior";
import BusCockpit from "./BusCockpit";
import DistantBusCrowd from "./DistantBusCrowd";
import useBusResources from "./useBusResources";

interface BusProps {
  headlights: boolean;
  hornPulse: number;
  partyOn?: boolean;
  partyDancing?: boolean;
  tvOn: boolean;
  onVideoPlaybackChange?: (active: boolean) => void;
  phase: "outside" | "entering" | "inside" | "exiting";
  freeView?: boolean;
  messagesBackdrop?: boolean;
  visitCameraRef: React.RefObject<THREE.Camera | null>;
  worldRef: React.RefObject<WorldState>;
  passengerCount?: number;
  seatCapacity?: number;
  vacantSeatRanges?: Array<[number, number, number]>;
  reservedRow?: number;
  reservedColumn?: number | null;
  isMutedForFullscreen?: boolean;
  hasEntered?: boolean;
  boardingPending?: boolean;
  passengerProfiles?: PassengerProfile[];
  profileRevision?: number;
  currentPassengerSeatIndex?: number | null;
  journey:React.RefObject<JourneyState>;
  onPassengerSelect?: (passenger: PassengerProfile) => void;
  reducedMotion?: boolean;
  lowPower?: boolean;
  detailedPassengerLimit?: number;
  simplifiedPassengerLimit?: number;
  playbackSuspended?: boolean;
  shadersReady?: boolean;
  onContentReady?: (ready: boolean) => void;
  onLoadProgress?: (progress: number) => void;
}

function getTvIndexForCameraZ(positions: TvPosition[], camZ: number, minDistance: number): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  positions.forEach((position, index) => {
    const distance = camZ - position[2];
    if (distance < minDistance) return;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export default function Bus({
  headlights,
  hornPulse,
  partyOn = false,
  partyDancing = false,
  tvOn,
  onVideoPlaybackChange,
  phase,
  freeView = false,
  messagesBackdrop = false,
  visitCameraRef,
  worldRef,
  passengerCount = 0,
  seatCapacity = passengerCount,
  vacantSeatRanges = [],
  reservedRow = 3,
  reservedColumn = null,
  isMutedForFullscreen = false,
  hasEntered = false,
  boardingPending = false,
  passengerProfiles = [],
  profileRevision = 0,
  currentPassengerSeatIndex = null,
  journey,
  onPassengerSelect,
  reducedMotion = false,
  lowPower = false,
  detailedPassengerLimit,
  simplifiedPassengerLimit,
  playbackSuspended = false,
  shadersReady = true,
  onContentReady,
  onLoadProgress,
}: BusProps) {
  const group = useRef<THREE.Group>(null);
  const hat = useRef<THREE.Group>(null);
  const wheels = useRef<(THREE.Group | null)[]>([]);
  const wheelAngleRef = useRef(0);
  const leftWiper = useRef<THREE.Group>(null);
  const rightWiper = useRef<THREE.Group>(null);
  const exteriorView = freeView || messagesBackdrop;

  // Calcul dynamique de la longueur et des rangées du bus
  const numRows = getBusPhysicalRows(seatCapacity);
  const doors = useMemo(() => getBusDoors(numRows), [numRows]);

  // Position Z de chaque rangée de sièges (suit dynamiquement la zone observée par la caméra sur les très longs bus).
  // En cabine (phase === "inside" / "entering"), on applique aussi une hystérésis (±36 rangées dans la fenêtre
  // de ±68 rangées) afin que chaque changement de rangée ou de colonne ne reconstruise pas toute la cabine.
  const [cameraFocusRow, setCameraFocusRow] = useState(reservedRow);
  const cameraFocusRowRef = useRef(reservedRow);
  const [seatedFocusRow, setSeatedFocusRow] = useState(reservedRow);
  if (Math.abs(reservedRow - seatedFocusRow) > 36) {
    setSeatedFocusRow(reservedRow);
  }
  const focusNextAtRef = useRef(0);
  const fastMotionUntilRef = useRef(0);
  const prevCamPosRef = useRef(new THREE.Vector3());
  const curCamPosScratch = useMemo(() => new THREE.Vector3(), []);
  const prevCamDirRef = useRef(new THREE.Vector3(0, 0, -1));
  const curCamDirScratch = useMemo(() => new THREE.Vector3(), []);
  const prevCamDirInitRef = useRef(false);
  const visibleRowScratch = useMemo(() => createVisibleBusRowRangeScratch(), []);
  const activeFocusRow = numRows > 180
    ? ((phase === "outside" || freeView) ? cameraFocusRow : seatedFocusRow)
    : reservedRow;
  const activeFocusZ = getSeatRowZ(activeFocusRow);
  const renderedRowIndices = useMemo(
    () => getRenderedRowIndices(numRows, activeFocusRow),
    [numRows, activeFocusRow],
  );

  // Une TV fixe toutes les 7 rangées sur toute la zone affichée du bus (boîtiers + écrans instanciés en 6 draw calls).
  const tvPositions = useMemo(
    () => getCabinTvPositions(numRows, TV_POSITION, renderedRowIndices),
    [numRows, renderedRowIndices],
  );

  // Un seul vrai lecteur YouTube est conservé. La caméra intérieure regarde vers
  // l'avant du bus (Z décroissant) : un écran derrière la rangée serait invisible.
  // Les autres écrans restent des répéteurs visuels sans iframe supplémentaire.
  const targetSeatedTvIndex = useMemo(() => {
    if (phase !== "inside" && phase !== "entering") return 0;
    // Garde toujours allumée la TV la plus proche devant le passager tant qu'il ne l'a pas dépassée.
    return getActiveTvIndex(tvPositions, reservedRow, 0.25);
  }, [phase, reservedRow, tvPositions]);
  const [freeViewTvIndex, setFreeViewTvIndex] = useState(0);
  const freeViewTvIndexRef = useRef(0);
  const [seatedTvIndex, setSeatedTvIndex] = useState(() => targetSeatedTvIndex);
  const seatedTvIndexRef = useRef(targetSeatedTvIndex);
  const tvFocusNextCheckRef = useRef(0);
  const tvCamScratch = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    tvFocusNextCheckRef.current = 0;
  }, [phase, freeView, reservedRow, tvPositions]);

  const activeTvIndex = tvPositions.length <= 1
    ? 0
    : phase === "inside"
      ? (freeView
        ? Math.min(freeViewTvIndex, tvPositions.length - 1)
        : (reducedMotion ? targetSeatedTvIndex : Math.min(seatedTvIndex, tvPositions.length - 1)))
      : targetSeatedTvIndex;
  const activeTvPosition = tvPositions[activeTvIndex] ?? tvPositions[0];
  const viewerZ = getSeatRowZ(reservedRow) + 0.15;

  // Coordonnées Z dynamiques du bus
  const rearWallZ = getBusRearWallZ(numRows);
  const cabinLength = rearWallZ - BUS_FRONT_Z;
  const cabinCenterZ = (BUS_FRONT_Z + rearWallZ) / 2;

  // Piliers de vitres : 2 avant + 1 par jointure de rangée
  const PILLARS = useMemo(() => {
    const arr = [-4.55, -3.85];
    for (const row of renderedRowIndices) {
      arr.push(getSeatRowZ(row) - 0.05);
    }
    arr.push(rearWallZ - 0.05);
    return arr;
  }, [rearWallZ, renderedRowIndices]);

  const wheelPositions = useMemo(() => getWheelPositions(rearWallZ, doors), [rearWallZ, doors]);
  useEffect(() => {
    wheels.current.length = wheelPositions.length;
  }, [wheelPositions.length]);

  // Détection du moment d'extension pour animer le rebond
  const stretchRef = useRef(0);
  const prevRows = useRef(numRows);
  const bouncePhase = useRef(0);
  const wiperMotion = useRef({ phase: 0, running: false, cyclesPerSecond: 0.4 });
  useEffect(() => {
    if (numRows > prevRows.current) {
      stretchRef.current = performance.now();
    }
    prevRows.current = numRows;
  }, [numRows]);

  // Position et orientation de base du chapeau (posé au-dessus du toit et de son rehaussement y=3.42)
  const HAT_BASE_POS: [number, number, number] = useMemo(() => [0, 3.395, -3.55], []);
  const HAT_BASE_ROT: [number, number, number] = useMemo(() => [0, 0, 0], []);

  const { mats, montCorvoTex, hatGeo, ribbonGeo, sideLabel, tvOffTex, dashTex, licensePlateTex, contactShadowTex, resourcesReady, resourcesProgress } = useBusResources();
  const partyCards = usePartyTvCards(partyOn);

  // Montage progressif des sous-ensembles du bus sur des frames distinctes
  // sans jamais recompiler les lumières globales ni bloquer à bas FPS.
  const [mountStage, setMountStage] = useState(() => (phase === "entering" || phase === "inside" ? 3 : 0));
  const mountStageRef = useRef(phase === "entering" || phase === "inside" ? 3 : 0);
  const effectiveMountStage = phase === "entering" || phase === "inside" ? 3 : mountStage;

  useEffect(() => {
    onContentReady?.(effectiveMountStage >= 3 && resourcesReady);
  }, [effectiveMountStage, onContentReady, resourcesReady]);

  useEffect(() => {
    onLoadProgress?.((effectiveMountStage / 3) * 0.5 + resourcesProgress * 0.5);
  }, [effectiveMountStage, onLoadProgress, resourcesProgress]);

  // Cibles fixes pour les projecteurs de phares
  const leftTarget = useRef<THREE.Object3D>(null);
  const rightTarget = useRef<THREE.Object3D>(null);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const frameDt = Math.min(dt, 0.1);

    if (mountStageRef.current < 3) {
      if (phase === "entering" || phase === "inside") {
        mountStageRef.current = 3;
        setMountStage(3);
      } else if (shadersReady) {
        mountStageRef.current += 1;
        setMountStage(mountStageRef.current);
      }
    }

    const mult = (worldRef.current?.speedMultiplier ?? 1.0)*(worldRef.current.motionFactor??1);
    bouncePhase.current = (bouncePhase.current + frameDt * 8.5 * mult) % (Math.PI * 2);

    // La caisse reste d’équerre ; seule la suspension se déplace verticalement.
    if (group.current) {
      const sinceStretch = (performance.now() - stretchRef.current) / 1000;
      const stretchBounce = !reducedMotion &&
        sinceStretch < 0.9 ? Math.sin(sinceStretch * 20) * (0.9 - sinceStretch) * 0.05 : 0;

      const cabinIsStable = phase === "inside" || phase === "entering" || mult<0.02;
      const targetY = cabinIsStable || reducedMotion
        ? 0
        : (Math.sin(bouncePhase.current) * 0.014 + Math.sin(t * 2.1) * 0.008)
          * Math.min(1.4, Math.max(0.7, mult)) + stretchBounce;
      const settle = Math.min(1, frameDt * 10);
      group.current.position.y += (targetY - group.current.position.y) * settle;
      group.current.rotation.set(0, 0, 0);
    }

    // Une même phase garde les deux balais parallèles ; seule la cadence varie
    // doucement avec la vitesse du bus et l'intensité de la pluie.
    const wiperAngle = advanceWiperAngle(
      wiperMotion.current,
      worldRef.current?.weather === "rain",
      worldRef.current?.weatherIntensity ?? 0,
      mult,
      frameDt,
    );
    if (leftWiper.current) leftWiper.current.rotation.z = wiperAngle;
    if (rightWiper.current) rightWiper.current.rotation.z = wiperAngle;

    // Animation du chapeau : droit sur le bus avec oscillation dynamique au klaxon
    if (hat.current) {
      const since = (performance.now() - hornPulse) / 1000;
      const wobble = !reducedMotion && since < 0.9 ? Math.sin(since * 28) * (0.9 - since) * 0.03 : 0;
      hat.current.rotation.x = wobble;
      hat.current.rotation.y = 0;
      hat.current.rotation.z = 0;
    }

    // Rotation des roues du bus adaptée à la vitesse de défilement,
    // bornée sous le seuil stroboscopique des 8 boulons (π/8 rad/frame)
    // pour éviter tout mini-freeze visuel sur les jantes.
    if (phase !== "inside" || exteriorView) {
      const wheelStep = Math.min(Math.min(frameDt, 0.035) * 10.5 * mult, 0.28);
      wheelAngleRef.current = (wheelAngleRef.current + wheelStep) % (Math.PI * 2);
      const angle = wheelAngleRef.current;
      for (let i = 0; i < wheels.current.length; i++) {
        const w = wheels.current[i];
        // Le support tourne Y local vers -X monde : +Y fait rouler vers -Z.
        if (w) w.rotation.y = angle;
      }
    }

    // Streaming dynamique des rangées centré sur les rangées visibles les plus PROCHES de la caméra
    // (jusqu'à ~170 m avec visages, coiffures et chapeaux One Piece ; le LOD ultra-léger couvre déjà
    // 100 % des 5 000+ rangées pendant les mouvements rapides pour éviter tout re-upload GPU en plein mouvement).
    if (numRows > 180 && (phase === "outside" || freeView)) {
      const now = performance.now();
      state.camera.getWorldPosition(curCamPosScratch);
      state.camera.getWorldDirection(curCamDirScratch);
      if (prevCamDirInitRef.current) {
        const safeDt = Math.max(dt, 1 / 120);
        const dot = THREE.MathUtils.clamp(prevCamDirRef.current.dot(curCamDirScratch), -1, 1);
        const angularSpeed = Math.acos(dot) / safeDt;
        const moveSpeed = prevCamPosRef.current.distanceTo(curCamPosScratch) / safeDt;
        if (angularSpeed > 1.5 || moveSpeed > 28) {
          fastMotionUntilRef.current = now + 180;
        }
      } else {
        prevCamDirInitRef.current = true;
      }
      prevCamPosRef.current.copy(curCamPosScratch);
      prevCamDirRef.current.copy(curCamDirScratch);

      if (now >= fastMotionUntilRef.current && now >= focusNextAtRef.current) {
        const visible = getVisibleBusRowRange(state.camera, group.current, numRows, 8.0, visibleRowScratch);
        if (visible.minRow <= visible.maxRow) {
          const camRow = Math.round((state.camera.position.z - FIRST_SEAT_Z) / 1.25);
          const curFocus = cameraFocusRowRef.current;
          const halfWindow = 64;
          const clampedCam = THREE.MathUtils.clamp(camRow, visible.minRow, visible.maxRow);
          const wantMin = Math.max(visible.minRow, clampedCam - 42);
          const wantMax = Math.min(visible.maxRow, clampedCam + 42);
          // Si les rangées visibles proches de la caméra sont déjà couvertes par la fenêtre actuelle (±68),
          // ne pas déplacer focusRow pendant une simple orbite 360° autour du bus.
          const alreadyCovered = wantMin >= curFocus - 58 && wantMax <= curFocus + 58;
          const missingVisibleRow = wantMin < curFocus - 66 || wantMax > curFocus + 66;
          if (!alreadyCovered) {
            const visibleSpan = visible.maxRow - visible.minRow;
            const rawTarget = visibleSpan <= halfWindow * 2
              ? Math.round((visible.minRow + visible.maxRow) / 2)
              : THREE.MathUtils.clamp(clampedCam, visible.minRow + halfWindow, visible.maxRow - halfWindow);
            const targetFocusRow = rawTarget <= 8
              ? rawTarget
              : rawTarget >= numRows - 9
                ? rawTarget
                : Math.round(rawTarget / 8) * 8;
            const minStep = missingVisibleRow ? 1 : 20;
            if (Math.abs(targetFocusRow - curFocus) >= minStep) {
              cameraFocusRowRef.current = targetFocusRow;
              focusNextAtRef.current = now + 160;
              setCameraFocusRow(targetFocusRow);
            }
          }
        }
      }
    }

    // Suivi throttlé de la TV active selon la position réelle de la caméra en cabine
    if (phase !== "inside") {
      if (seatedTvIndexRef.current !== targetSeatedTvIndex) {
        seatedTvIndexRef.current = targetSeatedTvIndex;
        setSeatedTvIndex(targetSeatedTvIndex);
      }
      if (freeViewTvIndexRef.current !== targetSeatedTvIndex) {
        freeViewTvIndexRef.current = targetSeatedTvIndex;
        setFreeViewTvIndex(targetSeatedTvIndex);
      }
    } else if (tvPositions.length > 1 && group.current) {
      const now = performance.now();
      if (now >= tvFocusNextCheckRef.current) {
        tvFocusNextCheckRef.current = now + 200;
        const activeCam = visitCameraRef.current ?? state.camera;
        group.current.updateMatrixWorld();
        activeCam.getWorldPosition(tvCamScratch);
        group.current.worldToLocal(tvCamScratch);
        const camZ = tvCamScratch.z;
        if (freeView) {
          const nextFree = getTvIndexForCameraZ(tvPositions, camZ, 0.25);
          if (nextFree !== freeViewTvIndexRef.current) {
            freeViewTvIndexRef.current = nextFree;
            setFreeViewTvIndex(nextFree);
          }
        } else {
          const cur = Math.min(seatedTvIndexRef.current, tvPositions.length - 1);
          const target = targetSeatedTvIndex;
          const ready = cur === target
            || (target > cur && camZ - tvPositions[target][2] >= 0.25)
            || (target < cur && camZ - tvPositions[cur][2] < 0.25)
            || Math.abs(camZ - viewerZ) < 0.25;
          if (ready && cur !== target) {
            seatedTvIndexRef.current = target;
            setSeatedTvIndex(target);
          }
        }
      }
    }

  });

  return (
    <group ref={group} name="bus-vehicle">
      <BusExterior
        headlights={headlights}
        phase={phase}
        journey={journey}
        mats={mats}
        cabinLength={cabinLength}
        cabinCenterZ={cabinCenterZ}
        rearWallZ={rearWallZ}
        doors={doors}
        numRows={numRows}
        focusZ={activeFocusZ}
        lowPower={lowPower}
        wheelPositions={wheelPositions}
        wheels={wheels}
        leftWiper={leftWiper}
        rightWiper={rightWiper}
        leftTarget={leftTarget}
        rightTarget={rightTarget}
        sideLabel={sideLabel}
        reducedMotion={reducedMotion}
        freeView={exteriorView}
        licensePlateTex={licensePlateTex}
        montCorvoTex={montCorvoTex}
        hatGeo={hatGeo}
        ribbonGeo={ribbonGeo}
        hat={hat}
        hatBasePos={HAT_BASE_POS}
        hatBaseRot={HAT_BASE_ROT}
        contactShadowTex={contactShadowTex}
      />
      <PillarInstances positions={PILLARS} doors={doors} material={mats.bodyDark} />

      {effectiveMountStage >= 1 && (
        <BusCabinInterior mats={mats} cabinLength={cabinLength} cabinCenterZ={cabinCenterZ}
          rearWallZ={rearWallZ} rows={renderedRowIndices} wheelPositions={wheelPositions}
          tvPositions={tvPositions} doors={doors} />
      )}
      {effectiveMountStage >= 3 && numRows > 180 && (
        <DistantBusCrowd
          numRows={numRows}
          passengerCount={passengerCount}
          seatCapacity={seatCapacity}
          renderedRowIndices={renderedRowIndices}
          seatMaterial={mats.seat}
          pillarMaterial={mats.bodyDark}
          partyOn={partyDancing}
          reducedMotion={reducedMotion}
        />
      )}

      {/* PASSAGERS NAKAMA ASSIS DANS LE BUS */}
      {effectiveMountStage >= 3 && (
        <Passengers
          phase={phase}
          passengerCount={passengerCount}
          seatCapacity={seatCapacity}
          numRows={numRows}
          renderedRowIndices={renderedRowIndices}
          vacantSeatRanges={vacantSeatRanges}
          hornPulse={hornPulse}
          partyOn={partyDancing}
          reservedRow={reservedRow}
          reservedColumn={reservedColumn}
          avatarAboard={phase !== "outside" && !boardingPending}
          passengerProfiles={passengerProfiles}
          profileRevision={profileRevision}
          onPassengerSelect={onPassengerSelect}
          lowPower={lowPower}
          detailLimit={detailedPassengerLimit}
          simplifiedLimit={simplifiedPassengerLimit}
          reducedMotion={reducedMotion}
          excludedPassengerIndex={currentPassengerSeatIndex}
        />
      )}

      {/* ---------- POSTE DE CONDUITE & TABLEAU DE BORD COMPLET DU BUS ---------- */}
      {effectiveMountStage >= 2 && (
        <BusRelayPassenger hornPulse={hornPulse} reducedMotion={reducedMotion} partyOn={partyDancing} />
      )}
      {effectiveMountStage >= 3 && (
        <BusConfetti
          focusZ={getSeatRowZ(activeFocusRow)}
          rearZ={rearWallZ}
          lowPower={lowPower}
          reducedMotion={reducedMotion}
          active={partyOn}
          dancing={partyDancing}
        />
      )}
      {effectiveMountStage >= 3 && (
        <BusPartyLights
          worldRef={worldRef}
          focusZ={getSeatRowZ(activeFocusRow)}
          rearZ={rearWallZ}
          lowPower={lowPower}
          reducedMotion={reducedMotion}
          active={partyDancing}
        />
      )}
      {/* Lignes de vitesse manga dès la vitesse x2 (extérieur uniquement) */}
      {effectiveMountStage >= 3 && (
        <BusSpeedLines worldRef={worldRef} focusZ={activeFocusZ} rearZ={rearWallZ} lowPower={lowPower} reducedMotion={reducedMotion} visible={exteriorView || phase !== "inside"} />
      )}
      {effectiveMountStage >= 2 && (
        <BusCockpit mats={mats} dashTex={dashTex} hornPulse={hornPulse}
          partyOn={partyDancing} reducedMotion={reducedMotion} />
      )}

      {/* ---------- TÉLÉVISIONS DU BUS (toutes les 4 rangées, instanciées en 6 draw calls) ---------- */}
      {effectiveMountStage >= 1 && (
        <BusTvHousings
          positions={tvPositions}
          mats={mats}
          tvOn={tvOn && !partyOn && phase === "inside"}
          activeIdx={activeTvIndex}
          tvOffTex={tvOffTex}
          posterTex={montCorvoTex}
          hideScreens={Boolean(partyCards)}
        />
      )}
      {effectiveMountStage >= 1 && partyCards && tvPositions.map((pos, idx) => (
        <BusTvFrame
          key={`tv-unit-${idx}`}
          pos={pos}
          idx={idx}
          tvOn={false}
          isActive={idx === activeTvIndex}
          mats={mats}
          tvOffTex={tvOffTex}
          posterTex={montCorvoTex}
          partyCards={partyCards}
          reducedMotion={reducedMotion}
          withHousing={false}
        />
      ))}
      {effectiveMountStage >= 1 && (
        <BusTvPlayer
          pos={activeTvPosition}
          tvOn={tvOn}
          partyOn={partyOn}
          onPlaybackChange={onVideoPlaybackChange}
          phase={phase}
          freeView={freeView}
          busGroup={group}
          visitCameraRef={visitCameraRef}
          rearWallZ={rearWallZ}
          hasEntered={hasEntered}
          journey={journey}
          isMutedForFullscreen={isMutedForFullscreen}
          playbackSuspended={playbackSuspended}
        />
      )}
    </group>
  );
}
