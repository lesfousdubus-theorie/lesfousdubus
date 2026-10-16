"use client";

import type { ReactNode, RefObject } from "react";
import type * as THREE from "three";
import { DRIVER_FOREARM, DRIVER_HAND_SIZE, DRIVER_SHOULDER_X, DRIVER_SHOULDER_Z, DRIVER_UPPER_ARM, getDriverArmRest } from "@/lib/driver-arms";
import { CharacterPart } from "./CharacterShapes";

type Driver = "kamal" | "kyta";
type JointRef = RefObject<THREE.Group | null>;
/** Des mains carrées simples, comme celles des autres passagers, suivent les mêmes os. */
export default function DriverArm({ driver, side, mats, shoulder, elbow, wrist, children }: {
  driver: Driver; side: -1 | 1; mats: Record<string, THREE.Material>;
  shoulder: JointRef; elbow: JointRef; wrist: JointRef; children?: ReactNode;
}) {
  const rest = getDriverArmRest(driver, side);
  const name = `${driver}-${side < 0 ? "left" : "right"}`;
  const shirt = driver === "kamal" ? mats.kamalShirt : mats.kytaShirt;
  const sleeve = driver === "kyta";
  return <group ref={shoulder} name={`crew-arm-${name}`} position={[side * DRIVER_SHOULDER_X, .14, DRIVER_SHOULDER_Z - .14]}
    rotation={[rest.shoulderX, rest.shoulderYaw, 0, "YXZ"]}>
    <CharacterPart material={shirt} size={[.098, DRIVER_UPPER_ARM + .016, .098]}
      position={[0, -DRIVER_UPPER_ARM / 2, 0]} radius={.018}/>
    <group ref={elbow} name={`crew-elbow-${name}`} position={[0, -DRIVER_UPPER_ARM, 0]} rotation={[rest.elbowX, 0, 0]}>
      <CharacterPart material={sleeve ? shirt : mats.skin} size={[.087, DRIVER_FOREARM + .012, .087]}
        position={[0, -DRIVER_FOREARM / 2, 0]} radius={.018}/>
      <group ref={wrist} name={`crew-hand-${name}`} position={[0, -DRIVER_FOREARM, 0]} rotation={[rest.wristX, 0, 0]}>
        <CharacterPart name={`crew-palm-${name}`} material={mats.skin} size={DRIVER_HAND_SIZE} radius={.008}/>
        {children}
      </group>
    </group>
  </group>;
}
