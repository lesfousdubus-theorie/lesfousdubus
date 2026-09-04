let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Synthétise un klaxon de bus à deux tons (sans fichier audio). */
export function playHorn(duration = 0.7) {
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;

  const master = audio.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.5, now + 0.03);
  master.gain.setValueAtTime(0.5, now + duration - 0.12);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  filter.Q.value = 2;

  master.connect(filter);
  filter.connect(audio.destination);

  const tones = [311.13, 415.3]; // ré# / sol# : accord classique de klaxon
  tones.forEach((freq) => {
    const osc = audio.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const sub = audio.createOscillator();
    sub.type = "square";
    sub.frequency.value = freq / 2;
    const subGain = audio.createGain();
    subGain.gain.value = 0.25;
    osc.connect(master);
    sub.connect(subGain);
    subGain.connect(master);
    osc.start(now);
    sub.start(now);
    osc.stop(now + duration + 0.05);
    sub.stop(now + duration + 0.05);
  });
}

/** Petit "ding" de sonnette d'arrêt de bus. */
export function playDing() {
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  gain.connect(audio.destination);
  const osc = audio.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 1318.5;
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 1);
}

/** Son festif et énergique quand un nakama rejoint ou qu'on booste. */
export function playBoost() {
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;

  // Arpège ascendant One Piece : Do - Mi - Sol - Do (C5 - E5 - G5 - C6)
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, idx) => {
    const start = now + idx * 0.08;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);

    osc.connect(gain);
    gain.connect(audio.destination);

    osc.start(start);
    osc.stop(start + 0.36);
  });
}

/** Son de transformation / extension mécanique quand le bus s'allonge. */
export function playStretch() {
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;

  // Glissando ascendant et accord d'accordéon / hydraulique
  const master = audio.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.35, now + 0.05);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(400, now);
  filter.frequency.exponentialRampToValueAtTime(1600, now + 0.7);
  filter.Q.value = 3;

  master.connect(filter);
  filter.connect(audio.destination);

  [220, 329.63, 440, 554.37].forEach((freq) => {
    const osc = audio.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.6);
    osc.connect(master);
    osc.start(now);
    osc.stop(now + 0.9);
  });
}

