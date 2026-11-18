import type { PassengerPose } from "./passenger-motion";
import { getPassengerProportions, getPassengerSkeleton } from "./passenger-proportions";

type ArmRig = { shoulderX: number; shoulderY: number; upper: number; palm: number; radius: number };
const rigs = new Map<string, ArmRig>();
const nearestAngle = (angle: number, from: number) => from + Math.atan2(Math.sin(angle - from), Math.cos(angle - from));
const WINDOW_WALL_X = 1.21;

function getPropLateralReach(id: string, side: number, celebrating: boolean) {
  if (!celebrating) return 0;
  if (id === "nami" && side > 0) return .175;
  if (id === "yamato" && side > 0) return .17;
  if (id === "doflamingo") return .18;
  return 0;
}

function clampArmToHalfSpace(pose: PassengerPose, rig: ArmRig, side: number, direction: number, limit: number,
  xx: number, xy: number, xz: number) {
  const shoulderZ = side < 0 ? "leftZ" : "rightZ", shoulderX = side < 0 ? pose.leftX : pose.rightX;
  const elbowX = side < 0 ? "leftElbowX" : "rightElbowX", elbowZ = side < 0 ? "leftElbowZ" : "rightElbowZ";
  for (let attempt = 0; attempt < 2; attempt++) {
    const vx = rig.palm * Math.sin(pose[elbowZ]);
    const vy = -rig.upper - rig.palm * Math.cos(pose[elbowZ]) * Math.cos(pose[elbowX]);
    const vz = -rig.palm * Math.cos(pose[elbowZ]) * Math.sin(pose[elbowX]);
    const down = xy * Math.cos(shoulderX) + xz * Math.sin(shoulderX);
    const a = direction * (xx * vx + down * vy), b = direction * (-xx * vy + down * vx);
    const c = direction * (xx * side * rig.shoulderX + xy * rig.shoulderY + (-xy * Math.sin(shoulderX) + xz * Math.cos(shoulderX)) * vz);
    const current = pose[shoulderZ];
    if (a * Math.cos(current) + b * Math.sin(current) + c <= limit) break;
    const radius = Math.hypot(a, b), ratio = (limit - c) / Math.max(radius, 1e-8), phase = Math.atan2(b, a);
    if (ratio < -1 && attempt === 0) {
      // Déplier juste assez le coude pour retrouver une cible atteignable.
      // Un facteur fixe provoquait un saut visible à la frontière du siège.
      const original = pose[elbowX];
      let low = 0, high = 1;
      for (let iteration = 0; iteration < 18; iteration++) {
        const fraction = (low + high) / 2, angle = original * (1 - fraction);
        const y = -rig.upper - rig.palm * Math.cos(pose[elbowZ]) * Math.cos(angle);
        const z = -rig.palm * Math.cos(pose[elbowZ]) * Math.sin(angle);
        const nextA = direction * (xx * vx + down * y), nextB = direction * (-xx * y + down * vx);
        const nextC = direction * (xx * side * rig.shoulderX + xy * rig.shoulderY + (-xy * Math.sin(shoulderX) + xz * Math.cos(shoulderX)) * z);
        if (nextC - Math.hypot(nextA, nextB) <= limit - 1e-6) high = fraction; else low = fraction;
      }
      pose[elbowX] = original * (1 - high);
      continue;
    }
    const turn = Math.acos(Math.max(-1, Math.min(1, ratio)));
    const first = nearestAngle(phase + turn, current), second = nearestAngle(phase - turn, current);
    pose[shoulderZ] = Math.abs(first - current) < Math.abs(second - current) ? first : second;
    break;
  }
}

/** Garde les deux mains dans leur moitié de banquette et à l'intérieur de la vitre, même entre deux poses. */
export function keepPassengerHandsApart(pose: PassengerPose, id: string, benchSide: number, seatX?: number) {
  if (!benchSide) return;
  let rig = rigs.get(id);
  if (!rig) {
    const skeleton = getPassengerSkeleton(id), shape = getPassengerProportions(id);
    rig = { shoulderX: shape.torsoWidth / 2 - .018, shoulderY: skeleton.shoulderY, upper: skeleton.upperArmLength,
      palm: (id === "franky" ? .228 : .22) * skeleton.armScale,
      radius: id === "franky" ? .108 : id === "jinbe" ? .096 : id === "chopper" ? .067 : id === "brook" ? .082 : .086 };
    rigs.set(id, rig);
  }
  const yaw = pose.torsoYaw + pose.rootYaw, roll = pose.torsoRoll;
  // Première ligne de la rotation XYZ du buste : seuls ces coefficients
  // interviennent dans la distance latérale à la frontière entre les sièges.
  const xx = Math.cos(yaw) * Math.cos(roll), xy = -Math.cos(yaw) * Math.sin(roll), xz = Math.sin(yaw);
  const absSeatX = seatX === undefined ? .94 : Math.abs(seatX);
  const atWindow = seatX === undefined || absSeatX > .72;
  for (const side of [-1, 1]) {
    if (id === "shanks" && side < 0) continue;
    const propReach = getPropLateralReach(id, side, pose.celebrating);
    const neighborLimit = .22 - Math.max(rig.radius, propReach) - .02;
    clampArmToHalfSpace(pose, rig, side, benchSide, neighborLimit, xx, xy, xz);
    if (atWindow) {
      const windowLimit = WINDOW_WALL_X - absSeatX - Math.max(rig.radius, propReach);
      clampArmToHalfSpace(pose, rig, side, -benchSide, windowLimit, xx, xy, xz);
    }
  }
}
