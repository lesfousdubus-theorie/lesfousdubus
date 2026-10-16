import { CREW_SEATS } from "./bus-layout";
import type { PassengerPose } from "./passenger-motion";

export const DRIVER_UPPER_ARM = .20;
export const DRIVER_FOREARM = .22;
export const DRIVER_SHOULDER_Y = 1.62;
export const DRIVER_SHOULDER_Z = .115;
export const DRIVER_SHOULDER_X = .19;
// Le conducteur recule avec son fauteuil ; le navigateur garde le vestibule libre.
export const DRIVER_SEAT_POSITIONS = {
  kamal: [CREW_SEATS.kamal[0], CREW_SEATS.kamal[1], CREW_SEATS.kamal[2] + .22],
  kyta: CREW_SEATS.kyta,
} satisfies Record<"kamal" | "kyta", [number, number, number]>;
export const STEERING_WHEEL = { radius: .23, tilt: -.65, y: 1.62, z: -4.07 } as const;
export const DRIVER_HAND_SIZE: [number, number, number] = [.10, .08, .105];
// La main tournée à plat pose sa demi-épaisseur au-dessus du cylindre jaune.
export const NAVIGATOR_BAR = { radius: .018, width: .60, y: 1.68, z: -4.27, handOffset: .20,
  handY: 1.68 + .018 + DRIVER_HAND_SIZE[2] / 2 + .001 } as const;
export const DRIVER_DASHBOARD = {
  deck: { position: [0, 1.56, -4.47], size: [2.44, .08, .26] },
  fascia: { position: [0, 1.38, -4.34], size: [2.44, .34, .06] },
  footwell: { position: [0, 1.0, -4.55], size: [2.44, .74, .06] },
} satisfies Record<string, { position: [number, number, number]; size: [number, number, number] }>;

export const DRIVER_ARM_FIELDS = ["leftX", "leftZ", "rightX", "rightZ", "leftElbowX", "leftElbowZ", "rightElbowX", "rightElbowZ"] as const;

export function getDriverReactionGain(party: boolean, hornElapsed: number, reducedMotion: boolean) {
  if (party) return 1;
  if (reducedMotion || hornElapsed < 0 || hornElapsed >= 1.8) return 0;
  const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  return smooth(hornElapsed / .12) * smooth((1.8 - hornElapsed) / .4);
}

/** La réaction revient au volant, pas à la position bras baissés d'un passager. */
export function normalizeDriverHornArms(pose: PassengerPose, gain: number) {
  if (gain < 1e-6) return;
  for (const key of DRIVER_ARM_FIELDS) {
    const baseline = key === "leftX" || key === "rightX" ? .12 : key === "leftElbowX" || key === "rightElbowX" ? 1.05 : key === "leftZ" ? -.08 : key === "rightZ" ? .08 : 0;
    pose[key] = baseline + (pose[key] - baseline) / gain;
  }
}

type ArmTarget = { x: number; y: number; z: number };
type ArmSolution = { shoulderX: number; shoulderYaw: number; elbowX: number };

/** Trajet de main continu : un passage vers le pare-brise se fait au-dessus du plateau. */
export function prepareDriverArmTarget(target: ArmTarget, rest: readonly number[], gain: number, driver: "kamal" | "kyta") {
  target.x = rest[0] + (target.x - rest[0]) * gain;
  target.y = rest[1] + (target.y - rest[1]) * gain;
  target.z = rest[2] + (target.z - rest[2]) * gain;
  const shoulderZ = DRIVER_SEAT_POSITIONS[driver][2] - .05 + DRIVER_SHOULDER_Z;
  const deckRear = DRIVER_DASHBOARD.deck.position[2] + DRIVER_DASHBOARD.deck.size[2] / 2;
  const proximity = Math.max(0, Math.min(1, (deckRear - shoulderZ + .075 - target.z) / .06));
  const clearance = -.23 + .38 * proximity * proximity * (3 - 2 * proximity);
  target.y = Math.max(target.y, clearance);
  const distance = Math.hypot(target.x, target.y, target.z);
  const reach = DRIVER_UPPER_ARM + DRIVER_FOREARM - .0001;
  if (distance > reach) {
    const scale = reach / distance;
    target.x *= scale; target.y *= scale; target.z *= scale;
  }
}

export function solveDriverArmTarget(target: ArmTarget, solution: ArmSolution) {
  const horizontal = Math.hypot(target.x, target.z), distance = Math.hypot(target.y, horizontal);
  const cosine = (value: number) => Math.max(-1, Math.min(1, value));
  solution.shoulderX = Math.atan2(horizontal, -target.y) - Math.acos(cosine(
    (DRIVER_UPPER_ARM ** 2 + distance ** 2 - DRIVER_FOREARM ** 2) / (2 * DRIVER_UPPER_ARM * distance)));
  solution.shoulderYaw = Math.atan2(-target.x, -target.z);
  solution.elbowX = Math.PI - Math.acos(cosine(
    (DRIVER_UPPER_ARM ** 2 + DRIVER_FOREARM ** 2 - distance ** 2) / (2 * DRIVER_UPPER_ARM * DRIVER_FOREARM)));
}

/** Deux os de longueur fixe relient l'épaule au point réellement tenu. */
export function getDriverArmRest(driver: "kamal" | "kyta", side: -1 | 1) {
  const rootZ = DRIVER_SEAT_POSITIONS[driver][2] - .05;
  const gripY = STEERING_WHEEL.radius * Math.cos(Math.PI / 3);
  const target: [number, number, number] = driver === "kamal"
    ? [side * (STEERING_WHEEL.radius * Math.sin(Math.PI / 3) - DRIVER_SHOULDER_X),
      STEERING_WHEEL.y + gripY * Math.cos(STEERING_WHEEL.tilt) - DRIVER_SHOULDER_Y,
      STEERING_WHEEL.z + gripY * Math.sin(STEERING_WHEEL.tilt) - rootZ - DRIVER_SHOULDER_Z]
    : [side * (NAVIGATOR_BAR.handOffset - DRIVER_SHOULDER_X), NAVIGATOR_BAR.handY - DRIVER_SHOULDER_Y,
      NAVIGATOR_BAR.z - rootZ - DRIVER_SHOULDER_Z];
  const horizontal = Math.hypot(target[0], target[2]);
  const distance = Math.hypot(target[1], horizontal);
  const cosine = (value: number) => Math.max(-1, Math.min(1, value));
  const shoulderX = Math.atan2(horizontal, -target[1]) - Math.acos(cosine(
    (DRIVER_UPPER_ARM ** 2 + distance ** 2 - DRIVER_FOREARM ** 2) / (2 * DRIVER_UPPER_ARM * distance)));
  const elbowX = Math.PI - Math.acos(cosine(
    (DRIVER_UPPER_ARM ** 2 + DRIVER_FOREARM ** 2 - distance ** 2) / (2 * DRIVER_UPPER_ARM * DRIVER_FOREARM)));
  return { target, shoulderX, shoulderYaw: Math.atan2(-target[0], -target[2]), elbowX,
    wristX: (driver === "kamal" ? STEERING_WHEEL.tilt : Math.PI / 2) - shoulderX - elbowX };
}
