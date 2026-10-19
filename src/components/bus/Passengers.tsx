"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { PassengerProfile } from "@/types/passenger";
import { NAKAMA_ROSTER, getNakamaArchetype, type NakamaArchetype } from "./passenger-archetypes";
import { NakamaProp } from "./PassengerAppearance";
import PassengerHead from "./PassengerHead";
import { getCharacterShape } from "./CharacterShapes";
import { PassengerNeck, PassengerTorso } from "./PassengerAnatomy";
import { getPassengerProportions, getPassengerSkeleton } from "@/lib/passenger-proportions";
import type { SeatInfo } from "@/lib/bus-layout";
import { getBusOccupancy, type BusOccupant } from "@/lib/bus-occupancy";
import PassengerLowerBody from "./PassengerLowerBody";
import { PassengerUpperArm, PassengerForearm } from "./PassengerIdentity";
import PassengerSignatureProp from "./PassengerSignatureProp";
import PassengerCardGame, { getPassengerCardActor, type PassengerCardActors } from "./PassengerCardGame";
import { getPassengerCardPairs } from "@/lib/passenger-card-game";
import { BODY_BEHIND_HIP } from "@/lib/passenger-gait";
import { blendPassengerPose, createPassengerPose, samplePassengerPose } from "@/lib/passenger-motion";

/** Hauteur visuelle du sommet de chaque passager assis, accessoires compris. */
function getPassengerLabelY(archetype: NakamaArchetype): number {
  const hairTop = {
    spiky: 2.04,
    crop: 2.03,
    flowing: 2.03,
    swoop: 2.03,
    afro: 2.14,
    pompadour: 2.13,
    topknot: 2.08,
    wavy: 2.03,
    shaggy: 2.03,
  }[archetype.hairStyle];

  const accessoryTops: Partial<Record<NonNullable<NakamaArchetype["accessory"]>, number>> = {
    straw_hat: 2.12,
    reindeer_hat: 2.28,
    top_hat: 2.27,
    white_cap: 2.13,
    cowboy_hat: 2.11,
    horns: 2.07,
  };
  const accessoryTop = accessoryTops[archetype.accessory ?? "none"];

  // Le centre du sprite tient compte de sa demi-hauteur (0,055 pour une hauteur de 0,11)
  // et garde environ 0,05 d'air au-dessus des cheveux ou du chapeau.
  const rig = getPassengerSkeleton(archetype.id), adult = getPassengerSkeleton("");
  const headOffset = rig.seatedHipHeight + rig.neckAboveHip + rig.headAboveNeck
    - adult.seatedHipHeight - adult.neckAboveHip - adult.headAboveNeck;
  return Math.max(hairTop, accessoryTop ?? 0) + 0.105 + headOffset;
}

const ARCHETYPE_MATS_CACHE = new Map<string, Record<string, THREE.Material>>();

export function getArchetypeMaterials(archetype: NakamaArchetype): Record<string, THREE.Material> {
  const existing = ARCHETYPE_MATS_CACHE.get(archetype.id);
  if (existing) return existing;

  const mats: Record<string, THREE.Material> = {
    skin: new THREE.MeshStandardMaterial({
      color: archetype.skinColor,
      roughness: 0.6,
    }),
    hair: new THREE.MeshStandardMaterial({
      color: archetype.hairColor,
      roughness: 0.7,
    }),
    shirt: new THREE.MeshStandardMaterial({
      color: archetype.shirtColor,
      roughness: 0.55,
    }),
    pants: new THREE.MeshStandardMaterial({
      color: archetype.pantsColor,
      roughness: 0.65,
    }),
    shoes: new THREE.MeshStandardMaterial({
      color: "#18181c",
      roughness: 0.85,
    }),
    accessory: new THREE.MeshStandardMaterial({
      color: archetype.accessoryColor ?? "#ffd23f",
      roughness: 0.4,
    }),
    accessorySub: new THREE.MeshStandardMaterial({
      color: archetype.accessorySubColor ?? "#dc1824",
      roughness: 0.4,
    }),
    gold: new THREE.MeshStandardMaterial({
      color: "#ffd23f",
      metalness: 0.85,
      roughness: 0.25,
    }),
    eyes: new THREE.MeshBasicMaterial({
      color: "#111113",
      depthWrite: true,
    }),
    teeth: new THREE.MeshBasicMaterial({
      color: "#ffffff",
      depthWrite: true,
    }),
    faceDark: new THREE.MeshBasicMaterial({
      color: "#1c1917",
      depthWrite: true,
    }),
    dark: new THREE.MeshStandardMaterial({ color: "#1c1917", roughness: 0.8 }),
    steel: new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.8, roughness: 0.2 }),
    red: new THREE.MeshStandardMaterial({ color: "#dc2626", roughness: 0.5 }),
    turquoise: new THREE.MeshStandardMaterial({ color: "#32c9c1", roughness: .65 }),
  };

  ARCHETYPE_MATS_CACHE.set(archetype.id, mats);
  return mats;
}

interface PassengersProps {
  passengerCount: number;
  seatCapacity: number;
  numRows: number;
  renderedRowIndices?: number[];
  vacantSeatRanges?: Array<[number, number, number]>;
  hornPulse: number;
  partyOn?: boolean;
  reservedRow?: number;
  passengerProfiles?: PassengerProfile[];
  onPassengerSelect?: (passenger: PassengerProfile) => void;
  activePassengerIndex?: number | null;
  lowPower?: boolean;
  reducedMotion?: boolean;
  excludedPassengerIndex?: number | null;
  avatarAboard?: boolean;
}

function Passengers({ passengerCount, seatCapacity, renderedRowIndices, vacantSeatRanges = [], hornPulse,
  partyOn = false, reservedRow = 3, passengerProfiles = [], onPassengerSelect,
  lowPower = false, reducedMotion = false, excludedPassengerIndex = null, avatarAboard = false }: PassengersProps) {
  const { detailed, simplified } = useMemo(() => getBusOccupancy({ passengerCount, seatCapacity,
    vacantSeatRanges, renderedRowIndices, reservedRow, currentPassengerIndex: excludedPassengerIndex,
    avatarAboard, lowPower }), [passengerCount, seatCapacity, vacantSeatRanges, renderedRowIndices,
      reservedRow, excludedPassengerIndex, avatarAboard, lowPower]);
  const profilesBySeatIndex = useMemo(() => new Map(passengerProfiles.map(profile => [profile.seatIndex, profile])), [passengerProfiles]);
  const detailedSeats = new Set(detailed.map(occupant => occupant.physicalSeatIndex));
  const cardActors = useMemo<PassengerCardActors>(() => new Map(), []);
  const cardPairs = useMemo(() => getPassengerCardPairs(detailed.map(occupant => ({ ...occupant,
    archetypeId: getNakamaArchetype(occupant.index, occupant.passengerKind === "visitor"
      ? profilesBySeatIndex.get(occupant.index)?.avatarId : null).id,
  })), NAKAMA_ROSTER.map(archetype => archetype.id)), [detailed, profilesBySeatIndex]);
  const cardPairBySeat = useMemo(() => new Map(cardPairs.flatMap(pair => [[pair.firstSeat, pair.pairIndex], [pair.secondSeat, pair.pairIndex]])), [cardPairs]);
  useEffect(() => () => { document.body.style.cursor = "auto"; }, []);
  return <group name="bus-seated-passengers" userData={{ detailedCount: detailed.length, simplifiedCount: simplified.length }}>
    <SimplifiedPassengers passengers={simplified} profilesBySeatIndex={profilesBySeatIndex} partyOn={partyOn} hornPulse={hornPulse} reducedMotion={reducedMotion}/>
    {detailed.map(({ seat, index, physicalSeatIndex, passengerKind }) => {
      const archetype = getNakamaArchetype(index, passengerKind === "visitor" ? profilesBySeatIndex.get(index)?.avatarId : null);
      return <Passenger key={`${passengerKind}-${index}`} seat={seat} index={index} archetype={archetype}
        name={passengerKind === "nakama" ? `crew-nakama-${archetype.id}-${index}` : undefined}
        passengerKind={passengerKind} physicalSeatIndex={physicalSeatIndex}
        cardActors={cardActors} cardPairIndex={cardPairBySeat.get(physicalSeatIndex) ?? null}
        label={passengerKind === "nakama" ? (["shanks", "buggy"].includes(archetype.id)
          ? archetype.name.split(" ")[0] : archetype.name.split(" ").at(-1)) : undefined}
        hornPulse={hornPulse} partyOn={partyOn}
        peerSide={detailedSeats.has(physicalSeatIndex ^ 1) ? (seat.seatInRow % 2 === 0 ? 1 : -1) : 0}
        reducedMotion={reducedMotion} profile={passengerKind === "visitor" ? profilesBySeatIndex.get(index) : undefined}
        onSelect={onPassengerSelect}/>;
    })}
    {cardPairs.map(pair => <PassengerCardGame key={pair.pairIndex} pair={pair} actors={cardActors}
      hornPulse={hornPulse} partyOn={partyOn} reducedMotion={reducedMotion}/>)}
  </group>;
}

export function SimplifiedPassengers({ passengers, profilesBySeatIndex, partyOn, hornPulse, reducedMotion }: { passengers: BusOccupant[]; profilesBySeatIndex?: Map<number, PassengerProfile>; partyOn: boolean; hornPulse: number; reducedMotion: boolean }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const arms = useRef<THREE.InstancedMesh>(null),hands = useRef<THREE.InstancedMesh>(null);
  const celebrating = useRef(false);
  // Resolve the compact rig only when this bounded instance list changes, not
  // during its animation. Distant Choppers must not turn into adult silhouettes.
  const instanceProfiles = useMemo(() => passengers.map(({ index, passengerKind }) => {
    const id = getNakamaArchetype(index, passengerKind === "visitor" ? profilesBySeatIndex?.get(index)?.avatarId : null).id;
    const small = id === "chopper";
    const rig = getPassengerSkeleton(id), proportions = getPassengerProportions(id);
    return { id, bodyY: small ? .64 + rig.seatedHipHeight + rig.torsoAboveHip : 1.35,
      headY: small ? .64 + rig.seatedHipHeight + rig.neckAboveHip + rig.headAboveNeck : 1.82,
      bodyZ: small ? rig.seatedHipZ + BODY_BEHIND_HIP : .12,
      headZ: small ? rig.seatedHipZ + BODY_BEHIND_HIP : .14,
      bodyScale: small ? new THREE.Vector3(proportions.torsoWidth/.32, proportions.torsoHeight/.42, proportions.torsoDepth/.22) : new THREE.Vector3(1,1,1),
      headScale: small ? new THREE.Vector3(proportions.headWidth/.24, proportions.headHeight/.27, proportions.headDepth/.23) : new THREE.Vector3(1,1,1),
      armScale: new THREE.Vector3(rig.armWidthScale,rig.armScale,rig.armWidthScale),
      shoulderY: small ? .64 + rig.seatedHipHeight + rig.torsoAboveHip + rig.shoulderY : 1.55,
      shoulderX: small ? proportions.torsoWidth/2-.018 : .17,
      shoulderZ: small ? rig.seatedHipZ + BODY_BEHIND_HIP : .12,
      armLengthScale: rig.armScale,
    };
  }), [passengers, profilesBySeatIndex]);
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    passengers.forEach(({ seat }, index) => {
      const profile = instanceProfiles[index];
      matrix.makeScale(profile.bodyScale.x,profile.bodyScale.y,profile.bodyScale.z).setPosition(seat.x, profile.bodyY, seat.z + profile.bodyZ);
      bodies.current?.setMatrixAt(index, matrix);
      matrix.makeScale(profile.headScale.x,profile.headScale.y,profile.headScale.z).setPosition(seat.x, profile.headY, seat.z + profile.headZ);
      heads.current?.setMatrixAt(index, matrix);
    });
    if (bodies.current) {
      bodies.current.instanceMatrix.needsUpdate = true;
      bodies.current.computeBoundingSphere();
    }
    if (heads.current) {
      heads.current.instanceMatrix.needsUpdate = true;
      heads.current.computeBoundingSphere();
    }
  }, [passengers,instanceProfiles]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const armScratch=useMemo(()=>({matrix:new THREE.Matrix4(),position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:new THREE.Vector3(1,1,1),rotation:new THREE.Euler(),pose:createPassengerPose()}),[]);
  const updateArms=useCallback((time:number)=>{
    for(let i=0;i<passengers.length;i++){
      const {seat,index}=passengers[i];
      const profile=instanceProfiles[i];
      const pose=armScratch.pose;
      samplePassengerPose(pose,time,index,0,.34,hornPulse>0?(performance.now()-hornPulse)/1000:Infinity,partyOn,reducedMotion,profile.id);
      for(let arm=0;arm<2;arm++){
      const side=arm===0?-1:1;
      const angle=side<0?pose.leftX:pose.rightX;
      const scratch=armScratch,instance=i*2+(side>0?1:0);
      scratch.scale.copy(profile.armScale);
      scratch.rotation.set(angle,0,side<0?pose.leftZ:pose.rightZ);scratch.quaternion.setFromEuler(scratch.rotation);
      scratch.position.set(0,-.19*profile.armLengthScale,0).applyQuaternion(scratch.quaternion).add(dummy.position.set(seat.x+side*profile.shoulderX,profile.shoulderY,seat.z+profile.shoulderZ));
      scratch.matrix.compose(scratch.position,scratch.quaternion,scratch.scale);arms.current?.setMatrixAt(instance,scratch.matrix);
      scratch.position.set(0,-.38*profile.armLengthScale,0).applyQuaternion(scratch.quaternion).add(dummy.position.set(seat.x+side*profile.shoulderX,profile.shoulderY,seat.z+profile.shoulderZ));
      scratch.matrix.compose(scratch.position,scratch.quaternion,scratch.scale);hands.current?.setMatrixAt(instance,scratch.matrix);
      }
    }
    if(arms.current)arms.current.instanceMatrix.needsUpdate=true;
    if(hands.current)hands.current.instanceMatrix.needsUpdate=true;
  },[armScratch,dummy,passengers,instanceProfiles,hornPulse,partyOn,reducedMotion]);
  useLayoutEffect(()=>{updateArms(0);for(const ref of [arms,hands]){ref.current?.computeBoundingSphere();if(ref.current?.boundingSphere)ref.current.boundingSphere.radius+=.3;}},[updateArms,reducedMotion]);
  useFrame(({clock}) => {
    const active=partyOn||(!reducedMotion&&hornPulse>0&&performance.now()-hornPulse<1800);
    if(arms.current)arms.current.visible=active;
    if(hands.current)hands.current.visible=active;
    if(active&&!reducedMotion)updateArms(clock.elapsedTime);
    if(active&&reducedMotion&&celebrating.current)return;
    if(!active&&!celebrating.current)return;
    celebrating.current=active;
    for (let i=0;i<passengers.length;i++) {
      const {seat,index}=passengers[i], sway=active&&!reducedMotion?Math.sin(clock.elapsedTime*7+index)*.09:0;
      const profile=instanceProfiles[i];
      dummy.scale.copy(profile.bodyScale);dummy.position.set(seat.x,profile.bodyY,seat.z+profile.bodyZ);dummy.rotation.set(0,sway,sway*.45);dummy.updateMatrix();bodies.current?.setMatrixAt(i,dummy.matrix);
      dummy.scale.copy(profile.headScale);dummy.position.set(seat.x,profile.headY,seat.z+profile.headZ);dummy.rotation.set(0,sway,0);dummy.updateMatrix();heads.current?.setMatrixAt(i,dummy.matrix);
    }
    if(bodies.current)bodies.current.instanceMatrix.needsUpdate=true;
    if(heads.current)heads.current.instanceMatrix.needsUpdate=true;
  });
  // Restaurer les matrices immobiles à l'arrêt, sans laisser de danse figée.
  useLayoutEffect(()=>{
    if(partyOn&&!reducedMotion)return;
    passengers.forEach(({seat},i)=>{const profile=instanceProfiles[i];dummy.rotation.set(0,0,0);dummy.scale.copy(profile.bodyScale);dummy.position.set(seat.x,profile.bodyY,seat.z+profile.bodyZ);dummy.updateMatrix();bodies.current?.setMatrixAt(i,dummy.matrix);dummy.scale.copy(profile.headScale);dummy.position.set(seat.x,profile.headY,seat.z+profile.headZ);dummy.updateMatrix();heads.current?.setMatrixAt(i,dummy.matrix);});
    if(bodies.current)bodies.current.instanceMatrix.needsUpdate=true;
    if(heads.current)heads.current.instanceMatrix.needsUpdate=true;
  },[dummy,passengers,instanceProfiles,partyOn,reducedMotion]);
  if (passengers.length === 0) return null;
  return (
    <>
      <instancedMesh name="bus-distant-passenger-bodies" userData={{ occupants: passengers.map(({ index, physicalSeatIndex, passengerKind, seat }) => ({ seatIndex: index, physicalSeatIndex, passengerKind, row: seat.row, seatInRow: seat.seatInRow })) }} ref={bodies} args={[undefined, undefined, 160]} count={passengers.length}>
        <boxGeometry args={[0.32, 0.42, 0.22]} />
        <meshStandardMaterial color="#314ba5" roughness={0.7} />
      </instancedMesh>
      <instancedMesh name="bus-distant-passenger-heads" ref={heads} geometry={getCharacterShape([0.24, 0.27, 0.23], 0.038)} dispose={null} args={[undefined, undefined, 160]} count={passengers.length}>
        <meshStandardMaterial color="#d9a27e" roughness={0.7} />
      </instancedMesh>
      <instancedMesh name="bus-distant-party-arms" ref={arms} args={[undefined,undefined,320]} count={passengers.length*2} visible={false}>
        <boxGeometry args={[.075,.38,.075]}/><meshStandardMaterial color="#314ba5" roughness={.7}/>
      </instancedMesh>
      <instancedMesh name="bus-distant-party-hands" ref={hands} args={[undefined,undefined,320]} count={passengers.length*2} visible={false}>
        <boxGeometry args={[.085,.075,.08]}/><meshStandardMaterial color="#d9a27e" roughness={.7}/>
      </instancedMesh>
    </>
  );
}

export function Passenger({
  seat,
  index,
  archetype,
  hornPulse,
  partyOn = false,
  peerSide = 0,
  cardActors,
  cardPairIndex = null,
  reducedMotion,
  profile,
  onSelect,
  firstPerson = false,
  passengerKind,
  physicalSeatIndex,
  name,
  label,
  onActivate,
  head,
  children,
}: {
  seat: SeatInfo;
  index: number;
  archetype: NakamaArchetype;
  hornPulse: number;
  partyOn?: boolean;
  peerSide?: number;
  cardActors?: PassengerCardActors;
  cardPairIndex?: number | null;
  reducedMotion: boolean;
  profile?: PassengerProfile;
  onSelect?: (passenger: PassengerProfile) => void;
  firstPerson?: boolean;
  passengerKind?: "visitor" | "nakama";
  physicalSeatIndex?: number;
  name?: string;
  label?: string;
  onActivate?: () => void;
  head?: ReactNode;
  children?: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const headGroup = useRef<THREE.Group>(null);
  const torsoGroup = useRef<THREE.Group>(null);
  const upperBody = useRef<THREE.Group>(null);
  const arms = useRef<Array<THREE.Group | null>>([]);
  const elbows = useRef<Array<THREE.Group | null>>([]);
  const heldProps = useRef<THREE.Group>(null);
  const signatureProps = useRef<Array<THREE.Group|null>>([]);
  const targetPose = useRef(createPassengerPose());
  const currentPose = useRef(createPassengerPose());

  // Matériaux partagés et mis en cache par archetype
  const mats = useMemo(() => getArchetypeMaterials(archetype), [archetype]);
  const proportions = getPassengerProportions(archetype.id);
  const skeleton = getPassengerSkeleton(archetype.id);
  const displayName = label ?? profile?.displayName;
  const interactive = Boolean(profile || onActivate);
  const nameTexture = useMemo(
    () => displayName ? makePassengerNameTexture(displayName) : null,
    [displayName],
  );
  const labelY = useMemo(() => getPassengerLabelY(archetype), [archetype]);

  useEffect(() => () => {
    nameTexture?.texture.dispose();
    document.body.style.cursor = "auto";
  }, [nameTexture]);

  useLayoutEffect(() => {
    if (!cardActors || physicalSeatIndex === undefined || !group.current) return;
    const actor = getPassengerCardActor(group.current);
    if (!actor) return;
    cardActors.set(physicalSeatIndex, actor);
    return () => { if (cardActors.get(physicalSeatIndex) === actor) cardActors.delete(physicalSeatIndex); };
  }, [cardActors, physicalSeatIndex, archetype.id]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const seed = index * 0.73;

    samplePassengerPose(targetPose.current,t,index,peerSide,proportions.torsoWidth,hornPulse>0?(performance.now()-hornPulse)/1000:Infinity,partyOn,reducedMotion,archetype.id,cardPairIndex);
    blendPassengerPose(currentPose.current,targetPose.current,dt,reducedMotion);
    const pose=currentPose.current;
    if (group.current) {
      group.current.position.y = pose.bob;
      group.current.rotation.y = pose.rootYaw;
      group.current.userData.activity = pose.activity;
      group.current.userData.gesture = pose.gesture;
    }
    if(upperBody.current)upperBody.current.rotation.set(pose.torsoPitch,pose.torsoYaw,pose.torsoRoll);
    if (headGroup.current) {
      headGroup.current.rotation.set(pose.headPitch,pose.headYaw,0);
    }
    arms.current[0]?.rotation.set(pose.leftX,0,pose.leftZ);
    arms.current[1]?.rotation.set(pose.rightX,0,pose.rightZ);
    elbows.current[0]?.rotation.set(pose.leftElbowX,0,pose.leftElbowZ);
    elbows.current[1]?.rotation.set(pose.rightElbowX,0,pose.rightElbowZ);
    if(heldProps.current)heldProps.current.visible=!pose.celebrating&&!pose.games&&pose.activity!=="check";
    for(const prop of signatureProps.current)if(prop)prop.visible=pose.celebrating||archetype.id==="foudubustv";
    if (torsoGroup.current) {
      const breath = reducedMotion || pose.games ? 1 : 1 + Math.sin(t * 2.2 + seed) * 0.015;
      torsoGroup.current.scale.set(breath, 1, breath);
    }
  }, -2);

  return (
    <group
      ref={group}
      name={name ?? `nakama-${archetype.id}-${index}`}
      userData={{ physicalSeatIndex, passengerKind, cardPairIndex, seatIndex: passengerKind === "visitor" ? index : undefined, archetypeId: archetype.id, row: seat.row, seatInRow: seat.seatInRow }}
      position={[seat.x, 0, seat.z]}
      onClick={
        profile
          ? (event: { stopPropagation: () => void }) => {
              event.stopPropagation();
              onSelect?.(profile);
            }
          : onActivate ? (event: { stopPropagation: () => void }) => { event.stopPropagation(); onActivate(); } : undefined
      }
    >
      {!firstPerson && nameTexture && (
        <sprite
          name="nakama-name-label"
          userData={{ label: displayName, textureAspect: nameTexture.aspect }}
          position={[0, labelY, 0.14]}
          scale={[Math.min(0.4, nameTexture.aspect * 0.11), Math.min(0.11, 0.4 / nameTexture.aspect), 1]}
          renderOrder={20}
          onClick={interactive ? (event: { stopPropagation: () => void }) => {
            event.stopPropagation();
            if (profile) onSelect?.(profile);
            else onActivate?.();
          } : undefined}
          onPointerOver={interactive ? (event: { stopPropagation: () => void }) => {
            event.stopPropagation();
            document.body.style.cursor = "pointer";
          } : undefined}
          onPointerOut={interactive ? () => {
            document.body.style.cursor = "auto";
          } : undefined}
        >
          <spriteMaterial
            map={nameTexture.texture}
            transparent
            alphaTest={0.08}
            depthTest
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </sprite>
      )}
      <group name="nakama-hips" position={[0, 0.64 + skeleton.seatedHipHeight, skeleton.seatedHipZ]}>
        <PassengerLowerBody mats={mats} archetype={archetype} kickPose={archetype.id==="sanji"?currentPose:undefined} />

        <group ref={upperBody} name="nakama-upper-body" position={[0, skeleton.torsoAboveHip, BODY_BEHIND_HIP]}>
        <group ref={torsoGroup}>
          <PassengerTorso archetype={archetype} mats={mats} />
          {[-1, 1].map((side,index) => <group key={side} ref={node=>{arms.current[index]=node;}} name={`nakama-arm-${index===0?"left":"right"}`} position={[side * (proportions.torsoWidth / 2 - 0.018), skeleton.shoulderY, 0]} rotation={[0.12, 0, side * 0.08]}>
            <group scale={[skeleton.armWidthScale,skeleton.armScale,skeleton.armWidthScale]}><PassengerUpperArm archetype={archetype} mats={mats} side={side} width={proportions.armWidth}/></group>
            <group ref={node=>{elbows.current[index]=node;}} name={`nakama-elbow-${index===0?"left":"right"}`} position={[0, -skeleton.upperArmLength, 0]} rotation={[1.05, 0, 0]}>
              <group scale={[skeleton.armWidthScale,skeleton.armScale,skeleton.armWidthScale]}><PassengerForearm archetype={archetype} mats={mats} side={side} width={proportions.armWidth} handName={`nakama-hand-${index===0?"left":"right"}`}/></group>
              <group ref={node=>{signatureProps.current[index]=node;}} name={`nakama-signature-${index===0?"left":"right"}`} position={[0,-skeleton.forearmLength,0]} visible={archetype.id==="foudubustv"}>
                <PassengerSignatureProp id={archetype.id} side={side} mats={mats}/>
              </group>
            </group>
          </group>)}
        </group>

        {!firstPerson && <group ref={headGroup} position={[0, skeleton.neckAboveHip-skeleton.torsoAboveHip, 0]}>
          <PassengerNeck archetype={archetype} mats={mats} />
          <group position={[0, skeleton.headAboveNeck, 0]}>{head ?? <PassengerHead archetype={archetype} mats={mats}
            motion={currentPose} index={index} reducedMotion={reducedMotion}/>}</group>
        </group>}
        </group>
      </group>

      {/* ---------- PROPS & OBJETS TENUS ---------- */}
      <group ref={heldProps}><NakamaProp id={archetype.id} prop={archetype.prop} mats={mats} />{children}</group>

    </group>
  );
}

function makePassengerNameTexture(displayName: string) {
  const font = "900 64px ui-sans-serif, system-ui, sans-serif";
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d")!;
  measureContext.font = font;
  const measuredWidth = Math.ceil(measureContext.measureText(displayName).width + 48);
  const width = Math.min(1024, Math.max(256, THREE.MathUtils.ceilPowerOfTwo(measuredWidth)));
  const height = 128;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;

  context.clearRect(0, 0, width, height);
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = "rgba(2, 6, 23, 0.96)";
  context.lineWidth = 12;
  context.strokeText(displayName, width / 2, height / 2 + 2, width - 36);
  context.fillStyle = "#ffffff";
  context.fillText(displayName, width / 2, height / 2 + 2, width - 36);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;

  return { texture, aspect: width / height };
}

export default memo(Passengers);
