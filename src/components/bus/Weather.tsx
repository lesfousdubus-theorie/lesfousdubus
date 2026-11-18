"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { BUS_FRONT_Z } from "@/lib/bus-layout";
import { WORLD_SPEED, type WorldState } from "./constants";

interface WeatherProps {
  worldRef: React.RefObject<WorldState>;
  lowPower?: boolean;
  rainCount?: number;
  snowCount?: number;
  reducedMotion?: boolean;
  cabinCenterZ?: number;
  cabinLength?: number;
}

const AREA = { x: 34, y: 28, z: 74 };
const GROUP_Y = 0.2;
const BUS_CLEAR_HALF_X = 1.38;
const BUS_CLEAR_LOCAL_Y = 3.35 - GROUP_Y;
const RAIN_STREAK_DX = 0.08;
const RAIN_STREAK_DY = -0.75;
const RAIN_FALL_SPEED = 24;
const RAIN_DAY_COLOR = new THREE.Color("#b7ddff");
const RAIN_NIGHT_COLOR = new THREE.Color("#3a5270");
const SNOW_DAY_COLOR = new THREE.Color("#ffffff");
const SNOW_NIGHT_COLOR = new THREE.Color("#4f6482");

function seededValue(index: number, salt: number) {
  return Math.abs(Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453) % 1;
}

function isInsideBusClearance(x: number, localY: number, localZ: number, cabinCenterZ: number, busMinZ: number, busMaxZ: number) {
  if (Math.abs(x) >= BUS_CLEAR_HALF_X || localY >= BUS_CLEAR_LOCAL_Y) return false;
  const worldZ = localZ + cabinCenterZ;
  return worldZ >= busMinZ && worldZ <= busMaxZ;
}

function wrapRange(value: number, span: number) {
  return ((((value + span) % (span * 2)) + span * 2) % (span * 2)) - span;
}

export default function Weather({
  worldRef,
  lowPower = false,
  rainCount,
  snowCount,
  reducedMotion = false,
  cabinCenterZ = 0,
  cabinLength = 9.2,
}: WeatherProps) {
  const rainRef = useRef<THREE.LineSegments>(null);
  const rainMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const snowRef = useRef<THREE.Points>(null);
  const snowMaterialRef = useRef<THREE.PointsMaterial>(null);

  const areaZ = Math.max(AREA.z, cabinLength / 2 + 60);
  const densityScale = Math.min(2.5, areaZ / AREA.z);
  const busMinZ = BUS_FRONT_Z - 0.3;
  const busMaxZ = BUS_FRONT_Z + cabinLength + 0.3;
  const baseRainCount = Math.max(0, rainCount ?? (lowPower ? 180 : 420));
  const baseSnowCount = Math.max(0, snowCount ?? (lowPower ? 220 : 520));

  const rainGeometry = useMemo(() => {
    const count = Math.round(baseRainCount * densityScale);
    const positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const x = (seededValue(i, 1) - 0.5) * AREA.x * 2;
      let y = seededValue(i, 2) * AREA.y;
      const z = (seededValue(i, 3) - 0.5) * areaZ * 2;
      if (isInsideBusClearance(x, y + RAIN_STREAK_DY, z, cabinCenterZ, busMinZ, busMaxZ)) {
        const minRoofY = BUS_CLEAR_LOCAL_Y - RAIN_STREAK_DY;
        y = minRoofY + seededValue(i, 11) * (AREA.y - minRoofY);
      }
      const offset = i * 6;
      positions[offset] = x;
      positions[offset + 1] = y;
      positions[offset + 2] = z;
      positions[offset + 3] = x + RAIN_STREAK_DX;
      positions[offset + 4] = y + RAIN_STREAK_DY;
      positions[offset + 5] = z + 0.5;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [baseRainCount, areaZ, densityScale, cabinCenterZ, busMinZ, busMaxZ]);

  const snowGeometry = useMemo(() => {
    const count = Math.round(baseSnowCount * densityScale);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = (seededValue(i, 4) - 0.5) * AREA.x * 2;
      let y = seededValue(i, 5) * AREA.y;
      const z = (seededValue(i, 6) - 0.5) * areaZ * 2;
      if (isInsideBusClearance(x, y, z, cabinCenterZ, busMinZ, busMaxZ)) {
        y = BUS_CLEAR_LOCAL_Y + seededValue(i, 12) * (AREA.y - BUS_CLEAR_LOCAL_Y);
      }
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [baseSnowCount, areaZ, densityScale, cabinCenterZ, busMinZ, busMaxZ]);

  useEffect(() => () => {
    rainGeometry.dispose();
  }, [rainGeometry]);

  useEffect(() => () => {
    snowGeometry.dispose();
  }, [snowGeometry]);

  useFrame((state, dt) => {
    const frameDt = Math.min(dt, 0.1);
    const world = worldRef.current;
    const weather = world?.weather ?? "clear";
    const intensity = world?.weatherIntensity ?? 0;
    const daylight = THREE.MathUtils.clamp(world?.daylight ?? 1, 0, 1);
    const busSpeed = WORLD_SPEED * (world?.speedMultiplier ?? 1) * (world?.motionFactor ?? 1);
    const rainOpacity = weather === "rain" ? intensity * 0.72 : 0;
    const snowOpacity = weather === "snow" ? intensity * 0.92 : 0;

    if (rainMaterialRef.current) {
      rainMaterialRef.current.opacity = rainOpacity;
      rainMaterialRef.current.color.copy(RAIN_NIGHT_COLOR).lerp(RAIN_DAY_COLOR, daylight);
    }
    if (snowMaterialRef.current) {
      snowMaterialRef.current.opacity = snowOpacity;
      snowMaterialRef.current.color.copy(SNOW_NIGHT_COLOR).lerp(SNOW_DAY_COLOR, daylight);
    }
    if (rainRef.current) rainRef.current.visible = rainOpacity > 0.01;
    if (snowRef.current) snowRef.current.visible = snowOpacity > 0.01;

    if (rainRef.current && rainOpacity > 0.01) {
      const positions = rainRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const streakDz = reducedMotion ? 0.08 : (busSpeed / RAIN_FALL_SPEED) * -RAIN_STREAK_DY;
      const minRoofY = BUS_CLEAR_LOCAL_Y - RAIN_STREAK_DY;
      for (let i = 0; i < positions.count; i += 2) {
        const x = positions.getX(i);
        let y = positions.getY(i) - frameDt * RAIN_FALL_SPEED;
        const z = reducedMotion ? positions.getZ(i) : wrapRange(positions.getZ(i) + frameDt * busSpeed, areaZ);
        if (y < 0) y += AREA.y;
        if (isInsideBusClearance(x, y + RAIN_STREAK_DY, z, cabinCenterZ, busMinZ, busMaxZ)) {
          y = minRoofY + seededValue(i, 13) * (AREA.y - minRoofY);
        }
        positions.setXYZ(i, x, y, z);
        positions.setXYZ(i + 1, x + RAIN_STREAK_DX, y + RAIN_STREAK_DY, z + streakDz);
      }
      positions.needsUpdate = true;
    }

    if (snowRef.current && snowOpacity > 0.01) {
      const positions = snowRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const time = state.clock.elapsedTime;
      for (let i = 0; i < positions.count; i++) {
        let x = positions.getX(i);
        let y = positions.getY(i) - frameDt * (1.5 + seededValue(i, 8) * 1.8);
        const z = reducedMotion ? positions.getZ(i) : wrapRange(positions.getZ(i) + frameDt * busSpeed * 0.55, areaZ);
        if (y < 0) y += AREA.y;
        if (!reducedMotion) {
          x = wrapRange(x + Math.sin(time * 0.7 + i) * frameDt * 0.12, AREA.x);
        }
        if (isInsideBusClearance(x, y, z, cabinCenterZ, busMinZ, busMaxZ)) {
          y = BUS_CLEAR_LOCAL_Y + seededValue(i, 14) * (AREA.y - BUS_CLEAR_LOCAL_Y);
        }
        positions.setXYZ(i, x, y, z);
      }
      positions.needsUpdate = true;
    }
  });

  return (
    <group position={[0, GROUP_Y, cabinCenterZ]}>
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
