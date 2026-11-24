"use client";

import { memo, useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { WHEEL_CENTER_Y, WHEEL_RADIUS } from "./BusBodyGeometry";

interface Props {
  positions: [number, number][];
  wheels: RefObject<(THREE.Group | null)[]>;
  visible: boolean;
  mats: Record<string, THREE.Material>;
}

/** La rotation se fait autour de l'essieu local Y, avec les écrous sur les jantes. */
const BusWheels = memo(function BusWheels({ positions, wheels, visible, mats }: Props) {
  return <group name="bus-wheels" visible={visible}>
    {positions.map(([x, z], index) => <group key={index} position={[x + Math.sign(x) * 0.1, WHEEL_CENTER_Y, z]} rotation={[0, 0, Math.PI / 2]}>
      <group ref={(wheel) => { wheels.current[index] = wheel; }}>
        <mesh material={mats.tire} castShadow>
          <cylinderGeometry args={[WHEEL_RADIUS - 0.025, WHEEL_RADIUS - 0.025, 0.24, 32]} />
        </mesh>
        {[-1, 1].map((face) => <group key={face} position={[0, face * 0.1, 0]}>
          <mesh material={mats.tire} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.51, 0.04, 8, 32]} />
          </mesh>
          <mesh material={mats.chrome} position={[0, face * 0.012, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.024, 32]} />
          </mesh>
          <mesh material={mats.bodyDark} position={[0, face * 0.02, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.036, 20]} />
          </mesh>
          <mesh material={mats.yellow} position={[0, face * 0.036, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.012, 16]} />
          </mesh>
        </group>)}
        <RimInstances radius={0.2} faceOffset={0.129} material={mats.dark} bolt />
        <RimInstances radius={0.285} faceOffset={0.126} material={mats.dark} />
      </group>
    </group>)}
  </group>;
});

export default BusWheels;

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
  return <instancedMesh ref={ref} args={[undefined, undefined, 16]} material={material} frustumCulled={false}>
    <cylinderGeometry args={bolt ? [0.024, 0.024, 0.022, 6] : [0.038, 0.038, 0.01, 10]} />
  </instancedMesh>;
}
