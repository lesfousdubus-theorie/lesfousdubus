"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createCardGameState, sampleCardGame, type PassengerCardPair } from "@/lib/passenger-card-game";

interface HandAnchor { object: THREE.Mesh; center: THREE.Vector3; front: THREE.Vector3; grip: THREE.Vector3 }
export interface PassengerCardActor { hands: [HandAnchor, HandAnchor] }
export type PassengerCardActors = Map<number, PassengerCardActor>;

/** Capture the actual rendered palm, including Chopper's scaled limbs and Brook's bones. */
export function getPassengerCardActor(root: THREE.Group): PassengerCardActor | null {
  const anchors: HandAnchor[] = [];
  for (const side of ["left", "right"]) {
    const object = root.getObjectByName(`nakama-hand-${side}`) as THREE.Mesh | undefined;
    if (!object?.geometry) return null;
    object.geometry.computeBoundingBox();
    const bounds = object.geometry.boundingBox!;
    const center = bounds.getCenter(new THREE.Vector3());
    const front = center.clone(); front.z = bounds.min.z - .002;
    // The passed card is pinched at its top edge, slightly inside the block hand.
    // This also accommodates Franky's wide palms and Brook's thinner bones.
    const grip = front.clone(); grip.z += Math.min(.02, (bounds.max.z - bounds.min.z) * .4); grip.y -= .02;
    anchors.push({ object, center, front, grip });
  }
  return { hands: anchors as [HandAnchor, HandAnchor] };
}

const white = new THREE.MeshStandardMaterial({ color: "#fff8e7", roughness: .86 });
const blue = new THREE.MeshStandardMaterial({ color: "#2445a4", roughness: .8 });
const red = new THREE.MeshStandardMaterial({ color: "#d62643", roughness: .8 });
const black = new THREE.MeshStandardMaterial({ color: "#18213a", roughness: .8 });
const pale = new THREE.MeshStandardMaterial({ color: "#b9d6ff", roughness: .8 });
const cardGeometry = new THREE.BoxGeometry(.058, .084, .0035);
const backGeometry = new THREE.PlaneGeometry(.049, .075);
const diamond = new THREE.Shape(); diamond.moveTo(0, .006); diamond.lineTo(.0045, 0); diamond.lineTo(0, -.006); diamond.lineTo(-.0045, 0); diamond.closePath();
const pipGeometry = new THREE.ShapeGeometry(diamond);
const tinyGeometry = new THREE.PlaneGeometry(.0014, .065);

/** A front with distinct pips and a patterned blue back stays readable on either side. */
function PlayingCard({ redPips = false, pips = 1 }: { redPips?: boolean; pips?: number }) {
  return <group>
    <mesh geometry={cardGeometry} material={white} dispose={null}/>
    <group position={[0, 0, -.0019]} rotation={[0, Math.PI, 0]}>
      <mesh geometry={pipGeometry} material={redPips ? red : black} position={[-.018, .029, 0]} dispose={null}/>
      <mesh geometry={pipGeometry} material={redPips ? red : black} position={[.018, -.029, 0]} dispose={null}/>
      {Array.from({ length: pips }, (_, index) => <mesh key={index} geometry={pipGeometry} material={redPips ? red : black}
        position={[pips === 1 ? 0 : (index % 2 ? .011 : -.011), pips < 3 ? 0 : index < 2 ? .016 : -.016, 0]} dispose={null}/>)}
    </group>
    <group position={[0, 0, .0019]}>
      <mesh geometry={backGeometry} material={blue} dispose={null}/>
      {[-.015, 0, .015].map(x => <mesh key={x} geometry={tinyGeometry} material={pale} position={[x, 0, .0002]} rotation={[0, 0, .27]} dispose={null}/>)}
    </group>
  </group>;
}

function CardFan() {
  return <group>{[-1, 0, 1].map((side, index) => <group key={side} position={[side * .012, Math.abs(side) * -.004, side * .004]}
    rotation={[0, 0, -side * .18]}><PlayingCard redPips={index % 2 === 0} pips={index + 1}/></group>)}</group>;
}

function placeFromHand(parent: THREE.Group, object: THREE.Group | null, anchor: HandAnchor, point: THREE.Vector3,
  rotation: THREE.Quaternion, inverse: THREE.Quaternion, passing = false) {
  anchor.object.updateWorldMatrix(true, false);
  point.copy(passing ? anchor.grip : anchor.front); anchor.object.localToWorld(point); parent.worldToLocal(point);
  anchor.object.getWorldQuaternion(rotation).premultiply(inverse);
  object?.position.copy(point); object?.quaternion.copy(rotation);
}

export default function PassengerCardGame({ pair, actors, hornPulse, partyOn, reducedMotion }: {
  pair: PassengerCardPair; actors: PassengerCardActors; hornPulse: number; partyOn: boolean; reducedMotion: boolean;
}) {
  const root = useRef<THREE.Group>(null), firstDeck = useRef<THREE.Group>(null), secondDeck = useRef<THREE.Group>(null), transfer = useRef<THREE.Group>(null);
  const scratch = useMemo(() => ({ state: createCardGameState(), points: [new THREE.Vector3(), new THREE.Vector3()],
    rotations: [new THREE.Quaternion(), new THREE.Quaternion()], inverse: new THREE.Quaternion(), center: new THREE.Vector3(),
    handCenter: new THREE.Vector3(), otherCenter: new THREE.Vector3() }), []);
  useFrame(({ clock }) => {
    const first = actors.get(pair.firstSeat), second = actors.get(pair.secondSeat);
    const blocked = partyOn || reducedMotion || (hornPulse > 0 && performance.now() - hornPulse < 1800);
    const state = sampleCardGame(scratch.state, clock.elapsedTime, pair.pairIndex, blocked);
    if (!root.current) return;
    root.current.visible = state.active && Boolean(first && second);
    if (!root.current.visible || !first || !second) return;
    root.current.updateWorldMatrix(true, false);
    root.current.getWorldQuaternion(scratch.inverse).invert();
    // The outside hand keeps a real fan; the two inside hands meet over the bench.
    placeFromHand(root.current, firstDeck.current, first.hands[0], scratch.center, scratch.rotations[0], scratch.inverse);
    placeFromHand(root.current, secondDeck.current, second.hands[1], scratch.center, scratch.rotations[1], scratch.inverse);
    placeFromHand(root.current, null, first.hands[1], scratch.points[0], scratch.rotations[0], scratch.inverse, true);
    placeFromHand(root.current, null, second.hands[0], scratch.points[1], scratch.rotations[1], scratch.inverse, true);
    transfer.current?.position.lerpVectors(scratch.points[0], scratch.points[1], state.handoff);
    transfer.current?.quaternion.slerpQuaternions(scratch.rotations[0], scratch.rotations[1], state.handoff);
    first.hands[1].object.localToWorld(scratch.handCenter.copy(first.hands[1].center));
    second.hands[0].object.localToWorld(scratch.otherCenter.copy(second.hands[0].center));
    root.current.userData.cycle = state.cycle;
    root.current.userData.handoff = state.handoff;
    root.current.userData.transfer = state.transfer;
    root.current.userData.ownerSeatIndex = state.owner ? pair.secondSeat : pair.firstSeat;
    root.current.userData.palmDistance = scratch.handCenter.distanceTo(scratch.otherCenter);
  }, -1);
  return <group ref={root} name={`nakama-card-pair-${pair.pairIndex}`} visible={false}
    userData={{ pairIndex: pair.pairIndex, firstSeat: pair.firstSeat, secondSeat: pair.secondSeat, maxCards: 7 }}>
    <group ref={firstDeck} name={`card-deck-seat-${pair.firstSeat}`}><CardFan/></group>
    <group ref={secondDeck} name={`card-deck-seat-${pair.secondSeat}`}><CardFan/></group>
    <group ref={transfer} name={`card-exchange-${pair.pairIndex}`}><PlayingCard redPips pips={4}/></group>
  </group>;
}
