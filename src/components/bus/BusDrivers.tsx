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

// Couleurs fidèles à la photo réelle de Kamal et Kyta
const SKIN_COLOR = "#f2ccae"; // Teint clair naturel
const HAIR_BROWN = "#543722"; // Châtain chaud texturé
const HAIR_DARK_BROWN = "#422a1a"; // Châtain foncé naturel
const GREY_HOODIE = "#9298a3"; // Hoodie chiné gris clair (BRONX)
const BURGUNDY_SWEATER = "#5a1626"; // Pull bordeaux col V
const LANYARD_WHITE = "#f8fafc"; // Tour de cou / badge blanc
const EYE_BLUE = "#3d6494"; // Yeux bleu-gris expressifs
const PUPIL_DARK = "#0d131f"; // Pupille sombre
const PANTS_COLOR = "#22252e"; // Pantalon streetwear sombre
const SHOES_COLOR = "#141519"; // Baskets
const WHITE_SOLE_COLOR = "#f1f5f9"; // Semelle blanche
const GOLD_COLOR = "#f59e0b"; // Détails dorés et Log Pose

/** Génère une étiquette contenant UNIQUEMENT le prénom, sobre et élégante */
function makeDriverNameTexture(name: string) {
  const font = "900 64px ui-sans-serif, system-ui, -apple-system, sans-serif";
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d")!;
  measureContext.font = font;
  const measuredWidth = Math.ceil(measureContext.measureText(name).width + 56);
  const width = Math.min(1024, Math.max(256, THREE.MathUtils.ceilPowerOfTwo(measuredWidth)));
  const height = 128;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, width, height);

  // Pilule de fond sombre semi-transparente
  const rx = 12;
  const ry = 16;
  const rw = width - 24;
  const rh = height - 32;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;

  ctx.fillStyle = "rgba(7, 12, 24, 0.88)";
  ctx.beginPath();
  ctx.roundRect(rx, ry, rw, rh, 28);
  ctx.fill();

  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "rgba(255, 210, 63, 0.85)"; // Liseré doré subtil
  ctx.stroke();
  ctx.restore();

  // Nom pur (uniquement le prénom)
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(2, 6, 23, 0.96)";
  ctx.lineWidth = 10;
  ctx.strokeText(name, width / 2, height / 2 + 1, width - 28);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(name, width / 2, height / 2 + 1, width - 28);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;

  return { texture, aspect: width / height };
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

  // Étiquettes contenant UNIQUEMENT le prénom de chacun
  const kamalNameTex = useMemo(() => makeDriverNameTexture("Kamal"), []);
  const kytaNameTex = useMemo(() => makeDriverNameTexture("Kyta"), []);

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
      kamalNameTex.texture.dispose();
      kytaNameTex.texture.dispose();
      kamalQuoteTex.texture.dispose();
      kytaQuoteTex.texture.dispose();
      if (kamalQuoteTimer.current) clearTimeout(kamalQuoteTimer.current);
      if (kytaQuoteTimer.current) clearTimeout(kytaQuoteTimer.current);
      document.body.style.cursor = "auto";
    };
  }, [kamalNameTex, kytaNameTex, kamalQuoteTex, kytaQuoteTex]);

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
          badge: "👑 KAMAL",
          text: "« Accrochez-vous ! On fonce tout droit vers le Siècle Oublié ! »",
          sub: "Le Mont Corvo",
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
          badge: "🧭 KYTA",
          text: "« Le Log Pose s'affole ! La théorie du Mont Corvo se vérifie sous nos yeux ! »",
          sub: "Le Mont Corvo",
        },
      }),
    );
  }, []);

  const mats = useMemo(() => {
    return {
      skin: new THREE.MeshStandardMaterial({ color: SKIN_COLOR, roughness: 0.58 }),
      hairKamal: new THREE.MeshStandardMaterial({ color: HAIR_BROWN, roughness: 0.72 }),
      hairKyta: new THREE.MeshStandardMaterial({ color: HAIR_DARK_BROWN, roughness: 0.72 }),
      hairHighlight: new THREE.MeshStandardMaterial({ color: "#6e472e", roughness: 0.68 }),
      eyebrow: new THREE.MeshBasicMaterial({ color: "#482e1c" }),
      greyHoodie: new THREE.MeshStandardMaterial({ color: GREY_HOODIE, roughness: 0.65 }),
      burgundySweater: new THREE.MeshStandardMaterial({ color: BURGUNDY_SWEATER, roughness: 0.62 }),
      lanyard: new THREE.MeshStandardMaterial({ color: LANYARD_WHITE, roughness: 0.5 }),
      pants: new THREE.MeshStandardMaterial({ color: PANTS_COLOR, roughness: 0.7 }),
      shoes: new THREE.MeshStandardMaterial({ color: SHOES_COLOR, roughness: 0.85 }),
      whiteSole: new THREE.MeshStandardMaterial({ color: WHITE_SOLE_COLOR, roughness: 0.45 }),
      gold: new THREE.MeshStandardMaterial({ color: GOLD_COLOR, metalness: 0.8, roughness: 0.25 }),
      leather: new THREE.MeshStandardMaterial({ color: "#3e2417", roughness: 0.7 }),
      parchment: new THREE.MeshStandardMaterial({ color: "#fef3c7", roughness: 0.75 }),
      eyesIris: new THREE.MeshBasicMaterial({
        color: EYE_BLUE,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
      eyesPupil: new THREE.MeshBasicMaterial({
        color: PUPIL_DARK,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      }),
      eyeHighlight: new THREE.MeshBasicMaterial({
        color: "#ffffff",
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      }),
      smile: new THREE.MeshBasicMaterial({
        color: "#3b1e22",
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
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

    // Réaction au klaxon : bond d'enthousiasme
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
      kamalHead.current.position.y = 1.84 + hornBounce * 0.6;
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
      const lookTowardsKamal = Math.sin(t * 0.8) * 0.14 - 0.1;
      kytaHead.current.position.y = 1.84 + hornBounce * 0.6;
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
      {/* Lumière dédiée douce au poste de conduite pour une excellente visibilité jour & nuit */}
      <pointLight position={[0, 2.75, -4.0]} color="#fff7e6" intensity={2.6} distance={4.2} decay={1.5} />

      {/* ============================================================== */}
      {/* 1. KAMAL (CONDUCTEUR AU VOLANT) - POSITION [-0.72, -0.10, -3.85] */}
      {/* ============================================================== */}
      <group
        position={[-0.72, -0.10, -3.85]}
        onClick={handleKamalClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        {/* Bulle avec UNIQUEMENT le prénom "Kamal" */}
        <sprite position={[0, 2.22, 0.14]} scale={[kamalNameTex.aspect * 0.11, 0.11, 1]}>
          <spriteMaterial
            map={kamalNameTex.texture}
            transparent
            alphaTest={0.06}
            depthTest
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>

        {/* Bulle de réplique active au clic */}
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
        <mesh material={mats.pants} position={[0, 1.15, 0.12]}>
          <boxGeometry args={[0.34, 0.14, 0.28]} />
        </mesh>
        {[-0.09, 0.09].map((lx) => (
          <mesh key={`kamal-thigh-${lx}`} material={mats.pants} position={[lx, 1.15, -0.06]}>
            <boxGeometry args={[0.13, 0.12, 0.32]} />
          </mesh>
        ))}
        {[-0.09, 0.09].map((lx) => (
          <mesh key={`kamal-calf-${lx}`} material={mats.pants} position={[lx, 0.88, -0.21]}>
            <boxGeometry args={[0.12, 0.42, 0.12]} />
          </mesh>
        ))}
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

        {/* --- TORSE : HOODIE GRIS CLAIR (PHOTO : SWEAT À CAPUCHE GRIS) --- */}
        <group ref={kamalTorso} position={[0, 1.42, 0.14]}>
          <mesh material={mats.greyHoodie} rotation={[-0.06, 0, 0]}>
            <boxGeometry args={[0.34, 0.4, 0.22]} />
          </mesh>
          {/* Poche ventrale du hoodie */}
          <mesh material={mats.greyHoodie} position={[0, -0.08, -0.12]}>
            <boxGeometry args={[0.24, 0.13, 0.03]} />
          </mesh>
          {/* Cordons blancs de capuche */}
          {[-0.04, 0.04].map((cx) => (
            <mesh key={`kamal-cord-${cx}`} material={mats.whiteSole} position={[cx, 0.05, -0.12]}>
              <cylinderGeometry args={[0.006, 0.006, 0.12, 6]} />
            </mesh>
          ))}
          {/* Motif / lettrage noir "BRONX" style sportswear sur la poitrine */}
          <mesh material={mats.shoes} position={[0, 0.07, -0.116]}>
            <boxGeometry args={[0.16, 0.038, 0.006]} />
          </mesh>
          {/* Tour de cou / lanière blanche événementielle (visible sur la photo) */}
          <mesh material={mats.lanyard} position={[0, 0.02, -0.118]}>
            <boxGeometry args={[0.08, 0.22, 0.004]} />
          </mesh>

          {/* BRAS GAUCHE : ÉPAULE -> AVANT-BRAS -> MAIN GAUCHE SUR LE VOLANT (10h) */}
          <group ref={kamalLeftArm} position={[-0.19, 0.14, 0]}>
            <mesh
              material={mats.greyHoodie}
              position={[0, -0.08, -0.1]}
              rotation={[0.75, 0.1, -0.2]}
            >
              <cylinderGeometry args={[0.05, 0.045, 0.26, 8]} />
            </mesh>
            <mesh
              material={mats.greyHoodie}
              position={[0.03, -0.04, -0.24]}
              rotation={[1.15, 0.25, -0.3]}
            >
              <cylinderGeometry args={[0.045, 0.04, 0.26, 8]} />
            </mesh>
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
            <mesh
              material={mats.greyHoodie}
              position={[0, -0.08, -0.1]}
              rotation={[0.75, -0.1, 0.2]}
            >
              <cylinderGeometry args={[0.05, 0.045, 0.26, 8]} />
            </mesh>
            <mesh
              material={mats.greyHoodie}
              position={[-0.03, -0.04, -0.24]}
              rotation={[1.15, -0.25, 0.3]}
            >
              <cylinderGeometry args={[0.045, 0.04, 0.26, 8]} />
            </mesh>
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
          <cylinderGeometry args={[0.055, 0.055, 0.08, 8]} />
        </mesh>

        {/* --- TÊTE RÉALISTE KAMAL (SANS BARBE, SANS CASQUETTE, CHEVEUX CHÂTAINS COIFFÉS) --- */}
        <group ref={kamalHead} position={[0, 1.84, 0.14]}>
          {/* Tête nette sans barbe */}
          <mesh material={mats.skin}>
            <boxGeometry args={[0.21, 0.24, 0.19]} />
          </mesh>

          {/* Nez fin */}
          <mesh material={mats.skin} position={[0, 0.0, -0.11]}>
            <boxGeometry args={[0.024, 0.05, 0.024]} />
          </mesh>

          {/* Yeux bleu-gris expressifs de la photo */}
          {[-0.052, 0.052].map((ex) => (
            <group key={`kamal-eye-${ex}`} position={[ex, 0.022, -0.106]}>
              {/* Fond de l'œil / iris bleu */}
              <mesh material={mats.eyesIris}>
                <boxGeometry args={[0.038, 0.038, 0.01]} />
              </mesh>
              {/* Pupille */}
              <mesh material={mats.eyesPupil} position={[0, 0, 0.003]}>
                <boxGeometry args={[0.022, 0.022, 0.005]} />
              </mesh>
              {/* Éclat blanc vivant */}
              <mesh material={mats.eyeHighlight} position={[0.008, 0.008, 0.006]}>
                <boxGeometry args={[0.01, 0.01, 0.005]} />
              </mesh>
            </group>
          ))}

          {/* Sourcils châtains soignés */}
          {[-0.052, 0.052].map((bx, bi) => (
            <mesh
              key={`kamal-brow-${bi}`}
              material={mats.eyebrow}
              position={[bx, 0.054, -0.108]}
              rotation={[0, 0, bi === 0 ? 0.06 : -0.06]}
            >
              <boxGeometry args={[0.044, 0.012, 0.008]} />
            </mesh>
          ))}

          {/* Sourire concentré et naturel */}
          <mesh material={mats.smile} position={[0, -0.052, -0.106]}>
            <boxGeometry args={[0.075, 0.015, 0.008]} />
          </mesh>

          {/* --- CHEVEUX CHÂTAINS COIFFÉS AVEC VOLUME ET MÈCHE LATÉRALE (PHOTO) --- */}
          <group position={[0, 0.08, 0.01]}>
            {/* Masse principale supérieure avec volume */}
            <mesh material={mats.hairKamal} position={[0, 0.04, 0.01]}>
              <boxGeometry args={[0.23, 0.13, 0.21]} />
            </mesh>
            {/* Mèche relevée et coiffée vers le côté (comme sur la photo de droite) */}
            <mesh
              material={mats.hairKamal}
              position={[0.02, 0.1, -0.05]}
              rotation={[-0.25, 0.15, -0.12]}
            >
              <boxGeometry args={[0.18, 0.065, 0.09]} />
            </mesh>
            <mesh
              material={mats.hairHighlight}
              position={[-0.03, 0.11, -0.04]}
              rotation={[-0.2, 0.1, -0.08]}
            >
              <boxGeometry args={[0.12, 0.04, 0.07]} />
            </mesh>
            {/* Frange texturée sur le haut du front */}
            <mesh
              material={mats.hairKamal}
              position={[0.01, 0.055, -0.102]}
              rotation={[0.12, 0, -0.05]}
            >
              <boxGeometry args={[0.17, 0.045, 0.025]} />
            </mesh>
            {/* Côtés dégradés au-dessus des oreilles */}
            {[-0.112, 0.112].map((hx) => (
              <mesh key={`kamal-hairside-${hx}`} material={mats.hairKamal} position={[hx, -0.01, 0.01]}>
                <boxGeometry args={[0.018, 0.12, 0.18]} />
              </mesh>
            ))}
            {/* Nuque soignée à l'arrière */}
            <mesh material={mats.hairKamal} position={[0, -0.03, 0.105]}>
              <boxGeometry args={[0.21, 0.12, 0.025]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ============================================================== */}
      {/* 2. KYTA (CO-PILOTE & NAVIGATEUR) - POSITION [0.72, -0.10, -3.85] */}
      {/* ============================================================== */}
      <group
        position={[0.72, -0.10, -3.85]}
        onClick={handleKytaClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        {/* Bulle avec UNIQUEMENT le prénom "Kyta" */}
        <sprite position={[0, 2.22, 0.14]} scale={[kytaNameTex.aspect * 0.11, 0.11, 1]}>
          <spriteMaterial
            map={kytaNameTex.texture}
            transparent
            alphaTest={0.06}
            depthTest
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>

        {/* Bulle de réplique active au clic */}
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
        <mesh material={mats.pants} position={[0, 1.15, 0.12]}>
          <boxGeometry args={[0.34, 0.14, 0.28]} />
        </mesh>
        {[-0.09, 0.09].map((lx) => (
          <mesh key={`kyta-thigh-${lx}`} material={mats.pants} position={[lx, 1.15, -0.06]}>
            <boxGeometry args={[0.13, 0.12, 0.32]} />
          </mesh>
        ))}
        {[-0.09, 0.09].map((lx) => (
          <mesh key={`kyta-calf-${lx}`} material={mats.pants} position={[lx, 0.88, -0.21]}>
            <boxGeometry args={[0.12, 0.42, 0.12]} />
          </mesh>
        ))}
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

        {/* --- TORSE : PULL BORDEAUX COL V (PHOTO : PULL BORDEAUX + TOUR DE COU BLANC) --- */}
        <group ref={kytaTorso} position={[0, 1.42, 0.14]}>
          <mesh material={mats.burgundySweater} rotation={[-0.06, 0, 0]}>
            <boxGeometry args={[0.34, 0.4, 0.22]} />
          </mesh>
          {/* Échancrure col V avec t-shirt gris clair en-dessous */}
          <mesh material={mats.greyHoodie} position={[0, 0.14, -0.114]}>
            <boxGeometry args={[0.1, 0.08, 0.008]} />
          </mesh>
          {/* Tour de cou / badge blanc événementiel (visible sur la photo) */}
          <mesh material={mats.lanyard} position={[0, 0.02, -0.118]}>
            <boxGeometry args={[0.08, 0.22, 0.004]} />
          </mesh>

          {/* BRAS GAUCHE : TIENT LA CARTE DU SIÈCLE OUBLIÉ */}
          <group position={[-0.19, 0.14, 0]}>
            <mesh
              material={mats.burgundySweater}
              position={[-0.02, -0.1, -0.04]}
              rotation={[0.4, 0.1, 0.15]}
            >
              <cylinderGeometry args={[0.05, 0.045, 0.24, 8]} />
            </mesh>
            <mesh
              material={mats.burgundySweater}
              position={[0.04, -0.19, -0.14]}
              rotation={[-0.6, 0.3, -0.2]}
            >
              <cylinderGeometry args={[0.045, 0.04, 0.24, 8]} />
            </mesh>
            <mesh material={mats.skin} position={[0.06, -0.19, -0.25]}>
              <boxGeometry args={[0.065, 0.06, 0.065]} />
            </mesh>
            {/* Rouleau de carte marine du Siècle Oublié */}
            <group position={[0.06, -0.17, -0.25]} rotation={[0.3, 0.4, 0.9]}>
              <mesh material={mats.parchment}>
                <cylinderGeometry args={[0.035, 0.035, 0.32, 12]} />
              </mesh>
              <mesh material={mats.burgundySweater} position={[0, 0, 0]}>
                <cylinderGeometry args={[0.037, 0.037, 0.04, 12]} />
              </mesh>
            </group>
          </group>

          {/* BRAS DROIT : POINTE L'HORIZON + TRIPLE LOG POSE DU NOUVEAU MONDE */}
          <group ref={kytaRightArm} position={[0.19, 0.14, 0]}>
            <mesh
              material={mats.burgundySweater}
              position={[0.05, -0.04, -0.12]}
              rotation={[1.1, -0.2, 0.25]}
            >
              <cylinderGeometry args={[0.05, 0.045, 0.26, 8]} />
            </mesh>
            <mesh
              material={mats.burgundySweater}
              position={[0.06, 0.06, -0.26]}
              rotation={[1.45, -0.1, 0.2]}
            >
              <cylinderGeometry args={[0.045, 0.04, 0.24, 8]} />
            </mesh>

            {/* TRIPLE LOG POSE DU NOUVEAU MONDE AU POIGNET DROIT */}
            <group position={[0.07, 0.14, -0.36]} rotation={[0.3, -0.2, 0.1]}>
              <mesh material={mats.leather}>
                <cylinderGeometry args={[0.048, 0.048, 0.06, 12]} />
              </mesh>
              <mesh material={mats.gold} position={[0, 0.032, 0]}>
                <boxGeometry args={[0.11, 0.015, 0.045]} />
              </mesh>
              {[-0.035, 0, 0.035].map((cx, ci) => (
                <group key={`compass-${ci}`} position={[cx, 0.05, 0]}>
                  <mesh material={mats.glassDome}>
                    <sphereGeometry args={[0.018, 12, 12]} />
                  </mesh>
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

            {/* Main droite avec index pointé vers l'avant ("Laugh Tale est droit devant !") */}
            <group position={[0.08, 0.18, -0.42]} rotation={[0.2, -0.1, 0.1]}>
              <mesh material={mats.skin}>
                <boxGeometry args={[0.06, 0.055, 0.06]} />
              </mesh>
              <mesh material={mats.skin} position={[0.01, 0.015, -0.045]} rotation={[-0.2, 0, 0]}>
                <cylinderGeometry args={[0.01, 0.009, 0.06, 6]} />
              </mesh>
            </group>
          </group>
        </group>

        {/* Cou */}
        <mesh material={mats.skin} position={[0, 1.66, 0.14]}>
          <cylinderGeometry args={[0.055, 0.055, 0.08, 8]} />
        </mesh>

        {/* --- TÊTE RÉALISTE KYTA (SANS BARBE, SANS CASQUETTE, CHEVEUX CHÂTAINS COIFFÉS) --- */}
        <group ref={kytaHead} position={[0, 1.84, 0.14]}>
          <mesh material={mats.skin}>
            <boxGeometry args={[0.21, 0.24, 0.19]} />
          </mesh>

          {/* Nez fin */}
          <mesh material={mats.skin} position={[0, 0.0, -0.11]}>
            <boxGeometry args={[0.024, 0.05, 0.024]} />
          </mesh>

          {/* Yeux bleu-gris pétillants */}
          {[-0.052, 0.052].map((ex) => (
            <group key={`kyta-eye-${ex}`} position={[ex, 0.022, -0.106]}>
              <mesh material={mats.eyesIris}>
                <boxGeometry args={[0.038, 0.038, 0.01]} />
              </mesh>
              <mesh material={mats.eyesPupil} position={[0, 0, 0.003]}>
                <boxGeometry args={[0.022, 0.022, 0.005]} />
              </mesh>
              <mesh material={mats.eyeHighlight} position={[0.008, 0.008, 0.006]}>
                <boxGeometry args={[0.01, 0.01, 0.005]} />
              </mesh>
            </group>
          ))}

          {/* Sourcils expressifs */}
          {[-0.052, 0.052].map((bx, bi) => (
            <mesh
              key={`kyta-brow-${bi}`}
              material={mats.eyebrow}
              position={[bx, 0.054, -0.108]}
              rotation={[0, 0, bi === 0 ? 0.04 : -0.04]}
            >
              <boxGeometry args={[0.044, 0.012, 0.008]} />
            </mesh>
          ))}

          {/* Grand sourire communicatif */}
          <mesh material={mats.smile} position={[0, -0.052, -0.106]}>
            <boxGeometry args={[0.08, 0.018, 0.008]} />
          </mesh>

          {/* --- CHEVEUX CHÂTAIN FONCÉ AVEC MÈCHE NATURELLE (PHOTO DE GAUCHE) --- */}
          <group position={[0, 0.08, 0.01]}>
            {/* Masse principale */}
            <mesh material={mats.hairKyta} position={[0, 0.04, 0.01]}>
              <boxGeometry args={[0.23, 0.13, 0.21]} />
            </mesh>
            {/* Raie et mèche douce balayée sur le front */}
            <mesh
              material={mats.hairKyta}
              position={[-0.02, 0.085, -0.05]}
              rotation={[-0.15, -0.1, 0.08]}
            >
              <boxGeometry args={[0.19, 0.055, 0.09]} />
            </mesh>
            <mesh
              material={mats.hairKyta}
              position={[-0.03, 0.05, -0.102]}
              rotation={[0.15, -0.08, 0.06]}
            >
              <boxGeometry args={[0.16, 0.04, 0.025]} />
            </mesh>
            {/* Côtés dégradés */}
            {[-0.112, 0.112].map((hx) => (
              <mesh key={`kyta-hairside-${hx}`} material={mats.hairKyta} position={[hx, -0.01, 0.01]}>
                <boxGeometry args={[0.018, 0.12, 0.18]} />
              </mesh>
            ))}
            {/* Nuque */}
            <mesh material={mats.hairKyta} position={[0, -0.03, 0.105]}>
              <boxGeometry args={[0.21, 0.12, 0.025]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

export default memo(BusDrivers);
