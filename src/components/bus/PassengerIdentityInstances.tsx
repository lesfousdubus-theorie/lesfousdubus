"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { bakePassengerIdentity, bakedPassengerIdentities, bakedStaticPassengerIdentities, type IdentityPart, type IdentityRole, type StaticIdentityPart } from "@/lib/baked-passenger";
import { getPassengerProportions, getPassengerSkeleton } from "@/lib/passenger-proportions";
import { CABIN_FLOOR_Y } from "@/lib/passenger-gait";
import { getPassengerSignatureGain } from "@/lib/passenger-motion";
import type { BusOccupant } from "@/lib/bus-occupancy";
import type { PassengerPoseRegistry } from "@/lib/passenger-motion";
import type { PassengerProfile } from "@/types/passenger";
import { Passenger } from "./Passengers";
import { NAKAMA_ROSTER } from "./passenger-archetypes";
import { CharacterLowPolyContext } from "./CharacterShapes";

export interface IdentityDrivers {
  bodies: THREE.Matrix4[];
  heads: THREE.Matrix4[];
  arms: THREE.Matrix4[];
  forearms: THREE.Matrix4[];
  hands: THREE.Matrix4[];
  revision: React.RefObject<number>;
  celebration: React.RefObject<boolean>;
  listeners: Set<() => void>;
}

function Prototype({ id, onReady }: { id: string; onReady: (parts: IdentityPart[], staticParts: StaticIdentityPart[]) => void }) {
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (!root.current) return;
    const parts = bakedPassengerIdentities.get(id) ?? bakePassengerIdentity(root.current, id);
    bakedPassengerIdentities.set(id, parts);
    const staticParts = bakedStaticPassengerIdentities.get(id) ?? [];
    onReady(parts, staticParts);
  }, [id, onReady]);
  return <group ref={root} visible={false} dispose={null}>
    <CharacterLowPolyContext.Provider value={true}>
      <Passenger seat={{ x: 0, z: 0, row: 0, seatInRow: 0 }} index={0}
        archetype={NAKAMA_ROSTER.find(actor => actor.id === id)!} hornPulse={0} reducedMotion />
    </CharacterLowPolyContext.Provider>
  </group>;
}

interface IdentityInstancesProps {
  passengers: BusOccupant[];
  originZ?: number;
  drivers: IdentityDrivers;
  capacity: number;
  profilesBySeatIndex?: Map<number, PassengerProfile>;
  hornPulse: number;
  poses?: PassengerPoseRegistry;
  partyOn: boolean;
  reducedMotion: boolean;
}

interface IdentityGroupProps {
  id: string;
  indices: number[];
  groupHash: number;
  originZ: number;
  passengers: BusOccupant[];
  drivers: IdentityDrivers;
  partyOn: boolean;
  reducedMotion: boolean;
}

/** Même tête, mêmes cheveux et même tenue à distance. Seule l'expression est figée. */
const IdentityGroup = memo(function IdentityGroup({ id, indices, originZ, passengers, drivers, partyOn, reducedMotion }: IdentityGroupProps) {
  const clock = useThree(state => state.clock);
  const [baked, setBaked] = useState<{ parts: IdentityPart[]; staticParts: StaticIdentityPart[] } | null>(() => {
    const p = bakedPassengerIdentities.get(id);
    return p ? { parts: p, staticParts: bakedStaticPassengerIdentities.get(id) ?? [] } : null;
  });
  const parts = baked?.parts;
  const staticParts = baked?.staticParts;
  const meshes = useRef<Array<THREE.InstancedMesh | null>>([]);
  const staticMeshes = useRef<Array<THREE.InstancedMesh | null>>([]);
  const lastRevision = useRef(-1);
  const lastStaticKey = useRef("");
  const scratch = useMemo(() => ({ matrix: new THREE.Matrix4(), adjust: new THREE.Matrix4() }), []);
  const rig = getPassengerSkeleton(id);
  const shape = useMemo(() => getPassengerProportions(id), [id]);
  const neededGroupCap = Math.max(128, Math.ceil(indices.length / 64) * 64);
  const [groupCapacity, setGroupCapacity] = useState(neededGroupCap);
  if (neededGroupCap > groupCapacity) {
    setGroupCapacity(neededGroupCap);
  }
  const update = useCallback((time: number) => {
    if (!parts) return;
    const { matrix, adjust } = scratch;
    const celebrating = Boolean(drivers.celebration.current);
    const hasStatic = Boolean(staticParts && staticParts.length > 0);
    if (hasStatic) {
      let seatHash = indices.length;
      for (let k = 0; k < indices.length; k++) {
        const occ = passengers[indices[k]];
        seatHash = ((seatHash * 31) ^ (occ ? ((occ.index * 7) ^ occ.physicalSeatIndex) : -1)) | 0;
      }
      const staticKey = `${groupCapacity}:${originZ}:${celebrating}:${seatHash}`;
      const staticChanged = lastStaticKey.current !== staticKey;
      lastStaticKey.current = staticKey;
      staticParts!.forEach((_, sIdx) => {
        const sm = staticMeshes.current[sIdx];
        if (!sm) return;
        sm.visible = !celebrating && indices.length > 0;
        if (!celebrating && (staticChanged || sm.count !== indices.length) && indices.length > 0) {
          indices.forEach((index, at) => {
            const { seat } = passengers[index];
            sm.setMatrixAt(at, matrix.makeTranslation(seat.x, 0, seat.z - originZ));
          });
          sm.count = indices.length;
          sm.instanceMatrix.clearUpdateRanges();
          sm.instanceMatrix.addUpdateRange(0, indices.length * 16);
          sm.instanceMatrix.needsUpdate = true;
          sm.boundingSphere = null;
        }
      });
    }
    const useArticulated = celebrating || !hasStatic;
    const gain = celebrating ? getPassengerSignatureGain(time, id, partyOn, reducedMotion) : 0;
    const roleMatrix = (role: IdentityRole, index: number) => {
      const { seat } = passengers[index];
      if (role === "legs") return matrix.makeTranslation(seat.x, CABIN_FLOOR_Y + rig.seatedHipHeight, seat.z - originZ + rig.seatedHipZ);
      if (role === "rest") return matrix.makeTranslation(seat.x, 0, seat.z - originZ);
      if (role === "body") {
        return matrix.copy(drivers.bodies[index]).multiply(adjust.makeScale(.32 / shape.torsoWidth, .42 / shape.torsoHeight, .22 / shape.torsoDepth));
      }
      if (role === "head" || role === "neck") {
        matrix.copy(drivers.heads[index]).multiply(adjust.makeScale(.24 / shape.headWidth, .27 / shape.headHeight, .23 / shape.headDepth));
        return role === "neck" ? matrix.multiply(adjust.makeTranslation(0, -rig.headAboveNeck, 0)) : matrix;
      }
      const armIndex = index * 2 + (role.endsWith("Right") ? 1 : 0);
      if (role.startsWith("upper")) {
        return matrix.copy(drivers.arms[armIndex]).multiply(adjust.makeTranslation(0, .10, 0));
      }
      if (role.startsWith("fore")) {
        return matrix.copy(drivers.forearms[armIndex]).multiply(adjust.makeTranslation(0, .11, 0));
      }
      return matrix.copy(drivers.hands[armIndex]).multiply(adjust.makeScale(gain / rig.armWidthScale, gain / rig.armScale, gain / rig.armWidthScale));
    };
    parts.forEach((part, partIndex) => {
      const mesh = meshes.current[partIndex];
      if (!mesh) return;
      mesh.visible = useArticulated && indices.length > 0 && (
        part.role === "signatureLeft" || part.role === "signatureRight"
          ? Boolean(celebrating && gain > 0.001)
          : part.role !== "rest" || !celebrating
      );
      if (!mesh.visible) return;
      indices.forEach((index, at) => mesh.setMatrixAt(at, roleMatrix(part.role, index)));
      mesh.count = indices.length;
      mesh.instanceMatrix.clearUpdateRanges();
      if (indices.length > 0) mesh.instanceMatrix.addUpdateRange(0, indices.length * 16);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.boundingSphere = null;
    });
  }, [parts, staticParts, indices, originZ, passengers, drivers, partyOn, reducedMotion, id, rig, shape, scratch, groupCapacity]);

  useLayoutEffect(() => {
    const onSync = () => {
      if (lastRevision.current === drivers.revision.current) return;
      lastRevision.current = drivers.revision.current;
      update(clock.elapsedTime);
    };
    drivers.listeners.add(onSync);
    lastRevision.current = drivers.revision.current;
    update(clock.elapsedTime);
    return () => {
      drivers.listeners.delete(onSync);
    };
  }, [clock, drivers, update]);
  useFrame(({ clock }) => {
    if (lastRevision.current === drivers.revision.current) return;
    lastRevision.current = drivers.revision.current;
    update(clock.elapsedTime);
  }, -1);

  const instancedArgs = useMemo<[undefined, undefined, number]>(
    () => [undefined, undefined, groupCapacity],
    [groupCapacity],
  );
  const handleReady = useCallback((nextParts: IdentityPart[], nextStaticParts: StaticIdentityPart[]) => {
    setBaked({ parts: nextParts, staticParts: nextStaticParts });
  }, []);

  if (!parts) {
    return <group name={`bus-distant-fallback-${id}`} userData={{ archetypeId: id }}>
      <Prototype id={id} onReady={handleReady} />
    </group>;
  }
  return <group name={`bus-distant-identity-${id}`} position={[0, 0, originZ]} userData={{ archetypeId: id }}>
    {staticParts?.map((part, i) => <instancedMesh key={`static-${i}-${groupCapacity}`} name={`bus-distant-static-${id}-${i}`}
      ref={node => { staticMeshes.current[i] = node; }} geometry={part.geometry} material={part.material}
      args={instancedArgs} count={indices.length} frustumCulled={false} raycast={() => null} userData={{ archetypeId: id, static: true }}
    />)}
    {/* Garder les meshes articulés montés en permanence (visible piloté par update()) pour supprimer
        le montage/démontage de ~240 InstancedMesh au début et à la fin de chaque danse. */}
    {parts.map((part, i) => <instancedMesh key={`${part.role}-${i}-${groupCapacity}`} name={`bus-distant-${id}-${part.role}-${i}`}
      ref={node => { meshes.current[i] = node; }} geometry={part.geometry} material={part.material}
      args={instancedArgs} count={indices.length} frustumCulled={false} raycast={() => null} userData={{ role: part.role, archetypeId: id }}
    />)}
  </group>;
}, (prev, next) => {
  if (
    prev.id !== next.id
    || prev.groupHash !== next.groupHash
    || prev.originZ !== next.originZ
    || prev.indices.length !== next.indices.length
    || prev.drivers !== next.drivers
    || prev.partyOn !== next.partyOn
    || prev.reducedMotion !== next.reducedMotion
  ) {
    return false;
  }
  for (let k = 0; k < prev.indices.length; k++) {
    const idx = prev.indices[k];
    if (idx !== next.indices[k]) return false;
    const prevOcc = prev.passengers[idx];
    const nextOcc = next.passengers[idx];
    if (prevOcc?.index !== nextOcc?.index || prevOcc?.physicalSeatIndex !== nextOcc?.physicalSeatIndex) {
      return false;
    }
  }
  return true;
});

const EMPTY_INDICES: number[] = [];

export default function PassengerIdentityInstances({ ids, passengers, originZ = 0, drivers, partyOn, reducedMotion }:
  IdentityInstancesProps & { ids: string[] }) {
  const groupsMap = useMemo(() => {
    const result = new Map<string, { indices: number[]; hash: number }>();
    ids.forEach((id, i) => {
      let entry = result.get(id);
      if (!entry) {
        entry = { indices: [], hash: 0 };
        result.set(id, entry);
      }
      entry.indices.push(i);
      const occ = passengers[i];
      entry.hash = ((entry.hash * 31) ^ ((i * 17) ^ (occ ? ((occ.index * 7) ^ occ.physicalSeatIndex) : -1))) | 0;
    });
    return result;
  }, [ids, passengers]);
  // Conserver les archétypes déjà montés afin d'éviter toute destruction/recréation de buffers GPU
  // lorsque la caméra pivote brièvement hors du bus (indices = [] masque simplement en O(1)).
  const [mountedIds, setMountedIds] = useState<string[]>(() => [...groupsMap.keys()]);
  const missingIds = useMemo(() => {
    const seen = new Set(mountedIds);
    const missing: string[] = [];
    for (const id of groupsMap.keys()) {
      if (!seen.has(id)) missing.push(id);
    }
    return missing;
  }, [groupsMap, mountedIds]);
  if (missingIds.length > 0) {
    setMountedIds([...mountedIds, ...missingIds]);
  }
  const [unlockedUnbaked, setUnlockedUnbaked] = useState(1);
  const unlockedUnbakedRef = useRef(1);
  const nextBakeAtRef = useRef(0);
  const unbakedCount = useMemo(
    () => mountedIds.reduce((count, id) => count + (bakedPassengerIdentities.has(id) ? 0 : 1), 0),
    [mountedIds],
  );
  const unbakedCountRef = useRef(unbakedCount);
  useEffect(() => {
    unbakedCountRef.current = unbakedCount;
  }, [unbakedCount]);
  useFrame(() => {
    if (unlockedUnbakedRef.current >= unbakedCountRef.current) return;
    const now = performance.now();
    if (now < nextBakeAtRef.current) return;
    nextBakeAtRef.current = now + 24;
    unlockedUnbakedRef.current = Math.min(unbakedCountRef.current, unlockedUnbakedRef.current + 1);
    setUnlockedUnbaked(unlockedUnbakedRef.current);
  });

  const renderIds = useMemo(() => {
    let unbakedSeen = 0;
    const out: string[] = [];
    for (let i = 0; i < mountedIds.length; i++) {
      const id = mountedIds[i];
      if (!bakedPassengerIdentities.has(id)) {
        unbakedSeen += 1;
        if (unbakedSeen > unlockedUnbaked) continue;
      }
      out.push(id);
    }
    return out;
  }, [mountedIds, unlockedUnbaked]);

  return <>{renderIds.map((id) => {
    const entry = groupsMap.get(id);
    return (
      <IdentityGroup
        key={id}
        id={id}
        indices={entry?.indices ?? EMPTY_INDICES}
        groupHash={entry?.hash ?? 0}
        originZ={originZ}
        passengers={passengers}
        drivers={drivers}
        partyOn={partyOn}
        reducedMotion={reducedMotion}
      />
    );
  })}</>;
}
