"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
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
export default function WorldSetPiece({
  zone,
  lowPower = false,
  reducedMotion = false,
  onMeshesReady,
}: {
  zone: number;
  lowPower?: boolean;
  reducedMotion?: boolean;
  onMeshesReady?: (meshes: THREE.Mesh[]) => void;
}) {
  const batches = useMemo(() => createOnePieceScenery(zone, lowPower), [zone, lowPower]);
  const [progress, setProgress] = useState(() => ({ batches, count: 4 }));
  const visibleCount = progress.batches === batches ? progress.count : 4;
  const progressRef = useRef({ batches, count: 4 });
  const nextAtRef = useRef(0);
  const mountedBatches = useMemo(
    () => batches.slice(0, visibleCount),
    [batches, visibleCount],
  );
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const onMeshesReadyRef = useRef(onMeshesReady);
  useEffect(() => () => batches.forEach(({ geometry }) => geometry.dispose()), [batches]);
  useLayoutEffect(() => {
    onMeshesReadyRef.current = onMeshesReady;
  }, [onMeshesReady]);
  useLayoutEffect(() => {
    const meshes = meshRefs.current.slice(0, mountedBatches.length).filter((mesh): mesh is THREE.Mesh => Boolean(mesh));
    onMeshesReadyRef.current?.(meshes);
  }, [mountedBatches]);
  useFrame(({ clock }, dt) => {
    if (zone === 6) setElbafWaterTime(reducedMotion ? 0 : clock.elapsedTime);
    if (progressRef.current.batches !== batches) {
      progressRef.current = { batches, count: 4 };
    }
    if (progressRef.current.count >= batches.length) return;
    const now = performance.now();
    if (now < nextAtRef.current) return;
    nextAtRef.current = now + (dt > 0.05 ? 36 : 16);
    const next = {
      batches,
      count: Math.min(batches.length, progressRef.current.count + 4),
    };
    progressRef.current = next;
    setProgress(next);
  });

  return <group name={`world-landmark-${NAMES[zone]}`} position={[SET_PIECE_OFFSET_X, 0, 0]}>
    {mountedBatches.map(({ geometry, material }, index) => (
      <mesh
        key={material.uuid}
        ref={(el: THREE.Mesh | null) => {
          meshRefs.current[index] = el;
        }}
        geometry={geometry}
        material={material}
        castShadow={!material.transparent}
        receiveShadow
        dispose={null}
      />
    ))}
  </group>;
}

export function WorldForeground({
  zone,
  side,
  lowPower = false,
  onMeshesReady,
}: {
  zone: number;
  side: number;
  lowPower?: boolean;
  onMeshesReady?: () => void;
}) {
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
  const [progress, setProgress] = useState(() => ({ sections, count: 2 }));
  const visibleCount = progress.sections === sections ? progress.count : 2;
  const progressRef = useRef({ sections, count: 2 });
  const nextAtRef = useRef(0);
  const mountedSections = useMemo(
    () => sections.slice(0, visibleCount),
    [sections, visibleCount],
  );
  const onMeshesReadyRef = useRef(onMeshesReady);
  useLayoutEffect(() => {
    onMeshesReadyRef.current = onMeshesReady;
  }, [onMeshesReady]);
  useLayoutEffect(() => {
    onMeshesReadyRef.current?.();
  }, [mountedSections]);
  useFrame((_, dt) => {
    if (progressRef.current.sections !== sections) {
      progressRef.current = { sections, count: 2 };
    }
    if (progressRef.current.count >= sections.length) return;
    const now = performance.now();
    if (now < nextAtRef.current) return;
    nextAtRef.current = now + (dt > 0.05 ? 36 : 16);
    const next = {
      sections,
      count: Math.min(sections.length, progressRef.current.count + 2),
    };
    progressRef.current = next;
    setProgress(next);
  });
  useEffect(() => () => batches.forEach(({ geometry }) => geometry.dispose()), [batches]);
  return <group name={`world-foreground-${zone}-${side}`}>
    {mountedSections.map(([section, meshes]) => (
      <group key={section ?? "span"} name={`world-foreground-part-${section}`}>
        {meshes.map(({ geometry, material }) => (
          <mesh key={material.uuid} geometry={geometry} material={material} castShadow={!material.transparent} receiveShadow dispose={null} />
        ))}
      </group>
    ))}
  </group>;
}
