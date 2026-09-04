import * as THREE from "three";

export type Phase = "outside" | "entering" | "inside" | "exiting";

/** Position des yeux quand on est assis dans le bus (siège côté droit, 4e rangée). */
export const SEAT_EYE = new THREE.Vector3(0.72, 2.02, 1.15);
/** Point regardé à l'arrivée dans le bus : la TV. */
export const TV_POSITION = new THREE.Vector3(0, 2.55, -4.2);

export const DEFAULT_CAMERA_POS = new THREE.Vector3(-7.5, 3.2, -10.5);
export const DEFAULT_TARGET = new THREE.Vector3(0, 1.9, -2.5);

export const WORLD_SPEED = 16; // unités / seconde
export const DAY_LENGTH = 100; // secondes pour un cycle complet jour → nuit → jour

export const YOUTUBE_ID = "SgJ25zjMJyo";

/** État mutable partagé entre la scène 3D et l'interface (évite les re-rendus). */
export interface WorldState {
  daylight: number; // 0 nuit → 1 plein jour
  timeOfDay: number; // 0..1
  zone: number;
  scroll: number;
}
