"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { DEFAULT_CAMERA_POS, DEFAULT_TARGET, SEAT_EYE, TV_POSITION, type Phase } from "./constants";
import { getExteriorMaxDistance } from "@/lib/bus-camera";
import { ARRIVAL_STOP_TIME, ease, type JourneyState } from "@/lib/bus-journey";
import { getPassengerSkeleton } from "@/lib/passenger-proportions";
import { NAKAMA_ROSTER } from "./passenger-archetypes";
import { isBrowserZoomWheel, shouldIgnoreBusShortcut } from "@/lib/bus-shortcuts";

interface Props {
  phase: Phase;
  freeView?: boolean;
  onArrived: (phase: "inside" | "outside") => void;
  cabinLength?: number;
  cabinCenterZ?: number;
  cameraFar?: number;
  currentSeatZ?: number;
  currentSeatX?: number;
  currentPassengerSeatIndex?: number | null;
  tvTargetZ?: number;
  reducedMotion?: boolean;
  letterShortcutsEnabled?: boolean;
  resetViewToken?: number;
  journey:React.RefObject<JourneyState>;
}

const FOV_EPSILON = 0.01;
const EXTERIOR_MAX_POLAR_ANGLE = Math.PI / 2 - 0.04;
const EXTERIOR_SKY_PITCH_LIMIT = Math.PI - EXTERIOR_MAX_POLAR_ANGLE - 0.02;
const EXTERIOR_SKY_DRAG_SPEED = 0.0045;
const EXTERIOR_MIN_DISTANCE = 0.6;
const LOCAL_X_AXIS = new THREE.Vector3(1, 0, 0);
const CAMERA_UP = new THREE.Vector3(0, 1, 0);

export default function CameraRig({
  phase,
  freeView = false,
  onArrived,
  cabinLength = 9.2,
  cabinCenterZ = 0,
  cameraFar = 2000,
  currentSeatZ,
  currentSeatX = SEAT_EYE.x,
  currentPassengerSeatIndex = null,
  tvTargetZ = TV_POSITION.z,
  reducedMotion = false,
  letterShortcutsEnabled = true,
  resetViewToken = 0,
  journey,
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
  const freeViewRef = useRef(false);
  const freeCamera = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
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
    toSeat: false,
    fromQ: new THREE.Quaternion(),
    toQ: new THREE.Quaternion(),
  });
  const arrivedRef = useRef(onArrived);
  const headApproach=useRef(false);
  const cinematic=useMemo(()=>({pos:new THREE.Vector3(),target:new THREE.Vector3(),widePos:new THREE.Vector3(),wideTarget:new THREE.Vector3(1,1.4,-7),matrix:new THREE.Matrix4(),quaternion:new THREE.Quaternion()}),[]);
  useEffect(() => {
    arrivedRef.current = onArrived;
  }, [onArrived]);

  // Position Z du siège actuel (lisse le déplacement dans l'allée)
  const seatZRef = useRef(currentSeatZ ?? SEAT_EYE.z);

  // Position cible des yeux
  const characterId = NAKAMA_ROSTER[Math.max(0,currentPassengerSeatIndex ?? 0)%NAKAMA_ROSTER.length].id;
  const skeleton = getPassengerSkeleton(characterId), adultSkeleton = getPassengerSkeleton("");
  const eyeY = SEAT_EYE.y + skeleton.seatedHipHeight + skeleton.neckAboveHip + skeleton.headAboveNeck
    - adultSkeleton.seatedHipHeight - adultSkeleton.neckAboveHip - adultSkeleton.headAboveNeck;
  const activeEyePos = useMemo(() => {
    return new THREE.Vector3(currentSeatX, eyeY, currentSeatZ ?? SEAT_EYE.z);
  }, [currentSeatZ,currentSeatX,eyeY]);
  const activeTvTarget = useMemo(() => new THREE.Vector3(0, TV_POSITION.y, tvTargetZ), [tvTargetZ]);

  // Cible de rotation OrbitControls ajustée selon la longueur du bus
  const orbitTargetZ = useMemo(() => {
    return Math.max(-2.5, cabinCenterZ - 1.2);
  }, [cabinCenterZ]);

  const maxOrbitDistance = useMemo(() => {
    return getExteriorMaxDistance(cabinLength);
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
    } else if(controls.current) {
      const control=controls.current;
      const damping=control.enableDamping;
      control.enabled=true;
      control.enableDamping=false;
      // Vider les mouvements amortis avant de restaurer la cible enregistrée.
      control.update();
      control.target.copy(saved.current.target);
      camera.position.copy(a.to);
      control.update();
      control.enableDamping=damping;
    }

    arrivedRef.current(destination);
  }, [camera]);

  // Le même angle doit montrer le bus entier sur un écran portrait.
  // Au redimensionnement, préserver le zoom choisi en ajustant sa distance.
  useEffect(() => {
    const scale = THREE.MathUtils.clamp(0.85 / (size.width / Math.max(1, size.height)), 1, 2.5);
    const ratio = scale / framingScaleRef.current;
    framingScaleRef.current = scale;
    if (phaseRef.current === "outside" || freeViewRef.current) {
      const rt = resetTransition.current;
      if (rt.active) {
        rt.fromPos.sub(rt.fromTarget).multiplyScalar(ratio).add(rt.fromTarget);
        rt.toPos.sub(rt.toTarget).multiplyScalar(ratio).add(rt.toTarget);
      }
      const target = controls.current?.target ?? DEFAULT_TARGET;
      camera.position.sub(target).multiplyScalar(ratio).add(target);
      controls.current?.update();
    } else {
      saved.current.pos.sub(saved.current.target).multiplyScalar(ratio).add(saved.current.target);
      if(phaseRef.current==="exiting") {
        const a=anim.current;
        a.to.copy(saved.current.pos);

      }
    }
  }, [camera, size.width, size.height, activeEyePos]);

  useEffect(() => {
    if (resetViewRef.current === resetViewToken) return;
    resetViewRef.current = resetViewToken;
    activePointersRef.current.clear();
    exteriorPointersRef.current.clear();
    pinchStartDistRef.current = null;
    look.current.dragging = false;
    if ((phase === "outside" || freeViewRef.current) && controls.current) {
      const damping = controls.current.enableDamping;
      controls.current.enableDamping = false;
      controls.current.update();
      controls.current.enableDamping = damping;
    }
    targetFovRef.current = 55;
    if ((phase === "outside" || freeViewRef.current) && controls.current) {
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
        rt.toSeat = false;
        rt.fromQ.copy(camera.quaternion);
        rt.toQ.setFromRotationMatrix(new THREE.Matrix4().lookAt(targetPos, targetTarget, new THREE.Vector3(0, 1, 0)));
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
    if (camParam !== "side" && camParam !== "front") return;
    const target = new THREE.Vector3(0, 2.5, -2.8);
    if (camParam === "side") camera.position.set(11, 3.8, -2.8);
    else camera.position.set(0, 3.6, -12);
    camera.position.sub(target).multiplyScalar(framingScaleRef.current).add(target);
    if (controls.current) {
      controls.current.target.copy(target);
      controls.current.update();
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
        headApproach.current=false;
        saved.current.pos.copy(camera.position);
        if (controls.current) saved.current.target.copy(controls.current.target);
        a.from.copy(camera.position);
        a.fromQ.copy(camera.quaternion);
        a.t = 0;
        a.active = true;
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
  }, [phase, camera, activeEyePos, activeTvTarget, cabinCenterZ, cabinLength]);

  // Chaque déplacement dans l'allée oriente le regard vers le lecteur actif.
  // Le visiteur peut ensuite tourner librement la tête avec la souris ou le doigt.
  useEffect(() => {
    if (phase !== "inside") return;
    const matrix = new THREE.Matrix4().lookAt(activeEyePos, activeTvTarget, new THREE.Vector3(0, 1, 0));
    const rotation = new THREE.Euler().setFromRotationMatrix(matrix, "YXZ");
    look.current.targetYaw = rotation.y;
    look.current.targetPitch = rotation.x;
  }, [phase, activeEyePos, activeTvTarget]);

  // La caméra peut quitter les yeux sans modifier la place ni le trajet du passager.
  useEffect(() => {
    const next = phase === "inside" && freeView;
    if (freeViewRef.current === next) return;
    const wasFree = freeViewRef.current;
    freeViewRef.current = next;
    activePointersRef.current.clear();
    exteriorPointersRef.current.clear();
    pinchStartDistRef.current = null;
    look.current.dragging = false;
    if (wasFree && controls.current) {
      const damping = controls.current.enableDamping;
      controls.current.enableDamping = false;
      controls.current.update();
      controls.current.enableDamping = damping;
      freeCamera.current = { pos: camera.position.clone(), target: controls.current.target.clone() };
    }
    if (phase !== "inside") {
      resetTransition.current.active = false;
      return;
    }
    const rt = resetTransition.current;
    rt.active = true;
    rt.t = 0;
    rt.duration = reducedMotion ? 0.01 : 0.85;
    rt.toSeat = !next;
    rt.fromPos.copy(camera.position);
    rt.fromQ.copy(camera.quaternion);
    rt.fromSkyPitch = skyPitchRef.current;
    const destination = freeCamera.current ?? saved.current;
    rt.toPos.copy(next ? destination.pos : activeEyePos);
    rt.toTarget.copy(next ? destination.target : activeTvTarget);
    rt.fromTarget.copy(next ? camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(4)) : controls.current?.target ?? activeTvTarget);
    rt.toQ.setFromRotationMatrix(new THREE.Matrix4().lookAt(rt.toPos, rt.toTarget, new THREE.Vector3(0, 1, 0)));
    skyPitchRef.current = 0;
    if (controls.current) controls.current.enabled = false;
    targetFovRef.current = 55;
  }, [freeView, phase, camera, activeEyePos, activeTvTarget, reducedMotion]);

  // Contrôles "tourner la tête" & Zoom à l'intérieur (souris / tactile / clavier / molette)
  useEffect(() => {
    // Html avec occlusion "blending" désactive les événements du canvas.
    // Son conteneur reste la surface stable, déjà utilisée par OrbitControls.
    const el = gl.domElement.parentElement ?? gl.domElement;
    const l = look.current;
    const pointers = activePointersRef.current;

    const down = (e: PointerEvent) => {
      if (phaseRef.current !== "inside" || freeViewRef.current || resetTransition.current.active) return;
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
      if (phaseRef.current !== "inside" || freeViewRef.current || !pointers.has(e.pointerId)) return;
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
      if (isBrowserZoomWheel(e)) return;
      if (phaseRef.current !== "inside" || freeViewRef.current) return;
      if ((e.target as HTMLElement)?.closest?.("[role='dialog'], [data-modal], .overflow-y-auto")) {
        return;
      }
      e.preventDefault();
      const delta = e.deltaY * 0.04;
      targetFovRef.current = THREE.MathUtils.clamp(targetFovRef.current + delta, 22, 75);
    };

    const key = (e: KeyboardEvent) => {
      if (phaseRef.current !== "inside" || freeViewRef.current) return;
      if (shouldIgnoreBusShortcut(e, document.activeElement,
        Boolean(document.querySelector("[role='dialog']")), letterShortcutsEnabled)) return;
      const key = e.key.toLowerCase();
      const step = 0.15;
      if (key === "arrowleft" || key === "q" || key === "a") l.targetYaw += step;
      else if (key === "arrowright" || key === "d") l.targetYaw -= step;
      else if (key === "arrowup") l.targetPitch = Math.min(0.9, l.targetPitch + step);
      else if (key === "arrowdown") l.targetPitch = Math.max(-0.9, l.targetPitch - step);
      // Touches + / - pour zoomer
      else if (key === "+" || key === "=") {
        targetFovRef.current = Math.max(22, targetFovRef.current - 5);
      }
      else if (key === "-" || key === "_") {
        targetFovRef.current = Math.min(75, targetFovRef.current + 5);
      } else return;
      e.preventDefault();
    };

    const target = gl.domElement.parentElement ?? el;
    // OrbitControls also listens here: keep modified wheel events away from it
    // without cancelling the browser's own zoom gesture.
    const preserveBrowserZoom = (event: WheelEvent) => {
      if (isBrowserZoomWheel(event)) event.stopImmediatePropagation();
    };
    target.addEventListener("wheel", preserveBrowserZoom, { capture: true });
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
      target.removeEventListener("wheel", preserveBrowserZoom, { capture: true });
      target.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
    };
  }, [gl, letterShortcutsEnabled]);

  // Au-delà de l'horizon, lever seulement le regard : faire descendre toute
  // la caméra sous le sol exposerait l'intérieur du bus et le dessous du décor.
  useEffect(() => {
    const surface = gl.domElement.parentElement ?? gl.domElement;
    const pointers = exteriorPointersRef.current;

    const down = (event: PointerEvent) => {
      if (phaseRef.current !== "outside" && !freeViewRef.current) return;
      if (resetTransition.current.active && phaseRef.current === "inside") return;
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
      if ((phaseRef.current !== "outside" && !freeViewRef.current) || !pointers.has(event.pointerId)) return;
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
      if (p === "inside" && !freeViewRef.current) {
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
      const trip=journey.current;
      if(trip.waitingForSeat)return;
      if(reducedMotion){
        if(trip.completed)finishTransition(p==="entering"?"inside":"outside");
        return;
      }
      const watchZ=trip.position.z;
      cinematic.target.set(0.8,characterId==="chopper"?trip.position.y+.7:1.4,watchZ);
      cinematic.pos.set(8,3.8,watchZ-4).sub(cinematic.target).multiplyScalar(framingScaleRef.current).add(cinematic.target);
      if(p==="entering") {
        if(trip.elapsed<trip.timing.entryCameraTime) {
          const wideTarget=cinematic.wideTarget.set(1,characterId==="chopper"?.7:1.4,trip.doorZ-4.07);
          const widePos=cinematic.widePos.set(15,7,trip.doorZ-13.07).sub(wideTarget).multiplyScalar(framingScaleRef.current).add(wideTarget);
          const close=ease((trip.elapsed-ARRIVAL_STOP_TIME)/1.2);
          cinematic.pos.lerpVectors(widePos,cinematic.pos,close);
          cinematic.target.lerpVectors(wideTarget,cinematic.target,close);
          cam.position.lerpVectors(a.from,cinematic.pos,ease(trip.elapsed/1.4));
          cinematic.matrix.lookAt(cam.position,cinematic.target,CAMERA_UP);
          cinematic.quaternion.setFromRotationMatrix(cinematic.matrix);
          cam.quaternion.slerpQuaternions(a.fromQ,cinematic.quaternion,ease(trip.elapsed/1.4));
        } else {
          if(!headApproach.current) {
            headApproach.current=true; a.from.copy(cam.position); a.fromQ.copy(cam.quaternion);
          }
          // Raccord direct depuis le plan extérieur jusqu’aux yeux, à travers la caisse.
          cam.position.lerpVectors(a.from,a.to,trip.cameraBlend);
          cam.quaternion.slerpQuaternions(a.fromQ,a.toQ,trip.cameraBlend);
        }
      } else {
        const outward=1-trip.cameraBlend;
        cinematic.matrix.lookAt(cinematic.pos,cinematic.target,CAMERA_UP);
        cinematic.quaternion.setFromRotationMatrix(cinematic.matrix);
        if(outward<1) {
          cam.position.lerpVectors(a.from,cinematic.pos,outward);
          cam.quaternion.slerpQuaternions(a.fromQ,cinematic.quaternion,outward);
        } else {
          const departure=ease((trip.elapsed-trip.timing.exitWalkEnd-0.7)/1.7);
          cam.position.lerpVectors(cinematic.pos,a.to,departure);
          cam.quaternion.slerpQuaternions(cinematic.quaternion,a.toQ,departure);
        }
      }
      if (trip.completed) {
        finishTransition(p === "entering" ? "inside" : "outside");
      }
      return;
    }

    if ((p === "outside" || p === "inside") && resetTransition.current.active) {
      const rt = resetTransition.current;
      const transitionDt = Math.min(dt, 0.25);
      rt.t = Math.min(1, rt.t + transitionDt / rt.duration);
      // Quintic smoothstep (démarrage et arrêt ultra-doux)
      const t = rt.t;
      const s = t * t * t * (t * (t * 6 - 15) + 10);

      cam.position.lerpVectors(rt.fromPos, rt.toPos, s);
      const curTarget = cinematic.target.lerpVectors(rt.fromTarget, rt.toTarget, s);
      cam.quaternion.slerpQuaternions(rt.fromQ, rt.toQ, s);
      skyPitchRef.current = THREE.MathUtils.lerp(rt.fromSkyPitch, 0, s);

      if (controls.current) {
        controls.current.target.copy(curTarget);
      }

      if (rt.t >= 1) {
        rt.active = false;
        skyPitchRef.current = 0;
        if (rt.toSeat) {
          const rotation = new THREE.Euler().setFromQuaternion(rt.toQ, "YXZ");
          look.current.yaw = look.current.targetYaw = rotation.y;
          look.current.pitch = look.current.targetPitch = rotation.x;
          seatZRef.current = activeEyePos.z;
        } else if (controls.current) {
          controls.current.enabled = true;
          controls.current.minPolarAngle = 0;
          controls.current.target.copy(rt.toTarget);
          cam.position.copy(rt.toPos);
          controls.current.update();
        }
      }
      return;
    }

    if (p === "inside" && !freeViewRef.current) {
      const l = look.current;
      const lookBlend = reducedMotion ? 1 : Math.min(1, dt * 6.5);
      l.yaw += (l.targetYaw - l.yaw) * lookBlend;
      l.pitch += (l.targetPitch - l.pitch) * lookBlend;
      cam.rotation.set(l.pitch, l.yaw, 0, "YXZ");

      // Glissement fluide de siège le long de l'allée
      const targetZ = currentSeatZ ?? SEAT_EYE.z;
      seatZRef.current += (targetZ - seatZRef.current) * Math.min(1, dt * 5.5);

      cam.position.set(
        currentSeatX,
        eyeY,
        seatZRef.current,
      );
    } else if ((p === "outside" || freeViewRef.current) && skyPitchRef.current > 0) {
      // OrbitControls rétablit d'abord l'orientation vers sa cible à chaque
      // frame ; cette rotation locale permet de viser jusqu'au zénith.
      skyTiltRef.current.setFromAxisAngle(LOCAL_X_AXIS, skyPitchRef.current);
      cam.quaternion.multiply(skyTiltRef.current);
    }
    if (freeViewRef.current && cam.position.y < 0.24) {
      const lift = 0.24 - cam.position.y;
      cam.position.y += lift;
      if (controls.current) controls.current.target.y += lift;
    }
  }, -0.5);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      domElement={gl.domElement.parentElement ?? gl.domElement}
      enabled={phase === "outside" || (phase === "inside" && freeView)}
      target={[0, 1.9, orbitTargetZ]}
      minDistance={freeView ? 0.18 : EXTERIOR_MIN_DISTANCE}
      maxDistance={maxOrbitDistance}
      zoomToCursor={phase === "inside" && freeView}
      maxPolarAngle={EXTERIOR_MAX_POLAR_ANGLE}
      enablePan={phase === "inside" && freeView}
      enableDamping={!reducedMotion}
      dampingFactor={0.08}
    />
  );
}
