"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { THEORY_SIGN_MESSAGES } from "@/lib/bus-theory-signs";
import { PARTY_BEAT_SECONDS } from "@/lib/party-rhythm";
import { TV_SCREEN_WIDTH, TV_SCREEN_HEIGHT } from "./BusTvScreen";

const SECONDS_PER_CARD = 12 * PARTY_BEAT_SECONDS;

function makePartyCard(lines: readonly string[], index: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d")!;
  const accent = ["#ffd43b", "#68dfff", "#ff9fc3", "#a9f8bc"][index % 4];
  ctx.fillStyle = "#09162b";
  ctx.fillRect(0, 0, 640, 360);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, 608, 328);
  ctx.fillStyle = accent;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 23px system-ui, sans-serif";
  ctx.fillText("LA THÉORIE DES FOUS DU BUS", 320, 76);
  ctx.fillStyle = "#fff8e6";
  ctx.font = "900 52px system-ui, sans-serif";
  lines.forEach((line, row) => ctx.fillText(line, 320, 163 + row * 62, 548));
  ctx.fillStyle = accent;
  ctx.fillRect(260, 290, 120, 5);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function usePartyTvCards(active: boolean) {
  const textures = useMemo(() => active
    ? THEORY_SIGN_MESSAGES.map(({ lines }, index) => makePartyCard(lines, index))
    : null, [active]);
  useEffect(() => () => textures?.forEach(texture => texture.dispose()), [textures]);
  return textures;
}

export default function BusPartyTv({ cards, index, reducedMotion }: {
  cards: THREE.Texture[];
  index: number;
  reducedMotion: boolean;
}) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const elapsed = useRef(0);
  const initial = index % cards.length;
  useFrame((_, delta) => {
    if (!material.current || reducedMotion) return;
    // Le moteur redémarre son horloge après la fermeture d’une modale.
    elapsed.current += delta;
    const step = Math.floor(elapsed.current / SECONDS_PER_CARD);
    const next = cards[(initial + step) % cards.length];
    if (material.current.map !== next) material.current.map = next;
  });

  return <mesh name="bus-party-tv-display" position={[0, 0, .053]}>
    <planeGeometry args={[TV_SCREEN_WIDTH, TV_SCREEN_HEIGHT]} />
    <meshBasicMaterial ref={material} map={cards[initial]} toneMapped={false} />
  </mesh>;
}
