"use client";

import * as THREE from "three";
import { CharacterPart } from "./CharacterShapes";
import type { NakamaArchetype } from "./passenger-archetypes";
import { identityMaterial, strawMaterial } from "./PassengerIdentity";
import { SanjiHair } from "./SanjiHeadParts";

let strawHat: THREE.LatheGeometry | undefined;
let hatCord: THREE.TubeGeometry | undefined;
function getStrawHat() {
  if(strawHat)return strawHat;
  // Wide, gently curved brim and a complete rounded crown; the hat is a closed
  // shell, including its underside, instead of two thin intersecting discs.
  const points=[[0,.171],[.078,.165],[.123,.145],[.151,.105],[.162,.058],[.163,.018],
    [.224,.019],[.272,.029],[.291,.039],[.294,.028],[.273,.017],[.224,.008],
    [.153,.007],[.152,.057],[.141,.101],[.115,.134],[.074,.153],[0,.159]];
  return strawHat=new THREE.LatheGeometry(points.reverse().map(([x,y])=>new THREE.Vector2(x,y)),32);
}
function getHatCord() {
  // Runs behind the cheeks and under the neck, leaving the eyes and smile clear.
  return hatCord??=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.153,.131,.015),new THREE.Vector3(-.142,-.015,.065),
    new THREE.Vector3(-.082,-.162,.074),new THREE.Vector3(0,-.178,.072),
    new THREE.Vector3(.082,-.162,.074),new THREE.Vector3(.142,-.015,.065),
    new THREE.Vector3(.153,.131,.015),
  ]),18,.004,5,false);
}

/** Une calotte au-dessus du front, avec des mèches raccordées au volume arrière. */
export function HairStyle({ style, mats, id }: {
  style: NakamaArchetype["hairStyle"]; mats: Record<string, THREE.Material>; id?:string;
}) {
  if (id === "sanji") return <SanjiHair material={mats.hair}/>;
  return <group name="nakama-hair">
    <mesh material={mats.hair} position={[0, 0.065, 0.014]} scale={[id==="jinbe"?.15:.13,id==="chopper"?.105:.14,id==="jinbe"?.14:.12]} castShadow>
      <sphereGeometry args={[1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
    </mesh>
    <CharacterPart material={mats.hair} size={[0.24, 0.16, 0.047]} position={[0, 0.014, 0.104]} />
    {style === "spiky" && [-0.08, 0, 0.08].map((x, i) => <mesh key={x} material={mats.hair}
      position={[x, 0.19, -0.015]} rotation={[-0.18, 0, (i - 1) * 0.32]}>
      <coneGeometry args={[0.046, 0.11, 7]} />
    </mesh>)}
    {style === "flowing" && <>
      <CharacterPart material={mats.hair} size={[0.23, 0.31, 0.075]} position={[0, -0.09, 0.10]} />
      {[-0.125, 0.125].map(x => <CharacterPart key={x} material={mats.hair}
        size={[0.065, 0.31, 0.095]} position={[x, -0.055, 0.055]} rotation={[0.07, 0, 0]} />)}
      {id==="nami"&&<CharacterPart material={mats.hair} size={[.18,.049,.045]} position={[-.039,.114,-.095]} rotation={[0,0,.18]}/>}
      {id==="robin"&&[-1,1].map(side=><CharacterPart key={side} material={mats.hair} size={[.087,.062,.044]} position={[side*.064,.118,-.086]} rotation={[0,0,side*.23]}/>)}
    </>}
    {style === "swoop" && <>
      <CharacterPart material={mats.hair} size={[0.105,0.173,0.044]}
        position={[0.075,0.04,-0.128]} rotation={[0,0,-0.29]}/>
      <CharacterPart material={mats.hair} size={[.094,.05,.053]} position={[.006,.113,-.107]} rotation={[0,0,-.26]}/>
    </>}
    {style === "afro" && <mesh material={mats.hair} position={[0,0.14,id==="brook"?.096:.065]} scale={[1,id==="brook"?1.02:.9,.66]}>
      <sphereGeometry args={[id==="brook"?.23:.21,20,16]}/>
    </mesh>}
    {style === "pompadour" && <CharacterPart material={mats.hair} size={[0.18, 0.18, 0.27]}
      position={[0, 0.20, -0.015]} rotation={[-0.35, 0, 0]} />}
    {style === "topknot" && <mesh material={mats.hair} position={[0, 0.22, 0.055]}>
      <sphereGeometry args={[0.059, 16, 12]} />
    </mesh>}
    {(style === "wavy" || style === "shaggy") && [-0.12, 0.12].map(x => <CharacterPart key={x}
      material={mats.hair} size={[0.048, 0.17, 0.093]} position={[x, 0.016, 0.042]} />)}
  </group>;
}

/** Chapeaux et accessoires fidèles de l'univers One Piece */
export function Accessory({
  archetype,
  mats,
}: {
  archetype: NakamaArchetype;
  mats: Record<string, THREE.Material>;
}) {
  switch (archetype.accessory) {
    case "straw_hat":
      // Chapeau de paille de Luffy (accroché dans le dos ou sur la tête)
      return (
        <group name="nakama-luffy-straw-hat">
          <group position={[0,.125,0]} rotation={[-.07,0,0]}>
            <mesh name="nakama-hat-base" material={strawMaterial()} geometry={getStrawHat()} dispose={null} castShadow/>
            <mesh name="nakama-luffy-hat-ribbon" material={mats.accessorySub} position={[0,.040,0]}>
              <cylinderGeometry args={[.164,.164,.040,32]}/>
            </mesh>
          </group>
          <mesh name="nakama-luffy-hat-cord" material={identityMaterial("#946831")} geometry={getHatCord()} dispose={null}/>
        </group>
      );

    case "earrings":
      // 3 anneaux dorés de Zoro à l'oreille gauche
      return (
        <group position={[-0.12, -0.02, 0]}>
          {[0, 0.025, 0.05].map((ez) => (
            <mesh key={ez} material={mats.gold} position={[0, 0, ez]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.015, 0.004, 6, 12]} />
            </mesh>
          ))}
        </group>
      );

    case "goggles":
      // Lunettes de tireur d'élite d'Usopp
      return (
        <group>
          <mesh name="nakama-hat-base" material={identityMaterial("#eee6d5")} position={[0,.12,.01]}>
            <cylinderGeometry args={[.135,.15,.073,16]}/>
          </mesh>
          <CharacterPart material={identityMaterial("#e8c679")} size={[.24,.05,.03]} position={[0,.125,-.131]}/>
          <CharacterPart material={identityMaterial("#eee6d5")} size={[.066,.035,.115]} position={[.135,.13,.06]} rotation={[0,0,-.33]}/>
          <group position={[0,.14,-.148]}>
          {[-0.05, 0.05].map((gx) => (
            <mesh key={gx} material={mats.gold} position={[gx, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
            </mesh>
          ))}
          <mesh material={mats.dark} position={[0, 0, 0.02]}>
            <boxGeometry args={[0.2, 0.02, 0.02]} />
          </mesh>
          {[-.05,.05].map(x=><CharacterPart key={x} material={identityMaterial("#9cdef5")} size={[.038,.034,.009]} position={[x,0,-.014]} radius={.012}/>)}
          </group>
        </group>
      );

    case "reindeer_hat":
      // Chapeau rose à cornes de renne de Chopper
      return (
        <group position={[0,.095,0]}>
          {/* Dôme rose */}
          <mesh name="nakama-hat-base" material={identityMaterial("#5bbce1")} position={[0,.025,0]}>
            <cylinderGeometry args={[.20,.21,.03,24]}/>
          </mesh>
          <mesh material={identityMaterial("#5bbce1")} position={[0,.023,0]}>
            <sphereGeometry args={[.187,20,12,0,Math.PI*2,0,Math.PI/2]}/>
          </mesh>
          <mesh material={mats.accessory} position={[0,.056,0]}>
            <cylinderGeometry args={[.185,.185,.069,24]}/>
          </mesh>
          {/* Chopper's white X, not a medical plus sign. */}
          <mesh name="nakama-chopper-hat-cross" material={mats.accessorySub} position={[0,.074,-.192]} rotation={[0,0,Math.PI/4]}>
            <boxGeometry args={[0.08, 0.025, 0.01]} />
          </mesh>
          <mesh material={mats.accessorySub} position={[0,.074,-.192]} rotation={[0,0,Math.PI/4]}>
            <boxGeometry args={[0.025, 0.08, 0.01]} />
          </mesh>
          {/* Bois de renne */}
          {[-.18,.18].map((bx,bi)=>(
            <group key={bi} position={[bx,.15,0]} rotation={[0,0,bi===0?.46:-.46]}>
              <mesh material={identityMaterial("#70503b")}>
                <cylinderGeometry args={[.023,.032,.18,8]}/>
              </mesh>
              <mesh material={identityMaterial("#70503b")} position={[bi===0?-.04:.04,.04,0]} rotation={[0,0,bi===0?-.65:.65]}>
                <cylinderGeometry args={[0.015, 0.02, 0.08, 6]} />
              </mesh>
              <mesh material={identityMaterial("#70503b")} position={[0,.097,0]}><sphereGeometry args={[.026,8,6]}/></mesh>
            </group>
          ))}
        </group>
      );

    case "top_hat":
      // Haut-de-forme (Brook, Sabo)
      return (
        <group position={[0, archetype.hairStyle === "afro" ? 0.22 : 0.14, 0.02]}>
          <mesh name="nakama-hat-base" material={mats.accessory}>
            <cylinderGeometry args={[0.18, 0.18, 0.02, 20]} />
          </mesh>
          <mesh material={mats.accessory} position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.11, 0.12, 0.22, 20]} />
          </mesh>
          {/* Ruban coloré */}
          <mesh material={mats.accessorySub} position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.115, 0.115, 0.04, 20]} />
          </mesh>
        </group>
      );

    case "sunglasses":
      // Lunettes de soleil (Robin, Franky)
      return (
        <group position={[0,archetype.id==="robin"?.153:.11,archetype.id==="robin"?-.083:-.135]} rotation={[archetype.id==="robin"?-.4:0,0,0]}>
          <mesh material={mats.accessory}>
            <boxGeometry args={[0.19,0.035,0.026]}/>
          </mesh>
        </group>
      );

    case "white_cap":
      // Béret moucheté de Law
      return (
        <group position={[0, 0.17, 0]}>
          <mesh name="nakama-hat-base" material={mats.accessory}>
            <cylinderGeometry args={[0.15, 0.13, 0.1, 16]} />
          </mesh>
          <mesh material={mats.accessory} position={[0, 0.03, -0.08]}>
            <boxGeometry args={[0.16, 0.02, 0.06]} />
          </mesh>
        </group>
      );

    case "cowboy_hat":
      // Chapeau de cowboy d'Ace
      return (
        <group position={[0, 0.18, 0.02]}>
          <mesh name="nakama-hat-base" material={mats.accessory}>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 24]} />
          </mesh>
          <mesh material={mats.accessory} position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.11, 0.12, 0.1, 20]} />
          </mesh>
          {/* Collier de perles rouges */}
          <mesh material={mats.accessorySub} position={[0, 0.02, 0]}>
            <torusGeometry args={[0.12, 0.012, 6, 16]} />
          </mesh>
        </group>
      );

    case "horns":
      // Cornes oni de Yamato
      return (
        <group position={[0, 0.12, -0.04]}>
          {[-0.08, 0.08].map((hx, hi) => (
            <mesh
              key={hi}
              material={mats.accessory}
              position={[hx, 0.06, 0]}
              rotation={[0.2, 0, hi === 0 ? 0.35 : -0.35]}
            >
              <coneGeometry args={[0.025, 0.14, 8]} />
            </mesh>
          ))}
        </group>
      );

    default:
      return null;
  }
}

/** Objets emblématiques tenus par les nakama */
export function NakamaProp({
  prop,
  mats,
  id,
}: {
  prop?: NakamaArchetype["prop"];
  mats: Record<string, THREE.Material>;
  id?: string;
}) {
  switch (prop) {
    case "meat":
      // Gigot d'anime légendaire de Luffy
      return (
        <group position={[0.12, 1.25, -0.16]} rotation={[0.4, 0.3, -0.2]}>
          {/* Os traversant */}
          <mesh material={mats.skin}>
            <cylinderGeometry args={[0.02, 0.02, 0.28, 8]} />
          </mesh>
          {/* Viande rôtie appétissante */}
          <mesh material={mats.accessorySub} position={[0, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.16, 10]} />
          </mesh>
        </group>
      );

    case "swords":
      // One sheath for Law/Shanks; Zoro keeps his three distinct katanas.
      return (
        <group name={`nakama-${id??"zoro"}-waist-swords`} position={[.19,1.07,.13]} rotation={[-.18,.05,.14]}>
          <CharacterPart name="nakama-sword-belt-strap" material={mats.dark} size={[.13,.020,.042]} position={[0,.060,0]}/>
          {(id==="law"||id==="shanks"?[0]:[-.028,0,.028]).map((x,index)=><group key={x}
            name={`nakama-${id??"zoro"}-sheathed-sword`} position={[x,0,0]}>
            <CharacterPart material={id==="law"||id==="shanks"?mats.dark:index===0?mats.teeth:index===1?mats.red:mats.dark}
              size={[.025,.43,.029]} position={[0,-.060,0]} radius={.005}/>
            <CharacterPart material={id==="law"?mats.teeth:mats.gold} size={[.067,.014,.034]} position={[0,.154,0]}/>
            <CharacterPart material={(id??"zoro")==="zoro"&&index===0?mats.teeth:mats.dark} size={[.025,.090,.025]} position={[0,.202,0]}/>
            {id==="law"&&<>
              <CharacterPart material={mats.teeth} size={[.003,.017,.005]} position={[0,.015,-.016]}/>
              <CharacterPart material={mats.teeth} size={[.015,.003,.005]} position={[0,.015,-.016]}/>
            </>}
          </group>)}
        </group>
      );

    case "book":
      // Livre d'histoire ancienne de Robin
      return (
        <group position={[0, 1.22, -0.1]} rotation={[-0.3, 0, 0]}>
          <mesh material={mats.shirt}>
            <boxGeometry args={[0.2, 0.03, 0.15]} />
          </mesh>
        </group>
      );

    case "violin":
      // Violon de Brook
      return (
        <group position={[-0.05, 1.25, -0.12]} rotation={[0.3, 0.2, 0.4]}>
          <mesh material={mats.accessory}>
            <boxGeometry args={[0.09, 0.18, 0.04]} />
          </mesh>
          <mesh material={mats.dark} position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.14, 6]} />
          </mesh>
        </group>
      );

    case "tangerine":
      // Mandarine de Nami
      return (
        <mesh material={mats.accessory} position={[0.15, 1.2, -0.12]}>
          <sphereGeometry args={[0.04, 10, 10]} />
        </mesh>
      );

    case "sake":
      // Gourde de saké de Jinbe
      return (
        <group position={[0.18, 1.15, -0.1]}>
          <mesh material={mats.skin}>
            <sphereGeometry args={[0.06, 10, 10]} />
          </mesh>
          <mesh material={mats.skin} position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.05, 8]} />
          </mesh>
        </group>
      );

    case "slingshot":
    case "cane":
    default:
      return null;
  }
}
