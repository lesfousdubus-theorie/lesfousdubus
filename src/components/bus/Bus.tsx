"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  makeDashboardTexture,
  makeGraffitiTexture,
  makeLabelTexture,
  makeLicensePlateTexture,
  makeTvOffTexture,
  makeBusContactShadowTexture,
} from "@/lib/textures";
import { TV_POSITION, type WorldState } from "./constants";
import type { PassengerProfile } from "@/types/passenger";
import Passengers from "./Passengers";
import { BusTvFrame, BusTvPlayer } from "./BusTv";
import { computeNumRows, getRenderedRowIndices, getActiveTvIndex, getTvPositions } from "@/lib/bus-layout";
import { advanceWiperAngle } from "@/lib/bus-wipers";
import BusExterior from "./BusExterior";
import BusDrivers from "./BusDrivers";
import { createStrawHatGeometry } from "./StrawHatGeometry";

interface BusProps {
  headlights: boolean;
  hornPulse: number;
  tvOn: boolean;
  phase: "outside" | "entering" | "inside" | "exiting";
  worldRef: React.RefObject<WorldState>;
  passengerCount?: number;
  seatCapacity?: number;
  vacantSeatRanges?: Array<[number, number, number]>;
  reservedRow?: number;
  isMutedForFullscreen?: boolean;
  hasEntered?: boolean;
  passengerProfiles?: PassengerProfile[];
  currentPassengerSeatIndex?: number | null;
  onPassengerSelect?: (passenger: PassengerProfile) => void;
  reducedMotion?: boolean;
  lowPower?: boolean;
  playbackSuspended?: boolean;
}

const BLUE = "#154ddb";
const DARK_BLUE = "#0a2a85";
const YELLOW = "#ffbf18";
const CHROME = "#eaf0fa";
const DARK = "#12141a";
export default function Bus({
  headlights,
  hornPulse,
  tvOn,
  phase,
  worldRef,
  passengerCount = 0,
  seatCapacity = passengerCount,
  vacantSeatRanges = [],
  reservedRow = 3,
  isMutedForFullscreen = false,
  hasEntered = false,
  passengerProfiles = [],
  currentPassengerSeatIndex = null,
  onPassengerSelect,
  reducedMotion = false,
  lowPower = false,
  playbackSuspended = false,
}: BusProps) {
  const group = useRef<THREE.Group>(null);
  const hat = useRef<THREE.Group>(null);
  const wheels = useRef<(THREE.Mesh | null)[]>([]);
  const interiorLights = useRef<THREE.PointLight[]>([]);
  const leftWiper = useRef<THREE.Group>(null);
  const rightWiper = useRef<THREE.Group>(null);

  // Texture paille WebP optimisée pour le petit chapeau à l'écran
  const strawMap = useTexture("/textures/straw.webp", (tex) => {
    if (!Array.isArray(tex)) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 1);
      tex.colorSpace = THREE.SRGBColorSpace;
    }
  });

  // Logo officiel Le Mont Corvo
  const montCorvoTex = useTexture("/textures/montcorvo.png", (tex) => {
    if (!Array.isArray(tex)) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
  });

  // Calcul dynamique de la longueur et des rangées du bus
  const numRows = computeNumRows(seatCapacity);

  // Position Z de chaque rangée de sièges
  const renderedRowIndices = useMemo(
    () => getRenderedRowIndices(numRows, reservedRow),
    [numRows, reservedRow],
  );
  const SEAT_ROWS = useMemo(
    () => renderedRowIndices.map((row) => -2.6 + row * 1.2),
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
  const viewerZ = -2.6 + reservedRow * 1.2 + 0.15;

  // Coordonnées Z dynamiques du bus
  const rearWallZ = -2.6 + numRows * 1.2; // pour 6 rangées: 4.6
  const cabinLength = rearWallZ + 4.6; // pour 6 rangées: 9.2
  const cabinCenterZ = (-4.6 + rearWallZ) / 2; // pour 6 rangées: 0

  // Piliers de vitres : 2 avant + 1 par jointure de rangée
  const PILLARS = useMemo(() => {
    const arr = [-4.55, -3.85];
    for (const row of renderedRowIndices) {
      arr.push(-2.65 + row * 1.2);
    }
    arr.push(-2.65 + numRows * 1.2);
    return arr;
  }, [numRows, renderedRowIndices]);

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
      [-1.2, rearWallZ - 1.6],
      [1.2, rearWallZ - 1.6],
    ];
    if (numRows >= 10) {
      arr.push([-1.2, cabinCenterZ]);
      arr.push([1.2, cabinCenterZ]);
    }
    return arr;
  }, [numRows, rearWallZ, cabinCenterZ]);

  // Détection du moment d'extension pour animer le rebond
  const stretchRef = useRef(0);
  const prevRows = useRef(numRows);
  const bouncePhase = useRef(0);
  const rollPhase = useRef(0);
  const wiperMotion = useRef({ phase: 0, running: false, cyclesPerSecond: 0.4 });
  useEffect(() => {
    if (numRows > prevRows.current) {
      stretchRef.current = performance.now();
    }
    prevRows.current = numRows;
  }, [numRows]);

  const mats = useMemo(() => {
    return {
      body: new THREE.MeshStandardMaterial({
        color: BLUE,
        metalness: 0.25,
        roughness: 0.18,
      }),
      bodyDark: new THREE.MeshStandardMaterial({
        color: DARK_BLUE,
        metalness: 0.35,
        roughness: 0.35,
      }),
      yellow: new THREE.MeshStandardMaterial({
        color: YELLOW,
        metalness: 0.15,
        roughness: 0.35,
      }),
      chrome: new THREE.MeshStandardMaterial({
        color: "#f2f6ff",
        metalness: 0.45,
        roughness: 0.15,
      }),
      dark: new THREE.MeshStandardMaterial({
        color: DARK,
        roughness: 0.85,
      }),
      tire: new THREE.MeshStandardMaterial({
        color: "#18181c",
        roughness: 0.95,
      }),
      glass: new THREE.MeshStandardMaterial({
        color: "#9ec9ff",
        transparent: true,
        opacity: 0.32,
        roughness: 0.04,
        metalness: 0.05,
        depthWrite: false,
      }),
      floor: new THREE.MeshStandardMaterial({
        color: "#2f323a",
        roughness: 0.9,
      }),
      seat: new THREE.MeshStandardMaterial({
        color: "#b01f28",
        roughness: 0.55,
      }),
      seatFrame: new THREE.MeshStandardMaterial({
        color: "#22252c",
        metalness: 0.7,
        roughness: 0.35,
      }),
      interiorWall: new THREE.MeshStandardMaterial({
        color: "#d4dbe8",
        roughness: 0.75,
      }),
      straw: new THREE.MeshStandardMaterial({
        map: strawMap,
        color: "#fff5d2",
        roughness: 0.78,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
      band: new THREE.MeshStandardMaterial({
        color: "#e61924",
        roughness: 0.35,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
      orange: new THREE.MeshStandardMaterial({
        color: "#ff8c00",
        emissive: "#ff7700",
        emissiveIntensity: 2.0,
      }),
      red: new THREE.MeshStandardMaterial({
        color: "#cc1818",
        emissive: "#ff1414",
        emissiveIntensity: 0.8,
      }),
      ceilingLight: new THREE.MeshStandardMaterial({
        color: "#fff8e7",
        emissive: "#fff3cc",
        emissiveIntensity: 1.8,
      }),
    };
  }, [strawMap]);

  // Position et orientation de base du chapeau (droit et centré sur le toit du bus)
  const HAT_BASE_POS: [number, number, number] = useMemo(() => [0, 3.40, -3.55], []);
  const HAT_BASE_ROT: [number, number, number] = useMemo(() => [0, 0, 0], []);

  const { hatGeo, ribbonGeo } = useMemo(() => createStrawHatGeometry(), []);

  const sideLabel = useMemo(
    () =>
      makeLabelTexture({
        text: "LES FOUS DU BUS",
        sub: "GRAND LINE EXPRESS",
        bg: BLUE,
        fg: YELLOW,
      }),
    [],
  );

  const destLabel = useMemo(
    () =>
      makeLabelTexture({
        text: "GRAND LINE ➜ LAUGH TALE",
        sub: "SERVICE DIRECT · TOUS À BORD",
        width: 1024,
        height: 160,
        bg: "#090c14",
        fg: "#ffb700",
        font: "bold 72px 'Courier New', monospace",
      }),
    [],
  );

  const tvOffTex = useMemo(() => makeTvOffTexture(), []);
  const dashTex = useMemo(() => makeDashboardTexture(), []);
  const licensePlateTex = useMemo(() => makeLicensePlateTexture(), []);
  const contactShadowTex = useMemo(() => makeBusContactShadowTexture(), []);

  // Les 5 phrases exactes de la théorie taguées sur le bus
  // 1. Le siècle oublié c'est le présent
  const tagSiecleTex = useMemo(
    () =>
      makeGraffitiTexture({
        text: "LE SIÈCLE OUBLIÉ\nC'EST LE PRÉSENT",
        height: 384,
        color: "#fff1a8",
        stroke: "#071952",
        accent: "#ef3340",
        angle: -0.03,
      }),
    [],
  );

  // 2. Barbe Noire est Davy D. Jones
  const tagBarbeNoireTex = useMemo(
    () =>
      makeGraffitiTexture({
        text: "BARBE NOIRE EST\nDAVY D. JONES",
        height: 384,
        color: "#f7d6e0",
        stroke: "#3b0a2a",
        accent: "#ff9f1c",
        angle: 0.045,
      }),
    [],
  );

  // 3. Luffy est Nika et Joy Boy
  const tagLuffyNikaTex = useMemo(
    () =>
      makeGraffitiTexture({
        text: "LUFFY EST NIKA\nET JOY BOY",
        height: 384,
        color: "#ffdc4a",
        stroke: "#34145f",
        accent: "#22d3ee",
        angle: -0.055,
      }),
    [],
  );

  // 4. Les ponéglyphes viennent du futur
  const tagPoneglyphesTex = useMemo(
    () =>
      makeGraffitiTexture({
        text: "LES PONÉGLYPHES\nVIENNENT DU FUTUR",
        height: 384,
        color: "#baf7d0",
        stroke: "#053d33",
        accent: "#ff6b35",
        angle: 0.06,
      }),
    [],
  );

  // 5. Tout est une question de timing
  const tagTimingTex = useMemo(
    () =>
      makeGraffitiTexture({
        text: "TOUT EST UNE QUESTION\nDE TIMING",
        height: 384,
        color: "#bde7ff",
        stroke: "#071f5c",
        accent: "#ff4da6",
        angle: -0.045,
      }),
    [],
  );

  useEffect(() => () => {
    hatGeo.dispose();
    ribbonGeo.dispose();
    sideLabel.dispose();
    destLabel.dispose();
    tvOffTex.dispose();
    dashTex.dispose();
    licensePlateTex.dispose();
    contactShadowTex.dispose();
    tagSiecleTex.dispose();
    tagBarbeNoireTex.dispose();
    tagLuffyNikaTex.dispose();
    tagPoneglyphesTex.dispose();
    tagTimingTex.dispose();
  }, [
    hatGeo,
    ribbonGeo,
    sideLabel,
    destLabel,
    tvOffTex,
    dashTex,
    licensePlateTex,
    contactShadowTex,
    tagSiecleTex,
    tagBarbeNoireTex,
    tagLuffyNikaTex,
    tagPoneglyphesTex,
    tagTimingTex,
  ]);


  // Cibles fixes pour les projecteurs de phares
  const leftTarget = useRef<THREE.Object3D>(null);
  const rightTarget = useRef<THREE.Object3D>(null);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const frameDt = Math.min(dt, 0.1);

    const mult = worldRef.current?.speedMultiplier ?? 1.0;
    bouncePhase.current = (bouncePhase.current + frameDt * 8.5 * mult) % (Math.PI * 2);
    rollPhase.current = (rollPhase.current + frameDt * 1.6 * mult) % (Math.PI * 2);

    // Roulis, tangage et rebond d'extension dynamique du minibus (adapté à la vitesse)
    if (group.current) {
      const sinceStretch = (performance.now() - stretchRef.current) / 1000;
      const stretchBounce = !reducedMotion &&
        sinceStretch < 0.9 ? Math.sin(sinceStretch * 20) * (0.9 - sinceStretch) * 0.05 : 0;

      const cabinIsStable = phase === "inside" || phase === "entering";
      const targetY = cabinIsStable || reducedMotion
        ? 0
        : (Math.sin(bouncePhase.current) * 0.014 + Math.sin(t * 2.1) * 0.008)
          * Math.min(1.4, Math.max(0.7, mult)) + stretchBounce;
      const targetRoll = cabinIsStable || reducedMotion ? 0 : Math.sin(rollPhase.current) * 0.0035;
      const settle = Math.min(1, frameDt * 10);
      group.current.position.y += (targetY - group.current.position.y) * settle;
      group.current.rotation.z += (targetRoll - group.current.rotation.z) * settle;
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
    if (phase !== "inside") {
      wheels.current.forEach((w) => {
        if (w) w.rotation.x = (w.rotation.x - frameDt * 12 * mult) % (Math.PI * 2);
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
    <group ref={group}>
      <BusExterior
        headlights={headlights}
        phase={phase}
        mats={mats}
        cabinLength={cabinLength}
        cabinCenterZ={cabinCenterZ}
        rearWallZ={rearWallZ}
        pillars={PILLARS}
        wheelPositions={wheelPositions}
        wheels={wheels}
        leftWiper={leftWiper}
        rightWiper={rightWiper}
        leftTarget={leftTarget}
        rightTarget={rightTarget}
        sideLabel={sideLabel}
        destLabel={destLabel}
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

      {/* ---------- INTÉRIEUR DU BUS ---------- */}
      {/* Habillage intérieur du toit extensible */}
      <mesh material={mats.interiorWall} position={[0, 3.15, cabinCenterZ]}>
        <boxGeometry args={[2.5, 0.02, cabinLength - 0.1]} />
      </mesh>

      {/* Bandeaux intérieurs continus : ils habillent proprement le raccord entre
          le plafond et les vitres, sans faces bleues superposées ni interstices. */}
      {[-1, 1].map((sx) => (
        <group key={`window-headliner-${sx}`}>
          <mesh material={mats.interiorWall} position={[sx * 1.248, 2.98, cabinCenterZ]}>
            <boxGeometry args={[0.012, 0.4, cabinLength - 0.12]} />
          </mesh>
          <mesh material={mats.bodyDark} position={[sx * 1.235, 2.76, cabinCenterZ]}>
            <boxGeometry args={[0.03, 0.08, cabinLength - 0.1]} />
          </mesh>
          <mesh material={mats.bodyDark} position={[sx * 1.235, 1.74, cabinCenterZ]}>
            <boxGeometry args={[0.03, 0.08, cabinLength - 0.1]} />
          </mesh>
        </group>
      ))}

      {/* Néons de plafond lumineux continus */}
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} material={mats.ceilingLight} position={[x, 3.13, cabinCenterZ]}>
          <boxGeometry args={[0.14, 0.03, cabinLength - 1.4]} />
        </mesh>
      ))}

      {/* Éclairages intérieurs chauds et bien répartis le long du bus */}
      {interiorLightZs.map((lz, idx) => (
        <pointLight
          key={`interior-light-${idx}`}
          ref={(el: THREE.PointLight | null) => {
            if (el) interiorLights.current[idx] = el;
          }}
          position={[0, 2.85, lz]}
          color="#fff4db"
          intensity={4.5}
          distance={Math.max(9.5, cabinLength / 2)}
          decay={1.5}
        />
      ))}

      {/* Barres de maintien jaunes & poignées extensibles */}
      {[-0.35, 0.35].map((x) => (
        <group key={x}>
          <mesh
            material={mats.yellow}
            position={[x, 2.9, cabinCenterZ + 0.4]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.022, 0.022, cabinLength - 1.6, 12]} />
          </mesh>
        </group>
      ))}

      {/* Les sièges gardent leur quantité exacte mais partagent quatre draw calls. */}
      <SeatInstances rows={SEAT_ROWS} seatMaterial={mats.seat} frameMaterial={mats.seatFrame} />

      {/* PASSAGERS NAKAMA ASSIS DANS LE BUS */}
      <Passengers
        passengerCount={passengerCount}
        numRows={numRows}
        renderedRowIndices={renderedRowIndices}
        vacantSeatRanges={vacantSeatRanges}
        hornPulse={hornPulse}
        reservedRow={phase === "inside" || phase === "entering" ? reservedRow : -1}
        activePassengerIndex={phase === "inside" || phase === "entering" ? currentPassengerSeatIndex : null}
        passengerProfiles={passengerProfiles}
        onPassengerSelect={onPassengerSelect}
        lowPower={lowPower}
      />

      {/* ---------- POSTE DE CONDUITE & TABLEAU DE BORD COMPLET DU BUS ---------- */}
      {/* Siège conducteur ergonomique avec appuie-tête et embase (Kamal) */}
      <group position={[-0.72, 0, -3.8]}>
        {/* Embase métallique fixée au plancher */}
        <mesh material={mats.dark} position={[0, 0.77, 0]}>
          <boxGeometry args={[0.22, 0.30, 0.22]} />
        </mesh>
        {/* Coussin d'assise abaissé */}
        <mesh material={mats.seat} position={[0, 0.95, 0]}>
          <boxGeometry args={[0.76, 0.12, 0.68]} />
        </mesh>
        {/* Dossier du siège aux proportions harmonieuses */}
        <mesh material={mats.seat} position={[0, 1.32, 0.32]}>
          <boxGeometry args={[0.74, 0.62, 0.12]} />
        </mesh>
        {/* Appuie-tête ajusté */}
        <mesh material={mats.seat} position={[0, 1.70, 0.32]}>
          <boxGeometry args={[0.32, 0.14, 0.10]} />
        </mesh>
        {/* Accoudoir côté fenêtre */}
        <mesh material={mats.dark} position={[-0.40, 1.14, 0.05]}>
          <boxGeometry args={[0.08, 0.08, 0.42]} />
        </mesh>
      </group>

      {/* Siège co-pilote / navigateur ergonomique pour Kyta */}
      <group position={[0.72, 0, -3.8]}>
        {/* Embase métallique fixée au plancher */}
        <mesh material={mats.dark} position={[0, 0.77, 0]}>
          <boxGeometry args={[0.22, 0.30, 0.22]} />
        </mesh>
        {/* Coussin d'assise abaissé */}
        <mesh material={mats.seat} position={[0, 0.95, 0]}>
          <boxGeometry args={[0.76, 0.12, 0.68]} />
        </mesh>
        {/* Dossier du siège aux proportions harmonieuses */}
        <mesh material={mats.seat} position={[0, 1.32, 0.32]}>
          <boxGeometry args={[0.74, 0.62, 0.12]} />
        </mesh>
        {/* Appuie-tête ajusté */}
        <mesh material={mats.seat} position={[0, 1.70, 0.32]}>
          <boxGeometry args={[0.32, 0.14, 0.10]} />
        </mesh>
        {/* Accoudoir côté fenêtre droite */}
        <mesh material={mats.dark} position={[0.40, 1.14, 0.05]}>
          <boxGeometry args={[0.08, 0.08, 0.42]} />
        </mesh>
      </group>

      {/* CONDUCTEURS DU MONT CORVO : KAMAL AU VOLANT ET KYTA EN CO-PILOTE */}
      <BusDrivers
        hornPulse={hornPulse}
        montCorvoTex={montCorvoTex}
        reducedMotion={reducedMotion}
      />

      {/* Planche de bord complète du bus (jointement continu avec le pare-brise) */}
      <group position={[0, 0, 0]}>
        {/* Table supérieure de la planche de bord (Deck) : comble l'espace jusqu'au pare-brise */}
        <mesh material={mats.dark} position={[0, 1.56, -4.32]}>
          <boxGeometry args={[2.44, 0.08, 0.54]} />
        </mesh>
        {/* Relevé avant sous la baie de pare-brise */}
        <mesh material={mats.bodyDark} position={[0, 1.62, -4.54]}>
          <boxGeometry args={[2.42, 0.06, 0.10]} />
        </mesh>
        {/* Façade verticale descendante fermant l'avant du bus jusqu'au plancher */}
        <mesh material={mats.dark} position={[0, 1.10, -4.06]}>
          <boxGeometry args={[2.44, 0.92, 0.06]} />
        </mesh>
        {/* Flancs d'habillage latéraux */}
        {[-1.20, 1.20].map((lx) => (
          <mesh key={`dash-cheek-${lx}`} material={mats.dark} position={[lx, 1.10, -4.32]}>
            <boxGeometry args={[0.06, 0.92, 0.54]} />
          </mesh>
        ))}

        {/* Combiné d'instruments avec casquette biseautée face au conducteur */}
        <group position={[-0.72, 1.60, -4.22]}>
          {/* Casquette protectrice de compteur (pare-soleil du combiné) */}
          <mesh material={mats.dark} position={[0, 0.16, -0.02]} rotation={[-0.18, 0, 0]}>
            <boxGeometry args={[0.82, 0.04, 0.28]} />
          </mesh>
          <mesh material={mats.dark} position={[-0.40, 0.05, -0.02]}>
            <boxGeometry args={[0.03, 0.22, 0.26]} />
          </mesh>
          <mesh material={mats.dark} position={[0.40, 0.05, -0.02]}>
            <boxGeometry args={[0.03, 0.22, 0.26]} />
          </mesh>
          {/* Cadre de fond encastré du compteur */}
          <mesh material={mats.dark} position={[0, 0.02, -0.01]} rotation={[-0.32, 0, 0]}>
            <boxGeometry args={[0.80, 0.26, 0.03]} />
          </mesh>
          {/* Affichage des instruments rétroéclairés */}
          <mesh position={[0, 0.02, 0.01]} rotation={[-0.32, 0, 0]}>
            <planeGeometry args={[0.78, 0.24]} />
            <meshStandardMaterial
              map={dashTex}
              emissive="#ffffff"
              emissiveMap={dashTex}
              emissiveIntensity={0.85}
              roughness={0.25}
            />
          </mesh>
        </group>

        {/* Colonne de direction et volant réaliste à 3 branches */}
        <group position={[-0.72, 0, 0]}>
          {/* Colonne de direction inclinée sortant du tableau de bord vers le conducteur */}
          <mesh material={mats.dark} position={[0, 1.34, -4.10]} rotation={[0.58, 0, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 0.42, 12]} />
          </mesh>
          <mesh material={mats.chrome} position={[0, 1.48, -3.98]} rotation={[0.58, 0, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.04, 12]} />
          </mesh>
          {/* Commodos de commande (clignotants / essuie-glaces) */}
          <mesh material={mats.dark} position={[-0.09, 1.48, -3.98]} rotation={[0, 0, 0.35]}>
            <boxGeometry args={[0.12, 0.018, 0.018]} />
          </mesh>
          <mesh material={mats.dark} position={[0.09, 1.48, -3.98]} rotation={[0, 0, -0.35]}>
            <boxGeometry args={[0.12, 0.018, 0.018]} />
          </mesh>

          {/* Volant 3 branches complet */}
          <group position={[0, 1.54, -3.94]} rotation={[-0.99, 0, 0]}>
            {/* Jante torique du volant */}
            <mesh material={mats.dark}>
              <torusGeometry args={[0.23, 0.024, 14, 36]} />
            </mesh>
            {/* Moyeu central du volant */}
            <mesh material={mats.dark}>
              <cylinderGeometry args={[0.065, 0.065, 0.032, 18]} />
            </mesh>
            {/* Bouton de klaxon One Piece doré au centre du volant */}
            <mesh material={mats.yellow} position={[0, 0, 0.018]}>
              <cylinderGeometry args={[0.042, 0.042, 0.015, 18]} />
            </mesh>
            {/* 3 branches reliant le moyeu à la jante */}
            <mesh material={mats.dark} position={[-0.11, 0, 0]}>
              <boxGeometry args={[0.13, 0.028, 0.016]} />
            </mesh>
            <mesh material={mats.dark} position={[0.11, 0, 0]}>
              <boxGeometry args={[0.13, 0.028, 0.016]} />
            </mesh>
            <mesh material={mats.dark} position={[0, -0.11, 0]}>
              <boxGeometry args={[0.028, 0.13, 0.016]} />
            </mesh>
          </group>
        </group>

        {/* Console centrale du bus */}
        <group position={[0, 0, 0]}>
          {/* Bloc de console avancé vers l'habitacle */}
          <mesh material={mats.dark} position={[0, 1.34, -4.04]}>
            <boxGeometry args={[0.54, 0.58, 0.18]} />
          </mesh>
          {/* Écran multimédia / GPS Laugh Tale */}
          <mesh material={mats.dark} position={[0, 1.50, -3.94]}>
            <boxGeometry args={[0.42, 0.22, 0.02]} />
          </mesh>
          <mesh position={[0, 1.50, -3.928]}>
            <planeGeometry args={[0.38, 0.18]} />
            <meshStandardMaterial
              color="#072214"
              emissive="#10b981"
              emissiveIntensity={0.65}
              roughness={0.25}
            />
          </mesh>
          {/* Double grille d'aération supérieure de climatisation */}
          {[-0.13, 0.13].map((vx) => (
            <group key={`vent-${vx}`} position={[vx, 1.59, -4.08]}>
              <mesh material={mats.dark}>
                <boxGeometry args={[0.16, 0.06, 0.02]} />
              </mesh>
              <mesh material={mats.chrome} position={[0, 0, 0.005]}>
                <boxGeometry args={[0.14, 0.012, 0.01]} />
              </mesh>
            </group>
          ))}
          {/* Bouton d'arrêt d'urgence rouge "STOP" (champignon d'arrêt du bus) */}
          <group position={[0, 1.32, -3.94]}>
            <mesh material={mats.yellow}>
              <boxGeometry args={[0.09, 0.09, 0.018]} />
            </mesh>
            <mesh material={mats.red} position={[0, 0, 0.018]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.032, 0.026, 0.024, 16]} />
            </mesh>
          </group>
          {/* Rangée d'interrupteurs de bord à témoins lumineux */}
          {[-0.15, -0.05, 0.05, 0.15].map((sx, idx) => (
            <group key={`switch-${idx}`} position={[sx, 1.20, -3.94]}>
              <mesh material={mats.dark}>
                <boxGeometry args={[0.045, 0.06, 0.015]} />
              </mesh>
              <mesh
                material={idx === 0 ? mats.yellow : idx === 1 ? mats.seat : mats.red}
                position={[0, 0.015, 0.01]}
              >
                <boxGeometry args={[0.025, 0.015, 0.01]} />
              </mesh>
            </group>
          ))}
          {/* Levier de boîte de vitesses automatique */}
          <group position={[-0.18, 1.14, -3.96]}>
            <mesh material={mats.dark}>
              <boxGeometry args={[0.10, 0.04, 0.14]} />
            </mesh>
            <mesh material={mats.chrome} position={[0, 0.08, 0]} rotation={[0.2, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.14, 8]} />
            </mesh>
            <mesh material={mats.dark} position={[0, 0.15, 0.02]}>
              <sphereGeometry args={[0.026, 12, 12]} />
            </mesh>
          </group>
        </group>

        {/* Côté passager avant : boîte à gants et barre de maintien */}
        <group position={[0.72, 0, 0]}>
          <mesh material={mats.dark} position={[0, 1.48, -4.04]}>
            <boxGeometry args={[0.68, 0.18, 0.14]} />
          </mesh>
          {/* Liseré chromé de boîte à gants */}
          <mesh material={mats.chrome} position={[0, 1.48, -3.96]}>
            <boxGeometry args={[0.64, 0.012, 0.01]} />
          </mesh>
          {/* Barre de maintien passager avant jaune */}
          <mesh material={mats.yellow} position={[0, 1.68, -4.10]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 0.60, 10]} />
          </mesh>
        </group>

        {/* Rétroviseur intérieur panoramique fixé sous le pare-brise */}
        <group position={[0, 2.76, -4.50]} rotation={[0.15, 0, 0]}>
          <mesh material={mats.dark}>
            <boxGeometry args={[0.55, 0.16, 0.03]} />
          </mesh>
          <mesh material={mats.chrome} position={[0, 0, 0.016]}>
            <planeGeometry args={[0.52, 0.13]} />
          </mesh>
        </group>
      </group>

      {/* ---------- TÉLÉVISIONS DU BUS ---------- */}
      {tvPositions.map((pos, idx) => (
        <BusTvFrame
          key={`tv-unit-${idx}-${pos[2]}`}
          pos={pos}
          idx={idx}
          tvOn={tvOn}
          isActive={idx === activeTvIndex}
          visible={idx === activeTvIndex || phase !== "inside"
            || viewerZ <= pos[2] || viewerZ - pos[2] >= 2.5}
          mats={mats}
          tvOffTex={tvOffTex}
          posterTex={montCorvoTex}
        />
      ))}
      <BusTvPlayer
        pos={activeTvPosition}
        tvOn={tvOn}
        phase={phase}
        hasEntered={hasEntered}
        isMutedForFullscreen={isMutedForFullscreen}
        reducedMotion={reducedMotion}
        playbackSuspended={playbackSuspended}
      />
    </group>
  );
}

function SeatInstances({
  rows,
  seatMaterial,
  frameMaterial,
}: {
  rows: number[];
  seatMaterial: THREE.Material;
  frameMaterial: THREE.Material;
}) {
  const cushion = useRef<THREE.InstancedMesh>(null);
  const back = useRef<THREE.InstancedMesh>(null);
  const base = useRef<THREE.InstancedMesh>(null);
  const headrest = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const refs = [cushion, back, base, headrest];
    const offsets = [[1.05, 0], [1.38, 0.33], [0.82, 0], [1.7, 0.33]];
    const matrix = new THREE.Matrix4();
    refs.forEach((meshRef, part) => {
      if (!meshRef.current) return;
      let index = 0;
      for (const z of rows) {
        for (const x of [-0.72, 0.72]) {
          matrix.makeTranslation(x, offsets[part][0], z + offsets[part][1]);
          meshRef.current.setMatrixAt(index++, matrix);
        }
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
      // Le bus peut s'allonger : les bornes de visibilité doivent suivre les instances.
      meshRef.current.computeBoundingSphere();
    });
  }, [rows]);
  const count = rows.length * 2;
  // Taille fixe : l'ajout d'une rangée ne recrée pas les quatre buffers GPU.
  const capacity = 180 * 2;
  return (
    <>
      <instancedMesh ref={cushion} args={[undefined, undefined, capacity]} count={count} material={seatMaterial} castShadow>
        <boxGeometry args={[0.95, 0.15, 0.7]} />
      </instancedMesh>
      <instancedMesh ref={back} args={[undefined, undefined, capacity]} count={count} material={seatMaterial} castShadow>
        <boxGeometry args={[0.95, 0.58, 0.12]} />
      </instancedMesh>
      <instancedMesh ref={base} args={[undefined, undefined, capacity]} count={count} material={frameMaterial}>
        <boxGeometry args={[0.85, 0.36, 0.6]} />
      </instancedMesh>
      <instancedMesh ref={headrest} args={[undefined, undefined, capacity]} count={count} material={frameMaterial}>
        <boxGeometry args={[0.95, 0.05, 0.08]} />
      </instancedMesh>
    </>
  );
}
