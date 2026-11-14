"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { WHEEL_CENTER_Y, WHEEL_RADIUS } from "./BusBodyGeometry";

interface Props {
  positions: [number, number][];
  wheels: RefObject<(THREE.Group | null)[]>;
  visible: boolean;
  mats: Record<string, THREE.Material>;
}

/** La rotation se fait autour de l'essieu local Y, avec les écrous sur les jantes. */
export default function BusWheels({ positions, wheels, visible, mats }: Props) {
  return <group name="bus-wheels" visible={visible}>
    {positions.map(([x, z], index) => <group key={index} position={[x, WHEEL_CENTER_Y, z]} rotation={[0, 0, Math.PI / 2]}>
      <group ref={(wheel) => { wheels.current[index] = wheel; }}>
        <mesh material={mats.tire} castShadow>
          <cylinderGeometry args={[WHEEL_RADIUS - 0.025, WHEEL_RADIUS - 0.025, 0.32, 32]} />
        </mesh>
        {[-1, 1].map((face) => <group key={face} position={[0, face * 0.16, 0]}>
          <mesh material={mats.tire} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.49, 0.06, 8, 32]} />
          </mesh>
          <mesh material={mats.chrome} position={[0, face * 0.014, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.032, 32]} />
          </mesh>
          <mesh material={mats.bodyDark} position={[0, face * 0.04, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.065, 20]} />
          </mesh>
          <mesh material={mats.yellow} position={[0, face * 0.08, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.02, 16]} />
          </mesh>
        </group>)}
        <RimInstances radius={0.2} faceOffset={0.199} material={mats.dark} bolt />
        <RimInstances radius={0.285} faceOffset={0.196} material={mats.dark} />
      </group>
    </group>)}
  </group>;
}

function RimInstances({ radius, faceOffset, material, bolt = false }: {
  radius: number; faceOffset: number; material: THREE.Material; bolt?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const matrix = new THREE.Matrix4();
    let index = 0;
    for (const face of [-1, 1]) for (let k = 0; k < 8; k++) {
      const angle = k * Math.PI / 4;
      matrix.makeTranslation(Math.cos(angle) * radius, face * faceOffset, Math.sin(angle) * radius);
      ref.current.setMatrixAt(index++, matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [radius, faceOffset]);
  return <instancedMesh ref={ref} args={[undefined, undefined, 16]} material={material}>
    <cylinderGeometry args={bolt ? [0.024, 0.024, 0.035, 6] : [0.038, 0.038, 0.012, 10]} />
  </instancedMesh>;
}
