"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { TV_POSITION, type WorldState } from "./constants";
import type { PassengerProfile } from "@/types/passenger";
import Passengers from "./Passengers";
import BusRelayPassenger from "./BusRelayPassenger";
import BusConfetti from "./BusConfetti";
import type { JourneyState } from "@/lib/bus-journey";
import { BusTvFrame, BusTvPlayer } from "./BusTv";
import { getRenderedRowIndices, getActiveTvIndex, getTvPositions, getSeatRowZ, getBusDoors, getBusRearWallZ, getWheelZClearOfDoors, BUS_FRONT_Z } from "@/lib/bus-layout";
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
  worldRef: React.RefObject<WorldState>;
  passengerCount?: number;
  seatCapacity?: number;
  vacantSeatRanges?: Array<[number, number, number]>;
  reservedRow?: number;
  isMutedForFullscreen?: boolean;
  hasEntered?: boolean;
  boardingPending?: boolean;
  passengerProfiles?: PassengerProfile[];
  currentPassengerSeatIndex?: number | null;
  journey:React.RefObject<JourneyState>;
  onPassengerSelect?: (passenger: PassengerProfile) => void;
  reducedMotion?: boolean;
  lowPower?: boolean;
  playbackSuspended?: boolean;
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
  worldRef,
  passengerCount = 0,
  seatCapacity = passengerCount,
  vacantSeatRanges = [],
  reservedRow = 3,
  isMutedForFullscreen = false,
  hasEntered = false,
  boardingPending = false,
  passengerProfiles = [],
  currentPassengerSeatIndex = null,
  journey,
  onPassengerSelect,
  reducedMotion = false,
  lowPower = false,
  playbackSuspended = false,
}: BusProps) {
  const group = useRef<THREE.Group>(null);
  const hat = useRef<THREE.Group>(null);
  const wheels = useRef<(THREE.Group | null)[]>([]);
  const interiorLights = useRef<THREE.PointLight[]>([]);
  const leftWiper = useRef<THREE.Group>(null);
  const rightWiper = useRef<THREE.Group>(null);

  // Calcul dynamique de la longueur et des rangées du bus
  const numRows = getBusPhysicalRows(seatCapacity);
  const doors = useMemo(() => getBusDoors(numRows), [numRows]);

  // Position Z de chaque rangée de sièges
  const renderedRowIndices = useMemo(
    () => getRenderedRowIndices(numRows, reservedRow),
    [numRows, reservedRow],
  );
  const SEAT_ROWS = useMemo(
    () => renderedRowIndices.map(getSeatRowZ),
    [renderedRowIndices],
  );

  // Une TV principale réelle et au maximum 8 rappels visuels légers dans les très longs bus.
  const tvPositions = useMemo(() => getTvPositions(numRows, TV_POSITION), [numRows]);

  // Un seul vrai lecteur YouTube est conservé. La caméra intérieure regarde vers
  // l'avant du bus (Z décroissant) : un écran derrière la rangée serait invisible.
  // Les autres écrans restent des répéteurs visuels sans iframe supplémentaire.
  const activeTvIndex = useMemo(() => {
    if (phase !== "inside" && phase !== "entering") return 0;
    return getActiveTvIndex(tvPositions, reservedRow);
  }, [phase, reservedRow, tvPositions]);
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

  // Points lumineux de plafond répartis le long de l'habitacle
  const interiorLightZs = useMemo(() => {
    // Garder trois lumières : une variation du nombre de sources force Three.js
    // à recompiler les matériaux lorsque le bus s'allonge.
    const count = 3;
    const start = -2.5;
    const end = rearWallZ - 1.2;
    const step = (end - start) / (count - 1);
    return Array.from({ length: count }, (_, i) => start + i * step);
  }, [rearWallZ]);

  // Emplacement des roues (2 avant fixes, 2 arrière mobiles, + essieu médian si bus long)
  const wheelPositions = useMemo(() => {
    const arr: [number, number][] = [
      [-1.2, -4.3],
      [1.2, -4.3],
      [-1.2, getWheelZClearOfDoors(rearWallZ - 1.6, doors, rearWallZ)],
      [1.2, getWheelZClearOfDoors(rearWallZ - 1.6, doors, rearWallZ)],
    ];
    if (numRows >= 10) {
      arr.push([-1.2, getWheelZClearOfDoors(cabinCenterZ, doors, rearWallZ)]);
      arr.push([1.2, getWheelZClearOfDoors(cabinCenterZ, doors, rearWallZ)]);
    }
    return arr;
  }, [numRows, rearWallZ, cabinCenterZ, doors]);

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

  // Position et orientation de base du chapeau (droit et centré sur le toit du bus)
  const HAT_BASE_POS: [number, number, number] = useMemo(() => [0, 3.40, -3.55], []);
  const HAT_BASE_ROT: [number, number, number] = useMemo(() => [0, 0, 0], []);

  const { mats, montCorvoTex, hatGeo, ribbonGeo, sideLabel, tvOffTex, dashTex, licensePlateTex, contactShadowTex, tagSiecleTex, tagBarbeNoireTex, tagLuffyNikaTex, tagPoneglyphesTex, tagTimingTex } = useBusResources();

  // Cibles fixes pour les projecteurs de phares
  const leftTarget = useRef<THREE.Object3D>(null);
  const rightTarget = useRef<THREE.Object3D>(null);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const frameDt = Math.min(dt, 0.1);

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
    if (phase !== "inside" || freeView) {
      wheels.current.forEach((w) => {
        // Le support tourne Y local vers -X monde : +Y fait rouler vers -Z.
        if (w) w.rotation.y = (w.rotation.y + frameDt * 12 * mult) % (Math.PI * 2);
      });
    }

    // Éclairage intérieur doux et constant de jour comme de nuit
    const daylight = worldRef.current?.daylight ?? 1;
    const cabinIntensity = 3.8 + (1 - daylight) * 2.5;
    interiorLights.current.forEach((light) => {
      if (light) light.intensity = cabinIntensity;
    });
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
        freeView={freeView}
        licensePlateTex={licensePlateTex}
        montCorvoTex={montCorvoTex}
        hatGeo={hatGeo}
        ribbonGeo={ribbonGeo}
        hat={hat}
        hatBasePos={HAT_BASE_POS}
        hatBaseRot={HAT_BASE_ROT}
        tagSiecleTex={tagSiecleTex}
        tagBarbeNoireTex={tagBarbeNoireTex}
        tagLuffyNikaTex={tagLuffyNikaTex}
        tagPoneglyphesTex={tagPoneglyphesTex}
        tagTimingTex={tagTimingTex}
        contactShadowTex={contactShadowTex}
      />

      <BusCabinInterior mats={mats} cabinLength={cabinLength} cabinCenterZ={cabinCenterZ}
        rearWallZ={rearWallZ} rowZs={SEAT_ROWS} wheelPositions={wheelPositions}
        tvPositions={tvPositions} doors={doors} interiorLightZs={interiorLightZs}
        interiorLights={interiorLights} />

      {/* PASSAGERS NAKAMA ASSIS DANS LE BUS */}
      <Passengers
        passengerCount={passengerCount}
        seatCapacity={seatCapacity}
        numRows={numRows}
        renderedRowIndices={renderedRowIndices}
        vacantSeatRanges={vacantSeatRanges}
        hornPulse={hornPulse}
        partyOn={partyDancing}
        reservedRow={reservedRow}
        avatarAboard={phase !== "outside" && !boardingPending}
        activePassengerIndex={phase === "inside" || phase === "entering" ? currentPassengerSeatIndex : null}
        passengerProfiles={passengerProfiles}
        onPassengerSelect={onPassengerSelect}
        lowPower={lowPower}
        reducedMotion={reducedMotion}
        excludedPassengerIndex={currentPassengerSeatIndex}
      />

      {/* ---------- POSTE DE CONDUITE & TABLEAU DE BORD COMPLET DU BUS ---------- */}
      <BusRelayPassenger hornPulse={hornPulse} reducedMotion={reducedMotion} partyOn={partyDancing} />
      {partyOn&&<BusConfetti focusZ={getSeatRowZ(reservedRow)} rearZ={rearWallZ} lowPower={lowPower} reducedMotion={reducedMotion}/>}
      <BusCockpit mats={mats} dashTex={dashTex} hornPulse={hornPulse}
        partyOn={partyDancing} reducedMotion={reducedMotion} />

      {/* ---------- TÉLÉVISIONS DU BUS ---------- */}
      {tvPositions.map((pos, idx) => (
        <BusTvFrame
          key={`tv-unit-${idx}-${pos[2]}`}
          pos={pos}
          idx={idx}
          tvOn={tvOn && !partyOn}
          isActive={idx === activeTvIndex}
          visible={freeView || idx === activeTvIndex || phase !== "inside"
            || viewerZ <= pos[2] || viewerZ - pos[2] >= 2.5}
          mats={mats}
          tvOffTex={tvOffTex}
          posterTex={montCorvoTex}
        />
      ))}
      <BusTvPlayer
        pos={activeTvPosition}
        tvOn={tvOn}
        onPlaybackChange={onVideoPlaybackChange}
        phase={phase}
        hasEntered={hasEntered}
        journey={journey}
        isMutedForFullscreen={isMutedForFullscreen}
        reducedMotion={reducedMotion}
        playbackSuspended={playbackSuspended}
      />
    </group>
  );
}
