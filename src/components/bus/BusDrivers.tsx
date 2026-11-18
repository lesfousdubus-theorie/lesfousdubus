"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { DriverHead, DriverShirt } from "./DriverAppearance";
import PassengerLowerBody from "./PassengerLowerBody";
import DriverArm from "./DriverArm";
import { DRIVER_ARM_FIELDS, DRIVER_FOREARM, DRIVER_SEAT_POSITIONS, DRIVER_SHOULDER_X, DRIVER_SHOULDER_Z, DRIVER_UPPER_ARM, getDriverArmRest, getDriverReactionGain, normalizeDriverHornArms, prepareDriverArmTarget, solveDriverArmTarget } from "@/lib/driver-arms";
import { sampleCopilotDance } from "@/lib/copilot-dance";
import { CABIN_FLOOR_Y, SEATED_HIP_HEIGHT, SEATED_HIP_Z } from "@/lib/passenger-gait";
import { blendPassengerPose, createPassengerPose, samplePassengerPose } from "@/lib/passenger-motion";

interface BusDriversProps {
  hornPulse: number;
  reducedMotion?: boolean;
  partyOn?: boolean;
}

// Palette des photos de référence, adaptée à des personnages carrés.
const SKIN_COLOR = "#f2ccae"; // Teint clair naturel
const HAIR_BROWN = "#543722"; // Châtain chaud texturé
const HAIR_DARK_BROWN = "#422a1a"; // Châtain foncé naturel
const KAMAL_SHIRT = "#e8eee9";
const KYTA_SHIRT = "#587ea8";
const EYE_BLUE = "#3d6494"; // Yeux bleu-gris expressifs
const PUPIL_DARK = "#0d131f"; // Pupille sombre
const PANTS_COLOR = "#22252e"; // Pantalon streetwear sombre
const SHOES_COLOR = "#141519"; // Baskets
const WHITE_SOLE_COLOR = "#f1f5f9"; // Semelle blanche
const GOLD_COLOR = "#f59e0b"; // Détails dorés et Log Pose

/** Génère une étiquette contenant UNIQUEMENT le prénom, sobre et élégante */
function makeDriverNameTexture(name: string) {
  const font = "900 64px ui-sans-serif, system-ui, -apple-system, sans-serif";
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d")!;
  measureContext.font = font;
  const measuredWidth = Math.ceil(measureContext.measureText(name).width + 56);
  const width = Math.min(1024, Math.max(256, THREE.MathUtils.ceilPowerOfTwo(measuredWidth)));
  const height = 128;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, width, height);

  // Pilule de fond sombre semi-transparente
  const rx = 12;
  const ry = 16;
  const rw = width - 24;
  const rh = height - 32;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;

  ctx.fillStyle = "rgba(7, 12, 24, 0.88)";
  ctx.beginPath();
  ctx.roundRect(rx, ry, rw, rh, 28);
  ctx.fill();

  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "rgba(255, 210, 63, 0.85)"; // Liseré doré subtil
  ctx.stroke();
  ctx.restore();

  // Nom pur (uniquement le prénom)
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(2, 6, 23, 0.96)";
  ctx.lineWidth = 10;
  ctx.strokeText(name, width / 2, height / 2 + 1, width - 28);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(name, width / 2, height / 2 + 1, width - 28);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;

  return { texture, aspect: width / height };
}

export function BusDrivers({ hornPulse, reducedMotion = false, partyOn = false }: BusDriversProps) {
  const kamalRoot = useRef<THREE.Group>(null);
  const kytaRoot = useRef<THREE.Group>(null);
  const kytaLeftArm = useRef<THREE.Group>(null);
  const kamalLeftElbow = useRef<THREE.Group>(null), kamalRightElbow = useRef<THREE.Group>(null);
  const kytaLeftElbow = useRef<THREE.Group>(null), kytaRightElbow = useRef<THREE.Group>(null);
  const kamalLeftHand = useRef<THREE.Group>(null), kamalRightHand = useRef<THREE.Group>(null);
  const kytaLeftHand = useRef<THREE.Group>(null), kytaRightHand = useRef<THREE.Group>(null);
  const celebrationGain = useRef([0, 0]);
  const targets=useRef([createPassengerPose(),createPassengerPose()]);
  const kamalPose = useRef(createPassengerPose()), kytaPose = useRef(createPassengerPose());
  const poses = useRef([kamalPose, kytaPose]);
  const kamalTorso = useRef<THREE.Group>(null);
  const kamalHead = useRef<THREE.Group>(null);
  const kamalLeftArm = useRef<THREE.Group>(null);
  const kamalRightArm = useRef<THREE.Group>(null);

  const kytaTorso = useRef<THREE.Group>(null);
  const kytaHead = useRef<THREE.Group>(null);
  const kytaRightArm = useRef<THREE.Group>(null);
  const kytaCompassNeedles = useRef<(THREE.Mesh | null)[]>([]);
  const hoveredObjects = useRef(new Set<THREE.Object3D>());
  const copilotDance = useRef({ active: false, recovering: false, start: 0 });
  const torsoStates = useRef([
    { yaw: 0, pitch: 0, roll: 0, bob: 0 },
    { yaw: 0, pitch: 0, roll: 0, bob: 0 },
  ]);
  const copilotFrame = useMemo(() => ({ inverse: new THREE.Quaternion(), neck: new THREE.Vector3(), shoulder: new THREE.Vector3() }), []);
  const armJoints = useMemo(() => [
    { driver: "kamal" as const, side: -1 as const },
    { driver: "kamal" as const, side: 1 as const },
    { driver: "kyta" as const, side: -1 as const },
    { driver: "kyta" as const, side: 1 as const },
  ].map(joint => {
    const rest = getDriverArmRest(joint.driver, joint.side);
    const restShoulder = new THREE.Quaternion().setFromEuler(new THREE.Euler(rest.shoulderX, rest.shoulderYaw, 0, "YXZ"));
    const restElbow = new THREE.Quaternion().setFromEuler(new THREE.Euler(rest.elbowX, 0, 0));
    const restWrist = new THREE.Quaternion().setFromEuler(new THREE.Euler(rest.wristX, 0, 0));
    return { ...joint, rest,
      restHand: restShoulder.multiply(restElbow).multiply(restWrist),
      targetShoulder: new THREE.Quaternion(), targetElbow: new THREE.Quaternion(), targetEuler: new THREE.Euler(),
      handTarget: new THREE.Vector3(), handRotation: new THREE.Quaternion(), handMix: new THREE.Quaternion(),
      solution: { shoulderX: rest.shoulderX, shoulderYaw: rest.shoulderYaw, elbowX: rest.elbowX },
    };
  }), []);


  // Étiquettes contenant UNIQUEMENT le prénom de chacun
  const kamalNameTex = useMemo(() => makeDriverNameTexture("Kamal"), []);
  const kytaNameTex = useMemo(() => makeDriverNameTexture("Kyta"), []);

  useEffect(() => {
    const hovered = hoveredObjects.current;
    return () => {
      kamalNameTex.texture.dispose();
      kytaNameTex.texture.dispose();
      hovered.clear();
      document.body.style.cursor = "auto";
    };
  }, [kamalNameTex, kytaNameTex]);

  const isDriverObject = useCallback((object: THREE.Object3D) => {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (current === kamalRoot.current || current === kytaRoot.current) return true;
      current = current.parent;
    }
    return false;
  }, []);

  const handleDriverPointerOver = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    hoveredObjects.current.add(event.object);
    document.body.style.cursor = "pointer";
  }, []);

  const handleDriverPointerOut = useCallback((event: ThreeEvent<PointerEvent>) => {
    hoveredObjects.current.delete(event.object);
    if (hoveredObjects.current.size === 0 && !event.intersections.some(hit => isDriverObject(hit.object))) {
      document.body.style.cursor = "auto";
    }
  }, [isDriverObject]);

  // Clic interactif sur Kamal
  const handleKamalClick = useCallback((e?: { stopPropagation: () => void }) => {
    e?.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("bus-show-toast", {
        detail: {
          badge: "KAMAL",
          text: "« Accrochez-vous, on est dans le Siècle Oublié ! »",
          sub: "Le Mont Corvo",
        },
      }),
    );
  }, []);

  // Clic interactif sur Kyta
  const handleKytaClick = useCallback((e?: { stopPropagation: () => void }) => {
    e?.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("bus-show-toast", {
        detail: {
          badge: "KYTA",
          text: "« Le Log Pose s’affole ! La théorie des Fous du Bus se vérifie sous nos yeux ! »",
          sub: "Le Mont Corvo",
        },
      }),
    );
  }, []);

  const mats = useMemo(() => {
    return {
      skin: new THREE.MeshStandardMaterial({ color: SKIN_COLOR, roughness: 0.58 }),
      hairKamal: new THREE.MeshStandardMaterial({ color: HAIR_BROWN, roughness: 0.72 }),
      hairKyta: new THREE.MeshStandardMaterial({ color: HAIR_DARK_BROWN, roughness: 0.72 }),
      hairHighlight: new THREE.MeshStandardMaterial({ color: "#6e472e", roughness: 0.68 }),
      eyebrow: new THREE.MeshBasicMaterial({ color: "#482e1c" }),
      kamalShirt: new THREE.MeshStandardMaterial({ color: KAMAL_SHIRT, roughness: 0.9 }),
      shirtStripe: new THREE.MeshStandardMaterial({ color: "#9abdc5", roughness: 0.9 }),
      kytaShirt: new THREE.MeshStandardMaterial({ color: KYTA_SHIRT, roughness: 0.9 }),
      pants: new THREE.MeshStandardMaterial({ color: PANTS_COLOR, roughness: 0.7 }),
      shoes: new THREE.MeshStandardMaterial({ color: SHOES_COLOR, roughness: 0.85 }),
      whiteSole: new THREE.MeshStandardMaterial({ color: WHITE_SOLE_COLOR, roughness: 0.45 }),
      gold: new THREE.MeshStandardMaterial({ color: GOLD_COLOR, metalness: 0.8, roughness: 0.25 }),
      leather: new THREE.MeshStandardMaterial({ color: "#3e2417", roughness: 0.7 }),
      parchment: new THREE.MeshStandardMaterial({ color: "#fef3c7", roughness: 0.75 }),
      eyesIris: new THREE.MeshBasicMaterial({ color: EYE_BLUE }),
      eyesPupil: new THREE.MeshBasicMaterial({ color: PUPIL_DARK }),
      eyeHighlight: new THREE.MeshBasicMaterial({ color: "#f4f5f3" }),
      smile: new THREE.MeshBasicMaterial({ color: "#824d49" }),
      glassDome: new THREE.MeshStandardMaterial({
        color: "#bae6fd",
        transparent: true,
        opacity: 0.48,
        roughness: 0.08,
        metalness: 0.1,
      }),
      needleRed: new THREE.MeshBasicMaterial({ color: "#ef4444" }),
    };
  }, []);

  useEffect(() => () => {
    Object.values(mats).forEach(material => material.dispose());
  }, [mats]);

  useFrame((state,dt) => {
    const t = state.clock.elapsedTime;
    if (partyOn && !copilotDance.current.active) copilotDance.current.start = t;
    copilotDance.current.active = partyOn;
    if (partyOn) copilotDance.current.recovering = true;
    else if (celebrationGain.current[1] < .001) copilotDance.current.recovering = false;

    // Réaction au klaxon : bond d'enthousiasme
    const sinceHorn = (performance.now() - hornPulse) / 1000;
    const isHonking = !reducedMotion && hornPulse > 0 && sinceHorn >= 0 && sinceHorn < 0.9;
    const hornBounce = isHonking ? Math.sin(sinceHorn * 20) * (0.9 - sinceHorn) * 0.08 : 0;

    // Respiration et micro-mouvements de conduite de Kamal
    if (kamalTorso.current) {
      const breath = reducedMotion ? 1 : 1 + Math.sin(t * 2.1) * 0.009;
      kamalTorso.current.scale.set(breath, 1, breath);
    }
    // Respiration et attitude enthousiaste de Kyta (co-pilote)
    if (kytaTorso.current) {
      const breath = reducedMotion ? 1 : 1 + Math.sin(t * 2.3 + 0.4) * 0.009;
      kytaTorso.current.scale.set(breath, 1, breath);
    }
    // Aiguilles magnétiques du Log Pose du Nouveau Monde
    kytaCompassNeedles.current.forEach((needle, idx) => {
      if (needle) {
        needle.rotation.y = (reducedMotion ? 0 : Math.sin(t * 5 + idx * 1.8) * 0.35) + idx * 0.8;
      }
    });
    const delta = Math.max(0, Math.min(dt, .25));
    for(let i=0;i<2;i++){
      samplePassengerPose(targets.current[i],t,18+i,0,.36,hornPulse>0?sinceHorn:Infinity,partyOn,reducedMotion,i===0?"kamal":"kyta");
      if (i === 1 && partyOn) sampleCopilotDance(targets.current[i], t - copilotDance.current.start, reducedMotion);
      const targetGain = getDriverReactionGain(partyOn, hornPulse > 0 ? sinceHorn : Infinity, reducedMotion);
      if (targets.current[i].celebrating && !partyOn) normalizeDriverHornArms(targets.current[i], targetGain);
      // L'enveloppe anime déjà l'ouverture du geste ; sa première cible ne doit pas venir de bras pendants.
      if (targets.current[i].celebrating && !poses.current[i].current.celebrating) for (const key of DRIVER_ARM_FIELDS) poses.current[i].current[key] = targets.current[i][key];
      // La dernière pose levée se replie vers le vrai point de repos sans balayer le tableau.
      if (!targets.current[i].celebrating) for (const key of DRIVER_ARM_FIELDS) targets.current[i][key] = poses.current[i].current[key];
      blendPassengerPose(poses.current[i].current,targets.current[i],dt,reducedMotion);
      const pose=poses.current[i].current,root=i===0?kamalRoot.current:kytaRoot.current;
      if(root){root.position.y=0;root.rotation.y=0;root.userData.activity=pose.activity;root.userData.danceGesture=pose.gesture;}
      celebrationGain.current[i] = reducedMotion ? targetGain : THREE.MathUtils.damp(celebrationGain.current[i], targetGain, 12, delta);
      const gain = celebrationGain.current[i];
      const torso = i === 0 ? kamalTorso.current : kytaTorso.current;
      const head = i === 0 ? kamalHead.current : kytaHead.current;
      const torsoState = torsoStates.current[i];
      const activeTorso = !reducedMotion && pose.celebrating;
      torsoState.yaw = reducedMotion ? 0 : THREE.MathUtils.damp(torsoState.yaw, activeTorso ? pose.torsoYaw + pose.rootYaw : 0, 12, delta);
      torsoState.pitch = reducedMotion ? 0 : THREE.MathUtils.damp(torsoState.pitch, activeTorso ? pose.torsoPitch : 0, 12, delta);
      torsoState.roll = reducedMotion ? 0 : THREE.MathUtils.damp(torsoState.roll, activeTorso ? pose.torsoRoll : 0, 12, delta);
      torsoState.bob = reducedMotion ? 0 : THREE.MathUtils.damp(torsoState.bob, activeTorso ? pose.bob * .5 : 0, 12, delta);
      if (torso && head) {
        torso.position.y = 1.48 + torsoState.bob;
        torso.rotation.set(torsoState.pitch, torsoState.yaw, torsoState.roll);
        // Le cou suit le haut du torse : aucune tête flottante pendant le balancement.
        copilotFrame.neck.set(0, .32, 0).applyQuaternion(torso.quaternion);
        head.position.set(copilotFrame.neck.x, 1.48 + torsoState.bob + copilotFrame.neck.y + hornBounce * .6, .14 + copilotFrame.neck.z);
        const driveX = i === 0
          ? (reducedMotion ? 0 : Math.sin(t * 4.2) * 0.012) + (isHonking ? -0.12 : 0)
          : (reducedMotion ? 0 : Math.sin(t * 4.0 + 0.5) * 0.012) + (isHonking ? -0.15 : 0);
        const driveY = i === 0
          ? (reducedMotion ? 0 : Math.sin(t * 1.2) * 0.03)
          : (reducedMotion ? 0.1 : Math.sin(t * 0.8) * 0.1 + 0.1);
        head.rotation.set(
          THREE.MathUtils.lerp(driveX, pose.headPitch, gain),
          THREE.MathUtils.lerp(driveY, pose.headYaw, gain),
          0,
        );
        head.quaternion.premultiply(torso.quaternion);
        copilotFrame.inverse.copy(torso.quaternion).invert();
      } else {
        copilotFrame.inverse.identity();
      }
      for (let arm = 0; arm < 2; arm++) {
        const joint = armJoints[i * 2 + arm], left = arm === 0;
        const shoulder = i === 0 ? left ? kamalLeftArm.current : kamalRightArm.current : left ? kytaLeftArm.current : kytaRightArm.current;
        const elbow = i === 0 ? left ? kamalLeftElbow.current : kamalRightElbow.current : left ? kytaLeftElbow.current : kytaRightElbow.current;
        const wrist = i === 0 ? left ? kamalLeftHand.current : kamalRightHand.current : left ? kytaLeftHand.current : kytaRightHand.current;
        // Le bras qui montre l'horizon reste au-dessus du plan de bord.
        const shoulderX = (left ? pose.leftX : pose.rightX) + (i === 1 && !left ? .25 : 0);
        const shoulderZ = left ? pose.leftZ : pose.rightZ;
        joint.targetShoulder.setFromEuler(joint.targetEuler.set(shoulderX, 0, shoulderZ, "XYZ"));
        joint.targetElbow.setFromEuler(joint.targetEuler.set(left ? pose.leftElbowX : pose.rightElbowX, 0,
          left ? pose.leftElbowZ : pose.rightElbowZ, "XYZ"));
        joint.handTarget.set(0, -DRIVER_FOREARM, 0).applyQuaternion(joint.targetElbow);
        joint.handTarget.setY(joint.handTarget.y - DRIVER_UPPER_ARM);
        joint.handTarget.applyQuaternion(joint.targetShoulder);
        joint.handRotation.copy(joint.targetShoulder).multiply(joint.targetElbow);
        // La paume garde une marge au-dessus de la barre, même pendant le retour.
        if (i === 1 && copilotDance.current.recovering) joint.handTarget.setY(Math.max(.20, joint.handTarget.y));
        prepareDriverArmTarget(joint.handTarget, joint.rest.target, gain, joint.driver);
        // Le torse peut danser ; les mains gardent leur trajet sûr dans le bus.
        joint.handTarget.setY(joint.handTarget.y - torsoState.bob);
        copilotFrame.shoulder.set(joint.side * DRIVER_SHOULDER_X, .14, DRIVER_SHOULDER_Z - .14);
        joint.handTarget.add(copilotFrame.shoulder).applyQuaternion(copilotFrame.inverse).sub(copilotFrame.shoulder);
        joint.handTarget.clampLength(.0001, DRIVER_UPPER_ARM + DRIVER_FOREARM - .0001);
        solveDriverArmTarget(joint.handTarget, joint.solution);
        if (shoulder && elbow && wrist) {
          shoulder.quaternion.setFromEuler(joint.targetEuler.set(joint.solution.shoulderX, joint.solution.shoulderYaw, 0, "YXZ"));
          elbow.quaternion.setFromEuler(joint.targetEuler.set(joint.solution.elbowX, 0, 0, "XYZ"));
          joint.handMix.copy(joint.restHand).slerp(joint.handRotation, gain);
          wrist.quaternion.copy(shoulder.quaternion).multiply(elbow.quaternion).invert();
          wrist.quaternion.multiply(copilotFrame.inverse);
          wrist.quaternion.multiply(joint.handMix);
        }
      }
    }
  });

  return (
    <group>
      {/* ============================================================== */}
      {/* 1. KAMAL (CONDUCTEUR AU VOLANT) */}
      {/* ============================================================== */}
      <group
        ref={kamalRoot} name="bus-crew-kamal" position={[DRIVER_SEAT_POSITIONS.kamal[0], 0, DRIVER_SEAT_POSITIONS.kamal[2] - 0.05]}
        onClick={handleKamalClick}
        onPointerOver={handleDriverPointerOver}
        onPointerOut={handleDriverPointerOut}
      >
        {/* Bulle avec UNIQUEMENT le prénom "Kamal" */}
        <sprite position={[0, 2.35, 0.14]} scale={[kamalNameTex.aspect * 0.11, 0.11, 1]} renderOrder={20}>
          <spriteMaterial
            map={kamalNameTex.texture}
            transparent
            alphaTest={0.06}
            depthTest
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </sprite>

        <group name="crew-hips" position={[0, CABIN_FLOOR_Y + SEATED_HIP_HEIGHT, SEATED_HIP_Z]}>
          <PassengerLowerBody mats={mats} />
        </group>

        {/* --- TORSE : TEE-SHIRT RAYÉ CLAIR --- */}
        <group ref={kamalTorso} name="crew-torso-kamal" position={[0, 1.48, 0.14]}>
          <DriverShirt driver="kamal" mats={mats} />

          <DriverArm driver="kamal" side={-1} mats={mats} shoulder={kamalLeftArm} elbow={kamalLeftElbow} wrist={kamalLeftHand}/>
          <DriverArm driver="kamal" side={1} mats={mats} shoulder={kamalRightArm} elbow={kamalRightElbow} wrist={kamalRightHand}/>
        </group>

        <group ref={kamalHead} position={[0, 1.8, 0.14]}>
          <mesh name="crew-neck-kamal" material={mats.skin}>
            <cylinderGeometry args={[0.058, 0.07, 0.22, 16]} />
          </mesh>
          <group position={[0, 0.2, 0]}><DriverHead driver="kamal" mats={mats} motion={kamalPose} reducedMotion={reducedMotion}/></group>
        </group>
      </group>

      {/* ============================================================== */}
      {/* 2. KYTA (CO-PILOTE & NAVIGATEUR) - POSITION [0.72, -0.10, -3.85] */}
      {/* ============================================================== */}
      <group
        ref={kytaRoot} name="bus-crew-kyta" position={[DRIVER_SEAT_POSITIONS.kyta[0], 0, DRIVER_SEAT_POSITIONS.kyta[2] - 0.05]}
        onClick={handleKytaClick}
        onPointerOver={handleDriverPointerOver}
        onPointerOut={handleDriverPointerOut}
      >
        {/* Bulle avec UNIQUEMENT le prénom "Kyta" */}
        <sprite position={[0, 2.35, 0.14]} scale={[kytaNameTex.aspect * 0.11, 0.11, 1]} renderOrder={20}>
          <spriteMaterial
            map={kytaNameTex.texture}
            transparent
            alphaTest={0.06}
            depthTest
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </sprite>

        <group name="crew-hips" position={[0, CABIN_FLOOR_Y + SEATED_HIP_HEIGHT, SEATED_HIP_Z]}>
          <PassengerLowerBody mats={mats} />
        </group>

        {/* --- TORSE : SURCHEMISE BLEUE ET TEE-SHIRT CLAIR --- */}
        <group ref={kytaTorso} name="crew-torso-kyta" position={[0, 1.48, 0.14]}>
          <DriverShirt driver="kyta" mats={mats} />

          <DriverArm driver="kyta" side={-1} mats={mats} shoulder={kytaLeftArm} elbow={kytaLeftElbow} wrist={kytaLeftHand}/>
          <DriverArm driver="kyta" side={1} mats={mats} shoulder={kytaRightArm} elbow={kytaRightElbow} wrist={kytaRightHand}>
            {/* Triple Log Pose au poignet, visible derrière la main posée sur la barre. */}
            <group name="crew-log-pose" position={[0, .052, -.015]} rotation={[-Math.PI / 2, 0, 0]}>
              <mesh material={mats.leather}><boxGeometry args={[.078, .025, .058]}/></mesh>
              <mesh material={mats.gold} position={[0, .018, 0]}><boxGeometry args={[.11, .012, .045]}/></mesh>
              {[-.035, 0, .035].map((cx, ci) => <group key={`compass-${ci}`} position={[cx, .038, 0]}>
                <mesh material={mats.glassDome}><sphereGeometry args={[.018, 12, 12]}/></mesh>
                <mesh ref={(el: THREE.Mesh | null) => { kytaCompassNeedles.current[ci] = el; }} material={mats.needleRed}>
                  <boxGeometry args={[.004, .003, .024]}/>
                </mesh>
              </group>)}
            </group>
          </DriverArm>
        </group>
        {/* La carte repose sur les genoux et libère les deux mains pour la barre. */}
        <group name="crew-navigation-map" position={[0, 1.27, -.10]} rotation={[0, -.10, 0]}>
          <mesh material={mats.parchment}><boxGeometry args={[.24, .012, .16]}/></mesh>
          <mesh material={mats.kytaShirt} position={[-.055, .008, -.02]} rotation={[0, .3, 0]}>
            <boxGeometry args={[.012, .005, .12]}/>
          </mesh>
          <mesh material={mats.kytaShirt} position={[.035, .008, .025]} rotation={[0, -.5, 0]}>
            <boxGeometry args={[.10, .005, .010]}/>
          </mesh>
          <mesh material={mats.needleRed} position={[.075, .012, -.04]}>
            <sphereGeometry args={[.01, 8, 6]}/>
          </mesh>
        </group>

        <group ref={kytaHead} position={[0, 1.8, 0.14]}>
          <mesh name="crew-neck-kyta" material={mats.skin}>
            <cylinderGeometry args={[0.058, 0.07, 0.22, 16]} />
          </mesh>
          <group position={[0, 0.2, 0]}><DriverHead driver="kyta" mats={mats} motion={kytaPose} reducedMotion={reducedMotion}/></group>
        </group>
      </group>
    </group>
  );
}

export default memo(BusDrivers);
