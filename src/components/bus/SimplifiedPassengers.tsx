"use client";

import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { BusOccupant } from "@/lib/bus-occupancy";
import type { PassengerProfile } from "@/types/passenger";
import { getPassengerProportions, getPassengerSkeleton } from "@/lib/passenger-proportions";
import { BODY_BEHIND_HIP, CABIN_FLOOR_Y } from "@/lib/passenger-gait";
import { blendPassengerPose, createPassengerPose, getRegisteredPassengerPose, samplePassengerPose, type PassengerPoseRegistry } from "@/lib/passenger-motion";
import { getNakamaArchetype } from "./passenger-archetypes";
import { keepPassengerHandsApart } from "@/lib/passenger-space";
import PassengerIdentityInstances from "./PassengerIdentityInstances";

/** Un seul lot borné par membre, avec les mêmes articulations que les passagers proches. */
export const SimplifiedPassengers = memo(function SimplifiedPassengers({ passengers, profilesBySeatIndex, partyOn, hornPulse, reducedMotion, poses }: {
  passengers: BusOccupant[]; profilesBySeatIndex?: Map<number, PassengerProfile>;
  partyOn: boolean; hornPulse: number; reducedMotion: boolean;
  poses?:PassengerPoseRegistry;
}) {
  const clock = useThree(state => state.clock);
  const mode = useRef({ key: "", settleUntil: 0 });
  const revision=useRef(0),celebration=useRef(false);
  const profiles = useMemo(() => passengers.map(({ index, passengerKind }) => {
    const archetype = getNakamaArchetype(index, passengerKind === "visitor" ? profilesBySeatIndex?.get(index)?.avatarId : null);
    return { archetype, rig: getPassengerSkeleton(archetype.id), shape: getPassengerProportions(archetype.id),
      pose: getRegisteredPassengerPose(poses,index), target: createPassengerPose() };
  }), [passengers, profilesBySeatIndex,poses]);
  const ids=useMemo(()=>profiles.map(profile=>profile.archetype.id),[profiles]);
  const originZ = useMemo(() => {
    if (!passengers.length) return 0;
    return Math.round(passengers[Math.floor(passengers.length / 2)].seat.z / 16) * 16;
  }, [passengers]);
  const occupantsKey = useMemo(() => passengers.map((p, i) => `${p.index}:${p.physicalSeatIndex}:${ids[i]}`).join(","), [passengers, ids]);
  const neededCapacity = Math.max(768, Math.ceil(passengers.length / 256) * 256);
  const [capacity, setCapacity] = useState(neededCapacity);
  if (neededCapacity > capacity) {
    setCapacity(neededCapacity);
  }
  const listeners=useMemo(()=>new Set<()=>void>(),[]);
  const matrices = useMemo(() => ({
    bodies: Array.from({ length: capacity }, () => new THREE.Matrix4()),
    heads: Array.from({ length: capacity }, () => new THREE.Matrix4()),
    arms: Array.from({ length: capacity * 2 }, () => new THREE.Matrix4()),
    forearms: Array.from({ length: capacity * 2 }, () => new THREE.Matrix4()),
    hands: Array.from({ length: capacity * 2 }, () => new THREE.Matrix4()),
  }), [capacity]);
  const drivers=useMemo(()=>({...matrices,revision,celebration,listeners}),[matrices,listeners]);
  const scratch = useMemo(() => ({ body: new THREE.Matrix4(), shoulder: new THREE.Matrix4(), elbow: new THREE.Matrix4(),
    local: new THREE.Object3D(), matrix: new THREE.Matrix4() }), []);
  const writeMatrices = useCallback(() => {
    const { body, shoulder, elbow, local } = scratch;
    const part = (list: THREE.Matrix4[], index: number, parent: THREE.Matrix4,
      x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
      local.position.set(x, y, z); local.rotation.set(0, 0, 0); local.scale.set(sx, sy, sz); local.updateMatrix();
      (list[index] ??= new THREE.Matrix4()).multiplyMatrices(parent, local.matrix);
    };
    passengers.forEach(({ seat }, i) => {
      const { rig, shape, archetype, pose } = profiles[i];
      keepPassengerHandsApart(pose, archetype.id, seat.seatInRow % 2 === 0 ? 1 : -1, seat.x);
      local.position.set(seat.x, CABIN_FLOOR_Y + rig.seatedHipHeight + rig.torsoAboveHip + pose.bob * .5, seat.z - originZ + rig.seatedHipZ + BODY_BEHIND_HIP);
      local.rotation.set(pose.torsoPitch, pose.torsoYaw + pose.rootYaw, pose.torsoRoll); local.scale.set(1, 1, 1); local.updateMatrix(); body.copy(local.matrix);
      part(matrices.bodies, i, body, 0, 0, 0, shape.torsoWidth / .32, shape.torsoHeight / .42, shape.torsoDepth / .22);
      const neckY = rig.neckAboveHip - rig.torsoAboveHip;
      local.position.set(0, neckY, 0); local.rotation.set(pose.headPitch, pose.headYaw, 0); local.scale.set(1, 1, 1); local.updateMatrix();
      shoulder.multiplyMatrices(body, local.matrix);
      part(matrices.heads, i, shoulder, 0, rig.headAboveNeck, 0, shape.headWidth / .24, shape.headHeight / .27, shape.headDepth / .23);
      for (let arm = 0; arm < 2; arm++) {
        const side = arm === 0 ? -1 : 1, at = i * 2 + arm;
        const present = archetype.id === "shanks" && side < 0 ? 0 : 1;
        local.position.set(side * (shape.torsoWidth / 2 - .018), rig.shoulderY, 0);
        local.rotation.set(arm === 0 ? pose.leftX : pose.rightX, 0, arm === 0 ? pose.leftZ : pose.rightZ);
        local.scale.set(1, 1, 1); local.updateMatrix(); shoulder.multiplyMatrices(body, local.matrix);
        part(matrices.arms, at, shoulder, 0, -rig.upperArmLength / 2, 0, rig.armWidthScale * present, rig.armScale * present, rig.armWidthScale * present);
        local.position.set(0, -rig.upperArmLength, 0); local.rotation.set(arm === 0 ? pose.leftElbowX : pose.rightElbowX, 0, arm === 0 ? pose.leftElbowZ : pose.rightElbowZ);
        local.scale.set(1, 1, 1); local.updateMatrix(); elbow.multiplyMatrices(shoulder, local.matrix);
        part(matrices.forearms, at, elbow, 0, -rig.forearmLength / 2, 0, rig.armWidthScale * present, rig.armScale * present, rig.armWidthScale * present);
        part(matrices.hands, at, elbow, 0, -rig.forearmLength, 0, rig.armWidthScale * present, rig.armScale * present, rig.armWidthScale * present);
      }
    });
    revision.current++;
  }, [matrices, originZ, passengers, profiles, scratch]);
  const snapReducedMotion = useCallback((time: number, hornElapsed: number, active: boolean) => {
    profiles.forEach(({ archetype, shape, pose, target }, i) => {
      const { index, seat } = passengers[i];
      samplePassengerPose(target, time, index, 0, shape.torsoWidth, hornElapsed, partyOn, reducedMotion || !active, archetype.id);
      keepPassengerHandsApart(target, archetype.id, seat.seatInRow % 2 === 0 ? 1 : -1, seat.x);
      Object.assign(pose, target);
    });
  }, [passengers, profiles, partyOn, reducedMotion]);
  useLayoutEffect(() => {
    const hornElapsed = hornPulse > 0 ? (performance.now() - hornPulse) / 1000 : Infinity;
    const active = partyOn || (!reducedMotion && hornElapsed < 1.8);
    celebration.current = active;
    if (active) {
      if (reducedMotion) snapReducedMotion(clock.elapsedTime, hornElapsed, active);
      writeMatrices();
    } else {
      // Hors fête/klaxon, IdentityGroup utilise les lots statiques fusionnés (zéro calcul de membres).
      revision.current++;
    }
    listeners.forEach(fn => fn());
  }, [clock, hornPulse, listeners, partyOn, reducedMotion, snapReducedMotion, writeMatrices]);
  useFrame(({ clock }, dt) => {
    const hornElapsed = hornPulse > 0 ? (performance.now() - hornPulse) / 1000 : Infinity;
    const active = partyOn || (!reducedMotion && hornElapsed < 1.8);
    const wasCelebrating = celebration.current;
    celebration.current = active;
    if (!active) {
      if (wasCelebrating) {
        revision.current++;
        listeners.forEach(fn => fn());
      }
      return;
    }
    const key = `${active}:${reducedMotion}:${partyOn}:${hornPulse}:${occupantsKey}`;
    const modeChanged = mode.current.key !== key;
    if (modeChanged) { mode.current.key = key; mode.current.settleUntil = clock.elapsedTime + 1.6; }
    if (reducedMotion && !modeChanged && clock.elapsedTime > mode.current.settleUntil) return;
    if (reducedMotion) {
      snapReducedMotion(clock.elapsedTime, hornElapsed, active);
      mode.current.settleUntil = clock.elapsedTime - 1;
      writeMatrices();
      return;
    }
    profiles.forEach(({ archetype, shape, pose, target }, i) => {
      const seat = passengers[i].seat;
      samplePassengerPose(target, clock.elapsedTime, passengers[i].index, 0, shape.torsoWidth, hornElapsed, partyOn, !active, archetype.id);
      keepPassengerHandsApart(target,archetype.id,seat.seatInRow%2===0?1:-1,seat.x);
      blendPassengerPose(pose, target, dt, false);
    });
    writeMatrices();
  },-2);
  return <PassengerIdentityInstances ids={ids} passengers={passengers} originZ={originZ} drivers={drivers} capacity={capacity}
    profilesBySeatIndex={profilesBySeatIndex} hornPulse={hornPulse} poses={poses}
    partyOn={partyOn} reducedMotion={reducedMotion}/>;
});
