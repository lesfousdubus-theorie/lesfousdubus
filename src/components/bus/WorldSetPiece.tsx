"use client";

import { useEffect, useMemo } from "react";
import { createOnePieceScenery, createOnePieceForeground, SET_PIECE_OFFSET_X } from "@/lib/one-piece-scenery";

const NAMES = ["alubarna-palace", "water-seven-fountain", "shandora-golden-bell", "wano-flower-castle", "drum-rockies-castle"];

/** A destination is baked into a handful of shared-material meshes. */
export default function WorldSetPiece({ zone, lowPower = false }: { zone: number; lowPower?: boolean }) {
  const batches = useMemo(() => createOnePieceScenery(zone, lowPower), [zone, lowPower]);
  useEffect(() => () => batches.forEach(({ geometry }) => geometry.dispose()), [batches]);

  return <group name={`world-landmark-${NAMES[zone]}`} position={[SET_PIECE_OFFSET_X, 0, 0]}>
    {batches.map(({ geometry, material }) => (
      <mesh key={material.uuid} geometry={geometry} material={material} castShadow receiveShadow dispose={null} />
    ))}
  </group>;
}

export function WorldForeground({ zone, side, lowPower = false }: { zone: number; side: number; lowPower?: boolean }) {
  const batches = useMemo(() => createOnePieceForeground(zone, side, lowPower), [zone, side, lowPower]);
  useEffect(() => () => batches.forEach(({ geometry }) => geometry.dispose()), [batches]);
  return <group name={`world-foreground-${zone}-${side}`}>
    {batches.map(({ geometry, material }) => (
      <mesh key={material.uuid} geometry={geometry} material={material} receiveShadow dispose={null} />
    ))}
  </group>;
}
