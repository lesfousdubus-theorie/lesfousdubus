"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { createOnePieceScenery, createOnePieceForeground, setElbafWaterTime, SET_PIECE_OFFSET_X, type SceneryBatch } from "@/lib/one-piece-scenery";

const NAMES = [
  "alubarna-palace",
  "water-seven-fountain",
  "shandora-golden-bell",
  "wano-flower-castle",
  "drum-rockies-castle",
  "egghead-punk-records",
  "elbaf-adam-tree",
  "enies-lobby-justice-gate",
];

/** A destination is baked into a handful of shared-material meshes. */
export default function WorldSetPiece({ zone, lowPower = false, reducedMotion = false }:
  { zone: number; lowPower?: boolean; reducedMotion?: boolean }) {
  const batches = useMemo(() => createOnePieceScenery(zone, lowPower), [zone, lowPower]);
  useEffect(() => () => batches.forEach(({ geometry }) => geometry.dispose()), [batches]);
  useFrame(({ clock }) => {
    if (zone === 6) setElbafWaterTime(reducedMotion ? 0 : clock.elapsedTime);
  });

  return <group name={`world-landmark-${NAMES[zone]}`} position={[SET_PIECE_OFFSET_X, 0, 0]}>
    {batches.map(({ geometry, material }) => (
      <mesh key={material.uuid} geometry={geometry} material={material} castShadow={!material.transparent} receiveShadow dispose={null} />
    ))}
  </group>;
}

export function WorldForeground({ zone, side, lowPower = false }: { zone: number; side: number; lowPower?: boolean }) {
  const batches = useMemo(() => createOnePieceForeground(zone, side, lowPower), [zone, side, lowPower]);
  const sections = useMemo(() => {
    const groups = new Map<number | null, SceneryBatch[]>();
    for (const batch of batches) {
      const group = groups.get(batch.section) ?? [];
      group.push(batch);
      groups.set(batch.section, group);
    }
    return [...groups];
  }, [batches]);
  useEffect(() => () => batches.forEach(({ geometry }) => geometry.dispose()), [batches]);
  return <group name={`world-foreground-${zone}-${side}`}>
    {sections.map(([section, meshes]) => (
      <group key={section ?? "span"} name={`world-foreground-part-${section}`}>
        {meshes.map(({ geometry, material }) => (
          <mesh key={material.uuid} geometry={geometry} material={material} receiveShadow dispose={null} />
        ))}
      </group>
    ))}
  </group>;
}
