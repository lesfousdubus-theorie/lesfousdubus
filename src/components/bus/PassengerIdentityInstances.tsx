"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { bakePassengerIdentity, bakedPassengerIdentities, type IdentityPart, type IdentityRole } from "@/lib/baked-passenger";
import { getPassengerProportions, getPassengerSkeleton } from "@/lib/passenger-proportions";
import { CABIN_FLOOR_Y } from "@/lib/passenger-gait";
import { getPassengerSignatureGain } from "@/lib/passenger-motion";
import type { BusOccupant } from "@/lib/bus-occupancy";
import type { PassengerPoseRegistry } from "@/lib/passenger-motion";
import type { PassengerProfile } from "@/types/passenger";
import { Passenger } from "./Passengers";
import { NAKAMA_ROSTER } from "./passenger-archetypes";

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

function Prototype({ id, onReady }: { id: string; onReady: (parts: IdentityPart[]) => void }) {
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (!root.current) return;
    const parts = bakedPassengerIdentities.get(id) ?? bakePassengerIdentity(root.current, id);
    bakedPassengerIdentities.set(id, parts);
    onReady(parts);
  }, [id, onReady]);
  return <group ref={root} visible={false} dispose={null}>
    <Passenger seat={{ x: 0, z: 0, row: 0, seatInRow: 0 }} index={0}
      archetype={NAKAMA_ROSTER.find(actor => actor.id === id)!} hornPulse={0} reducedMotion />
  </group>;
}

interface IdentityInstancesProps {
  passengers: BusOccupant[];
  drivers: IdentityDrivers;
  capacity: number;
  profilesBySeatIndex?: Map<number, PassengerProfile>;
  hornPulse: number;
  poses?: PassengerPoseRegistry;
  partyOn: boolean;
  reducedMotion: boolean;
}

/** Même tête, mêmes cheveux et même tenue à distance. Seule l'expression est figée. */
function IdentityGroup({ id, indices, passengers, drivers, capacity, partyOn, reducedMotion }:
  IdentityInstancesProps & { id: string; indices: number[] }) {
  const clock = useThree(state => state.clock);
  const [parts, setParts] = useState(() => bakedPassengerIdentities.get(id));
  const meshes = useRef<Array<THREE.InstancedMesh | null>>([]);
  const lastRevision = useRef(-1);
  const scratch = useMemo(() => ({ matrix: new THREE.Matrix4(), adjust: new THREE.Matrix4() }), []);
  const rig = getPassengerSkeleton(id);
  const shape = useMemo(() => getPassengerProportions(id), [id]);
  const update = useCallback((time: number) => {
    if (!parts) return;
    const { matrix, adjust } = scratch;
    const gain = drivers.celebration.current ? getPassengerSignatureGain(time, id, partyOn, reducedMotion) : 0;
    const roleMatrix = (role: IdentityRole, index: number) => {
      const { seat } = passengers[index];
      if (role === "legs") return matrix.makeTranslation(seat.x, CABIN_FLOOR_Y + rig.seatedHipHeight, seat.z + rig.seatedHipZ);
      if (role === "rest") return matrix.makeTranslation(seat.x, 0, seat.z);
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
      mesh.visible = part.role === "signatureLeft" || part.role === "signatureRight"
        ? Boolean(drivers.celebration.current && gain > 0.001)
        : part.role !== "rest" || !drivers.celebration.current;
      if (!mesh.visible) return;
      indices.forEach((index, at) => mesh.setMatrixAt(at, roleMatrix(part.role, index)));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.boundingSphere = null;
    });
  }, [parts, indices, passengers, drivers, partyOn, reducedMotion, id, rig, shape, scratch]);

  useLayoutEffect(() => {
    const onSync = () => {
      if (lastRevision.current === drivers.revision.current) return;
      lastRevision.current = drivers.revision.current;
      update(clock.elapsedTime);
    };
    drivers.listeners.add(onSync);
    if (drivers.revision.current > 0) {
      lastRevision.current = drivers.revision.current;
      update(clock.elapsedTime);
    }
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
    () => [undefined, undefined, capacity],
    [capacity],
  );

  if (!parts) {
    return <group name={`bus-distant-fallback-${id}`} userData={{ archetypeId: id }}>
      <Prototype id={id} onReady={setParts} />
    </group>;
  }
  return <group name={`bus-distant-identity-${id}`} userData={{ archetypeId: id }}>
    {parts.map((part, i) => <instancedMesh key={`${part.role}-${i}-${capacity}`} name={`bus-distant-${id}-${part.role}-${i}`}
      ref={node => { meshes.current[i] = node; }} geometry={part.geometry} material={part.material}
      args={instancedArgs} count={indices.length} frustumCulled={false} userData={{ role: part.role, archetypeId: id }}
    />)}
  </group>;
}

export default function PassengerIdentityInstances({ ids, passengers, drivers, capacity, profilesBySeatIndex, hornPulse, poses, partyOn, reducedMotion }:
  IdentityInstancesProps & { ids: string[] }) {
  const groups = useMemo(() => {
    const result = new Map<string, number[]>();
    ids.forEach((id, i) => {
      const indices = result.get(id) ?? [];
      indices.push(i);
      result.set(id, indices);
    });
    return [...result];
  }, [ids]);
  const [unlockedUnbaked, setUnlockedUnbaked] = useState(1);
  const unlockedUnbakedRef = useRef(1);
  const unbakedCount = useMemo(
    () => groups.reduce((count, [id]) => count + (bakedPassengerIdentities.has(id) ? 0 : 1), 0),
    [groups],
  );
  const unbakedCountRef = useRef(unbakedCount);
  const nextBakeAtRef = useRef(0);
  useEffect(() => {
    unbakedCountRef.current = unbakedCount;
  }, [unbakedCount]);
  useFrame((_, dt) => {
    if (unlockedUnbakedRef.current >= unbakedCountRef.current) return;
    const now = performance.now();
    if (now < nextBakeAtRef.current) return;
    nextBakeAtRef.current = now + (dt > 0.05 ? 55 : 25);
    unlockedUnbakedRef.current += 1;
    setUnlockedUnbaked(unlockedUnbakedRef.current);
  });

  let unbakedSeen = 0;
  return <>{groups.map(([id, indices]) => {
    if (!bakedPassengerIdentities.has(id)) {
      unbakedSeen += 1;
      if (unbakedSeen > unlockedUnbaked) return null;
    }
    return <IdentityGroup key={id} id={id} indices={indices}
      passengers={passengers} drivers={drivers} capacity={capacity} profilesBySeatIndex={profilesBySeatIndex}
      hornPulse={hornPulse} poses={poses} partyOn={partyOn} reducedMotion={reducedMotion} />;
  })}</>;
}
