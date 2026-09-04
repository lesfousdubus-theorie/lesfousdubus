"use client";

import { useEffect, useMemo, useRef } from "react";
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
  currentSeatZ?: number;
}

const TRANSITION_TIME = 1.8;

export default function CameraRig({
  phase,
  onArrived,
  cabinLength = 9.2,
  cabinCenterZ = 0,
  currentSeatZ,
}: Props) {
  const { camera, gl } = useThree();
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
  const phaseRef = useRef<Phase>(phase);
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

  // Cible de rotation OrbitControls ajustée selon la longueur du bus
  const orbitTargetZ = useMemo(() => {
    return Math.max(-2.5, cabinCenterZ - 1.2);
  }, [cabinCenterZ]);

  const maxOrbitDistance = useMemo(() => {
    return Math.max(32, cabinLength * 2.2);
  }, [cabinLength]);

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
    phaseRef.current = phase;
    const a = anim.current;
    if (phase === "entering") {
      saved.current.pos.copy(camera.position);
      if (controls.current) saved.current.target.copy(controls.current.target);
      a.from.copy(camera.position);
      a.fromQ.copy(camera.quaternion);
      a.to.copy(activeEyePos);
      const m = new THREE.Matrix4().lookAt(activeEyePos, TV_POSITION, new THREE.Vector3(0, 1, 0));
      a.toQ.setFromRotationMatrix(m);
      a.t = 0;
      a.active = true;
    } else if (phase === "exiting") {
      a.from.copy(camera.position);
      a.fromQ.copy(camera.quaternion);
      a.to.copy(saved.current.pos);
      const m = new THREE.Matrix4().lookAt(saved.current.pos, saved.current.target, new THREE.Vector3(0, 1, 0));
      a.toQ.setFromRotationMatrix(m);
      a.t = 0;
      a.active = true;
    }
  }, [phase, camera, activeEyePos]);

  // Contrôles "tourner la tête" à l'intérieur (souris / tactile / clavier)
  useEffect(() => {
    const el = gl.domElement;
    const l = look.current;
    const down = (e: PointerEvent) => {
      if (phaseRef.current !== "inside") return;
      l.dragging = true;
      l.lastX = e.clientX;
      l.lastY = e.clientY;
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!l.dragging || phaseRef.current !== "inside") return;
      const dx = e.clientX - l.lastX;
      const dy = e.clientY - l.lastY;
      l.lastX = e.clientX;
      l.lastY = e.clientY;
      l.targetYaw -= dx * 0.0045;
      l.targetPitch = THREE.MathUtils.clamp(l.targetPitch - dy * 0.0035, -0.9, 0.9);
    };
    const up = () => {
      l.dragging = false;
    };
    const key = (e: KeyboardEvent) => {
      if (phaseRef.current !== "inside") return;
      const step = 0.15;
      if (e.key === "ArrowLeft" || e.key === "q" || e.key === "a") l.targetYaw += step;
      if (e.key === "ArrowRight" || e.key === "d") l.targetYaw -= step;
      if (e.key === "ArrowUp") l.targetPitch = Math.min(0.9, l.targetPitch + step);
      if (e.key === "ArrowDown") l.targetPitch = Math.max(-0.9, l.targetPitch - step);
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", key);
    };
  }, [gl]);

  useFrame((state, dt) => {
    const a = anim.current;
    const p = phaseRef.current;
    const cam = state.camera;
    if ((p === "entering" || p === "exiting") && a.active) {
      a.t = Math.min(1, a.t + dt / TRANSITION_TIME);
      const s = a.t * a.t * (3 - 2 * a.t);
      cam.position.lerpVectors(a.from, a.to, s);
      // petite courbe : la caméra s'élève un peu au milieu du trajet
      cam.position.setY(cam.position.y + Math.sin(s * Math.PI) * 0.6);
      cam.quaternion.slerpQuaternions(a.fromQ, a.toQ, s);
      if (a.t >= 1) {
        a.active = false;
        if (p === "entering") {
          const e = new THREE.Euler().setFromQuaternion(a.toQ, "YXZ");
          look.current.yaw = look.current.targetYaw = e.y;
          look.current.pitch = look.current.targetPitch = e.x;
          arrivedRef.current("inside");
        } else {
          cam.position.copy(saved.current.pos);
          arrivedRef.current("outside");
        }
      }
      return;
    }
    if (p === "inside") {
      const l = look.current;
      l.yaw += (l.targetYaw - l.yaw) * Math.min(1, dt * 10);
      l.pitch += (l.targetPitch - l.pitch) * Math.min(1, dt * 10);
      cam.rotation.set(l.pitch, l.yaw, 0, "YXZ");

      // Glissement fluide de siège le long de l'allée
      const targetZ = currentSeatZ ?? SEAT_EYE.z;
      seatZRef.current += (targetZ - seatZRef.current) * Math.min(1, dt * 5.5);

      const t = state.clock.elapsedTime;
      cam.position.set(
        SEAT_EYE.x + Math.sin(t * 2.1) * 0.006,
        SEAT_EYE.y + Math.sin(t * 9) * 0.012 + Math.sin(t * 2.3) * 0.008,
        seatZRef.current,
      );
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={phase === "outside"}
      target={[0, 1.9, orbitTargetZ]}
      minDistance={5}
      maxDistance={maxOrbitDistance}
      maxPolarAngle={Math.PI / 2 - 0.04}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
    />
  );
}
