"use client";

import type * as THREE from "three";
import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { PassengerPose } from "@/lib/passenger-motion";
import { CharacterPart, joinCharacterParts } from "./CharacterShapes";
import { THIGH_LENGTH, SHIN_LENGTH } from "@/lib/passenger-gait";
import type { NakamaArchetype } from "./passenger-archetypes";
import { identityMaterial, passengerCalfMaterial, PassengerFoot } from "./PassengerIdentity";
import { getPassengerSkeleton } from "@/lib/passenger-proportions";

let seatedShapes: ReturnType<typeof makeSeatedShapes> | undefined;
function makeSeatedShapes() {
  return {
    legs: joinCharacterParts([-0.09, 0.09].flatMap(x => [
      { size: [0.13, 0.14, THIGH_LENGTH + 0.025] as [number, number, number], position: [x, 0, -THIGH_LENGTH / 2] as [number, number, number] },
      { size: [0.12, SHIN_LENGTH + 0.02, 0.12] as [number, number, number], position: [x, -SHIN_LENGTH / 2, -THIGH_LENGTH] as [number, number, number] },
    ])),
    shoes: joinCharacterParts([-0.09, 0.09].map(x => ({ size: [0.15, 0.1, 0.23], position: [x, -SHIN_LENGTH - 0.03, -THIGH_LENGTH - 0.035] }))),
    soles: joinCharacterParts([-0.09, 0.09].map(x => ({ size: [0.154, 0.016, 0.234], position: [x, -SHIN_LENGTH - 0.072, -THIGH_LENGTH - 0.035] }))),
  };
}

export function PassengerPelvis({ material, archetype }: { material: THREE.Material; archetype?:NakamaArchetype }) {
  const rig = getPassengerSkeleton(archetype?.id ?? "");
  return <CharacterPart name="nakama-pelvis" material={material} size={[rig.pelvisWidth, rig.pelvisHeight, rig.pelvisDepth]} radius={archetype?.id==="chopper"?.025:undefined}/>;
}

/** Même bassin et mêmes longueurs d'os que le personnage qui monte à bord. */
export default function PassengerLowerBody({ mats, kickPose, archetype }: { mats: Record<string, THREE.Material>; kickPose?: RefObject<PassengerPose>; archetype?:NakamaArchetype }) {
  const shapes = seatedShapes ??= makeSeatedShapes();
  const knee=useRef<THREE.Group>(null),foot=useRef<THREE.Group>(null);
  useFrame(()=>{
    if(knee.current)knee.current.rotation.x=-(kickPose?.current.rightKick??0);
    if(foot.current)foot.current.rotation.x=kickPose?.current.rightKick??0;
  });
  if(archetype?.id === "chopper") {
    const rig = getPassengerSkeleton(archetype.id);
    return <>
      <PassengerPelvis material={mats.pants} archetype={archetype}/>
      <group name="nakama-seated-legs">
        {[-rig.hipSpacing, rig.hipSpacing].map(x=><group key={x}>
          <CharacterPart name="nakama-chopper-thigh" material={mats.pants}
            size={[.088,.09,rig.thighLength+.0125]} position={[x,0,-rig.thighLength/2]} radius={.025}/>
          <CharacterPart name="nakama-chopper-calf" material={mats.skin}
            size={[.075,rig.shinLength+.01,.075]} position={[x,-rig.shinLength/2,-rig.thighLength]} radius={.024}/>
        </group>)}
      </group>
      <group name="nakama-shoes">
        {[-rig.hipSpacing,rig.hipSpacing].map(x=><group key={x} position={[x,-rig.shinLength,-rig.thighLength]} scale={[rig.footScale,rig.footScale,rig.footScale]}>
          <PassengerFoot archetype={archetype} mats={mats}/>
        </group>)}
      </group>
    </>;
  }
  if(archetype&&["luffy","chopper","franky","brook","jinbe","robin","boa_hancock","vivi"].includes(archetype.id)){
    const bone=archetype.id==="brook",shorts=["luffy","chopper","franky"].includes(archetype.id);
    const calfWidth=bone?.065:archetype.id==="chopper"?.095:.12;
    return <>
      <PassengerPelvis material={mats.pants} archetype={archetype}/>
      <group name="nakama-seated-legs">
        {[-.09,.09].map(x=><group key={x}>
          <CharacterPart material={archetype.id==="franky"?mats.skin:mats.pants}
            size={[bone?.087:.13,.14,THIGH_LENGTH+.025]} position={[x,0,-THIGH_LENGTH/2]}/>
          {shorts&&archetype.id!=="franky"&&<CharacterPart material={mats.skin}
            size={[calfWidth,.135,.073]} position={[x,0,-THIGH_LENGTH+.02]}/>}
          <CharacterPart material={passengerCalfMaterial(archetype,mats)}
            size={[calfWidth,SHIN_LENGTH+.02,calfWidth]} position={[x,-SHIN_LENGTH/2,-THIGH_LENGTH]}/>
          {archetype.id==="luffy"&&<CharacterPart material={identityMaterial("#f0e6d8")}
            size={[.139,.146,.026]} position={[x,0,-THIGH_LENGTH+.07]}/>}
        </group>)}
      </group>
      <group name="nakama-shoes">
        {[-.09,.09].map(x=><group key={x} position={[x,-SHIN_LENGTH,-THIGH_LENGTH]}><PassengerFoot archetype={archetype} mats={mats}/></group>)}
      </group>
      {["robin","boa_hancock","vivi"].includes(archetype.id)&&<CharacterPart name="nakama-skirt" material={mats.pants} size={[.305,.19,.31]} position={[0,-.025,-.14]} radius={.025}/>}
    </>;
  }
  if(kickPose)return <>
    <PassengerPelvis material={mats.pants} archetype={archetype}/>
    <group name="nakama-seated-legs">
      {[-.09,.09].map(x=><CharacterPart key={x} material={mats.pants} size={[.13,.14,THIGH_LENGTH+.025]} position={[x,0,-THIGH_LENGTH/2]}/>)}
      <CharacterPart material={mats.pants} size={[.12,SHIN_LENGTH+.02,.12]} position={[-.09,-SHIN_LENGTH/2,-THIGH_LENGTH]}/>
      <group ref={knee} position={[.09,0,-THIGH_LENGTH]}>
        <CharacterPart material={mats.pants} size={[.12,SHIN_LENGTH+.02,.12]} position={[0,-SHIN_LENGTH/2,0]}/>
        <group ref={foot} position={[0,-SHIN_LENGTH,0]}>
          <CharacterPart name="nakama-shoes" material={mats.shoes} size={[.15,.1,.23]} position={[0,-.03,-.035]}/>
        </group>
      </group>
    </group>
    <CharacterPart material={mats.shoes} size={[.15,.1,.23]} position={[-.09,-SHIN_LENGTH-.03,-THIGH_LENGTH-.035]}/>
  </>;
  return <>
    <PassengerPelvis material={mats.pants} archetype={archetype}/>
    <mesh name="nakama-seated-legs" material={mats.pants} geometry={shapes.legs} dispose={null} castShadow />
    <mesh name="nakama-shoes" material={mats.shoes} geometry={shapes.shoes} dispose={null} castShadow />
    {mats.whiteSole && <mesh material={mats.whiteSole} geometry={shapes.soles} dispose={null} />}
  </>;
}
