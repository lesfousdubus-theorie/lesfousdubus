import type { PassengerActivity } from "./passenger-motion";

export type FacialMood = "rest" | "speaking" | "listening" | "smile" | "laugh" | "cheer";
export function createFacialExpression() {
  return { opening: 0, smile: 0, width: 1, teeth: 0, mood: "rest" as FacialMood };
}
export type FacialExpression = ReturnType<typeof createFacialExpression>;
const expressionFields = ["opening", "smile", "width", "teeth"] as const;

const profiles: Record<string, { width: number; height: number; grin: number; enthusiasm: number; tempo: number }> = {
  luffy: { width: .087, height: .069, grin: .64, enthusiasm: 1, tempo: 7.1 },
  zoro: { width: .064, height: .031, grin: .10, enthusiasm: .42, tempo: 4.2 },
  nami: { width: .065, height: .046, grin: .22, enthusiasm: .75, tempo: 6.3 },
  usopp: { width: .078, height: .055, grin: .20, enthusiasm: .9, tempo: 8.6 },
  sanji: { width: .066, height: .038, grin: .14, enthusiasm: .55, tempo: 5.2 },
  chopper: { width: .043, height: .027, grin: .15, enthusiasm: .9, tempo: 8.1 },
  robin: { width: .062, height: .034, grin: .16, enthusiasm: .52, tempo: 4.7 },
  franky: { width: .09, height: .059, grin: .60, enthusiasm: .92, tempo: 6.8 },
  brook: { width: .154, height: .05, grin: .85, enthusiasm: .88, tempo: 5.9 },
  jinbe: { width: .099, height: .048, grin: .30, enthusiasm: .66, tempo: 4.6 },
  law: { width: .066, height: .034, grin: .12, enthusiasm: .48, tempo: 4.9 },
  ace: { width: .077, height: .048, grin: .35, enthusiasm: .85, tempo: 7.4 },
  sabo: { width: .068, height: .041, grin: .23, enthusiasm: .74, tempo: 5.4 },
  yamato: { width: .074, height: .052, grin: .32, enthusiasm: .94, tempo: 7.8 },
  shanks: { width: .072, height: .037, grin: .26, enthusiasm: .62, tempo: 4.4 },
  buggy: { width: .088, height: .060, grin: .42, enthusiasm: .96, tempo: 9.2 },
  doflamingo: { width: .090, height: .039, grin: .72, enthusiasm: .78, tempo: 5.8 },
  boa_hancock: { width: .061, height: .035, grin: .19, enthusiasm: .56, tempo: 5.0 },
  vivi: { width: .063, height: .040, grin: .25, enthusiasm: .76, tempo: 6.6 },
  mihawk: { width: .063, height: .029, grin: .08, enthusiasm: .38, tempo: 3.8 },
  foudubustv: { width: .075, height: .041, grin: .20, enthusiasm: .83, tempo: 6.9 },
  kamal: { width: .079, height: .041, grin: .18, enthusiasm: .8, tempo: 6.1 },
  kyta: { width: .068, height: .037, grin: .18, enthusiasm: .7, tempo: 5.6 },
};
const defaultProfile = { width: .066, height: .043, grin: .15, enthusiasm: .72, tempo: 6 };
export function getFacialProfile(id: string) { return profiles[id] ?? defaultProfile; }
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };

/** A reused object drives only a handful of nearby faces, without React state or textures. */
export function sampleFacialExpression(expression: FacialExpression, time: number, index: number,
  id: string, activity: PassengerActivity, reducedMotion: boolean) {
  const profile = getFacialProfile(id), seed = index * .73;
  expression.opening = 0;
  expression.smile = profile.grin;
  expression.width = 1;
  expression.teeth = profile.grin;
  expression.mood = "rest";

  if (activity === "party" || activity === "horn") {
    expression.mood = activity === "party" ? "laugh" : "cheer";
    expression.smile = .45 + profile.enthusiasm * .5;
    expression.width = 1.05 + profile.enthusiasm * .22;
    expression.teeth = .8;
    // A short pause between laughs avoids every face flapping continuously.
    const laughBeat = (time * (activity === "horn" ? 1.15 : .72) + seed) % 3.4;
    const laugh = reducedMotion ? .55 : smooth(laughBeat / .2) * smooth((2.65 - laughBeat) / .38);
    const syllable = reducedMotion ? .7 : .35 + .65 * (.5 + .5 * Math.sin(time * profile.tempo + seed));
    expression.opening = (.15 + profile.enthusiasm * .85) * laugh * syllable;
    return;
  }
  // Reduced motion keeps the meaningful smile and removes the syllable loops.
  if (reducedMotion) return;
  if (activity === "chat") {
    const chatTime = (time + Math.floor(index / 2) * 5.1) % 26;
    const turn = Math.max(0, Math.floor((chatTime - 1) / 1.15)) % 2;
    const speaking = turn === (index % 2);
    expression.mood = speaking ? "speaking" : "listening";
    expression.smile = speaking ? .16 + profile.grin * .45 : .35 + profile.grin * .45;
    expression.teeth = profile.grin * .6;
    const envelope = smooth((chatTime - 1) / .4) * smooth((7 - chatTime) / .4);
    expression.opening = speaking ? envelope * (.08 + .48 * profile.enthusiasm) * Math.max(0, Math.sin(time * (profile.tempo + 2) + seed)) : 0;
    expression.width = speaking ? .9 + .11 * Math.cos(time * profile.tempo + seed) : 1.04;
  } else if (activity === "check") {
    expression.mood = "smile";
    expression.smile = .5 + .4 * profile.enthusiasm;
    expression.width = 1.09;
    expression.teeth = .45;
  } else if (activity === "game") {
    expression.mood = "smile";
    expression.smile = .25 + profile.grin * .5;
    expression.width = .98;
    // An occasional delighted comment while playing, rather than permanent talking.
    const remark = (time + seed) % 7;
    expression.opening = remark < .75 ? .2 * profile.enthusiasm * Math.max(0, Math.sin(remark * 12)) : 0;
  }
}

export function blendFacialExpression(current: FacialExpression, target: FacialExpression, dt: number, reducedMotion: boolean) {
  const gain = reducedMotion ? 1 : 1 - Math.exp(-16 * Math.max(0, Math.min(dt, .25)));
  for (const key of expressionFields) current[key] += (target[key] - current[key]) * gain;
  current.mood = target.mood;
}
