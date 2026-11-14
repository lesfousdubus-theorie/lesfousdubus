import * as THREE from "three";
import { BUS_DOOR, type BusDoorLayout } from "./bus-layout";
import type { Phase } from "../components/bus/constants";

export const ARRIVAL_STOP_TIME = 2.8;
export const ENTRY_WALK_START = 3.6;
export const ENTRY_SEATED_TIME = 8;
export const ENTRY_SIT_START = ENTRY_SEATED_TIME - 0.45;
export const ENTRY_CAMERA_TIME = ENTRY_SEATED_TIME;
export const ENTRY_DURATION = 10.2;
export const EXIT_WALK_START = 5.8;
export const EXIT_WALK_END = 10.2;
export const EXIT_DURATION = 12.6;
export const JOURNEY_MAX_DT = 0.25;
export const PASSENGER_WALK_SPEED = 1.35;
export const SEAT_APPROACH_DISTANCE = 0.55;
const WALK_EASE_EDGE = 0.08;
const getSeatTurnRadius = (seatX: number) => Math.min(0.26, Math.abs(seatX) / 2);

export interface JourneyTiming {
  walkDistance: number;
  entrySitStart: number;
  entrySeatedTime: number;
  entryCameraTime: number;
  entryDuration: number;
  exitWalkEnd: number;
  exitDuration: number;
}

type JourneyDoor = Pick<BusDoorLayout, "index" | "z">;
const FRONT_DOOR: JourneyDoor = { index: 0, z: BUS_DOOR.z };

export const ease = (t: number) => {
  const v = THREE.MathUtils.clamp(t, 0, 1);
  return v * v * (3 - 2 * v);
};
const ramp = (time: number, start: number, end: number) => ease((time - start) / (end - start));

export interface JourneyState {
  phase: Phase;
  elapsed: number;
  doorOpen: boolean;
  drive: number;
  sitting: number;
  walking: boolean;
  avatarVisible: boolean;
  position: THREE.Vector3;
  heading: number;
  cameraBlend: number;
  completed: boolean;
  doorIndex: number;
  doorZ: number;
  seatZ: number;
  seatX: number;
  timing: JourneyTiming;
  waitingForSeat: boolean;
  entryFromSeat: boolean;
}

export function createJourneyState(): JourneyState {
  return { phase:"outside", elapsed:0, doorOpen:false, drive:1, sitting:0,
    walking:false, avatarVisible:false, position:new THREE.Vector3(), heading:0,
    cameraBlend:0, completed:false, doorIndex:0, doorZ:BUS_DOOR.z, seatZ:BUS_DOOR.z,seatX:0.72,
    timing:getJourneyTiming(BUS_DOOR.z), waitingForSeat:false, entryFromSeat:false };
}

/** Pieds du personnage : trottoir, trois marches, allée, puis siège. */
export function getPassengerWalkPath(seatZ: number, door: JourneyDoor = FRONT_DOOR, seatX = 0.72): THREE.Vector3[] {
  const side = Math.sign(seatX) || 1;
  const radius = getSeatTurnRadius(seatX);
  const cornerX = seatX - side * radius;
  const cornerZ = seatZ - SEAT_APPROACH_DISTANCE + radius;
  // Le corps pivote progressivement dans le passage libre : un angle droit
  // faisait encore balayer la jambe contre le dossier de la rangée précédente.
  const seatTurn = Array.from({ length: 7 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 12;
    return new THREE.Vector3(cornerX + side * radius * Math.cos(angle), 0.64,
      cornerZ + radius * Math.sin(angle));
  });
  return [new THREE.Vector3(3.3,0,door.z), new THREE.Vector3(1.65,0,door.z),
    new THREE.Vector3(1.5,0.29,door.z), new THREE.Vector3(1.24,0.29,door.z),
    new THREE.Vector3(1.18,0.46,door.z), new THREE.Vector3(0.92,0.46,door.z),
    new THREE.Vector3(0.80,0.63,door.z), new THREE.Vector3(0.6,0.63,door.z), new THREE.Vector3(0,0.64,door.z),
    // L'espace devant la banquette permet de rejoindre chaque colonne réelle
    // en laissant les jambes et le torse du voisin assis dégagés.
    new THREE.Vector3(0,0.64,seatZ-SEAT_APPROACH_DISTANCE),
    ...seatTurn,
    new THREE.Vector3(seatX,0.64,seatZ)];
}

const distances = new WeakMap<THREE.Vector3[], number[]>();
const paths = new WeakMap<JourneyState, THREE.Vector3[]>();

function getWalkDistances(path: THREE.Vector3[]): number[] {
  let lengths = distances.get(path);
  if (!lengths) {
    lengths = [0];
    for (let i = 1; i < path.length; i++) lengths.push(lengths[i - 1] + path[i].distanceTo(path[i - 1]));
    distances.set(path, lengths);
  }
  return lengths;
}

/** Le rythme des marches reste identique, quelle que soit la longueur du bus. */
export function getJourneyTiming(seatZ: number, door: JourneyDoor = FRONT_DOOR, seatX = 0.72, entryFromSeat = false): JourneyTiming {
  const lengths = getWalkDistances(getPassengerWalkPath(seatZ, door, seatX));
  const walkDistance = lengths[lengths.length - 1];
  // La rampe douce consomme 8 % du temps : tenir compte de cette fraction
  // pour que la vitesse de croisière reste plafonnée, pas seulement la moyenne.
  const walkDuration = walkDistance / (PASSENGER_WALK_SPEED * (1 - WALK_EASE_EDGE));
  const entrySitStart = entryFromSeat ? 0 : ENTRY_WALK_START + Math.max(ENTRY_SIT_START - ENTRY_WALK_START, walkDuration);
  const entrySeatedTime = entryFromSeat ? 0 : entrySitStart + (ENTRY_SEATED_TIME - ENTRY_SIT_START);
  const entryCameraTime = entryFromSeat ? ARRIVAL_STOP_TIME : entrySeatedTime;
  const exitWalkEnd = EXIT_WALK_START + Math.max(EXIT_WALK_END - EXIT_WALK_START, walkDuration);
  return {
    walkDistance, entrySitStart, entrySeatedTime, entryCameraTime,
    entryDuration: entryCameraTime + (ENTRY_DURATION - ENTRY_CAMERA_TIME),
    exitWalkEnd, exitDuration: exitWalkEnd + (EXIT_DURATION - EXIT_WALK_END),
  };
}

/** Verrouille la porte et le siège jusqu'à la fin de cette animation. */
export function beginJourney(state: JourneyState, phase: Phase, seatZ: number, door: JourneyDoor = FRONT_DOOR, seatX = 0.72, entryFromSeat = false) {
  state.phase = phase;
  state.elapsed = 0;
  state.doorIndex = door.index;
  state.doorZ = door.z;
  state.seatZ = seatZ;
  state.seatX = seatX;
  state.entryFromSeat = phase === "entering" && entryFromSeat;
  state.timing = getJourneyTiming(seatZ, door, seatX, state.entryFromSeat);
  state.waitingForSeat = false;
  paths.set(state, getPassengerWalkPath(seatZ, door, seatX));
}
// Une seule accélération au départ et un seul ralentissement à l'arrivée.
// Les paliers et les marches ne provoquent plus de redémarrages successifs.
function walkProgress(progress: number): number {
  const t = THREE.MathUtils.clamp(progress, 0, 1);
  const edge = WALK_EASE_EDGE;
  if (t < edge) return t * t / (2 * edge * (1 - edge));
  if (t > 1 - edge) return 1 - (1 - t) ** 2 / (2 * edge * (1 - edge));
  return (t - edge / 2) / (1 - edge);
}

export function samplePassengerWalk(path: THREE.Vector3[], progress: number, target: THREE.Vector3): number {
  const lengths = getWalkDistances(path);
  const distance = THREE.MathUtils.clamp(progress, 0, 1) * lengths[lengths.length - 1];
  let index=0;
  while(index < path.length-2 && distance > lengths[index+1]) index++;
  const span = lengths[index + 1] - lengths[index];
  const local = span > 0 ? (distance - lengths[index]) / span : 0;
  target.lerpVectors(path[index],path[index+1],local);
  return Math.atan2(path[index].x-path[index+1].x,path[index].z-path[index+1].z);
}

export function updateJourney(state: JourneyState, phase: Phase, time: number, seatZ: number, speed: number, door: JourneyDoor = FRONT_DOOR, seatX = 0.72) {
  const cinematic = phase === "entering" || phase === "exiting";
  if (cinematic && (state.phase !== phase || time < state.elapsed || !paths.has(state))) {
    beginJourney(state, phase, seatZ, door, seatX);
  }
  state.phase=phase; state.elapsed=time;
  state.walking=false; state.completed=false; state.avatarVisible=phase!=="outside";
  state.cameraBlend=0; state.sitting=1; state.heading=0; state.doorOpen=false;
  const speedRatio=Math.min(Math.max(speed,0.1),1.2)/Math.max(speed,0.1);
  const path = paths.get(state)!;
  const timing = state.timing;
  if(phase==="entering") {
    state.drive=(1-ramp(time,0,ARRIVAL_STOP_TIME))*speedRatio;
    state.doorOpen=!state.entryFromSeat && time>=ARRIVAL_STOP_TIME;
    state.sitting=state.entryFromSeat ? 1 : ramp(time,timing.entrySitStart,timing.entrySeatedTime);
    if(state.entryFromSeat) {
      state.position.set(state.seatX,0.64,state.seatZ);
      state.sitting=1;
    } else if(time<ENTRY_WALK_START) {
      // Primitive de 1-smoothstep : même décélération que la route.
      const t=THREE.MathUtils.clamp(time/ARRIVAL_STOP_TIME,0,1);
      const remaining=0.5-(t-t*t*t+0.5*t*t*t*t);
      state.position.set(3.3,0,state.doorZ-16*Math.min(speed,1.2)*ARRIVAL_STOP_TIME*remaining);
      state.heading=Math.PI/2; state.sitting=0;
    } else {
      state.walking=time<timing.entrySitStart;
      state.heading=samplePassengerWalk(path,walkProgress((time-ENTRY_WALK_START)/(timing.entrySitStart-ENTRY_WALK_START)),state.position);
      if (state.position.z >= state.seatZ - SEAT_APPROACH_DISTANCE - 1e-9
          && Math.abs(state.position.x) >= Math.abs(state.seatX) - getSeatTurnRadius(state.seatX) - 1e-9) {
        // Le dernier pas se fait en arrière, face à la télé. Le demi-tour a
        // lieu dans le passage dégagé plutôt qu'entre les passagers assis.
        state.heading=Math.atan2(Math.sin(state.heading),Math.abs(Math.cos(state.heading)));
      }
      if(time>=timing.entrySeatedTime)state.heading=0;
    }
    state.cameraBlend=ramp(time,timing.entryCameraTime,timing.entryDuration);
    state.completed=time>=timing.entryDuration;
  } else if(phase==="exiting") {
    state.drive=(1-ramp(time,0,ARRIVAL_STOP_TIME))*speedRatio;
    state.cameraBlend=1-ramp(time,3.3,5.5);
    state.doorOpen=time>=ARRIVAL_STOP_TIME && time<timing.exitWalkEnd+0.5;
    state.sitting=1-ramp(time,EXIT_WALK_START-0.6,EXIT_WALK_START);
    const progress=walkProgress((time-EXIT_WALK_START)/(timing.exitWalkEnd-EXIT_WALK_START));
    const heading=samplePassengerWalk(path,1-progress,state.position)+Math.PI;
    state.heading=Math.atan2(Math.sin(heading),Math.cos(heading));
    state.walking=time>=EXIT_WALK_START && time<timing.exitWalkEnd;
    if(time>=timing.exitWalkEnd) {
      state.position.set(3.3,0,state.doorZ); state.heading=Math.PI/2;
      state.drive=ramp(time,timing.exitWalkEnd+0.7,timing.exitDuration);
      state.position.z+=16*Math.min(speed,1.2)*Math.max(0,time-timing.exitWalkEnd-0.7)*state.drive*0.5;
    }
    state.completed=time>=timing.exitDuration;
  } else {
    state.drive=1; state.position.set(seatX,0.64,seatZ);
    state.avatarVisible=phase==="inside";
  }
}
