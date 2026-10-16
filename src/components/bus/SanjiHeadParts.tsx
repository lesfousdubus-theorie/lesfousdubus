"use client";

import * as THREE from "three";
import { CharacterPart } from "./CharacterShapes";

let sweptFringe: THREE.ExtrudeGeometry | undefined;
function getSweptFringe() {
  if (sweptFringe) return sweptFringe;
  // Post-timeskip: the right eye is positive X (the face looks toward -Z).
  // One closed, tapered lock covers that eye while clearing the nose and mouth.
  const outline = new THREE.Shape();
  outline.moveTo(-.042,.126);
  for (const [x,y] of [[.112,.128],[.124,.045],[.093,-.038],[.053,-.009],[.018,.076],[-.042,.102]]) outline.lineTo(x,y);
  outline.closePath();
  sweptFringe = new THREE.ExtrudeGeometry(outline, {
    depth: .027, steps: 1, bevelEnabled: true, bevelSize: .002,
    bevelThickness: .002, bevelSegments: 1, curveSegments: 1,
  });
  sweptFringe.translate(0,0,-.134);
  return sweptFringe;
}

/** Closed blond volumes retain the bus's simple block style. */
export function SanjiHair({ material }: { material: THREE.Material }) {
  return <group name="nakama-hair">
    <CharacterPart name="nakama-sanji-hair-cap" material={material} size={[.25,.075,.235]}
      position={[0,.120,.012]} radius={.025} detail={2}/>
    <CharacterPart name="nakama-sanji-hair-back" material={material} size={[.244,.17,.055]}
      position={[0,.014,.097]} radius={.018}/>
    <CharacterPart name="nakama-sanji-hair-temple" material={material} size={[.038,.13,.11]}
      position={[.117,.033,.037]} radius={.010}/>
    <mesh name="nakama-sanji-fringe" material={material} geometry={getSweptFringe()} dispose={null} castShadow/>
  </group>;
}
