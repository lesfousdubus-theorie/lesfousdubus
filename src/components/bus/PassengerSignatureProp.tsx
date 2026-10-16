"use client";

import type * as THREE from "three";
import { CharacterPart } from "./CharacterShapes";
import { identityMaterial } from "./PassengerIdentity";

/** Accessoires courts attachés aux mains : ils suivent le poignet, jamais le siège. */
export default function PassengerSignatureProp({ id, side, mats }: {id:string;side:number;mats:Record<string,THREE.Material>}) {
  if(id==="zoro"||(side>0&&["law","shanks","mihawk"].includes(id))) return <group name={`nakama-${id}-sword`} rotation={[.2,0,0]}>
    <CharacterPart name={`nakama-${id}-sword-grip`} material={mats.dark} size={[.028,.10,.028]} position={[0,-.015,0]}/>
    <CharacterPart name={`nakama-${id}-sword-guard`} material={id==="law"?mats.teeth:mats.gold} size={[id==="mihawk"?.16:.085,.012,.032]} position={[0,-.069,0]}/>
    <CharacterPart name={`nakama-${id}-sword-blade`} material={id==="mihawk"?mats.dark:mats.steel}
      size={[id==="mihawk"?.032:.022,id==="mihawk"?.35:.25,.012]} position={[0,id==="mihawk"?-.248:-.198,0]}/>
  </group>;
  // The whole Clima-Tact is across the palm, rather than buried along the forearm.
  if(id==="nami"&&side>0)return <group name="nakama-nami-staff" position={[0,0,-.054]}>
    <CharacterPart name="nakama-nami-staff-shaft" material={mats.turquoise} size={[.54,.022,.022]}/>
    <CharacterPart name="nakama-nami-staff-grip" material={identityMaterial("#1977a6")} size={[.096,.028,.028]}/>
    {[-.145,.145].map(x=><CharacterPart key={x} name="nakama-nami-staff-coupler" material={mats.gold}
      size={[.012,.030,.030]} position={[x,0,0]}/>)}
    {[-.286,.286].map(x=><mesh key={x} name="nakama-nami-staff-tip" material={mats.turquoise} position={[x,0,0]}>
      <sphereGeometry args={[.028,10,8]}/>
    </mesh>)}
  </group>;
  if(id==="usopp"&&side<0)return <group name="nakama-usopp-slingshot" position={[0,0,-.026]}>
    <CharacterPart name="nakama-usopp-slingshot-grip" material={identityMaterial("#815c31")} size={[.025,.135,.025]} position={[0,-.033,0]}/>
    {[-1,1].map(s=><CharacterPart key={s} name="nakama-usopp-slingshot-fork" material={identityMaterial("#44753c")}
      size={[.023,.105,.026]} position={[s*.028,-.124,0]} rotation={[0,0,s*.48]}/>)}
    <CharacterPart name="nakama-usopp-slingshot-band" material={mats.teeth} size={[.110,.007,.009]} position={[0,-.1705,0]}/>
  </group>;
  if(id==="brook")return side<0?<group rotation={[0,0,.5]}>
    <CharacterPart material={mats.accessorySub} size={[.11,.16,.036]} position={[0,-.08,0]} radius={.04}/>
    <CharacterPart material={mats.dark} size={[.023,.19,.026]} position={[0,-.22,0]}/>
    <CharacterPart material={mats.teeth} size={[.004,.25,.004]} position={[0,-.15,-.017]}/>
  </group>:<CharacterPart material={mats.accessorySub} size={[.012,.29,.014]}/>;
  if(id==="sabo"&&side>0)return <group name="nakama-sabo-pipe" position={[0,0,-.062]} rotation={[0,0,Math.PI/2]}>
    <CharacterPart name="nakama-sabo-pipe-grip" material={mats.steel} size={[.33,.027,.027]}/>
    <CharacterPart material={mats.steel} size={[.09,.080,.027]} position={[.173,-.031,0]}/>
  </group>;
  if(id==="yamato"&&side>0)return <group name="nakama-yamato-mace" position={[0,0,-.064]} rotation={[0,0,Math.PI/2]}>
    <CharacterPart name="nakama-yamato-mace-grip" material={mats.dark} size={[.027,.31,.027]} position={[0,-.12,0]}/>
    <CharacterPart material={mats.dark} size={[.07,.14,.07]} position={[0,-.19,0]}/>
  </group>;
  if(id==="vivi")return <group name="nakama-vivi-slasher" position={[0,0,-.062]}>
    <CharacterPart name="nakama-vivi-slasher-grip" material={mats.gold} size={[.018,.145,.028]}/>
    <mesh name="nakama-vivi-slasher-ring" material={mats.turquoise}><torusGeometry args={[.065,.006,6,16]}/></mesh>
  </group>;
  if(id==="doflamingo")return <group name="nakama-doflamingo-threads">
    {[-1,0,1].map(fan=><CharacterPart key={fan} material={mats.teeth} size={[.22,.003,.003]}
      position={[side*.11,fan*.013,-.052]} rotation={[0,0,fan*.12]}/>) }
  </group>;
  if(id==="foudubustv"&&side<0)return <>
    <CharacterPart material={mats.dark} size={[.071,.12,.015]} radius={.01}/>
    <CharacterPart material={mats.turquoise} size={[.058,.093,.004]} position={[0,0,-.01]}/>
  </>;
  return null;
}
