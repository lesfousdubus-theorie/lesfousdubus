import { applyPassengerCardPose } from "./passenger-card-game";
import { getPartyDanceTime, PARTY_BEAT_SECONDS, PARTY_PHRASE_SECONDS } from "./party-rhythm";

export type PassengerActivity = "idle" | "chat" | "check" | "game" | "horn" | "party";
export function createPassengerPose() {
  return { activity: "idle" as PassengerActivity, headYaw: 0, headPitch: 0, torsoYaw: 0, torsoPitch: 0,
    torsoRoll: 0, rootYaw: 0, bob: 0, leftX: .12, leftZ: .12, rightX: .12, rightZ: -.12,
    leftElbowX: 1.05, leftElbowZ: 0, rightElbowX: 1.05, rightElbowZ: 0, rightKick: 0,
    gesture: "rest", games: false, celebrating: false };
}
export type PassengerPose = ReturnType<typeof createPassengerPose>;
export type PassengerPoseRegistry = Map<number,PassengerPose>;
export function getRegisteredPassengerPose(registry:PassengerPoseRegistry|undefined,index:number) {
  const existing=registry?.get(index);if(existing)return existing;
  const pose=createPassengerPose();registry?.set(index,pose);return pose;
}
export function pruneRegisteredPassengerPoses(registry:PassengerPoseRegistry,visible:ReadonlySet<number>) {
  for(const index of registry.keys())if(!visible.has(index))registry.delete(index);
}
const poseFields = ["headYaw","headPitch","torsoYaw","torsoPitch","torsoRoll","rootYaw","bob","leftX","leftZ","rightX","rightZ","leftElbowX","leftElbowZ","rightElbowX","rightElbowZ","rightKick"] as const;
export function blendPassengerPose(current: PassengerPose, target: PassengerPose, dt: number, reducedMotion: boolean) {
  // Même les poses statiques passent par une courte transition, sans saut de bras.
  const mix = 1 - Math.exp((reducedMotion ? -18 : -12) * Math.max(0, Math.min(dt, .25)));
  for (const key of poseFields) {
    const next = current[key] + (target[key] - current[key]) * mix;
    current[key] = reducedMotion && mix > 0 && Math.abs(target[key] - next) < 1e-5 ? target[key] : next;
  }
  current.activity = target.activity; current.games = target.games; current.celebrating = target.celebrating; current.gesture = target.gesture;
}
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
const windowGain = (time: number, start: number, end: number) => smooth((time - start) / .7) * smooth((end - time) / .7);
const danceCadence: Record<string, number> = {
  luffy: 1, zoro: .6, nami: .9, usopp: 1.15, sanji: .85, chopper: 1.1, robin: .65,
  franky: .8, brook: 1.05, jinbe: .55, law: .7, ace: .95, sabo: .88, yamato: 1.02,
  shanks: .62, buggy: 1.18, doflamingo: .82, boa_hancock: .67, vivi: .97, mihawk: .5,
  foudubustv: 1, kamal: .9, kyta: .95,
};
export const DANCE_PHASE_DURATION = PARTY_PHRASE_SECONDS;
export const DANCE_TRANSITION_DURATION = PARTY_BEAT_SECONDS * 2;

// Les gestes libres (salut, toast, lecture, cœur…) ne gardent pas une arme
// devant le visage. L'accessoire se range pendant le fondu entre deux gestes.
const signatureStages: Record<string, readonly number[]> = {
  zoro: [0, 1, 2, 5], nami: [0, 2, 5], usopp: [0], brook: [0, 3],
  law: [2], sabo: [3], yamato: [0], shanks: [0, 5], mihawk: [0, 1, 4],
  vivi: [0], doflamingo: [0, 2, 3, 5],
};
export function getPassengerSignatureGain(time: number, id: string, party: boolean, reducedMotion: boolean) {
  if (id === "foudubustv") return 1;
  const stages = signatureStages[id];
  if (!stages) return 1;
  if (!party || reducedMotion) return stages.includes(0) ? 1 : 0;
  const danceTime = getPartyDanceTime(Number.isFinite(time) ? Math.max(0, time) : 0);
  const cycle = danceTime % (6 * DANCE_PHASE_DURATION), stage = Math.floor(cycle / DANCE_PHASE_DURATION);
  const progress = cycle - stage * DANCE_PHASE_DURATION;
  const blend = danceTime < DANCE_TRANSITION_DURATION ? 1 : smooth(progress / DANCE_TRANSITION_DURATION);
  const previous = stages.includes((stage + 5) % 6) ? 1 : 0, current = stages.includes(stage) ? 1 : 0;
  return previous + (current - previous) * blend;
}

export const CHARACTER_DANCES: Record<string, readonly string[]> = {
  luffy: ["gatling-punch", "nika-joyboy", "gomu-ufo", "meat-feast", "baka-song", "gear4-bounce"],
  zoro: ["oni-giri", "108-pound-ho", "asura-slashes", "sake-toast", "stoic-groove", "tatsu-maki"],
  nami: ["clima-tact-wave", "berry-money-rub", "mirage-pop", "wink-peace", "tangerine-breeze", "thunder-tempo"],
  usopp: ["slingshot-sniper", "goofy-panic", "god-usopp-praise", "sogeking-salute", "rubber-band", "10ton-hammer"],
  sanji: ["diable-jambe", "mellorine-love", "chef-saute", "cigarette-flick", "concasse-beat", "gentleman-bow"],
  chopper: ["hoof-cheer", "kung-fu-chops", "brain-point", "cotton-candy-hop", "doctor-stethoscope", "monster-roar"],
  robin: ["crossed-arms-blossom", "clutch-snap", "gigantesco-mano", "archaeology-read", "dark-humor-giggle", "cien-fleur-wings"],
  franky: ["super-star", "strong-right", "cola-chug", "centaur-gallop", "radical-beam", "robot-pop-lock"],
  brook: ["violin-virtuoso", "yohoho-45-lean", "soul-solid-slash", "rock-guitar", "top-hat-salute", "binks-sake-toast"],
  jinbe: ["fishman-karate", "water-current-throw", "helmsman-wheel", "martial-arts-bow", "sun-pirates-roar", "tea-toast"],
  law: ["room-tact", "shambles-snap", "kikoku-rest", "scan-field", "straw-hat-facepalm", "counter-shock"],
  ace: ["hiken-fire-fist", "firefly-sparkle", "cowboy-hat-tip", "cross-fire-guns", "narcoleptic-nod", "entei-sun-pillar"],
  sabo: ["ryusoken-claw", "flame-dragon-king", "top-hat-flourish", "iron-pipe-twirl", "freedom-fist", "brother-smile"],
  yamato: ["thunder-bagua", "oden-logbook", "deity-wolf-howl", "oni-horns-flex", "shackles-freedom", "eager-cheer"],
  shanks: ["gryphon-guard", "conqueror-pulse", "pirate-feast-toast", "straw-hat-nostalgia", "relaxed-shrug", "kamusari-stance"],
  buggy: ["bara-bara-flying", "circus-juggling", "trembling-emperor", "red-nose-honk", "muggy-cannon", "treasure-greed"],
  doflamingo: ["puppet-strings", "feather-coat-shrug", "overheat-whip", "birdcage-maestro", "sunglasses-smirk", "awakened-strings"],
  boa_hancock: ["mero-mellow-heart", "looking-down-pose", "imperial-wave", "luffy-swoon", "slave-arrow", "salome-petting"],
  vivi: ["peacock-slasher", "alabasta-x-salute", "desert-princess", "carue-riding", "rain-celebration", "nakama-wave"],
  mihawk: ["black-blade-cut", "crucifix-dagger", "red-wine-swirl", "hawk-eyes-gaze", "tsunami-cleave", "master-nod"],
  foudubustv: ["smartphone-filming", "theory-board-point", "puzzle-frame", "live-tweet-frenzy", "mont-corvo-shout", "grand-fleet-beat"],
  kamal: ["two-fist-pump", "wheel-groove", "horn-slam-beat", "boost-throttle", "window-pirate-wave", "horizon-point"],
  kyta: ["destination-point", "navigator-sway", "party-clap", "log-pose-check", "crew-hype-pump", "sea-chart-trace"],
  nakama: ["raised-arms-pump", "overhead-sway", "victory-cheer", "roof-raise-push", "alternating-fists", "pirate-anthem"],
};

export function getCharacterDanceCount(characterId: string): number {
  return CHARACTER_DANCES[characterId]?.length ?? 6;
}

export function getCharacterDanceName(characterId: string, stage: number): string {
  const dances = CHARACTER_DANCES[characterId] ?? CHARACTER_DANCES.nakama;
  return dances[Math.abs(stage) % dances.length] ?? "dance";
}

interface DanceTarget {
  leftX: number; rightX: number; leftZ: number; rightZ: number;
  leftElbowX: number; rightElbowX: number; leftElbowZ: number; rightElbowZ: number;
  torsoYaw: number; torsoPitch: number; torsoRoll: number;
  headYaw: number; headPitch: number; rightKick: number;
}

const dancePoseA: DanceTarget = {
  leftX: 0, rightX: 0, leftZ: 0, rightZ: 0,
  leftElbowX: 0, rightElbowX: 0, leftElbowZ: 0, rightElbowZ: 0,
  torsoYaw: 0, torsoPitch: 0, torsoRoll: 0, headYaw: 0, headPitch: 0, rightKick: 0,
};
const dancePoseB: DanceTarget = {
  leftX: 0, rightX: 0, leftZ: 0, rightZ: 0,
  leftElbowX: 0, rightElbowX: 0, leftElbowZ: 0, rightElbowZ: 0,
  torsoYaw: 0, torsoPitch: 0, torsoRoll: 0, headYaw: 0, headPitch: 0, rightKick: 0,
};

function initDanceTarget(target: DanceTarget, wave: number) {
  target.leftX = 2.55 + wave * .25; target.rightX = 2.55 - wave * .25;
  target.leftZ = -.35; target.rightZ = .35;
  target.leftElbowX = .3; target.rightElbowX = .3;
  target.leftElbowZ = 0; target.rightElbowZ = 0;
  target.torsoYaw = 0; target.torsoPitch = 0; target.torsoRoll = 0;
  target.headYaw = 0; target.headPitch = 0; target.rightKick = 0;
}

function sampleCharacterDance(
  target: DanceTarget, characterId: string, stage: number,
  wave: number, counter: number, reducedMotion: boolean
) {
  const s = stage % 6;
  switch (characterId) {
    case "luffy":
      switch (s) {
        case 0:
          target.leftX = 1.5 - wave * .35;
          target.rightX = 1.5 + wave * .35;
          target.leftElbowX = .45 + (1 + wave) * .45; target.rightElbowX = .45 + (1 - wave) * .45;
          target.leftZ = -.16; target.rightZ = .16; break;
        case 1:
          target.leftX = 2.70 + wave * .20; target.rightX = 2.70 + wave * .20;
          target.leftZ = -.24 + counter * .08; target.rightZ = .24 + counter * .08;
          target.leftElbowX = .50 + wave * .20; target.rightElbowX = .50 - wave * .20;
          target.torsoRoll = counter * .05; target.headPitch = -.06 + wave * .04; break;
        case 2:
          target.leftX = 1.65 + wave * .30; target.rightX = 1.65 - wave * .30;
          target.leftZ = -.30; target.rightZ = .30;
          target.leftElbowX = .25; target.rightElbowX = .25;
          target.torsoYaw = counter * .10; target.torsoPitch = wave * .03; target.headYaw = counter * .07; break;
        case 3:
          target.leftX = 2.25 + wave * .14; target.rightX = 2.65 + counter * .24;
          target.leftElbowX = 1.05 + wave * .12; target.rightElbowX = .35;
          target.leftZ = -.16; target.rightZ = .20;
          target.headPitch = -.08 + wave * .05; target.torsoPitch = -.03; break;
        case 4:
          target.leftX = 1.30 + wave * .35; target.rightX = 1.30 - wave * .35;
          target.leftElbowX = .90 + counter * .20; target.rightElbowX = .90 - counter * .20;
          target.leftZ = -.25 + counter * .07; target.rightZ = .25 + counter * .07;
          target.headYaw = wave * .15; target.torsoRoll = wave * .04; break;
        case 5:
          target.leftX = 2.10 + wave * .20; target.rightX = 2.10 + wave * .20;
          target.leftZ = -.28; target.rightZ = .28;
          target.leftElbowX = 1.15; target.rightElbowX = 1.15;
          target.torsoPitch = -.05 + counter * .03; target.torsoYaw = wave * .05; break;
      }
      break;

    case "zoro":
      switch (s) {
        case 0:
          target.leftX = 1.45 + wave * .20; target.rightX = 1.45 - wave * .20;
          target.leftZ = .38; target.rightZ = -.38;
          target.leftElbowX = .32; target.rightElbowX = .32; target.torsoYaw = counter * .08; break;
        case 1:
          target.leftX = 1.35 + wave * .15; target.rightX = 1.35 + wave * .15;
          target.leftZ = -.15; target.rightZ = .15;
          target.leftElbowX = .15 + counter * .15; target.rightElbowX = .15 + counter * .15;
          target.torsoPitch = -.04 + wave * .03; break;
        case 2:
          target.leftX = 1.75 + wave * .25; target.rightX = 1.25 - wave * .25;
          target.leftZ = -.25 + counter * .08; target.rightZ = .25 - counter * .08;
          target.leftElbowX = .65 + counter * .20; target.rightElbowX = .65 - counter * .20;
          target.torsoYaw = wave * .08; break;
        case 3:
          target.leftX = .35; target.rightX = 2.35 + wave * .16;
          target.leftZ = -.10; target.rightZ = .22;
          target.leftElbowX = 1.15; target.rightElbowX = .50 + wave * .12;
          target.headYaw = -.09; target.torsoRoll = -.03; break;
        case 4:
          target.leftX = 1.10; target.rightX = 1.10;
          target.leftZ = .30; target.rightZ = -.30;
          target.leftElbowX = 1.40; target.rightElbowX = 1.40;
          target.headPitch = -.06 + wave * .03; target.torsoPitch = wave * .02; break;
        case 5:
          target.leftX = 2.25 + wave * .22; target.rightX = 2.05 - wave * .22;
          target.leftZ = -.20 + counter * .12; target.rightZ = .20 + counter * .12;
          target.leftElbowX = .35 + wave * .14; target.rightElbowX = .35 - wave * .14;
          target.torsoRoll = counter * .06; target.torsoYaw = wave * .08; break;
      }
      break;

    case "nami":
      switch (s) {
        case 0:
          target.leftX = .55 + counter * .1; target.rightX = 2.55 + wave * .35;
          target.rightZ = .38 + counter * .14; target.leftElbowX = 1.3; target.headYaw = -.13; break;
        case 1:
          target.leftX = 1.25 + wave * .12; target.rightX = 1.25 - wave * .12;
          target.leftZ = .22; target.rightZ = -.22;
          target.leftElbowX = 1.35; target.rightElbowX = 1.35;
          target.torsoPitch = -.05 + counter * .03; target.headPitch = -.07 + wave * .04; break;
        case 2:
          target.leftX = 1.75 + wave * .28; target.rightX = .85 - wave * .28;
          target.leftZ = -.24; target.rightZ = .24;
          target.leftElbowX = .80 + counter * .18; target.rightElbowX = 1.10 - counter * .18;
          target.torsoRoll = wave * .05; target.headYaw = counter * .10; break;
        case 3:
          target.leftX = 1.90 + wave * .10; target.rightX = 1.95 - wave * .10;
          target.leftZ = -.16; target.rightZ = .16;
          target.leftElbowX = 1.30; target.rightElbowX = 1.30;
          target.headYaw = .09; target.headPitch = -.05; break;
        case 4:
          target.leftX = 1.55 + wave * .22; target.rightX = 1.55 + counter * .22;
          target.leftZ = -.28 + counter * .08; target.rightZ = .28 - counter * .08;
          target.leftElbowX = .55; target.rightElbowX = .55;
          target.torsoYaw = counter * .07; target.torsoRoll = wave * .04; break;
        case 5:
          target.leftX = 2.15 + wave * .30; target.rightX = 2.15 + wave * .30;
          target.leftZ = -.18; target.rightZ = .18;
          target.leftElbowX = .35 + wave * .25; target.rightElbowX = .35 + wave * .25;
          target.torsoPitch = -.05 + wave * .03; target.headPitch = -.06 + wave * .03; break;
      }
      break;

    case "usopp":
      switch (s) {
        case 0:
          target.leftX = 1.5; target.leftZ = -.25; target.leftElbowX = .12;
          target.rightX = 1.25; target.rightZ = .4; target.rightElbowX = 1.45 + wave * .35;
          target.headYaw = -.16; target.torsoYaw = -.12; break;
        case 1:
          target.leftX = 1.75 + wave * .40; target.rightX = 1.75 - wave * .40;
          target.leftZ = -.16 + counter * .10; target.rightZ = .16 - counter * .10;
          target.leftElbowX = .75 + counter * .25; target.rightElbowX = .75 - counter * .25;
          target.headYaw = wave * .14; target.headPitch = -.07; break;
        case 2:
          target.leftX = 2.55 + wave * .14; target.rightX = 2.55 + wave * .14;
          target.leftZ = -.30; target.rightZ = .30;
          target.leftElbowX = .30; target.rightElbowX = .30;
          target.torsoPitch = .07; target.headPitch = .10 + wave * .03; break;
        case 3:
          target.leftX = .45; target.rightX = 2.15 + wave * .12;
          target.leftZ = -.10; target.rightZ = .20;
          target.leftElbowX = 1.30; target.rightElbowX = 1.40;
          target.headYaw = .12; target.torsoYaw = .07; break;
        case 4:
          target.leftX = 1.35 + wave * .16; target.rightX = 1.35 - wave * .16;
          target.leftZ = -.14; target.rightZ = .14;
          target.leftElbowX = 1.05 + counter * .22; target.rightElbowX = .55 - counter * .22;
          target.torsoYaw = wave * .07; break;
        case 5:
          target.leftX = 1.65 + wave * .30; target.rightX = 1.65 + wave * .30;
          target.leftZ = -.18 + wave * .15; target.rightZ = .07 + wave * .15;
          target.leftElbowX = .75; target.rightElbowX = .75;
          target.torsoYaw = wave * .12; target.torsoPitch = -.05 + counter * .03; break;
      }
      break;

    case "sanji":
      switch (s) {
        case 0:
          target.leftX = .55; target.rightX = 1.7 + wave * .25; target.rightElbowX = .9;
          target.leftElbowX = 1.4; target.rightZ = .4; target.torsoRoll = -.06;
          target.rightKick = reducedMotion ? 0 : .45 * Math.max(0, wave); break;
        case 1:
          target.leftX = 1.85 + wave * .30; target.rightX = 1.85 - wave * .30;
          target.leftZ = -.25 + counter * .12; target.rightZ = .25 + counter * .12;
          target.leftElbowX = .70 + counter * .22; target.rightElbowX = .70 - counter * .22;
          target.torsoRoll = wave * .06; target.headPitch = -.07 + wave * .03; break;
        case 2:
          target.leftX = 1.25 + wave * .20; target.rightX = 1.25 - wave * .20;
          target.leftZ = -.14; target.rightZ = .14;
          target.leftElbowX = 1.05 + counter * .25; target.rightElbowX = 1.05 - counter * .25;
          target.torsoPitch = -.04 + wave * .02; break;
        case 3:
          target.leftX = .25; target.rightX = 1.45 + wave * .12;
          target.leftZ = -.06; target.rightZ = .16;
          target.leftElbowX = 1.10; target.rightElbowX = 1.25 + wave * .14;
          target.headYaw = -.12; target.torsoRoll = .03; break;
        case 4:
          target.leftX = 1.05 + wave * .14; target.rightX = 1.05 - wave * .14;
          target.leftZ = -.22; target.rightZ = .22;
          target.leftElbowX = .55; target.rightElbowX = .55;
          target.rightKick = reducedMotion ? 0 : .38 * Math.max(0, counter);
          target.torsoPitch = -.06; break;
        case 5:
          target.leftX = .20; target.rightX = 1.75 + wave * .22;
          target.leftZ = -.05; target.rightZ = .26 + counter * .07;
          target.leftElbowX = .85; target.rightElbowX = .40;
          target.torsoPitch = -.07 + wave * .02; target.headPitch = -.09; break;
      }
      break;

    case "chopper":
      switch (s) {
        case 0:
          target.leftX = 2.15 + wave * .45; target.rightX = 2.15 + wave * .45;
          target.leftZ = -.43; target.rightZ = .43;
          target.leftElbowX = .65; target.rightElbowX = .65; break;
        case 1:
          target.leftX = 1.55 + wave * .28; target.rightX = 1.55 - wave * .28;
          target.leftZ = -.20; target.rightZ = .20;
          target.leftElbowX = .28 + counter * .22; target.rightElbowX = .28 - counter * .22;
          target.torsoYaw = wave * .10; target.headYaw = wave * .12; break;
        case 2:
          target.leftX = 1.25 + wave * .16; target.rightX = 1.25 + wave * .16;
          target.leftZ = .16; target.rightZ = -.16;
          target.leftElbowX = 1.40; target.rightElbowX = 1.40;
          target.headPitch = -.09 + counter * .04; target.torsoPitch = -.04; break;
        case 3:
          target.leftX = 1.95 + counter * .22; target.rightX = 2.35 + wave * .18;
          target.leftZ = -.26; target.rightZ = .26;
          target.leftElbowX = .85; target.rightElbowX = .45;
          target.headPitch = -.07 + wave * .05; target.torsoRoll = wave * .04; break;
        case 4:
          target.leftX = 1.35; target.rightX = 1.65 + wave * .20;
          target.leftZ = .10; target.rightZ = .14;
          target.leftElbowX = 1.30; target.rightElbowX = .85 + wave * .18;
          target.headPitch = -.05 + counter * .03; target.torsoYaw = -.05; break;
        case 5:
          target.leftX = 2.35 + wave * .14; target.rightX = 2.35 + wave * .14;
          target.leftZ = -.32; target.rightZ = .32;
          target.leftElbowX = .80; target.rightElbowX = .80;
          target.torsoPitch = .05; target.headPitch = .10 + wave * .03; break;
      }
      break;

    case "robin":
      switch (s) {
        case 0:
          target.leftX = 1.25; target.rightX = 1.25;
          target.leftZ = .48; target.rightZ = -.48;
          target.leftElbowX = 1.15; target.rightElbowX = 1.15; target.headPitch = -.04; break;
        case 1:
          target.leftX = 1.45 + wave * .12; target.rightX = 1.45 - wave * .12;
          target.leftZ = -.24; target.rightZ = .24;
          target.leftElbowX = .48 + counter * .16; target.rightElbowX = .48 - counter * .16;
          target.torsoYaw = wave * .05; break;
        case 2:
          target.leftX = 2.35 + wave * .20; target.rightX = 2.35 - wave * .20;
          target.leftZ = -.28 + counter * .08; target.rightZ = .28 + counter * .08;
          target.leftElbowX = .38; target.rightElbowX = .38;
          target.torsoRoll = wave * .04; target.headPitch = -.05; break;
        case 3:
          target.leftX = .85; target.rightX = 1.65 + wave * .16;
          target.leftZ = -.08; target.rightZ = .20;
          target.leftElbowX = 1.30; target.rightElbowX = .65 + wave * .14;
          target.headPitch = -.05; target.headYaw = .07; break;
        case 4:
          target.leftX = 1.45 + wave * .07; target.rightX = .45;
          target.leftZ = .18; target.rightZ = -.08;
          target.leftElbowX = 1.40; target.rightElbowX = 1.00;
          target.torsoPitch = -.03 + counter * .02; target.headPitch = -.06; break;
        case 5:
          target.leftX = 1.75 + counter * .16; target.rightX = 1.75 + counter * .16;
          target.leftZ = -.30 + wave * .07; target.rightZ = .30 - wave * .07;
          target.leftElbowX = 1.15 + wave * .14; target.rightElbowX = 1.15 - wave * .14;
          target.torsoRoll = counter * .03; break;
      }
      break;

    case "franky":
      switch (s) {
        case 0:
          target.leftX = 2.9 + wave * .12; target.rightX = 2.9 + wave * .12;
          target.leftZ = .25; target.rightZ = -.25; target.leftElbowX = .6; target.rightElbowX = .6; break;
        case 1:
          target.leftX = 1.25; target.rightX = 1.35 + wave * .32;
          target.leftZ = -.08; target.rightZ = .16;
          target.leftElbowX = 1.15; target.rightElbowX = .18 + counter * .18;
          target.torsoYaw = counter * .09; target.torsoPitch = -.04; break;
        case 2:
          target.leftX = 1.75 + wave * .18; target.rightX = 1.75 - wave * .18;
          target.leftZ = .16; target.rightZ = -.16;
          target.leftElbowX = 1.30; target.rightElbowX = 1.30;
          target.headPitch = .08 + counter * .05; target.torsoPitch = -.03; break;
        case 3:
          target.leftX = 2.15 + wave * .25; target.rightX = 1.35 - wave * .25;
          target.leftZ = -.26; target.rightZ = .26;
          target.leftElbowX = .75; target.rightElbowX = .75;
          target.torsoPitch = -.06 + counter * .03; target.torsoYaw = wave * .07; break;
        case 4:
          target.leftX = 1.45 + wave * .10; target.rightX = 1.45 + wave * .10;
          target.leftZ = .08; target.rightZ = -.08;
          target.leftElbowX = .25; target.rightElbowX = .25;
          target.headPitch = -.04; target.torsoPitch = -.03; break;
        case 5:
          target.leftX = 2.30; target.rightX = 1.15;
          target.leftZ = -.28; target.rightZ = .28;
          target.leftElbowX = .7 + wave * .5; target.rightElbowX = .7 - wave * .5;
          target.torsoYaw = counter * .07; target.headYaw = wave * .10; break;
      }
      break;

    case "brook":
      switch (s) {
        case 0:
          target.leftX = 1.3; target.leftElbowX = 1.4; target.rightX = 1.4 + wave * .32;
          target.rightZ = .34 + counter * .12; target.rightElbowX = .5; target.headPitch = -.12; break;
        case 1:
          target.leftX = 1.65 + wave * .16; target.rightX = 1.65 - wave * .16;
          target.leftZ = -.20; target.rightZ = .20;
          target.leftElbowX = .65; target.rightElbowX = .65;
          target.torsoPitch = .10 + counter * .02; target.headPitch = .14; break;
        case 2:
          target.leftX = .55; target.rightX = 1.55 + wave * .22;
          target.leftZ = -.08; target.rightZ = .22;
          target.leftElbowX = 1.05; target.rightElbowX = .25 + counter * .18;
          target.torsoYaw = wave * .08; break;
        case 3:
          target.leftX = 1.45 + counter * .18; target.rightX = 1.15 + wave * .30;
          target.leftZ = -.16; target.rightZ = .18;
          target.leftElbowX = 1.15; target.rightElbowX = .55 + wave * .22;
          target.headPitch = -.09 + wave * .05; target.torsoRoll = counter * .05; break;
        case 4:
          target.leftX = .35; target.rightX = 2.25 + wave * .12;
          target.leftZ = -.07; target.rightZ = .20;
          target.leftElbowX = 1.05; target.rightElbowX = 1.40;
          target.torsoPitch = -.05 + counter * .02; target.headPitch = -.10; break;
        case 5:
          target.leftX = 2.15 + wave * .20; target.rightX = 2.45 + counter * .18;
          target.leftZ = -.24; target.rightZ = .24;
          target.leftElbowX = .55; target.rightElbowX = .35;
          target.torsoRoll = wave * .04; target.headPitch = -.07; break;
      }
      break;

    case "jinbe":
      switch (s) {
        case 0:
          target.leftX = 1.3 + wave * .18; target.rightX = 1.3 - wave * .18;
          target.leftZ = -.45; target.rightZ = .45; target.leftElbowX = .75; target.rightElbowX = .75;
          target.torsoYaw = wave * .07; break;
        case 1:
          target.leftX = 2.05 + wave * .22; target.rightX = 2.05 - wave * .22;
          target.leftZ = -.24; target.rightZ = .24;
          target.leftElbowX = .40; target.rightElbowX = .40;
          target.torsoPitch = -.04 + counter * .02; break;
        case 2:
          target.leftX = 1.45 + counter * .18; target.rightX = 1.45 - counter * .18;
          target.leftZ = -.16; target.rightZ = .16;
          target.leftElbowX = .85; target.rightElbowX = .85;
          target.torsoRoll = counter * .05; target.torsoYaw = wave * .05; break;
        case 3:
          target.leftX = 1.05; target.rightX = 1.05;
          target.leftZ = .14; target.rightZ = -.14;
          target.leftElbowX = 1.35; target.rightElbowX = 1.35;
          target.torsoPitch = -.05 + wave * .02; target.headPitch = -.05; break;
        case 4:
          target.leftX = 1.35 + wave * .10; target.rightX = 1.35 + wave * .10;
          target.leftZ = .20; target.rightZ = -.20;
          target.leftElbowX = 1.25; target.rightElbowX = 1.25;
          target.torsoPitch = -.03; target.headPitch = .04; break;
        case 5:
          target.leftX = .75 + wave * .07; target.rightX = .75 + wave * .07;
          target.leftZ = .12; target.rightZ = -.12;
          target.leftElbowX = 1.20; target.rightElbowX = 1.20;
          target.headPitch = -.04 + wave * .02; target.torsoPitch = wave * .02; break;
      }
      break;

    case "law":
      switch (s) {
        case 0:
          target.leftX = .7; target.leftElbowX = 1.2; target.rightX = 1.55 + wave * .12;
          target.rightElbowX = .12; target.rightZ = .38 + counter * .12; target.headYaw = .15; break;
        case 1:
          target.leftX = .38; target.rightX = 1.55 + wave * .16;
          target.leftZ = -.07; target.rightZ = .22;
          target.leftElbowX = .95; target.rightElbowX = .85 + counter * .18;
          target.headYaw = .11; target.torsoYaw = .05; break;
        case 2:
          target.leftX = .28; target.rightX = 1.75 + wave * .08;
          target.leftZ = -.05; target.rightZ = .15;
          target.leftElbowX = 1.05; target.rightElbowX = 1.35;
          target.headPitch = -.04 + wave * .02; target.torsoRoll = -.03; break;
        case 3:
          target.leftX = 1.15 + wave * .22; target.rightX = .45;
          target.leftZ = -.22 + counter * .08; target.rightZ = .10;
          target.leftElbowX = .38; target.rightElbowX = 1.05;
          target.torsoYaw = wave * .07; break;
        case 4:
          target.leftX = .28; target.rightX = 1.85 + wave * .05;
          target.leftZ = -.05; target.rightZ = .12;
          target.leftElbowX = .95; target.rightElbowX = 1.45;
          target.headPitch = -.07; target.torsoPitch = -.03; break;
        case 5:
          target.leftX = 1.35 + wave * .14; target.rightX = 1.35 + wave * .14;
          target.leftZ = -.10; target.rightZ = .10;
          target.leftElbowX = .55 + counter * .18; target.rightElbowX = .55 + counter * .18;
          target.torsoPitch = -.03; break;
      }
      break;

    case "ace":
      switch (s) {
        case 0:
          target.leftX = .7 + counter * .15; target.rightX = 1.8 + wave * .35;
          target.leftElbowX = 1.35; target.rightElbowX = .15; target.torsoYaw = -.065; break;
        case 1:
          target.leftX = 1.75 + wave * .22; target.rightX = 1.75 - wave * .22;
          target.leftZ = -.24 + counter * .08; target.rightZ = .24 - counter * .08;
          target.leftElbowX = .60; target.rightElbowX = .60;
          target.torsoRoll = wave * .04; break;
        case 2:
          target.leftX = .38; target.rightX = 2.15 + wave * .10;
          target.leftZ = -.07; target.rightZ = .16;
          target.leftElbowX = 1.05; target.rightElbowX = 1.35;
          target.headYaw = -.09; target.headPitch = -.04; break;
        case 3:
          target.leftX = 1.45 + counter * .12; target.rightX = 1.45 - counter * .12;
          target.leftZ = .16; target.rightZ = -.16;
          target.leftElbowX = .35; target.rightElbowX = .35;
          target.torsoYaw = wave * .07; break;
        case 4:
          target.leftX = .75 + wave * .08; target.rightX = .75 + wave * .08;
          target.leftZ = -.10; target.rightZ = .10;
          target.leftElbowX = 1.15; target.rightElbowX = 1.15;
          target.headPitch = .06 + wave * .16; target.torsoPitch = -.04 + wave * .02; break;
        case 5:
          target.leftX = 2.55 + wave * .16; target.rightX = 2.55 + wave * .16;
          target.leftZ = -.25; target.rightZ = .25;
          target.leftElbowX = .40; target.rightElbowX = .40;
          target.torsoPitch = .05; target.headPitch = .07; break;
      }
      break;

    case "sabo":
      switch (s) {
        case 0:
          target.leftX = 2.5 + wave * .2; target.leftElbowX = .8; target.rightX = 1.35;
          target.rightElbowX = 1.15 + counter * .25; target.rightZ = .25; break;
        case 1:
          target.leftX = 1.65 + wave * .25; target.rightX = 2.15 - wave * .25;
          target.leftZ = -.22 + counter * .10; target.rightZ = .22 + counter * .10;
          target.leftElbowX = .55; target.rightElbowX = .35;
          target.torsoYaw = wave * .08; break;
        case 2:
          target.leftX = .38; target.rightX = 2.05 + wave * .12;
          target.leftZ = -.07; target.rightZ = .20;
          target.leftElbowX = .95; target.rightElbowX = 1.35;
          target.torsoPitch = -.05; target.headPitch = -.07; break;
        case 3:
          target.leftX = 1.25 + counter * .18; target.rightX = 1.55 + wave * .22;
          target.leftZ = -.14; target.rightZ = .18;
          target.leftElbowX = 1.05; target.rightElbowX = .65 + counter * .18;
          target.torsoRoll = counter * .04; break;
        case 4:
          target.leftX = .45; target.rightX = 2.65 + wave * .15;
          target.leftZ = -.07; target.rightZ = .16;
          target.leftElbowX = 1.15; target.rightElbowX = .20;
          target.headYaw = .07; target.torsoYaw = .04; break;
        case 5:
          target.leftX = 1.05 + wave * .07; target.rightX = 1.05 - wave * .07;
          target.leftZ = .25; target.rightZ = -.25;
          target.leftElbowX = 1.30; target.rightElbowX = 1.30;
          target.headYaw = -.10; target.headPitch = -.03; break;
      }
      break;

    case "yamato":
      switch (s) {
        case 0:
          target.leftX = 2.5; target.rightX = 2.1 + wave * .4;
          target.leftZ = -.18; target.rightZ = .46; target.leftElbowX = .95; target.rightElbowX = .35;
          target.torsoYaw = counter * .10; break;
        case 1:
          target.leftX = 2.25 + wave * .15; target.rightX = 2.25 + wave * .15;
          target.leftZ = -.15; target.rightZ = .15;
          target.leftElbowX = 1.05; target.rightElbowX = 1.05;
          target.headPitch = .09 + wave * .04; target.torsoPitch = -.03; break;
        case 2:
          target.leftX = 1.95 + wave * .20; target.rightX = 1.95 + wave * .20;
          target.leftZ = -.28; target.rightZ = .28;
          target.leftElbowX = 1.15; target.rightElbowX = 1.15;
          target.headPitch = .14 + counter * .04; target.torsoPitch = .05; break;
        case 3:
          target.leftX = 2.15 + wave * .10; target.rightX = 2.15 + wave * .10;
          target.leftZ = -.12; target.rightZ = .12;
          target.leftElbowX = 1.40; target.rightElbowX = 1.40;
          target.headYaw = counter * .08; target.torsoPitch = -.04; break;
        case 4:
          target.leftX = 1.75 + wave * .30; target.rightX = 1.75 - wave * .30;
          target.leftZ = -.25 + counter * .10; target.rightZ = .25 - counter * .10;
          target.leftElbowX = .45; target.rightElbowX = .45;
          target.torsoRoll = wave * .06; break;
        case 5:
          target.leftX = 2.55 + wave * .22; target.rightX = 2.55 - wave * .22;
          target.leftZ = -.18; target.rightZ = .18;
          target.leftElbowX = .60; target.rightElbowX = .60;
          target.torsoPitch = -.05 + counter * .02; target.headPitch = -.07; break;
      }
      break;

    case "shanks":
      switch (s) {
        case 0:
          target.leftX = .12; target.leftZ = -.08; target.leftElbowX = 1.05;
          target.rightX = 2.4 + wave * .18; target.rightZ = .44; target.rightElbowX = .65; break;
        case 1:
          target.leftX = .12; target.rightX = 1.75 + wave * .10;
          target.leftZ = -.08; target.rightZ = .18;
          target.leftElbowX = 1.05; target.rightElbowX = .35;
          target.torsoPitch = -.03; target.headPitch = -.05 + wave * .02; break;
        case 2:
          target.leftX = .12; target.rightX = 2.55 + wave * .18;
          target.leftZ = -.08; target.rightZ = .22;
          target.leftElbowX = 1.05; target.rightElbowX = .50 + wave * .10;
          target.headPitch = .08 + counter * .04; target.torsoRoll = -.03; break;
        case 3:
          target.leftX = .12; target.rightX = 1.35 + wave * .08;
          target.leftZ = -.08; target.rightZ = -.04;
          target.leftElbowX = 1.05; target.rightElbowX = 1.35;
          target.headPitch = -.05; target.torsoYaw = -.04; break;
        case 4:
          target.leftX = .12; target.rightX = 1.15 + wave * .20;
          target.leftZ = -.08; target.rightZ = .24 + counter * .08;
          target.leftElbowX = 1.05; target.rightElbowX = .75;
          target.headYaw = .10; target.torsoRoll = wave * .03; break;
        case 5:
          target.leftX = .12; target.rightX = 1.95 + wave * .25;
          target.leftZ = -.08; target.rightZ = .14 + counter * .12;
          target.leftElbowX = 1.05; target.rightElbowX = .22;
          target.torsoYaw = counter * .08; target.torsoPitch = -.04; break;
      }
      break;

    case "buggy":
      switch (s) {
        case 0:
          target.leftX = 2.1 + wave * .45; target.rightX = 2.1 + counter * .45;
          target.leftZ = -.52; target.rightZ = .52;
          target.leftElbowX = .85 + counter * .28; target.rightElbowX = .85 + wave * .28;
          target.headYaw = counter * .2; break;
        case 1:
          target.leftX = 1.55 + wave * .32; target.rightX = 1.55 - wave * .32;
          target.leftZ = -.22 + counter * .08; target.rightZ = .22 - counter * .08;
          target.leftElbowX = 1.15 - wave * .25; target.rightElbowX = 1.15 + wave * .25;
          target.torsoRoll = wave * .05; break;
        case 2:
          target.leftX = 2.45 + counter * .12; target.rightX = 2.45 + counter * .12;
          target.leftZ = -.25; target.rightZ = .25;
          target.leftElbowX = .55 + wave * .18; target.rightElbowX = .55 - wave * .18;
          target.torsoPitch = -.05 + counter * .03; target.headPitch = -.08; break;
        case 3:
          target.leftX = 1.35; target.rightX = 1.45 + wave * .16;
          target.leftZ = -.12; target.rightZ = .12;
          target.leftElbowX = 1.30; target.rightElbowX = 1.40;
          target.headYaw = -.12; target.headPitch = .06; break;
        case 4:
          target.leftX = 1.65 + wave * .25; target.rightX = 1.65 + wave * .25;
          target.leftZ = -.14; target.rightZ = .14;
          target.leftElbowX = .18; target.rightElbowX = .18;
          target.torsoPitch = -.05; target.headPitch = -.04; break;
        case 5:
          target.leftX = 1.15 + wave * .10; target.rightX = 1.15 - wave * .10;
          target.leftZ = .22; target.rightZ = -.22;
          target.leftElbowX = 1.35; target.rightElbowX = 1.35;
          target.torsoRoll = counter * .04; target.headPitch = -.07; break;
      }
      break;

    case "doflamingo":
      switch (s) {
        case 0:
          target.leftX = 1.45 + wave * .23; target.rightX = 1.45 - wave * .23;
          target.leftZ = -.45; target.rightZ = .45;
          target.leftElbowX = 1.0 + counter * .20; target.rightElbowX = 1.0 - counter * .20;
          target.torsoPitch = .075; target.headPitch = -.09; target.headYaw = counter * .16; break;
        case 1:
          target.leftX = .85 + wave * .12; target.rightX = .85 - wave * .12;
          target.leftZ = -.28; target.rightZ = .28;
          target.leftElbowX = .75; target.rightElbowX = .75;
          target.torsoPitch = .08; target.headPitch = .08 + wave * .03; break;
        case 2:
          target.leftX = .55; target.rightX = 2.25 + wave * .25;
          target.leftZ = -.10; target.rightZ = .22 + counter * .10;
          target.leftElbowX = 1.05; target.rightElbowX = .30;
          target.torsoYaw = counter * .08; break;
        case 3:
          target.leftX = 2.15 + wave * .18; target.rightX = 2.15 - wave * .18;
          target.leftZ = -.24 + counter * .08; target.rightZ = .24 + counter * .08;
          target.leftElbowX = .65; target.rightElbowX = .65;
          target.torsoRoll = counter * .04; break;
        case 4:
          target.leftX = .45; target.rightX = 1.85 + wave * .07;
          target.leftZ = -.08; target.rightZ = .12;
          target.leftElbowX = 1.15; target.rightElbowX = 1.40;
          target.headYaw = .12; target.headPitch = -.04; break;
        case 5:
          target.leftX = 1.75 + wave * .20; target.rightX = 1.75 + wave * .20;
          target.leftZ = -.25; target.rightZ = .25;
          target.leftElbowX = .85 + counter * .16; target.rightElbowX = .85 + counter * .16;
          target.torsoPitch = -.03; break;
      }
      break;

    case "boa_hancock":
      switch (s) {
        case 0:
          target.leftX = .8; target.leftZ = .16; target.leftElbowX = 1.4;
          target.rightX = 2.35 + wave * .24; target.rightZ = .3 + counter * .10; target.rightElbowX = .75;
          target.torsoRoll = .045; target.headPitch = -.13; target.headYaw = -.14; break;
        case 1:
          target.leftX = .65; target.rightX = .65;
          target.leftZ = -.18; target.rightZ = .18;
          target.leftElbowX = .95; target.rightElbowX = .95;
          target.torsoPitch = .10; target.headPitch = .24 + wave * .03; target.headYaw = -.07; break;
        case 2:
          target.leftX = 1.45 + wave * .10; target.rightX = 1.45 + wave * .10;
          target.leftZ = .16; target.rightZ = -.16;
          target.leftElbowX = 1.30; target.rightElbowX = 1.30;
          target.headPitch = -.08; target.headYaw = -.10; break;
        case 3:
          target.leftX = 1.55 + wave * .08; target.rightX = 1.75 + wave * .08;
          target.leftZ = .20; target.rightZ = .10;
          target.leftElbowX = 1.35; target.rightElbowX = 1.35;
          target.torsoRoll = .07 + wave * .02; target.headPitch = -.10; break;
        case 4:
          target.leftX = 1.55; target.rightX = 1.35 + wave * .25;
          target.leftZ = -.20; target.rightZ = .26;
          target.leftElbowX = .25; target.rightElbowX = 1.25 + counter * .20;
          target.torsoYaw = -.08; break;
        case 5:
          target.leftX = 1.05 + wave * .12; target.rightX = 1.05 - wave * .12;
          target.leftZ = -.14; target.rightZ = .14;
          target.leftElbowX = 1.15; target.rightElbowX = 1.15;
          target.headPitch = -.05 + counter * .02; break;
      }
      break;

    case "vivi":
      switch (s) {
        case 0:
          target.leftX = 1.5 + wave * .18; target.rightX = 1.5 + wave * .18;
          target.leftZ = .28 + counter * .08; target.rightZ = -.28 - counter * .08;
          target.leftElbowX = 1.15; target.rightElbowX = 1.15; target.headYaw = counter * .13; break;
        case 1:
          target.leftX = 2.65 + wave * .12; target.rightX = .45;
          target.leftZ = -.16; target.rightZ = .10;
          target.leftElbowX = .20; target.rightElbowX = 1.15;
          target.headYaw = -.10; target.torsoPitch = -.04; break;
        case 2:
          target.leftX = 1.75 + wave * .20; target.rightX = 1.75 - wave * .20;
          target.leftZ = -.22 + counter * .10; target.rightZ = .22 + counter * .10;
          target.leftElbowX = .75 + counter * .18; target.rightElbowX = .75 - counter * .18;
          target.torsoRoll = wave * .05; break;
        case 3:
          target.leftX = 1.25 + wave * .18; target.rightX = 1.25 + wave * .18;
          target.leftZ = -.14; target.rightZ = .14;
          target.leftElbowX = 1.05 + counter * .20; target.rightElbowX = 1.05 + counter * .20;
          target.torsoPitch = -.05 + wave * .03; break;
        case 4:
          target.leftX = 1.85 + wave * .12; target.rightX = 1.85 + wave * .12;
          target.leftZ = -.22; target.rightZ = .22;
          target.leftElbowX = .45; target.rightElbowX = .45;
          target.headPitch = .10 + wave * .03; target.torsoPitch = .03; break;
        case 5:
          target.leftX = 2.35 + wave * .20; target.rightX = 2.35 - wave * .20;
          target.leftZ = -.22; target.rightZ = .22;
          target.leftElbowX = .60; target.rightElbowX = .60;
          target.torsoYaw = counter * .07; break;
      }
      break;

    case "mihawk":
      switch (s) {
        case 0:
          target.leftX = .4; target.leftZ = -.08; target.leftElbowX = 1.0;
          target.rightX = 1.85 + wave * .15; target.rightZ = .16 + counter * .06; target.rightElbowX = .42;
          target.torsoYaw = counter * .055; target.headPitch = -.025; target.headYaw = .10; break;
        case 1:
          target.leftX = .35; target.rightX = 1.35 + wave * .15;
          target.leftZ = -.06; target.rightZ = .16;
          target.leftElbowX = 1.00; target.rightElbowX = 1.15 + counter * .15;
          target.headYaw = .07; break;
        case 2:
          target.leftX = .35; target.rightX = 1.15 + wave * .07;
          target.leftZ = -.06; target.rightZ = .14;
          target.leftElbowX = 1.00; target.rightElbowX = 1.30 + wave * .08;
          target.headPitch = -.03; break;
        case 3:
          target.leftX = 1.00; target.rightX = 1.00;
          target.leftZ = .25; target.rightZ = -.25;
          target.leftElbowX = 1.35; target.rightElbowX = 1.35;
          target.torsoPitch = wave * .015; target.headPitch = -.02; break;
        case 4:
          target.leftX = 2.15 + wave * .10; target.rightX = 2.15 + wave * .10;
          target.leftZ = -.09; target.rightZ = .09;
          target.leftElbowX = .35; target.rightElbowX = .35;
          target.torsoPitch = -.04; target.headPitch = -.03; break;
        case 5:
          target.leftX = .35; target.rightX = 1.45 + wave * .05;
          target.leftZ = -.06; target.rightZ = .11;
          target.leftElbowX = 1.00; target.rightElbowX = 1.40;
          target.headPitch = -.05 + wave * .02; break;
      }
      break;

    case "foudubustv":
      switch (s) {
        case 0:
          target.leftX = 1.1; target.leftElbowX = 1.3; target.leftZ = -.2;
          target.rightX = 2.8 + wave * .25; target.rightZ = .5; target.rightElbowX = .35; break;
        case 1:
          target.leftX = .55; target.rightX = 2.15 + wave * .18;
          target.leftZ = -.09; target.rightZ = .20;
          target.leftElbowX = 1.05; target.rightElbowX = .35 + counter * .12;
          target.headYaw = .12; target.torsoYaw = .07; break;
        case 2:
          target.leftX = 1.75 + wave * .10; target.rightX = 1.75 - wave * .10;
          target.leftZ = -.14; target.rightZ = .14;
          target.leftElbowX = 1.30; target.rightElbowX = 1.30;
          target.headPitch = -.07 + wave * .03; target.torsoPitch = -.03; break;
        case 3:
          target.leftX = 1.15 + wave * .12; target.rightX = 1.15 - wave * .12;
          target.leftZ = .14; target.rightZ = -.14;
          target.leftElbowX = 1.25; target.rightElbowX = 1.25;
          target.headPitch = -.07; target.torsoPitch = -.04; break;
        case 4:
          target.leftX = 1.55 + wave * .08; target.rightX = 1.55 + wave * .08;
          target.leftZ = .16; target.rightZ = -.16;
          target.leftElbowX = 1.35; target.rightElbowX = 1.35;
          target.headPitch = .07 + wave * .03; target.torsoPitch = .03; break;
        case 5:
          target.leftX = 1.35 + wave * .22; target.rightX = 1.35 + wave * .22;
          target.leftZ = -.18; target.rightZ = .18;
          target.leftElbowX = .55 + counter * .18; target.rightElbowX = .55 + counter * .18;
          target.torsoPitch = -.05 + wave * .03; break;
      }
      break;

    case "kamal":
      switch (s) {
        case 0:
          target.leftX = 2.6 + wave * .45; target.rightX = 2.6 - wave * .45;
          target.leftZ = -.2; target.rightZ = .2; target.leftElbowX = .8; target.rightElbowX = .8; break;
        case 1:
          target.leftX = 2.50 + counter * .20; target.rightX = 2.50 - counter * .20;
          target.leftZ = -.16; target.rightZ = .16;
          target.leftElbowX = .85; target.rightElbowX = .85;
          target.torsoYaw = counter * .06; target.torsoRoll = wave * .04; break;
        case 2:
          target.leftX = 2.45 + wave * .15; target.rightX = 2.65 - wave * .15;
          target.leftZ = -.14; target.rightZ = .14;
          target.leftElbowX = .90; target.rightElbowX = .75;
          target.headPitch = -.06 + wave * .03; break;
        case 3:
          target.leftX = 2.40; target.rightX = 2.70 + wave * .18;
          target.leftZ = -.15; target.rightZ = .18;
          target.leftElbowX = .85; target.rightElbowX = .70 + counter * .15;
          target.torsoPitch = .02; target.headPitch = .05; break;
        case 4:
          target.leftX = 2.65 + wave * .18; target.rightX = 2.40;
          target.leftZ = -.20; target.rightZ = .14;
          target.leftElbowX = .65; target.rightElbowX = .90;
          target.headYaw = -.10; break;
        case 5:
          target.leftX = 2.40; target.rightX = 2.65 + wave * .15;
          target.leftZ = -.14; target.rightZ = .16;
          target.leftElbowX = .85; target.rightElbowX = .60;
          target.headYaw = .06; target.torsoPitch = -.02; break;
      }
      break;

    case "kyta":
      switch (s) {
        case 0:
          target.leftX = 2.8; target.leftElbowX = .5; target.leftZ = -.4;
          target.rightX = 1.4 + counter * .15; target.rightElbowX = .2; target.rightZ = .12; break;
        case 1:
          target.leftX = 2.60 + wave * .18; target.rightX = 1.80 - wave * .18;
          target.leftZ = -.28; target.rightZ = .20;
          target.leftElbowX = .65; target.rightElbowX = .65;
          target.torsoRoll = wave * .03; target.torsoYaw = counter * .05; break;
        case 2:
          target.leftX = 2.50 + wave * .12; target.rightX = 1.70 + wave * .12;
          target.leftZ = -.22; target.rightZ = .16;
          target.leftElbowX = .80; target.rightElbowX = .80;
          target.headPitch = -.06; break;
        case 3:
          target.leftX = 2.45; target.rightX = 2.55 + wave * .15;
          target.leftZ = -.20; target.rightZ = .18;
          target.leftElbowX = .85; target.rightElbowX = .45;
          target.headPitch = -.04; target.headYaw = .10; break;
        case 4:
          target.leftX = 2.70 + wave * .20; target.rightX = 2.10 - wave * .20;
          target.leftZ = -.25; target.rightZ = .18;
          target.leftElbowX = .60; target.rightElbowX = .60;
          target.torsoPitch = -.03; break;
        case 5:
          target.leftX = 2.50 + counter * .15; target.rightX = 1.90 + wave * .16;
          target.leftZ = -.22; target.rightZ = .16;
          target.leftElbowX = .75; target.rightElbowX = .35 + wave * .12;
          target.torsoYaw = wave * .05; break;
      }
      break;

    default:
      switch (s) {
        case 0:
          target.leftX = 2.55 + wave * .25; target.rightX = 2.55 - wave * .25;
          target.leftZ = -.30; target.rightZ = .30;
          target.leftElbowX = .30; target.rightElbowX = .30; break;
        case 1:
          target.leftX = 2.60 + counter * .20; target.rightX = 2.60 + counter * .20;
          target.leftZ = -.24 + wave * .08; target.rightZ = .24 + wave * .08;
          target.leftElbowX = .38; target.rightElbowX = .38;
          target.torsoRoll = wave * .04; break;
        case 2:
          target.leftX = 2.45 + wave * .16; target.rightX = 2.45 + wave * .16;
          target.leftZ = -.20; target.rightZ = .20;
          target.leftElbowX = .75; target.rightElbowX = .75;
          target.headPitch = -.07 + wave * .03; break;
        case 3:
          target.leftX = 2.70 + wave * .18; target.rightX = 2.70 + wave * .18;
          target.leftZ = -.26; target.rightZ = .26;
          target.leftElbowX = .20 + counter * .12; target.rightElbowX = .20 + counter * .12;
          target.torsoPitch = -.03; break;
        case 4:
          target.leftX = 2.50 + wave * .30; target.rightX = 2.50 - wave * .30;
          target.leftZ = -.22; target.rightZ = .22;
          target.leftElbowX = .48 + counter * .18; target.rightElbowX = .48 - counter * .18;
          target.torsoYaw = wave * .05; break;
        case 5:
          target.leftX = 2.35 + wave * .14; target.rightX = 2.35 + wave * .14;
          target.leftZ = -.30; target.rightZ = .30;
          target.leftElbowX = .42; target.rightElbowX = .42;
          target.headPitch = .07 + wave * .03; target.torsoPitch = .03; break;
      }
      break;
  }
}

function blendDanceTarget(pose: PassengerPose, a: DanceTarget, b: DanceTarget, blend: number) {
  if (blend >= 1) {
    pose.leftX = b.leftX; pose.rightX = b.rightX;
    pose.leftZ = b.leftZ; pose.rightZ = b.rightZ;
    pose.leftElbowX = b.leftElbowX; pose.rightElbowX = b.rightElbowX;
    pose.leftElbowZ = b.leftElbowZ; pose.rightElbowZ = b.rightElbowZ;
    pose.torsoYaw = b.torsoYaw; pose.torsoPitch = b.torsoPitch; pose.torsoRoll = b.torsoRoll;
    pose.headYaw = b.headYaw; pose.headPitch = b.headPitch; pose.rightKick = b.rightKick;
  } else {
    pose.leftX = a.leftX + (b.leftX - a.leftX) * blend;
    pose.rightX = a.rightX + (b.rightX - a.rightX) * blend;
    pose.leftZ = a.leftZ + (b.leftZ - a.leftZ) * blend;
    pose.rightZ = a.rightZ + (b.rightZ - a.rightZ) * blend;
    pose.leftElbowX = a.leftElbowX + (b.leftElbowX - a.leftElbowX) * blend;
    pose.rightElbowX = a.rightElbowX + (b.rightElbowX - a.rightElbowX) * blend;
    pose.leftElbowZ = a.leftElbowZ + (b.leftElbowZ - a.leftElbowZ) * blend;
    pose.rightElbowZ = a.rightElbowZ + (b.rightElbowZ - a.rightElbowZ) * blend;
    pose.torsoYaw = a.torsoYaw + (b.torsoYaw - a.torsoYaw) * blend;
    pose.torsoPitch = a.torsoPitch + (b.torsoPitch - a.torsoPitch) * blend;
    pose.torsoRoll = a.torsoRoll + (b.torsoRoll - a.torsoRoll) * blend;
    pose.headYaw = a.headYaw + (b.headYaw - a.headYaw) * blend;
    pose.headPitch = a.headPitch + (b.headPitch - a.headPitch) * blend;
    pose.rightKick = a.rightKick + (b.rightKick - a.rightKick) * blend;
  }
}

/** Modifie un objet réutilisé ; aucun état React n'est mis à jour par image. */
export function samplePassengerPose(pose: PassengerPose, time: number, index: number, peerSide: number,
  torsoWidth: number, hornElapsed: number, party: boolean, reducedMotion: boolean, characterId = "nakama", cardPairIndex: number | null = null,
  interactionPairIndex = cardPairIndex ?? Math.floor(index / 2)) {
  pose.activity = "idle"; pose.games = false; pose.celebrating = false;
  pose.gesture = "rest"; pose.rightKick = 0;
  pose.headYaw = peerSide ? -peerSide * .04 : -.04;
  pose.headPitch = 0; pose.torsoYaw = 0; pose.torsoPitch = 0; pose.torsoRoll = 0;
  pose.rootYaw = 0; pose.bob = 0;
  pose.leftX = .12; pose.rightX = .12; pose.leftZ = .12; pose.rightZ = -.12;
  pose.leftElbowX = 1.05; pose.rightElbowX = 1.05; pose.leftElbowZ = 0; pose.rightElbowZ = 0;
  const seed = index * .73;
  if (!reducedMotion) {
    pose.headPitch = Math.sin(time * 1.7 + seed) * .018;
    pose.headYaw += Math.sin(time * .7 + seed) * .06;
  }
  const horn = !reducedMotion && hornElapsed >= 0 && hornElapsed < 1.8 ? smooth(hornElapsed / .12) * smooth((1.8 - hornElapsed) / .4) : 0;
  if (party || horn > 0) {
    pose.activity = party ? "party" : "horn"; pose.celebrating = true;
    const gain = party ? 1 : horn;
    const danceTime = getPartyDanceTime(time);
    const beat = reducedMotion ? 0 : party ? danceTime / PARTY_BEAT_SECONDS * Math.PI * 2
      : hornElapsed * Math.PI * 3.6 * (danceCadence[characterId] ?? 1) + seed;
    const wave = reducedMotion ? 0 : party ? Math.cos(beat) : Math.sin(beat), counter = reducedMotion ? 0 : party ? Math.sin(beat) : Math.cos(beat);
    pose.gesture = characterId;

    if (!party || reducedMotion) {
      initDanceTarget(dancePoseB, wave);
      sampleCharacterDance(dancePoseB, characterId, 0, wave, counter, reducedMotion);
      blendDanceTarget(pose, dancePoseB, dancePoseB, 1);
    } else {
      const cycleTime = danceTime % (6 * DANCE_PHASE_DURATION);
      const stage = Math.floor(cycleTime / DANCE_PHASE_DURATION);
      const prevStage = (stage + 5) % 6;
      const stageProgress = cycleTime - stage * DANCE_PHASE_DURATION;
      const transition = danceTime < DANCE_TRANSITION_DURATION ? 1 : Math.min(1, stageProgress / DANCE_TRANSITION_DURATION);
      const blend = transition * transition * (3 - 2 * transition);

      initDanceTarget(dancePoseB, wave);
      sampleCharacterDance(dancePoseB, characterId, stage, wave, counter, false);
      if (blend >= 1) {
        blendDanceTarget(pose, dancePoseB, dancePoseB, 1);
      } else {
        initDanceTarget(dancePoseA, wave);
        sampleCharacterDance(dancePoseA, characterId, prevStage, wave, counter, false);
        blendDanceTarget(pose, dancePoseA, dancePoseB, blend);
      }
    }

    if (!reducedMotion) {
      pose.bob = (.018 + .018 * wave) * gain;
      pose.rootYaw = Math.sin(beat * .5) * .08 * gain;
      pose.torsoRoll += wave * .045;
      pose.torsoPitch += -.035 + counter * .025;
      pose.headPitch += -.08 + wave * .035;
      pose.headYaw += Math.sin(beat * .5) * .10;

      pose.torsoPitch = Math.max(-.115, Math.min(.115, pose.torsoPitch));
      pose.torsoRoll = Math.max(-.115, Math.min(.115, pose.torsoRoll));
      pose.torsoYaw = Math.max(-.24, Math.min(.24, pose.torsoYaw));
      pose.rootYaw = Math.max(-.08, Math.min(.08, pose.rootYaw));
      pose.headPitch = Math.max(-.42, Math.min(.42, pose.headPitch));
      pose.headYaw = Math.max(-.90, Math.min(.90, pose.headYaw));
    }
    const outwardLimit = Math.max(.06, .15 - Math.max(0, torsoWidth - .33));
    pose.leftZ = Math.max(-outwardLimit, pose.leftZ);
    pose.rightZ = Math.min(outwardLimit, pose.rightZ);
    for (const key of poseFields) {
      if (key === "bob") continue;
      const baseline = key === "leftX" || key === "rightX" ? .12 : key === "leftElbowX" || key === "rightElbowX" ? 1.05 : key === "leftZ" ? .12 : key === "rightZ" ? -.12 : 0;
      pose[key] = baseline + (pose[key] - baseline) * gain;
    }
    return;
  }
  if (reducedMotion) return;
  // Les voisins partagent la même horloge, les autres bancs sont décalés.
  const cycle = ((time + interactionPairIndex * 5.1) % 26 + 26) % 26;
  const chat = peerSide ? windowGain(cycle, 1, 7) : 0;
  if (chat > 0) {
    pose.activity = "chat";
    pose.headYaw -= chat * peerSide * .62;
    pose.torsoYaw = -chat * peerSide * .20;
    pose.rightX += chat * (.35 + Math.sin(time * 4 + seed) * .17);
    pose.leftX += chat * (.18 + Math.cos(time * 3 + seed) * .10);
    const speaking=Math.sin(time*3.5+seed);
    // Le banc partage la conversation, chaque nakama conserve sa manière de répondre.
    switch(characterId){
      case "luffy": pose.rightElbowX+=chat*(.22+speaking*.18);pose.leftZ-=chat*.17;pose.headPitch-=chat*.04;break;
      case "zoro": pose.headPitch+=chat*(.06+speaking*.025);pose.rightX-=chat*.24;pose.leftElbowX+=chat*.14;break;
      case "nami": pose.rightX+=chat*.20;pose.rightElbowX-=chat*.20;pose.rightZ+=chat*.22;pose.headPitch-=chat*.025;break;
      case "usopp": pose.leftX+=chat*.28;pose.rightX+=chat*.26;pose.leftZ-=chat*.20;pose.rightZ+=chat*.20;pose.headPitch+=chat*speaking*.04;break;
      case "sanji": pose.leftElbowX+=chat*.25;pose.rightX+=chat*.10;pose.torsoPitch-=chat*.025;break;
      case "chopper": pose.leftX+=chat*.17;pose.rightX+=chat*.10;pose.leftElbowX+=chat*.27;pose.rightElbowX+=chat*.27;pose.headPitch+=chat*.065;break;
      case "robin": pose.leftX-=chat*.10;pose.rightX-=chat*.18;pose.headPitch+=chat*.035;pose.rightElbowX+=chat*.14;break;
      case "franky": pose.leftX+=chat*.15;pose.leftZ-=chat*.25;pose.rightZ+=chat*.25;pose.torsoYaw+=chat*speaking*.035;break;
      case "brook": pose.torsoPitch+=chat*.055;pose.headPitch+=chat*.06;pose.rightElbowX-=chat*.17;break;
      case "jinbe": pose.rightX-=chat*.13;pose.leftX+=chat*.075;pose.rightElbowX-=chat*.15;pose.headPitch+=chat*(.05+Math.sin(time*1.7+seed)*.025);break;
      case "law": pose.rightX+=chat*.12;pose.rightElbowX-=chat*.22;pose.leftElbowX+=chat*.14;pose.headYaw+=chat*.09;break;
      case "ace": pose.leftZ-=chat*.20;pose.rightZ+=chat*.16;pose.headPitch-=chat*.065;pose.torsoRoll+=chat*speaking*.04;break;
      case "sabo": pose.leftX+=chat*.12;pose.leftElbowX+=chat*.20;pose.rightX+=chat*.07;pose.headPitch+=chat*.04;break;
      case "yamato": pose.leftX+=chat*.23;pose.rightX+=chat*.17;pose.leftZ-=chat*.14;pose.torsoPitch-=chat*.045;break;
      case "shanks": pose.leftX=.12;pose.leftZ=-.08;pose.leftElbowX=1.05;pose.rightX+=chat*.20;pose.headPitch-=chat*.04;break;
      case "buggy": pose.leftX+=chat*(.22+speaking*.10);pose.rightX+=chat*.25;pose.leftZ-=chat*.18;pose.headYaw+=chat*speaking*.08;break;
      case "doflamingo": pose.leftX+=chat*.19;pose.rightX+=chat*.19;pose.leftElbowX+=chat*speaking*.20;pose.rightElbowX-=chat*speaking*.20;pose.torsoPitch+=chat*.045;break;
      case "boa_hancock": pose.leftElbowX+=chat*.18;pose.rightX+=chat*.12;pose.headPitch-=chat*.04;pose.torsoRoll+=chat*.025;break;
      case "vivi": pose.leftX+=chat*.13;pose.rightElbowX+=chat*.16;pose.rightZ+=chat*.12;pose.headPitch+=chat*speaking*.03;break;
      case "mihawk": pose.rightX-=chat*.26;pose.leftX-=chat*.12;pose.rightElbowX+=chat*.09;pose.headPitch+=chat*.025;break;
    }
  }
  if (cardPairIndex !== null) applyPassengerCardPose(pose, time, cardPairIndex, peerSide, characterId);
}
