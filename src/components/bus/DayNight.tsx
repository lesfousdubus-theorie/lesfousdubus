"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { type WorldState } from "./constants";

interface Props {
  worldRef: React.RefObject<WorldState>;
  modeOverride?: "day" | "night" | null;
  lowPower?: boolean;
  reducedMotion?: boolean;
  cameraFar?: number;
  cabinCenterZ?: number;
  cabinLength?: number;
}

const DAY_SKY = new THREE.Color("#79c2ff");
const DUSK_SKY = new THREE.Color("#ff9a5c");
const NIGHT_SKY = new THREE.Color("#060b26");
const DAY_FOG = new THREE.Color("#bfe3ff");
const NIGHT_FOG = new THREE.Color("#0a1030");
const DUSK_FOG = new THREE.Color("#ffb88a");
const MOON_LIGHT = new THREE.Color("#9fb4ff");
const DUSK_LIGHT = new THREE.Color("#ffcf9a");
const SUN_LIGHT = new THREE.Color("#ffffff");

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export default function DayNight({
  worldRef,
  modeOverride,
  lowPower = false,
  reducedMotion = false,
  cameraFar = 2000,
  cabinCenterZ = 0,
  cabinLength = 9.2,
}: Props) {
  const celestial = useRef<THREE.Group>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const sunMesh = useRef<THREE.Mesh>(null);
  const moonMesh = useRef<THREE.Mesh>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const starsMat = useRef<THREE.PointsMaterial>(null);
  const starsRef = useRef<THREE.Points>(null);
  const sunTarget = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0, 1.2, 0);
    return obj;
  }, []);

  // Position du soleil lissée pour permettre des transitions douces lors du clic Jour/Nuit
  const curSunY = useRef(0.85);
  const curSunX = useRef(0.1);

  const skyColor = useMemo(() => new THREE.Color(), []);
  const fogColor = useMemo(() => new THREE.Color(), []);
  const lightColor = useMemo(() => new THREE.Color(), []);
  const sunPosition = useMemo(() => new THREE.Vector3(), []);

  const fogFar = Math.max(750, cameraFar * 0.85);
  const skyDist = Math.max(900, cameraFar * 0.88);
  // Garder l'avant du bus (-4.6) dans la shadow camera [-46, 46] tout en suivant le centre cabine.
  const shadowSpanBound = Math.max(36, 42 - Math.min(8, cabinLength * 0.1));
  const targetZ = THREE.MathUtils.clamp(cabinCenterZ, -shadowSpanBound, 36);

  const starGeo = useMemo(() => {
    const n = lowPower ? 700 : 1800;
    const pos = new Float32Array(n * 3);
    const fractHash = (seed: number) => {
      const x = Math.sin(seed) * 43758.5453123;
      return x - Math.floor(x);
    };
    for (let i = 0; i < n; i++) {
      const u = fractHash(i * 12.9898 + 78.233);
      const v = fractHash(i * 39.346 + 11.135);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(1 - v * 0.96); // hémisphère supérieur uniforme
      const r = 900;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 20;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [lowPower]);

  useEffect(() => () => {
    starGeo.dispose();
  }, [starGeo]);

  useFrame((state, dt) => {
    let targetSunY = 0.85;
    let targetSunX = 0.1;

    if (modeOverride === "day") {
      targetSunY = 0.85;
      targetSunX = 0.1;
    } else if (modeOverride === "night") {
      targetSunY = -0.75;
      targetSunX = 0.4;
    } else {
      // Heure locale réelle dans la vraie vie
      const now = new Date();
      const realHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

      // Lever du soleil ~06:45, Coucher ~20:45
      if (realHour >= 6.75 && realHour <= 20.75) {
        const dayProgress = (realHour - 6.75) / (20.75 - 6.75); // 0 -> 1
        const angle = dayProgress * Math.PI;
        targetSunY = Math.sin(angle);
        targetSunX = -Math.cos(angle);
      } else {
        const nightHours = realHour > 20.75 ? realHour - 20.75 : realHour + (24 - 20.75);
        const nightProgress = nightHours / 10.0;
        const angle = nightProgress * Math.PI;
        targetSunY = -Math.sin(angle);
        targetSunX = Math.cos(angle);
      }
    }

    // Interpolation fluide vers la cible (transition douce au clic ou au fil des secondes)
    const blend = reducedMotion ? 1 : Math.min(1, Math.min(dt, 0.1) * 2.8);
    curSunY.current += (targetSunY - curSunY.current) * blend;
    curSunX.current += (targetSunX - curSunX.current) * blend;

    const sunY = curSunY.current;
    const sunX = curSunX.current;
    const daylight = smoothstep(-0.12, 0.25, sunY);
    const dusk = 1 - Math.min(1, Math.abs(sunY) / 0.22); // proche de l'horizon

    if (worldRef.current) {
      worldRef.current.daylight = daylight;
      worldRef.current.timeOfDay = (sunX + 1) / 2;
    }

    skyColor.copy(NIGHT_SKY).lerp(DAY_SKY, daylight);
    skyColor.lerp(DUSK_SKY, dusk * 0.7 * (0.3 + daylight));
    fogColor.copy(NIGHT_FOG).lerp(DAY_FOG, daylight);
    fogColor.lerp(DUSK_FOG, dusk * 0.6 * (0.3 + daylight));

    if (state.scene.background instanceof THREE.Color) state.scene.background.copy(skyColor);
    else state.scene.background = skyColor.clone();
    if (state.scene.fog instanceof THREE.Fog) {
      state.scene.fog.color.copy(fogColor);
      state.scene.fog.far = fogFar;
    } else if (state.scene.fog) {
      state.scene.fog.color.copy(fogColor);
    }

    // Transition continue de la lumière directionnelle autour du crépuscule sans saut de direction ni de teinte
    const lightBlend = smoothstep(0.02, 0.35, daylight);
    const duskGlow = Math.sin(Math.PI * smoothstep(0.02, 0.55, daylight));
    const lightX = THREE.MathUtils.lerp(-sunX, sunX, lightBlend);
    const lightY = THREE.MathUtils.lerp(Math.max(-sunY, 0.16), Math.max(sunY, 0.16), lightBlend)
      + Math.sin(lightBlend * Math.PI) * 0.25;
    sunTarget.position.set(0, 1.2, targetZ);
    sunTarget.updateMatrixWorld();
    sunPosition.set(lightX * 60, lightY * 60, targetZ - 25);
    lightColor.copy(MOON_LIGHT).lerp(SUN_LIGHT, smoothstep(0.05, 0.45, daylight)).lerp(DUSK_LIGHT, duskGlow * 0.65);
    if (sun.current) {
      sun.current.position.copy(sunPosition);
      sun.current.intensity = 0.15 + daylight * 2.6;
      sun.current.color.copy(lightColor);
      sun.current.target = sunTarget;
    }

    if (celestial.current) celestial.current.position.copy(state.camera.position);
    const dirNorm = Math.hypot(sunX, sunY, 0.43) || 1;
    const celestialScale = skyDist / 760;
    if (sunMesh.current) {
      sunMesh.current.position.set((sunX / dirNorm) * skyDist, (sunY / dirNorm) * skyDist, (-0.43 / dirNorm) * skyDist);
      sunMesh.current.scale.setScalar(celestialScale);
      sunMesh.current.visible = sunY > -0.1;
    }
    if (moonMesh.current) {
      moonMesh.current.position.set((-sunX / dirNorm) * skyDist, (-sunY / dirNorm) * skyDist, (-0.43 / dirNorm) * skyDist);
      moonMesh.current.scale.setScalar(celestialScale);
      moonMesh.current.visible = -sunY > -0.1;
    }
    if (ambient.current) ambient.current.intensity = 0.12 + daylight * 0.5;
    if (hemi.current) hemi.current.intensity = 0.15 + daylight * 0.6;
    if (starsMat.current) starsMat.current.opacity = Math.max(0, 1 - daylight * 1.4);
    if (starsRef.current) {
      starsRef.current.scale.setScalar(skyDist / 900);
      starsRef.current.rotation.y = reducedMotion ? 0 : state.clock.elapsedTime * 0.004;
    }
  });

  return (
    <>
      <fog attach="fog" args={["#bfe3ff", 120, fogFar]} />
      <ambientLight ref={ambient} intensity={0.5} />
      <hemisphereLight ref={hemi} args={["#bde3ff", "#5a4a30", 0.6]} />
      <primitive object={sunTarget} />
      <directionalLight
        ref={sun}
        position={[30, 50, -25]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={lowPower ? 1024 : 2048}
        shadow-mapSize-height={lowPower ? 1024 : 2048}
        shadow-camera-left={-46}
        shadow-camera-right={46}
        shadow-camera-top={46}
        shadow-camera-bottom={-46}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-bias={-0.00015}
        shadow-normalBias={0.006}
      />
      <group ref={celestial}>
        <mesh ref={sunMesh} renderOrder={-1}>
          <sphereGeometry args={[38, 24, 24]} />
          <meshBasicMaterial color="#fff2b0" fog={false} depthWrite={false} />
        </mesh>
        <mesh ref={moonMesh} renderOrder={-1}>
          <sphereGeometry args={[26, 24, 24]} />
          <meshBasicMaterial color="#e9eefc" fog={false} depthWrite={false} />
        </mesh>
        <points ref={starsRef} geometry={starGeo} renderOrder={-2}>
          <pointsMaterial
            ref={starsMat}
            color="#ffffff"
            size={2.2}
            sizeAttenuation={false}
            transparent
            opacity={0}
            depthWrite={false}
            fog={false}
          />
        </points>
      </group>
    </>
  );
}
