"use client";

import * as THREE from "three";
import { CharacterPart, joinCharacterParts } from "./CharacterShapes";
import type { NakamaArchetype } from "./passenger-archetypes";

const materials = new Map<string, THREE.MeshStandardMaterial>();
let wovenStraw: THREE.MeshStandardMaterial | undefined;
export function strawMaterial() {
  if(wovenStraw)return wovenStraw;
  const canvas=document.createElement("canvas");canvas.width=128;canvas.height=128;
  const c=canvas.getContext("2d")!;c.fillStyle="#edc25a";c.fillRect(0,0,128,128);
  c.lineWidth=2;
  for(let y=-128;y<256;y+=12){c.strokeStyle="#c39338";c.beginPath();c.moveTo(0,y);c.lineTo(128,y+128);c.stroke();c.strokeStyle="#ffe49a";c.beginPath();c.moveTo(0,y+5);c.lineTo(128,y-123);c.stroke();}
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2,1);map.anisotropy=2;
  return wovenStraw=new THREE.MeshStandardMaterial({map,roughness:.88});
}
export function identityMaterial(color: string, metallic = false) {
  const key = color + (metallic ? "-metal" : "");
  let material = materials.get(key);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness: metallic ? .4 : .8, metalness: metallic ? .6 : 0 });
    materials.set(key, material);
  }
  return material;
}

/** A few attached orange locks keep Nami readable without a floating forehead bar. */
export function NamiHair({ material }: { material: THREE.Material }) {
  return <group name="nakama-hair">
    <CharacterPart name="nakama-nami-hair-cap" material={material} size={[.245,.095,.244]} position={[0,.112,.008]} radius={.035} detail={2}/>
    <CharacterPart material={material} size={[.236,.40,.067]} position={[0,-.074,.097]} radius={.022}/>
    {[-1,1].map(side=><CharacterPart key={side} material={material} size={[.055,.32,.105]}
      position={[side*.116,-.048,.020]} radius={.016}/>)}
    <CharacterPart material={material} size={[.155,.035,.034]} position={[-.027,.119,-.123]} rotation={[0,0,.14]} radius={.009}/>
    <CharacterPart material={material} size={[.063,.058,.033]} position={[.082,.098,-.120]} rotation={[0,0,-.17]} radius={.009}/>
  </group>;
}

/** Left-ear pendants remain connected to the square ear instead of horizontal hoops. */
export function ZoroEarrings({ material }: { material: THREE.Material }) {
  return <group name="nakama-zoro-earrings" position={[-.141,0,0]}>
    {[-.016,0,.016].map(z=><group key={z}>
      <CharacterPart name="nakama-zoro-earring-stud" material={material} size={[.011,.009,.011]} position={[0,-.026,z]} radius={.002}/>
      <CharacterPart name="nakama-zoro-earring-drop" material={material} size={[.009,.040,.008]} position={[0,-.048,z]} radius={.002}/>
    </group>)}
  </group>;
}

const stars = new Map<number, THREE.ShapeGeometry>();
function starShape(radius: number) {
  let shape = stars.get(radius);
  if (!shape) {
    const outline = new THREE.Shape();
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? radius * .43 : radius;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i) outline.lineTo(x, y); else outline.moveTo(x, y);
    }
    shape = new THREE.ShapeGeometry(outline); stars.set(radius, shape);
  }
  return shape;
}

let tattooMaterial: THREE.MeshStandardMaterial | undefined;
function namiTattoo() {
  if (tattooMaterial) return tattooMaterial;
  const canvas = document.createElement("canvas"); canvas.width = 128; canvas.height = 192;
  const c = canvas.getContext("2d")!;
  c.strokeStyle = "#253a70"; c.lineWidth = 8; c.lineCap = "round";
  c.beginPath(); c.moveTo(77,23); c.bezierCurveTo(23,24,25,80,80,93); c.bezierCurveTo(112,99,97,129,64,139); c.bezierCurveTo(36,145,38,174,63,175); c.stroke();
  c.beginPath(); c.moveTo(55,128); c.lineTo(27,113); c.moveTo(55,129); c.lineTo(34,153); c.stroke();
  c.fillStyle = "#e98729"; c.beginPath(); c.arc(69,37,14,0,Math.PI*2); c.fill();
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  tattooMaterial = new THREE.MeshStandardMaterial({map, transparent:true, alphaTest:.05, depthWrite:false, roughness:.9});
  return tattooMaterial;
}

type LimbProps = { archetype:NakamaArchetype; mats:Record<string,THREE.Material>; side:number; width:number };

/** Les épaules gardent les pivots communs ; seule la silhouette et la tenue changent. */
export function PassengerUpperArm({ archetype, mats, side, width }: LimbProps) {
  if (archetype.id === "shanks" && side < 0) return null;
  const bare = ["luffy", "nami", "usopp", "chopper", "franky", "robin", "doflamingo", "boa_hancock", "vivi"].includes(archetype.id);
  return <group>
    <CharacterPart material={bare ? mats.skin : mats.shirt} position={[0,-.095,0]} size={[width,.23,width+.02]}/>
    {archetype.id === "nami" && side < 0 && <mesh name="nakama-nami-tattoo" material={namiTattoo()} position={[-width/2-.003,-.10,0]} rotation={[0,-Math.PI/2,0]} dispose={null}>
      <planeGeometry args={[.075,.16]}/>
    </mesh>}
    {archetype.id === "franky" && <>
      <CharacterPart material={mats.red} size={[.18,.125,.17]} position={[0,-.021,.007]} radius={.04}/>
      <CharacterPart material={mats.steel} size={[.033,.09,.11]} position={[side*.081,-.026,.008]}/>
    </>}
    {archetype.id === "chopper" && <CharacterPart material={identityMaterial("#d29a5d")} size={[.065,.055,.04]} position={[0,-.11,-width/2-.004]}/>}
  </group>;
}

let skeletonForearm: THREE.BufferGeometry | undefined;
let skeletonHand: THREE.BufferGeometry | undefined;
function brookBones() {
  skeletonForearm ??= joinCharacterParts([-.018,.018].map(x=>({size:[.022,.205,.027],position:[x,-.105,0]})));
  skeletonHand ??= joinCharacterParts([
    {size:[.071,.057,.041],position:[0,-.215,0]},
    ...[-.025,-.008,.008,.025].map((x,i)=>({size:[.012,.031+(i===1||i===2?.008:0),.017] as [number,number,number],position:[x,-.251,-.002] as [number,number,number]})),
    {size:[.021,.034,.02],position:[-.04,-.216,-.003]},
  ]);
  return {arm:skeletonForearm,hand:skeletonHand};
}

/** Avant-bras anatomiques distincts, attachés aux coudes de l'animation existante. */
export function PassengerForearm({ archetype, mats, side, width, handName }: LimbProps & {handName?:string}) {
  if (archetype.id === "shanks" && side < 0) return null;
  if (archetype.id === "brook") {
    const bones = brookBones();
    return <>
      <mesh material={mats.skin} geometry={bones.arm} dispose={null}/>
      <mesh name={handName} material={mats.skin} geometry={bones.hand} dispose={null}/>
    </>;
  }
  if (archetype.id === "franky") return <>
    <CharacterPart material={identityMaterial("#65a6d1",true)} position={[0,-.105,0]} size={[.176,.215,.177]} radius={.035}/>
    <CharacterPart material={mats.steel} position={[0,-.19,0]} size={[.181,.029,.181]}/>
    <mesh name="nakama-franky-star" material={identityMaterial("#163365")} geometry={starShape(.052)} position={[0,-.097,-.093]} rotation={[0,Math.PI,0]} dispose={null}/>
    <CharacterPart name={handName} material={identityMaterial("#8fb9d2",true)} position={[0,-.228,0]} size={[.13,.085,.14]} radius={.02}/>
    {[-.033,0,.033].map(x=><CharacterPart key={x} material={mats.steel} size={[.018,.028,.009]} position={[x,-.218,-.074]}/>)}
  </>;
  return <>
    <CharacterPart material={mats.skin} position={[0,-.1,0]} size={[width*.85,.22,width*.95]}/>
    <CharacterPart name={handName} material={archetype.id === "chopper" ? identityMaterial("#523124") : mats.skin}
      position={[0,-.22,0]} size={archetype.id === "jinbe" ? [.116,.081,.119] : [.1,.08,.105]} radius={.015}/>
    {archetype.id === "chopper" && <CharacterPart material={identityMaterial("#c38845")} size={[.008,.048,.112]} position={[0,-.233,0]}/>}
    {archetype.id === "jinbe" && <CharacterPart material={identityMaterial("#176698")} size={[.082,.011,.007]} position={[0,-.225,-.063]}/>}
    {side > 0 && archetype.id === "nami" && <CharacterPart material={mats.gold} size={[width*.96,.014,width*1.06]} position={[0,-.174,0]}/>}
  </>;
}

/** Pieds partagés entre l'avatar debout et assis, sans modifier la hauteur du sol. */
export function PassengerFoot({ archetype, mats, name }: {archetype:NakamaArchetype; mats:Record<string,THREE.Material>; name?:string}) {
  if (archetype.id === "luffy" || archetype.id === "jinbe") return <group name={name}>
    <CharacterPart material={mats.skin} position={[0,-.025,-.035]} size={[.14,.07,.22]} radius={.015}/>
    <CharacterPart material={identityMaterial("#78543c")} position={[0,-.071,-.035]} size={[.15,.018,.234]}/>
    <CharacterPart material={identityMaterial("#5a4132")} position={[0,.012,-.058]} size={[.105,.013,.025]} rotation={[0,.25,0]}/>
    <CharacterPart material={identityMaterial("#5a4132")} position={[0,.012,-.082]} size={[.024,.013,.066]}/>
  </group>;
  return <CharacterPart name={name} material={archetype.id === "chopper" ? identityMaterial("#523124") : mats.shoes}
    position={[0,-.03,-.035]} size={[.15,.1,.23]} radius={archetype.id === "chopper" ? .025 : .018}/>;
}

export function passengerCalfMaterial(archetype:NakamaArchetype,mats:Record<string,THREE.Material>) {
  return ["luffy","franky","chopper","brook"].includes(archetype.id) ? mats.skin : mats.pants;
}
