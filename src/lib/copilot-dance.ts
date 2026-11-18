import { getPartyDanceTime, PARTY_BEAT_SECONDS, PARTY_PHRASE_SECONDS } from "./party-rhythm";
import type { PassengerPose } from "./passenger-motion";

export const COPILOT_DANCE_PHASE_SECONDS = PARTY_PHRASE_SECONDS;
export const COPILOT_DANCE_GESTURES = ["kyta-party-wave", "kyta-party-sway", "kyta-party-clap", "kyta-party-log-pose", "kyta-party-pump"] as const;
const fields = ["headYaw", "headPitch", "torsoYaw", "torsoPitch", "torsoRoll", "rootYaw", "bob", "leftX", "leftZ", "rightX", "rightZ", "leftElbowX", "leftElbowZ", "rightElbowX", "rightElbowZ"] as const;
type Coefficients = Record<typeof fields[number], readonly [number, number, number]>;
const common: Coefficients = {
  headYaw: [.08, .12, 0], headPitch: [-.05, .045, 0], torsoYaw: [0, .055, 0], torsoPitch: [-.025, 0, .018], torsoRoll: [0, .038, 0],
  rootYaw: [0, .055, 0], bob: [.024, .022, 0], leftX: [2.78, .44, 0], leftZ: [-.40, 0, .10],
  rightX: [2.62, -.40, 0], rightZ: [.40, 0, -.10], leftElbowX: [.26, 0, .12], rightElbowX: [.26, 0, -.12],
  leftElbowZ: [0, 0, 0], rightElbowZ: [0, 0, 0],
};
const stages: Coefficients[] = [
  { ...common, headYaw: [.10, .18, 0], leftX: [2.82, .45, 0], rightX: [2.66, -.40, 0] },
  { ...common, headYaw: [0, .24, 0], torsoRoll: [0, .055, 0], torsoYaw: [0, .09, 0],
    leftX: [2.75, .48, 0], rightX: [2.58, -.44, 0], leftZ: [-.48, 0, .10], rightZ: [.48, 0, -.10],
    leftElbowX: [.30, -.14, 0], rightElbowX: [.30, .14, 0] },
  { ...common, headYaw: [.05, 0, .07], headPitch: [-.12, .03, 0], torsoYaw: [0, 0, .035],
    leftX: [1.95, .45, 0], rightX: [1.85, -.42, 0], leftZ: [.38, 0, .15], rightZ: [-.38, 0, -.15],
    leftElbowX: [.55, 0, .12], rightElbowX: [.55, 0, .12] },
  { ...common, headYaw: [.32, 0, .05], torsoYaw: [.065, 0, .025], torsoRoll: [-.018, .025, 0],
    leftX: [1.65, .38, 0], leftZ: [-.24, 0, .10], leftElbowX: [.58, 0, .12],
    rightX: [2.72, .42, 0], rightZ: [.25, 0, .12], rightElbowX: [.22, -.12, 0] },
  { ...common, headYaw: [.04, .15, 0], torsoPitch: [-.03, 0, .025], torsoRoll: [0, .04, 0],
    leftX: [2.78, .46, 0], rightX: [2.62, -.42, 0], leftZ: [-.27, 0, 0], rightZ: [.27, 0, 0],
    leftElbowX: [.26, -.14, 0], rightElbowX: [.26, .14, 0] },
];

/** Une danse assise en cinq phrases, échantillonnée sans allocation par image. */
export function sampleCopilotDance(pose: PassengerPose, elapsed: number, reducedMotion: boolean) {
  const time = getPartyDanceTime(Math.max(0, elapsed)), cycle = COPILOT_DANCE_PHASE_SECONDS * stages.length;
  const stage = reducedMotion ? 0 : Math.floor((time % cycle) / COPILOT_DANCE_PHASE_SECONDS);
  const current = stages[stage], previous = stages[(stage + stages.length - 1) % stages.length];
  const transition = reducedMotion ? 1 : Math.min(1, (time % COPILOT_DANCE_PHASE_SECONDS) / PARTY_BEAT_SECONDS);
  const blend = transition * transition * (3 - 2 * transition);
  const wave = reducedMotion ? 0 : Math.cos(time / PARTY_BEAT_SECONDS * Math.PI * 2), counter = reducedMotion ? 0 : Math.sin(time / PARTY_BEAT_SECONDS * Math.PI * 2);
  for (const field of fields) {
    const from = previous[field], to = current[field];
    const oldValue = from[0] + from[1] * wave + from[2] * counter;
    const nextValue = to[0] + to[1] * wave + to[2] * counter;
    pose[field] = oldValue + (nextValue - oldValue) * blend;
  }
  if (reducedMotion) {
    pose.bob = 0; pose.rootYaw = 0; pose.torsoYaw = 0; pose.torsoPitch = 0; pose.torsoRoll = 0;
  }
  pose.activity = "party"; pose.celebrating = true; pose.games = false; pose.rightKick = 0;
  pose.gesture = COPILOT_DANCE_GESTURES[stage];
}
