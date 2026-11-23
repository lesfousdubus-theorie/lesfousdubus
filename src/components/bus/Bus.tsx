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
import { BusTvFrame, BusTvPlayer } from "./BusTv";
import { usePartyTvCards } from "./BusPartyTv";
import { getRenderedRowIndices, getActiveTvIndex, getTvPositions, getSeatRowZ, getBusDoors, getBusRearWallZ, getWheelPositions, BUS_FRONT_Z, type TvPosition } from "@/lib/bus-layout";
import { getBusPhysicalRows } from "@/lib/bus-occupancy";
import { advanceWiperAngle } from "@/lib/bus-wipers";
import BusExterior from "./BusExterior";
import BusCabinInterior from "./BusCabinInterior";
import BusCockpit from "./BusCockpit";
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
}: BusProps) {
  const group = useRef<THREE.Group>(null);
  const hat = useRef<THREE.Group>(null);
  const wheels = useRef<(THREE.Group | null)[]>([]);
  const leftWiper = useRef<THREE.Group>(null);
  const rightWiper = useRef<THREE.Group>(null);
  const exteriorView = freeView || messagesBackdrop;

  // Calcul dynamique de la longueur et des rangées du bus
  const numRows = getBusPhysicalRows(seatCapacity);
  const doors = useMemo(() => getBusDoors(numRows), [numRows]);

  // Position Z de chaque rangée de sièges
  const renderedRowIndices = useMemo(
    () => getRenderedRowIndices(numRows, reservedRow),
    [numRows, reservedRow],
  );

  // Une TV principale réelle et au maximum 8 rappels visuels légers dans les très longs bus.
  const tvPositions = useMemo(() => getTvPositions(numRows, TV_POSITION), [numRows]);

  // Un seul vrai lecteur YouTube est conservé. La caméra intérieure regarde vers
  // l'avant du bus (Z décroissant) : un écran derrière la rangée serait invisible.
  // Les autres écrans restent des répéteurs visuels sans iframe supplémentaire.
  const targetSeatedTvIndex = useMemo(() => {
    if (phase !== "inside" && phase !== "entering") return 0;
    return getActiveTvIndex(tvPositions, reservedRow);
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

  const { mats, montCorvoTex, hatGeo, ribbonGeo, sideLabel, tvOffTex, dashTex, licensePlateTex, contactShadowTex } = useBusResources();
  const partyCards = usePartyTvCards(partyOn);

  // Montage progressif des sous-ensembles du bus sur des frames fluides
  // pour éviter de compiler et téléverser toute la scène en une seule frame.
  const [mountStage, setMountStage] = useState(() => (phase === "entering" || phase === "inside" ? 3 : 0));
  const mountStageRef = useRef(phase === "entering" || phase === "inside" ? 3 : 0);
  const mountNextAtRef = useRef(0);
  const effectiveMountStage = phase === "entering" || phase === "inside" ? 3 : mountStage;

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
      } else if (dt < 0.045) {
        const now = performance.now();
        if (now >= mountNextAtRef.current) {
          mountNextAtRef.current = now + 55;
          mountStageRef.current += 1;
          setMountStage(mountStageRef.current);
        }
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

    // Rotation des roues du bus adaptée à la vitesse de défilement
    if (phase !== "inside" || exteriorView) {
      wheels.current.forEach((w) => {
        // Le support tourne Y local vers -X monde : +Y fait rouler vers -Z.
        if (w) w.rotation.y = (w.rotation.y + frameDt * 12 * mult) % (Math.PI * 2);
      });
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
          const nextFree = getTvIndexForCameraZ(tvPositions, camZ, 1.5);
          if (nextFree !== freeViewTvIndexRef.current) {
            freeViewTvIndexRef.current = nextFree;
            setFreeViewTvIndex(nextFree);
          }
        } else {
          const cur = Math.min(seatedTvIndexRef.current, tvPositions.length - 1);
          const target = targetSeatedTvIndex;
          const ready = cur === target
            || (target > cur && camZ - tvPositions[target][2] >= 2.5)
            || (target < cur && camZ - tvPositions[cur][2] < 2.5)
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
        focusZ={viewerZ}
        lowPower={lowPower}
        pillars={PILLARS}
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

      {effectiveMountStage >= 1 && (
        <BusCabinInterior mats={mats} cabinLength={cabinLength} cabinCenterZ={cabinCenterZ}
          rearWallZ={rearWallZ} rows={renderedRowIndices} wheelPositions={wheelPositions}
          tvPositions={tvPositions} doors={doors} worldRef={worldRef} />
      )}

      {/* PASSAGERS NAKAMA ASSIS DANS LE BUS */}
      {effectiveMountStage >= 3 && (
        <Passengers
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
      {effectiveMountStage >= 3 && partyOn && <BusConfetti focusZ={getSeatRowZ(reservedRow)} rearZ={rearWallZ} lowPower={lowPower} reducedMotion={reducedMotion} dancing={partyDancing}/>}
      {effectiveMountStage >= 3 && partyDancing && <BusPartyLights worldRef={worldRef} focusZ={getSeatRowZ(reservedRow)} rearZ={rearWallZ} lowPower={lowPower} reducedMotion={reducedMotion}/>}
      {/* Lignes de vitesse manga dès la vitesse x2 (extérieur uniquement) */}
      {effectiveMountStage >= 3 && (
        <BusSpeedLines worldRef={worldRef} focusZ={viewerZ} rearZ={rearWallZ} lowPower={lowPower} reducedMotion={reducedMotion} visible={exteriorView || phase !== "inside"} />
      )}
      {effectiveMountStage >= 2 && (
        <BusCockpit mats={mats} dashTex={dashTex} hornPulse={hornPulse}
          partyOn={partyDancing} reducedMotion={reducedMotion} />
      )}

      {/* ---------- TÉLÉVISIONS DU BUS ---------- */}
      {effectiveMountStage >= 1 && tvPositions.map((pos, idx) => (
        <BusTvFrame
          key={`tv-unit-${idx}`}
          pos={pos}
          idx={idx}
          tvOn={tvOn && !partyOn}
          isActive={idx === activeTvIndex}
          mats={mats}
          tvOffTex={tvOffTex}
          posterTex={montCorvoTex}
          partyCards={partyCards}
          reducedMotion={reducedMotion}
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
