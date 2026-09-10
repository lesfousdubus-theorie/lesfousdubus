"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { WorldState } from "./constants";

interface WeatherProps {
  worldRef: React.RefObject<WorldState>;
  lowPower?: boolean;
}

const AREA = { x: 34, y: 28, z: 74 };

function seededValue(index: number, salt: number) {
  return Math.abs(Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453) % 1;
}

export default function Weather({ worldRef, lowPower = false }: WeatherProps) {
  const rainRef = useRef<THREE.LineSegments>(null);
  const rainMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const snowRef = useRef<THREE.Points>(null);
  const snowMaterialRef = useRef<THREE.PointsMaterial>(null);
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const rainGeometry = useMemo(() => {
    const count = lowPower ? 180 : 420;
    const positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const x = (seededValue(i, 1) - 0.5) * AREA.x * 2;
      const y = seededValue(i, 2) * AREA.y;
      const z = (seededValue(i, 3) - 0.5) * AREA.z * 2;
      const offset = i * 6;
      positions[offset] = x;
      positions[offset + 1] = y;
      positions[offset + 2] = z;
      positions[offset + 3] = x + 0.12;
      positions[offset + 4] = y - 0.75;
      positions[offset + 5] = z + 0.08;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [lowPower]);

  const snowGeometry = useMemo(() => {
    const count = lowPower ? 220 : 520;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (seededValue(i, 4) - 0.5) * AREA.x * 2;
      positions[i * 3 + 1] = seededValue(i, 5) * AREA.y;
      positions[i * 3 + 2] = (seededValue(i, 6) - 0.5) * AREA.z * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [lowPower]);

  useFrame((state, dt) => {
    const weather = worldRef.current?.weather ?? "clear";
    const intensity = worldRef.current?.weatherIntensity ?? 0;
    const rainOpacity = weather === "rain" ? intensity * 0.72 : 0;
    const snowOpacity = weather === "snow" ? intensity * 0.92 : 0;

    if (rainMaterialRef.current) rainMaterialRef.current.opacity = rainOpacity;
    if (snowMaterialRef.current) snowMaterialRef.current.opacity = snowOpacity;
    if (rainRef.current) rainRef.current.visible = rainOpacity > 0.01;
    if (snowRef.current) snowRef.current.visible = snowOpacity > 0.01;
    if (reducedMotion) return;

    if (rainRef.current && rainOpacity > 0.01) {
      const positions = rainRef.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i += 2) {
        let y = positions.getY(i) - dt * 24;
        if (y < 0) y += AREA.y;
        positions.setY(i, y);
        positions.setY(i + 1, y - 0.75);
      }
      positions.needsUpdate = true;
    }

    if (snowRef.current && snowOpacity > 0.01) {
      const positions = snowRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const time = state.clock.elapsedTime;
      for (let i = 0; i < positions.count; i++) {
        let y = positions.getY(i) - dt * (1.5 + seededValue(i, 8) * 1.8);
        if (y < 0) y += AREA.y;
        positions.setY(i, y);
        positions.setX(i, positions.getX(i) + Math.sin(time * 0.7 + i) * dt * 0.12);
      }
      positions.needsUpdate = true;
    }
  });

  return (
    <group position={[0, 0.2, -6]}>
      <lineSegments ref={rainRef} geometry={rainGeometry} frustumCulled={false} renderOrder={20}>
        <lineBasicMaterial
          ref={rainMaterialRef}
          color="#b7ddff"
          transparent
          opacity={0}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </lineSegments>
      <points ref={snowRef} geometry={snowGeometry} frustumCulled={false} renderOrder={21}>
        <pointsMaterial
          ref={snowMaterialRef}
          color="#ffffff"
          size={lowPower ? 0.13 : 0.16}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          fog
          toneMapped={false}
        />
      </points>
    </group>
  );
}
