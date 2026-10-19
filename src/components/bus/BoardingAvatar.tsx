"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { JOURNEY_MAX_DT, type JourneyState } from "@/lib/bus-journey";
import { getWalkingLegPose, BODY_BEHIND_HIP } from "@/lib/passenger-gait";
import { getNakamaArchetype } from "./passenger-archetypes";
import { getArchetypeMaterials } from "./Passengers";
import { CharacterPart } from "./CharacterShapes";
import PassengerHead from "./PassengerHead";
import { PassengerNeck, PassengerTorso } from "./PassengerAnatomy";
import { getPassengerProportions, getPassengerSkeleton } from "@/lib/passenger-proportions";
import { PassengerPelvis } from "./PassengerLowerBody";
import { PassengerUpperArm, PassengerForearm, PassengerFoot, passengerCalfMaterial } from "./PassengerIdentity";
import { blendPassengerPose, createPassengerPose, samplePassengerPose } from "@/lib/passenger-motion";

/** Le même nakama attend, marche, s'assoit, puis devient le corps en vue subjective. */
export default function BoardingAvatar({ journey, passengerIndex, avatarId, physicalSeatIndex, partyOn, hornPulse, reducedMotion }: {
  journey: React.RefObject<JourneyState>; passengerIndex: number | null;
  avatarId?: string | null;
  physicalSeatIndex: number;
  partyOn: boolean; hornPulse: number; reducedMotion: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const upperBody = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const shins = useRef<(THREE.Group | null)[]>([]);
  const feet = useRef<(THREE.Group | null)[]>([]);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const elbows = useRef<(THREE.Group | null)[]>([]);
  const motion = useRef({ previous: new THREE.Vector3(), phase: "", distance: 0, strength: 0 });
  const headWorld = useMemo(() => new THREE.Vector3(), []);
  const targetPose=useRef(createPassengerPose()),pose=useRef(createPassengerPose());
  const archetype = getNakamaArchetype(passengerIndex, avatarId);
  const mats = useMemo(() => getArchetypeMaterials(archetype), [archetype]);
  const proportions = getPassengerProportions(archetype.id);
  const skeleton = getPassengerSkeleton(archetype.id);
  useFrame(({ camera,clock }, dt) => {
    const s = journey.current;
    if (!root.current || !hips.current || !head.current) return;
    const gait = motion.current;
    if (gait.phase !== s.phase) {
      gait.phase = s.phase; gait.distance = 0; gait.strength = 0;
      gait.previous.copy(s.position);
    }
    root.current.visible = s.avatarVisible;
    if (!s.avatarVisible) { gait.previous.copy(s.position); gait.strength = 0; return; }
    // La hauteur des marches ne doit pas accélérer artificiellement la foulée.
    const travel = s.walking ? Math.hypot(s.position.x - gait.previous.x, s.position.z - gait.previous.z) : 0;
    gait.distance += travel;
    gait.previous.copy(s.position);
    const frameDt = Math.min(dt, JOURNEY_MAX_DT);
    gait.strength = THREE.MathUtils.damp(gait.strength, s.walking ? Math.min(1, travel / Math.max(frameDt, 0.001) / 0.5) : 0, 12, frameDt);
    const cycle = gait.distance / skeleton.strideDistance * Math.PI * 2;
    const sit = s.sitting;
    const celebrate=s.phase==="inside"&&(partyOn||(hornPulse>0&&(performance.now()-hornPulse)<1800));
    samplePassengerPose(targetPose.current,clock.elapsedTime,passengerIndex??0,0,proportions.torsoWidth,
      celebrate&&hornPulse>0?(performance.now()-hornPulse)/1000:Infinity,celebrate&&partyOn,reducedMotion,archetype.id);
    if(!celebrate){targetPose.current.torsoRoll=0;targetPose.current.leftX=.12;targetPose.current.rightX=.12;targetPose.current.leftElbowX=1.05;targetPose.current.rightElbowX=1.05;}
    // A walking avatar stays quiet; seated free-view keeps the same social face as its companions.
    if(s.phase!=="inside") targetPose.current.activity="idle";
    blendPassengerPose(pose.current,targetPose.current,dt,reducedMotion);
    root.current.position.copy(s.position);
    const heading = s.heading * (1 - sit);
    const turn = Math.atan2(Math.sin(heading - root.current.rotation.y), Math.cos(heading - root.current.rotation.y));
    root.current.rotation.y += turn * (1 - Math.exp(-24 * Math.min(dt, 0.25)));
    const bob = Math.sin(cycle * 2) * 0.009 * gait.strength * (1 - sit);
    hips.current.position.set(0, THREE.MathUtils.lerp(skeleton.standingHipHeight, skeleton.seatedHipHeight, sit) + bob, skeleton.seatedHipZ * sit);
    if(upperBody.current)upperBody.current.rotation.z=pose.current.torsoRoll;
    // getWorldPosition ne met à jour que la chaîne des parents de la tête.
    head.current.getWorldPosition(headWorld);
    // La tête disparaît avant que l'objectif ne puisse traverser sa géométrie.
    head.current.visible = camera.position.distanceTo(headWorld) > 0.55;
    legs.current.forEach((leg, index) => {
      const legPose = getWalkingLegPose(cycle + index * Math.PI, hips.current!.position.y, gait.strength, sit, archetype.id);
      const upper = legPose.upper;
      const lower = legPose.lower;
      if (leg) leg.rotation.x = upper;
      const shin = shins.current[index];
      const kick = celebrate && index===1 ? pose.current.rightKick : 0;
      if (shin) shin.rotation.x = lower - kick;
      const foot = feet.current[index];
      if (foot) foot.rotation.x = -upper - lower + kick;
      const arm = arms.current[index];
      if (arm) arm.rotation.x = (1 - sit) * Math.cos(cycle + index * Math.PI) * 0.3 * gait.strength + (index===0?pose.current.leftX:pose.current.rightX)*sit;
      if (arm) arm.rotation.z = sit*(index===0?pose.current.leftZ:pose.current.rightZ);
      const elbow = elbows.current[index];
      if (elbow) elbow.rotation.x = 0.15*(1-sit) + sit*(index===0?pose.current.leftElbowX:pose.current.rightElbowX);
    });
  });
  return <group ref={root} name="bus-boarding-avatar" userData={{ passengerKind: "visitor", physicalSeatIndex,
    seatIndex: passengerIndex, archetypeId: archetype.id, row: Math.floor(physicalSeatIndex / 4), seatInRow: physicalSeatIndex % 4 }} visible={false}>
    <group ref={hips} name="nakama-hips">
      <PassengerPelvis material={mats.pants} archetype={archetype}/>
      {[-skeleton.hipSpacing, skeleton.hipSpacing].map((x, index) => <group key={x} ref={node => { legs.current[index] = node; }} name={`avatar-thigh-${index}`} position={[x, 0, 0]}>
        <CharacterPart material={archetype.id==="franky"?mats.skin:mats.pants} position={[0,-skeleton.thighLength/2,0]} size={[archetype.id==="chopper"?.088:archetype.id==="brook"?.087:.13,skeleton.thighLength+(archetype.id==="chopper"?.0125:.025),archetype.id==="chopper"?.09:.14]} radius={archetype.id==="chopper"?.025:undefined} castShadow/>
        <group ref={node => { shins.current[index] = node; }} name={`avatar-shin-${index}`} position={[0, -skeleton.thighLength, 0]}>
          <CharacterPart material={passengerCalfMaterial(archetype,mats)} position={[0,-skeleton.shinLength/2,0]} size={[archetype.id==="chopper"?.075:archetype.id==="brook"?.065:.12,skeleton.shinLength+(archetype.id==="chopper"?.01:.02),archetype.id==="chopper"?.075:archetype.id==="brook"?.065:.12]} radius={archetype.id==="chopper"?.024:undefined} castShadow/>
          <group ref={node => { feet.current[index] = node; }} position={[0, -skeleton.shinLength, 0]}>
            <group scale={[skeleton.footScale,skeleton.footScale,skeleton.footScale]}><PassengerFoot archetype={archetype} mats={mats}/></group>
          </group>
        </group>
      </group>)}
      <group ref={upperBody}>
      <group position={[0, skeleton.torsoAboveHip, BODY_BEHIND_HIP]}><PassengerTorso archetype={archetype} mats={mats} /></group>
      {[-1, 1].map((side, index) => <group key={side} ref={node => { arms.current[index] = node; }} position={[side * (proportions.torsoWidth / 2 - 0.018), skeleton.torsoAboveHip + skeleton.shoulderY, BODY_BEHIND_HIP]}>
        <group scale={[skeleton.armWidthScale,skeleton.armScale,skeleton.armWidthScale]}><PassengerUpperArm archetype={archetype} mats={mats} side={side} width={proportions.armWidth}/></group>
        <group ref={node => { elbows.current[index] = node; }} position={[0, -skeleton.upperArmLength, 0]}>
          <group scale={[skeleton.armWidthScale,skeleton.armScale,skeleton.armWidthScale]}><PassengerForearm archetype={archetype} mats={mats} side={side} width={proportions.armWidth}/></group>
        </group>
      </group>)}
      <group ref={head} name="bus-boarding-avatar-head" position={[0, skeleton.neckAboveHip, BODY_BEHIND_HIP]}>
        <PassengerNeck archetype={archetype} mats={mats} />
        <group position={[0, skeleton.headAboveNeck, 0]}><PassengerHead archetype={archetype} mats={mats}
          motion={pose} index={passengerIndex ?? 0} reducedMotion={reducedMotion}/></group>
      </group>
      </group>
    </group>
  </group>;
}
