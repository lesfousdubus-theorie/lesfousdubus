import assert from "node:assert/strict";
import { build } from "esbuild";

async function load(path) {
  const compiled = await build({
    entryPoints: [path],
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
    logLevel: "silent",
  });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
}

const {
  DEFAULT_GRAPHICS_SETTINGS,
  TIER_ORDER,
  classifyGpuHardware,
  createDprSample,
  createPerformanceMonitor,
  formatGpuLabel,
  getSceneGeometryBudgets,
  isDefaultGraphicsSettings,
  resolveGraphicsProfile,
  sampleSceneDpr,
  sampleScenePerformance,
  sanitizeGraphicsSettings,
  syncPerformanceMonitorProfile,
} = await load("src/lib/scene-performance.ts");
const { getBusOccupancy } = await load("src/lib/bus-occupancy.ts");
const { getSeatRowZ } = await load("src/lib/bus-layout.ts");
const { getBusCameraFar, getExteriorMaxDistance } = await load("src/lib/bus-camera.ts");
const { getSeaCreatureDuration, sampleSeaCreaturePose } = await load("src/lib/sea-creature-motion.ts");
const { createConfettiSeeds } = await load("src/lib/bus-confetti.ts");
const { DANCE_PHASE_DURATION, createPassengerPose, samplePassengerPose } = await load("src/lib/passenger-motion.ts");
const { sampleCopilotDance } = await load("src/lib/copilot-dance.ts");
const { PARTY_BEAT_SECONDS } = await load("src/lib/party-rhythm.ts");
const { createZoneLoopOrder, getActiveZoneLoopState, getZoneSlotCenterZ, mulberry32 } = await load("src/lib/world-route.ts");

// 1. Formatage des noms GPU WebGL2 / ANGLE
assert.equal(
  formatGpuLabel("ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)"),
  "NVIDIA GeForce RTX 4070",
);
assert.equal(
  formatGpuLabel("ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2), OpenGL 4.6)"),
  "Mesa Intel(R) UHD Graphics 620",
);
assert.equal(
  formatGpuLabel("ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)"),
  "Apple M2",
);
for (const generic of ["", null, undefined, "WebKit WebGL", "Mozilla"]) {
  assert.equal(formatGpuLabel(generic), "Processeur graphique WebGL2");
}

// 2. Classification matérielle du GPU
const swiftshader = classifyGpuHardware({ renderer: "Google SwiftShader" });
assert.equal(swiftshader.recommendedTier, "low");
assert.equal(swiftshader.canPromoteTier, false);
assert.equal(swiftshader.softwareRenderer, true);

const uhd620 = classifyGpuHardware({
  renderer: "ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2), OpenGL 4.6)",
  hardwareConcurrency: 8,
  deviceMemory: 8,
});
assert.equal(uhd620.recommendedTier, "low");
assert.equal(uhd620.canPromoteTier, false);

const constrained = classifyGpuHardware({
  renderer: "NVIDIA GeForce RTX 4080",
  constrainedNetwork: true,
});
assert.equal(constrained.recommendedTier, "low");
assert.equal(constrained.canPromoteTier, false);

const entryMobile = classifyGpuHardware({
  coarsePointer: true,
  shortSide: 390,
  hardwareConcurrency: 4,
  deviceMemory: 4,
  renderer: "Mali-G57",
});
assert.equal(entryMobile.recommendedTier, "low");
assert.equal(entryMobile.canPromoteTier, false);

const flagshipMobile = classifyGpuHardware({
  coarsePointer: true,
  shortSide: 390,
  hardwareConcurrency: 8,
  deviceMemory: 8,
  renderer: "Adreno (TM) 740",
});
assert.equal(flagshipMobile.recommendedTier, "high");
assert.equal(flagshipMobile.canPromoteTier, true);

const maskedAndroidPhone = classifyGpuHardware({
  coarsePointer: true,
  shortSide: 412,
  hardwareConcurrency: 8,
  deviceMemory: 4,
  renderer: "ANGLE (Qualcomm, Vulkan 1.3.251 Driver 0.0, OpenGL ES 3.2)",
});
assert.equal(maskedAndroidPhone.recommendedTier, "medium");
assert.equal(maskedAndroidPhone.canPromoteTier, true);

const maskedHighPhone = classifyGpuHardware({
  coarsePointer: true,
  shortSide: 412,
  hardwareConcurrency: 8,
  deviceMemory: 8,
  maxTextureSize: 16384,
  maxSamples: 4,
  renderer: null,
});
assert.equal(maskedHighPhone.recommendedTier, "high");
assert.equal(maskedHighPhone.canPromoteTier, true);

for (const strongPhone of [
  { renderer: "Apple GPU", hardwareConcurrency: 6, deviceMemory: 8 },
  { renderer: "Samsung Xclipse 940", hardwareConcurrency: 8, deviceMemory: 8 },
  { renderer: "Mali-G715", hardwareConcurrency: 8, deviceMemory: 8 },
]) {
  const info = classifyGpuHardware({ coarsePointer: true, shortSide: 393, ...strongPhone });
  assert.equal(info.recommendedTier, "high");
  assert.equal(info.canPromoteTier, true);
}

const iphoneClamped = classifyGpuHardware({
  coarsePointer: true,
  shortSide: 390,
  hardwareConcurrency: 4,
  deviceMemory: 8,
  maxTextureSize: 4096,
  renderer: "Apple GPU",
});
assert.equal(iphoneClamped.recommendedTier, "medium");
assert.equal(iphoneClamped.canPromoteTier, true);

for (const highRenderer of ["Apple M2", "NVIDIA GeForce RTX 3060"]) {
  const info = classifyGpuHardware({ renderer: highRenderer, hardwareConcurrency: 8, deviceMemory: 16 });
  assert.equal(info.recommendedTier, "high");
  assert.equal(info.canPromoteTier, true);
}

for (const ultraRenderer of [
  "ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)",
  "Apple M3 Max",
]) {
  const info = classifyGpuHardware({ renderer: ultraRenderer, hardwareConcurrency: 12, deviceMemory: 16 });
  assert.equal(info.recommendedTier, "ultra");
  assert.equal(info.canPromoteTier, false);
}

// 3. Validation et normalisation des réglages utilisateur
assert.deepEqual(sanitizeGraphicsSettings(null), DEFAULT_GRAPHICS_SETTINGS);
assert.deepEqual(
  sanitizeGraphicsSettings({ preset: "invalid", drawDistance: 42, shadows: "nope", adaptiveFps: "false" }),
  DEFAULT_GRAPHICS_SETTINGS,
);
const partial = sanitizeGraphicsSettings({ preset: "ultra", shadows: "off" });
assert.deepEqual(partial, {
  preset: "ultra",
  drawDistance: "auto",
  pixelQuality: "auto",
  shadows: "off",
  worldDensity: "auto",
  adaptiveFps: true,
});
assert.equal(isDefaultGraphicsSettings(DEFAULT_GRAPHICS_SETTINGS), true);
assert.equal(isDefaultGraphicsSettings(partial), false);

// 4. Croissance cohérente des profils de low à ultra + surcharges indépendantes
const tierProfiles = TIER_ORDER.map((tier) => resolveGraphicsProfile(DEFAULT_GRAPHICS_SETTINGS, tier, 2));
for (let i = 1; i < tierProfiles.length; i++) {
  assert(tierProfiles[i].fogFar > tierProfiles[i - 1].fogFar, "fogFar grows across tiers");
  assert(tierProfiles[i].islandCullDistance > tierProfiles[i - 1].islandCullDistance, "islandCullDistance grows across tiers");
  assert(tierProfiles[i].maxDpr >= tierProfiles[i - 1].maxDpr, "maxDpr grows across tiers");
  assert(tierProfiles[i].detailedPassengerLimit > tierProfiles[i - 1].detailedPassengerLimit, "detailedPassengerLimit grows across tiers");
}
assert.equal(tierProfiles[0].lowPower, true);
assert(tierProfiles.slice(1).every((p) => p.lowPower === false));

const mixedOverride = resolveGraphicsProfile(
  sanitizeGraphicsSettings({
    preset: "low",
    drawDistance: "max",
    pixelQuality: "native",
    shadows: "high",
    worldDensity: "rich",
  }),
  "high",
  2,
);
assert.equal(mixedOverride.activeTier, "low");
assert.equal(mixedOverride.fogFar, tierProfiles[3].fogFar);
assert.equal(mixedOverride.maxDpr, tierProfiles[3].maxDpr);
assert.equal(mixedOverride.canvasShadows, "soft");
assert.equal(mixedOverride.shadowMapSize, 2048);
assert.equal(mixedOverride.detailedPassengerLimit, tierProfiles[2].detailedPassengerLimit);

// 5. Budgets géométriques (pont min 960 m et long bus sécurisé)
for (const profile of tierProfiles) {
  const shortBudgets = getSceneGeometryBudgets(profile, 9.2, getExteriorMaxDistance(9.2));
  assert(shortBudgets.bridgeLength >= 960, "bridgeLength must stay >= 960 m marking box");
}
const longCabin = 400;
const lowOnLongBus = getSceneGeometryBudgets(
  tierProfiles[0],
  longCabin,
  getExteriorMaxDistance(longCabin),
);
assert(lowOnLongBus.fogFar >= 760);
assert(lowOnLongBus.cameraFar >= getBusCameraFar(longCabin, tierProfiles[0].baseCameraFar));
assert(lowOnLongBus.bridgeLength >= longCabin + lowOnLongBus.fogFar * 2);
assert(lowOnLongBus.islandCullDistance >= lowOnLongBus.fogFar + 15);

// 6. Régulation FPS -> DPR d'abord -> rétrogradation de palier sans ping-pong
const monitor = createPerformanceMonitor({
  tier: "high",
  recommendedTier: "high",
  canPromoteTier: true,
  initialDpr: tierProfiles[2].maxDpr,
});

const stepWindow = (fps, count = 1, activeTier = monitor.tier, adaptiveFps = true, isAutoPreset = true) => {
  const profile = resolveGraphicsProfile(DEFAULT_GRAPHICS_SETTINGS, activeTier, 2);
  const dt = 1 / fps;
  const steps = Math.ceil(2 / dt);
  let last = { dprChanged: false, tierChanged: false, dpr: monitor.dpr, tier: monitor.tier, fps: null };
  for (let w = 0; w < count; w++) {
    for (let s = 0; s < steps; s++) {
      last = sampleScenePerformance(monitor, dt, {
        minDpr: profile.minDpr,
        maxDpr: profile.maxDpr,
        adaptiveFps,
        isAutoPreset,
      });
    }
  }
  return last;
};

// Warmup initial de 2.5 s : ne pas réagir avant qu'il ne s'écoule
for (let i = 0; i < 8; i++) {
  const warmupRes = sampleScenePerformance(monitor, 0.25, {
    minDpr: 1.0,
    maxDpr: 1.75,
    adaptiveFps: true,
    isAutoPreset: true,
  });
  assert.equal(warmupRes.dprChanged, false);
  assert.equal(warmupRes.tierChanged, false);
}
// Finir les 0.5s de warmup restants
sampleScenePerformance(monitor, 0.25, { minDpr: 1.0, maxDpr: 1.75, adaptiveFps: true, isAutoPreset: true });
sampleScenePerformance(monitor, 0.25, { minDpr: 1.0, maxDpr: 1.75, adaptiveFps: true, isAutoPreset: true });

// À 20 FPS, le DPR baisse d'abord par paliers avant de rétrograder le palier 3D
const firstDrop = stepWindow(20, 1);
assert.equal(firstDrop.dprChanged, true);
assert(firstDrop.dpr < 1.75);
assert.equal(firstDrop.tierChanged, false);

// Laisser passer les cooldowns jusqu'à atteindre le plancher minDpr = 1.0 puis rétrograder vers medium
for (let w = 0; w < 10 && monitor.tier === "high"; w++) {
  stepWindow(20, 1);
}
assert.equal(monitor.tier, "medium");
assert.equal(monitor.demotedCeiling, "medium");

syncPerformanceMonitorProfile(monitor, {
  tier: "medium",
  recommendedTier: "high",
  canPromoteTier: true,
  maxDpr: tierProfiles[1].maxDpr,
  minDpr: tierProfiles[1].minDpr,
});

// Même avec un long passage à 60 FPS, demotedCeiling interdit le ping-pong vers "high"
stepWindow(60, 15, "medium");
assert.equal(monitor.tier, "medium", "demotedCeiling prevents oscillation back to high");

// Vérifier le respect strict de adaptiveFps = false
const lockedRes = sampleScenePerformance(monitor, 0.1, {
  minDpr: 0.75,
  maxDpr: 1.35,
  adaptiveFps: false,
  isAutoPreset: true,
});
assert.equal(lockedRes.dpr, 1.35);
assert.equal(lockedRes.tierChanged, false);

// Rétrocompatibilité sampleSceneDpr & limites d'occupation
const legacyDpr = createDprSample(1.5);
for (let i = 0; i < 40; i++) sampleSceneDpr(legacyDpr, 0.05, 1.5, 1);
assert(legacyDpr.dpr < 1.5);

const customOcc = getBusOccupancy({
  passengerCount: 50,
  seatCapacity: 50,
  reservedRow: 2,
  currentPassengerIndex: null,
  avatarAboard: false,
  lowPower: false,
  detailLimit: 14,
  simplifiedLimit: 12,
});
assert.equal(customOcc.detailed.length, 14);
assert.equal(customOcc.simplified.length, 12);

// 8. Non-disparition des passagers proches quand la caméra bouge sous plafond réduit
for (const targetRow of [16, 17]) {
  const focusZ = getSeatRowZ(targetRow);
  const nearFocusOcc = getBusOccupancy({
    passengerCount: 240,
    seatCapacity: 240,
    reservedRow: 2,
    currentPassengerIndex: null,
    avatarAboard: false,
    lowPower: false,
    detailLimit: 5,
    simplifiedLimit: 120,
    detailFocus: { x: targetRow === 16 ? 0 : 1.2, z: focusZ },
  });
  const renderedIndices = new Set([
    ...nearFocusOcc.detailed.map((o) => o.index),
    ...nearFocusOcc.simplified.map((o) => o.index),
  ]);
  for (let idx = 48; idx < 84; idx++) {
    assert(renderedIndices.has(idx), `nearby seat ${idx} remains rendered around row=${targetRow}`);
  }
}

// 9. Détection GPU étendue (Vulkan/Mesa/RTX sans GeForce/masqué) et promotion à 55 FPS
assert.equal(
  classifyGpuHardware({
    renderer: "NVIDIA RTX 4060",
    coarsePointer: false,
    hardwareConcurrency: 12,
    deviceMemory: 8,
  }).recommendedTier,
  "ultra",
);
assert.equal(
  classifyGpuHardware({
    renderer: "AMD Radeon Graphics (radeonsi, navi31, LLVM 17.0.6, DRM 3.57)",
    coarsePointer: false,
    hardwareConcurrency: 16,
    deviceMemory: 8,
  }).recommendedTier,
  "ultra",
);
const maskedDesktop = classifyGpuHardware({
  renderer: "ANGLE (NVIDIA, Vulkan 1.3.280 Driver 555.0)",
  coarsePointer: false,
  hardwareConcurrency: 8,
  deviceMemory: 8,
});
assert.equal(maskedDesktop.recommendedTier, "high");
assert.equal(maskedDesktop.canPromoteTier, true);

const strongIgpu = classifyGpuHardware({
  renderer: "Intel(R) Iris(R) Xe Graphics",
  coarsePointer: false,
  hardwareConcurrency: 8,
  deviceMemory: 8,
});
assert.equal(strongIgpu.recommendedTier, "medium");
assert.equal(strongIgpu.canPromoteTier, true);

const promoteMonitor = createPerformanceMonitor({
  tier: "high",
  recommendedTier: "high",
  canPromoteTier: true,
  initialDpr: tierProfiles[2].maxDpr,
});
for (let i = 0; i < 10; i++) {
  sampleScenePerformance(promoteMonitor, 0.25, {
    minDpr: tierProfiles[2].minDpr,
    maxDpr: tierProfiles[2].maxDpr,
    adaptiveFps: true,
    isAutoPreset: true,
  });
}
for (let w = 0; w < 3; w++) {
  const steps = Math.ceil(2 / (1 / 56)) + 2;
  for (let s = 0; s < steps; s++) {
    sampleScenePerformance(promoteMonitor, 1 / 56, {
      minDpr: tierProfiles[2].minDpr,
      maxDpr: tierProfiles[2].maxDpr,
      adaptiveFps: true,
      isAutoPreset: true,
    });
  }
}
assert.equal(promoteMonitor.tier, "ultra", "sustained ~56 FPS on high desktop promotes smoothly to ultra");

const mediumPromoteMonitor = createPerformanceMonitor({
  tier: "medium",
  recommendedTier: "medium",
  canPromoteTier: true,
  initialDpr: tierProfiles[1].maxDpr,
});
for (let i = 0; i < 10; i++) {
  sampleScenePerformance(mediumPromoteMonitor, 0.25, {
    minDpr: tierProfiles[1].minDpr,
    maxDpr: tierProfiles[1].maxDpr,
    adaptiveFps: true,
    isAutoPreset: true,
  });
}
for (let w = 0; w < 3; w++) {
  const steps = Math.ceil(2 / (1 / 55)) + 2;
  for (let s = 0; s < steps; s++) {
    sampleScenePerformance(mediumPromoteMonitor, 1 / 55, {
      minDpr: tierProfiles[1].minDpr,
      maxDpr: tierProfiles[1].maxDpr,
      adaptiveFps: true,
      isAutoPreset: true,
    });
  }
}
assert.equal(mediumPromoteMonitor.tier, "high", "sustained 55 FPS on medium promotes cleanly to high");

// 7. Physique des créatures marines (sortie de l'eau, saut balistique, plongeon, distance aux plages)
for (const motion of ["breach", "surface", "rise"]) {
  const duration = getSeaCreatureDuration(motion);
  const sampleAt = (p) => sampleSeaCreaturePose({
    motion,
    p,
    duration,
    local: p * duration,
    cycle: 0,
    side: 1,
    direction: -1,
    worldZ: 0,
    scroll: 100,
    waterTime: p * duration,
    busSpeed: 16,
    reducedMotion: false,
  });
  const start = sampleAt(0);
  const mid = sampleAt(0.43);
  const end = sampleAt(1);
  assert(start.height < -14, `${motion} starts submerged`);
  assert(end.height < -14, `${motion} dives back deeply underwater without staying out`);
  for (let step = 0; step <= 20; step++) {
    const sample = sampleAt(step / 20);
    assert(Math.abs(sample.x) >= 68, `${motion} stays clear of beaches`);
  }
  if (motion === "breach") {
    const rising = sampleAt(0.28);
    const diving = sampleAt(0.58);
    assert(mid.height > 4 && mid.height < 6.5, "breach leaps naturally without floating in the sky");
    assert(rising.pitch < -0.5, "breach points nose up on water exit");
    assert(diving.pitch > 0.5, "breach points nose down on dive entry");
    assert(mid.jointGain < rising.jointGain, "tail wiggle calms gracefully while airborne");
  }
}

// 10. Confettis répartis sur tout le bus (taille réduite) et danses variées/aléatoires en fête
const seeds = createConfettiSeeds(2400, 40);
assert.equal(seeds.length, 2400);
const globalFraction = seeds.filter((s) => !s.local).length / seeds.length;
assert(globalFraction > 0.75, "over 75% of confetti spread across full bus length");
assert(seeds.every((s) => s.scale <= 1.2), "confetti scales remain compact");
const introSeeds = seeds.slice(0, 180);
const introGlobal = introSeeds.filter((s) => !s.local);
assert(
  introGlobal.some((s) => s.z < 0.25)
  && introGlobal.some((s) => s.z >= 0.4 && s.z <= 0.6)
  && introGlobal.some((s) => s.z > 0.75),
  "intro confetti evenly covers front, middle and back of the bus",
);

const snapshotSignatures = new Set();
let hasHighReach = false;
let hasModerateHeight = false;
const beatTime = 2 * PARTY_BEAT_SECONDS;
const quarterBeatTime = beatTime + PARTY_BEAT_SECONDS / 4;
for (let idx = 0; idx < 16; idx++) {
  const poseStart = createPassengerPose();
  const poseHalf = createPassengerPose();
  const poseQ1 = createPassengerPose();
  const poseQ3 = createPassengerPose();
  samplePassengerPose(poseStart, beatTime, idx, 0, 0.32, Infinity, true, false, "nakama");
  samplePassengerPose(poseHalf, beatTime + PARTY_BEAT_SECONDS / 2, idx, 0, 0.32, Infinity, true, false, "nakama");
  samplePassengerPose(poseQ1, quarterBeatTime, idx, 0, 0.32, Infinity, true, false, "nakama");
  samplePassengerPose(poseQ3, quarterBeatTime + PARTY_BEAT_SECONDS / 2, idx, 0, 0.32, Infinity, true, false, "nakama");
  snapshotSignatures.add(`${poseStart.leftX.toFixed(2)}:${poseStart.rightX.toFixed(2)}:${poseQ1.leftX.toFixed(2)}`);
  if (Math.max(poseStart.leftX, poseStart.rightX, poseHalf.leftX, poseHalf.rightX, poseQ1.leftX, poseQ1.rightX) >= 2.65) hasHighReach = true;
  if (Math.min(poseStart.leftX, poseStart.rightX, poseHalf.leftX, poseHalf.rightX, poseQ1.leftX, poseQ1.rightX) < 2.5) hasModerateHeight = true;
  const maxSwing = Math.max(
    Math.abs(poseStart.leftX - poseHalf.leftX),
    Math.abs(poseStart.rightX - poseHalf.rightX),
    Math.abs(poseQ1.leftX - poseQ3.leftX),
    Math.abs(poseQ1.rightX - poseQ3.rightX),
  );
  assert(maxSwing >= 0.7, `passenger ${idx} maintains energetic rhythmic arm swing`);
}
assert(snapshotSignatures.size >= 5, "passengers do not all perform the same dance simultaneously");
assert(hasHighReach && hasModerateHeight, "crowd mixes high overhead reaches with moderate grooves");

let p0High = false;
let p0Moderate = false;
for (let phrase = 0; phrase < 8; phrase++) {
  const t0 = phrase * DANCE_PHASE_DURATION + 1.2;
  const pA = createPassengerPose();
  const pB = createPassengerPose();
  samplePassengerPose(pA, t0, 3, 0, 0.32, Infinity, true, false, "nakama");
  samplePassengerPose(pB, t0 + PARTY_BEAT_SECONDS / 2, 3, 0, 0.32, Infinity, true, false, "nakama");
  if (Math.max(pA.leftX, pA.rightX, pB.leftX, pB.rightX) >= 2.65) p0High = true;
  if (Math.min(pA.leftX, pA.rightX, pB.leftX, pB.rightX) < 2.5) p0Moderate = true;
}
assert(p0High && p0Moderate, "an individual passenger alternates between high overhead and moderate heights over phrases");

for (let phrase = 0; phrase < 6; phrase++) {
  const shanksPose = createPassengerPose();
  samplePassengerPose(shanksPose, phrase * DANCE_PHASE_DURATION + 1.2, 14, 0, 0.32, Infinity, true, false, "shanks");
  assert.equal(shanksPose.leftX, 0.12, `Shanks keeps missing left arm still at phrase ${phrase}`);
}

const kytaPoseStart = createPassengerPose();
const kytaPoseHalf = createPassengerPose();
sampleCopilotDance(kytaPoseStart, 0, false);
sampleCopilotDance(kytaPoseHalf, PARTY_BEAT_SECONDS / 2, false);
assert(kytaPoseStart.leftX >= 2.35 && kytaPoseStart.rightElbowX < 0.65, "Kyta lifts arms overhead cleanly");
assert(Math.abs(kytaPoseStart.leftX - kytaPoseHalf.leftX) >= 0.7, "Kyta arms swing widely on the beat");

// 11. Boucle aléatoire complète des 8 îles sans doublon avant le tour suivant
const orderA = createZoneLoopOrder(8, mulberry32(101));
const orderB = createZoneLoopOrder(8, mulberry32(2026));
assert.equal(orderA.length, 8);
assert.equal(new Set(orderA).size, 8, "every island appears once per loop");
assert.notDeepEqual(orderA, orderB, "different seeds produce distinct island orders");
const seenOrder = [];
for (let step = 0; step < 8; step++) {
  const scroll = step * 160;
  const active = getActiveZoneLoopState(scroll, orderA, 160);
  assert.equal(active.slot, step);
  assert.equal(active.visit, 0);
  const centerZ = getZoneSlotCenterZ(step, scroll, 160, 1280, -640, 640);
  assert.equal(centerZ, -40, "active island centers cleanly around the bus");
  seenOrder.push(active.zone);
}
assert.deepEqual(seenOrder, orderA, "islands traverse in exact shuffled order with no duplicates");
const wrapped = getActiveZoneLoopState(8 * 160, orderA, 160);
assert.equal(wrapped.slot, 0);
assert.equal(wrapped.visit, 1);
assert.equal(wrapped.zone, orderA[0], "loop wraps back seamlessly after visiting all 8 islands");

console.log("Scene performance GPU classification, dynamic budgets, hysteresis and sea creature physics passed.");
