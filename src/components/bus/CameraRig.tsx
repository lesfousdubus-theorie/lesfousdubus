"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { DEFAULT_CAMERA_POS, DEFAULT_TARGET, SEAT_EYE, TV_POSITION, type Phase } from "./constants";
import { getExteriorMaxDistance, getOverviewDistance, wheelZoomRatio } from "@/lib/bus-camera";
import { isBusViewportInput, useBusExploration } from "./useBusExploration";
import { ease, type JourneyState } from "@/lib/bus-journey";
import { getPassengerSkeleton } from "@/lib/passenger-proportions";
import { getNakamaArchetype } from "./passenger-archetypes";
import { isBrowserZoomWheel, shouldIgnoreBusShortcut } from "@/lib/bus-shortcuts";

interface Props {
  phase: Phase;
  freeView?: boolean;
  messagesBackdrop?: boolean;
  onArrived: (phase: "inside" | "outside") => void;
  cabinLength?: number;
  cabinCenterZ?: number;
  cameraFar?: number;
  visitCameraRef: React.RefObject<THREE.Camera | null>;
  initialStatsReady: boolean;
  inputsPaused: boolean;
  currentSeatZ?: number;
  currentSeatX?: number;
  currentPassengerSeatIndex?: number | null;
  currentPassengerAvatarId?: string | null;
  tvTargetZ?: number;
  reducedMotion?: boolean;
  letterShortcutsEnabled?: boolean;
  resetViewToken?: number;
  journey:React.RefObject<JourneyState>;
}

const FOV_EPSILON = 0.01;
const CAMERA_UP = new THREE.Vector3(0, 1, 0);
const DEFAULT_EXTERIOR_OFFSET = DEFAULT_CAMERA_POS.clone().sub(DEFAULT_TARGET);

export default function CameraRig({
  phase,
  freeView = false,
  messagesBackdrop = false,
  onArrived,
  cabinLength = 9.2,
  cabinCenterZ = 0,
  cameraFar = 2000,
  visitCameraRef,
  initialStatsReady,
  inputsPaused,
  currentSeatZ,
  currentSeatX = SEAT_EYE.x,
  currentPassengerSeatIndex = null,
  currentPassengerAvatarId = null,
  tvTargetZ = TV_POSITION.z,
  reducedMotion = false,
  letterShortcutsEnabled = true,
  resetViewToken = 0,
  journey,
}: Props) {
  const { camera: sceneCamera, gl, size, get, set } = useThree();
  // Le Canvas de la scène fournit toujours une caméra de perspective.
  const [camera] = useState(() => sceneCamera as THREE.PerspectiveCamera);
  const cameraRef = useRef(camera);
  const backdropCamera = useRef<THREE.PerspectiveCamera | null>(null);
  const saved = useRef({ pos: DEFAULT_CAMERA_POS.clone(), target: DEFAULT_TARGET.clone(), orientation: new THREE.Quaternion() });
  const anim = useRef({
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
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartFovRef = useRef<number>(55);
  const phaseRef = useRef<Phase>(phase);
  const freeViewRef = useRef(false);
  const freeCamera = useRef<typeof saved.current | null>(null);
  const preparedPhaseRef = useRef<Phase | null>(null);
  const initialFramedRef = useRef(false);
  const framedWithStats = useRef(false);
  const explored = useRef(false);
  const resetViewRef = useRef(resetViewToken);
  const resetTransition = useRef({
    active: false,
    t: 0,
    duration: 0.85,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    canInterrupt: false,
    toSeat: false,
    fromQ: new THREE.Quaternion(),
    toQ: new THREE.Quaternion(),
  });
  const arrivedRef = useRef(onArrived);
  const headApproach=useRef(false);
  const exitFromFreeView = useRef(false);
  const cinematic = useMemo(() => ({pos: new THREE.Vector3(), target: new THREE.Vector3(), matrix: new THREE.Matrix4(), quaternion: new THREE.Quaternion()}), []);
  useEffect(() => {
    arrivedRef.current = onArrived;
  }, [onArrived]);

  // Position X/Z du siège actuel (lisse les déplacements latéraux et dans l'allée)
  const seatXRef = useRef(currentSeatX);
  const seatZRef = useRef(currentSeatZ ?? SEAT_EYE.z);

  // Position cible des yeux
  const characterId = getNakamaArchetype(currentPassengerSeatIndex, currentPassengerAvatarId).id;
  const skeleton = getPassengerSkeleton(characterId), adultSkeleton = getPassengerSkeleton("");
  const eyeY = SEAT_EYE.y + skeleton.seatedHipHeight + skeleton.neckAboveHip + skeleton.headAboveNeck
    - adultSkeleton.seatedHipHeight - adultSkeleton.neckAboveHip - adultSkeleton.headAboveNeck;
  const activeEyePos = useMemo(() => {
    return new THREE.Vector3(currentSeatX, eyeY, currentSeatZ ?? SEAT_EYE.z);
  }, [currentSeatZ,currentSeatX,eyeY]);
  const activeTvTarget = useMemo(() => new THREE.Vector3(0, TV_POSITION.y, tvTargetZ), [tvTargetZ]);

  const aspect = size.width / Math.max(1, size.height) || 1;
  const overview = useMemo(() => {
    const target = new THREE.Vector3(0, 1.9, cabinCenterZ);
    const pos = DEFAULT_EXTERIOR_OFFSET.clone().setLength(getOverviewDistance(cabinLength, aspect, DEFAULT_EXTERIOR_OFFSET)).add(target);
    const orientation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pos, target, CAMERA_UP));
    return { pos, target, orientation };
  }, [aspect, cabinCenterZ, cabinLength]);

  const canExplore = useCallback((start: boolean) => {
    if (phaseRef.current !== "outside" && !freeViewRef.current) return false;
    const transition = resetTransition.current;
    if (transition.active && (!start || !transition.canInterrupt)) return false;
    if (start) {
      explored.current = true;
      transition.active = false;
    }
    return true;
  }, []);
  const { pivot, cancelExplorationInput } = useBusExploration(camera, cabinCenterZ + cabinLength / 2,
    getExteriorMaxDistance(cabinLength), reducedMotion, inputsPaused, canExplore);

  useLayoutEffect(() => {
    visitCameraRef.current = camera;
    return () => { visitCameraRef.current = null; };
  }, [camera, visitCameraRef]);

  useLayoutEffect(() => {
    if (!messagesBackdrop) return;
    const backdrop = backdropCamera.current ?? new THREE.PerspectiveCamera(55, 1, 0.1);
    backdropCamera.current = backdrop;
    const aspect = size.width / Math.max(1, size.height);
    const halfLength = cabinLength / 2;
    const offsetLength = DEFAULT_EXTERIOR_OFFSET.length();
    // Le bout le plus proche reste dans le cadre même avec une longue caisse en portrait.
    const nearEnd = halfLength * Math.abs(DEFAULT_EXTERIOR_OFFSET.z) / offsetLength;
    const halfWidth = halfLength * DEFAULT_EXTERIOR_OFFSET.x / Math.hypot(DEFAULT_EXTERIOR_OFFSET.x, DEFAULT_EXTERIOR_OFFSET.z) + 1.5;
    const halfHeight = 2.4 + nearEnd * DEFAULT_EXTERIOR_OFFSET.y / offsetLength;
    const halfFrustumHeight = Math.tan(THREE.MathUtils.degToRad(backdrop.fov / 2));
    const distance = nearEnd + Math.max(halfWidth / Math.max(0.1, aspect), halfHeight) / (0.84 * halfFrustumHeight);
    const target = new THREE.Vector3(0, DEFAULT_TARGET.y, cabinCenterZ);
    backdrop.aspect = aspect || 1;
    backdrop.far = cameraFar;
    backdrop.position.copy(DEFAULT_EXTERIOR_OFFSET)
      .multiplyScalar(Math.max(1, distance / offsetLength)).add(target);
    backdrop.lookAt(target);
    backdrop.updateProjectionMatrix();
    backdrop.updateMatrixWorld();
  }, [cameraFar, cabinLength, cabinCenterZ, messagesBackdrop, size.width, size.height]);

  useLayoutEffect(() => {
    if (!messagesBackdrop || !backdropCamera.current) return;
    const original = camera;
    // Préserver la caméra du passager, son zoom et la cible de ses commandes.
    set({ camera: backdropCamera.current });
    return () => {
      if (!("manual" in original && original.manual)) {
        const viewport = get().size;
        original.aspect = viewport.width / Math.max(1, viewport.height) || 1;
        original.updateProjectionMatrix();
      }
      set({ camera: original });
    };
  }, [camera, get, messagesBackdrop, set]);

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
    } else {
      pivot.copy(saved.current.target);
    }

    arrivedRef.current(destination);
  }, [camera, pivot]);

  // Le cadrage d'ensemble est appliqué à l'arrivée et lors d'un recentrage explicite.
  useLayoutEffect(() => {
    if (initialFramedRef.current && (!initialStatsReady || framedWithStats.current || explored.current || phase !== "outside")) return;
    initialFramedRef.current = true;
    framedWithStats.current = initialStatsReady;
    const camParam = new URLSearchParams(window.location.search).get("cam");
    const { target, orientation } = overview;
    const pos = overview.pos.clone();
    if (camParam === "side" || camParam === "front") {
      const offset = camParam === "side" ? new THREE.Vector3(11, 1.9, 0) : new THREE.Vector3(0, 1.7, -12);
      pos.copy(offset).setLength(getOverviewDistance(cabinLength, aspect, offset)).add(target);
    }
    saved.current.pos.copy(pos);
    saved.current.target.copy(target);
    saved.current.orientation.copy(
      camParam === "side" || camParam === "front"
        ? new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pos, target, CAMERA_UP))
        : orientation,
    );
    if (phaseRef.current === "outside") {
      camera.position.copy(pos);
      camera.quaternion.copy(saved.current.orientation);
      pivot.copy(target);
    }
  }, [aspect, cabinLength, camera, overview, pivot, initialStatsReady, phase]);

  useEffect(() => {
    if (resetViewRef.current === resetViewToken) return;
    resetViewRef.current = resetViewToken;
    explored.current = true;
    cancelExplorationInput();
    activePointersRef.current.clear();
    pinchStartDistRef.current = null;
    look.current.dragging = false;
    targetFovRef.current = 55;
    if (phase === "outside" || freeViewRef.current) {
      if (reducedMotion) {
        camera.position.copy(overview.pos);
        camera.quaternion.copy(overview.orientation);
        pivot.copy(overview.target);
        resetTransition.current.active = false;
      } else {
        const rt = resetTransition.current;
        rt.active = true;
        rt.canInterrupt = true;
        rt.t = 0;
        rt.duration = .65;
        rt.fromPos.copy(camera.position);
        rt.toPos.copy(overview.pos);
        rt.fromTarget.copy(pivot);
        rt.toTarget.copy(overview.target);
        rt.toSeat = false;
        rt.fromQ.copy(camera.quaternion);
        rt.toQ.copy(overview.orientation);
      }
    } else if (phase === "inside") {
      const matrix = new THREE.Matrix4().lookAt(activeEyePos, activeTvTarget, CAMERA_UP);
      const rotation = new THREE.Euler().setFromRotationMatrix(matrix, "YXZ");
      const currentYaw = look.current.yaw;
      const diff = rotation.y - currentYaw;
      look.current.targetYaw = currentYaw + Math.atan2(Math.sin(diff), Math.cos(diff));
      look.current.targetPitch = rotation.x;
    }
  }, [resetViewToken, phase, camera, overview, pivot, activeEyePos, activeTvTarget, cancelExplorationInput, reducedMotion]);

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
        saved.current.target.copy(pivot);
        saved.current.orientation.copy(camera.quaternion);
        a.from.copy(camera.position);
        a.fromQ.copy(camera.quaternion);
        a.active = true;
      }
      seatXRef.current = activeEyePos.x;
      seatZRef.current = activeEyePos.z;
      a.to.copy(activeEyePos);
      const m = new THREE.Matrix4().lookAt(activeEyePos, activeTvTarget, new THREE.Vector3(0, 1, 0));
      a.toQ.setFromRotationMatrix(m);
    } else if (phase === "exiting" && phaseChanged) {
      exitFromFreeView.current = freeViewRef.current;
      a.from.copy(camera.position);
      a.fromQ.copy(camera.quaternion);
      a.to.copy(saved.current.pos);
      a.toQ.copy(saved.current.orientation);
      a.active = true;
    } else if (phaseChanged) {
      a.active = false;
    }
    if (phaseChanged && phase !== "inside") {
      activePointersRef.current.clear();
      pinchStartDistRef.current = null;
      look.current.dragging = false;
    }
  }, [phase, camera, activeEyePos, activeTvTarget, pivot]);

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
    pinchStartDistRef.current = null;
    look.current.dragging = false;
    if (wasFree) {
      freeCamera.current = { pos: camera.position.clone(), target: pivot.clone(), orientation: camera.quaternion.clone() };
    }
    if (phase !== "inside") {
      resetTransition.current.active = false;
      return;
    }
    const rt = resetTransition.current;
    rt.active = true;
    rt.canInterrupt = false;
    rt.t = 0;
    rt.duration = reducedMotion ? 0.01 : 0.85;
    rt.toSeat = !next;
    rt.fromPos.copy(camera.position);
    rt.fromQ.copy(camera.quaternion);
    const destination = freeCamera.current ?? saved.current;
    rt.toPos.copy(next ? destination.pos : activeEyePos);
    rt.toTarget.copy(next ? destination.target : activeTvTarget);
    rt.fromTarget.copy(pivot);
    if (next) rt.toQ.copy(destination.orientation);
    else rt.toQ.setFromRotationMatrix(new THREE.Matrix4().lookAt(rt.toPos, rt.toTarget, CAMERA_UP));
    targetFovRef.current = 55;
  }, [freeView, phase, camera, activeEyePos, activeTvTarget, pivot, reducedMotion]);

  // Contrôles "tourner la tête" & Zoom à l'intérieur (souris / tactile / clavier / molette)
  useEffect(() => {
    if (inputsPaused) return;
    // Html avec occlusion "blending" désactive les événements du canvas.
    // Le conteneur reste la surface stable pendant les changements de mode.
    const el = gl.domElement.parentElement ?? gl.domElement;
    const l = look.current;
    const pointers = activePointersRef.current;

    const down = (e: PointerEvent) => {
      if (phaseRef.current !== "inside" || freeViewRef.current || resetTransition.current.active) return;
      if (!isBusViewportInput(e) || (e.pointerType === "mouse" && e.button !== 0)) return;
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
          targetFovRef.current = THREE.MathUtils.clamp(pinchStartFovRef.current * ratio, 14, 75);
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

    // Les gestes de zoom du navigateur et la molette dans les modales gardent la priorité.
    const wheel = (e: WheelEvent) => {
      if (phaseRef.current !== "inside" || freeViewRef.current || resetTransition.current.active) return;
      if (!e.deltaY || isBrowserZoomWheel(e) || get().camera !== camera || !isBusViewportInput(e)) return;
      e.preventDefault();
      const ratio = wheelZoomRatio(e.deltaY, e.deltaMode, el.clientHeight);
      const halfFov = THREE.MathUtils.degToRad(targetFovRef.current / 2);
      const angle = Math.atan(Math.tan(halfFov) * ratio);
      targetFovRef.current = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(angle) * 2, 14, 75);
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
        targetFovRef.current = Math.max(14, targetFovRef.current - 5);
      }
      else if (key === "-" || key === "_") {
        targetFovRef.current = Math.min(75, targetFovRef.current + 5);
      } else return;
      e.preventDefault();
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
  }, [gl, get, camera, inputsPaused, letterShortcutsEnabled]);

  useFrame((_, dt) => {
    const a = anim.current;
    const p = phaseRef.current;
    const cam = cameraRef.current;

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
      const aspect = Math.max(.55, size.width / Math.max(1, size.height));
      const setback = THREE.MathUtils.clamp(.83 / aspect, 1, 1.36);
      if (p === "entering") {
        if (trip.elapsed < trip.timing.entryCameraTime) {
          // Plan fixe face à la porte pendant que le passager entre dans le cadre et monte.
          cinematic.target.set(1.25, 1.25, trip.doorZ - .65);
          cinematic.pos.set(1.25 + 6.05 * setback, 2.8, trip.doorZ - 2.65 * setback);
          const approach = ease(trip.elapsed / 1.15);
          cam.position.lerpVectors(a.from, cinematic.pos, approach);
          cinematic.matrix.lookAt(cam.position,cinematic.target,CAMERA_UP);
          cinematic.quaternion.setFromRotationMatrix(cinematic.matrix);
          cam.quaternion.slerpQuaternions(a.fromQ, cinematic.quaternion, approach);
        } else {
          if(!headApproach.current) {
            headApproach.current=true; a.from.copy(cam.position); a.fromQ.copy(cam.quaternion);
          }
          // Raccord direct depuis le plan extérieur jusqu’aux yeux, à travers la caisse.
          cam.position.lerpVectors(a.from,a.to,trip.cameraBlend);
          cam.quaternion.slerpQuaternions(a.fromQ,a.toQ,trip.cameraBlend);
        }
      } else {
        const focusY = characterId === "chopper" ? .7 : 1.05;
        const watchZ = trip.position.z;
        cinematic.target.set(trip.position.x * .72, trip.position.y + focusY, watchZ);
        const side = 5.6 + THREE.MathUtils.clamp(trip.position.x, 0, 3.3) * .75;
        cinematic.pos.set(cinematic.target.x + side * setback, cinematic.target.y + 1.45, watchZ - 2.65 * setback);
        const outward = exitFromFreeView.current ? ease(trip.elapsed / 1.15) : 1 - trip.cameraBlend;
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
      cam.quaternion.slerpQuaternions(rt.fromQ, rt.toQ, s);
      pivot.lerpVectors(rt.fromTarget, rt.toTarget, s);

      if (rt.t >= 1) {
        rt.active = false;
        if (rt.toSeat) {
          const rotation = new THREE.Euler().setFromQuaternion(rt.toQ, "YXZ");
          look.current.yaw = look.current.targetYaw = rotation.y;
          look.current.pitch = look.current.targetPitch = rotation.x;
          seatXRef.current = activeEyePos.x;
          seatZRef.current = activeEyePos.z;
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

      // Glissement fluide de siège latéral et le long de l'allée
      const seatBlend = reducedMotion ? 1 : Math.min(1, dt * 5.5);
      const targetZ = currentSeatZ ?? SEAT_EYE.z;
      seatXRef.current += (currentSeatX - seatXRef.current) * seatBlend;
      seatZRef.current += (targetZ - seatZRef.current) * seatBlend;

      cam.position.set(
        seatXRef.current,
        eyeY,
        seatZRef.current,
      );
    }
  }, -0.5);

  return null;
}
