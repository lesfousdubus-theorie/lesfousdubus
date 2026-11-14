"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { playDing, playHorn } from "@/lib/horn";

interface BusDriversProps {
  hornPulse: number;
  montCorvoTex?: THREE.Texture | null;
  reducedMotion?: boolean;
}

// Couleurs de peau et vêtements de Kamal & Kyta (Le Mont Corvo)
const SKIN_COLOR = "#cf936d"; // Teint méditerranéen chaleureux
const DARK_HAIR_COLOR = "#151413"; // Cheveux et barbe noire soignée
const KAMAL_HOODIE = "#181c25"; // Hoodie streetwear bleu nuit / noir
const KYTA_HOODIE = "#631728"; // Hoodie streetwear bordeaux profond
const PANTS_COLOR = "#22252e"; // Pantalon streetwear sombre
const SHOES_COLOR = "#141519"; // Baskets streetwear
const WHITE_SOLE_COLOR = "#f1f5f9"; // Semelle blanche
const GOLD_COLOR = "#f59e0b"; // Détails dorés et Log Pose

/** Génère une texture de badge au-dessus de la tête du conducteur / copilote */
function makeDriverBadgeTexture(name: string, role: string, accentColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Pilule de fond sombre semi-transparente avec ombre portée
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  const rx = 24;
  const ry = 16;
  const rw = canvas.width - 48;
  const rh = canvas.height - 32;

  ctx.fillStyle = "rgba(9, 13, 24, 0.94)";
  ctx.beginPath();
  ctx.roundRect(rx, ry, rw, rh, 28);
  ctx.fill();

  // Bordure dorée / accent
  ctx.lineWidth = 4;
  ctx.strokeStyle = accentColor;
  ctx.stroke();
  ctx.restore();

  // Nom principal en gras doré / blanc
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 48px ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(name, canvas.width / 2, ry + 42);

  // Rôle et mention "Mont Corvo"
  ctx.font = "800 22px ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillStyle = accentColor;
  ctx.fillText(role.toUpperCase(), canvas.width / 2, ry + rh - 30);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return { texture, aspect: canvas.width / canvas.height };
}

/** Génère la bulle de dialogue BD pour les répliques cultes */
function makeSpeechBubbleTexture(quote: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 240;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Bulle style manga / pirate
  const x = 20;
  const y = 16;
  const w = canvas.width - 40;
  const h = 180;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 24);
  ctx.fill();

  // Pointe de la bulle vers le bas
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 20, y + h);
  ctx.lineTo(canvas.width / 2, y + h + 30);
  ctx.lineTo(canvas.width / 2 + 20, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = 6;
  ctx.strokeStyle = "#0f172a";
  ctx.stroke();
  ctx.restore();

  // Texte découpé sur 2-3 lignes
  ctx.font = "bold 26px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const words = quote.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > w - 48) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const startY = y + h / 2 - ((lines.length - 1) * 32) / 2;
  lines.forEach((line, idx) => {
    ctx.fillText(line, canvas.width / 2, startY + idx * 32);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return { texture, aspect: canvas.width / canvas.height };
}

export function BusDrivers({ hornPulse, reducedMotion = false }: BusDriversProps) {
  const kamalTorso = useRef<THREE.Group>(null);
  const kamalHead = useRef<THREE.Group>(null);
  const kamalLeftArm = useRef<THREE.Group>(null);
  const kamalRightArm = useRef<THREE.Group>(null);

  const kytaTorso = useRef<THREE.Group>(null);
  const kytaHead = useRef<THREE.Group>(null);
  const kytaRightArm = useRef<THREE.Group>(null);
  const kytaCompassNeedles = useRef<(THREE.Mesh | null)[]>([]);

  // Citations actives au clic
  const [kamalQuoteActive, setKamalQuoteActive] = useState(false);
  const [kytaQuoteActive, setKytaQuoteActive] = useState(false);
  const kamalQuoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kytaQuoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Textures des badges
  const kamalBadgeTex = useMemo(
    () => makeDriverBadgeTexture("KAMAL", "Conducteur · Le Mont Corvo", "#ffd23f"),
    [],
  );
  const kytaBadgeTex = useMemo(
    () => makeDriverBadgeTexture("KYTA", "Navigateur · Le Mont Corvo", "#38bdf8"),
    [],
  );

  // Textures des bulles de réplique
  const kamalQuoteTex = useMemo(
    () =>
      makeSpeechBubbleTexture(
        "Accrochez-vous les Fous du Bus ! Laugh Tale et le Siècle Oublié sont droit devant !",
      ),
    [],
  );
  const kytaQuoteTex = useMemo(
    () =>
      makeSpeechBubbleTexture(
        "Le Log Pose s'affole ! La théorie du Mont Corvo est en train de se réaliser !",
      ),
    [],
  );

  useEffect(() => {
    return () => {
      kamalBadgeTex.texture.dispose();
      kytaBadgeTex.texture.dispose();
      kamalQuoteTex.texture.dispose();
      kytaQuoteTex.texture.dispose();
      if (kamalQuoteTimer.current) clearTimeout(kamalQuoteTimer.current);
      if (kytaQuoteTimer.current) clearTimeout(kytaQuoteTimer.current);
      document.body.style.cursor = "auto";
    };
  }, [kamalBadgeTex, kytaBadgeTex, kamalQuoteTex, kytaQuoteTex]);

  // Clic interactif sur Kamal
  const handleKamalClick = useCallback((e?: { stopPropagation: () => void }) => {
    e?.stopPropagation();
    playDing();
    setKamalQuoteActive(true);
    if (kamalQuoteTimer.current) clearTimeout(kamalQuoteTimer.current);
    kamalQuoteTimer.current = setTimeout(() => setKamalQuoteActive(false), 4500);

    window.dispatchEvent(
      new CustomEvent("bus-show-toast", {
        detail: {
          badge: "👑 KAMAL · MONT CORVO",
          text: "« Accrochez-vous ! On fonce tout droit vers le Siècle Oublié ! »",
          sub: "Conducteur officiel des Fous du Bus",
        },
      }),
    );
  }, []);

  // Clic interactif sur Kyta
  const handleKytaClick = useCallback((e?: { stopPropagation: () => void }) => {
    e?.stopPropagation();
    playHorn();
    setKytaQuoteActive(true);
    if (kytaQuoteTimer.current) clearTimeout(kytaQuoteTimer.current);
    kytaQuoteTimer.current = setTimeout(() => setKytaQuoteActive(false), 4500);

    window.dispatchEvent(
      new CustomEvent("bus-show-toast", {
        detail: {
          badge: "🧭 KYTA · MONT CORVO",
          text: "« Le Log Pose s'affole ! La théorie du Mont Corvo se vérifie sous nos yeux ! »",
          sub: "Co-pilote & Navigateur du convoi",
        },
      }),
    );
  }, []);

  const mats = useMemo(() => {
    return {
      skin: new THREE.MeshStandardMaterial({ color: SKIN_COLOR, roughness: 0.62 }),
      darkHair: new THREE.MeshStandardMaterial({ color: DARK_HAIR_COLOR, roughness: 0.78 }),
      kamalHoodie: new THREE.MeshStandardMaterial({ color: KAMAL_HOODIE, roughness: 0.58 }),
      kytaHoodie: new THREE.MeshStandardMaterial({ color: KYTA_HOODIE, roughness: 0.55 }),
      pants: new THREE.MeshStandardMaterial({ color: PANTS_COLOR, roughness: 0.7 }),
      shoes: new THREE.MeshStandardMaterial({ color: SHOES_COLOR, roughness: 0.85 }),
      whiteSole: new THREE.MeshStandardMaterial({ color: WHITE_SOLE_COLOR, roughness: 0.45 }),
      capBlack: new THREE.MeshStandardMaterial({ color: "#111317", roughness: 0.55 }),
      gold: new THREE.MeshStandardMaterial({ color: GOLD_COLOR, metalness: 0.8, roughness: 0.25 }),
      leather: new THREE.MeshStandardMaterial({ color: "#3e2417", roughness: 0.7 }),
      parchment: new THREE.MeshStandardMaterial({ color: "#fef3c7", roughness: 0.75 }),
      eyes: new THREE.MeshBasicMaterial({
        color: "#0a0a0c",
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
      eyeHighlight: new THREE.MeshBasicMaterial({
        color: "#ffffff",
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      }),
      smile: new THREE.MeshBasicMaterial({
        color: "#ffffff",
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
      mustache: new THREE.MeshStandardMaterial({ color: DARK_HAIR_COLOR, roughness: 0.85 }),
      glassDome: new THREE.MeshStandardMaterial({
        color: "#bae6fd",
        transparent: true,
        opacity: 0.48,
        roughness: 0.08,
        metalness: 0.1,
      }),
      needleRed: new THREE.MeshBasicMaterial({ color: "#ef4444" }),
    };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Réaction au klaxon : bond et hochement d'enthousiasme
    const sinceHorn = (performance.now() - hornPulse) / 1000;
    const isHonking = sinceHorn < 0.9;
    const hornBounce = isHonking ? Math.sin(sinceHorn * 20) * (0.9 - sinceHorn) * 0.08 : 0;

    // Respiration et micro-mouvements de conduite de Kamal
    if (kamalTorso.current) {
      const breath = 1 + Math.sin(t * 2.1) * 0.015;
      kamalTorso.current.scale.set(breath, 1, breath);
    }
    if (kamalHead.current) {
      const roadBob = Math.sin(t * 4.2) * 0.018;
      const lookRoad = Math.sin(t * 1.2) * 0.03;
      kamalHead.current.position.y = 1.82 + hornBounce * 0.6;
      kamalHead.current.rotation.x = roadBob + (isHonking ? -0.12 : 0);
      kamalHead.current.rotation.y = lookRoad;
    }
    // Mains de Kamal sur le volant : micro-corrections de trajectoire
    if (kamalLeftArm.current && kamalRightArm.current) {
      const steerWiggle = !reducedMotion ? Math.sin(t * 2.8) * 0.025 : 0;
      kamalLeftArm.current.rotation.z = steerWiggle;
      kamalRightArm.current.rotation.z = -steerWiggle;
    }

    // Respiration et attitude enthousiaste de Kyta (co-pilote)
    if (kytaTorso.current) {
      const breath = 1 + Math.sin(t * 2.3 + 0.4) * 0.015;
      kytaTorso.current.scale.set(breath, 1, breath);
    }
    if (kytaHead.current) {
      const roadBob = Math.sin(t * 4.0 + 0.5) * 0.018;
      // Kyta regarde vers la route puis tourne la tête avec enthousiasme vers Kamal à gauche
      const lookTowardsKamal = Math.sin(t * 0.8) * 0.14 - 0.1;
      kytaHead.current.position.y = 1.82 + hornBounce * 0.6;
      kytaHead.current.rotation.x = roadBob + (isHonking ? -0.15 : 0);
      kytaHead.current.rotation.y = lookTowardsKamal;
    }
    // Bras droit de Kyta pointant l'horizon avec son triple Log Pose
    if (kytaRightArm.current) {
      const pointSway = Math.sin(t * 2.5) * 0.035;
      kytaRightArm.current.rotation.z = pointSway;
    }
    // Aiguilles magnétiques du Log Pose du Nouveau Monde
    kytaCompassNeedles.current.forEach((needle, idx) => {
      if (needle) {
        needle.rotation.y = Math.sin(t * 5 + idx * 1.8) * 0.35 + idx * 0.8;
      }
    });
  });

  return (
    <group>
      {/* ============================================================== */}
      {/* 1. KAMAL (CONDUCTEUR AU VOLANT) - POSITION [-0.72, 0, -3.8]   */}
      {/* ============================================================== */}
      <group
        position={[-0.72, 0, -3.8]}
        onClick={handleKamalClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        {/* Badge flottant conducteur au-dessus de la casquette */}
        <sprite position={[0, 2.22, 0.14]} scale={[kamalBadgeTex.aspect * 0.14, 0.14, 1]}>
          <spriteMaterial
            map={kamalBadgeTex.texture}
            transparent
            alphaTest={0.06}
            depthTest
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>

        {/* Bulle de réplique BD active au clic */}
        {kamalQuoteActive && (
          <sprite position={[0, 2.48, 0.08]} scale={[kamalQuoteTex.aspect * 0.22, 0.22, 1]}>
            <spriteMaterial
              map={kamalQuoteTex.texture}
              transparent
              alphaTest={0.06}
              depthTest
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
        )}

        {/* --- JAMBES ET PIEDS DE CONDUITE --- */}
        {/* Bassin posé sur le coussin du siège conducteur */}
        <mesh material={mats.pants} position={[0, 1.15, 0.12]}>
          <boxGeometry args={[0.34, 0.14, 0.28]} />
        </mesh>
        {/* Cuisses vers l'avant */}
        {[-0.09, 0.09].map((lx) => (
          <mesh key={`kamal-thigh-${lx}`} material={mats.pants} position={[lx, 1.15, -0.06]}>
            <boxGeometry args={[0.13, 0.12, 0.32]} />
          </mesh>
        ))}
        {/* Mollets vers les pédales */}
        {[-0.09, 0.09].map((lx) => (
          <mesh key={`kamal-calf-${lx}`} material={mats.pants} position={[lx, 0.88, -0.21]}>
            <boxGeometry args={[0.12, 0.42, 0.12]} />
          </mesh>
        ))}
        {/* Baskets streetwear posées aux pédales avec liseré blanc */}
        {[-0.09, 0.09].map((lx) => (
          <group key={`kamal-shoe-${lx}`} position={[lx, 0.65, -0.24]}>
            <mesh material={mats.shoes}>
              <boxGeometry args={[0.13, 0.07, 0.2]} />
            </mesh>
            <mesh material={mats.whiteSole} position={[0, -0.035, 0]}>
              <boxGeometry args={[0.134, 0.016, 0.204]} />
            </mesh>
          </group>
        ))}

        {/* --- TORSE STREETWEAR (HOODIE KAMAL) --- */}
        <group ref={kamalTorso} position={[0, 1.42, 0.14]}>
          <mesh material={mats.kamalHoodie} rotation={[-0.06, 0, 0]}>
            <boxGeometry args={[0.34, 0.4, 0.22]} />
          </mesh>
          {/* Poche kangourou ventrale */}
          <mesh material={mats.kamalHoodie} position={[0, -0.08, -0.12]}>
            <boxGeometry args={[0.24, 0.13, 0.03]} />
          </mesh>
          {/* Cordons de serrage du hoodie */}
          {[-0.04, 0.04].map((cx) => (
            <mesh key={`kamal-cord-${cx}`} material={mats.whiteSole} position={[cx, 0.05, -0.12]}>
              <cylinderGeometry args={[0.006, 0.006, 0.12, 6]} />
            </mesh>
          ))}
          {/* Petit logo Mont Corvo / corbeau stylisé sur la poitrine gauche */}
          <mesh material={mats.gold} position={[-0.08, 0.09, -0.116]}>
            <boxGeometry args={[0.045, 0.035, 0.008]} />
          </mesh>

          {/* BRAS GAUCHE : ÉPAULE -> AVANT-BRAS -> MAIN GAUCHE SUR LE VOLANT (10h) */}
          <group ref={kamalLeftArm} position={[-0.19, 0.14, 0]}>
            {/* Bras supérieur allant vers l'avant */}
            <mesh
              material={mats.kamalHoodie}
              position={[0, -0.08, -0.1]}
              rotation={[0.75, 0.1, -0.2]}
            >
              <cylinderGeometry args={[0.05, 0.045, 0.26, 8]} />
            </mesh>
            {/* Avant-bras s'étendant directement vers le volant */}
            <mesh
              material={mats.kamalHoodie}
              position={[0.03, -0.04, -0.24]}
              rotation={[1.15, 0.25, -0.3]}
            >
              <cylinderGeometry args={[0.045, 0.04, 0.26, 8]} />
            </mesh>
            {/* Main gauche fermée sur la jante du volant */}
            <mesh
              material={mats.skin}
              position={[0.05, 0.05, -0.34]}
              rotation={[0.2, 0.4, -0.3]}
            >
              <boxGeometry args={[0.07, 0.065, 0.07]} />
            </mesh>
          </group>

          {/* BRAS DROIT : ÉPAULE -> AVANT-BRAS -> MAIN DROITE SUR LE VOLANT (2h) */}
          <group ref={kamalRightArm} position={[0.19, 0.14, 0]}>
            {/* Bras supérieur allant vers l'avant */}
            <mesh
              material={mats.kamalHoodie}
              position={[0, -0.08, -0.1]}
              rotation={[0.75, -0.1, 0.2]}
            >
              <cylinderGeometry args={[0.05, 0.045, 0.26, 8]} />
            </mesh>
            {/* Avant-bras vers le volant */}
            <mesh
              material={mats.kamalHoodie}
              position={[-0.03, -0.04, -0.24]}
              rotation={[1.15, -0.25, 0.3]}
            >
              <cylinderGeometry args={[0.045, 0.04, 0.26, 8]} />
            </mesh>
            {/* Main droite fermée sur le volant */}
            <mesh
              material={mats.skin}
              position={[-0.05, 0.05, -0.34]}
              rotation={[0.2, -0.4, 0.3]}
            >
              <boxGeometry args={[0.07, 0.065, 0.07]} />
            </mesh>
          </group>
        </group>

        {/* Cou */}
        <mesh material={mats.skin} position={[0, 1.66, 0.14]}>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 8]} />
        </mesh>

        {/* --- TÊTE, VISAGE & CASQUETTE DE KAMAL --- */}
        <group ref={kamalHead} position={[0, 1.82, 0.14]}>
          {/* Tête anatomique */}
          <mesh material={mats.skin}>
            <boxGeometry args={[0.22, 0.24, 0.2]} />
          </mesh>

          {/* Yeux stylisés concentrés sur la route */}
          {[-0.055, 0.055].map((ex) => (
            <group key={`kamal-eye-${ex}`} position={[ex, 0.02, -0.112]}>
              <mesh material={mats.eyes}>
                <boxGeometry args={[0.038, 0.038, 0.01]} />
              </mesh>
              {/* Reflet blanc expressif */}
              <mesh material={mats.eyeHighlight} position={[0.008, 0.008, 0.006]}>
                <boxGeometry args={[0.012, 0.012, 0.005]} />
              </mesh>
            </group>
          ))}

          {/* Sourcils déterminés */}
          {[-0.055, 0.055].map((bx, bi) => (
            <mesh
              key={`kamal-brow-${bi}`}
              material={mats.mustache}
              position={[bx, 0.055, -0.114]}
              rotation={[0, 0, bi === 0 ? 0.1 : -0.1]}
            >
              <boxGeometry args={[0.045, 0.015, 0.008]} />
            </mesh>
          ))}

          {/* Sourire confiant de pirate au volant */}
          <mesh material={mats.smile} position={[0, -0.05, -0.112]}>
            <boxGeometry args={[0.09, 0.022, 0.01]} />
          </mesh>

          {/* --- BARBE & MOUSTACHE SOIGNÉE (SIGNATURE LE MONT CORVO) --- */}
          {/* Moustache taillée */}
          <mesh material={mats.mustache} position={[0, -0.026, -0.114]}>
            <boxGeometry args={[0.11, 0.024, 0.014]} />
          </mesh>
          {/* Bouc sous la lèvre et menton */}
          <mesh material={mats.mustache} position={[0, -0.08, -0.106]}>
            <boxGeometry args={[0.1, 0.07, 0.026]} />
          </mesh>
          {/* Barbe le long de la mâchoire */}
          <mesh material={mats.mustache} position={[0, -0.07, 0.01]}>
            <boxGeometry args={[0.228, 0.1, 0.19]} />
          </mesh>
          {/* Pattes remontant aux oreilles */}
          {[-0.114, 0.114].map((sx) => (
            <mesh key={`kamal-sideburn-${sx}`} material={mats.mustache} position={[sx, 0.01, -0.02]}>
              <boxGeometry args={[0.016, 0.12, 0.07]} />
            </mesh>
          ))}

          {/* --- CASQUETTE DE BASEBALL AVEC VISIÈRE COURBÉE À L'ENDROIT --- */}
          {/* Calotte de la casquette */}
          <mesh material={mats.capBlack} position={[0, 0.09, 0.01]}>
            <boxGeometry args={[0.235, 0.13, 0.22]} />
          </mesh>
          {/* Bouton sommital de la casquette */}
          <mesh material={mats.capBlack} position={[0, 0.16, 0.01]}>
            <cylinderGeometry args={[0.02, 0.02, 0.014, 8]} />
          </mesh>
          {/* Visière courbée vers l'avant ombrant le regard */}
          <group position={[0, 0.055, -0.16]} rotation={[0.2, 0, 0]}>
            <mesh material={mats.capBlack}>
              <boxGeometry args={[0.22, 0.016, 0.14]} />
            </mesh>
            {/* Liseré brodé doré sur la visière */}
            <mesh material={mats.gold} position={[0, 0.008, 0.04]}>
              <boxGeometry args={[0.18, 0.005, 0.02]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ============================================================== */}
      {/* 2. KYTA (NAVIGATEUR & CO-PILOTE) - POSITION [0.72, 0, -3.8]    */}
      {/* ============================================================== */}
      <group
        position={[0.72, 0, -3.8]}
        onClick={handleKytaClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        {/* Badge flottant navigateur au-dessus de la casquette */}
        <sprite position={[0, 2.22, 0.14]} scale={[kytaBadgeTex.aspect * 0.14, 0.14, 1]}>
          <spriteMaterial
            map={kytaBadgeTex.texture}
            transparent
            alphaTest={0.06}
            depthTest
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>

        {/* Bulle de réplique BD active au clic */}
        {kytaQuoteActive && (
          <sprite position={[0, 2.48, 0.08]} scale={[kytaQuoteTex.aspect * 0.22, 0.22, 1]}>
            <spriteMaterial
              map={kytaQuoteTex.texture}
              transparent
              alphaTest={0.06}
              depthTest
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
        )}

        {/* --- JAMBES ET PIEDS DU CO-PILOTE --- */}
        {/* Bassin posé sur le siège co-pilote */}
        <mesh material={mats.pants} position={[0, 1.15, 0.12]}>
          <boxGeometry args={[0.34, 0.14, 0.28]} />
        </mesh>
        {/* Cuisses vers l'avant */}
        {[-0.09, 0.09].map((lx) => (
          <mesh key={`kyta-thigh-${lx}`} material={mats.pants} position={[lx, 1.15, -0.06]}>
            <boxGeometry args={[0.13, 0.12, 0.32]} />
          </mesh>
        ))}
        {/* Mollets verticaux */}
        {[-0.09, 0.09].map((lx) => (
          <mesh key={`kyta-calf-${lx}`} material={mats.pants} position={[lx, 0.88, -0.21]}>
            <boxGeometry args={[0.12, 0.42, 0.12]} />
          </mesh>
        ))}
        {/* Baskets streetwear avec semelle blanche */}
        {[-0.09, 0.09].map((lx) => (
          <group key={`kyta-shoe-${lx}`} position={[lx, 0.65, -0.24]}>
            <mesh material={mats.shoes}>
              <boxGeometry args={[0.13, 0.07, 0.2]} />
            </mesh>
            <mesh material={mats.whiteSole} position={[0, -0.035, 0]}>
              <boxGeometry args={[0.134, 0.016, 0.204]} />
            </mesh>
          </group>
        ))}

        {/* --- TORSE STREETWEAR (HOODIE BORDEAUX KYTA) --- */}
        <group ref={kytaTorso} position={[0, 1.42, 0.14]}>
          <mesh material={mats.kytaHoodie} rotation={[-0.06, 0, 0]}>
            <boxGeometry args={[0.34, 0.4, 0.22]} />
          </mesh>
          {/* Poche kangourou */}
          <mesh material={mats.kytaHoodie} position={[0, -0.08, -0.12]}>
            <boxGeometry args={[0.24, 0.13, 0.03]} />
          </mesh>
          {/* Cordons blancs */}
          {[-0.04, 0.04].map((cx) => (
            <mesh key={`kyta-cord-${cx}`} material={mats.whiteSole} position={[cx, 0.05, -0.12]}>
              <cylinderGeometry args={[0.006, 0.006, 0.12, 6]} />
            </mesh>
          ))}
          {/* Symbole Mont Corvo sur la poitrine */}
          <mesh material={mats.gold} position={[-0.08, 0.09, -0.116]}>
            <boxGeometry args={[0.045, 0.035, 0.008]} />
          </mesh>

          {/* BRAS GAUCHE : TIENT LE ROULEAU DE CARTE DE LA GRAND LINE / LAUGH TALE */}
          <group position={[-0.19, 0.14, 0]}>
            <mesh
              material={mats.kytaHoodie}
              position={[-0.02, -0.1, -0.04]}
              rotation={[0.4, 0.1, 0.15]}
            >
              <cylinderGeometry args={[0.05, 0.045, 0.24, 8]} />
            </mesh>
            <mesh
              material={mats.kytaHoodie}
              position={[0.04, -0.19, -0.14]}
              rotation={[-0.6, 0.3, -0.2]}
            >
              <cylinderGeometry args={[0.045, 0.04, 0.24, 8]} />
            </mesh>
            {/* Main gauche */}
            <mesh material={mats.skin} position={[0.06, -0.19, -0.25]}>
              <boxGeometry args={[0.065, 0.06, 0.065]} />
            </mesh>
            {/* Rouleau de parchemin / Carte du Siècle Oublié */}
            <group position={[0.06, -0.17, -0.25]} rotation={[0.3, 0.4, 0.9]}>
              <mesh material={mats.parchment}>
                <cylinderGeometry args={[0.035, 0.035, 0.32, 12]} />
              </mesh>
              {/* Ruban rouge au centre de la carte */}
              <mesh material={mats.kytaHoodie} position={[0, 0, 0]}>
                <cylinderGeometry args={[0.037, 0.037, 0.04, 12]} />
              </mesh>
            </group>
          </group>

          {/* BRAS DROIT : POINTE L'HORIZON + ÉQUIPÉ DU TRIPLE LOG POSE DU NOUVEAU MONDE */}
          <group ref={kytaRightArm} position={[0.19, 0.14, 0]}>
            {/* Épaule & bras montant vers l'avant */}
            <mesh
              material={mats.kytaHoodie}
              position={[0.05, -0.04, -0.12]}
              rotation={[1.1, -0.2, 0.25]}
            >
              <cylinderGeometry args={[0.05, 0.045, 0.26, 8]} />
            </mesh>
            {/* Avant-bras pointé vers le pare-brise */}
            <mesh
              material={mats.kytaHoodie}
              position={[0.06, 0.06, -0.26]}
              rotation={[1.45, -0.1, 0.2]}
            >
              <cylinderGeometry args={[0.045, 0.04, 0.24, 8]} />
            </mesh>

            {/* --- TRIPLE LOG POSE DU NOUVEAU MONDE AU POIGNET DROIT --- */}
            <group position={[0.07, 0.14, -0.36]} rotation={[0.3, -0.2, 0.1]}>
              {/* Bracelet de cuir brun autour du poignet */}
              <mesh material={mats.leather}>
                <cylinderGeometry args={[0.048, 0.048, 0.06, 12]} />
              </mesh>
              {/* Platine dorée à 3 dômes */}
              <mesh material={mats.gold} position={[0, 0.032, 0]}>
                <boxGeometry args={[0.11, 0.015, 0.045]} />
              </mesh>
              {/* Les 3 globes de verre du Log Pose */}
              {[-0.035, 0, 0.035].map((cx, ci) => (
                <group key={`compass-${ci}`} position={[cx, 0.05, 0]}>
                  {/* Dôme de verre transparent */}
                  <mesh material={mats.glassDome}>
                    <sphereGeometry args={[0.018, 12, 12]} />
                  </mesh>
                  {/* Aiguille magnétique pivotante */}
                  <mesh
                    ref={(el: THREE.Mesh | null) => {
                      kytaCompassNeedles.current[ci] = el;
                    }}
                    material={mats.needleRed}
                    position={[0, 0, 0]}
                  >
                    <boxGeometry args={[0.004, 0.003, 0.024]} />
                  </mesh>
                </group>
              ))}
            </group>

            {/* Main droite avec index pointé fièrement vers l'avant ("Laugh Tale est là !") */}
            <group position={[0.08, 0.18, -0.42]} rotation={[0.2, -0.1, 0.1]}>
              <mesh material={mats.skin}>
                <boxGeometry args={[0.06, 0.055, 0.06]} />
              </mesh>
              {/* Index tendu vers la route */}
              <mesh material={mats.skin} position={[0.01, 0.015, -0.045]} rotation={[-0.2, 0, 0]}>
                <cylinderGeometry args={[0.01, 0.009, 0.06, 6]} />
              </mesh>
            </group>
          </group>
        </group>

        {/* Cou */}
        <mesh material={mats.skin} position={[0, 1.66, 0.14]}>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 8]} />
        </mesh>

        {/* --- TÊTE, VISAGE & CASQUETTE À L'ENVERS DE KYTA --- */}
        <group ref={kytaHead} position={[0, 1.82, 0.14]}>
          {/* Tête */}
          <mesh material={mats.skin}>
            <boxGeometry args={[0.22, 0.24, 0.2]} />
          </mesh>

          {/* Yeux pétillants */}
          {[-0.055, 0.055].map((ex) => (
            <group key={`kyta-eye-${ex}`} position={[ex, 0.02, -0.112]}>
              <mesh material={mats.eyes}>
                <boxGeometry args={[0.038, 0.038, 0.01]} />
              </mesh>
              <mesh material={mats.eyeHighlight} position={[0.008, 0.008, 0.006]}>
                <boxGeometry args={[0.012, 0.012, 0.005]} />
              </mesh>
            </group>
          ))}

          {/* Sourcils expressifs enthousiastes */}
          {[-0.055, 0.055].map((bx, bi) => (
            <mesh
              key={`kyta-brow-${bi}`}
              material={mats.mustache}
              position={[bx, 0.058, -0.114]}
              rotation={[0, 0, bi === 0 ? 0.05 : -0.05]}
            >
              <boxGeometry args={[0.045, 0.015, 0.008]} />
            </mesh>
          ))}

          {/* Grand sourire communicatif avec dents */}
          <mesh material={mats.smile} position={[0, -0.05, -0.112]}>
            <boxGeometry args={[0.1, 0.03, 0.01]} />
          </mesh>

          {/* --- BARBE & MOUSTACHE SOIGNÉE (JUMEAU DE KAMAL) --- */}
          <mesh material={mats.mustache} position={[0, -0.026, -0.114]}>
            <boxGeometry args={[0.11, 0.024, 0.014]} />
          </mesh>
          <mesh material={mats.mustache} position={[0, -0.08, -0.106]}>
            <boxGeometry args={[0.1, 0.07, 0.026]} />
          </mesh>
          <mesh material={mats.mustache} position={[0, -0.07, 0.01]}>
            <boxGeometry args={[0.228, 0.1, 0.19]} />
          </mesh>
          {[-0.114, 0.114].map((sx) => (
            <mesh key={`kyta-sideburn-${sx}`} material={mats.mustache} position={[sx, 0.01, -0.02]}>
              <boxGeometry args={[0.016, 0.12, 0.07]} />
            </mesh>
          ))}

          {/* Mèches de cheveux noirs dépassant sur le front */}
          <mesh material={mats.darkHair} position={[0, 0.085, -0.108]}>
            <boxGeometry args={[0.18, 0.03, 0.02]} />
          </mesh>

          {/* --- CASQUETTE SNAPBACK PORTÉE À L'ENVERS (SIGNATURE KYTA) --- */}
          {/* Calotte de la casquette */}
          <mesh material={mats.capBlack} position={[0, 0.09, 0.01]}>
            <boxGeometry args={[0.235, 0.13, 0.22]} />
          </mesh>
          {/* Bouton sommital */}
          <mesh material={mats.capBlack} position={[0, 0.16, 0.01]}>
            <cylinderGeometry args={[0.02, 0.02, 0.014, 8]} />
          </mesh>
          {/* Visière tournée vers l'ARRIÈRE de la tête */}
          <group position={[0, 0.055, 0.16]} rotation={[-0.18, 0, 0]}>
            <mesh material={mats.capBlack}>
              <boxGeometry args={[0.22, 0.016, 0.14]} />
            </mesh>
            <mesh material={mats.gold} position={[0, 0.008, -0.04]}>
              <boxGeometry args={[0.18, 0.005, 0.02]} />
            </mesh>
          </group>
          {/* Languette snapback à encoches réglables visible sur le front */}
          <mesh material={mats.capBlack} position={[0, 0.08, -0.114]}>
            <boxGeometry args={[0.11, 0.018, 0.01]} />
          </mesh>
          <mesh material={mats.whiteSole} position={[0, 0.08, -0.12]}>
            <boxGeometry args={[0.04, 0.008, 0.005]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export default memo(BusDrivers);
