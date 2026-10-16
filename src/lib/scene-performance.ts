export function createDprSample(baseDpr: number) {
  return { elapsed: 0, frames: 0, dpr: baseDpr, slowSamples: 0, fastSamples: 0, cooldown: 0 };
}

/** Inclut les images très lentes pour pouvoir se remettre d'une surcharge. */
export function sampleSceneDpr(sample: ReturnType<typeof createDprSample>, dt: number, baseDpr: number, minimumDpr: number) {
  if (!Number.isFinite(dt) || dt <= 0) return null;
  // Le frame loop est suspendu lorsque l'onglet est caché ; cette borne protège
  // seulement d'une pause exceptionnelle du navigateur ou du débogueur.
  sample.elapsed += Math.min(dt, 2);
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
