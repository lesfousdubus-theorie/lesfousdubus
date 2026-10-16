"use client";

import type * as THREE from "three";
import { CharacterPart } from "./CharacterShapes";
import type { NakamaArchetype } from "./passenger-archetypes";
import { getPassengerProportions, getPassengerSkeleton } from "@/lib/passenger-proportions";
import PassengerCostume from "./PassengerCostume";
import { identityMaterial } from "./PassengerIdentity";
import { GuestTorsoExtras } from "./GuestCharacterParts";

interface Props { archetype: NakamaArchetype; mats: Record<string, THREE.Material> }

/** Le cou pénètre dans le buste et la mâchoire, même lorsque la tête pivote. */
export function PassengerNeck({ archetype, mats }: Props) {
  const { neckRadius } = getPassengerProportions(archetype.id);
  const { neckHeight } = getPassengerSkeleton(archetype.id);
  return <mesh name="nakama-neck" material={mats.skin} castShadow>
    <cylinderGeometry args={[neckRadius, neckRadius * 1.12, neckHeight, 16]} />
  </mesh>;
}

export function PassengerTorso({ archetype, mats }: Props) {
  const { torsoWidth, torsoHeight, torsoDepth, torsoRadius } = getPassengerProportions(archetype.id);
  const front = -torsoDepth / 2 - 0.008;
  const bareTorso=["nami","usopp","robin","chopper"].includes(archetype.id);
  return <group name="nakama-torso">
    <CharacterPart name="nakama-torso-body" material={bareTorso?mats.skin:mats.shirt} size={[torsoWidth, torsoHeight, torsoDepth]}
      radius={torsoRadius} detail={2} castShadow />
    {["luffy","zoro","franky","mihawk"].includes(archetype.id) && <>
      <CharacterPart name="nakama-chest-panel" material={mats.skin} size={[archetype.id==="franky"?.185:.145, 0.285, 0.028]} position={[0, 0.055, front]} radius={0.01} />
    </>}
    {archetype.id==="luffy"&&[-1,1].map(side=><CharacterPart key={side} name="nakama-luffy-chest-scar" material={identityMaterial("#b9755d")}
      size={[.005,.087,.003]} position={[0,.086,front-.017]} rotation={[0,0,side*.60]} radius={.001}/>)}
    {archetype.id==="zoro"&&<CharacterPart name="nakama-zoro-chest-scar" material={identityMaterial("#b97861")}
      size={[.005,.175,.003]} position={[0,.031,front-.017]} rotation={[0,0,-.38]} radius={.001}/>}
    {archetype.id==="robin"&&[-1,1].map(side=><CharacterPart key={side} material={mats.shirt}
      size={[.078,.35,.055]} position={[side*.104,.022,front+.008]} rotation={[0,0,side*.10]}/>)}
    {archetype.id==="chopper"&&<CharacterPart material={identityMaterial("#d29a5d")} size={[.09,.065,.025]} position={[0,.075,front]}/>}
    {archetype.id==="brook"&&<>
      <CharacterPart material={mats.teeth} size={[.093,.155,.027]} position={[0,.116,front]}/>
      <CharacterPart material={identityMaterial("#f9ac26")} size={[.067,.04,.045]} position={[0,.132,front-.018]}/>
      {[-1,1].map(side=><CharacterPart key={side} material={identityMaterial("#f9ac26")} size={[.065,.065,.035]} position={[side*.046,.136,front-.015]} rotation={[0,0,side*.32]}/>)}
    </>}
    {archetype.id==="jinbe"&&<>
      <CharacterPart material={mats.skin} size={[.165,.09,.030]} position={[0,.128,front+.023]} radius={.020}/>
      {[-1,1].map(side=><CharacterPart key={side} material={identityMaterial("#f3e4bf")} size={[.05,.29,.055]} position={[side*.185,.034,.104]} rotation={[0,0,side*.12]}/>)}
    </>}
    {archetype.id === "sanji" && <>
      <CharacterPart material={identityMaterial("#6cadd2")} size={[0.085, 0.19, 0.022]} position={[0, 0.105, front]} />
      <CharacterPart material={mats.dark} size={[0.027, 0.16, 0.027]} position={[0, 0.08, front - 0.017]} />
    </>}
    {archetype.id === "shanks" && <CharacterPart name="nakama-shanks-empty-left-sleeve" material={mats.shirt}
      size={[.08,.115,.10]} position={[-(torsoWidth/2-.018),.112,.035]} radius={.012}/>}
    <GuestTorsoExtras id={archetype.id} mats={mats} front={front}/>
    <PassengerCostume archetype={archetype} width={torsoWidth} front={front}/>
  </group>;
}
