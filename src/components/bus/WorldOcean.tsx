"use client";

import { useCallback, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const SEA_LEVEL = -0.38;
const SEGMENTS = 64;
const POLYGON_MARGIN = 1 / Math.cos(Math.PI / SEGMENTS);

export default function WorldOcean({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const surface = useRef<THREE.Mesh>(null);
  const waterTime = useRef({ value: 0 });
  const horizon = useRef({ value: new THREE.Color() });
  const customize = useCallback<THREE.MeshStandardMaterial["onBeforeCompile"]>(shader => {
    shader.uniforms.waterTime = waterTime.current;
    shader.uniforms.seaHorizon = horizon.current;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 seaPosition;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nseaPosition = (modelMatrix * vec4(position, 1.0)).xz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 seaPosition;\nuniform float waterTime;\nuniform vec3 seaHorizon;")
      .replace("#include <color_fragment>", `#include <color_fragment>
        float waterDistance = distance(seaPosition, cameraPosition.xz);
        float detail = 1.0 - smoothstep(35.0, 150.0, waterDistance);
        float current = sin(dot(seaPosition, vec2(0.15, 0.26)) - waterTime * 1.08);
        float swell = sin(dot(seaPosition, vec2(0.31, -0.46)) - waterTime * 1.53 + current);
        float ripples = sin(dot(seaPosition, vec2(1.12, 0.39)) + waterTime * 1.21 + swell * 1.2);
        float crest = smoothstep(0.82, 0.99, ripples) * smoothstep(0.20, 0.94, swell);
        diffuseColor.rgb *= 0.96 + (current * 0.047 + swell * 0.062) * detail;
        diffuseColor.rgb += vec3(0.021, 0.060, 0.084) * crest * detail;`)
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
    if (scene.background instanceof THREE.Color) scene.background.getRGB(horizon.current.value, gl.outputColorSpace);
  });

  return <mesh ref={surface} name="world-ocean" rotation={[-Math.PI / 2, 0, 0]} receiveShadow frustumCulled={false}>
    <circleGeometry args={[1, SEGMENTS]} />
    <meshStandardMaterial color="#165ea3" roughness={0.34} metalness={0.20} emissive="#06274d" emissiveIntensity={0.1}
      onBeforeCompile={customize} />
  </mesh>;
}
