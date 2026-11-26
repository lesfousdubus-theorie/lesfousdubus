"use client";

import { useCallback, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldState } from "./constants";

export const SEA_LEVEL = -0.38;
export const SEA_WAKE_COUNT = 4;
const SEGMENTS = 64;
const POLYGON_MARGIN = 1 / Math.cos(Math.PI / SEGMENTS);

export default function WorldOcean({
  worldRef,
  wakesRef,
  reducedMotion = false,
}: {
  worldRef?: React.RefObject<WorldState>;
  wakesRef?: React.RefObject<THREE.Vector4[]>;
  reducedMotion?: boolean;
}) {
  const surface = useRef<THREE.Mesh>(null);
  const waterTime = useRef({ value: 0 });
  const uWaveCenter = useRef({ value: new THREE.Vector2(0, -140) });
  const uWavePhase = useRef({ value: new THREE.Vector3(0, 0, 0) });
  const camDirScratch = useRef(new THREE.Vector3());
  const horizon = useRef({ value: new THREE.Color() });
  const seaWakes = useRef({
    value: Array.from({ length: SEA_WAKE_COUNT }, () => new THREE.Vector4(0, 0, 1, 0)),
  });
  const customize = useCallback<THREE.MeshStandardMaterial["onBeforeCompile"]>(shader => {
    shader.uniforms.waterTime = waterTime.current;
    shader.uniforms.uWaveCenter = uWaveCenter.current;
    shader.uniforms.uWavePhase = uWavePhase.current;
    shader.uniforms.seaHorizon = horizon.current;
    shader.uniforms.seaWakes = seaWakes.current;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 seaPosition;\nvarying vec2 seaLocal;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vec3 seaWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        seaPosition = seaWorld.xz;
        seaLocal = seaWorld.xz - cameraPosition.xz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec2 seaPosition;
        varying vec2 seaLocal;
        uniform float waterTime;
        uniform vec2 uWaveCenter;
        uniform vec3 uWavePhase;
        uniform vec3 seaHorizon;
        uniform vec4 seaWakes[${SEA_WAKE_COUNT}];`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        // Zone de vagues décalée devant le regard de la caméra (évite de gaspiller des vagues derrière
        // et supprime le ressaut circulaire net en fondant aussi la teinte -0.04 vers 1.0 à l'horizon).
        float waveDistance = distance(seaLocal, uWaveCenter);
        if (waveDistance < 320.0) {
          float detail = 1.0 - smoothstep(140.0, 310.0, waveDistance);
          float current = sin(dot(seaLocal, vec2(0.15, 0.26)) + uWavePhase.x);
          float swell = sin(dot(seaLocal, vec2(0.31, -0.46)) + uWavePhase.y + current);
          float ripples = sin(dot(seaLocal, vec2(1.12, 0.39)) + uWavePhase.z + swell * 1.2);
          float crest = smoothstep(0.82, 0.99, ripples) * smoothstep(0.20, 0.94, swell);
          diffuseColor.rgb *= 1.0 + (-0.04 + current * 0.047 + swell * 0.062) * detail;
          diffuseColor.rgb += vec3(0.021, 0.060, 0.084) * crest * detail;
        }
        float waterDistance = length(seaLocal);
        if (waterDistance < 280.0) {
          float wakeBoost = 0.0;
          for (int i = 0; i < ${SEA_WAKE_COUNT}; i++) {
            vec4 wk = seaWakes[i];
            if (wk.w > 0.005) {
              float dist = distance(seaPosition, wk.xy);
              float outerRadius = max(wk.z, 2.0);
              if (dist < outerRadius + 9.0) {
                float radial = dist / outerRadius;
                float envelope = (1.0 - smoothstep(0.55, 1.18, radial)) * wk.w;
                float waveRing = 0.5 + 0.5 * cos((dist - outerRadius * 0.7) * 1.2 - waterTime * 4.4);
                wakeBoost += envelope * pow(waveRing, 2.0);
              }
            }
          }
          float wakeFade = 1.0 - smoothstep(110.0, 280.0, waterDistance);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.76, 0.93, 0.99), clamp(wakeBoost * 0.45 * wakeFade, 0.0, 0.65));
        }`)
      .replace("#include <fog_fragment>", THREE.ShaderChunk.fog_fragment.replace("fogColor", "seaHorizon"));
  }, []);

  useFrame(({ camera, clock, gl, scene }) => {
    if (!surface.current) return;
    const far = (camera as THREE.PerspectiveCamera | THREE.OrthographicCamera).far;
    // Le rayon couvre aussi les coins du plan éloigné, jusque sur écran large.
    let extent = far;
    if (camera instanceof THREE.PerspectiveCamera) {
      const tangent = Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV() / 2));
      extent *= Math.hypot(1, tangent, tangent * camera.aspect);
    } else if (camera instanceof THREE.OrthographicCamera) {
      extent = Math.hypot(far, (camera.right - camera.left) / camera.zoom, (camera.top - camera.bottom) / camera.zoom);
    }
    surface.current.position.set(camera.position.x, SEA_LEVEL, camera.position.z);
    surface.current.scale.setScalar((extent + 24) * POLYGON_MARGIN);
    const t = reducedMotion ? 0 : clock.elapsedTime;
    waterTime.current.value = t;
    const scroll = worldRef?.current?.scroll ?? 0;

    // Centre le disque de vagues à +195 m devant la direction horizontale du regard :
    // les vagues s'étendent jusqu'à ~505 m devant soi et s'arrêtent juste derrière la caméra.
    const dir = camera.getWorldDirection(camDirScratch.current);
    const horizLen = Math.hypot(dir.x, dir.z);
    const fwdX = horizLen > 0.05 ? dir.x / horizLen : 0;
    const fwdZ = horizLen > 0.05 ? dir.z / horizLen : -1;
    uWaveCenter.current.value.set(fwdX * 195, fwdZ * 195);

    // Calcule les phases trigonométriques en float64 JS (modulo 2π) pour garder des vagues
    // parfaitement nettes même à Z = 100–330 km sur un bus de 300k–1M passagers.
    const TWO_PI = Math.PI * 2;
    const camX = camera.position.x;
    const camZScrolled = camera.position.z - scroll;
    const wrapPhase = (v: number) => ((v % TWO_PI) + TWO_PI) % TWO_PI;
    uWavePhase.current.value.set(
      wrapPhase(camX * 0.15 + camZScrolled * 0.26 - t * 1.08),
      wrapPhase(camX * 0.31 - camZScrolled * 0.46 - t * 1.53),
      wrapPhase(camX * 1.12 + camZScrolled * 0.39 + t * 1.21),
    );
    const wakes = wakesRef?.current;
    for (let i = 0; i < SEA_WAKE_COUNT; i++) {
      if (!reducedMotion && wakes && wakes[i]) {
        seaWakes.current.value[i].copy(wakes[i]);
      } else {
        seaWakes.current.value[i].set(0, 0, 1, 0);
      }
    }
    const fogColor = scene.fog?.color ?? (scene.background instanceof THREE.Color ? scene.background : null);
    if (fogColor) fogColor.getRGB(horizon.current.value, gl.outputColorSpace);
  });

  return <mesh ref={surface} name="world-ocean" rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
    <circleGeometry args={[1, SEGMENTS]} />
    <meshStandardMaterial color="#165ea3" roughness={0.34} metalness={0.20} emissive="#06274d" emissiveIntensity={0.1}
      onBeforeCompile={customize} />
  </mesh>;
}
