"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { DAY_LENGTH, type WorldState } from "./constants";

interface Props {
  worldRef: React.RefObject<WorldState>;
  modeOverride?: "day" | "night" | null;
}

const DAY_SKY = new THREE.Color("#79c2ff");
const DUSK_SKY = new THREE.Color("#ff9a5c");
const NIGHT_SKY = new THREE.Color("#060b26");
const DAY_FOG = new THREE.Color("#bfe3ff");
const NIGHT_FOG = new THREE.Color("#0a1030");
const DUSK_FOG = new THREE.Color("#ffb88a");

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export default function DayNight({ worldRef, modeOverride }: Props) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const sunMesh = useRef<THREE.Mesh>(null);
  const moonMesh = useRef<THREE.Mesh>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const starsMat = useRef<THREE.PointsMaterial>(null);
  const starsRef = useRef<THREE.Points>(null);

  // Position du soleil lissée pour permettre des transitions douces lors du clic Jour/Nuit
  const curSunY = useRef(0.85);
  const curSunX = useRef(0.1);

  const skyColor = useMemo(() => new THREE.Color(), []);
  const fogColor = useMemo(() => new THREE.Color(), []);

  const starGeo = useMemo(() => {
    const n = 1800;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.abs(Math.sin(i * 12.9898 + 78.233)) % 1;
      const v = Math.abs(Math.sin(i * 39.346 + 11.135)) % 1;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(1 - v); // hémisphère supérieur
      const r = 900;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 20;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

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
    curSunY.current += (targetSunY - curSunY.current) * Math.min(1, dt * 2.8);
    curSunX.current += (targetSunX - curSunX.current) * Math.min(1, dt * 2.8);

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
    if (state.scene.fog) state.scene.fog.color.copy(fogColor);

    // La nuit, la lune éclaire depuis l'autre côté : source maintenue au-dessus de l'horizon
    const lightX = daylight > 0.05 ? sunX : -sunX;
    const lightY = daylight > 0.05 ? Math.max(sunY, 0.12) : Math.max(-sunY, 0.12);
    const sunPos = new THREE.Vector3(lightX * 60, lightY * 60, -25);
    if (sun.current) {
      sun.current.position.copy(sunPos);
      sun.current.intensity = 0.15 + daylight * 2.6;
      sun.current.color.set(daylight <= 0.05 ? "#9fb4ff" : dusk > 0.3 ? "#ffcf9a" : "#ffffff");
    }
    if (sunMesh.current) {
      sunMesh.current.position.set(sunX * 700, sunY * 700, -300);
      sunMesh.current.visible = sunY > -0.1;
    }
    if (moonMesh.current) {
      moonMesh.current.position.set(-sunX * 700, -sunY * 700, -300);
      moonMesh.current.visible = -sunY > -0.1;
    }
    if (ambient.current) ambient.current.intensity = 0.12 + daylight * 0.5;
    if (hemi.current) hemi.current.intensity = 0.15 + daylight * 0.6;
    if (starsMat.current) starsMat.current.opacity = Math.max(0, 1 - daylight * 1.4);
    if (starsRef.current) starsRef.current.rotation.y = state.clock.elapsedTime * 0.004;
  });

  return (
    <>
      <fog attach="fog" args={["#bfe3ff", 60, 520]} />
      <ambientLight ref={ambient} intensity={0.5} />
      <hemisphereLight ref={hemi} args={["#bde3ff", "#5a4a30", 0.6]} />
      <directionalLight
        ref={sun}
        position={[30, 50, -25]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-bias={-0.00008}
        shadow-normalBias={0.035}
      />
      <mesh ref={sunMesh}>
        <sphereGeometry args={[38, 24, 24]} />
        <meshBasicMaterial color="#fff2b0" fog={false} />
      </mesh>
      <mesh ref={moonMesh}>
        <sphereGeometry args={[26, 24, 24]} />
        <meshBasicMaterial color="#e9eefc" fog={false} />
      </mesh>
      <points ref={starsRef} geometry={starGeo}>
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
    </>
  );
}
