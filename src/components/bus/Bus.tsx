"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import {
  makeDashboardTexture,
  makeLabelTexture,
  makeLicensePlateTexture,
  makeTvScreenTexture,
} from "@/lib/textures";
import { TV_POSITION, YOUTUBE_ID, type WorldState } from "./constants";
import Passengers, { computeNumRows } from "./Passengers";

interface BusProps {
  headlights: boolean;
  hornPulse: number;
  tvOn: boolean;
  phase: "outside" | "entering" | "inside" | "exiting";
  worldRef: React.RefObject<WorldState>;
  onToggleTv?: () => void;
  passengerCount?: number;
  reservedRow?: number;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onStop?: () => void;
  onToggleFullscreen?: () => void;
  isMutedForFullscreen?: boolean;
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
  onToggleTv,
  passengerCount = 0,
  reservedRow = 3,
  isPlaying = true,
  onTogglePlay,
  onStop,
  onToggleFullscreen,
  isMutedForFullscreen = false,
}: BusProps) {
  const group = useRef<THREE.Group>(null);
  const hat = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Mesh[]>([]);
  const interiorLights = useRef<THREE.PointLight[]>([]);

  // Texture paille haute résolution
  const strawMap = useTexture("/textures/straw.jpg", (tex) => {
    if (!Array.isArray(tex)) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 1);
      tex.colorSpace = THREE.SRGBColorSpace;
    }
  });

  // Calcul dynamique de la longueur et des rangées du bus
  const numRows = computeNumRows(passengerCount);

  // Position Z de chaque rangée de sièges
  const SEAT_ROWS = useMemo(
    () => Array.from({ length: numRows }, (_, i) => -2.6 + i * 1.2),
    [numRows],
  );

  // Positions des télévisions : TV frontale à z = -4.2. Si le bus est allongé (> 6 rangées), une TV supplémentaire toutes les 5 rangées
  const tvPositions = useMemo(() => {
    const arr: [number, number, number][] = [TV_POSITION.toArray() as [number, number, number]];
    if (numRows > 6) {
      for (let r = 6; r < numRows; r += 5) {
        const tvZ = -2.6 + (r - 0.25) * 1.2;
        arr.push([0, 2.55, tvZ]);
      }
    }
    return arr;
  }, [numRows]);

  // Coordonnées Z dynamiques du bus
  const rearWallZ = -2.6 + numRows * 1.2; // pour 6 rangées: 4.6
  const cabinLength = rearWallZ + 4.6; // pour 6 rangées: 9.2
  const cabinCenterZ = (-4.6 + rearWallZ) / 2; // pour 6 rangées: 0

  // Piliers de vitres : 2 avant + 1 par jointure de rangée
  const PILLARS = useMemo(() => {
    const arr = [-4.55, -3.85];
    for (let i = 0; i <= numRows; i++) {
      arr.push(-2.65 + i * 1.2);
    }
    return arr;
  }, [numRows]);

  // Points lumineux de plafond répartis le long de l'habitacle
  const interiorLightZs = useMemo(() => {
    const count = Math.max(3, Math.ceil(cabinLength / 3.4));
    const start = -2.5;
    const end = rearWallZ - 1.2;
    const step = (end - start) / (count - 1);
    return Array.from({ length: count }, (_, i) => start + i * step);
  }, [cabinLength, rearWallZ]);

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
      glass: new THREE.MeshPhysicalMaterial({
        color: "#9ec9ff",
        transparent: true,
        opacity: 0.32,
        roughness: 0.04,
        metalness: 0.05,
        side: THREE.DoubleSide,
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
        side: THREE.DoubleSide,
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

  // Position et orientation de base du chapeau (perché sur la cabine avec inclinaison Mugiwara)
  const HAT_BASE_POS: [number, number, number] = useMemo(() => [-0.04, 3.43, -3.55], []);
  const HAT_BASE_ROT: [number, number, number] = useMemo(() => [-0.05, 0.05, -0.19], []);

  // Chapeau de paille de Luffy (Véritables proportions Mugiwara)
  const { hatGeo, ribbonGeo } = useMemo(() => {
    // Proportions fidèles à Luffy et à l'illustration de référence :
    // - Largeur du bus : 2.60 m
    // - Diamètre du bord : 3.60 m (rayon 1.80 m, débord de 50 cm de chaque côté)
    // - Diamètre calotte : 2.20 m (rayon 1.10 m à la base)
    // - Hauteur de calotte : 1.04 m (apex à y = 1.08 m, base à y = 0.04 m)
    // - Bandeau rouge : hauteur 0.255 m (y = 0.050 à 0.305 m)
    // - Relevé du rebord : +0.075 m (y = 0.115 m au rebord)
    // - Épaisseur coque : 14 mm (solide 3D étanche sans artefacts)
    const R_brim = 1.80;
    const R_dome = 1.10;
    const H_dome = 1.08;
    const y_base = 0.04;
    const T = 0.014;
    const n_super = 2.4;
    const p_super = 2.0 / n_super;

    const pts: THREE.Vector2[] = [];
    const N_crown = 36;
    const N_brim = 30;
    const R_dome_in = R_dome - T;
    const H_dome_in = H_dome - T;
    const y_base_in = y_base - T;

    // 1. Surface intérieure : calotte descendant de l'apex intérieur vers la base intérieure
    for (let i = 0; i <= N_crown; i++) {
      const th = (i / N_crown) * (Math.PI / 2);
      const r = Math.max(0.001, R_dome_in * Math.pow(Math.sin(th), p_super));
      const y = y_base_in + (H_dome_in - y_base_in) * Math.pow(Math.cos(th), p_super);
      pts.push(new THREE.Vector2(r, y));
    }

    // 2. Bord inférieur intérieur : de la base intérieure vers le rebord
    for (let i = 1; i <= N_brim; i++) {
      const u = i / N_brim;
      const r = R_dome_in + u * (R_brim - R_dome_in);
      const y = y_base_in + 0.075 * Math.pow(u, 2.2);
      pts.push(new THREE.Vector2(r, y));
    }

    // 3. Rebord arrondi extérieur (ourlet)
    const y_rim_outer = y_base + 0.075;
    const y_rim_inner = y_base_in + 0.075;
    pts.push(new THREE.Vector2(R_brim + T * 0.4, (y_rim_outer + y_rim_inner) / 2));
    pts.push(new THREE.Vector2(R_brim, y_rim_outer));

    // 4. Bord supérieur extérieur : du rebord vers la base extérieure
    for (let i = N_brim - 1; i >= 0; i--) {
      const u = i / N_brim;
      const r = R_dome + u * (R_brim - R_dome);
      const y = y_base + 0.075 * Math.pow(u, 2.2);
      pts.push(new THREE.Vector2(r, y));
    }

    // 5. Calotte extérieure : de la base extérieure montant vers l'apex extérieur
    for (let i = 1; i <= N_crown; i++) {
      const th = (Math.PI / 2) * (1 - i / N_crown);
      const r = Math.max(0.001, R_dome * Math.pow(Math.sin(th), p_super));
      const y = y_base + (H_dome - y_base) * Math.pow(Math.cos(th), p_super);
      pts.push(new THREE.Vector2(r, y));
    }

    const segments = 64;
    const hatGeo = new THREE.LatheGeometry(pts, segments);

    // Calcul de la longueur d'arc cumulée du profil pour un UV mapping régulier
    const arc: number[] = [0];
    for (let j = 1; j < pts.length; j++) {
      const dr = pts[j].x - pts[j - 1].x;
      const dy = pts[j].y - pts[j - 1].y;
      arc.push(arc[j - 1] + Math.hypot(dr, dy));
    }

    // Mapping UV isotrope : tressage de paille uniforme sans étirement
    const uvAttr = hatGeo.attributes.uv;
    const U_REPEATS = 10;
    const V_SCALE = 0.85; // Échelle physique uniforme

    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j < pts.length; j++) {
        const idx = i * pts.length + j;
        const u = (i / segments) * U_REPEATS;
        const v = arc[j] / V_SCALE;
        uvAttr.setXY(idx, u, v);
      }
    }
    uvAttr.needsUpdate = true;

    // Normales parfaites aux apex pour supprimer tout pincement
    const pos = hatGeo.attributes.position;
    const norm = hatGeo.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      if (r < 0.02) {
        const y = pos.getY(i);
        norm.setXYZ(i, 0, y > 0.5 ? 1 : -1, 0);
      }
    }
    norm.needsUpdate = true;

    // Ruban rouge ajusté exactement à la calotte (y = 0.050 à 0.305)
    const yMin = 0.050;
    const yMax = 0.305;
    const N_ribbon = 16;
    const ribbonPts: THREE.Vector2[] = [];

    function getCrownRadius(y: number) {
      const cos_p = (y - y_base) / (H_dome - y_base);
      const cos_th = Math.pow(Math.max(0, Math.min(1, cos_p)), 1 / p_super);
      const sin_th = Math.sqrt(Math.max(0, 1 - cos_th * cos_th));
      return R_dome * Math.pow(sin_th, p_super);
    }

    // Face extérieure (du bas vers le haut pour normales dirigées vers l'extérieur)
    for (let i = 0; i <= N_ribbon; i++) {
      const u = i / N_ribbon;
      const y = yMin + u * (yMax - yMin);
      const r = getCrownRadius(y) + 0.007;
      ribbonPts.push(new THREE.Vector2(r, y));
    }
    // Face intérieure (du haut vers le bas)
    for (let i = 0; i <= N_ribbon; i++) {
      const u = i / N_ribbon;
      const y = yMax - u * (yMax - yMin);
      const r = getCrownRadius(y) + 0.002;
      ribbonPts.push(new THREE.Vector2(r, y));
    }

    const ribbonGeo = new THREE.LatheGeometry(ribbonPts, 64);

    return { hatGeo, ribbonGeo };
  }, []);

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

  const tvOffTex = useMemo(() => makeTvScreenTexture(false), []);
  const tvOnTex = useMemo(() => makeTvScreenTexture(true), []);
  const dashTex = useMemo(() => makeDashboardTexture(), []);
  const licensePlateTex = useMemo(() => makeLicensePlateTexture(), []);

  const primaryIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Synchronisation du volume audio : 100% à l'intérieur, 25% "de loin" à l'extérieur, 0% si éteinte ou plein écran actif
  useEffect(() => {
    if (!tvOn || isMutedForFullscreen) {
      if (primaryIframeRef.current?.contentWindow) {
        try {
          primaryIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
            "*",
          );
          primaryIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "setVolume", args: [0] }),
            "*",
          );
        } catch {
          // ignore
        }
      }
      return;
    }

    const targetVolume = phase === "inside" ? 100 : 25;
    const iframe = primaryIframeRef.current;
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "unMute", args: [] }),
          "*",
        );
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "setVolume", args: [targetVolume] }),
          "*",
        );
        if (isPlaying) {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "playVideo", args: [] }),
            "*",
          );
        } else {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
            "*",
          );
        }
      } catch {
        // ignore
      }
    }
  }, [tvOn, phase, isPlaying, isMutedForFullscreen]);

  // Synchronisation play/pause sur les télés secondaires de l'allée
  useEffect(() => {
    if (!tvOn || isMutedForFullscreen) return;
    try {
      const iframes = document.querySelectorAll<HTMLIFrameElement>(".secondary-tv-iframe");
      iframes.forEach((ifr) => {
        ifr.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: isPlaying ? "playVideo" : "pauseVideo",
            args: [],
          }),
          "*",
        );
      });
    } catch {
      // ignore
    }
  }, [isPlaying, tvOn, isMutedForFullscreen]);

  // Cibles fixes pour les projecteurs de phares
  const leftTarget = useRef<THREE.Object3D>(null);
  const rightTarget = useRef<THREE.Object3D>(null);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;

    // Roulis, tangage et rebond d'extension dynamique du minibus
    if (group.current) {
      const sinceStretch = (performance.now() - stretchRef.current) / 1000;
      const stretchBounce =
        sinceStretch < 0.9 ? Math.sin(sinceStretch * 20) * (0.9 - sinceStretch) * 0.05 : 0;

      group.current.position.y =
        Math.sin(t * 8.5) * 0.014 + Math.sin(t * 2.1) * 0.008 + stretchBounce;
      group.current.rotation.z = Math.sin(t * 1.6) * 0.0035;
    }

    // Animation du chapeau : inclinaison fidèle à l'illustration (relevé vers l'avant) + oscillation au klaxon
    if (hat.current) {
      const since = (performance.now() - hornPulse) / 1000;
      const wobble = since < 0.9 ? Math.sin(since * 28) * (0.9 - since) * 0.04 : 0;
      hat.current.rotation.x = HAT_BASE_ROT[0] + Math.sin(t * 1.2) * 0.008 + wobble;
      hat.current.rotation.y = HAT_BASE_ROT[1];
      hat.current.rotation.z = HAT_BASE_ROT[2] + Math.sin(t * 0.8) * 0.006;
    }

    // Rotation des roues du bus
    wheels.current.forEach((w) => {
      if (w) w.rotation.x -= dt * 12;
    });

    // Éclairage intérieur doux et constant de jour comme de nuit
    const daylight = worldRef.current?.daylight ?? 1;
    const cabinIntensity = 3.8 + (1 - daylight) * 2.5;
    interiorLights.current.forEach((light) => {
      if (light) light.intensity = cabinIntensity;
    });
  });

  return (
    <group ref={group}>
      {/* Cibles des phares positionnées dans l'axe de marche du bus */}
      <object3D ref={leftTarget} position={[-0.85, 0.4, -35]} />
      <object3D ref={rightTarget} position={[0.85, 0.4, -35]} />

      {/* ---------- Carrosserie extérieure extensible ---------- */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          {/* Panneau latéral bas extensible */}
          <mesh material={mats.body} castShadow position={[sx * 1.3, 1.125, cabinCenterZ]}>
            <boxGeometry args={[0.08, 1.25, cabinLength]} />
          </mesh>
          {/* Panneau latéral haut extensible */}
          <mesh material={mats.body} castShadow position={[sx * 1.3, 2.975, cabinCenterZ]}>
            <boxGeometry args={[0.08, 0.45, cabinLength]} />
          </mesh>
          {/* Piliers de vitres adaptatifs */}
          {PILLARS.map((z) => (
            <mesh key={z} material={mats.bodyDark} position={[sx * 1.3, 2.25, z]}>
              <boxGeometry args={[0.08, 1.02, 0.1]} />
            </mesh>
          ))}
          {/* Vitres teintées continues extensibles */}
          <mesh material={mats.glass} position={[sx * 1.3, 2.25, cabinCenterZ]}>
            <boxGeometry args={[0.02, 1.0, cabinLength]} />
          </mesh>
          {/* Bandes décoratives jaunes */}
          <mesh material={mats.yellow} position={[sx * 1.345, 1.32, cabinCenterZ]}>
            <boxGeometry args={[0.02, 0.14, cabinLength]} />
          </mesh>
          <mesh material={mats.yellow} position={[sx * 1.345, 1.08, cabinCenterZ]}>
            <boxGeometry args={[0.02, 0.07, cabinLength]} />
          </mesh>
          {/* Panneau latéral "Les fous du bus" */}
          <mesh
            position={[sx * 1.35, 1.6, 0.8]}
            rotation={[0, sx > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          >
            <planeGeometry args={[3.4, 0.55]} />
            <meshStandardMaterial map={sideLabel} roughness={0.4} />
          </mesh>
          {/* Si le bus est très allongé, deuxième affiche latérale vers l'arrière */}
          {numRows >= 10 && (
            <mesh
              position={[sx * 1.35, 1.6, rearWallZ - 2.6]}
              rotation={[0, sx > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
            >
              <planeGeometry args={[3.4, 0.55]} />
              <meshStandardMaterial map={sideLabel} roughness={0.4} />
            </mesh>
          )}
          {/* Grands rétroviseurs incurvés (restent à l'avant) */}
          <mesh material={mats.body} position={[sx * 1.62, 2.42, -4.35]}>
            <boxGeometry args={[0.15, 0.44, 0.28]} />
          </mesh>
          <mesh
            material={mats.chrome}
            position={[sx * 1.45, 2.42, -4.35]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.02, 0.02, 0.35, 12]} />
          </mesh>
          {/* Miroir réfléchissant */}
          <mesh material={mats.chrome} position={[sx * 1.62, 2.42, -4.2]}>
            <planeGeometry args={[0.13, 0.4]} />
          </mesh>
        </group>
      ))}

      {/* Face avant : pare-brise panoramique */}
      <mesh material={mats.body} castShadow position={[0, 1.125, -4.6]}>
        <boxGeometry args={[2.6, 1.25, 0.08]} />
      </mesh>
      <mesh material={mats.body} castShadow position={[0, 2.975, -4.6]}>
        <boxGeometry args={[2.6, 0.45, 0.08]} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} material={mats.bodyDark} position={[sx * 1.225, 2.25, -4.6]}>
          <boxGeometry args={[0.15, 1.02, 0.08]} />
        </mesh>
      ))}
      <mesh material={mats.bodyDark} position={[0, 2.25, -4.6]}>
        <boxGeometry args={[0.05, 1.02, 0.08]} />
      </mesh>
      <mesh material={mats.glass} position={[0, 2.25, -4.6]}>
        <boxGeometry args={[2.3, 1.0, 0.02]} />
      </mesh>
      {/* Essuie-glaces */}
      {[-0.55, 0.55].map((x) => (
        <mesh
          key={x}
          material={mats.dark}
          position={[x, 1.95, -4.66]}
          rotation={[0, 0, x > 0 ? 0.48 : 0.58]}
        >
          <boxGeometry args={[0.035, 0.62, 0.02]} />
        </mesh>
      ))}
      {/* Girouette de destination lumineuse */}
      <mesh position={[0, 2.98, -4.65]}>
        <planeGeometry args={[2.1, 0.32]} />
        <meshStandardMaterial
          map={destLabel}
          emissive="#ffb700"
          emissiveMap={destLabel}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* ---------- Face arrière dynamique (se recule avec la longueur) ---------- */}
      <group position={[0, 0, rearWallZ]}>
        <mesh material={mats.body} castShadow position={[0, 1.125, 0]}>
          <boxGeometry args={[2.6, 1.25, 0.08]} />
        </mesh>
        <mesh material={mats.body} castShadow position={[0, 2.975, 0]}>
          <boxGeometry args={[2.6, 0.45, 0.08]} />
        </mesh>
        <mesh material={mats.glass} position={[0, 2.25, 0]}>
          <boxGeometry args={[2.3, 1.0, 0.02]} />
        </mesh>
        <mesh material={mats.chrome} position={[0, 0.65, 0.1]}>
          <boxGeometry args={[2.7, 0.28, 0.25]} />
        </mesh>
        {/* Plaque d'immatriculation arrière */}
        <mesh position={[0, 0.65, 0.23]}>
          <planeGeometry args={[0.85, 0.24]} />
          <meshStandardMaterial map={licensePlateTex} roughness={0.3} />
        </mesh>
        {/* Feux arrière rouges */}
        {[-0.95, 0.95].map((rx) => (
          <mesh key={rx} material={mats.red} position={[rx, 1.05, 0.05]}>
            <boxGeometry args={[0.35, 0.2, 0.06]} />
          </mesh>
        ))}
        {/* Affiche à l'arrière du bus */}
        <mesh position={[0, 2.3, -0.06]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1.8, 0.38]} />
          <meshStandardMaterial map={sideLabel} roughness={0.3} />
        </mesh>
      </group>

      {/* ---------- Toit et plancher extensibles ---------- */}
      <mesh material={mats.body} castShadow position={[0, 3.2, cabinCenterZ]}>
        <boxGeometry args={[2.6, 0.08, cabinLength]} />
      </mesh>
      <mesh material={mats.bodyDark} castShadow position={[0, 3.29, cabinCenterZ]}>
        <boxGeometry args={[2.3, 0.12, cabinLength - 0.3]} />
      </mesh>
      <mesh material={mats.floor} position={[0, 0.6, cabinCenterZ]}>
        <boxGeometry args={[2.6, 0.08, cabinLength]} />
      </mesh>
      <mesh material={mats.dark} position={[0, 0.4, cabinCenterZ - 0.6]}>
        <boxGeometry args={[2.4, 0.3, cabinLength + 1.2]} />
      </mesh>

      {/* ---------- Capot avant & Calandre chromée ---------- */}
      <mesh material={mats.body} castShadow position={[0, 1.0, -5.3]}>
        <boxGeometry args={[2.4, 1.0, 1.4]} />
      </mesh>
      <mesh material={mats.bodyDark} position={[0, 1.52, -5.3]}>
        <boxGeometry args={[2.2, 0.06, 1.3]} />
      </mesh>
      {/* Grille de calandre */}
      <mesh material={mats.dark} position={[0, 0.95, -6.0]}>
        <boxGeometry args={[1.1, 0.58, 0.06]} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} material={mats.chrome} position={[0, 0.74 + i * 0.1, -6.04]}>
          <boxGeometry args={[1.05, 0.035, 0.02]} />
        </mesh>
      ))}
      {/* Pare-chocs chromé massif */}
      <mesh material={mats.chrome} castShadow position={[0, 0.6, -6.05]}>
        <boxGeometry args={[2.7, 0.28, 0.3]} />
      </mesh>
      {/* Plaque d'immatriculation avant */}
      <mesh position={[0, 0.6, -6.21]}>
        <planeGeometry args={[0.85, 0.24]} />
        <meshStandardMaterial map={licensePlateTex} roughness={0.3} />
      </mesh>
      {/* Bandes jaunes sur le capot */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} material={mats.yellow} position={[sx * 1.205, 1.2, -5.3]}>
          <boxGeometry args={[0.02, 0.14, 1.4]} />
        </mesh>
      ))}

      {/* ---------- Feux avant & Phares ---------- */}
      {[-0.8, 0.8].map((x, i) => (
        <group key={x} position={[x, 1.02, -6.02]}>
          {/* Cerclage chromé des phares */}
          <mesh material={mats.chrome} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.24, 0.05, 16, 32]} />
          </mesh>
          {/* Globe de phare lumineux */}
          <mesh scale={[1, 1, 0.5]}>
            <sphereGeometry args={[0.22, 24, 16]} />
            <meshStandardMaterial
              color={headlights ? "#f0f8ff" : "#8ab0d8"}
              emissive={headlights ? "#e1f2ff" : "#447098"}
              emissiveIntensity={headlights ? 4.0 : 0.2}
              toneMapped={!headlights}
            />
          </mesh>

          {/* Faisceaux de phares quand allumés */}
          {headlights && (
            <>
              <spotLight
                ref={(sl: THREE.SpotLight | null) => {
                  if (sl) {
                    const tgt = i === 0 ? leftTarget.current : rightTarget.current;
                    if (tgt) sl.target = tgt;
                  }
                }}
                color="#eaf4ff"
                intensity={260}
                distance={85}
                angle={0.42}
                penumbra={0.65}
                decay={1.5}
                position={[0, 0, -0.1]}
                castShadow={false}
              />
              {/* Cône volumétrique lumineux */}
              <mesh position={[0, -0.3, -10]} rotation={[-Math.PI / 2 - 0.03, 0, 0]}>
                <coneGeometry args={[2.8, 20, 32, 1, true]} />
                <meshBasicMaterial
                  color="#b8e2ff"
                  transparent
                  opacity={0.08}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
              {/* Lueur d'appoint au sol */}
              <pointLight color="#d6ecff" intensity={8} distance={8} decay={1.8} />
            </>
          )}
        </group>
      ))}

      {/* Feux clignotants orange */}
      {[-0.8, 0.8].map((x) => (
        <mesh key={`under${x}`} material={mats.orange} position={[x, 0.68, -6.04]}>
          <boxGeometry args={[0.26, 0.1, 0.05]} />
        </mesh>
      ))}

      {/* Feux orange sur les ailes et le pavillon */}
      {[-1.0, 1.0].map((x) => (
        <mesh key={`wing${x}`} material={mats.orange} position={[x, 1.56, -5.85]}>
          <boxGeometry args={[0.26, 0.08, 0.16]} />
        </mesh>
      ))}
      {[-0.95, -0.7, 0.7, 0.95].map((x) => (
        <mesh key={`roof${x}`} material={mats.orange} position={[x, 3.14, -4.65]}>
          <boxGeometry args={[0.16, 0.1, 0.06]} />
        </mesh>
      ))}

      {/* ---------- Roues stylisées (adaptées à la longueur) ---------- */}
      {wheelPositions.map(([x, z], i) => (
        <group key={`wheel-${i}`} position={[x, 0.55, z]}>
          <mesh
            ref={(el: any) => {
              if (el) wheels.current[i] = el;
            }}
            castShadow
            rotation={[0, 0, Math.PI / 2]}
          >
            {/* Pneu noir à cannelures */}
            <cylinderGeometry args={[0.55, 0.55, 0.4, 32]} />
            <meshStandardMaterial color="#19191d" roughness={0.92} />

            {/* Enjoliveur chromé bombé */}
            <mesh material={mats.chrome} position={[0, 0, 0]}>
              <cylinderGeometry args={[0.34, 0.34, 0.42, 28]} />
            </mesh>
            {/* Centre de roue doré One Piece */}
            <mesh material={mats.yellow} position={[0, 0, 0]}>
              <sphereGeometry args={[0.14, 16, 16]} />
            </mesh>
            {/* 5 écrous chromés */}
            {[0, 1, 2, 3, 4].map((k) => (
              <mesh
                key={k}
                material={mats.dark}
                position={[
                  0,
                  Math.cos((k / 5) * Math.PI * 2) * 0.22,
                  Math.sin((k / 5) * Math.PI * 2) * 0.22,
                ]}
              >
                <cylinderGeometry args={[0.03, 0.03, 0.44, 8]} />
              </mesh>
            ))}
          </mesh>
        </group>
      ))}

      {/* ---------- CHAPEAU DE PAILLE DE LUFFY (PROPORTIONS MUGIWARA) ---------- */}
      <group
        ref={hat}
        position={HAT_BASE_POS}
        rotation={HAT_BASE_ROT}
      >
        {/* Chapeau de Luffy complet et continu */}
        <mesh geometry={hatGeo} material={mats.straw} castShadow receiveShadow />

        {/* Ruban rouge écarlate ceignant la calotte */}
        <mesh
          geometry={ribbonGeo}
          material={mats.band}
          position={[0, 0, 0]}
          castShadow
        />
      </group>

      {/* ---------- INTÉRIEUR DU BUS ---------- */}
      {/* Habillage intérieur du toit extensible */}
      <mesh material={mats.interiorWall} position={[0, 3.15, cabinCenterZ]}>
        <boxGeometry args={[2.5, 0.02, cabinLength - 0.1]} />
      </mesh>

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
          ref={(el: any) => {
            if (el) interiorLights.current[idx] = el;
          }}
          position={[0, 2.85, lz]}
          color="#fff4db"
          intensity={4.5}
          distance={9.5}
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

      {/* Sièges passagers avec sellerie rouge confortable pour TOUTES les rangées */}
      {SEAT_ROWS.map((z) =>
        [-0.72, 0.72].map((x) => (
          <group key={`${z}${x}`} position={[x, 0, z]}>
            <mesh material={mats.seat} position={[0, 1.05, 0]} castShadow>
              <boxGeometry args={[0.95, 0.15, 0.7]} />
            </mesh>
            <mesh material={mats.seat} position={[0, 1.38, 0.33]} castShadow>
              <boxGeometry args={[0.95, 0.58, 0.12]} />
            </mesh>
            <mesh material={mats.seatFrame} position={[0, 0.82, 0]}>
              <boxGeometry args={[0.85, 0.36, 0.6]} />
            </mesh>
            <mesh material={mats.seatFrame} position={[0, 1.70, 0.33]}>
              <boxGeometry args={[0.95, 0.05, 0.08]} />
            </mesh>
          </group>
        )),
      )}

      {/* PASSAGERS NAKAMA ASSIS DANS LE BUS */}
      <Passengers
        passengerCount={passengerCount}
        numRows={numRows}
        hornPulse={hornPulse}
        reservedRow={reservedRow}
      />

      {/* Poste de conduite avec volant et tableau de bord */}
      <group position={[-0.72, 0, -3.8]}>
        <mesh material={mats.seat} position={[0, 1.05, 0]}>
          <boxGeometry args={[0.8, 0.15, 0.7]} />
        </mesh>
        <mesh material={mats.seat} position={[0, 1.5, 0.33]}>
          <boxGeometry args={[0.8, 0.9, 0.12]} />
        </mesh>
        {/* Volant 3 branches */}
        <mesh
          material={mats.dark}
          position={[0, 1.65, -0.55]}
          rotation={[-1.1, 0, 0]}
        >
          <torusGeometry args={[0.25, 0.035, 12, 32]} />
        </mesh>
        <mesh
          material={mats.chrome}
          position={[0, 1.45, -0.5]}
          rotation={[0.48, 0, 0]}
        >
          <cylinderGeometry args={[0.025, 0.025, 0.52, 10]} />
        </mesh>
      </group>

      {/* Meuble tableau de bord avec compteurs lumineux */}
      <group position={[0, 1.42, -4.3]}>
        <mesh material={mats.dark}>
          <boxGeometry args={[2.4, 0.42, 0.45]} />
        </mesh>
        {/* Cadran d'instruments face au conducteur */}
        <mesh position={[-0.72, 0.15, 0.23]} rotation={[-0.35, 0, 0]}>
          <planeGeometry args={[0.8, 0.25]} />
          <meshStandardMaterial
            map={dashTex}
            emissive="#ffffff"
            emissiveMap={dashTex}
            emissiveIntensity={0.65}
          />
        </mesh>
      </group>

      {/* ---------- TÉLÉVISIONS DU BUS (Une à l'avant + une toutes les 4 rangées) ---------- */}
      {tvPositions.map((pos, idx) => {
        const isPrimary = idx === 0;
        return (
          <group
            key={`tv-${idx}-${pos[2]}`}
            position={pos}
            onClick={(e: any) => {
              e.stopPropagation();
              onToggleTv?.();
            }}
          >
            {/* Cadre de la télévision */}
            <mesh material={mats.dark} castShadow>
              <boxGeometry args={[1.36, 0.82, 0.08]} />
            </mesh>
            {/* Bordure dorée One Piece */}
            <mesh material={mats.yellow} position={[0, 0, 0.041]}>
              <boxGeometry args={[1.34, 0.8, 0.01]} />
            </mesh>
            {/* Support de fixation au plafond */}
            <mesh material={mats.seatFrame} position={[0, 0.52, -0.08]}>
              <boxGeometry args={[0.12, 0.38, 0.12]} />
            </mesh>

            {/* Écran TV 3D :
                - Quand la télé est éteinte : affiche l'écran éteint en veille
                - Quand la télé est allumée et qu'on est à l'extérieur : affiche l'écran allumé lumineux
                - Quand la télé est allumée et qu'on est à l'intérieur : aucun fond 3D (le fond gris disparaît complètement pour laisser place à la vidéo) */}
            {!tvOn ? (
              <mesh position={[0, 0, 0.047]}>
                <planeGeometry args={[1.26, 0.72]} />
                <meshStandardMaterial
                  map={tvOffTex}
                  emissive="#ffffff"
                  emissiveMap={tvOffTex}
                  emissiveIntensity={0.25}
                />
              </mesh>
            ) : phase !== "inside" ? (
              <mesh position={[0, 0, 0.047]}>
                <planeGeometry args={[1.26, 0.72]} />
                <meshStandardMaterial
                  map={tvOnTex}
                  emissive="#ffffff"
                  emissiveMap={tvOnTex}
                  emissiveIntensity={1.0}
                />
              </mesh>
            ) : null}

            {/* TV 0 : Lecteur principal (avec audio et contrôles Stop, Play/Pause et Plein écran épurés) */}
            {isPrimary && tvOn && (
              <Html
                transform
                distanceFactor={400}
                position={[0, 0, 0.052]}
                scale={0.00225}
                style={{
                  pointerEvents: phase === "inside" && !isMutedForFullscreen ? "auto" : "none",
                  userSelect: "none",
                  opacity: phase === "inside" && !isMutedForFullscreen ? 1 : 0.001,
                  backfaceVisibility: "hidden",
                  transition: "opacity 0.2s ease",
                }}
              >
                <div
                  id="tv-frame"
                  style={{
                    position: "relative",
                    width: 560,
                    height: 315,
                    background: "#000000",
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "0 0 24px rgba(255, 210, 63, 0.35)",
                    border: "2px solid #1a1d26",
                  }}
                >
                  <iframe
                    ref={primaryIframeRef}
                    id="tv-primary-iframe"
                    width="560"
                    height="315"
                    src={`https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1&disablekb=1&fs=0&playsinline=1`}
                    title="La théorie des Fous du Bus"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    allowFullScreen
                    style={{ border: 0, display: "block", width: "100%", height: "100%" }}
                  />

                  {/* Bandeau de masquage supérieur 100% opaque (cache titre YouTube, avatar, liens de partage et rémunération) */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "58px",
                      background: "#050811",
                      borderBottom: "1px solid rgba(255, 210, 63, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 14px",
                      pointerEvents: "auto",
                      zIndex: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "14px" }}>📺</span>
                      <span style={{ color: "#ffd23f", fontSize: "12px", fontWeight: "900", letterSpacing: "1px" }}>
                        LES FOUS DU BUS · TV MUGIWARA
                      </span>
                    </div>
                    <span style={{ color: "#e2e8f0", fontSize: "11px", fontWeight: "bold", background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: "10px" }}>
                      EN DIRECT
                    </span>
                  </div>

                  {/* Cache inférieur droit pour masquer le watermark "Watch on YouTube" */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: "140px",
                      height: "54px",
                      background: "#000000",
                      pointerEvents: "auto",
                      zIndex: 10,
                    }}
                  />

                  {/* Zone cliquable sur toute la vidéo pour basculer lecture / pause */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePlay?.();
                    }}
                    style={{
                      position: "absolute",
                      top: "58px",
                      bottom: "54px",
                      left: 0,
                      right: 0,
                      zIndex: 15,
                      cursor: "pointer",
                    }}
                  />

                  {/* Contrôles épurés sur la petite TV : Play/Pause, Stop et Plein écran */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "54px",
                      background: "linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(5,8,17,0.92) 100%)",
                      borderTop: "1.5px solid rgba(255, 210, 63, 0.3)",
                      zIndex: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 14px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {/* Bouton Play/Pause */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePlay?.();
                        }}
                        title={isPlaying ? "Mettre en pause" : "Lancer la lecture"}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: isPlaying ? "rgba(25, 32, 58, 0.95)" : "#ffd23f",
                          color: isPlaying ? "#ffd23f" : "#0d2190",
                          border: "1.5px solid #ffd23f",
                          borderRadius: "20px",
                          padding: "7px 16px",
                          fontSize: "13px",
                          fontWeight: "900",
                          cursor: "pointer",
                          boxShadow: "0 2px 10px rgba(0,0,0,0.6)",
                        }}
                      >
                        <span style={{ fontSize: "14px" }}>{isPlaying ? "⏸" : "▶"}</span>
                        <span>{isPlaying ? "Pause" : "Play"}</span>
                      </button>

                      {/* Bouton Stop */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStop?.();
                        }}
                        title="Arrêter et revenir au début"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "rgba(25, 32, 58, 0.9)",
                          color: "#ffffff",
                          border: "1.5px solid rgba(255,255,255,0.35)",
                          borderRadius: "20px",
                          padding: "7px 14px",
                          fontSize: "13px",
                          fontWeight: "bold",
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                        }}
                      >
                        <span style={{ color: "#ef4444", fontSize: "12px" }}>⏹</span>
                        <span>Stop</span>
                      </button>
                    </div>

                    {/* Bouton Plein écran synchronisé sur la TV */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFullscreen?.();
                      }}
                      title="Passer en plein écran"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "rgba(255, 210, 63, 0.18)",
                        color: "#ffd23f",
                        border: "1.5px solid #ffd23f",
                        borderRadius: "20px",
                        padding: "7px 16px",
                        fontSize: "13px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                      }}
                    >
                      <span>⛶</span>
                      <span>Plein écran</span>
                    </button>
                  </div>
                </div>
              </Html>
            )}

            {/* TV 1, 2, ... : Écrans secondaires dans l'allée (vidéo synchronisée, mute=1) */}
            {!isPrimary && tvOn && phase === "inside" && !isMutedForFullscreen && (
              <Html
                transform
                distanceFactor={400}
                position={[0, 0, 0.052]}
                scale={0.00225}
                style={{
                  pointerEvents: "auto",
                  userSelect: "none",
                  backfaceVisibility: "hidden",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 560,
                    height: 315,
                    background: "#000000",
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "0 0 24px rgba(255, 210, 63, 0.35)",
                    border: "2px solid #1a1d26",
                  }}
                >
                  <iframe
                    className="secondary-tv-iframe"
                    width="560"
                    height="315"
                    src={`https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1&disablekb=1&fs=0&playsinline=1`}
                    title={`TV ${idx + 1}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    style={{ border: 0, display: "block", width: "100%", height: "100%" }}
                  />
                  {/* Masque supérieur */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "58px",
                      background: "#050811",
                      borderBottom: "1px solid rgba(255, 210, 63, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 14px",
                      pointerEvents: "none",
                      zIndex: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "14px" }}>📺</span>
                      <span style={{ color: "#ffd23f", fontSize: "12px", fontWeight: "900", letterSpacing: "1px" }}>
                        RELAIS ALLÉE · TV {idx + 1}
                      </span>
                    </div>
                    <span style={{ color: "#e2e8f0", fontSize: "11px", fontWeight: "bold", background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: "10px" }}>
                      SYNCHRO
                    </span>
                  </div>

                  {/* Cache inférieur droit watermark */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: "140px",
                      height: "54px",
                      background: "#000000",
                      pointerEvents: "none",
                      zIndex: 10,
                    }}
                  />

                  {/* Shield cliquable */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePlay?.();
                    }}
                    style={{
                      position: "absolute",
                      top: "58px",
                      bottom: "54px",
                      left: 0,
                      right: 0,
                      zIndex: 15,
                      cursor: "pointer",
                    }}
                  />

                  {/* Barre de contrôles sur écran secondaire */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "54px",
                      background: "linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(5,8,17,0.92) 100%)",
                      borderTop: "1.5px solid rgba(255, 210, 63, 0.3)",
                      zIndex: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 14px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePlay?.();
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: isPlaying ? "rgba(25, 32, 58, 0.95)" : "#ffd23f",
                          color: isPlaying ? "#ffd23f" : "#0d2190",
                          border: "1.5px solid #ffd23f",
                          borderRadius: "20px",
                          padding: "7px 16px",
                          fontSize: "13px",
                          fontWeight: "900",
                          cursor: "pointer",
                        }}
                      >
                        <span>{isPlaying ? "⏸" : "▶"}</span>
                        <span>{isPlaying ? "Pause" : "Play"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStop?.();
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "rgba(25, 32, 58, 0.9)",
                          color: "#ffffff",
                          border: "1.5px solid rgba(255,255,255,0.35)",
                          borderRadius: "20px",
                          padding: "7px 14px",
                          fontSize: "13px",
                          fontWeight: "bold",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ color: "#ef4444" }}>⏹</span>
                        <span>Stop</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFullscreen?.();
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "rgba(255, 210, 63, 0.18)",
                        color: "#ffd23f",
                        border: "1.5px solid #ffd23f",
                        borderRadius: "20px",
                        padding: "7px 16px",
                        fontSize: "13px",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      <span>⛶</span>
                      <span>Plein écran</span>
                    </button>
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
