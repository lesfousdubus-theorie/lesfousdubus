"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

interface BakedBatch {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  castShadow: boolean;
  receiveShadow: boolean;
  renderOrder: number;
}

/**
 * Fusionne en une passe au montage un sous-arbre de meshes statiques par matériau
 * et propriétés d'ombre, sans rien retirer visuellement (réduit drastiquement les draw calls CPU).
 */
export default function StaticMeshBatch({
  name,
  cacheKey,
  children,
}: {
  name?: string;
  cacheKey: string;
  children: ReactNode;
}) {
  const sourceRef = useRef<THREE.Group>(null);
  const [baked, setBaked] = useState<{ key: string; batches: BakedBatch[] } | null>(null);
  const activeBatches = baked && baked.key === cacheKey ? baked.batches : null;

  useLayoutEffect(() => {
    const root = sourceRef.current;
    if (!root) return;
    root.updateWorldMatrix(true, true);
    const inverse = root.matrixWorld.clone().invert();
    const relative = new THREE.Matrix4();
    const groups = new Map<
      string,
      {
        material: THREE.Material;
        castShadow: boolean;
        receiveShadow: boolean;
        renderOrder: number;
        needsUv: boolean;
        shapes: THREE.BufferGeometry[];
      }
    >();

    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || obj instanceof THREE.InstancedMesh || !obj.visible) return;
      if (Array.isArray(obj.material) || !obj.geometry) return;
      const mat = obj.material as THREE.MeshStandardMaterial;
      const needsUv = Boolean(mat.map || mat.emissiveMap || mat.alphaMap || mat.roughnessMap || mat.normalMap);
      const groupKey = `${mat.uuid}:${obj.castShadow ? 1 : 0}:${obj.receiveShadow ? 1 : 0}:${obj.renderOrder}`;
      let entry = groups.get(groupKey);
      if (!entry) {
        entry = {
          material: mat,
          castShadow: obj.castShadow,
          receiveShadow: obj.receiveShadow,
          renderOrder: obj.renderOrder,
          needsUv,
          shapes: [],
        };
        groups.set(groupKey, entry);
      }
      const geo = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
      for (const attr of Object.keys(geo.attributes)) {
        if (attr !== "position" && attr !== "normal" && !(needsUv && attr === "uv")) {
          geo.deleteAttribute(attr);
        }
      }
      if (!geo.hasAttribute("normal")) geo.computeVertexNormals();
      if (needsUv && !geo.hasAttribute("uv")) {
        const count = geo.getAttribute("position").count;
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
      }
      relative.multiplyMatrices(inverse, obj.matrixWorld);
      geo.applyMatrix4(relative);
      entry.shapes.push(geo);
    });

    const nextBatches: BakedBatch[] = [];
    for (const entry of groups.values()) {
      const merged = entry.shapes.length === 1 ? entry.shapes[0] : mergeGeometries(entry.shapes, false);
      if (entry.shapes.length > 1) entry.shapes.forEach((s) => s.dispose());
      if (!merged) continue;
      merged.computeBoundingBox();
      merged.computeBoundingSphere();
      nextBatches.push({
        geometry: merged,
        material: entry.material,
        castShadow: entry.castShadow,
        receiveShadow: entry.receiveShadow,
        renderOrder: entry.renderOrder,
      });
    }

    if (nextBatches.length === 0) return;
    let committed = false;
    const raf = requestAnimationFrame(() => {
      committed = true;
      setBaked((prev) => {
        prev?.batches.forEach((b) => b.geometry.dispose());
        return { key: cacheKey, batches: nextBatches };
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      if (!committed) nextBatches.forEach((b) => b.geometry.dispose());
    };
  }, [cacheKey]);

  useEffect(() => {
    const batches = baked?.batches;
    return () => {
      batches?.forEach((b) => b.geometry.dispose());
    };
  }, [baked]);

  if (activeBatches) {
    return (
      <group name={name}>
        {activeBatches.map((batch, index) => (
          <mesh
            key={`${batch.material.uuid}-${index}`}
            geometry={batch.geometry}
            material={batch.material}
            castShadow={batch.castShadow}
            receiveShadow={batch.receiveShadow}
            renderOrder={batch.renderOrder}
            dispose={null}
          />
        ))}
      </group>
    );
  }

  return (
    <group ref={sourceRef} name={name}>
      {children}
    </group>
  );
}
