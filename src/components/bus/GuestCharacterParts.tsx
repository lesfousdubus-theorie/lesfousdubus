"use client";

import type * as THREE from "three";
import { CharacterPart, joinCharacterParts } from "./CharacterShapes";
import { identityMaterial } from "./PassengerIdentity";

type Mats = Record<string, THREE.Material>;

export function GuestHair({ id, material }: { id: string; material: THREE.Material }) {
  if (id !== "boa_hancock" && id !== "vivi") return null;
  const vivi = id === "vivi";
  return <group name="nakama-hair">
    <CharacterPart material={material} size={[.245,.080,.238]} position={[0,.123,.006]} radius={.025} detail={2}/>
    <CharacterPart material={material} size={[.236,vivi?.23:.38,.067]} position={[0,vivi?.015:-.074,.097]} radius={.018}/>
    {[-1,1].map(side=><CharacterPart key={side} material={material} size={[.055,vivi?.20:.32,.095]}
      position={[side*.116,vivi?.009:-.048,.036]} radius={.015}/>)}
    {[-1,1].map(side=><CharacterPart key={`fringe-${side}`} material={material} size={[.095,.034,.033]}
      position={[side*.058,.116,-.121]} rotation={[0,0,side*.17]} radius={.009}/>)}
    {vivi&&<>
      <CharacterPart name="nakama-vivi-ponytail" material={material} size={[.075,.27,.064]} position={[0,-.014,.136]} radius={.015}/>
      <CharacterPart material={identityMaterial("#deba48")} size={[.084,.036,.075]} position={[0,.086,.130]}/>
    </>}
  </group>;
}

export function GuestHeadAccessory({ id, mats, front }: { id: string; mats: Mats; front: number }) {
  if (id === "doflamingo") return <group name="nakama-doflamingo-glasses">
    {[-1,1].map(side=><group key={side}>
      <CharacterPart material={mats.teeth} size={[.090,.045,.025]} position={[side*.055,.025,front-.017]} rotation={[0,0,side*-.10]}/>
      <CharacterPart material={identityMaterial("#ad2455")} size={[.064,.027,.007]} position={[side*.055,.025,front-.028]} rotation={[0,0,side*-.10]}/>
    </group>)}
    <CharacterPart material={mats.teeth} size={[.036,.012,.022]} position={[0,.022,front-.017]}/>
    {[-1,1].map(side=><CharacterPart key={`temple-${side}`} name="nakama-doflamingo-glasses-temple" material={mats.teeth}
      size={[.018,.019,.120]} position={[side*.107,.025,front+.052]}/>)}
  </group>;
  if (id === "boa_hancock") return <group name="nakama-boa-snake-earrings">
    {[-1,1].map(side=><group key={side} position={[side*.141,0,0]}>
      <CharacterPart name="nakama-boa-earring-stud" material={mats.gold} size={[.011,.033,.018]} position={[0,-.030,-.007]}/>
      <CharacterPart material={mats.gold} size={[.009,.056,.012]} position={[0,-.064,-.003]}/>
      <CharacterPart material={mats.gold} size={[.009,.012,.032]} position={[0,-.083,-.006]}/>
    </group>)}
  </group>;
  if (id === "mihawk") return <group name="nakama-mihawk-hat">
    <CharacterPart name="nakama-hat-base" material={mats.accessory} size={[.41,.022,.29]} position={[0,.160,0]} radius={.009}/>
    <CharacterPart material={mats.accessory} size={[.16,.13,.185]} position={[0,.220,0]} radius={.025}/>
    <CharacterPart material={mats.accessorySub} size={[.166,.020,.190]} position={[0,.172,0]} radius={.007}/>
    <CharacterPart material={mats.teeth} size={[.025,.13,.020]} position={[.125,.229,.012]} rotation={[0,0,-.30]} radius={.007}/>
  </group>;
  if (id === "law") return <group name="nakama-law-spotted-hat">
    <mesh name="nakama-hat-base" material={mats.accessory} position={[0,.17,0]}>
      <cylinderGeometry args={[.15,.13,.10,16]}/>
    </mesh>
    <CharacterPart name="nakama-law-hat-brim" material={mats.accessory} size={[.22,.019,.075]} position={[0,.20,-.125]}/>
    {[[0,.14],[-.065,.15],[.065,.15],[-.035,.195],[.035,.195],[-.10,.19],[.10,.19]].map(([x,y],index)=>{
      const radius=.13+(y-.12)*.2;
      return <CharacterPart key={index} name="nakama-law-hat-spot" material={mats.dark} size={[.018,.013,.006]}
        position={[x,y,-Math.sqrt(radius*radius-x*x)-.002]} rotation={[0,-Math.asin(x/radius),0]} radius={.003}/>;
    })}
  </group>;
  return null;
}

let pinkFeathers: THREE.BufferGeometry | undefined;
function featherGeometry() {
  return pinkFeathers ??= joinCharacterParts([-1,1].flatMap(side=>[0,1,2].map(row=>({
    size: [.10,.125,.071] as [number,number,number],
    position: [side*.160,.105-row*.105,.088] as [number,number,number],
  }))));
}

/** Cloaks stay joined to the torso; broad simple shapes carry the identity. */
export function GuestTorsoExtras({ id, mats, front }: { id: string; mats: Mats; front: number }) {
  if (id === "doflamingo") return <group name="nakama-doflamingo-pink-coat">
    <CharacterPart material={identityMaterial("#de6da4")} size={[.35,.43,.073]} position={[0,-.024,.120]} radius={.018}/>
    <mesh material={identityMaterial("#f38bb9")} geometry={featherGeometry()} dispose={null}/>
    {[-1,1].map(side=><CharacterPart key={side} material={identityMaterial("#f38bb9")} size={[.11,.13,.12]}
      position={[side*.135,.175,.055]} rotation={[0,0,side*.16]} radius={.025}/>)}
  </group>;
  if (id === "mihawk") return <group name="nakama-mihawk-coat-and-cross">
    <CharacterPart material={mats.dark} size={[.33,.43,.068]} position={[0,-.024,.120]} radius={.018}/>
    <CharacterPart name="nakama-mihawk-cross" material={mats.gold} size={[.014,.080,.012]} position={[0,.074,front-.019]}/>
    <CharacterPart material={mats.gold} size={[.060,.014,.012]} position={[0,.085,front-.019]}/>
  </group>;
  return null;
}
