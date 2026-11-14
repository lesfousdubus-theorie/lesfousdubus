"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { PassengerProfile } from "@/types/passenger";
import { NAKAMA_ROSTER, getNakamaArchetype, type NakamaArchetype } from "./passenger-archetypes";
import { NakamaProp } from "./PassengerAppearance";
import PassengerHead from "./PassengerHead";
import { SimplifiedPassengers } from "./SimplifiedPassengers";
export { SimplifiedPassengers } from "./SimplifiedPassengers";
import { PassengerNeck, PassengerTorso } from "./PassengerAnatomy";
import { getPassengerProportions, getPassengerSkeleton } from "@/lib/passenger-proportions";
import type { SeatInfo } from "@/lib/bus-layout";
import { getBusOccupancy } from "@/lib/bus-occupancy";
import PassengerLowerBody from "./PassengerLowerBody";
import { PassengerUpperArm, PassengerForearm } from "./PassengerIdentity";
import PassengerSignatureProp from "./PassengerSignatureProp";
import PassengerCardGame, { getPassengerCardActor, type PassengerCardActors } from "./PassengerCardGame";
import { getPassengerCardPairs } from "@/lib/passenger-card-game";
import { BODY_BEHIND_HIP } from "@/lib/passenger-gait";
import { blendPassengerPose, createPassengerPose, getPassengerSignatureGain, getRegisteredPassengerPose, pruneRegisteredPassengerPoses, samplePassengerPose, type PassengerPoseRegistry } from "@/lib/passenger-motion";
import { keepPassengerHandsApart } from "@/lib/passenger-space";

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
  const camera = useThree(state => state.camera);
  const root = useRef<THREE.Group>(null), cameraPoint = useMemo(() => new THREE.Vector3(), []);
  const [detailFocus, setDetailFocus] = useState(() => ({ x: camera.position.x, z: camera.position.z }));
  const lastFocus = useRef({ ...detailFocus, time: -Infinity });
  useFrame(({ camera }) => {
    const now = performance.now();
    if (!root.current || now - lastFocus.current.time < 120) return;
    lastFocus.current.time = now;
    camera.getWorldPosition(cameraPoint); root.current.worldToLocal(cameraPoint);
    if (Math.hypot(cameraPoint.x-lastFocus.current.x, cameraPoint.z-lastFocus.current.z) < .2) return;
    lastFocus.current = { x: cameraPoint.x, z: cameraPoint.z, time: now };
    setDetailFocus({ x: cameraPoint.x, z: cameraPoint.z });
  }, -3);
  const { detailed, simplified } = useMemo(() => getBusOccupancy({ passengerCount, seatCapacity,
    vacantSeatRanges, renderedRowIndices, reservedRow, currentPassengerIndex: excludedPassengerIndex,
    avatarAboard, lowPower, detailFocus }), [passengerCount, seatCapacity, vacantSeatRanges, renderedRowIndices,
      reservedRow, excludedPassengerIndex, avatarAboard, lowPower, detailFocus]);
  const profilesBySeatIndex = useMemo(() => new Map(passengerProfiles.map(profile => [profile.seatIndex, profile])), [passengerProfiles]);
  const detailedSeats = new Set(detailed.map(occupant => occupant.physicalSeatIndex));
  const poses=useMemo<PassengerPoseRegistry>(()=>new Map(),[]);
  useEffect(()=>{
    const visible=new Set([...detailed,...simplified].map(actor=>actor.index));
    pruneRegisteredPassengerPoses(poses,visible);
  },[detailed,simplified,poses]);
  const cardActors = useMemo<PassengerCardActors>(() => new Map(), []);
  const cardPairs = useMemo(() => getPassengerCardPairs(detailed.map(occupant => ({ ...occupant,
    archetypeId: getNakamaArchetype(occupant.index, occupant.passengerKind === "visitor"
      ? profilesBySeatIndex.get(occupant.index)?.avatarId : null).id,
  })), NAKAMA_ROSTER.map(archetype => archetype.id)), [detailed, profilesBySeatIndex]);
  const cardPairBySeat = useMemo(() => new Map(cardPairs.flatMap(pair => [[pair.firstSeat, pair.pairIndex], [pair.secondSeat, pair.pairIndex]])), [cardPairs]);
  useEffect(() => () => { document.body.style.cursor = "auto"; }, []);
  return <group ref={root} name="bus-seated-passengers" userData={{ detailedCount: detailed.length, simplifiedCount: simplified.length }}>
    <SimplifiedPassengers passengers={simplified} profilesBySeatIndex={profilesBySeatIndex} partyOn={partyOn} hornPulse={hornPulse} reducedMotion={reducedMotion} poses={poses}/>
    {detailed.map(({ seat, index, physicalSeatIndex, passengerKind }) => {
      const archetype = getNakamaArchetype(index, passengerKind === "visitor" ? profilesBySeatIndex.get(index)?.avatarId : null);
      return <Passenger key={`${passengerKind}-${index}`} seat={seat} index={index} archetype={archetype}
        poses={poses}
        name={passengerKind === "nakama" ? `crew-nakama-${archetype.id}-${index}` : undefined}
        passengerKind={passengerKind} physicalSeatIndex={physicalSeatIndex}
        cardActors={cardActors} cardPairIndex={cardPairBySeat.get(physicalSeatIndex) ?? null}
        label={passengerKind === "nakama" ? (["shanks", "buggy"].includes(archetype.id)
          ? archetype.name.split(" ")[0] : archetype.name.split(" ").at(-1)) : undefined}
        hornPulse={hornPulse} partyOn={partyOn}
        peerSide={detailedSeats.has(physicalSeatIndex ^ 1) ? (seat.seatInRow % 2 === 0 ? 1 : -1) : 0}
        interactionPairIndex={Math.floor(physicalSeatIndex / 2)}
        reducedMotion={reducedMotion} profile={passengerKind === "visitor" ? profilesBySeatIndex.get(index) : undefined}
        onSelect={onPassengerSelect}/>;
    })}
    {cardPairs.map(pair => <PassengerCardGame key={pair.pairIndex} pair={pair} actors={cardActors}
      hornPulse={hornPulse} partyOn={partyOn} reducedMotion={reducedMotion}/>)}
  </group>;
}

export function Passenger({
  seat,
  index,
  archetype,
  hornPulse,
  partyOn = false,
  poses,
  peerSide = 0,
  interactionPairIndex,
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
  poses?: PassengerPoseRegistry;
  peerSide?: number;
  interactionPairIndex?: number;
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
  const currentPose = useRef(getRegisteredPassengerPose(poses,index));

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

    samplePassengerPose(targetPose.current,t,index,peerSide,proportions.torsoWidth,hornPulse>0?(performance.now()-hornPulse)/1000:Infinity,partyOn,reducedMotion,archetype.id,cardPairIndex,interactionPairIndex);
    keepPassengerHandsApart(targetPose.current,archetype.id,seat.seatInRow%2===0?1:-1);
    blendPassengerPose(currentPose.current,targetPose.current,dt,reducedMotion);
    const pose=currentPose.current;
    keepPassengerHandsApart(pose,archetype.id,seat.seatInRow%2===0?1:-1);
    if (group.current) {
      // Le bassin et les pieds restent sur leur siège/sol pendant la fête.
      group.current.position.y = 0;
      group.current.rotation.y = 0;
      group.current.userData.activity = pose.activity;
      group.current.userData.gesture = pose.gesture;
    }
    if(upperBody.current){
      upperBody.current.rotation.set(pose.torsoPitch,pose.torsoYaw+pose.rootYaw,pose.torsoRoll);
      upperBody.current.position.y=skeleton.torsoAboveHip+pose.bob*.5;
    }
    if (headGroup.current) {
      headGroup.current.rotation.set(pose.headPitch,pose.headYaw,0);
    }
    arms.current[0]?.rotation.set(pose.leftX,0,pose.leftZ);
    arms.current[1]?.rotation.set(pose.rightX,0,pose.rightZ);
    elbows.current[0]?.rotation.set(pose.leftElbowX,0,pose.leftElbowZ);
    elbows.current[1]?.rotation.set(pose.rightElbowX,0,pose.rightElbowZ);
    if(heldProps.current)heldProps.current.visible=!pose.celebrating&&!pose.games&&pose.activity!=="check";
    const signatureGain = archetype.id==="foudubustv" ? 1 : pose.celebrating ? getPassengerSignatureGain(t,archetype.id,partyOn,reducedMotion) : 0;
    for(const prop of signatureProps.current)if(prop){prop.visible=signatureGain>.001;prop.scale.setScalar(signatureGain);}
    if (torsoGroup.current) {
      const breath = reducedMotion || pose.games || pose.activity==="check" ? 1 : 1 + Math.sin(t * 2.2 + seed) * 0.015;
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
        </group>
          {[-1, 1].map((side,index) => <group key={side} ref={node=>{arms.current[index]=node;}} name={`nakama-arm-${index===0?"left":"right"}`} position={[side * (proportions.torsoWidth / 2 - 0.018), skeleton.shoulderY, 0]} rotation={[0.12, 0, -side * 0.12]}>
            <group scale={[skeleton.armWidthScale,skeleton.armScale,skeleton.armWidthScale]}><PassengerUpperArm archetype={archetype} mats={mats} side={side} width={proportions.armWidth}/></group>
            <group ref={node=>{elbows.current[index]=node;}} name={`nakama-elbow-${index===0?"left":"right"}`} position={[0, -skeleton.upperArmLength, 0]} rotation={[1.05, 0, 0]}>
              <group scale={[skeleton.armWidthScale,skeleton.armScale,skeleton.armWidthScale]}><PassengerForearm archetype={archetype} mats={mats} side={side} width={proportions.armWidth} handName={`nakama-hand-${index===0?"left":"right"}`}/></group>
              <group ref={node=>{signatureProps.current[index]=node;}} name={`nakama-signature-${index===0?"left":"right"}`} position={[0,-skeleton.forearmLength,0]} visible={archetype.id==="foudubustv"}>
                <PassengerSignatureProp id={archetype.id} side={side} mats={mats}/>
              </group>
            </group>
          </group>)}
        {!firstPerson && <group ref={headGroup} position={[0, skeleton.neckAboveHip-skeleton.torsoAboveHip, 0]}>
          <PassengerNeck archetype={archetype} mats={mats} />
          {/* Parole et écoute suivent le banc physique, comme les gestes des voisins. */}
          <group position={[0, skeleton.headAboveNeck, 0]}>{head ?? <PassengerHead archetype={archetype} mats={mats}
            motion={currentPose} index={physicalSeatIndex ?? index} reducedMotion={reducedMotion}/>}</group>
        </group>}
        </group>
      </group>

      {/* ---------- PROPS & OBJETS TENUS ---------- */}
      <group ref={heldProps} name="nakama-resting-props"><NakamaProp id={archetype.id} prop={archetype.prop} mats={mats} />{children}</group>

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
