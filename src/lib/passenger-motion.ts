import { applyPassengerCardPose } from "./passenger-card-game";

export type PassengerActivity = "idle" | "chat" | "check" | "game" | "horn" | "party";
export function createPassengerPose() {
  return { activity: "idle" as PassengerActivity, headYaw: 0, headPitch: 0, torsoYaw: 0, torsoPitch: 0,
    torsoRoll: 0, rootYaw: 0, bob: 0, leftX: .12, leftZ: -.08, rightX: .12, rightZ: .08,
    leftElbowX: 1.05, leftElbowZ: 0, rightElbowX: 1.05, rightElbowZ: 0, rightKick: 0,
    gesture: "rest", games: false, celebrating: false };
}
export type PassengerPose = ReturnType<typeof createPassengerPose>;
const poseFields = ["headYaw","headPitch","torsoYaw","torsoPitch","torsoRoll","rootYaw","bob","leftX","leftZ","rightX","rightZ","leftElbowX","leftElbowZ","rightElbowX","rightElbowZ","rightKick"] as const;
export function blendPassengerPose(current: PassengerPose, target: PassengerPose, dt: number, reducedMotion: boolean) {
  const mix = reducedMotion ? 1 : 1 - Math.exp(-12 * Math.max(0, Math.min(dt, .25)));
  for (const key of poseFields) current[key] = reducedMotion ? target[key] : current[key] + (target[key] - current[key]) * mix;
  current.activity = target.activity; current.games = target.games; current.celebrating = target.celebrating; current.gesture = target.gesture;
}
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
const windowGain = (time: number, start: number, end: number) => smooth((time - start) / .7) * smooth((end - time) / .7);
// Les mêmes temps musicaux sont interprétés avec des accents propres à chacun.
const danceCadence: Record<string, number> = {
  luffy: 1, zoro: .6, nami: .9, usopp: 1.15, sanji: .85, chopper: 1.1, robin: .65,
  franky: .8, brook: 1.05, jinbe: .55, law: .7, ace: .95, sabo: .88, yamato: 1.02,
  shanks: .62, buggy: 1.18, doflamingo: .82, boa_hancock: .67, vivi: .97, mihawk: .5,
};

/** Deux articulations amènent les deux mains au milieu du banc pour le check. */
const highFivePoses = new Map<number, { shoulder: number; elbow: number }>();
export function getHighFiveArm(side: number, torsoWidth: number) {
  const key = Math.round(torsoWidth * 1000) + (side > 0 ? 1000 : 0);
  const cached = highFivePoses.get(key);
  if (cached) return cached;
  const dx = side * (.22 - (torsoWidth / 2 - .018)), dy = .20;
  const upperLength = .20, lowerLength = .22, distance = Math.hypot(dx, dy);
  const shoulder = Math.atan2(dx, -dy) + side * Math.acos(clamp((upperLength ** 2 + distance ** 2 - lowerLength ** 2) / (2 * upperLength * distance)));
  const elbow = -side * (Math.PI - Math.acos(Math.max(-1, Math.min(1, (upperLength ** 2 + lowerLength ** 2 - distance ** 2) / (2 * upperLength * lowerLength)))));
  const pose = { shoulder: Math.atan2(Math.sin(shoulder), Math.cos(shoulder)), elbow };
  highFivePoses.set(key, pose);
  return pose;
}

/** Modifie un objet réutilisé ; aucun état React n'est mis à jour par image. */
export function samplePassengerPose(pose: PassengerPose, time: number, index: number, peerSide: number,
  torsoWidth: number, hornElapsed: number, party: boolean, reducedMotion: boolean, characterId = "nakama", cardPairIndex: number | null = null) {
  pose.activity = "idle"; pose.games = false; pose.celebrating = false;
  pose.gesture = "rest"; pose.rightKick = 0;
  pose.headYaw = peerSide ? -peerSide * .04 : -.04;
  pose.headPitch = 0; pose.torsoYaw = 0; pose.torsoPitch = 0; pose.torsoRoll = 0;
  pose.rootYaw = 0; pose.bob = 0;
  pose.leftX = .12; pose.rightX = .12; pose.leftZ = -.08; pose.rightZ = .08;
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
    // Le klaxon déclenche immédiatement la signature ; la fête alterne signature et danse.
    const signature = !party || reducedMotion ? 1 : windowGain((time + index * .41) % 7, 0, 3.2);
    const beat = reducedMotion ? 0 : (party ? time : hornElapsed) * Math.PI * 3.6 * (danceCadence[characterId] ?? 1) + seed;
    const wave = reducedMotion ? 0 : Math.sin(beat), counter = reducedMotion ? 0 : Math.cos(beat);
    pose.leftX = 2.55 + wave * .25; pose.rightX = 2.55 - wave * .25;
    pose.leftZ = -.35; pose.rightZ = .35; pose.leftElbowX = .3; pose.rightElbowX = .3;
    pose.gesture = characterId;
    switch (characterId) {
      case "luffy": // Gatling : poings alternés, sans étirer les os.
        pose.leftX = 2.65 + wave * .28 + (1.5 - wave * .35 - 2.65 - wave * .28) * signature;
        pose.rightX = 2.65 - wave * .28 + (1.5 + wave * .35 - 2.65 + wave * .28) * signature;
        pose.leftElbowX = .45 + (1 + wave) * .45; pose.rightElbowX = .45 + (1 - wave) * .45;
        pose.leftZ = -.16; pose.rightZ = .16; break;
      case "zoro": // Coupe croisée devant le buste.
        pose.leftX = 1.45 + wave * .20; pose.rightX = 1.45 - wave * .20;
        pose.leftZ = -.38 + .76 * signature; pose.rightZ = .38 - .76 * signature;
        pose.leftElbowX = .32; pose.rightElbowX = .32; pose.torsoYaw = counter * .08; break;
      case "nami":
        pose.leftX = .55 + counter * .1; pose.rightX = 2.55 + wave * .35;
        pose.rightZ = .38 + counter * .14; pose.leftElbowX = 1.3; pose.headYaw = -.13; break;
      case "usopp": // Vise puis tire sur son lance-pierre imaginaire.
        pose.leftX = 1.5; pose.leftZ = -.25; pose.leftElbowX = .12;
        pose.rightX = 1.25; pose.rightZ = .4; pose.rightElbowX = 1.45 + wave * .35;
        pose.headYaw = -.16; pose.torsoYaw = -.12; break;
      case "sanji":
        pose.leftX = .55; pose.rightX = 1.7 + wave * .25; pose.rightElbowX = .9;
        pose.leftElbowX = 1.4; pose.rightZ = .4; pose.torsoRoll = -.06;
        pose.rightKick = reducedMotion ? 0 : .45 * Math.max(0, wave); break;
      case "chopper":
        pose.leftX = 2.15 + wave * .45; pose.rightX = 2.15 + wave * .45;
        pose.leftZ = -.43; pose.rightZ = .43; pose.leftElbowX = .65; pose.rightElbowX = .65; break;
      case "robin": // Bras croisés, puis éventail Hana Hana.
        pose.leftX = 2.3 - 1.05 * signature; pose.rightX = pose.leftX;
        pose.leftZ = -.48 + .96 * signature; pose.rightZ = -pose.leftZ;
        pose.leftElbowX = 1.15; pose.rightElbowX = 1.15; pose.headPitch = -.04; break;
      case "franky": // SUPER : avant-bras réunis au-dessus du visage.
        pose.leftX = 2.9 + wave * .12; pose.rightX = 2.9 + wave * .12;
        pose.leftZ = .25; pose.rightZ = -.25; pose.leftElbowX = .6; pose.rightElbowX = .6; break;
      case "brook": // Violon et salut de musicien.
        pose.leftX = 1.3; pose.leftElbowX = 1.4; pose.rightX = 1.4 + wave * .32;
        pose.rightZ = .34 + counter * .12; pose.rightElbowX = .5; pose.headPitch = -.12; break;
      case "jinbe": // Paumes du karaté des hommes-poissons.
        pose.leftX = 1.3 + wave * .18; pose.rightX = 1.3 - wave * .18;
        pose.leftZ = -.45; pose.rightZ = .45; pose.leftElbowX = .75; pose.rightElbowX = .75;
        pose.torsoYaw = wave * .07; break;
      case "law":
        pose.leftX = .7; pose.leftElbowX = 1.2; pose.rightX = 1.55 + wave * .12;
        pose.rightElbowX = .12; pose.rightZ = .38 + counter * .12; pose.headYaw = .15; break;
      case "ace":
        pose.leftX = .7 + counter * .15; pose.rightX = 2.8 + (1.8 + wave * .35 - 2.8) * signature;
        pose.leftElbowX = 1.35; pose.rightElbowX = .15; pose.torsoYaw = -.065; break;
      case "sabo":
        pose.leftX = 2.5 + wave * .2; pose.leftElbowX = .8; pose.rightX = 1.35;
        pose.rightElbowX = 1.15 + counter * .25; pose.rightZ = .25; break;
      case "yamato":
        pose.leftX = 2.5; pose.rightX = 2.1 + wave * .4;
        pose.leftZ = -.18; pose.rightZ = .46; pose.leftElbowX = .95; pose.rightElbowX = .35;
        pose.torsoYaw = counter * .10; break;
      case "shanks":
        pose.leftX = .12; pose.leftZ = -.08; pose.leftElbowX = 1.05;
        pose.rightX = 2.4 + wave * .18; pose.rightZ = .44; pose.rightElbowX = .65; break;
      case "buggy":
        pose.leftX = 2.1 + wave * .45; pose.rightX = 2.1 + counter * .45;
        pose.leftZ = -.52; pose.rightZ = .52; pose.leftElbowX = .85 + counter * .28; pose.rightElbowX = .85 + wave * .28;
        pose.headYaw = counter * .2; break;
      case "doflamingo": // Dirige ses fils avec les deux mains, installé avec assurance.
        pose.leftX = 1.45 + wave * .23; pose.rightX = 1.45 - wave * .23;
        pose.leftZ = -.45; pose.rightZ = .45; pose.leftElbowX = 1.0 + counter * .20; pose.rightElbowX = 1.0 - counter * .20;
        pose.torsoPitch = .075; pose.headPitch = -.09; pose.headYaw = counter * .16; break;
      case "boa_hancock": // Salut royal d'une main, autre paume près du cœur.
        pose.leftX = .8; pose.leftZ = .16; pose.leftElbowX = 1.4;
        pose.rightX = 2.35 + wave * .24; pose.rightZ = .3 + counter * .10; pose.rightElbowX = .75;
        pose.torsoRoll = .045; pose.headPitch = -.13; pose.headYaw = -.14; break;
      case "vivi": // Encourage l'équipage en rapprochant les paumes devant elle.
        pose.leftX = 1.5 + wave * .18; pose.rightX = 1.5 + wave * .18;
        pose.leftZ = .28 + counter * .08; pose.rightZ = -.28 - counter * .08;
        pose.leftElbowX = 1.15; pose.rightElbowX = 1.15; pose.headYaw = counter * .13; break;
      case "mihawk": // Salut et coupe mesurée, la grande lame reste devant son propre siège.
        pose.leftX = .4; pose.leftZ = -.08; pose.leftElbowX = 1.0;
        pose.rightX = 1.85 + wave * .15; pose.rightZ = .16 + counter * .06; pose.rightElbowX = .42;
        pose.torsoYaw = counter * .055; pose.headPitch = -.025; pose.headYaw = .10; break;
      case "foudubustv": // Filmer d'une main, saluer de l'autre.
        pose.leftX = 1.1; pose.leftElbowX = 1.3; pose.leftZ = -.2;
        pose.rightX = 2.8 + wave * .25; pose.rightZ = .5; pose.rightElbowX = .35; break;
      case "kamal": // Encourager l'équipage des deux poings.
        pose.leftX = 2.6 + wave * .45; pose.rightX = 2.6 - wave * .45;
        pose.leftZ = -.2; pose.rightZ = .2; pose.leftElbowX = .8; pose.rightElbowX = .8; break;
      case "kyta": // Montrer la destination puis lever le Log Pose.
        pose.leftX = 2.8; pose.leftElbowX = .5; pose.leftZ = -.4;
        pose.rightX = 1.4 + counter * .15; pose.rightElbowX = .2; pose.rightZ = .12; break;
    }
    // Une signature reste stable en mouvement réduit ; les membres gardent leurs proportions.
    if (!reducedMotion) {
      pose.bob = (.018 + .018 * wave) * gain;
      pose.rootYaw = Math.sin(beat * .5) * .08 * gain;
      pose.torsoRoll += wave * .045;
      pose.torsoPitch += -.035 + counter * .025;
      pose.headPitch += -.08 + wave * .035;
      pose.headYaw += Math.sin(beat * .45) * .10;
    }
    if (characterId in danceCadence) {
      // Les gestes restent dans une banquette étroite, sans projeter les avant-bras par les vitres.
      const outwardLimit = Math.max(.06, .15 - Math.max(0, torsoWidth - .33));
      pose.leftZ = Math.max(-outwardLimit, pose.leftZ);
      pose.rightZ = Math.min(outwardLimit, pose.rightZ);
    }
    for (const key of poseFields) {
      if (key === "bob") continue;
      const baseline = key === "leftX" || key === "rightX" ? .12 : key === "leftElbowX" || key === "rightElbowX" ? 1.05 : key === "leftZ" ? -.08 : key === "rightZ" ? .08 : 0;
      pose[key] = baseline + (pose[key] - baseline) * gain;
    }
    return;
  }
  if (reducedMotion) return;
  // Les voisins partagent la même horloge, les autres bancs sont décalés.
  const cycle = (time + (cardPairIndex ?? Math.floor(index / 2)) * 5.1) % 26;
  const chat = windowGain(cycle, 1, 7), check = peerSide ? windowGain(cycle, 10, 13) : 0;
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
  if (check > 0) {
    pose.activity = "check"; pose.headYaw -= peerSide * .5 * check;
    const arm = getHighFiveArm(peerSide, torsoWidth);
    // Le check se fait devant les épaules, sans faire passer le coude dans le cou.
    if (peerSide > 0) { pose.rightX += (1.3-pose.rightX)*check; pose.rightZ += (arm.shoulder - pose.rightZ) * check; pose.rightElbowX *= 1 - check; pose.rightElbowZ = arm.elbow * check; }
    else { pose.leftX += (1.3-pose.leftX)*check; pose.leftZ += (arm.shoulder - pose.leftZ) * check; pose.leftElbowX *= 1 - check; pose.leftElbowZ = arm.elbow * check; }
  }
  if (cardPairIndex !== null) applyPassengerCardPose(pose, time, cardPairIndex, peerSide, characterId);
}
