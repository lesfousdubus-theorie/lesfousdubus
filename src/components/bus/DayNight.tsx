"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { type WorldState } from "./constants";
import { getShadowCameraFraming, type ShadowCameraFraming } from "@/lib/scene-performance";
import { computeScrollLockedShadowCenterZ, installSmoothPcfShadowFilter } from "@/lib/shadow-filter";

installSmoothPcfShadowFilter();

interface Props {
  worldRef: React.RefObject<WorldState>;
  modeOverride?: "day" | "night" | null;
  lowPower?: boolean;
  reducedMotion?: boolean;
  cameraFar?: number;
  fogNear?: number;
  fogFar?: number;
  shadowsEnabled?: boolean;
  shadowMapSize?: 1024 | 2048 | 4096;
  shadowsType?: false | "basic" | "percentage" | "soft";
  shadowsQuality?: "off" | "basic" | "standard" | "high";
  maxTextureSize?: number;
  mobileDevice?: boolean;
  starCount?: number;
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

const DayNight = memo(function DayNight({
  worldRef,
  modeOverride,
  lowPower = false,
  reducedMotion = false,
  cameraFar = 2000,
  fogNear,
  fogFar: fogFarProp,
  shadowsEnabled,
  shadowMapSize,
  shadowsType,
  shadowsQuality,
  maxTextureSize = 4096,
  mobileDevice = false,
  starCount,
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
  const appliedShadowRef = useRef<{
    enabled: boolean;
    width: number;
    height: number;
    type: false | "basic" | "percentage" | "soft" | undefined;
  } | null>(null);
  const appliedFrustumRef = useRef<{
    halfWidth: number;
    halfDepth: number;
    sunDistance: number;
    near: number;
    far: number;
  } | null>(null);
  const sunTarget = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0, 1.2, 0);
    return obj;
  }, []);

  // Position du soleil lissée pour permettre des transitions douces lors du clic Jour/Nuit
  const sunInitRef = useRef(false);
  const curSunY = useRef(0.85);
  const curSunX = useRef(0.1);

  const skyColor = useMemo(() => new THREE.Color(), []);
  const fogColor = useMemo(() => new THREE.Color(), []);
  const lightColor = useMemo(() => new THREE.Color(), []);
  const sunPosition = useMemo(() => new THREE.Vector3(), []);
  const shadowFraming = useMemo<ShadowCameraFraming>(() => ({
    halfWidth: 105,
    halfDepth: 185,
    centerZ: -115,
    sunDistance: 250,
    near: 60,
    far: 480,
    normalBias: 0.014,
  }), []);

  const resolvedFogNear = fogNear ?? 120;
  const resolvedFogFar = fogFarProp ?? Math.max(750, cameraFar * 0.85);
  const skyDist = Math.max(300, cameraFar * 0.82);
  const resolvedShadowsEnabled = shadowsEnabled ?? !lowPower;
  const resolvedShadowMapSize: 1024 | 2048 | 4096 =
    shadowsQuality === "high" && !lowPower && !mobileDevice && maxTextureSize >= 4096
      ? 4096
      : (shadowMapSize ?? (lowPower ? 1024 : 2048));
  const resolvedStarCount = starCount ?? (lowPower ? 700 : 1800);

  const starGeo = useMemo(() => {
    const n = resolvedStarCount;
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
  }, [resolvedStarCount]);

  useEffect(() => () => {
    starGeo.dispose();
  }, [starGeo]);

  useFrame((state, dt) => {
    const targetGlShadowType = shadowsType === "basic" ? THREE.BasicShadowMap : THREE.PCFShadowMap;
    // Plafonner la shadow map à 2048px max (4096px = 16,7M texels/frame, trop coûteux sur GPU moyen/faible)
    const targetMapW = resolvedShadowMapSize;
    const targetMapH = resolvedShadowMapSize;
    const glShadowChanged =
      state.gl.shadowMap.enabled !== resolvedShadowsEnabled
      || state.gl.shadowMap.type !== targetGlShadowType;
    const prevShadow = appliedShadowRef.current;
    if (
      sun.current
      && (
        !prevShadow
        || glShadowChanged
        || prevShadow.enabled !== resolvedShadowsEnabled
        || prevShadow.width !== targetMapW
        || prevShadow.height !== targetMapH
        || prevShadow.type !== shadowsType
      )
    ) {
      state.gl.shadowMap.enabled = resolvedShadowsEnabled;
      state.gl.shadowMap.type = targetGlShadowType;
      state.gl.shadowMap.autoUpdate = true;
      sun.current.castShadow = resolvedShadowsEnabled;
      if (
        glShadowChanged
        || sun.current.shadow.mapSize.width !== targetMapW
        || sun.current.shadow.mapSize.height !== targetMapH
      ) {
        sun.current.shadow.mapSize.set(targetMapW, targetMapH);
        sun.current.shadow.map?.depthTexture?.dispose();
        sun.current.shadow.map?.dispose();
        sun.current.shadow.map = null;
      }
      if (glShadowChanged || (prevShadow && (prevShadow.enabled !== resolvedShadowsEnabled || prevShadow.type !== shadowsType))) {
        state.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
              if (material instanceof THREE.Material) {
                material.needsUpdate = true;
              }
            }
          }
        });
      }
      state.gl.shadowMap.needsUpdate = true;
      appliedShadowRef.current = {
        enabled: resolvedShadowsEnabled,
        width: targetMapW,
        height: targetMapH,
        type: shadowsType,
      };
    }
    if (resolvedShadowsEnabled && !state.gl.shadowMap.autoUpdate) {
      state.gl.shadowMap.autoUpdate = true;
    }

    let targetSunY = 0.85;
    let targetSunX = 0.1;

    if (modeOverride === "day") {
      targetSunY = 0.85;
      targetSunX = 0.1;
    } else if (modeOverride === "night") {
      targetSunY = -0.75;
      targetSunX = 0.4;
    } else {
      // Heure locale réelle quantifiée par pas de 5 minutes : suit fidèlement le soleil réel
      // sans jamais faire vibrer la matrice d'ombres toutes les secondes.
      const now = new Date();
      const quantizedMinutes = Math.round((now.getHours() * 60 + now.getMinutes()) / 5) * 5;
      const realHour = quantizedMinutes / 60;

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

    // Initialisation instantanée au premier rendu, puis interpolation douce au clic Jour/Nuit
    // avec verrouillage exact à l'arrivée pour éviter toute micro-dérive résiduelle des ombres.
    if (!sunInitRef.current || reducedMotion) {
      sunInitRef.current = true;
      curSunY.current = targetSunY;
      curSunX.current = targetSunX;
    } else {
      const blend = Math.min(1, Math.min(dt, 0.1) * 2.8);
      curSunY.current = Math.abs(targetSunY - curSunY.current) < 0.0005
        ? targetSunY
        : curSunY.current + (targetSunY - curSunY.current) * blend;
      curSunX.current = Math.abs(targetSunX - curSunX.current) < 0.0005
        ? targetSunX
        : curSunX.current + (targetSunX - curSunX.current) * blend;
    }

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
      state.scene.fog.near = resolvedFogNear;
      state.scene.fog.far = resolvedFogFar;
    } else if (state.scene.fog) {
      state.scene.fog.color.copy(fogColor);
    }

    // Transition continue de la lumière directionnelle autour du crépuscule sans saut de direction ni de teinte
    const lightBlend = smoothstep(0.02, 0.35, daylight);
    const duskGlow = Math.sin(Math.PI * smoothstep(0.02, 0.55, daylight));
    const lightX = THREE.MathUtils.lerp(-sunX, sunX, lightBlend);
    const lightY = THREE.MathUtils.lerp(Math.max(-sunY, 0.16), Math.max(sunY, 0.16), lightBlend)
      + Math.sin(lightBlend * Math.PI) * 0.25;
    const framing = getShadowCameraFraming({
      cabinCenterZ,
      cabinLength,
      cameraX: state.camera.position.x,
      cameraY: state.camera.position.y,
      cameraZ: state.camera.position.z,
      fogFar: resolvedFogFar,
      shadowMapSize: resolvedShadowMapSize,
    }, shadowFraming);

    // En zoom très rapproché sur le bus (< 12 m), resserre le frustum d'ombres (2x plus fin) et verrouille
    // la grille de texels sur le bus lui-même (zéro tremblement sur le chapeau de paille et la carrosserie).
    const busMinZ = cabinCenterZ - cabinLength * 0.5;
    const busMaxZ = cabinCenterZ + cabinLength * 0.5;
    const nearestBusZ = THREE.MathUtils.clamp(state.camera.position.z, busMinZ, busMaxZ);
    const busCamDist = Math.hypot(
      state.camera.position.x,
      Math.max(0, state.camera.position.y - 2),
      state.camera.position.z - nearestBusZ,
    );
    const closeOnBus = busCamDist < 12;
    const desiredHalfWidth = closeOnBus ? 64 : framing.halfWidth;
    const desiredHalfDepth = closeOnBus ? 96 : framing.halfDepth;

    // Quantifie le frustum par paliers de 16 m avec hystérésis pour éviter tout redimensionnement
    // de la grille de texels lors des petites rotations ou légers mouvements de caméra.
    const prevFrustum = appliedFrustumRef.current;
    let activeHalfWidth: number;
    let activeHalfDepth: number;
    let activeSunDistance: number;
    let activeNear: number;
    let activeFar: number;
    if (
      !prevFrustum
      || Math.abs(desiredHalfWidth - prevFrustum.halfWidth) >= 14
      || Math.abs(desiredHalfDepth - prevFrustum.halfDepth) >= 14
    ) {
      activeHalfWidth = Math.max(64, Math.round(desiredHalfWidth / 16) * 16);
      activeHalfDepth = Math.max(96, Math.round(desiredHalfDepth / 16) * 16);
      const maxSpan = Math.max(activeHalfWidth, activeHalfDepth);
      activeSunDistance = Math.max(160, Math.round(maxSpan * 1.35));
      activeNear = Math.max(12, activeSunDistance - 190);
      activeFar = activeSunDistance + 230;
      appliedFrustumRef.current = {
        halfWidth: activeHalfWidth,
        halfDepth: activeHalfDepth,
        sunDistance: activeSunDistance,
        near: activeNear,
        far: activeFar,
      };
    } else {
      activeHalfWidth = prevFrustum.halfWidth;
      activeHalfDepth = prevFrustum.halfDepth;
      activeSunDistance = prevFrustum.sunDistance;
      activeNear = prevFrustum.near;
      activeFar = prevFrustum.far;
    }

    // Garde un angle d'ombre assez haut au crépuscule pour éviter l'étirement diagonal crénelé
    const shadowLightY = Math.max(lightY, 0.52);
    const shadowHorizScale = 0.85 + 0.15 * Math.min(1, Math.max(0, (lightY - 0.16) / 0.36));
    const rawDirX = lightX * shadowHorizScale;
    const rawDirY = shadowLightY;
    const rawDirZ = -0.42;
    const dirLen = Math.hypot(rawDirX, rawDirY, rawDirZ) || 1;
    const vx = rawDirX / dirLen;
    const vy = rawDirY / dirLen;
    const vz = rawDirZ / dirLen;

    // En zoom très proche sur le bus, ancre la grille sur le bus (scrollLock = 0) pour figer l'ombre du chapeau ;
    // en vue normale/dézoomée, ancre sur `scroll` pour figer les ombres sur tous les paysages qui défilent.
    const scrollLock = closeOnBus ? 0 : (worldRef.current?.scroll ?? 0);
    const targetShadowZ = closeOnBus ? nearestBusZ : framing.centerZ;
    const { snappedCenterZ, worldTexelZ } = computeScrollLockedShadowCenterZ(
      targetShadowZ,
      scrollLock,
      activeHalfDepth,
      resolvedShadowMapSize,
      vx,
      vy,
      vz,
    );
    sunTarget.position.set(0, 1.2, snappedCenterZ);
    sunTarget.updateMatrixWorld();
    sunPosition.set(
      sunTarget.position.x + vx * activeSunDistance,
      sunTarget.position.y + vy * activeSunDistance,
      sunTarget.position.z + vz * activeSunDistance,
    );
    lightColor.copy(MOON_LIGHT).lerp(SUN_LIGHT, smoothstep(0.05, 0.45, daylight)).lerp(DUSK_LIGHT, duskGlow * 0.65);
    if (sun.current) {
      sun.current.position.copy(sunPosition);
      sun.current.intensity = 0.15 + daylight * 2.6;
      sun.current.color.copy(lightColor);
      sun.current.target = sunTarget;
      const shadowCam = sun.current.shadow.camera;
      if (
        shadowCam.up.z > -0.9
        || Math.abs(shadowCam.right - activeHalfWidth) > 0.25
        || Math.abs(shadowCam.top - activeHalfDepth) > 0.25
        || Math.abs(shadowCam.near - activeNear) > 0.5
        || Math.abs(shadowCam.far - activeFar) > 0.5
      ) {
        // Aligne la boîte d'ombres sur l'axe de la route (-Z) même quand le soleil rase à l'est/ouest
        shadowCam.up.set(0, 0, -1);
        shadowCam.left = -activeHalfWidth;
        shadowCam.right = activeHalfWidth;
        shadowCam.top = activeHalfDepth;
        shadowCam.bottom = -activeHalfDepth;
        shadowCam.near = activeNear;
        shadowCam.far = activeFar;
        shadowCam.updateProjectionMatrix();
      }
      const texelX = (activeHalfWidth * 2) / resolvedShadowMapSize;
      const maxTexelWorld = Math.max(texelX, worldTexelZ);
      sun.current.shadow.normalBias = Math.min(0.16, Math.max(0.04, maxTexelWorld * 0.85));
      sun.current.shadow.bias = -0.00014;
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
    if (ambient.current) ambient.current.intensity = 0.2 + daylight * 0.46;
    if (hemi.current) hemi.current.intensity = 0.22 + daylight * 0.56;
    if (starsMat.current) starsMat.current.opacity = Math.max(0, 1 - daylight * 1.4);
    if (starsRef.current) {
      starsRef.current.scale.setScalar(skyDist / 900);
      starsRef.current.rotation.y = reducedMotion ? 0 : state.clock.elapsedTime * 0.004;
    }
  });

  return (
    <>
      <fog attach="fog" args={["#bfe3ff", 120, 450]} />
      <ambientLight ref={ambient} intensity={0.5} />
      <hemisphereLight ref={hemi} args={["#bde3ff", "#5a4a30", 0.6]} />
      <primitive object={sunTarget} />
      <directionalLight
        ref={sun}
        position={[30, 50, -25]}
        intensity={2.5}
        castShadow={resolvedShadowsEnabled}
        shadow-mapSize-width={resolvedShadowMapSize}
        shadow-mapSize-height={resolvedShadowMapSize}
        shadow-camera-left={-105}
        shadow-camera-right={105}
        shadow-camera-top={185}
        shadow-camera-bottom={-185}
        shadow-camera-near={1}
        shadow-camera-far={750}
        shadow-radius={1.8}
        shadow-bias={-0.00018}
        shadow-normalBias={0.014}
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
});

export default DayNight;
