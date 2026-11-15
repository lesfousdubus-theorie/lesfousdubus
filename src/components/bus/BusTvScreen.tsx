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
const eps = (value: number) => (Math.abs(value) < 1e-10 ? 0 : value);

const vertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragmentShader = "void main() { gl_FragColor = vec4(0.0); }";

const HALF_W = TV_SCREEN_WIDTH / 2;
const HALF_H = TV_SCREEN_HEIGHT / 2;
const SCREEN_CORNERS = [
  [-HALF_W, -HALF_H],
  [HALF_W, -HALF_H],
  [HALF_W, HALF_H],
  [-HALF_W, HALF_H],
] as const;

function writeTvPointerHit(surface: HTMLElement | null | undefined, hit: boolean) {
  if (!surface) return;
  const value = hit ? "true" : "false";
  if (surface.getAttribute("data-tv-pointer-hit") !== value) {
    surface.setAttribute("data-tv-pointer-hit", value);
  }
}

/** The iframe sits behind the canvas. Only pixels that pass the same depth
 * test as the physical screen can reveal it. */
export default function BusTvScreen({ isOn, interactive, children }: {
  isOn: () => boolean;
  interactive: boolean;
  children: ReactNode;
}) {
  const aperture = useRef<THREE.Mesh>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraLayerRef = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLElement | null>(null);
  const lastState = useRef({ viewport: "", camera: "", frame: "" });
  const { camera, gl, scene, size } = useThree();
  const scratch = useMemo(() => ({
    cameraLocal: new THREE.Vector3(),
    screenToView: new THREE.Matrix4(),
    corner: new THREE.Vector3(),
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    hits: [] as THREE.Intersection[],
  }), []);

  function projectFrame() {
    const screen = aperture.current;
    const viewport = viewportRef.current;
    const cameraLayer = cameraLayerRef.current;
    const html = frame.current;
    if (!screen || !viewport || !cameraLayer || !html || !screen.visible) return;

    camera.updateMatrixWorld();
    screen.updateMatrixWorld();

    const fovPx = camera.projectionMatrix.elements[5] * (size.height / 2);
    const viewportKey = `${size.width}x${size.height}:${fovPx.toFixed(2)}`;
    if (lastState.current.viewport !== viewportKey) {
      lastState.current.viewport = viewportKey;
      viewport.style.width = `${size.width}px`;
      viewport.style.height = `${size.height}px`;
      viewport.style.perspective = `${fovPx}px`;
      cameraLayer.style.width = `${size.width}px`;
      cameraLayer.style.height = `${size.height}px`;
    }

    const c = camera.matrixWorldInverse.elements;
    const cameraTransform = `translate3d(0,0,${eps(fovPx)}px) matrix3d(${eps(c[0])},${eps(-c[1])},${eps(c[2])},${eps(c[3])},${eps(c[4])},${eps(-c[5])},${eps(c[6])},${eps(c[7])},${eps(c[8])},${eps(-c[9])},${eps(c[10])},${eps(c[11])},${eps(c[12])},${eps(-c[13])},${eps(c[14])},${eps(c[15])}) translate(${size.width / 2}px,${size.height / 2}px)`;
    if (lastState.current.camera !== cameraTransform) {
      lastState.current.camera = cameraTransform;
      cameraLayer.style.transform = cameraTransform;
    }

    const w = screen.matrixWorld.elements;
    const sx = TV_SCREEN_WIDTH / PLAYER_WIDTH;
    const sy = TV_SCREEN_HEIGHT / PLAYER_HEIGHT;
    const frameTransform = `translate3d(-50%,-50%,0) matrix3d(${eps(w[0] * sx)},${eps(w[1] * sx)},${eps(w[2] * sx)},${eps(w[3] * sx)},${eps(-w[4] * sy)},${eps(-w[5] * sy)},${eps(-w[6] * sy)},${eps(-w[7] * sy)},${eps(w[8])},${eps(w[9])},${eps(w[10])},${eps(w[11])},${eps(w[12])},${eps(w[13])},${eps(w[14])},${eps(w[15])})`;
    if (lastState.current.frame !== frameTransform) {
      lastState.current.frame = frameTransform;
      html.style.transform = frameTransform;
    }
  }

  useFrame(() => {
    const screen = aperture.current;
    if (!screen || !frame.current) return;
    let visible = false;
    if (isOn() && screen.worldToLocal(camera.getWorldPosition(scratch.cameraLocal)).z > 0) {
      const screenToView = scratch.screenToView.multiplyMatrices(camera.matrixWorldInverse, screen.matrixWorld);
      for (let i = 0; i < 4; i++) {
        const [cx, cy] = SCREEN_CORNERS[i];
        if (scratch.corner.set(cx, cy, 0).applyMatrix4(screenToView).z < -0.05) {
          visible = true;
          break;
        }
      }
    }
    screen.visible = visible;
    if (visible) projectFrame();
    const visibility = visible ? "visible" : "hidden";
    if (frame.current.style.visibility !== visibility) frame.current.style.visibility = visibility;
    if (!visible || !interactive) {
      frame.current.style.pointerEvents = "none";
      writeTvPointerHit(surfaceRef.current, false);
    }
  });

  useEffect(() => {
    const canvas = gl.domElement;
    const surface = canvas.parentElement?.parentElement ?? null;
    surfaceRef.current = surface;
    const htmlFrame = frame.current;
    if (!surface) return;
    if (!interactive) {
      writeTvPointerHit(surface, false);
      return;
    }

    // Keep the canvas surface available for camera gestures. The native
    // controls receive the pointer only where the actual screen can be hit.
    function updatePointer(event: UIEvent) {
      const screen = aperture.current;
      const html = frame.current;
      if (!screen || !html) {
        writeTvPointerHit(surface, false);
        return;
      }
      let canPick = false;
      if (screen.visible && isOn()) {
        const bounds = canvas.getBoundingClientRect();
        if (bounds.width > 0 && bounds.height > 0) {
          const touch = "touches" in event && (event as TouchEvent).touches.length > 0
            ? (event as TouchEvent).touches[0]
            : null;
          const clientX = touch ? touch.clientX : (event as MouseEvent).clientX;
          const clientY = touch ? touch.clientY : (event as MouseEvent).clientY;
          if (clientX !== undefined && clientY !== undefined) {
            const { pointer, raycaster, hits } = scratch;
            pointer.set((clientX - bounds.left) / bounds.width * 2 - 1,
              -(clientY - bounds.top) / bounds.height * 2 + 1);
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
        }
      }
      html.style.pointerEvents = canPick ? "auto" : "none";
      writeTvPointerHit(surface, canPick);
    }

    function onPointerLeave() {
      if (frame.current) frame.current.style.pointerEvents = "none";
      writeTvPointerHit(surface, false);
    }

    surface.addEventListener("pointermove", updatePointer as EventListener, { capture: true, passive: true });
    surface.addEventListener("pointerover", updatePointer as EventListener, { capture: true, passive: true });
    surface.addEventListener("pointerdown", updatePointer as EventListener, { capture: true, passive: true });
    surface.addEventListener("touchstart", updatePointer as EventListener, { capture: true, passive: true });
    surface.addEventListener("pointerleave", onPointerLeave);
    return () => {
      writeTvPointerHit(surface, false);
      if (surfaceRef.current === surface) surfaceRef.current = null;
      if (htmlFrame) htmlFrame.style.pointerEvents = "none";
      surface.removeEventListener("pointermove", updatePointer as EventListener, true);
      surface.removeEventListener("pointerover", updatePointer as EventListener, true);
      surface.removeEventListener("pointerdown", updatePointer as EventListener, true);
      surface.removeEventListener("touchstart", updatePointer as EventListener, true);
      surface.removeEventListener("pointerleave", onPointerLeave);
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
      style={{ position: "absolute", top: 0, left: 0, userSelect: "none", pointerEvents: "none" }}>
      <div ref={viewportRef} style={{ position: "absolute", top: 0, left: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div ref={cameraLayerRef} style={{ position: "absolute", top: 0, left: 0, transformStyle: "preserve-3d", pointerEvents: "none" }}>
          <div ref={frame} id="tv-frame" style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT,
            background: "#05070c",
            overflow: "hidden",
            visibility: "hidden",
            pointerEvents: "none",
          }}>
            {children}
          </div>
        </div>
      </div>
    </Html>
  </>;
}
