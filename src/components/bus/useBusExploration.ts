"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MathUtils, Vector2, type Object3D, type PerspectiveCamera } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { createBusExploration, wheelZoomRatio } from "@/lib/bus-camera";
import { isBrowserZoomWheel } from "@/lib/bus-shortcuts";

const ROTATE_PER_VIEWPORT = Math.PI * 1.5;
const WHEEL_GAP_MS = 180;
const CURSOR_REFOCUS_PX = 14;

type Gesture = { x: number; y: number; startX: number; startY: number; pan: boolean };

export function isBusViewportInput(event: Event) {
  return !(event.target instanceof Element && event.target.closest(
    '#tv-frame, [data-bus-tv-overlay], [data-tv-pointer-hit="true"], [role="dialog"], [data-modal], .overflow-y-auto',
  ));
}

export function useBusExploration(camera: PerspectiveCamera, rearZ: number, maxDistance: number,
  reducedMotion: boolean, paused: boolean, canExplore: (start: boolean) => boolean) {
  const { gl, get, setEvents } = useThree();
  const [navigation] = useState(createBusExploration);
  const eventsSuspendedRef = useRef(false);
  const setRaycastingPaused = useCallback((nextPaused: boolean) => {
    if (eventsSuspendedRef.current === nextPaused) return;
    eventsSuspendedRef.current = nextPaused;
    setEvents({ enabled: !nextPaused });
  }, [setEvents]);
  const input = useRef({
    pointers: new Map<number, Gesture>(), cursor: new Vector2(), screen: new Vector2(),
    lastWheel: -Infinity, wheel: 0, pinch: 0, focus: false,
    rotateX: 0, rotateY: 0, panX: 0, panY: 0,
  });

  const clearMovement = useCallback(() => {
    const state = input.current;
    state.lastWheel = -Infinity;
    state.wheel = state.pinch = state.rotateX = state.rotateY = state.panX = state.panY = 0;
    state.focus = false;
  }, []);
  const cancel = useCallback(() => {
    input.current.pointers.clear();
    clearMovement();
    setRaycastingPaused(false);
  }, [clearMovement, setRaycastingPaused]);

  useEffect(() => {
    const surface = gl.domElement.parentElement ?? gl.domElement;
    if (paused) return;
    const state = input.current;
    const pointers = state.pointers;

    const canStart = (event: Event) => surface.clientHeight > 0 && get().camera === camera && isBusViewportInput(event) && canExplore(true);
    const cursorAt = (x: number, y: number) => {
      const rect = surface.getBoundingClientRect();
      state.cursor.set(
        MathUtils.clamp(2 * ((x - rect.left) / rect.width) - 1, -1, 1),
        MathUtils.clamp(1 - 2 * ((y - rect.top) / rect.height), -1, 1),
      );
    };
    const down = (event: PointerEvent) => {
      if ((event.pointerType === "mouse" && event.button !== 0 && event.button !== 2) || pointers.size >= 2 || !canStart(event)) return;
      clearMovement();
      pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        pan: event.button === 2 || event.shiftKey || event.ctrlKey || event.metaKey,
      });
      if (pointers.size === 2) {
        state.focus = true;
        setRaycastingPaused(true);
      }
      try { surface.setPointerCapture(event.pointerId); } catch {}
    };
    const move = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous || !canExplore(false)) return;
      if (event.pointerType === "mouse" && event.buttons === 0) {
        pointers.delete(event.pointerId);
        if (pointers.size === 0) setRaycastingPaused(false);
        return;
      }
      // Suspendre le raycasting R3F dès qu'un vrai glisser-déplacer de caméra démarre (> 5 px),
      // sans jamais gêner un clic normal sur un passager.
      if (!eventsSuspendedRef.current && Math.hypot(event.clientX - previous.startX, event.clientY - previous.startY) > 5) {
        setRaycastingPaused(true);
      }
      pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        startX: previous.startX,
        startY: previous.startY,
        pan: previous.pan,
      });
      const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
      const height = Math.max(1, surface.clientHeight);
      if (pointers.size === 2) {
        const other = [...pointers].find(([id]) => id !== event.pointerId)![1];
        const oldDistance = Math.hypot(previous.x - other.x, previous.y - other.y);
        const newDistance = Math.hypot(event.clientX - other.x, event.clientY - other.y);
        state.panX -= dx / (2 * height);
        state.panY += dy / (2 * height);
        if (oldDistance > 0 && newDistance > 0) state.pinch += Math.log(oldDistance / newDistance);
        cursorAt((event.clientX + other.x) / 2, (event.clientY + other.y) / 2);
      } else if (previous.pan) {
        state.panX -= dx / height;
        state.panY += dy / height;
      } else {
        state.rotateX -= dx * ROTATE_PER_VIEWPORT / height;
        state.rotateY -= dy * ROTATE_PER_VIEWPORT / height;
      }
    };
    const up = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size === 0) setRaycastingPaused(false);
      try { surface.releasePointerCapture(event.pointerId); } catch {}
    };
    const wheel = (event: WheelEvent) => {
      if (!event.deltaY || isBrowserZoomWheel(event) || !canStart(event)) return;
      event.preventDefault();
      const now = performance.now();
      const ratio = Math.log(wheelZoomRatio(event.deltaY, event.deltaMode, surface.clientHeight));
      const cursorMoved = Math.hypot(state.screen.x - event.clientX, state.screen.y - event.clientY) > CURSOR_REFOCUS_PX;
      if (cursorMoved || now - state.lastWheel > WHEEL_GAP_MS) {
        state.screen.set(event.clientX, event.clientY);
        state.wheel = 0;
        state.focus = ratio < 0;
      }
      if (state.wheel * ratio < 0) state.wheel = 0;
      state.lastWheel = now;
      state.wheel += ratio;
      cursorAt(event.clientX, event.clientY);
    };
    const context = (event: MouseEvent) => {
      if (get().camera === camera && canExplore(false) && isBusViewportInput(event)) event.preventDefault();
    };

    surface.addEventListener("pointerdown", down);
    surface.addEventListener("lostpointercapture", up);
    surface.addEventListener("wheel", wheel, { passive: false });
    surface.addEventListener("contextmenu", context);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", cancel);
    return () => {
      surface.removeEventListener("pointerdown", down);
      surface.removeEventListener("lostpointercapture", up);
      surface.removeEventListener("wheel", wheel);
      surface.removeEventListener("contextmenu", context);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", cancel);
      cancel();
    };
  }, [camera, canExplore, cancel, clearMovement, gl, get, paused, setRaycastingPaused]);

  const keyboardCursorRef = useRef(new Vector2(0, 0));
  const stepKeyboardExploration = useCallback((azimuth: number, elevation: number, zoomGesture: number) => {
    if (paused || get().camera !== camera || !canExplore(true)) return;
    if (azimuth !== 0 || elevation !== 0) {
      navigation.rotate(camera, azimuth, elevation, rearZ, maxDistance);
    }
    if (zoomGesture !== 0) {
      navigation.zoom(camera, keyboardCursorRef.current, zoomGesture, rearZ, maxDistance);
    }
  }, [camera, canExplore, get, maxDistance, navigation, paused, rearZ]);

  const vehicle = useRef<Object3D>(undefined);
  useFrame(({ camera: view, scene }, dt) => {
    const state = input.current;
    if (paused || view !== camera || !canExplore(false)) {
      cancel();
      return;
    }
    if (state.panX || state.panY) {
      navigation.pan(camera, state.panX, state.panY, rearZ, maxDistance);
      state.panX = state.panY = 0;
    }
    if (state.rotateX || state.rotateY) {
      navigation.rotate(camera, state.rotateX, state.rotateY, rearZ, maxDistance);
      state.rotateX = state.rotateY = 0;
    }
    const wheel = reducedMotion || Math.abs(state.wheel) < 0.001
      ? state.wheel : state.wheel * -Math.expm1(-28 * dt);
    const zoom = wheel + state.pinch;
    if (zoom) {
      if (state.focus) {
        vehicle.current ??= scene.getObjectByName("bus-vehicle");
        navigation.focus(camera, state.cursor, rearZ, vehicle.current);
        state.focus = false;
      }
      navigation.zoom(camera, state.cursor, zoom, rearZ, maxDistance);
    }
    state.wheel -= wheel;
    state.pinch = 0;
  }, -0.75);

  return { pivot: navigation.pivot, cancelExplorationInput: cancel, stepKeyboardExploration };
}
