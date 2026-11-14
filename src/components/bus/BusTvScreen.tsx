"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

export const TV_SCREEN_WIDTH = 1.26;
export const TV_SCREEN_HEIGHT = TV_SCREEN_WIDTH * 9 / 16;
const SCREEN_Z = 0.054;
const PLAYER_WIDTH = 560;
const PLAYER_HEIGHT = 315;
const screenOrigin = () => [0, 0];
const keepPortalMounted = () => {}; // The aperture owns visibility, including when the camera turns away.
const screenFromPixels = new THREE.Matrix4().set(
  TV_SCREEN_WIDTH / PLAYER_WIDTH, 0, 0, -TV_SCREEN_WIDTH / 2,
  0, -TV_SCREEN_HEIGHT / PLAYER_HEIGHT, 0, TV_SCREEN_HEIGHT / 2,
  0, 0, 0, 0,
  0, 0, 0, 1,
);

const vertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragmentShader = "void main() { gl_FragColor = vec4(0.0); }";

// Gecko can play a cross-origin iframe without painting it when its CSS
// transform contains perspective. Cover the same projected quad with a flat
// parallelogram there. The depth aperture still clips its exact outline.
function flatFrameTransform(m: number[], width: number, height: number) {
  const point = (x: number, y: number) => {
    const w = Math.max(.01, m[3] * x + m[7] * y + m[15]);
    return { x: (m[0] * x + m[4] * y + m[12]) / w, y: (m[1] * x + m[5] * y + m[13]) / w };
  };
  const topLeft = point(0, 0), topRight = point(PLAYER_WIDTH, 0);
  const bottomLeft = point(0, PLAYER_HEIGHT), bottomRight = point(PLAYER_WIDTH, PLAYER_HEIGHT);
  const ux = (topRight.x - topLeft.x + bottomRight.x - bottomLeft.x) / 2;
  const uy = (topRight.y - topLeft.y + bottomRight.y - bottomLeft.y) / 2;
  const vx = (bottomLeft.x - topLeft.x + bottomRight.x - topRight.x) / 2;
  const vy = (bottomLeft.y - topLeft.y + bottomRight.y - topRight.y) / 2;
  const determinant = ux * vy - uy * vx;
  if (Math.abs(determinant) < .01) return `matrix(${width / PLAYER_WIDTH},0,0,${height / PLAYER_HEIGHT},0,0)`;
  let minU = 0, maxU = 0, minV = 0, maxV = 0;
  for (const corner of [topRight, bottomRight, bottomLeft]) {
    const dx = corner.x - topLeft.x, dy = corner.y - topLeft.y;
    const u = (dx * vy - dy * vx) / determinant;
    const v = (dy * ux - dx * uy) / determinant;
    minU = Math.min(minU, u); maxU = Math.max(maxU, u);
    minV = Math.min(minV, v); maxV = Math.max(maxV, v);
  }
  const x = (maxU - minU) / PLAYER_WIDTH, y = (maxV - minV) / PLAYER_HEIGHT;
  const left = topLeft.x + ux * minU + vx * minV;
  const top = topLeft.y + uy * minU + vy * minV;
  return `matrix(${ux * x},${uy * x},${vx * y},${vy * y},${left},${top})`;
}

/** The iframe sits behind the canvas. Only pixels that pass the same depth
 * test as the physical screen can reveal it. */
export default function BusTvScreen({ isOn, interactive, children }: {
  isOn: () => boolean;
  interactive: boolean;
  children: ReactNode;
}) {
  const aperture = useRef<THREE.Mesh>(null);
  const frame = useRef<HTMLDivElement>(null);
  const lastTransform = useRef("");
  const { camera, gl, scene, size } = useThree();
  const flatFrame = useMemo(() => typeof CSS !== "undefined" && CSS.supports("-moz-appearance", "none"), []);
  const scratch = useMemo(() => ({
    cameraLocal: new THREE.Vector3(),
    projection: new THREE.Matrix4(),
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    hits: [] as THREE.Intersection[],
  }), []);

  function projectFrame() {
    if (!aperture.current || !frame.current) return;
    // Use the very same world/view transform as the WebGL plane. A single
    // projective CSS matrix avoids nested perspective containers, which can
    // make cross-origin video frames paint black in Firefox.
    const matrix = scratch.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      .multiply(aperture.current.matrixWorld).multiply(screenFromPixels);
    const m = matrix.elements;
    const normalization = 1 / Math.max(.001, Math.abs(m[15]));
    for (let column = 0; column < 16; column += 4) {
      const w = m[column + 3];
      m[column] = (m[column] + w) * size.width / 2 * normalization;
      m[column + 1] = (w - m[column + 1]) * size.height / 2 * normalization;
      m[column + 2] = column === 8 ? 1 : 0;
      m[column + 3] = w * normalization;
    }
    const transform = flatFrame ? flatFrameTransform(m, size.width, size.height) : `matrix3d(${m.join(",")})`;
    if (lastTransform.current !== transform) {
      lastTransform.current = transform;
      frame.current.style.transform = transform;
    }
  }

  useFrame(() => {
    const screen = aperture.current;
    if (!screen || !frame.current) return;
    const visible = isOn() && screen.worldToLocal(camera.getWorldPosition(scratch.cameraLocal)).z > 0;
    screen.visible = visible;
    const visibility = visible ? "visible" : "hidden";
    if (frame.current.style.visibility !== visibility) frame.current.style.visibility = visibility;
    if (!visible || !interactive) frame.current.style.pointerEvents = "none";
  });

  useEffect(() => {
    if (!interactive) return;
    const canvas = gl.domElement;
    const surface = canvas.parentElement?.parentElement;
    if (!surface) return;

    // Keep the canvas surface available for camera gestures. The native
    // controls receive the pointer only where the actual screen can be hit.
    function updatePointer(event: PointerEvent) {
      const screen = aperture.current;
      const html = frame.current;
      if (!screen || !html) return;
      let canPick = false;
      if (screen.visible && isOn()) {
        const bounds = canvas.getBoundingClientRect();
        const { pointer, raycaster, hits } = scratch;
        pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1,
          -(event.clientY - bounds.top) / bounds.height * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        raycaster.far = Infinity;
        hits.length = 0;
        raycaster.intersectObject(screen, false, hits);
        const distance = hits[0]?.distance;
        if (distance !== undefined) {
          raycaster.far = distance - .001;
          hits.length = 0;
          raycaster.intersectObject(scene, true, hits);
          canPick = !hits.some(hit => {
            if (!(hit.object instanceof THREE.Mesh)) return false;
            for (let object: THREE.Object3D | null = hit.object; object; object = object.parent) {
              if (!object.visible) return false;
            }
            const materials = hit.object.material;
            const material = Array.isArray(materials) ? materials[hit.face?.materialIndex ?? 0] : materials;
            return material?.visible && (!material.transparent || material.opacity >= .95);
          });
        }
        hits.length = 0;
      }
      html.style.pointerEvents = canPick ? "auto" : "none";
    }
    surface.addEventListener("pointermove", updatePointer, { capture: true, passive: true });
    surface.addEventListener("pointerover", updatePointer, { capture: true, passive: true });
    surface.addEventListener("pointerdown", updatePointer, { capture: true, passive: true });
    return () => {
      surface.removeEventListener("pointermove", updatePointer, true);
      surface.removeEventListener("pointerover", updatePointer, true);
      surface.removeEventListener("pointerdown", updatePointer, true);
    };
  }, [camera, gl, scene, isOn, interactive, scratch]);

  return <>
    <mesh ref={aperture} name="bus-tv-depth-aperture" position={[0, 0, SCREEN_Z]} visible={false} renderOrder={100}
      onBeforeRender={projectFrame}>
      <planeGeometry args={[TV_SCREEN_WIDTH, TV_SCREEN_HEIGHT]} />
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader}
        blending={THREE.NoBlending} toneMapped={false} />
    </mesh>
    <Html calculatePosition={screenOrigin} onOcclude={keepPortalMounted} zIndexRange={[1, 0]} position={[0, 0, SCREEN_Z]}
      style={{ userSelect: "none", pointerEvents: "none" }}>
      <div ref={frame} id="tv-frame" style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        transformOrigin: "0 0",
        background: "#05070c",
        overflow: "hidden",
        visibility: "hidden",
        pointerEvents: "none",
      }}>
        {children}
      </div>
    </Html>
  </>;
}
