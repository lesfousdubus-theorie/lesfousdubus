"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PassengerProfile } from "@/types/passenger";
import { JOURNEY_MAX_DT, type JourneyState } from "@/lib/bus-journey";
import { PASSENGER_SEAT_X } from "@/lib/bus-occupancy";
import { getWalkingLegPose, BODY_BEHIND_HIP, CABIN_FLOOR_Y } from "@/lib/passenger-gait";
import { getNakamaArchetype } from "./passenger-archetypes";
import { getArchetypeMaterials } from "./Passengers";
import { CharacterPart } from "./CharacterShapes";
import { NakamaProp } from "./PassengerAppearance";
import PassengerHead from "./PassengerHead";
import { PassengerNeck, PassengerTorso } from "./PassengerAnatomy";
import { getPassengerProportions, getPassengerSkeleton } from "@/lib/passenger-proportions";
import { hasPassengerSkirt, PassengerPelvis } from "./PassengerLowerBody";
import { identityMaterial, PassengerUpperArm, PassengerForearm, PassengerFoot, passengerCalfMaterial } from "./PassengerIdentity";
import { blendPassengerPose, createPassengerPose, getPassengerSignatureGain, samplePassengerPose } from "@/lib/passenger-motion";
import PassengerSignatureProp from "./PassengerSignatureProp";
import { keepPassengerHandsApart } from "@/lib/passenger-space";
import { getVisiblePassengerName, PassengerNameTag } from "./PassengerNameTags";
import { getPassengerNameHeightFromHip, usePassengerHeadHeight } from "./usePassengerHeadHeight";

/** Le même nakama attend, marche, s'assoit, puis devient le corps en vue subjective. */
const BoardingAvatar = memo(function BoardingAvatar({ journey, passengerIndex, avatarId, physicalSeatIndex = 0, physicalSeatIndexRef, profile, onSelect, partyOn, hornPulse, reducedMotion, firstPerson = false }: {
  journey: React.RefObject<JourneyState>; passengerIndex: number | null;
  avatarId?: string | null;
  physicalSeatIndex?: number;
  physicalSeatIndexRef?: React.RefObject<number>;
  profile?: PassengerProfile;
  onSelect?: (passenger: PassengerProfile) => void;
  partyOn: boolean; hornPulse: number; reducedMotion: boolean;
  firstPerson?: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const hovered = useRef(false);
  const hips = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const headModel = useRef<THREE.Group>(null);
  const nameTag = useRef<THREE.Group>(null);
  const upperBody = useRef<THREE.Group>(null);
  const torsoGroup = useRef<THREE.Group>(null);
  const skirt = useRef<THREE.Group>(null);
  const heldProps = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const shins = useRef<(THREE.Group | null)[]>([]);
  const feet = useRef<(THREE.Group | null)[]>([]);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const elbows = useRef<(THREE.Group | null)[]>([]);
  const signatureProps = useRef<(THREE.Group | null)[]>([]);
  const motion = useRef({ previous: new THREE.Vector3(), phase: "", distance: 0, strength: 0 });
  const headWorld = useMemo(() => new THREE.Vector3(), []);
  const targetPose=useRef(createPassengerPose()),pose=useRef(createPassengerPose());
  const archetype = getNakamaArchetype(passengerIndex, avatarId);
  const mats = useMemo(() => getArchetypeMaterials(archetype), [archetype]);
  const proportions = getPassengerProportions(archetype.id);
  const skeleton = getPassengerSkeleton(archetype.id);
  const displayName = getVisiblePassengerName(profile?.displayName);
  const resolvedProfile = useMemo<PassengerProfile | undefined>(
    () => (displayName && passengerIndex !== null
      ? (profile ?? { seatIndex: passengerIndex, displayName, comment: null })
      : undefined),
    [profile, passengerIndex, displayName],
  );
  const interactive = Boolean(resolvedProfile && onSelect);
  const crown = usePassengerHeadHeight(archetype.id, headModel, !firstPerson);

  useEffect(() => () => {
    if (hovered.current) {
      hovered.current = false;
      document.body.style.cursor = "auto";
    }
  }, []);

  useEffect(() => {
    if ((!interactive || firstPerson) && hovered.current) {
      hovered.current = false;
      document.body.style.cursor = "auto";
    }
  }, [firstPerson, interactive]);
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
    const seatIdx = physicalSeatIndexRef ? physicalSeatIndexRef.current : physicalSeatIndex;
    root.current.userData.physicalSeatIndex = seatIdx;
    root.current.userData.row = Math.floor(seatIdx / 4);
    root.current.userData.seatInRow = seatIdx % 4;
    const seatX = PASSENGER_SEAT_X[seatIdx % 4];
    if(sit>.95)keepPassengerHandsApart(targetPose.current,archetype.id,seatIdx%2===0?1:-1,seatX);
    blendPassengerPose(pose.current,targetPose.current,dt,reducedMotion);
    if(sit>.95)keepPassengerHandsApart(pose.current,archetype.id,seatIdx%2===0?1:-1,seatX);
    if (firstPerson && s.phase === "inside") {
      root.current.position.set(camera.position.x, s.position.y, camera.position.z - 0.03);
    } else {
      root.current.position.copy(s.position);
    }
    const heading = s.heading * (1 - sit);
    const turn = Math.atan2(Math.sin(heading - root.current.rotation.y), Math.cos(heading - root.current.rotation.y));
    root.current.rotation.y += turn * (1 - Math.exp(-24 * Math.min(dt, 0.25)));
    const bob = Math.sin(cycle * 2) * 0.009 * gait.strength * (1 - sit);
    const standingY = THREE.MathUtils.lerp(skeleton.standingHipHeight, skeleton.walkingHipHeight, gait.strength);
    hips.current.position.set(0, THREE.MathUtils.lerp(standingY, skeleton.seatedHipHeight, sit) + bob, skeleton.seatedHipZ * sit);
    if (skirt.current) {
      skirt.current.position.set(0, THREE.MathUtils.lerp(-0.14, -0.025, sit), THREE.MathUtils.lerp(0, -0.14, sit));
      skirt.current.rotation.x = (-Math.PI / 2) * (1 - sit);
    }
    if(upperBody.current){
      upperBody.current.position.y=skeleton.torsoAboveHip+pose.current.bob*.5*sit;
      upperBody.current.rotation.set(pose.current.torsoPitch,pose.current.torsoYaw+pose.current.rootYaw,pose.current.torsoRoll);
    }
    if (torsoGroup.current) {
      const seed = (passengerIndex ?? 0) * 0.73;
      const breath = sit > 0.95 && !reducedMotion && !pose.current.games && pose.current.activity !== "check"
        ? 1 + Math.sin(clock.elapsedTime * 2.2 + seed) * 0.015
        : 1;
      torsoGroup.current.scale.set(breath, 1, breath);
    }
    if (heldProps.current) {
      heldProps.current.visible = !celebrate;
      heldProps.current.position.z = archetype.prop === "swords"
        ? -skeleton.seatedHipZ
        : -skeleton.seatedHipZ * (0.4 + 0.6 * sit);
    }
    head.current.rotation.set(pose.current.headPitch,pose.current.headYaw,0);
    if (firstPerson) {
      head.current.visible = false;
      if (nameTag.current) nameTag.current.visible = false;
    } else {
      // getWorldPosition ne met à jour que la chaîne des parents de la tête.
      head.current.getWorldPosition(headWorld);
      // La tête disparaît avant que l'objectif ne puisse traverser sa géométrie.
      const clearance = Math.max(0.55, (crown ?? 0.35) + 0.32);
      const headVisible = camera.position.distanceTo(headWorld) > clearance;
      head.current.visible = headVisible;
      if (nameTag.current) nameTag.current.visible = headVisible;
    }
    legs.current.forEach((leg, index) => {
      const side = index === 0 ? -1 : 1;
      const standingSpread = side * (0.09 + Math.max(0, proportions.torsoWidth - 0.32) * 0.6);
      const legPose = getWalkingLegPose(cycle + index * Math.PI, hips.current!.position.y, gait.strength, sit, archetype.id);
      const upper = legPose.upper;
      const lower = legPose.lower;
      if (leg) leg.rotation.x = upper;
      const shin = shins.current[index];
      const kick = celebrate && index===1 ? pose.current.rightKick : 0;
      if (shin) shin.rotation.x = lower + kick;
      const foot = feet.current[index];
      if (foot) foot.rotation.x = -upper - lower - kick;
      const arm = arms.current[index];
      if (arm) {
        arm.rotation.x = (1 - sit) * Math.cos(cycle + index * Math.PI) * 0.3 * gait.strength + (index===0?pose.current.leftX:pose.current.rightX)*sit;
        arm.rotation.z = (1 - sit) * standingSpread + sit*(index===0?pose.current.leftZ:pose.current.rightZ);
      }
      const elbow = elbows.current[index];
      if (elbow) elbow.rotation.set(0.15*(1-sit) + sit*(index===0?pose.current.leftElbowX:pose.current.rightElbowX),0,sit*(index===0?pose.current.leftElbowZ:pose.current.rightElbowZ));
      const prop=signatureProps.current[index];
      if(prop){const gain=celebrate&&sit>.95?getPassengerSignatureGain(clock.elapsedTime,archetype.id,partyOn,reducedMotion):0;prop.visible=gain>.001;prop.scale.setScalar(gain);}
    });
  });
  return <group ref={root} name="bus-boarding-avatar" userData={{ passengerKind: "visitor",
    seatIndex: passengerIndex, archetypeId: archetype.id }} visible={false}
  >
    <group ref={hips} name="nakama-hips">
      {!firstPerson && displayName && crown !== undefined && (
        <group ref={nameTag}>
          <PassengerNameTag
            name={displayName}
            position={[0, getPassengerNameHeightFromHip(archetype.id, crown), 0.02 + BODY_BEHIND_HIP]}
            onClick={interactive ? (event) => {
              if (!resolvedProfile) return;
              event.stopPropagation();
              onSelect?.(resolvedProfile);
            } : undefined}
            onPointerOver={interactive ? (event) => {
              event.stopPropagation();
              hovered.current = true;
              document.body.style.cursor = "pointer";
            } : undefined}
            onPointerOut={interactive ? () => {
              if (hovered.current) {
                hovered.current = false;
                document.body.style.cursor = "auto";
              }
            } : undefined}
          />
        </group>
      )}
      <PassengerPelvis material={mats.pants} archetype={archetype}/>
      {[-skeleton.hipSpacing, skeleton.hipSpacing].map((x, index) => <group key={x} ref={node => { legs.current[index] = node; }} name={`avatar-thigh-${index}`} position={[x, 0, 0]}>
        <CharacterPart material={archetype.id==="franky"?mats.skin:mats.pants} position={[0,-skeleton.thighLength/2,0]} size={[archetype.id==="chopper"?.088:archetype.id==="brook"?.087:.13,skeleton.thighLength+(archetype.id==="chopper"?.0125:.025),archetype.id==="chopper"?.09:.14]} radius={archetype.id==="chopper"?.025:undefined} castShadow/>
        {archetype.id==="luffy"&&<>
          <CharacterPart material={mats.skin} position={[0,-skeleton.thighLength+.02,0]} size={[.12,.073,.135]}/>
          <CharacterPart material={identityMaterial("#f0e6d8")} position={[0,-skeleton.thighLength+.07,0]} size={[.139,.026,.146]}/>
        </>}
        <group ref={node => { shins.current[index] = node; }} name={`avatar-shin-${index}`} position={[0, -skeleton.thighLength, 0]}>
          <CharacterPart material={passengerCalfMaterial(archetype,mats)} position={[0,-skeleton.shinLength/2,0]} size={[archetype.id==="chopper"?.075:archetype.id==="brook"?.065:.12,skeleton.shinLength+(archetype.id==="chopper"?.01:.02),archetype.id==="chopper"?.075:archetype.id==="brook"?.065:.12]} radius={archetype.id==="chopper"?.024:undefined} castShadow/>
          <group ref={node => { feet.current[index] = node; }} position={[0, -skeleton.shinLength, 0]}>
            <group scale={[skeleton.footScale,skeleton.footScale,skeleton.footScale]}><PassengerFoot archetype={archetype} mats={mats}/></group>
          </group>
        </group>
      </group>)}
      {hasPassengerSkirt(archetype.id) && (
        <group ref={skirt} position={[0, -0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <CharacterPart name="nakama-skirt" material={mats.pants} size={[.305, .19, .31]} radius={.025} />
        </group>
      )}
      <group ref={heldProps} name="nakama-resting-props" position={[0, -(CABIN_FLOOR_Y + skeleton.seatedHipHeight), archetype.prop === "swords" ? -skeleton.seatedHipZ : -skeleton.seatedHipZ * 0.4]}>
        <NakamaProp id={archetype.id} prop={archetype.prop} mats={mats} />
      </group>
      <group ref={upperBody} name="nakama-upper-body" position={[0,skeleton.torsoAboveHip,BODY_BEHIND_HIP]}>
      <group ref={torsoGroup}>
        <PassengerTorso archetype={archetype} mats={mats} />
      </group>
      {[-1, 1].map((side, index) => <group key={side} name={`nakama-arm-${index===0?"left":"right"}`} ref={node => { arms.current[index] = node; }} position={[side * (proportions.torsoWidth / 2 - 0.018), skeleton.shoulderY, 0]} rotation={[0, 0, side * (0.09 + Math.max(0, proportions.torsoWidth - 0.32) * 0.6)]}>
        <group scale={[skeleton.armWidthScale,skeleton.armScale,skeleton.armWidthScale]}><PassengerUpperArm archetype={archetype} mats={mats} side={side} width={proportions.armWidth}/></group>
        <group ref={node => { elbows.current[index] = node; }} name={`nakama-elbow-${index===0?"left":"right"}`} position={[0, -skeleton.upperArmLength, 0]} rotation={[0.15, 0, 0]}>
          <group scale={[skeleton.armWidthScale,skeleton.armScale,skeleton.armWidthScale]}><PassengerForearm archetype={archetype} mats={mats} side={side} width={proportions.armWidth} handName={`nakama-hand-${index===0?"left":"right"}`}/></group>
          <group ref={node=>{signatureProps.current[index]=node;}} name={`nakama-signature-${index===0?"left":"right"}`} position={[0,-skeleton.forearmLength,0]} visible={false}>
            <PassengerSignatureProp id={archetype.id} side={side} mats={mats}/>
          </group>
        </group>
      </group>)}
      <group ref={head} name="bus-boarding-avatar-head" position={[0, skeleton.neckAboveHip-skeleton.torsoAboveHip, 0]} visible={!firstPerson}>
        <PassengerNeck archetype={archetype} mats={mats} />
        <group ref={headModel} position={[0, skeleton.headAboveNeck, 0]}><PassengerHead archetype={archetype} mats={mats}
          motion={pose} index={passengerIndex ?? 0} reducedMotion={reducedMotion}/>
        </group>
      </group>
      </group>
    </group>
  </group>;
});

export default BoardingAvatar;
