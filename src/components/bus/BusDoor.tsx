"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BUS_DOOR, type BusDoorLayout } from "@/lib/bus-layout";
import { ENTRY_STEPS, getEntryStepPose } from "@/lib/bus-door";
import { DOOR_FRAME_X, DOOR_FRAME_THICKNESS, DOOR_JAMB_HALF_Z, DOOR_INNER_TRIM_X, DOOR_INNER_TRIM_DEPTH, DOOR_INNER_TRIM_HALF_Z } from "@/lib/bus-interior-geometry";
import type { Phase } from "./constants";
import type { JourneyState } from "@/lib/bus-journey";

interface Props {
  mats: Record<string, THREE.Material>;
  phase: Phase;
  reducedMotion: boolean;
  journey:React.RefObject<JourneyState>;
  door?: BusDoorLayout;
}

/** Deux vrais vantaux articulés, dans une baie découpée dans la caisse. */
export default function BusDoor({ mats, phase, journey, reducedMotion, door = { ...BUS_DOOR, index: 0 } }: Props) {
  const front = useRef<THREE.Group>(null);
  const rear = useRef<THREE.Group>(null);
  const steps = useRef<(THREE.Group | null)[]>([]);
  const previewOpen = useRef(false);
  const opening = useRef(0);
  const landing = useRef<THREE.Mesh>(null);
  const frontZ = -door.width / 2;
  const rearZ = door.width / 2;
  const height = door.top - door.bottom;
  const centerY = (door.top + door.bottom) / 2;
  useFrame((_, dt) => {
    if (phase !== "outside") previewOpen.current = false;
    const target = (journey.current.doorOpen && (journey.current.doorIndex ?? 0) === door.index) || (phase === "outside" && previewOpen.current) ? 1 : 0;
    opening.current = reducedMotion ? target : THREE.MathUtils.damp(opening.current, target, 8, Math.min(dt, 0.25));
    if (front.current) front.current.rotation.y = opening.current * Math.PI * 0.57;
    if (rear.current) rear.current.rotation.y = -opening.current * Math.PI * 0.57;
    if (landing.current) {
      landing.current.position.x = 0.88 - 0.96 * THREE.MathUtils.smoothstep(opening.current, 0, 0.55);
      landing.current.visible = opening.current < 0.55;
    }
    steps.current.forEach((step, index) => {
      if (!step) return;
      const pose = getEntryStepPose(index, opening.current);
      step.position.set(pose.x, pose.y, 0);
      step.visible = opening.current > 0.005;
    });
  });

  return <group name="bus-passenger-door" position={[0, 0, door.z]} userData={{ doorIndex: door.index, doorZ: door.z }}>
    {/* Montants structurels : aucun vitrage ni bandeau ne traverse la baie. */}
    {[frontZ, rearZ].map((z) => <group key={z}>
      <mesh name="bus-door-structural-jamb" material={mats.bodyDark} castShadow position={[DOOR_FRAME_X, centerY, z]}>
        <boxGeometry args={[DOOR_FRAME_THICKNESS, height, DOOR_JAMB_HALF_Z * 2]} />
      </mesh>
      <mesh material={mats.dark} position={[1.395, centerY, z]}><boxGeometry args={[0.015, height, 0.065]} /></mesh>
      {/* Le couvre-joint intérieur est devant la caisse et le montant. Les rails
          s'arrêtent avant lui, plutôt que de superposer leurs faces bleues. */}
      <mesh name="bus-door-inner-jamb" material={mats.bodyDark} position={[DOOR_INNER_TRIM_X, centerY, z]}>
        <boxGeometry args={[DOOR_INNER_TRIM_DEPTH, height, DOOR_INNER_TRIM_HALF_Z * 2]} />
      </mesh>
    </group>)}
    <mesh material={mats.dark} position={[DOOR_FRAME_X, door.top, 0]}>
      <boxGeometry args={[DOOR_FRAME_THICKNESS, 0.08, door.width]} />
    </mesh>
    {/* Ferme le puits des marches en roulant ; se range sous le plancher à l'ouverture. */}
    <mesh ref={landing} name="bus-entry-landing" material={mats.floor} position={[0.88, 0.58, 0]}>
      <boxGeometry args={[0.94, 0.1, door.width - 0.1]} />
    </mesh>

    {/* Tiroirs horizontaux : sortent d'abord, puis descendent à plat. */}
    {ENTRY_STEPS.map(({ width }, index) => <group key={index} ref={node => { steps.current[index] = node; }} name={`bus-entry-step-${index}`} visible={false}>
      <mesh material={mats.dark} castShadow position={[0, -0.04, 0]}>
        <boxGeometry args={[width, 0.08, door.width - 0.12]} />
      </mesh>
      <mesh material={mats.yellow} position={[width / 2 - 0.012, 0.005, 0]}>
        <boxGeometry args={[0.022, 0.014, door.width - 0.16]} />
      </mesh>
      {[-0.09, 0, 0.09].map(dx => <mesh key={dx} material={mats.chrome} position={[dx, 0.003, 0]}>
        <boxGeometry args={[0.009, 0.006, door.width - 0.22]} />
      </mesh>)}
    </group>)}
    {/* Main courante à l'arrière du vestibule, hors du passage. */}
    <mesh material={mats.yellow} position={[1.1, 1.53, rearZ + 0.1]}>
      <cylinderGeometry args={[0.027, 0.027, 1.7, 10]} />
    </mesh>

    <group onClick={(event) => {
      event.stopPropagation();
      if (phase === "outside") previewOpen.current = !previewOpen.current;
    }}>
      <group ref={front} name="bus-door-front-leaf" position={[door.x + 0.02, 0, frontZ + 0.045]}>
        <DoorLeaf direction={1} mats={mats} door={door} />
      </group>
      <group ref={rear} name="bus-door-rear-leaf" position={[door.x + 0.02, 0, rearZ - 0.045]}>
        <DoorLeaf direction={-1} mats={mats} door={door} />
      </group>
    </group>
  </group>;
}

function DoorLeaf({ direction, mats, door }: { direction: number; mats: Record<string, THREE.Material>; door: BusDoorLayout }) {
  const width = door.width / 2 - 0.047;
  const z = direction * width / 2;
  const bottom = door.bottom + 0.03;
  const top = door.top - 0.03;
  const height = top - bottom;
  const panelTop = 1.4;
  return <group>
    <mesh name="bus-door-glazing" material={mats.windowGlass} position={[0, 2.065, z]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[width - 0.07, 1.28]} />
    </mesh>
    <mesh material={mats.body} castShadow position={[0, (bottom + panelTop) / 2, z]}>
      <boxGeometry args={[0.07, panelTop - bottom, width - 0.05]} />
    </mesh>
    {[0, direction * width].map((edge) => <mesh key={edge} material={mats.dark} castShadow position={[0.02, (bottom + top) / 2, edge]}>
      <boxGeometry args={[0.085, height, 0.045]} />
    </mesh>)}
    {[door.bottom + 0.04, 1.42, door.top - 0.04].map((y) => <mesh key={y} material={mats.dark} position={[0.02, y, z]}>
      <boxGeometry args={[0.085, 0.055, width]} />
    </mesh>)}
    <mesh material={mats.yellow} position={[0.042, 1.72, z]}><boxGeometry args={[0.018, 0.05, width - 0.06]} /></mesh>
    <mesh material={mats.chrome} position={[0.071, 1.34, direction * (width - 0.09)]}>
      <boxGeometry args={[0.03, 0.18, 0.022]} />
    </mesh>
    {[bottom + 0.1, 2.55].map((y) => <mesh key={y} material={mats.chrome} position={[0, y, 0]}>
      <cylinderGeometry args={[0.035, 0.035, 0.15, 8]} />
    </mesh>)}
  </group>;
}
