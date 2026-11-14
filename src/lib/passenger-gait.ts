import { getPassengerSkeleton } from "./passenger-proportions";

export const THIGH_LENGTH = 0.28;
export const SHIN_LENGTH = 0.48;
export const STANDING_HIP_HEIGHT = 0.8;
export const SEATED_HIP_HEIGHT = 0.55;
export const SEATED_HIP_Z = 0.12;
export const TORSO_ABOVE_HIP = 0.235;
export const NECK_ABOVE_HIP = 0.46;
export const BODY_BEHIND_HIP = 0.02;
export const CABIN_FLOOR_Y = 0.63;

/** Deux articulations visent la cheville, y compris pendant le passage au siège. */
export function getWalkingLegPose(cycle: number, hipHeight: number, strength: number, sitting = 0, id = "") {
  const rig = getPassengerSkeleton(id);
  const thigh = rig.thighLength, shin = rig.shinLength;
  const sit = Math.max(0, Math.min(1, sitting));
  const z = Math.cos(cycle) * rig.stride * strength * (1 - sit) - thigh * sit;
  // Small passengers keep their short legs dangling: do not stretch their feet to the floor.
  const seatedAnkleY = id === "chopper" ? hipHeight - shin : .07;
  const ankleY = rig.ankleHeight * (1 - sit) + seatedAnkleY * sit + Math.max(0, Math.sin(cycle)) * rig.stepHeight * strength * (1 - sit);
  const y = ankleY - hipHeight;
  const distance = Math.max(Math.abs(thigh - shin) + .001, Math.min(thigh + shin - .001, Math.hypot(y, z)));
  const hip = Math.acos(Math.max(-1, Math.min(1,
    (thigh ** 2 + distance ** 2 - shin ** 2) / (2 * thigh * distance))));
  const knee = Math.PI - Math.acos(Math.max(-1, Math.min(1,
    (thigh ** 2 + shin ** 2 - distance ** 2) / (2 * thigh * shin))));
  const upper = Math.atan2(-z, -y) + hip;
  return { upper, lower: -knee, ankle: knee - upper };
}
