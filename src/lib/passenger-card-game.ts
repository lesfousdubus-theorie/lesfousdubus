import { BODY_BEHIND_HIP } from "./passenger-gait";
import { getPassengerProportions, getPassengerSkeleton } from "./passenger-proportions";
import type { PassengerPose } from "./passenger-motion";

export const CARD_GAME_PERIOD = 26;
export const MAX_CARD_PAIRS = 14;
const clamp = (t: number) => Math.max(0, Math.min(1, t));
const smooth = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };

/** A bench uses its physical position, rather than two unrelated character seeds. */
export function getCardGameCycle(time: number, pairIndex: number) {
  return ((time + pairIndex * 5.1) % CARD_GAME_PERIOD + CARD_GAME_PERIOD) % CARD_GAME_PERIOD;
}

export function createCardGameState() {
  return { active: false, gain: 0, reach: 0, owner: 0, handoff: 0, cycle: 0, transfer: 0 };
}
export type CardGameState = ReturnType<typeof createCardGameState>;

/** Reuses its output; two complete hand-to-hand exchanges occur during a round. */
export function sampleCardGame(state: CardGameState, time: number, pairIndex: number, blocked = false) {
  const cycle = getCardGameCycle(time, pairIndex);
  const gain = smooth((cycle - 16) / .7) * smooth((23 - cycle) / .7);
  state.active = !blocked && gain > .2;
  state.cycle = cycle;
  state.gain = blocked ? 0 : gain;
  state.reach = Math.max(
    smooth((cycle - 16.5) / .9) * smooth((19.3 - cycle) / .9),
    smooth((cycle - 20) / .9) * smooth((22.8 - cycle) / .9),
  );
  const first = smooth((cycle - 17.65) / .5), second = smooth((cycle - 21.15) / .5);
  state.handoff = cycle < 20 ? first : 1 - second;
  state.owner = state.handoff < .5 ? 0 : 1;
  state.transfer = cycle >= 17.65 && cycle <= 18.15 ? 1 : cycle >= 21.15 && cycle <= 21.65 ? 2 : 0;
  return state;
}

interface CardOccupant { physicalSeatIndex: number; index: number }
export interface PassengerCardPair { pairIndex: number; firstSeat: number; secondSeat: number }
const armRigs = new Map<string, { shape: ReturnType<typeof getPassengerProportions>; rig: ReturnType<typeof getPassengerSkeleton> }>();

/** Only rendered actors on the same bench can play. An avatar never enters this input. */
export function getPassengerCardPairs(occupants: readonly CardOccupant[], ids: readonly string[]): PassengerCardPair[] {
  const present = new Map(occupants.map(actor => [actor.physicalSeatIndex, actor]));
  const pairs: PassengerCardPair[] = [];
  for (const actor of occupants) {
    if (actor.physicalSeatIndex % 2) continue;
    const other = present.get(actor.physicalSeatIndex + 1);
    if (!other || ids[actor.index % ids.length] === "shanks" || ids[other.index % ids.length] === "shanks") continue;
    pairs.push({ pairIndex: Math.floor(actor.physicalSeatIndex / 2), firstSeat: actor.physicalSeatIndex, secondSeat: other.physicalSeatIndex });
    if (pairs.length === MAX_CARD_PAIRS) break;
  }
  return pairs;
}

/** Two-bone solution in the existing X/Z shoulder and X elbow rig, without stretching. */
export function setCardArm(pose: PassengerPose, side: number, characterId: string, palmX: number, palmY: number, palmZ: number, gain: number) {
  let cached = armRigs.get(characterId);
  if (!cached) { cached = { shape: getPassengerProportions(characterId), rig: getPassengerSkeleton(characterId) }; armRigs.set(characterId, cached); }
  const { shape, rig } = cached;
  const dx = palmX - side * (shape.torsoWidth / 2 - .018);
  const dy = palmY - (.64 + rig.seatedHipHeight + rig.torsoAboveHip + rig.shoulderY);
  const dz = palmZ - (rig.seatedHipZ + BODY_BEHIND_HIP);
  const upper = rig.upperArmLength, lower = rig.forearmLength;
  const distance = Math.max(Math.abs(upper - lower) + .001, Math.min(upper + lower - .001, Math.hypot(dx, dy, dz)));
  const elbow = Math.acos(Math.max(-1, Math.min(1, (distance * distance - upper * upper - lower * lower) / (2 * upper * lower))));
  const down = upper + lower * Math.cos(elbow), front = lower * Math.sin(elbow);
  const shoulderZ = Math.asin(Math.max(-1, Math.min(1, dx / down)));
  const shoulderX = Math.atan2(-dz, -dy) - Math.atan2(front, down * Math.cos(shoulderZ));
  if (side < 0) {
    pose.leftX += (shoulderX - pose.leftX) * gain;
    pose.leftZ += (shoulderZ - pose.leftZ) * gain;
    pose.leftElbowX += (elbow - pose.leftElbowX) * gain;
    pose.leftElbowZ *= 1 - gain;
  } else {
    pose.rightX += (shoulderX - pose.rightX) * gain;
    pose.rightZ += (shoulderZ - pose.rightZ) * gain;
    pose.rightElbowX += (elbow - pose.rightElbowX) * gain;
    pose.rightElbowZ *= 1 - gain;
  }
}

export function applyPassengerCardPose(pose: PassengerPose, time: number, pairIndex: number, peerSide: number, id: string) {
  const cycle = getCardGameCycle(time, pairIndex);
  const gain = smooth((cycle - 16) / .7) * smooth((23 - cycle) / .7);
  if (!gain || !peerSide) return;
  const reach = Math.max(smooth((cycle - 16.5) / .9) * smooth((19.3 - cycle) / .9), smooth((cycle - 20) / .9) * smooth((22.8 - cycle) / .9));
  pose.activity = "game"; pose.games = gain > .2; pose.gesture = "card-exchange";
  pose.headPitch += gain * .2;
  pose.headYaw -= gain * peerSide * .25;
  pose.rootYaw *= 1 - gain; pose.torsoYaw *= 1 - gain; pose.torsoPitch *= 1 - gain; pose.torsoRoll *= 1 - gain; pose.bob *= 1 - gain;
  setCardArm(pose, peerSide, id, peerSide * (.10 + .12 * reach), 1.32, -.14, gain);
  setCardArm(pose, -peerSide, id, -peerSide * .11, id === "chopper" ? 1.28 : 1.31, -.10, gain);
}
