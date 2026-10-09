"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { DEFAULT_CAMERA_POS, DEFAULT_TARGET, SEAT_EYE, TV_POSITION, type Phase } from "./constants";

interface Props {
  phase: Phase;
  onArrived: (phase: "inside" | "outside") => void;
  cabinLength?: number;
  cabinCenterZ?: number;
  cameraFar?: number;
  currentSeatZ?: number;
  tvTargetZ?: number;
  reducedMotion?: boolean;
  resetViewToken?: number;
}

const TRANSITION_TIME = 1.8;
const FOV_EPSILON = 0.01;
const EXTERIOR_MAX_POLAR_ANGLE = Math.PI / 2 - 0.04;
const EXTERIOR_SKY_PITCH_LIMIT = Math.PI - EXTERIOR_MAX_POLAR_ANGLE - 0.02;
const EXTERIOR_SKY_DRAG_SPEED = 0.0045;
const EXTERIOR_MIN_DISTANCE = 0.6;
const LOCAL_X_AXIS = new THREE.Vector3(1, 0, 0);

export default function CameraRig({
  phase,
  onArrived,
  cabinLength = 9.2,
  cabinCenterZ = 0,
  cameraFar = 2000,
  currentSeatZ,
  tvTargetZ = TV_POSITION.z,
  reducedMotion = false,
  resetViewToken = 0,
}: Props) {
  const { camera, gl, size } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const saved = useRef({ pos: DEFAULT_CAMERA_POS.clone(), target: DEFAULT_TARGET.clone() });
  const anim = useRef({
    t: 0,
    from: new THREE.Vector3(),
    fromQ: new THREE.Quaternion(),
    to: new THREE.Vector3(),
    toQ: new THREE.Quaternion(),
    active: false,
  });
  const look = useRef({ yaw: 0, pitch: 0, targetYaw: 0, targetPitch: 0, dragging: false, lastX: 0, lastY: 0 });
  const targetFovRef = useRef(55);
  const currentFovRef = useRef(55);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const exteriorPointersRef = useRef<Map<number, number>>(new Map());
  const skyPitchRef = useRef(0);
  const skyTiltRef = useRef(new THREE.Quaternion());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartFovRef = useRef<number>(55);
  const phaseRef = useRef<Phase>(phase);
  const preparedPhaseRef = useRef<Phase | null>(null);
  const framingScaleRef = useRef(1);
  const resetViewRef = useRef(resetViewToken);
  const resetTransition = useRef({
    active: false,
    t: 0,
    duration: 0.85,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    fromSkyPitch: 0,
  });
  const arrivedRef = useRef(onArrived);
  useEffect(() => {
    arrivedRef.current = onArrived;
  }, [onArrived]);

  // Position Z du siège actuel (lisse le déplacement dans l'allée)
  const seatZRef = useRef(currentSeatZ ?? SEAT_EYE.z);

  // Position cible des yeux
  const activeEyePos = useMemo(() => {
    return new THREE.Vector3(SEAT_EYE.x, SEAT_EYE.y, currentSeatZ ?? SEAT_EYE.z);
  }, [currentSeatZ]);
  const activeTvTarget = useMemo(() => new THREE.Vector3(0, TV_POSITION.y, tvTargetZ), [tvTargetZ]);

  // Cible de rotation OrbitControls ajustée selon la longueur du bus
  const orbitTargetZ = useMemo(() => {
    return Math.max(-2.5, cabinCenterZ - 1.2);
  }, [cabinCenterZ]);

  const maxOrbitDistance = useMemo(() => {
    return Math.max(32, cabinLength * 2.2);
  }, [cabinLength]);

  const finishTransition = useCallback((destination: "inside" | "outside") => {
    const a = anim.current;
    camera.position.copy(a.to);
    camera.quaternion.copy(a.toQ);
    camera.updateMatrixWorld();
    a.active = false;

    if (destination === "inside") {
      const e = new THREE.Euler().setFromQuaternion(a.toQ, "YXZ");
      look.current.yaw = look.current.targetYaw = e.y;
      look.current.pitch = look.current.targetPitch = e.x;
    }

    arrivedRef.current(destination);
  }, [camera]);

  // Le même angle doit montrer le bus entier sur un écran portrait.
  // Au redimensionnement, préserver le zoom choisi en ajustant sa distance.
  useEffect(() => {
    const scale = THREE.MathUtils.clamp(0.85 / (size.width / Math.max(1, size.height)), 1, 2.5);
    const ratio = scale / framingScaleRef.current;
    framingScaleRef.current = scale;
    if (phaseRef.current === "outside") {
      const target = controls.current?.target ?? DEFAULT_TARGET;
      camera.position.sub(target).multiplyScalar(ratio).add(target);
      controls.current?.update();
    } else {
      saved.current.pos.sub(saved.current.target).multiplyScalar(ratio).add(saved.current.target);
    }
  }, [camera, size.width, size.height]);

  useEffect(() => {
    if (resetViewRef.current === resetViewToken) return;
    resetViewRef.current = resetViewToken;
    activePointersRef.current.clear();
    exteriorPointersRef.current.clear();
    pinchStartDistRef.current = null;
    look.current.dragging = false;
    targetFovRef.current = 55;
    if (phase === "outside" && controls.current) {
      const control = controls.current;
      const targetTarget = new THREE.Vector3(0, 1.9, orbitTargetZ);
      const targetPos = DEFAULT_CAMERA_POS.clone()
        .sub(targetTarget)
        .multiplyScalar(framingScaleRef.current)
        .add(targetTarget);

      if (reducedMotion) {
        control.minPolarAngle = 0;
        control.target.copy(targetTarget);
        const damping = control.enableDamping;
        control.enableDamping = false;
        control.update();
        camera.position.copy(targetPos);
        control.update();
        control.enableDamping = damping;
        skyPitchRef.current = 0;
      } else {
        const rt = resetTransition.current;
        rt.active = true;
        rt.t = 0;
        rt.fromPos.copy(camera.position);
        rt.toPos.copy(targetPos);
        rt.fromTarget.copy(control.target);
        rt.toTarget.copy(targetTarget);
        rt.fromSkyPitch = skyPitchRef.current;
        control.enabled = false;
      }
    } else if (phase === "inside") {
      const matrix = new THREE.Matrix4().lookAt(activeEyePos, activeTvTarget, new THREE.Vector3(0, 1, 0));
      const rotation = new THREE.Euler().setFromRotationMatrix(matrix, "YXZ");
      // Chemin angulaire le plus court pour le recentrage fluide de la tête
      const currentYaw = look.current.yaw;
      let diffYaw = (rotation.y - currentYaw) % (Math.PI * 2);
      if (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
      if (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
      look.current.targetYaw = currentYaw + diffYaw;
      look.current.targetPitch = rotation.x;
    }
  }, [resetViewToken, phase, camera, orbitTargetZ, activeEyePos, activeTvTarget, reducedMotion]);

  // Support vue caméra optionnelle (ex: pour vérification ou captures tests)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const camParam = new URLSearchParams(window.location.search).get("cam");
    if (!camParam) return;
    if (camParam === "side") {
      camera.position.set(-11, 3.8, -2.8);
      if (controls.current) {
        controls.current.target.set(0, 2.5, -2.8);
        controls.current.update();
      }
    } else if (camParam === "front") {
      camera.position.set(0, 3.6, -12);
      if (controls.current) {
        controls.current.target.set(0, 2.5, -2.8);
        controls.current.update();
      }
    }
  }, [camera]);

  // Prépare la transition à chaque changement de phase
  useEffect(() => {
    const phaseChanged = preparedPhaseRef.current !== phase;
    preparedPhaseRef.current = phase;
    phaseRef.current = phase;
    const a = anim.current;
    if (phase === "entering") {
      if (phaseChanged) {
        saved.current.pos.copy(camera.position);
        if (controls.current) saved.current.target.copy(controls.current.target);
        a.from.copy(camera.position);
        a.fromQ.copy(camera.quaternion);
        a.t = 0;
        a.active = true;
      } else if (a.active && !a.to.equals(activeEyePos)) {
        // L'attribution de la place peut arriver pendant le trajet. Repartir de
        // l'image courante évite un saut ou la perte de la vue extérieure sauvée.
        a.from.copy(camera.position);
        a.fromQ.copy(camera.quaternion);
        a.t = 0;
      }
      seatZRef.current = activeEyePos.z;
      a.to.copy(activeEyePos);
      const m = new THREE.Matrix4().lookAt(activeEyePos, activeTvTarget, new THREE.Vector3(0, 1, 0));
      a.toQ.setFromRotationMatrix(m);
    } else if (phase === "exiting" && phaseChanged) {
      a.from.copy(camera.position);
      a.fromQ.copy(camera.quaternion);
      a.to.copy(saved.current.pos);
      const m = new THREE.Matrix4().lookAt(saved.current.pos, saved.current.target, new THREE.Vector3(0, 1, 0));
      a.toQ.setFromRotationMatrix(m);
      a.t = 0;
      a.active = true;
    } else if (phaseChanged) {
      a.active = false;
    }
    if (phaseChanged && phase !== "outside") {
      // Garder la caméra extérieure à sa place pendant le regard vers le ciel.
      // La transition part de son orientation actuelle, puis réinitialise ce regard.
      skyPitchRef.current = 0;
      exteriorPointersRef.current.clear();
      if (controls.current) controls.current.minPolarAngle = 0;
    }
    if (phaseChanged && phase !== "inside") {
      activePointersRef.current.clear();
      pinchStartDistRef.current = null;
      look.current.dragging = false;
    }
  }, [phase, camera, activeEyePos, activeTvTarget]);

  // Chaque déplacement dans l'allée oriente le regard vers le lecteur actif.
  // Le visiteur peut ensuite tourner librement la tête avec la souris ou le doigt.
  useEffect(() => {
    if (phase !== "inside") return;
    const matrix = new THREE.Matrix4().lookAt(activeEyePos, activeTvTarget, new THREE.Vector3(0, 1, 0));
    const rotation = new THREE.Euler().setFromRotationMatrix(matrix, "YXZ");
    look.current.targetYaw = rotation.y;
    look.current.targetPitch = rotation.x;
  }, [phase, activeEyePos, activeTvTarget]);

  // Contrôles "tourner la tête" & Zoom à l'intérieur (souris / tactile / clavier / molette)
  useEffect(() => {
    // Html avec occlusion "blending" désactive les événements du canvas.
    // Son conteneur reste la surface stable, déjà utilisée par OrbitControls.
    const el = gl.domElement.parentElement ?? gl.domElement;
    const l = look.current;
    const pointers = activePointersRef.current;

    const down = (e: PointerEvent) => {
      if (phaseRef.current !== "inside") return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        l.dragging = true;
        l.lastX = e.clientX;
        l.lastY = e.clientY;
      } else if (pointers.size === 2) {
        // Début du pincement tactile à 2 doigts (pinch-to-zoom)
        l.dragging = false;
        const pts = Array.from(pointers.values());
        pinchStartDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        pinchStartFovRef.current = targetFovRef.current;
      }
      el.setPointerCapture?.(e.pointerId);
    };

    const move = (e: PointerEvent) => {
      if (phaseRef.current !== "inside" || !pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 2 && pinchStartDistRef.current !== null && pinchStartDistRef.current > 0) {
        // Pinch-to-zoom actif
        const pts = Array.from(pointers.values());
        const curDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (curDist > 0) {
          const ratio = pinchStartDistRef.current / curDist;
          targetFovRef.current = THREE.MathUtils.clamp(pinchStartFovRef.current * ratio, 22, 75);
        }
        return;
      }

      if (!l.dragging) return;
      const dx = e.clientX - l.lastX;
      const dy = e.clientY - l.lastY;
      l.lastX = e.clientX;
      l.lastY = e.clientY;
      l.targetYaw -= dx * 0.0045;
      l.targetPitch = THREE.MathUtils.clamp(l.targetPitch - dy * 0.0035, -0.9, 0.9);
    };

    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) {
        pinchStartDistRef.current = null;
      }
      if (pointers.size === 0) {
        l.dragging = false;
      } else if (pointers.size === 1) {
        const remaining = Array.from(pointers.values())[0];
        l.lastX = remaining.x;
        l.lastY = remaining.y;
        l.dragging = true;
      }
    };

    const cancelGesture = () => {
      pointers.clear();
      pinchStartDistRef.current = null;
      l.dragging = false;
    };

    // Zoom molette de la souris (uniquement sur la scène 3D, jamais dans un modal)
    const wheel = (e: WheelEvent) => {
      if (phaseRef.current !== "inside") return;
      if ((e.target as HTMLElement)?.closest?.("[role='dialog'], [data-modal], .overflow-y-auto")) {
        return;
      }
      e.preventDefault();
      const delta = e.deltaY * 0.04;
      targetFovRef.current = THREE.MathUtils.clamp(targetFovRef.current + delta, 22, 75);
    };

    const key = (e: KeyboardEvent) => {
      if (phaseRef.current !== "inside") return;
      if (document.querySelector("[role='dialog'][aria-modal='true']")) return;
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      const step = 0.15;
      if (e.key === "ArrowLeft" || e.key === "q" || e.key === "a") l.targetYaw += step;
      if (e.key === "ArrowRight" || e.key === "d") l.targetYaw -= step;
      if (e.key === "ArrowUp") l.targetPitch = Math.min(0.9, l.targetPitch + step);
      if (e.key === "ArrowDown") l.targetPitch = Math.max(-0.9, l.targetPitch - step);
      // Touches + / - pour zoomer
      if (e.key === "+" || e.key === "=") {
        targetFovRef.current = Math.max(22, targetFovRef.current - 5);
      }
      if (e.key === "-" || e.key === "_") {
        targetFovRef.current = Math.min(75, targetFovRef.current + 5);
      }
    };

    const target = gl.domElement.parentElement ?? el;
    target.addEventListener("pointerdown", down);
    target.addEventListener("lostpointercapture", up);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", cancelGesture);
    target.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", key);

    return () => {
      target.removeEventListener("pointerdown", down);
      target.removeEventListener("lostpointercapture", up);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", cancelGesture);
      cancelGesture();
      target.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
    };
  }, [gl]);

  // Au-delà de l'horizon, lever seulement le regard : faire descendre toute
  // la caméra sous le sol exposerait l'intérieur du bus et le dessous du décor.
  useEffect(() => {
    const surface = gl.domElement.parentElement ?? gl.domElement;
    const pointers = exteriorPointersRef.current;

    const down = (event: PointerEvent) => {
      if (phaseRef.current !== "outside") return;
      if (resetTransition.current.active) {
        resetTransition.current.active = false;
        if (controls.current) {
          controls.current.enabled = true;
          controls.current.update();
        }
      }
      pointers.set(event.pointerId, event.clientY);
    };

    const move = (event: PointerEvent) => {
      if (phaseRef.current !== "outside" || !pointers.has(event.pointerId)) return;
      const previousY = pointers.get(event.pointerId)!;
      pointers.set(event.pointerId, event.clientY);
      if (pointers.size !== 1) return;

      const control = controls.current;
      if (!control) return;
      const deltaY = event.clientY - previousY;
      if (deltaY < 0 && (skyPitchRef.current > 0 || control.getPolarAngle() >= EXTERIOR_MAX_POLAR_ANGLE - 0.01)) {
        skyPitchRef.current = Math.min(
          EXTERIOR_SKY_PITCH_LIMIT,
          skyPitchRef.current - deltaY * EXTERIOR_SKY_DRAG_SPEED,
        );
      } else if (deltaY > 0 && skyPitchRef.current > 0) {
        skyPitchRef.current = Math.max(0, skyPitchRef.current - deltaY * EXTERIOR_SKY_DRAG_SPEED);
      }
      // Quand le regard est levé, OrbitControls reste à l'horizon. Un glisser
      // vers le bas ramène d'abord le ciel, puis reprend l'orbite habituelle.
      control.minPolarAngle = skyPitchRef.current > 0 ? EXTERIOR_MAX_POLAR_ANGLE : 0;
    };

    const up = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
    };

    surface.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      surface.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  useFrame((state, dt) => {
    const a = anim.current;
    const p = phaseRef.current;
    const cam = state.camera;

    // Gestion du FOV (zoom)
    if (cam instanceof THREE.PerspectiveCamera) {
      let projectionChanged = false;
      if (cam.far !== cameraFar) {
        cam.far = cameraFar;
        projectionChanged = true;
      }

      let nextFov = currentFovRef.current;
      if (p === "inside") {
        nextFov = reducedMotion
          ? targetFovRef.current
          : currentFovRef.current
            + (targetFovRef.current - currentFovRef.current) * Math.min(1, dt * 10);
        if (Math.abs(targetFovRef.current - nextFov) < FOV_EPSILON) {
          nextFov = targetFovRef.current;
        }
      } else {
        targetFovRef.current = 55;
        nextFov = reducedMotion
          ? 55
          : currentFovRef.current + (55 - currentFovRef.current) * Math.min(1, dt * 6);
        if (Math.abs(55 - nextFov) < FOV_EPSILON) {
          nextFov = 55;
        }
      }

      currentFovRef.current = nextFov;
      if (cam.fov !== nextFov) {
        cam.fov = nextFov;
        projectionChanged = true;
      }
      if (projectionChanged) cam.updateProjectionMatrix();
    }

    if ((p === "entering" || p === "exiting") && a.active) {
      // Une première frame très tardive (GPU occupé, reprise d'onglet, appareil lent)
      // ne doit jamais avaler toute l'animation d'entrée/sortie d'un seul coup.
      const transitionDt = Math.min(dt, 0.05);
      a.t = Math.min(1, a.t + transitionDt / TRANSITION_TIME);
      const s = a.t * a.t * (3 - 2 * a.t);
      cam.position.lerpVectors(a.from, a.to, s);
      // petite courbe : la caméra s'élève un peu au milieu du trajet
      cam.position.setY(cam.position.y + Math.sin(s * Math.PI) * 0.6);
      cam.quaternion.slerpQuaternions(a.fromQ, a.toQ, s);
      if (a.t >= 1) {
        finishTransition(p === "entering" ? "inside" : "outside");
      }
      return;
    }

    if (p === "outside" && resetTransition.current.active) {
      const rt = resetTransition.current;
      const transitionDt = Math.min(dt, 0.05);
      rt.t = Math.min(1, rt.t + transitionDt / rt.duration);
      // Quintic smoothstep (démarrage et arrêt ultra-doux)
      const t = rt.t;
      const s = t * t * t * (t * (t * 6 - 15) + 10);

      cam.position.lerpVectors(rt.fromPos, rt.toPos, s);
      const curTarget = new THREE.Vector3().lerpVectors(rt.fromTarget, rt.toTarget, s);
      cam.lookAt(curTarget);
      skyPitchRef.current = THREE.MathUtils.lerp(rt.fromSkyPitch, 0, s);

      if (controls.current) {
        controls.current.target.copy(curTarget);
      }

      if (rt.t >= 1) {
        rt.active = false;
        skyPitchRef.current = 0;
        if (controls.current) {
          controls.current.enabled = true;
          controls.current.minPolarAngle = 0;
          controls.current.target.copy(rt.toTarget);
          cam.position.copy(rt.toPos);
          controls.current.update();
        }
      }
      return;
    }

    if (p === "inside") {
      const l = look.current;
      const lookBlend = reducedMotion ? 1 : Math.min(1, dt * 6.5);
      l.yaw += (l.targetYaw - l.yaw) * lookBlend;
      l.pitch += (l.targetPitch - l.pitch) * lookBlend;
      cam.rotation.set(l.pitch, l.yaw, 0, "YXZ");

      // Glissement fluide de siège le long de l'allée
      const targetZ = currentSeatZ ?? SEAT_EYE.z;
      seatZRef.current += (targetZ - seatZRef.current) * Math.min(1, dt * 5.5);

      cam.position.set(
        SEAT_EYE.x,
        SEAT_EYE.y,
        seatZRef.current,
      );
    } else if (p === "outside" && skyPitchRef.current > 0) {
      // OrbitControls rétablit d'abord l'orientation vers sa cible à chaque
      // frame ; cette rotation locale permet de viser jusqu'au zénith.
      skyTiltRef.current.setFromAxisAngle(LOCAL_X_AXIS, skyPitchRef.current);
      cam.quaternion.multiply(skyTiltRef.current);
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      domElement={gl.domElement.parentElement ?? gl.domElement}
      enabled={phase === "outside"}
      target={[0, 1.9, orbitTargetZ]}
      minDistance={EXTERIOR_MIN_DISTANCE}
      maxDistance={maxOrbitDistance}
      zoomToCursor
      maxPolarAngle={EXTERIOR_MAX_POLAR_ANGLE}
      enablePan={false}
      enableDamping={!reducedMotion}
      dampingFactor={0.08}
    />
  );
}
