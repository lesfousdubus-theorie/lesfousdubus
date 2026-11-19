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
  const uScroll = useRef({ value: 0 });
  const horizon = useRef({ value: new THREE.Color() });
  const seaWakes = useRef({
    value: Array.from({ length: SEA_WAKE_COUNT }, () => new THREE.Vector4(0, 0, 1, 0)),
  });
  const customize = useCallback<THREE.MeshStandardMaterial["onBeforeCompile"]>(shader => {
    shader.uniforms.waterTime = waterTime.current;
    shader.uniforms.uScroll = uScroll.current;
    shader.uniforms.seaHorizon = horizon.current;
    shader.uniforms.seaWakes = seaWakes.current;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 seaPosition;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nseaPosition = (modelMatrix * vec4(position, 1.0)).xz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec2 seaPosition;
        uniform float waterTime;
        uniform float uScroll;
        uniform vec3 seaHorizon;
        uniform vec4 seaWakes[${SEA_WAKE_COUNT}];`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        float waterDistance = distance(seaPosition, cameraPosition.xz);
        float detail = 1.0 - smoothstep(35.0, 150.0, waterDistance);
        vec2 wavePosition = seaPosition;
        wavePosition.y -= uScroll;
        float current = sin(dot(wavePosition, vec2(0.15, 0.26)) - waterTime * 1.08);
        float swell = sin(dot(wavePosition, vec2(0.31, -0.46)) - waterTime * 1.53 + current);
        float ripples = sin(dot(wavePosition, vec2(1.12, 0.39)) + waterTime * 1.21 + swell * 1.2);
        float crest = smoothstep(0.82, 0.99, ripples) * smoothstep(0.20, 0.94, swell);
        diffuseColor.rgb *= 0.96 + (current * 0.047 + swell * 0.062) * detail;
        diffuseColor.rgb += vec3(0.021, 0.060, 0.084) * crest * detail;
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
    waterTime.current.value = reducedMotion ? 0 : clock.elapsedTime;
    uScroll.current.value = worldRef?.current?.scroll ?? 0;
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

  return <mesh ref={surface} name="world-ocean" rotation={[-Math.PI / 2, 0, 0]} receiveShadow frustumCulled={false}>
    <circleGeometry args={[1, SEGMENTS]} />
    <meshStandardMaterial color="#25357f" roughness={0.34} metalness={0.20} emissive="#0a1640" emissiveIntensity={0.1}
      onBeforeCompile={customize} />
  </mesh>;
}
