"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { DEFAULT_CAMERA_POS, DEFAULT_TARGET, SEAT_EYE, TV_POSITION, type Phase } from "./constants";
import { getExteriorMaxDistance, getOverviewDistance, wheelZoomRatio } from "@/lib/bus-camera";
import { BUS_FRONT_Z } from "@/lib/bus-layout";
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
const INTERIOR_CAMERA_KEYS = new Set(["arrowleft", "arrowright", "arrowup", "arrowdown", "q", "a", "d", "z", "w", "s", "+", "-"]);
const EXTERIOR_CAMERA_KEYS = new Set(["arrowleft", "arrowright", "arrowup", "arrowdown", "+", "-"]);

function normalizeCameraKey(key: string) {
  const lower = key.toLowerCase();
  if (lower === "=") return "+";
  if (lower === "_") return "-";
  return lower;
}

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
  const heldKeysRef = useRef<Set<string>>(new Set());
  const tappedKeysRef = useRef<Set<string>>(new Set());
  const phaseRef = useRef<Phase>(phase);
  const freeViewRef = useRef(false);
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

  // Position cible des yeux : ne descend jamais sous la hauteur standard (ex. Chopper) pour garder la vue dégagée au-dessus du dossier devant soi.
  const characterId = getNakamaArchetype(currentPassengerSeatIndex, currentPassengerAvatarId).id;
  const skeleton = getPassengerSkeleton(characterId), adultSkeleton = getPassengerSkeleton("");
  const rawEyeY = SEAT_EYE.y + skeleton.seatedHipHeight + skeleton.neckAboveHip + skeleton.headAboveNeck
    - adultSkeleton.seatedHipHeight - adultSkeleton.neckAboveHip - adultSkeleton.headAboveNeck;
  const eyeY = Math.max(SEAT_EYE.y, rawEyeY);
  // Position X/Y/Z du siège actuel (lisse les déplacements latéraux, de hauteur d'avatar et dans l'allée)
  const seatZ = currentSeatZ ?? SEAT_EYE.z;
  const seatXRef = useRef(currentSeatX);
  const seatYRef = useRef(eyeY);
  const seatZRef = useRef(seatZ);
  const eyeYRef = useRef(eyeY);
  useEffect(() => {
    eyeYRef.current = eyeY;
  }, [eyeY]);
  const activeEyePos = useMemo(() => {
    return new THREE.Vector3(currentSeatX, eyeY, seatZ);
  }, [seatZ, currentSeatX, eyeY]);
  const activeTvTarget = useMemo(() => new THREE.Vector3(0, TV_POSITION.y, tvTargetZ), [tvTargetZ]);

  const aspect = size.width / Math.max(1, size.height) || 1;
  // Quand le bus devient immense (ex. 20 000 passagers), on cadre toujours l'avant du bus
  // et le début du convoi au lieu de reculer à plusieurs kilomètres au milieu du vide.
  const framedLength = Math.min(cabinLength, 42);
  const framedCenterZ = cabinLength > 42 ? BUS_FRONT_Z + framedLength / 2 : cabinCenterZ;
  const overview = useMemo(() => {
    const target = new THREE.Vector3(0, 1.9, framedCenterZ);
    const camParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("cam") : null;
    const offset = camParam === "side"
      ? new THREE.Vector3(11, 1.9, 0)
      : camParam === "front"
        ? new THREE.Vector3(0, 1.7, -12)
        : DEFAULT_EXTERIOR_OFFSET;
    const pos = offset.clone().setLength(getOverviewDistance(framedLength, aspect, offset)).add(target);
    const orientation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pos, target, CAMERA_UP));
    return { pos, target, orientation };
  }, [aspect, framedCenterZ, framedLength]);

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
  const { pivot, cancelExplorationInput, stepKeyboardExploration } = useBusExploration(camera, cabinCenterZ + cabinLength / 2,
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
    const halfLength = framedLength / 2;
    const offsetLength = DEFAULT_EXTERIOR_OFFSET.length();
    // Le bout le plus proche reste dans le cadre même avec une longue caisse en portrait.
    const nearEnd = halfLength * Math.abs(DEFAULT_EXTERIOR_OFFSET.z) / offsetLength;
    const halfWidth = halfLength * DEFAULT_EXTERIOR_OFFSET.x / Math.hypot(DEFAULT_EXTERIOR_OFFSET.x, DEFAULT_EXTERIOR_OFFSET.z) + 1.5;
    const halfHeight = 2.4 + nearEnd * DEFAULT_EXTERIOR_OFFSET.y / offsetLength;
    const halfFrustumHeight = Math.tan(THREE.MathUtils.degToRad(backdrop.fov / 2));
    const distance = nearEnd + Math.max(halfWidth / Math.max(0.1, aspect), halfHeight) / (0.84 * halfFrustumHeight);
    const target = new THREE.Vector3(0, DEFAULT_TARGET.y, framedCenterZ);
    backdrop.aspect = aspect || 1;
    backdrop.far = cameraFar;
    backdrop.position.copy(DEFAULT_EXTERIOR_OFFSET)
      .multiplyScalar(Math.max(1, distance / offsetLength)).add(target);
    backdrop.lookAt(target);
    backdrop.updateProjectionMatrix();
    backdrop.updateMatrixWorld();
  }, [cameraFar, framedLength, framedCenterZ, messagesBackdrop, size.width, size.height]);

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

  // Le cadrage d'ensemble est appliqué à l'arrivée et synchronisé sur saved.current.
  useLayoutEffect(() => {
    saved.current.pos.copy(overview.pos);
    saved.current.target.copy(overview.target);
    saved.current.orientation.copy(overview.orientation);
    if (initialFramedRef.current && (!initialStatsReady || framedWithStats.current || explored.current || phase !== "outside")) return;
    initialFramedRef.current = true;
    framedWithStats.current = initialStatsReady;
    if (phase === "outside") {
      camera.position.copy(overview.pos);
      camera.quaternion.copy(overview.orientation);
      pivot.copy(overview.target);
    }
  }, [camera, overview, pivot, initialStatsReady, phase]);

  useEffect(() => {
    if (resetViewRef.current === resetViewToken) return;
    resetViewRef.current = resetViewToken;
    explored.current = true;
    cancelExplorationInput();
    activePointersRef.current.clear();
    pinchStartDistRef.current = null;
    heldKeysRef.current.clear();
    tappedKeysRef.current.clear();
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
        rt.duration = 0.9;
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
    if (phaseChanged) {
      resetTransition.current.active = false;
    }
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
      seatYRef.current = activeEyePos.y;
      seatZRef.current = activeEyePos.z;
      a.to.copy(activeEyePos);
      const m = new THREE.Matrix4().lookAt(activeEyePos, activeTvTarget, new THREE.Vector3(0, 1, 0));
      a.toQ.setFromRotationMatrix(m);
    } else if (phase === "exiting") {
      if (phaseChanged) {
        exitFromFreeView.current = freeViewRef.current;
        a.from.copy(camera.position);
        a.fromQ.copy(camera.quaternion);
        a.active = true;
      }
      saved.current.pos.copy(overview.pos);
      saved.current.target.copy(overview.target);
      saved.current.orientation.copy(overview.orientation);
      a.to.copy(overview.pos);
      a.toQ.copy(overview.orientation);
    } else if (phaseChanged) {
      a.active = false;
    }
    if (phaseChanged && phase !== "inside") {
      activePointersRef.current.clear();
      pinchStartDistRef.current = null;
      heldKeysRef.current.clear();
      tappedKeysRef.current.clear();
      look.current.dragging = false;
    }
  }, [phase, camera, activeEyePos, activeTvTarget, overview, pivot]);

  // Chaque déplacement dans l'allée oriente le regard vers le lecteur actif.
  // Le visiteur peut ensuite tourner librement la tête avec la souris ou le doigt.
  useEffect(() => {
    if (phase !== "inside") return;
    const eyePos = new THREE.Vector3(currentSeatX, eyeYRef.current, seatZ);
    const tvTarget = new THREE.Vector3(0, TV_POSITION.y, tvTargetZ);
    const matrix = new THREE.Matrix4().lookAt(eyePos, tvTarget, CAMERA_UP);
    const rotation = new THREE.Euler().setFromRotationMatrix(matrix, "YXZ");
    const currentYaw = look.current.yaw;
    const diff = rotation.y - currentYaw;
    look.current.targetYaw = currentYaw + Math.atan2(Math.sin(diff), Math.cos(diff));
    look.current.targetPitch = rotation.x;
  }, [phase, currentSeatX, seatZ, tvTargetZ]);

  // La caméra peut quitter les yeux sans modifier la place ni le trajet du passager.
  useEffect(() => {
    if (phase !== "inside") {
      resetTransition.current.active = false;
      freeViewRef.current = false;
      return;
    }
    const next = freeView;
    if (freeViewRef.current === next) return;
    freeViewRef.current = next;
    activePointersRef.current.clear();
    pinchStartDistRef.current = null;
    look.current.dragging = false;
    const rt = resetTransition.current;
    rt.active = true;
    rt.canInterrupt = false;
    rt.t = 0;
    rt.toSeat = !next;
    rt.fromPos.copy(camera.position);
    rt.fromQ.copy(camera.quaternion);
    rt.toPos.copy(next ? overview.pos : activeEyePos);
    rt.duration = reducedMotion
      ? 0.01
      : THREE.MathUtils.clamp(rt.fromPos.distanceTo(rt.toPos) / 7, 1.8, 2.5);
    rt.toTarget.copy(next ? overview.target : activeTvTarget);
    rt.fromTarget.copy(next ? activeTvTarget : pivot);
    if (next) rt.toQ.copy(overview.orientation);
    else rt.toQ.setFromRotationMatrix(new THREE.Matrix4().lookAt(rt.toPos, rt.toTarget, CAMERA_UP));
    targetFovRef.current = 55;
  }, [freeView, phase, camera, activeEyePos, activeTvTarget, overview, pivot, reducedMotion]);

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
      } else {
        l.dragging = false;
        pinchStartDistRef.current = null;
      }
      try {
        el.setPointerCapture?.(e.pointerId);
      } catch {}
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
      const prevSize = pointers.size;
      pointers.delete(e.pointerId);
      try {
        if (el.hasPointerCapture?.(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch {}
      if (pointers.size < 2) {
        pinchStartDistRef.current = null;
      } else if (prevSize >= 3 && pointers.size === 2) {
        const pts = Array.from(pointers.values());
        pinchStartDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        pinchStartFovRef.current = targetFovRef.current;
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
      heldKeysRef.current.clear();
      tappedKeysRef.current.clear();
    };

    // Les gestes de zoom du navigateur et la molette dans les modales gardent la priorité.
    const wheel = (e: WheelEvent) => {
      if (phaseRef.current !== "inside" || freeViewRef.current || resetTransition.current.active) return;
      const blockedByOverlay = e.target instanceof Element
        && Boolean(e.target.closest("[role='dialog'], [data-modal], .overflow-y-auto"));
      if (!e.deltaY || isBrowserZoomWheel(e) || get().camera !== camera || blockedByOverlay) return;
      e.preventDefault();
      const ratio = wheelZoomRatio(e.deltaY, e.deltaMode, el.clientHeight);
      const halfFov = THREE.MathUtils.degToRad(targetFovRef.current / 2);
      const angle = Math.atan(Math.tan(halfFov) * ratio);
      targetFovRef.current = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(angle) * 2, 14, 75);
    };

    const keyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (shouldIgnoreBusShortcut(e, document.activeElement,
        Boolean(document.querySelector("[role='dialog']")), letterShortcutsEnabled)) return;
      const k = normalizeCameraKey(e.key);
      const interiorMode = phaseRef.current === "inside" && !freeViewRef.current;
      const exteriorMode = phaseRef.current === "outside" || (phaseRef.current === "inside" && freeViewRef.current);
      const allowed = interiorMode
        ? INTERIOR_CAMERA_KEYS.has(k)
        : exteriorMode
          ? EXTERIOR_CAMERA_KEYS.has(k)
          : false;
      if (!allowed) return;
      heldKeysRef.current.add(k);
      tappedKeysRef.current.add(k);
      e.preventDefault();
    };

    const keyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(normalizeCameraKey(e.key));
    };

    const target = gl.domElement.parentElement ?? el;
    target.addEventListener("pointerdown", down);
    target.addEventListener("lostpointercapture", up);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", cancelGesture);
    target.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    return () => {
      target.removeEventListener("pointerdown", down);
      target.removeEventListener("lostpointercapture", up);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", cancelGesture);
      cancelGesture();
      target.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, [gl, get, camera, inputsPaused, letterShortcutsEnabled]);

  useFrame((_, dt) => {
    const a = anim.current;
    const p = phaseRef.current;
    const cam = cameraRef.current;

    if (!inputsPaused && (heldKeysRef.current.size > 0 || tappedKeysRef.current.size > 0)) {
      const keyDt = Math.min(Math.max(dt, 1 / 60), 0.1);
      const isActiveKey = (k: string) => heldKeysRef.current.has(k) || tappedKeysRef.current.has(k);
      if (p === "inside" && !freeViewRef.current && !resetTransition.current.active) {
        const l = look.current;
        const rotSpeed = 1.6;
        const fovSpeed = 40;
        if (isActiveKey("arrowleft") || isActiveKey("q") || isActiveKey("a")) l.targetYaw += rotSpeed * keyDt;
        if (isActiveKey("arrowright") || isActiveKey("d")) l.targetYaw -= rotSpeed * keyDt;
        if (isActiveKey("arrowup") || isActiveKey("z") || isActiveKey("w")) {
          l.targetPitch = Math.min(0.9, l.targetPitch + rotSpeed * 0.8 * keyDt);
        }
        if (isActiveKey("arrowdown") || isActiveKey("s")) {
          l.targetPitch = Math.max(-0.9, l.targetPitch - rotSpeed * 0.8 * keyDt);
        }
        if (isActiveKey("+")) targetFovRef.current = Math.max(14, targetFovRef.current - fovSpeed * keyDt);
        if (isActiveKey("-")) targetFovRef.current = Math.min(75, targetFovRef.current + fovSpeed * keyDt);
      } else if ((p === "outside" || (p === "inside" && freeViewRef.current))
        && (!resetTransition.current.active || resetTransition.current.canInterrupt)) {
        let azimuth = 0;
        let elevation = 0;
        let zoomGesture = 0;
        const orbitSpeed = 1.0;
        const dollySpeed = 1.2;
        if (isActiveKey("arrowleft")) azimuth += orbitSpeed * keyDt;
        if (isActiveKey("arrowright")) azimuth -= orbitSpeed * keyDt;
        if (isActiveKey("arrowup")) elevation += orbitSpeed * 0.75 * keyDt;
        if (isActiveKey("arrowdown")) elevation -= orbitSpeed * 0.75 * keyDt;
        if (isActiveKey("+")) zoomGesture -= dollySpeed * keyDt;
        if (isActiveKey("-")) zoomGesture += dollySpeed * keyDt;
        if (azimuth !== 0 || elevation !== 0 || zoomGesture !== 0) {
          stepKeyboardExploration(azimuth, elevation, zoomGesture);
        }
      }
      tappedKeysRef.current.clear();
    }

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
          // Plan fixe reculé face à la porte (même distance qu'à la sortie) pendant que le passager entre et monte.
          cinematic.target.set(1.85, 1.35, trip.doorZ - 0.35);
          cinematic.pos.set(1.85 + 9.2 * setback, 3.6, trip.doorZ - 4.8 * setback);
          const approach = ease(trip.elapsed / 1.8);
          cam.position.lerpVectors(a.from, cinematic.pos, approach);
          cinematic.matrix.lookAt(cinematic.pos, cinematic.target, CAMERA_UP);
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
        // Plan fixe plus reculé dehors : la caméra reste immobile pendant toute la sortie du passager.
        cinematic.target.set(1.85, 1.35, trip.doorZ - 0.35);
        cinematic.pos.set(1.85 + 9.2 * setback, 3.6, trip.doorZ - 4.8 * setback);
        const outward = exitFromFreeView.current ? ease(trip.elapsed / 2.2) : 1 - trip.cameraBlend;
        cinematic.matrix.lookAt(cinematic.pos, cinematic.target, CAMERA_UP);
        cinematic.quaternion.setFromRotationMatrix(cinematic.matrix);
        if (outward < 1) {
          cam.position.lerpVectors(a.from, cinematic.pos, outward);
          cam.quaternion.slerpQuaternions(a.fromQ, cinematic.quaternion, outward);
        } else {
          const departStart = trip.timing.exitWalkEnd + 0.7;
          const departSpan = Math.max(0.5, trip.timing.exitDuration - departStart);
          const departure = ease((trip.elapsed - departStart) / departSpan);
          cam.position.lerpVectors(cinematic.pos, a.to, departure);
          cam.quaternion.slerpQuaternions(cinematic.quaternion, a.toQ, departure);
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
      if (rt.t >= 0.65 && p === "inside" && freeViewRef.current) {
        rt.canInterrupt = true;
      }
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
          seatYRef.current = activeEyePos.y;
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

      // Glissement fluide de siège latéral, vertical et le long de l'allée
      const seatBlend = reducedMotion ? 1 : Math.min(1, dt * 5.5);
      seatXRef.current += (currentSeatX - seatXRef.current) * seatBlend;
      seatYRef.current += (eyeY - seatYRef.current) * seatBlend;
      seatZRef.current += (seatZ - seatZRef.current) * seatBlend;

      cam.position.set(
        seatXRef.current,
        seatYRef.current,
        seatZRef.current,
      );
    }
  }, -0.5);

  return null;
}
