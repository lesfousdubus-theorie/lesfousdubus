"use client";

import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BusOccupant } from "@/lib/bus-occupancy";
import type { PassengerProfile } from "@/types/passenger";
import { getPassengerProportions, getPassengerSkeleton } from "@/lib/passenger-proportions";
import { BODY_BEHIND_HIP } from "@/lib/passenger-gait";
import { blendPassengerPose, createPassengerPose, samplePassengerPose } from "@/lib/passenger-motion";
import { getNakamaArchetype } from "./passenger-archetypes";
import { getCharacterShape } from "./CharacterShapes";

/** Un seul lot borné par membre, avec les mêmes articulations que les passagers proches. */
export function SimplifiedPassengers({ passengers, profilesBySeatIndex, partyOn, hornPulse, reducedMotion }: {
  passengers: BusOccupant[]; profilesBySeatIndex?: Map<number, PassengerProfile>;
  partyOn: boolean; hornPulse: number; reducedMotion: boolean;
}) {
  const bodies = useRef<THREE.InstancedMesh>(null), heads = useRef<THREE.InstancedMesh>(null);
  const necks = useRef<THREE.InstancedMesh>(null), arms = useRef<THREE.InstancedMesh>(null);
  const forearms = useRef<THREE.InstancedMesh>(null), hands = useRef<THREE.InstancedMesh>(null);
  const mode = useRef({ key: "", settleUntil: 0 });
  const profiles = useMemo(() => passengers.map(({ index, passengerKind }) => {
    const archetype = getNakamaArchetype(index, passengerKind === "visitor" ? profilesBySeatIndex?.get(index)?.avatarId : null);
    return { archetype, rig: getPassengerSkeleton(archetype.id), shape: getPassengerProportions(archetype.id),
      pose: createPassengerPose(), target: createPassengerPose() };
  }), [passengers, profilesBySeatIndex]);
  const scratch = useMemo(() => ({ body: new THREE.Matrix4(), shoulder: new THREE.Matrix4(), elbow: new THREE.Matrix4(),
    local: new THREE.Object3D(), matrix: new THREE.Matrix4(), color: new THREE.Color() }), []);
  const writeMatrices = useCallback(() => {
    const { body, shoulder, elbow, local, matrix } = scratch;
    const part = (mesh: THREE.InstancedMesh | null, index: number, parent: THREE.Matrix4,
      x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
      local.position.set(x, y, z); local.rotation.set(0, 0, 0); local.scale.set(sx, sy, sz); local.updateMatrix();
      matrix.multiplyMatrices(parent, local.matrix); mesh?.setMatrixAt(index, matrix);
    };
    passengers.forEach(({ seat }, i) => {
      const { rig, shape, archetype, pose } = profiles[i];
      local.position.set(seat.x, .64 + rig.seatedHipHeight + rig.torsoAboveHip + pose.bob * .5, seat.z + rig.seatedHipZ + BODY_BEHIND_HIP);
      local.rotation.set(pose.torsoPitch, pose.torsoYaw + pose.rootYaw, pose.torsoRoll); local.scale.set(1, 1, 1); local.updateMatrix(); body.copy(local.matrix);
      part(bodies.current, i, body, 0, 0, 0, shape.torsoWidth / .32, shape.torsoHeight / .42, shape.torsoDepth / .22);
      const neckY = rig.neckAboveHip - rig.torsoAboveHip;
      part(necks.current, i, body, 0, neckY, 0, shape.neckRadius / .055, rig.neckHeight / .12, shape.neckRadius / .055);
      local.position.set(0, neckY, 0); local.rotation.set(pose.headPitch, pose.headYaw, 0); local.scale.set(1, 1, 1); local.updateMatrix();
      shoulder.multiplyMatrices(body, local.matrix);
      part(heads.current, i, shoulder, 0, rig.headAboveNeck, 0, shape.headWidth / .24, shape.headHeight / .27, shape.headDepth / .23);
      for (let arm = 0; arm < 2; arm++) {
        const side = arm === 0 ? -1 : 1, at = i * 2 + arm;
        const present = archetype.id === "shanks" && side < 0 ? 0 : 1;
        local.position.set(side * (shape.torsoWidth / 2 - .018), rig.shoulderY, 0);
        local.rotation.set(arm === 0 ? pose.leftX : pose.rightX, 0, arm === 0 ? pose.leftZ : pose.rightZ);
        local.scale.set(1, 1, 1); local.updateMatrix(); shoulder.multiplyMatrices(body, local.matrix);
        part(arms.current, at, shoulder, 0, -rig.upperArmLength / 2, 0, rig.armWidthScale * present, rig.armScale * present, rig.armWidthScale * present);
        local.position.set(0, -rig.upperArmLength, 0); local.rotation.set(arm === 0 ? pose.leftElbowX : pose.rightElbowX, 0, arm === 0 ? pose.leftElbowZ : pose.rightElbowZ);
        local.scale.set(1, 1, 1); local.updateMatrix(); elbow.multiplyMatrices(shoulder, local.matrix);
        part(forearms.current, at, elbow, 0, -rig.forearmLength / 2, 0, rig.armWidthScale * present, rig.armScale * present, rig.armWidthScale * present);
        part(hands.current, at, elbow, 0, -rig.forearmLength, 0, rig.armWidthScale * present, rig.armScale * present, rig.armWidthScale * present);
      }
    });
    for (const ref of [bodies, heads, necks, arms, forearms, hands]) if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [passengers, profiles, scratch]);
  useLayoutEffect(() => {
    writeMatrices();
    profiles.forEach(({ archetype }, i) => {
      for (const ref of [bodies, arms, forearms]) {
        scratch.color.set(archetype.shirtColor);
        if (ref === bodies) ref.current?.setColorAt(i, scratch.color);
        else for (let arm = 0; arm < 2; arm++) ref.current?.setColorAt(i * 2 + arm, scratch.color);
      }
      scratch.color.set(archetype.skinColor);
      for (const ref of [heads, necks]) ref.current?.setColorAt(i, scratch.color);
      for (let arm = 0; arm < 2; arm++) hands.current?.setColorAt(i * 2 + arm, scratch.color);
    });
    for (const ref of [bodies, heads, necks, arms, forearms, hands]) {
      if (ref.current?.instanceColor) ref.current.instanceColor.needsUpdate = true;
      ref.current?.computeBoundingSphere();
      if (ref.current?.boundingSphere) ref.current.boundingSphere.radius += .6;
    }
  }, [profiles, scratch, writeMatrices]);
  useFrame(({ clock }, dt) => {
    const hornElapsed = hornPulse > 0 ? (performance.now() - hornPulse) / 1000 : Infinity;
    const active = partyOn || (!reducedMotion && hornElapsed < 1.8);
    const key = `${active}:${reducedMotion}:${partyOn}:${hornPulse}`;
    if (mode.current.key !== key) { mode.current.key = key; mode.current.settleUntil = clock.elapsedTime + 2; }
    // Les poses immobiles cessent d'écrire les matrices après leur transition.
    if ((!active || reducedMotion) && clock.elapsedTime > mode.current.settleUntil) return;
    profiles.forEach(({ archetype, shape, pose, target }, i) => {
      samplePassengerPose(target, clock.elapsedTime, passengers[i].index, 0, shape.torsoWidth, hornElapsed, partyOn, reducedMotion || !active, archetype.id);
      blendPassengerPose(pose, target, dt, reducedMotion);
    });
    writeMatrices();
  });
  if (!passengers.length) return null;
  return <>
    <instancedMesh name="bus-distant-passenger-bodies" userData={{ occupants: passengers.map(({ index, physicalSeatIndex, passengerKind, seat }) => ({ seatIndex: index, physicalSeatIndex, passengerKind, row: seat.row, seatInRow: seat.seatInRow })) }} ref={bodies} args={[undefined, undefined, 160]} count={passengers.length}>
      <boxGeometry args={[.32, .42, .22]} /><meshStandardMaterial roughness={.7} />
    </instancedMesh>
    <instancedMesh name="bus-distant-passenger-heads" ref={heads} geometry={getCharacterShape([.24, .27, .23], .038)} dispose={null} args={[undefined, undefined, 160]} count={passengers.length}>
      <meshStandardMaterial roughness={.7} />
    </instancedMesh>
    <instancedMesh name="bus-distant-passenger-necks" ref={necks} args={[undefined, undefined, 160]} count={passengers.length}>
      <cylinderGeometry args={[.055, .055, .12, 8]} /><meshStandardMaterial roughness={.7} />
    </instancedMesh>
    <instancedMesh name="bus-distant-party-arms" ref={arms} args={[undefined, undefined, 320]} count={passengers.length * 2}>
      <boxGeometry args={[.075, .20, .075]} /><meshStandardMaterial roughness={.7} />
    </instancedMesh>
    <instancedMesh name="bus-distant-passenger-forearms" ref={forearms} args={[undefined, undefined, 320]} count={passengers.length * 2}>
      <boxGeometry args={[.07, .22, .07]} /><meshStandardMaterial roughness={.7} />
    </instancedMesh>
    <instancedMesh name="bus-distant-party-hands" ref={hands} args={[undefined, undefined, 320]} count={passengers.length * 2}>
      <boxGeometry args={[.085, .075, .08]} /><meshStandardMaterial roughness={.7} />
    </instancedMesh>
  </>;
}
