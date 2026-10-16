"use client";

import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { PassengerActivity } from "@/lib/passenger-motion";
import { blendFacialExpression, createFacialExpression, getFacialProfile, sampleFacialExpression } from "@/lib/passenger-expressions";
import { CharacterPart, getCharacterShape, joinCharacterParts } from "./CharacterShapes";

export type FacialMotionRef = RefObject<{ activity: PassengerActivity }>;

let skullTeethGeometry: THREE.BufferGeometry | undefined;
function getSkullTeethGeometry() {
  return skullTeethGeometry ??= joinCharacterParts(Array.from({ length: 7 }, (_, index) => ({
    size: [.12, 1, .009] as [number, number, number],
    position: [(index - 3) * .14, 0, 0] as [number, number, number],
  })));
}

/** Small closed volumes sit in front of the face; expression only changes their transforms. */
export default function AnimatedCharacterMouth({ id, index = 0, motion, reducedMotion = false,
  position, dark, teeth, skin, tongue, skull = false }: {
  id: string; index?: number; motion?: FacialMotionRef; reducedMotion?: boolean;
  position: [number, number, number]; dark: THREE.Material; teeth: THREE.Material;
  skin?: THREE.Material; tongue?: THREE.Material; skull?: boolean;
}) {
  const root = useRef<THREE.Group>(null), cavity = useRef<THREE.Mesh>(null);
  const upperTeeth = useRef<THREE.Mesh>(null), lowerTeeth = useRef<THREE.Mesh>(null);
  const tongueMesh = useRef<THREE.Mesh>(null), jaw = useRef<THREE.Group>(null);
  const corners = useRef<Array<THREE.Mesh | null>>([]);
  const target = useRef(createFacialExpression()), expression = useRef(createFacialExpression());
  const profile = getFacialProfile(id);
  const mouthShape = getCharacterShape([1, 1, .009], .16, 1);
  const teethShape = skull ? getSkullTeethGeometry() : mouthShape;

  useFrame(({ clock }, dt) => {
    sampleFacialExpression(target.current, clock.elapsedTime, index, id, motion?.current.activity ?? "idle", reducedMotion);
    blendFacialExpression(expression.current, target.current, dt, reducedMotion);
    const face = expression.current;
    const width = profile.width * face.width;
    const closedHeight = skull ? .025 : .008 + .009 * face.teeth;
    const height = closedHeight + profile.height * face.opening;
    if (root.current) {
      root.current.userData.facialMood = face.mood;
      root.current.userData.mouthOpening = face.opening;
      root.current.userData.mouthWidth = width;
    }
    cavity.current?.scale.set(width, height, 1);
    const toothHeight = Math.min(height * .45, skull ? .016 : .010);
    if (upperTeeth.current) {
      upperTeeth.current.visible = skull || face.teeth > .12;
      upperTeeth.current.scale.set(width * .85, toothHeight, 1);
      upperTeeth.current.position.y = height * .5 - toothHeight * .6;
    }
    if (lowerTeeth.current) {
      lowerTeeth.current.scale.set(width * .85, toothHeight, 1);
      lowerTeeth.current.position.y = -height * .5 + toothHeight * .6;
    }
    if (tongueMesh.current) {
      tongueMesh.current.visible = face.opening > .25;
      tongueMesh.current.scale.set(width * .40, Math.min(.012, height * .22), 1);
      tongueMesh.current.position.y = -height * .5 + height * .16;
    }
    corners.current.forEach((corner, index) => {
      if (!corner) return;
      const side = index === 0 ? -1 : 1;
      corner.visible = !skull && face.opening < .3;
      corner.position.set(side * width * .47, .006 * face.smile, 0);
      corner.rotation.z = side * -.25 * face.smile;
      corner.scale.y = .009 + face.smile * .012;
    });
    // Brook's lower jaw travels with the mouth instead of leaving his teeth floating.
    if (jaw.current) jaw.current.position.y = -.035 - face.opening * .025;
  });

  return <group ref={root} name="character-expression" position={position}>
    <mesh ref={cavity} name="character-mouth-cavity" material={dark} geometry={mouthShape}
      scale={[profile.width, skull ? .025 : .01, 1]} dispose={null}/>
    <mesh ref={upperTeeth} name="character-mouth-teeth" material={teeth} geometry={teethShape}
      position={[0, .004, -.006]} scale={[profile.width * .85, .008, 1]} dispose={null}/>
    {skull && <mesh ref={lowerTeeth} name="character-mouth-lower-teeth" material={teeth} geometry={teethShape}
      position={[0, -.004, -.006]} scale={[profile.width * .85, .008, 1]} dispose={null}/>}
    {tongue && <mesh ref={tongueMesh} name="character-mouth-tongue" material={tongue} geometry={mouthShape}
      position={[0, -.006, -.007]} scale={[profile.width * .4, .008, 1]} visible={false} dispose={null}/>}
    {!skull && [-1, 1].map((side, index) => <mesh key={side} ref={node => { corners.current[index] = node; }}
      name="character-smile-corner" material={dark} geometry={mouthShape} position={[side * profile.width * .47, 0, 0]}
      scale={[.008, .01, 1]} dispose={null}/>)}
    {skull && skin && <group ref={jaw} name="character-skull-jaw" position={[0, -.035, .115]}>
      <CharacterPart material={skin} size={[.21, .045, .15]} radius={.015}/>
    </group>}
  </group>;
}
