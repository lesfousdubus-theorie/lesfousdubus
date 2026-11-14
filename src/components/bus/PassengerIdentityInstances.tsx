"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PassengerProfile } from "@/types/passenger";
import { bakePassengerIdentity, bakedPassengerIdentities, type IdentityPart, type IdentityRole } from "@/lib/baked-passenger";
import { getPassengerProportions, getPassengerSkeleton } from "@/lib/passenger-proportions";
import { getPassengerSignatureGain } from "@/lib/passenger-motion";
import type { BusOccupant } from "@/lib/bus-occupancy";
import { Passenger } from "./Passengers";
import { NAKAMA_ROSTER } from "./passenger-archetypes";

export interface IdentityDrivers {
  bodies: RefObject<THREE.InstancedMesh | null>;
  heads: RefObject<THREE.InstancedMesh | null>;
  arms: RefObject<THREE.InstancedMesh | null>;
  forearms: RefObject<THREE.InstancedMesh | null>;
  hands: RefObject<THREE.InstancedMesh | null>;
  revision: RefObject<number>;
  celebration: RefObject<boolean>;
  listeners: Set<() => void>;
}

function Prototype({ id, onReady }: { id: string; onReady: (parts: IdentityPart[]) => void }) {
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (!root.current) return;
    const parts = bakedPassengerIdentities.get(id) ?? bakePassengerIdentity(root.current);
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
  profilesBySeatIndex?: Map<number, PassengerProfile>;
  onSelect?: (passenger: PassengerProfile) => void;
  drivers: IdentityDrivers;
  partyOn: boolean;
  reducedMotion: boolean;
}

/** Même tête, mêmes cheveux et même tenue à distance. Seule l'expression est figée. */
function IdentityGroup({ id, indices, passengers, profilesBySeatIndex, onSelect, drivers, partyOn, reducedMotion }:
  IdentityInstancesProps & { id: string; indices: number[] }) {
  const [parts, setParts] = useState(() => bakedPassengerIdentities.get(id));
  const meshes = useRef<Array<THREE.InstancedMesh | null>>([]);
  const lastRevision = useRef(-1);
  const hovered = useRef(false);
  const scratch = useMemo(() => ({ matrix: new THREE.Matrix4(), adjust: new THREE.Matrix4() }), []);
  const rig = getPassengerSkeleton(id);
  const shape = useMemo(() => getPassengerProportions(id), [id]);
  const update = useCallback((time: number) => {
    if (!parts) return;
    const { matrix, adjust } = scratch;
    const gain = drivers.celebration.current ? getPassengerSignatureGain(time, id, partyOn, reducedMotion) : 0;
    const roleMatrix = (role: IdentityRole, index: number) => {
      const { seat } = passengers[index];
      if (role === "legs") return matrix.makeTranslation(seat.x, .64 + rig.seatedHipHeight, seat.z + rig.seatedHipZ);
      if (role === "rest") return matrix.makeTranslation(seat.x, 0, seat.z);
      if (role === "body") {
        drivers.bodies.current?.getMatrixAt(index, matrix);
        return matrix.multiply(adjust.makeScale(.32 / shape.torsoWidth, .42 / shape.torsoHeight, .22 / shape.torsoDepth));
      }
      if (role === "head" || role === "neck") {
        drivers.heads.current?.getMatrixAt(index, matrix);
        matrix.multiply(adjust.makeScale(.24 / shape.headWidth, .27 / shape.headHeight, .23 / shape.headDepth));
        return role === "neck" ? matrix.multiply(adjust.makeTranslation(0, -rig.headAboveNeck, 0)) : matrix;
      }
      const armIndex = index * 2 + (role.endsWith("Right") ? 1 : 0);
      if (role.startsWith("upper")) {
        drivers.arms.current?.getMatrixAt(armIndex, matrix);
        return matrix.multiply(adjust.makeTranslation(0, .10, 0));
      }
      if (role.startsWith("fore")) {
        drivers.forearms.current?.getMatrixAt(armIndex, matrix);
        return matrix.multiply(adjust.makeTranslation(0, .11, 0));
      }
      drivers.hands.current?.getMatrixAt(armIndex, matrix);
      return matrix.multiply(adjust.makeScale(gain / rig.armWidthScale, gain / rig.armScale, gain / rig.armWidthScale));
    };
    parts.forEach((part, partIndex) => {
      const mesh = meshes.current[partIndex];
      if (!mesh) return;
      mesh.visible = part.role !== "rest" || !drivers.celebration.current;
      indices.forEach((index, at) => mesh.setMatrixAt(at, roleMatrix(part.role, index)));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.boundingSphere = null;
    });
  }, [parts, indices, passengers, drivers, partyOn, reducedMotion, id, rig, shape, scratch]);

  useEffect(() => () => {
    if (hovered.current) {
      hovered.current = false;
      document.body.style.cursor = "auto";
    }
  }, []);

  useEffect(() => {
    if (!onSelect && hovered.current) {
      hovered.current = false;
      document.body.style.cursor = "auto";
    }
  }, [onSelect]);

  const getVisitorOccupant = useCallback((instanceId?: number) => {
    if (instanceId === undefined) return undefined;
    const passengerIndex = indices[instanceId];
    const occupant = passengerIndex !== undefined ? passengers[passengerIndex] : undefined;
    return occupant?.passengerKind === "visitor" ? occupant : undefined;
  }, [indices, passengers]);

  useLayoutEffect(() => {
    const onSync = () => {
      if (lastRevision.current === drivers.revision.current) return;
      lastRevision.current = drivers.revision.current;
      update(0);
    };
    drivers.listeners.add(onSync);
    if (drivers.revision.current > 0) {
      lastRevision.current = drivers.revision.current;
      update(0);
    }
    return () => {
      drivers.listeners.delete(onSync);
    };
  }, [drivers, update]);
  useFrame(({ clock }) => {
    if (lastRevision.current === drivers.revision.current) return;
    lastRevision.current = drivers.revision.current;
    update(clock.elapsedTime);
  }, -1);

  if (!parts) return <Prototype id={id} onReady={setParts} />;
  return <group name={`bus-distant-identity-${id}`} userData={{ archetypeId: id }}>
    {parts.map((part, i) => <instancedMesh key={`${part.role}-${i}`} name={`bus-distant-${id}-${part.role}-${i}`}
      ref={node => { meshes.current[i] = node; }} geometry={part.geometry} material={part.material} dispose={null}
      args={[undefined, undefined, 160]} count={indices.length} frustumCulled={false} userData={{ role: part.role, archetypeId: id }}
      onClick={onSelect ? (event) => {
        const occupant = getVisitorOccupant(event.instanceId);
        if (!occupant) return;
        event.stopPropagation();
        const seatIndex = occupant.index;
        onSelect(profilesBySeatIndex?.get(seatIndex) ?? { seatIndex, displayName: "Passager", comment: null });
      } : undefined}
      onPointerOver={onSelect ? (event) => {
        const occupant = getVisitorOccupant(event.instanceId);
        if (!occupant) {
          if (hovered.current) {
            hovered.current = false;
            document.body.style.cursor = "auto";
          }
          return;
        }
        event.stopPropagation();
        hovered.current = true;
        document.body.style.cursor = "pointer";
      } : undefined}
      onPointerMove={onSelect ? (event) => {
        const occupant = getVisitorOccupant(event.instanceId);
        if (!occupant) {
          if (hovered.current) {
            hovered.current = false;
            document.body.style.cursor = "auto";
          }
          return;
        }
        event.stopPropagation();
        if (!hovered.current) {
          hovered.current = true;
          document.body.style.cursor = "pointer";
        }
      } : undefined}
      onPointerOut={onSelect ? () => {
        if (hovered.current) {
          hovered.current = false;
          document.body.style.cursor = "auto";
        }
      } : undefined}
    />)}
  </group>;
}

export default function PassengerIdentityInstances({ ids, passengers, profilesBySeatIndex, onSelect, drivers, partyOn, reducedMotion }:
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
  return <>{groups.map(([id, indices]) => <IdentityGroup key={id} id={id} indices={indices}
    passengers={passengers} profilesBySeatIndex={profilesBySeatIndex} onSelect={onSelect} drivers={drivers} partyOn={partyOn} reducedMotion={reducedMotion} />)}</>;
}
