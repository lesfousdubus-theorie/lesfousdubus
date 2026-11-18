export function createDprSample(baseDpr: number) {
  return { elapsed: 0, frames: 0, dpr: baseDpr, slowSamples: 0, fastSamples: 0, cooldown: 0 };
}

/** Inclut les images très lentes pour pouvoir se remettre d'une surcharge. */
export function sampleSceneDpr(sample: ReturnType<typeof createDprSample>, dt: number, baseDpr: number, minimumDpr: number) {
  if (!Number.isFinite(dt) || dt <= 0) return null;
  // Le frame loop est suspendu lorsque l'onglet est caché ; cette borne protège
  // d'un gel ponctuel du navigateur ou d'une reprise de contexte sans fausser le DPR.
  sample.elapsed += Math.min(dt, 0.25);
  sample.frames += 1;
  if (sample.elapsed < 2) return null;
  const fps = sample.frames / sample.elapsed;
  sample.cooldown = Math.max(0, sample.cooldown - sample.elapsed);
  sample.slowSamples = fps < 46 ? sample.slowSamples + 1 : 0;
  sample.fastSamples = fps > 57 ? sample.fastSamples + 1 : 0;
  let next = sample.dpr;
  if (sample.cooldown === 0 && (fps < 25 || sample.slowSamples >= 2)) {
    next = Math.max(minimumDpr, sample.dpr - (fps < 25 ? 0.25 : 0.15));
  } else if (sample.cooldown === 0 && sample.fastSamples >= 4) {
    next = Math.min(baseDpr, sample.dpr + 0.1);
  }
  sample.elapsed = 0; sample.frames = 0;
  if (Math.abs(next - sample.dpr) < 0.04) return null;
  sample.dpr = next;
  sample.slowSamples = 0; sample.fastSamples = 0;
  // Recréer les buffers une fois, puis laisser le rendu se stabiliser.
  sample.cooldown = fps < 25 ? 4 : 8;
  return next;
}

export type GraphicsQualityTier = "low" | "medium" | "high" | "ultra";
export type GraphicsPresetPreference = "auto" | GraphicsQualityTier;
export type DrawDistancePreference = "auto" | "near" | "medium" | "far" | "max";
export type PixelQualityPreference = "auto" | "eco" | "standard" | "sharp" | "native";
export type ShadowQualityPreference = "auto" | "off" | "standard" | "high";
export type WorldDensityPreference = "auto" | "light" | "balanced" | "rich" | "max";

export interface GraphicsSettings {
  preset: GraphicsPresetPreference;
  drawDistance: DrawDistancePreference;
  pixelQuality: PixelQualityPreference;
  shadows: ShadowQualityPreference;
  worldDensity: WorldDensityPreference;
  adaptiveFps: boolean;
}

export const DEFAULT_GRAPHICS_SETTINGS: GraphicsSettings = {
  preset: "auto",
  drawDistance: "auto",
  pixelQuality: "auto",
  shadows: "auto",
  worldDensity: "auto",
  adaptiveFps: true,
};

export interface GpuHardwareClassificationInput {
  renderer?: string | null;
  maxTextureSize?: number;
  maxSamples?: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  coarsePointer?: boolean;
  shortSide?: number;
  devicePixelRatio?: number;
  constrainedNetwork?: boolean;
}

export interface GpuHardwareInfo {
  renderer: string | null;
  gpuLabel: string;
  recommendedTier: GraphicsQualityTier;
  canPromoteTier: boolean;
  softwareRenderer: boolean;
  mobileDevice: boolean;
  maxTextureSize: number;
  maxSamples: number;
}

export interface ResolvedGraphicsProfile {
  activeTier: GraphicsQualityTier;
  drawDistance: Exclude<DrawDistancePreference, "auto">;
  pixelQuality: Exclude<PixelQualityPreference, "auto">;
  shadows: Exclude<ShadowQualityPreference, "auto">;
  worldDensity: Exclude<WorldDensityPreference, "auto">;
  fogNear: number;
  fogFar: number;
  islandCullDistance: number;
  propCullDistance: number;
  seaCreatureCullAhead: number;
  seaCreatureCullBehind: number;
  bridgeBaseLength: number;
  baseCameraFar: number;
  minDpr: number;
  maxDpr: number;
  antialias: boolean;
  canvasShadows: false | "basic" | "soft";
  shadowMapSize: 1024 | 2048;
  lowPower: boolean;
  propFraction: 0.5 | 0.75 | 1;
  detailedPassengerLimit: number;
  simplifiedPassengerLimit: number;
  seaCreatureSlots: number;
  starCount: number;
  rainCount: number;
  snowCount: number;
}

export interface SceneGeometryBudgets {
  fogNear: number;
  fogFar: number;
  islandCullDistance: number;
  propCullDistance: number;
  bridgeLength: number;
  cameraFar: number;
}

export interface SceneGraphicsTelemetry {
  gpuLabel: string;
  recommendedTier: GraphicsQualityTier;
  activeTier: GraphicsQualityTier;
  currentDpr: number;
  fogFar: number;
}

export const TIER_ORDER: readonly GraphicsQualityTier[] = ["low", "medium", "high", "ultra"];

const PRESET_VALUES = new Set<GraphicsPresetPreference>(["auto", "low", "medium", "high", "ultra"]);
const DRAW_DISTANCE_VALUES = new Set<DrawDistancePreference>(["auto", "near", "medium", "far", "max"]);
const PIXEL_QUALITY_VALUES = new Set<PixelQualityPreference>(["auto", "eco", "standard", "sharp", "native"]);
const SHADOW_QUALITY_VALUES = new Set<ShadowQualityPreference>(["auto", "off", "standard", "high"]);
const WORLD_DENSITY_VALUES = new Set<WorldDensityPreference>(["auto", "light", "balanced", "rich", "max"]);

function pickOption<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return typeof value === "string" && allowed.has(value as T) ? (value as T) : fallback;
}

/** Valide et normalise les réglages graphiques persistés localement. */
export function sanitizeGraphicsSettings(raw: unknown): GraphicsSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_GRAPHICS_SETTINGS };
  const record = raw as Record<string, unknown>;
  return {
    preset: pickOption(record.preset, PRESET_VALUES, DEFAULT_GRAPHICS_SETTINGS.preset),
    drawDistance: pickOption(record.drawDistance, DRAW_DISTANCE_VALUES, DEFAULT_GRAPHICS_SETTINGS.drawDistance),
    pixelQuality: pickOption(record.pixelQuality, PIXEL_QUALITY_VALUES, DEFAULT_GRAPHICS_SETTINGS.pixelQuality),
    shadows: pickOption(record.shadows, SHADOW_QUALITY_VALUES, DEFAULT_GRAPHICS_SETTINGS.shadows),
    worldDensity: pickOption(record.worldDensity, WORLD_DENSITY_VALUES, DEFAULT_GRAPHICS_SETTINGS.worldDensity),
    adaptiveFps: typeof record.adaptiveFps === "boolean" ? record.adaptiveFps : DEFAULT_GRAPHICS_SETTINGS.adaptiveFps,
  };
}

export function isDefaultGraphicsSettings(settings: GraphicsSettings): boolean {
  return settings.preset === DEFAULT_GRAPHICS_SETTINGS.preset
    && settings.drawDistance === DEFAULT_GRAPHICS_SETTINGS.drawDistance
    && settings.pixelQuality === DEFAULT_GRAPHICS_SETTINGS.pixelQuality
    && settings.shadows === DEFAULT_GRAPHICS_SETTINGS.shadows
    && settings.worldDensity === DEFAULT_GRAPHICS_SETTINGS.worldDensity
    && settings.adaptiveFps === DEFAULT_GRAPHICS_SETTINGS.adaptiveFps;
}

const GENERIC_GPU_NAMES = /^(webgl|webgl2|webkit webgl|mozilla|angle|unknown|)$/i;

/** Simplifie les chaînes techniques ANGLE / OpenGL / Direct3D en nom lisible de GPU. */
export function formatGpuLabel(renderer: string | null | undefined): string {
  if (!renderer) return "Processeur graphique WebGL2";
  let cleaned = renderer.trim();
  if (!cleaned || GENERIC_GPU_NAMES.test(cleaned)) return "Processeur graphique WebGL2";

  if (/^ANGLE\s*\(/i.test(cleaned) && cleaned.endsWith(")")) {
    const start = cleaned.indexOf("(") + 1;
    const inner = cleaned.slice(start, -1);
    const parts: string[] = [];
    let depth = 0;
    let chunkStart = 0;
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === "(") depth += 1;
      else if (ch === ")" && depth > 0) depth -= 1;
      else if (ch === "," && depth === 0) {
        const chunk = inner.slice(chunkStart, i).trim();
        if (chunk) parts.push(chunk);
        chunkStart = i + 1;
      }
    }
    const tail = inner.slice(chunkStart).trim();
    if (tail) parts.push(tail);
    if (parts.length >= 2) {
      const second = parts[1].replace(/\b(?:Direct3D(?:9Ex|9|11|12)|OpenGL|Vulkan)\b[^,]*/gi, "").trim();
      cleaned = second || parts[0];
    } else if (parts.length === 1) {
      cleaned = parts[0];
    }
  }

  cleaned = cleaned
    .replace(/^ANGLE Metal Renderer:\s*/i, "")
    .replace(/\bDirect3D(?:9Ex|9|11|12)\b[^,]*/gi, "")
    .replace(/\b(?:OpenGL|Vulkan)\s+\d+(?:\.\d+)*[^,]*/gi, "")
    .replace(/\b(?:vs|ps)_\d+_\d+\b/gi, "")
    .replace(/\bUnspecified Version\b/gi, "")
    .replace(/\(\s*(?:KBL|CFL|WHL|ICL|TGL|ADL|RPL|MTL|GEN\d+|GT\d+|LLVM|DRM|TM|radeonsi|iris|crocus|zink|amdgpu|nouveau|llvmpipe|virgl)[^)]*\)/gi, (match) =>
      match.toLowerCase() === "(tm)" || match.toLowerCase() === "(r)" ? match : "",
    )
    .replace(/\s+\/\s*(?:PCIe|SSE\d|OPENGL)[^,]*$/i, "")
    .replace(/,?\s*\bor similar\b/gi, " (ou similaire)")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,\s-]+|[,\s-]+$/g, "");

  if (!cleaned || GENERIC_GPU_NAMES.test(cleaned)) return "Processeur graphique WebGL2";
  return cleaned.length > 56 ? `${cleaned.slice(0, 53).trimEnd()}…` : cleaned;
}

const SOFTWARE_RENDERER_RE = /swiftshader|llvmpipe|softpipe|software|basic render driver|gdi generic/i;
const WEAK_GPU_RE = /mali-4|mali-t|mali-g3|mali-g5[12]|adreno\s*(?:[2345]\d{2}|61\d)|powervr|videocore|hd graphics\s*[23456]\d{2}|uhd graphics\s*6\d{2}|celeron|pentium|atom|geforce\s*(?:gt\s*[2-7]\d{2}|mx\s*[12]\d{2})/i;
const ULTRA_FLAGSHIP_MOBILE_GPU_RE = /adreno\s*(?:7[45]\d|8\d{2})|immortalis|xclipse\s*9[24]\d|mali-g(?:71[05]|72\d|92\d)/i;
const HIGH_END_MOBILE_GPU_RE = /adreno\s*(?:6[456]\d|7[123]\d)|xclipse|mali-g(?:6[18]\d?|7[6789])|maleoon|apple gpu/i;
const ULTRA_DESKTOP_GPU_RE = /(?:geforce\s+)?rtx\s*(?:20[789]\d|30[789]\d|40[6789]\d|50\d{2}|a[456]\d{3}|[456]\d{3}\s*ada)|(?:radeon\s+)?rx\s*(?:6[789]\d{2}|7[789]\d{2}|90[6789]\d)|radeon\s+pro\s+(?:w[67]\d{3}|v\d{3})|navi2[12]|navi3[123]|navi4\d|gfx1[12]\d{2}|arc\s*(?:a7\d{2}|b[57]\d{2})|apple\s+m[1-9]\s*(?:pro|max|ultra)|apple\s+m[3-9]\b/i;
const HIGH_GPU_RE = /(?:geforce\s+)?(?:rtx|gtx\s*(?:10[678]\d|16[56]\d|9[78]\d))|(?:radeon\s+)?rx\s*(?:4[789]\d|5[789]\d|5[567]\d{2}|6[456]\d{2}|7[56]\d{2})|radeon\s*(?:780m|880m|890m|vega\s*(?:56|64)|vii)|arc\s*(?:a[357]\d{2}|b[57]\d{2}|1[34]0[vt])|nvidia\s+(?:quadro|t\d{3,4}|a\d{3,4})|navi\d+|gfx10\d{2}|apple\s+m[1-9]\b/i;
const MODERN_INTEGRATED_GPU_RE = /iris|arc\s*graphics|uhd graphics\s*7\d{2}|uhd graphics\b|radeon\s*(?:6[168]0m|7[46]0m|vega|graphics)|gtx\s*(?:9[56]\d)/i;

/** Classe la puce graphique WebGL2 et les indices matériels en un palier initial recommandé. */
export function classifyGpuHardware(input: GpuHardwareClassificationInput = {}): GpuHardwareInfo {
  const renderer = input.renderer?.trim() || null;
  const maxTextureSize = input.maxTextureSize ?? 8192;
  const maxSamples = input.maxSamples ?? 4;
  const hardwareConcurrency = input.hardwareConcurrency ?? 8;
  const deviceMemory = input.deviceMemory ?? 8;
  const coarsePointer = Boolean(input.coarsePointer);
  const shortSide = input.shortSide ?? 900;
  const devicePixelRatio = input.devicePixelRatio ?? 1;
  const constrainedNetwork = Boolean(input.constrainedNetwork);

  const mobileDevice = coarsePointer && shortSide < 900;
  const gpuLabel = formatGpuLabel(renderer);
  const normalized = `${renderer ?? ""} ${gpuLabel}`
    .replace(/\((?:r|tm|c)\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const softwareRenderer = normalized.length > 0 && SOFTWARE_RENDERER_RE.test(normalized);
  // Firefox (SanitizeRenderer) remplace de nombreux GPU récents par un modèle générique suivi de ", or similar".
  const sanitizedBucket = /\bor similar\b/i.test(renderer ?? "");
  const genericRenderer = normalized.length === 0 || GENERIC_GPU_NAMES.test(gpuLabel) || sanitizedBucket;

  let recommendedTier: GraphicsQualityTier = "medium";
  let canPromoteTier = true;

  if (
    constrainedNetwork
    || softwareRenderer
    || maxTextureSize < 2048
    || hardwareConcurrency <= 1
    || (hardwareConcurrency <= 2 && deviceMemory <= 4)
    || deviceMemory <= 2
  ) {
    recommendedTier = "low";
    canPromoteTier = false;
  } else if (!sanitizedBucket && WEAK_GPU_RE.test(normalized)) {
    recommendedTier = "low";
    canPromoteTier = false;
  } else if (sanitizedBucket) {
    if (mobileDevice) {
      if (hardwareConcurrency <= 4 && deviceMemory <= 4 && devicePixelRatio < 2) {
        recommendedTier = "low";
        canPromoteTier = false;
      } else if (hardwareConcurrency >= 8 && deviceMemory >= 8 && maxTextureSize >= 8192 && devicePixelRatio >= 2) {
        recommendedTier = "high";
        canPromoteTier = true;
      } else {
        recommendedTier = "medium";
        canPromoteTier = true;
      }
    } else if (/geforce|radeon|apple m/i.test(normalized) && hardwareConcurrency >= 8 && deviceMemory >= 8) {
      recommendedTier = "high";
      canPromoteTier = true;
    } else {
      recommendedTier = "medium";
      canPromoteTier = true;
    }
  } else if (mobileDevice) {
    if (ULTRA_FLAGSHIP_MOBILE_GPU_RE.test(normalized)) {
      if (hardwareConcurrency >= 6) {
        recommendedTier = "high";
        canPromoteTier = true;
      } else {
        recommendedTier = "medium";
        canPromoteTier = true;
      }
    } else if (HIGH_END_MOBILE_GPU_RE.test(normalized)) {
      if (
        (/apple gpu/i.test(normalized) && hardwareConcurrency >= 6)
        || (hardwareConcurrency >= 8 && deviceMemory >= 8 && maxTextureSize >= 8192)
      ) {
        recommendedTier = "high";
        canPromoteTier = true;
      } else {
        recommendedTier = "medium";
        canPromoteTier = true;
      }
    } else if (hardwareConcurrency <= 4 && deviceMemory <= 4 && devicePixelRatio < 2) {
      recommendedTier = "low";
      canPromoteTier = false;
    } else if (
      hardwareConcurrency >= 8
      && deviceMemory >= 8
      && maxTextureSize >= 8192
    ) {
      // Téléphone puissant dont le navigateur masque le nom exact du GPU (Firefox Android / Chrome / WebKit).
      recommendedTier = "high";
      canPromoteTier = true;
    } else {
      recommendedTier = "medium";
      canPromoteTier = true;
    }
  } else if (
    ULTRA_DESKTOP_GPU_RE.test(normalized)
    || (/apple gpu/i.test(normalized) && !coarsePointer && hardwareConcurrency >= 12)
  ) {
    recommendedTier = "ultra";
    canPromoteTier = false;
  } else if (
    HIGH_GPU_RE.test(normalized)
    || (/apple gpu/i.test(normalized) && !coarsePointer && hardwareConcurrency >= 8)
  ) {
    recommendedTier = "high";
    canPromoteTier = true;
  } else if (MODERN_INTEGRATED_GPU_RE.test(normalized)) {
    if (hardwareConcurrency <= 4 && deviceMemory <= 4) {
      recommendedTier = "low";
      canPromoteTier = true;
    } else if (!coarsePointer && hardwareConcurrency >= 12 && deviceMemory >= 8) {
      recommendedTier = "high";
      canPromoteTier = true;
    } else {
      recommendedTier = "medium";
      canPromoteTier = true;
    }
  } else if (genericRenderer || !coarsePointer) {
    if (hardwareConcurrency <= 4 && deviceMemory <= 4) {
      recommendedTier = "low";
      canPromoteTier = true;
    } else if (
      !coarsePointer
      && ((hardwareConcurrency >= 6 && deviceMemory >= 8)
        || (maxTextureSize >= 8192 && maxSamples >= 4 && hardwareConcurrency >= 6 && deviceMemory >= 6))
    ) {
      recommendedTier = "high";
      canPromoteTier = true;
    } else {
      recommendedTier = "medium";
      canPromoteTier = true;
    }
  }

  return {
    renderer,
    gpuLabel,
    recommendedTier,
    canPromoteTier,
    softwareRenderer,
    mobileDevice,
    maxTextureSize,
    maxSamples,
  };
}

const TIER_DEFAULTS: Record<GraphicsQualityTier, {
  drawDistance: Exclude<DrawDistancePreference, "auto">;
  pixelQuality: Exclude<PixelQualityPreference, "auto">;
  shadows: Exclude<ShadowQualityPreference, "auto">;
  worldDensity: Exclude<WorldDensityPreference, "auto">;
}> = {
  low: { drawDistance: "near", pixelQuality: "eco", shadows: "off", worldDensity: "light" },
  medium: { drawDistance: "medium", pixelQuality: "standard", shadows: "standard", worldDensity: "balanced" },
  high: { drawDistance: "far", pixelQuality: "sharp", shadows: "high", worldDensity: "rich" },
  ultra: { drawDistance: "max", pixelQuality: "native", shadows: "high", worldDensity: "max" },
};

const DRAW_DISTANCE_TABLE: Record<Exclude<DrawDistancePreference, "auto">, {
  fogNear: number;
  fogFar: number;
  islandCullDistance: number;
  propCullDistance: number;
  seaCreatureCullAhead: number;
  seaCreatureCullBehind: number;
  bridgeBaseLength: number;
  baseCameraFar: number;
}> = {
  near: {
    fogNear: 55,
    fogFar: 210,
    islandCullDistance: 225,
    propCullDistance: 195,
    seaCreatureCullAhead: 210,
    seaCreatureCullBehind: 190,
    bridgeBaseLength: 960,
    baseCameraFar: 900,
  },
  medium: {
    fogNear: 85,
    fogFar: 330,
    islandCullDistance: 350,
    propCullDistance: 320,
    seaCreatureCullAhead: 320,
    seaCreatureCullBehind: 270,
    bridgeBaseLength: 1200,
    baseCameraFar: 1350,
  },
  far: {
    fogNear: 125,
    fogFar: 450,
    islandCullDistance: 475,
    propCullDistance: 445,
    seaCreatureCullAhead: 420,
    seaCreatureCullBehind: 340,
    bridgeBaseLength: 1600,
    baseCameraFar: 2000,
  },
  max: {
    fogNear: 180,
    fogFar: 575,
    islandCullDistance: 680,
    propCullDistance: 650,
    seaCreatureCullAhead: 520,
    seaCreatureCullBehind: 440,
    bridgeBaseLength: 2400,
    baseCameraFar: 2600,
  },
};

const SHADOW_TABLE: Record<Exclude<ShadowQualityPreference, "auto">, {
  canvasShadows: false | "basic" | "soft";
  shadowMapSize: 1024 | 2048;
}> = {
  off: { canvasShadows: false, shadowMapSize: 1024 },
  standard: { canvasShadows: "basic", shadowMapSize: 1024 },
  high: { canvasShadows: "soft", shadowMapSize: 2048 },
};

const WORLD_DENSITY_TABLE: Record<Exclude<WorldDensityPreference, "auto">, {
  lowPower: boolean;
  propFraction: 0.5 | 0.75 | 1;
  detailedPassengerLimit: number;
  simplifiedPassengerLimit: number;
  seaCreatureSlots: number;
  starCount: number;
  rainCount: number;
  snowCount: number;
}> = {
  light: {
    lowPower: true,
    propFraction: 0.5,
    detailedPassengerLimit: 2,
    simplifiedPassengerLimit: 120,
    seaCreatureSlots: 2,
    starCount: 700,
    rainCount: 180,
    snowCount: 220,
  },
  balanced: {
    lowPower: false,
    propFraction: 0.75,
    detailedPassengerLimit: 5,
    simplifiedPassengerLimit: 200,
    seaCreatureSlots: 3,
    starCount: 1200,
    rainCount: 300,
    snowCount: 360,
  },
  rich: {
    lowPower: false,
    propFraction: 1,
    detailedPassengerLimit: 8,
    simplifiedPassengerLimit: 280,
    seaCreatureSlots: 4,
    starCount: 1800,
    rainCount: 420,
    snowCount: 520,
  },
  max: {
    lowPower: false,
    propFraction: 1,
    detailedPassengerLimit: 14,
    simplifiedPassengerLimit: 380,
    seaCreatureSlots: 4,
    starCount: 2600,
    rainCount: 600,
    snowCount: 720,
  },
};

function resolvePixelQuality(pixelQuality: Exclude<PixelQualityPreference, "auto">, devicePixelRatio: number) {
  const dpr = Math.max(1, Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1);
  if (pixelQuality === "eco") {
    return { maxDpr: Math.min(dpr, 1.0), minDpr: 0.75, antialias: false };
  }
  if (pixelQuality === "standard") {
    const maxDpr = Math.min(dpr, 1.35);
    return { maxDpr, minDpr: Math.min(maxDpr, 0.85), antialias: true };
  }
  if (pixelQuality === "sharp") {
    const maxDpr = Math.min(dpr, 1.75);
    return { maxDpr, minDpr: Math.min(maxDpr, 1.0), antialias: true };
  }
  const maxDpr = Math.min(Math.max(dpr, 1.25), 2.25);
  return { maxDpr, minDpr: Math.min(maxDpr, 1.0), antialias: true };
}

/** Traduit les réglages utilisateur et le palier actif en paramètres concrets de rendu. */
export function resolveGraphicsProfile(
  settings: GraphicsSettings,
  activeAutoTier: GraphicsQualityTier,
  devicePixelRatio = 1,
): ResolvedGraphicsProfile {
  const activeTier = settings.preset === "auto" ? activeAutoTier : settings.preset;
  const tierDefaults = TIER_DEFAULTS[activeTier];
  const drawDistance = settings.drawDistance === "auto" ? tierDefaults.drawDistance : settings.drawDistance;
  const pixelQuality = settings.pixelQuality === "auto" ? tierDefaults.pixelQuality : settings.pixelQuality;
  const shadows = settings.shadows === "auto" ? tierDefaults.shadows : settings.shadows;
  const worldDensity = settings.worldDensity === "auto" ? tierDefaults.worldDensity : settings.worldDensity;

  return {
    activeTier,
    drawDistance,
    pixelQuality,
    shadows,
    worldDensity,
    ...DRAW_DISTANCE_TABLE[drawDistance],
    ...resolvePixelQuality(pixelQuality, devicePixelRatio),
    ...SHADOW_TABLE[shadows],
    ...WORLD_DENSITY_TABLE[worldDensity],
  };
}

/** Garanti qu'un long bus ne soit jamais coupé par le brouillard, le pont ou le plan lointain. */
export function getSceneGeometryBudgets(
  profile: ResolvedGraphicsProfile,
  cabinLength: number,
  exteriorMaxDistance: number,
): SceneGeometryBudgets {
  const fogNear = Math.max(profile.fogNear, Math.round(cabinLength * 0.55));
  const fogFar = Math.max(profile.fogFar, Math.round(cabinLength * 1.5 + 160));
  return {
    fogNear,
    fogFar,
    islandCullDistance: Math.max(profile.islandCullDistance, fogFar + 15),
    propCullDistance: Math.max(profile.propCullDistance, fogFar - 10),
    bridgeLength: Math.max(profile.bridgeBaseLength, cabinLength + Math.max(520, fogFar * 2)),
    cameraFar: Math.max(profile.baseCameraFar, fogFar + 260, exteriorMaxDistance + cabinLength + 100),
  };
}

export interface PerformanceMonitor {
  elapsed: number;
  frames: number;
  dpr: number;
  tier: GraphicsQualityTier;
  recommendedTier: GraphicsQualityTier;
  canPromoteTier: boolean;
  demotedCeiling: GraphicsQualityTier | null;
  slowDprSamples: number;
  fastDprSamples: number;
  slowTierSamples: number;
  fastTierSamples: number;
  warmupRemaining: number;
  dprCooldown: number;
  tierCooldown: number;
}

export interface PerformanceSampleResult {
  dprChanged: boolean;
  tierChanged: boolean;
  dpr: number;
  tier: GraphicsQualityTier;
  fps: number | null;
}

export function createPerformanceMonitor(options: {
  tier: GraphicsQualityTier;
  recommendedTier: GraphicsQualityTier;
  canPromoteTier: boolean;
  initialDpr: number;
}): PerformanceMonitor {
  return {
    elapsed: 0,
    frames: 0,
    dpr: options.initialDpr,
    tier: options.tier,
    recommendedTier: options.recommendedTier,
    canPromoteTier: options.canPromoteTier,
    demotedCeiling: null,
    slowDprSamples: 0,
    fastDprSamples: 0,
    slowTierSamples: 0,
    fastTierSamples: 0,
    warmupRemaining: 2.5,
    dprCooldown: 0,
    tierCooldown: 0,
  };
}

export function syncPerformanceMonitorProfile(
  monitor: PerformanceMonitor,
  next: {
    tier: GraphicsQualityTier;
    recommendedTier: GraphicsQualityTier;
    canPromoteTier: boolean;
    maxDpr: number;
    minDpr: number;
  },
) {
  monitor.recommendedTier = next.recommendedTier;
  monitor.canPromoteTier = next.canPromoteTier;
  if (monitor.tier !== next.tier) {
    monitor.tier = next.tier;
    monitor.dpr = next.maxDpr;
    monitor.elapsed = 0;
    monitor.frames = 0;
    monitor.slowDprSamples = 0;
    monitor.fastDprSamples = 0;
    monitor.slowTierSamples = 0;
    monitor.fastTierSamples = 0;
    monitor.warmupRemaining = 2.5;
  } else {
    monitor.dpr = Math.min(next.maxDpr, Math.max(next.minDpr, monitor.dpr));
  }
}

/** Ajuste la finesse des pixels puis, au besoin, le palier GPU en évitant toute oscillation. */
export function sampleScenePerformance(
  monitor: PerformanceMonitor,
  dt: number,
  config: {
    minDpr: number;
    maxDpr: number;
    adaptiveFps: boolean;
    isAutoPreset: boolean;
  },
): PerformanceSampleResult {
  if (!Number.isFinite(dt) || dt <= 0) {
    return { dprChanged: false, tierChanged: false, dpr: monitor.dpr, tier: monitor.tier, fps: null };
  }

  if (!config.adaptiveFps) {
    monitor.elapsed = 0;
    monitor.frames = 0;
    monitor.slowDprSamples = 0;
    monitor.fastDprSamples = 0;
    monitor.slowTierSamples = 0;
    monitor.fastTierSamples = 0;
    const dprChanged = Math.abs(monitor.dpr - config.maxDpr) >= 0.01;
    monitor.dpr = config.maxDpr;
    return { dprChanged, tierChanged: false, dpr: monitor.dpr, tier: monitor.tier, fps: null };
  }

  const clampedDt = Math.min(dt, 0.25);
  if (monitor.warmupRemaining > 0) {
    const leftover = clampedDt - monitor.warmupRemaining;
    monitor.warmupRemaining = Math.max(0, monitor.warmupRemaining - clampedDt);
    if (monitor.warmupRemaining > 0 || leftover <= 0) {
      return { dprChanged: false, tierChanged: false, dpr: monitor.dpr, tier: monitor.tier, fps: null };
    }
    monitor.elapsed += leftover;
    monitor.frames += 1;
  } else {
    monitor.elapsed += clampedDt;
    monitor.frames += 1;
  }

  if (monitor.elapsed < 2) {
    return { dprChanged: false, tierChanged: false, dpr: monitor.dpr, tier: monitor.tier, fps: null };
  }

  const windowElapsed = monitor.elapsed;
  const fps = monitor.frames / windowElapsed;
  monitor.elapsed = 0;
  monitor.frames = 0;
  monitor.dprCooldown = Math.max(0, monitor.dprCooldown - windowElapsed);
  monitor.tierCooldown = Math.max(0, monitor.tierCooldown - windowElapsed);

  // 1. Ajuster d'abord la résolution interne (DPR).
  monitor.slowDprSamples = fps < 46 ? monitor.slowDprSamples + 1 : 0;
  monitor.fastDprSamples = fps >= 54.5 ? monitor.fastDprSamples + 1 : 0;
  const dprAtFloorBefore = monitor.dpr <= config.minDpr + 0.08;
  let nextDpr = monitor.dpr;
  if (monitor.dprCooldown === 0 && (fps < 25 || monitor.slowDprSamples >= 2)) {
    nextDpr = Math.max(config.minDpr, monitor.dpr - (fps < 25 ? 0.25 : 0.15));
  } else if (monitor.dprCooldown === 0 && monitor.fastDprSamples >= 3) {
    nextDpr = Math.min(config.maxDpr, monitor.dpr + 0.1);
  }

  const dprChanged = Math.abs(nextDpr - monitor.dpr) >= 0.04;
  if (dprChanged) {
    monitor.dpr = nextDpr;
    monitor.slowDprSamples = 0;
    monitor.fastDprSamples = 0;
    monitor.dprCooldown = fps < 25 ? 4 : 8;
  }

  // 2. Ensuite seulement, changer de palier si la marge de DPR ne suffit plus ou si le GPU est largement à l'aise.
  let tierChanged = false;
  if (config.isAutoPreset && monitor.tierCooldown === 0 && !dprChanged) {
    const currentIndex = TIER_ORDER.indexOf(monitor.tier);
    const recommendedIndex = TIER_ORDER.indexOf(monitor.recommendedTier);
    const ceilingIndex = monitor.demotedCeiling
      ? TIER_ORDER.indexOf(monitor.demotedCeiling)
      : TIER_ORDER.length - 1;

    if (dprAtFloorBefore && fps < 36) {
      monitor.slowTierSamples += 1;
      monitor.fastTierSamples = 0;
      if (currentIndex > 0 && monitor.slowTierSamples >= 2) {
        const nextTier = TIER_ORDER[currentIndex - 1];
        monitor.tier = nextTier;
        monitor.demotedCeiling = nextTier;
        monitor.slowTierSamples = 0;
        monitor.fastTierSamples = 0;
        monitor.warmupRemaining = 2.5;
        monitor.tierCooldown = 10;
        tierChanged = true;
      }
    } else if (
      monitor.canPromoteTier
      && monitor.dpr >= config.maxDpr - 0.04
      && fps >= 54.5
    ) {
      monitor.slowTierSamples = 0;
      monitor.fastTierSamples += 1;
      const maxAllowedIndex = Math.min(recommendedIndex + 1, ceilingIndex, TIER_ORDER.length - 1);
      if (currentIndex < maxAllowedIndex && monitor.fastTierSamples >= 3) {
        monitor.tier = TIER_ORDER[currentIndex + 1];
        monitor.slowTierSamples = 0;
        monitor.fastTierSamples = 0;
        monitor.warmupRemaining = 2.5;
        monitor.tierCooldown = 16;
        tierChanged = true;
      }
    } else {
      monitor.slowTierSamples = 0;
      if (fps < 54.5) monitor.fastTierSamples = 0;
    }
  } else {
    monitor.slowTierSamples = 0;
    monitor.fastTierSamples = 0;
  }

  return {
    dprChanged,
    tierChanged,
    dpr: monitor.dpr,
    tier: monitor.tier,
    fps,
  };
}

export interface ShadowCameraFraming {
  halfWidth: number;
  halfDepth: number;
  centerZ: number;
  sunDistance: number;
  near: number;
  far: number;
  normalBias: number;
}

/** Dimensionne la caméra d'ombres selon la résolution active et le dézoom pour couvrir les décors visibles sans bordure proche. */
export function getShadowCameraFraming(
  options: {
    cabinCenterZ: number;
    cabinLength: number;
    cameraX: number;
    cameraY: number;
    cameraZ: number;
    fogFar: number;
    shadowMapSize: 1024 | 2048;
  },
  out: ShadowCameraFraming = {
    halfWidth: 105,
    halfDepth: 165,
    centerZ: -36,
    sunDistance: 222,
    near: 1,
    far: 580,
    normalBias: 0.046,
  },
): ShadowCameraFraming {
  const { cabinCenterZ, cabinLength, cameraX, cameraY, cameraZ, fogFar, shadowMapSize } = options;
  const clampedBusZ = Math.max(-42, Math.min(36, cabinCenterZ));
  const cameraDistance = Math.hypot(cameraX, Math.max(0, cameraY - 2), cameraZ - clampedBusZ);
  const highRes = shadowMapSize >= 2048;
  const baseHalfWidth = highRes ? 105 : 85;
  const baseHalfDepth = highRes ? 165 : 125;
  const maxHalfWidth = Math.max(baseHalfWidth, Math.min(260, fogFar * 0.48));
  const maxHalfDepth = Math.max(baseHalfDepth, Math.min(340, fogFar * 0.65));
  const halfWidth = Math.min(maxHalfWidth, Math.max(baseHalfWidth, cameraDistance * 1.15));
  const halfDepth = Math.min(maxHalfDepth, Math.max(baseHalfDepth, cameraDistance * 1.35 + cabinLength * 0.25));

  const zoomBlend = Math.max(0, Math.min(0.65, (cameraDistance - 35) / 160));
  const minCamZ = -fogFar * 0.45;
  const maxCamZ = Math.max(fogFar * 0.45, cabinCenterZ + cabinLength * 0.3);
  const clampedCamZ = Math.max(minCamZ, Math.min(maxCamZ, cameraZ));
  const busFocusZ = clampedBusZ - Math.min(38, halfDepth * 0.22);
  const centerZ = busFocusZ + (clampedCamZ - busFocusZ) * zoomBlend;
  const maxSpan = Math.max(halfWidth, halfDepth);
  const sunDistance = Math.max(120, maxSpan * 1.35);

  out.halfWidth = halfWidth;
  out.halfDepth = halfDepth;
  out.centerZ = centerZ;
  out.sunDistance = sunDistance;
  out.near = 1;
  out.far = Math.max(380, sunDistance * 2.6);
  out.normalBias = Math.max(0.01, Math.min(0.08, maxSpan * 0.00028));
  return out;
}
