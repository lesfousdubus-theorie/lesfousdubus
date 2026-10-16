"use client";

import type * as THREE from "three";
import { CharacterPart } from "./CharacterShapes";
import { HairStyle, Accessory } from "./PassengerAppearance";
import type { NakamaArchetype } from "./passenger-archetypes";
import PassengerCostume from "./PassengerCostume";
import { getPassengerProportions } from "@/lib/passenger-proportions";
import { identityMaterial, NamiHair, ZoroEarrings } from "./PassengerIdentity";
import AnimatedCharacterMouth, { type FacialMotionRef } from "./AnimatedCharacterMouth";
import { GuestHair, GuestHeadAccessory } from "./GuestCharacterParts";

/** Même visage pour le passager assis et son personnage en mouvement. Face vers -Z. */
export default function PassengerHead({ archetype, mats, motion, index = 0, reducedMotion = false }: {
  archetype: NakamaArchetype; mats: Record<string, THREE.Material>;
  motion?: FacialMotionRef; index?: number; reducedMotion?: boolean;
}) {
  const {headWidth,headHeight,headDepth,headRadius}=getPassengerProportions(archetype.id);
  const front=-headDepth/2-.008, skull=archetype.id==="brook", reindeer=archetype.id==="chopper";
  const nami = archetype.id === "nami";
  const sanji = archetype.id === "sanji";
  const eyeSpacing=archetype.id==="jinbe"?.069:reindeer?.061:nami?.052:.055;
  return <group name="nakama-head">
    <CharacterPart name="nakama-face" material={mats.skin} size={[headWidth,headHeight,headDepth]}
      radius={headRadius} detail={2} castShadow />
    {!skull&&[-1, 1].map(side => <CharacterPart key={side} material={mats.skin}
      size={reindeer?[.082,.12,.035]:[.043,.063,.053]} position={[side*(headWidth/2+.003),reindeer?.071:-.007,.015]}
      rotation={reindeer?[0,0,side*-.56]:[0,0,0]}/>)}
    {(sanji?[-eyeSpacing]:[-eyeSpacing,eyeSpacing]).map(x => <group key={x} position={[x,.02,front+.007]}>
      {archetype.id==="zoro"&&x<0 ? <CharacterPart name="nakama-zoro-closed-eye" material={mats.eyes} size={[.047,.007,.009]} position={[0,0,-.001]}/>
        : <><CharacterPart name="nakama-eye-base" material={skull?mats.faceDark:mats.teeth} size={skull?[.068,.059,.025]:nami?[.045,.034,.025]:sanji?[.045,.031,.025]:[.049,.039,.025]} radius={skull?.018:.005}/>
          {!skull&&<CharacterPart name={sanji?"nakama-sanji-pupil":undefined} material={archetype.id==="mihawk"?identityMaterial("#edd24d"):mats.eyes} size={reindeer?[.029,.035,.008]:nami?[.023,.027,.008]:sanji?[.021,.024,.008]:[.025,.031,.008]} position={[0,0,-.015]}/>}
          {archetype.id==="mihawk"&&<CharacterPart material={mats.eyes} size={[.006,.026,.007]} position={[0,0,-.020]}/>}</>}
      {!skull&&!sanji&&<CharacterPart material={nami?identityMaterial("#9e4d24"):mats.hair} size={[archetype.id==="jinbe"?.065:nami?.045:.048,nami?.007:.01,.009]} position={[0,.035,0]}/>}
    </group>)}
    {skull?<>
      <CharacterPart material={mats.faceDark} size={[.036,.031,.025]} position={[0,-.033,front+.007]} rotation={[0,0,Math.PI/4]}/>
    </>:reindeer?<>
      <CharacterPart material={identityMaterial("#eac18d")} size={[.154,.104,.032]} position={[0,-.049,front-.004]} radius={.03}/>
      <CharacterPart material={identityMaterial("#1474c3")} size={[.037,.031,.026]} position={[0,-.032,front-.034]} radius={.013}/>
      <CharacterPart material={mats.faceDark} size={[.009,.020,.006]} position={[0,-.057,front-.024]}/>
    </>:archetype.id === "usopp" ? <mesh material={mats.skin} position={[0,-.005,front-.067]} rotation={[Math.PI/2,0,0]}>
      <cylinderGeometry args={[0.021, 0.027, 0.17, 12]} />
    </mesh> : archetype.accessory === "clown_nose" ? <mesh material={mats.red} position={[0, -0.005, -0.14]}>
      <sphereGeometry args={[0.043, 16, 12]} />
    </mesh> : <CharacterPart material={archetype.id==="franky"?mats.steel:mats.skin}
      size={archetype.id==="franky"?[.061,.052,.044]:nami?[.024,.031,.029]:[.027,.037,.04]} position={[0,-.006,front-.004]}/>}
    <AnimatedCharacterMouth id={archetype.id} index={index} motion={motion} reducedMotion={reducedMotion}
      position={[0, skull ? -.084 : reindeer ? -.078 : -.066, front + (reindeer ? -.024 : .005)]}
      dark={mats.faceDark} teeth={mats.teeth} tongue={identityMaterial("#b84c55")} skin={mats.skin} skull={skull}/>
    {archetype.id==="jinbe"&&<>
      {[-1,1].map(side=><group key={side}>
        <mesh material={mats.teeth} position={[side*.061,-.066,front-.012]}><coneGeometry args={[.012,.05,8]}/></mesh>
        <CharacterPart material={mats.hair} size={[.038,.14,.04]} position={[side*.13,-.015,.003]} rotation={[0,0,side*.22]}/>
      </group>)}
      <CharacterPart material={mats.hair} size={[.047,.045,.027]} position={[0,-.126,front+.04]}/>
    </>}
    {nami?<NamiHair material={mats.hair}/>:['boa_hancock','vivi'].includes(archetype.id)?<GuestHair id={archetype.id} material={mats.hair}/>:<HairStyle style={archetype.hairStyle} mats={mats} id={archetype.id}/>}
    {!skull&&<PassengerCostume archetype={archetype} face width={headWidth} height={headHeight-.002} front={front-.018}/>}
    {archetype.id==="yamato"&&[-.125,.125].map(x=><CharacterPart key={x} material={mats.turquoise}
      size={[.064,.115,.096]} position={[x,-.155,.055]}/>)}
    {archetype.id==="zoro"?<ZoroEarrings material={mats.gold}/>:['doflamingo','boa_hancock','mihawk','law'].includes(archetype.id)?
      <GuestHeadAccessory id={archetype.id} mats={mats} front={front}/>:<Accessory archetype={archetype} mats={mats} />}
  </group>;
}
