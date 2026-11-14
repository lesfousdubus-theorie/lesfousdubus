import * as THREE from "three";

export interface LabelOptions {
  text: string;
  width?: number;
  height?: number;
  bg?: string;
  fg?: string;
  font?: string;
  sub?: string;
  border?: boolean;
}

/** Crée une texture canvas avec du texte (utilisée pour les panneaux du bus). */
export function makeLabelTexture({
  text,
  width = 1024,
  height = 160,
  bg = "#0b1f6b",
  fg = "#ffd23f",
  font = "bold 92px Impact, 'Arial Black', sans-serif",
  sub,
  border = true,
}: LabelOptions): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext("2d")!;

  // Fond avec dégradé subtil
  const grad = c.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, bg);
  grad.addColorStop(1, "#07123d");
  c.fillStyle = grad;
  c.fillRect(0, 0, width, height);

  if (border) {
    c.strokeStyle = fg;
    c.lineWidth = 8;
    c.strokeRect(6, 6, width - 12, height - 12);
  }

  // Ombre portée du texte
  c.shadowColor = "rgba(0,0,0,0.8)";
  c.shadowBlur = 10;
  c.shadowOffsetX = 3;
  c.shadowOffsetY = 4;

  c.fillStyle = fg;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = font;
  c.fillText(text, width / 2, sub ? height * 0.38 : height / 2);

  if (sub) {
    c.shadowBlur = 4;
    c.font = `bold ${Math.round(height * 0.22)}px Arial, sans-serif`;
    c.fillStyle = "#ffffff";
    c.fillText(sub, width / 2, height * 0.76);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Plaque d'immatriculation rétro Grand Line */
export function makeLicensePlateTexture(text = "MUGI-56"): THREE.CanvasTexture {
  const w = 512;
  const h = 160;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!;

  // Fond blanc légèrement patiné
  c.fillStyle = "#f5f5ea";
  c.fillRect(0, 0, w, h);

  // Bordure bleue
  c.strokeStyle = "#0b2680";
  c.lineWidth = 10;
  c.strokeRect(8, 8, w - 16, h - 16);

  // Bande bleue européenne / Grand Line à gauche
  c.fillStyle = "#0c359e";
  c.fillRect(8, 8, 54, h - 16);
  c.fillStyle = "#ffd23f";
  c.font = "bold 24px Arial, sans-serif";
  c.textAlign = "center";
  c.fillText("GL", 35, 95);

  // Texte immatriculation
  c.fillStyle = "#111111";
  c.font = "900 78px 'Courier New', monospace";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, w / 2 + 24, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Texture du tableau de bord avec compteurs lumineux ultra-détaillés */
export function makeDashboardTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 320;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!;

  // Fond panneau composite carbone / métal brossé
  c.fillStyle = "#12141a";
  c.fillRect(0, 0, w, h);

  // Micro-texture de trame
  c.fillStyle = "rgba(255, 255, 255, 0.02)";
  for (let x = 0; x < w; x += 4) {
    c.fillRect(x, 0, 1, h);
  }

  // Cadre de finition du combiné
  c.strokeStyle = "#2e3440";
  c.lineWidth = 6;
  c.strokeRect(6, 6, w - 12, h - 12);

  // Fonction de tracé d'un cadran d'instrument
  const drawDial = (
    cx: number,
    cy: number,
    r: number,
    title: string,
    sub: string,
    maxVal: number,
    needleVal: number,
    ticks = 10,
    redlineStart?: number,
  ) => {
    // Cerclage extérieur biseauté
    const ringGrad = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    ringGrad.addColorStop(0, "#8892b0");
    ringGrad.addColorStop(0.5, "#3b4252");
    ringGrad.addColorStop(1, "#1e222a");
    c.strokeStyle = ringGrad;
    c.lineWidth = 6;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.stroke();

    // Fond sombre du cadran
    const dialGrad = c.createRadialGradient(cx, cy, r * 0.2, cx, cy, r - 3);
    dialGrad.addColorStop(0, "#0e1117");
    dialGrad.addColorStop(1, "#06070a");
    c.fillStyle = dialGrad;
    c.beginPath();
    c.arc(cx, cy, r - 3, 0, Math.PI * 2);
    c.fill();

    // Zone rouge si applicable (compte-tours)
    if (redlineStart !== undefined) {
      const startAngle = Math.PI * 0.75 + (redlineStart / maxVal) * Math.PI * 1.5;
      const endAngle = Math.PI * 2.25;
      c.strokeStyle = "rgba(239, 68, 68, 0.45)";
      c.lineWidth = 8;
      c.beginPath();
      c.arc(cx, cy, r - 12, startAngle, endAngle);
      c.stroke();
    }

    // Graduations
    for (let i = 0; i <= ticks; i++) {
      const a = Math.PI * 0.75 + (i / ticks) * Math.PI * 1.5;
      const val = (i / ticks) * maxVal;
      const isRed = redlineStart !== undefined && val >= redlineStart;
      const isMajor = i % 2 === 0;

      const innerR = isMajor ? r - 20 : r - 12;
      const outerR = r - 6;

      c.strokeStyle = isRed ? "#ef4444" : isMajor ? "#38bdf8" : "#94a3b8";
      c.lineWidth = isMajor ? 3 : 1.5;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
      c.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
      c.stroke();

      // Chiffres des graduations majeures
      if (isMajor && r > 70) {
        const textR = r - 32;
        const tx = cx + Math.cos(a) * textR;
        const ty = cy + Math.sin(a) * textR;
        c.fillStyle = isRed ? "#f87171" : "#e2e8f0";
        c.font = "bold 13px system-ui, sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(String(Math.round(val)), tx, ty);
      }
    }

    // Aiguille lumineuse orange/rouge
    const na = Math.PI * 0.75 + (needleVal / maxVal) * Math.PI * 1.5;
    c.strokeStyle = "#ff4438";
    c.lineWidth = 3.5;
    c.shadowColor = "#ff4438";
    c.shadowBlur = 8;
    c.beginPath();
    c.moveTo(cx - Math.cos(na) * 8, cy - Math.sin(na) * 8);
    c.lineTo(cx + Math.cos(na) * (r - 12), cy + Math.sin(na) * (r - 12));
    c.stroke();
    c.shadowBlur = 0;

    // Moyeu de l'aiguille
    c.fillStyle = "#ffcc00";
    c.beginPath();
    c.arc(cx, cy, 7, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#1a1a24";
    c.lineWidth = 2;
    c.stroke();

    // Titre et unité
    c.fillStyle = "#38bdf8";
    c.font = "bold 15px system-ui, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(title, cx, cy + r * 0.42);
    if (sub) {
      c.fillStyle = "#94a3b8";
      c.font = "bold 11px system-ui, sans-serif";
      c.fillText(sub, cx, cy + r * 0.60);
    }
  };

  // 1. Tachymètre / Compteur de vitesse principal (Gauche)
  drawDial(250, 160, 114, "85 KM/H", "VITESSE", 140, 85, 14);

  // 2. Compte-tours principal (Droite)
  drawDial(774, 160, 114, "3.2 RPM", "x1000", 8, 3.2, 8, 6.0);

  // 3. Jauge de carburant Cola (Tout à gauche)
  drawDial(90, 160, 68, "COLA", "FULL · 92%", 100, 92, 4);

  // 4. Jauge de pression / Boost (Tout à droite)
  drawDial(934, 160, 68, "BOOST", "1.4 BAR", 2, 1.4, 4);

  // 5. Écran central digital multifonctions (OLED / LCD émeraude)
  const scrX = 390;
  const scrY = 60;
  const scrW = 244;
  const scrH = 140;

  c.fillStyle = "#04150c";
  c.fillRect(scrX, scrY, scrW, scrH);
  c.strokeStyle = "#059669";
  c.lineWidth = 3;
  c.strokeRect(scrX, scrY, scrW, scrH);

  // Trame d'écran LCD
  c.fillStyle = "rgba(16, 185, 129, 0.05)";
  for (let y = scrY; y < scrY + scrH; y += 3) {
    c.fillRect(scrX, y, scrW, 1);
  }

  c.fillStyle = "#34d399";
  c.font = "900 16px monospace";
  c.textAlign = "center";
  c.textBaseline = "top";
  c.fillText("GRAND LINE EXPRESS", scrX + scrW / 2, scrY + 12);

  c.fillStyle = "#10b981";
  c.font = "bold 20px monospace";
  c.fillText("DEST: LAUGH TALE", scrX + scrW / 2, scrY + 38);

  c.fillStyle = "#6ee7b7";
  c.font = "14px monospace";
  c.fillText("ODO: 56 000 KM", scrX + scrW / 2, scrY + 70);

  c.fillStyle = "#a7f3d0";
  c.font = "12px monospace";
  c.fillText("CAP: NOUVEAU MONDE · OK", scrX + scrW / 2, scrY + 95);

  c.fillStyle = "#34d399";
  c.font = "bold 11px monospace";
  c.fillText("● AUTOPILOTE ACTIF", scrX + scrW / 2, scrY + 118);

  // 6. Rangée de voyants lumineux LED
  const drawLed = (x: number, y: number, color: string, active: boolean, label: string) => {
    c.fillStyle = active ? color : "#1e222a";
    c.shadowColor = active ? color : "transparent";
    c.shadowBlur = active ? 8 : 0;
    c.beginPath();
    c.arc(x, y, 7, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;

    c.strokeStyle = "#374151";
    c.lineWidth = 1.5;
    c.stroke();

    if (label) {
      c.fillStyle = active ? "#f8fafc" : "#64748b";
      c.font = "bold 9px system-ui, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "top";
      c.fillText(label, x, y + 10);
    }
  };

  // Voyants au-dessus des compteurs
  drawLed(430, 230, "#22c55e", true, "◄ CLIGN");
  drawLed(485, 230, "#38bdf8", true, "PHARES");
  drawLed(540, 230, "#eab308", true, "MOTEUR");
  drawLed(595, 230, "#22c55e", true, "CLIGN ►");

  // Clignotants bas
  drawLed(460, 280, "#ef4444", true, "FREIN");
  drawLed(512, 280, "#10b981", true, "STATUS");
  drawLed(565, 280, "#f97316", true, "BOOST");

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Texture de l'ombre d'occlusion au sol sous le bus. */
export function makeBusContactShadowTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!;

  c.clearRect(0, 0, w, h);

  // Dégradé radial doux pour un contour progressif
  const grad = c.createRadialGradient(w / 2, h / 2, w * 0.12, w / 2, h / 2, w * 0.48);
  grad.addColorStop(0, "rgba(0, 0, 0, 0.88)");
  grad.addColorStop(0.35, "rgba(2, 5, 12, 0.76)");
  grad.addColorStop(0.70, "rgba(4, 8, 18, 0.35)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);

  // Noyau dense sous le châssis
  const innerGrad = c.createRadialGradient(w / 2, h / 2, 30, w / 2, h / 2, w * 0.36);
  innerGrad.addColorStop(0, "rgba(0, 0, 0, 0.98)");
  innerGrad.addColorStop(0.55, "rgba(0, 0, 0, 0.85)");
  innerGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

  c.fillStyle = innerGrad;
  c.beginPath();
  c.ellipse(w / 2, h / 2, w * 0.40, h * 0.45, 0, 0, Math.PI * 2);
  c.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Texture sombre de la TV lorsqu'elle est éteinte. */
export function makeTvOffTexture(): THREE.CanvasTexture {
  const w = 720;
  const h = 405;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!;

  const grad = c.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#05070c");
  grad.addColorStop(0.5, "#090c15");
  grad.addColorStop(1, "#030408");
  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);

  const reflection = c.createLinearGradient(0, 0, w, h);
  reflection.addColorStop(0, "rgba(255,255,255,0.035)");
  reflection.addColorStop(0.35, "rgba(255,255,255,0.01)");
  reflection.addColorStop(1, "rgba(0,0,0,0.5)");
  c.fillStyle = reflection;
  c.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface GraffitiOptions {
  text: string;
  width?: number;
  height?: number;
  color?: string;
  stroke?: string;
  accent?: string;
  angle?: number;
  sub?: string;
}

/** Crée un lettrage peint, lisible de loin et cohérent avec la livrée du bus. */
export function makeGraffitiTexture({
  text,
  width = 1536,
  height = 512,
  color = "#fff3b0",
  stroke = "#06164a",
  accent = "#e52b38",
  angle = -0.035,
  sub,
}: GraffitiOptions): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext("2d")!;

  c.clearRect(0, 0, width, height);

  c.save();
  c.translate(width / 2, height / 2);
  c.rotate(angle);
  c.transform(1, 0, -0.12, 1, 0, 0);

  const lines = text.split("\n").slice(0, 2);
  let fontSize = lines.length > 1 ? 132 : 176;
  const fontFamily = "'Arial Narrow', 'Trebuchet MS', sans-serif";
  const setFont = () => {
    c.font = `italic 900 ${fontSize}px ${fontFamily}`;
  };
  setFont();

  const maxTextW = width * 0.86;
  const measured = Math.max(...lines.map((line) => c.measureText(line).width));
  if (measured > maxTextW) {
    fontSize = Math.max(78, Math.floor((fontSize * maxTextW) / measured));
    setFont();
  }
  c.textAlign = "center";
  c.textBaseline = "middle";

  const lineHeight = fontSize * 0.88;
  const firstY = lines.length > 1 ? -lineHeight / 2 : -10;

  lines.forEach((line, index) => {
    const y = firstY + index * lineHeight;

    // Ombre rouge décalée façon affiche sérigraphiée.
    c.lineJoin = "round";
    c.strokeStyle = stroke;
    c.lineWidth = 28;
    c.strokeText(line, 13, y + 15);
    c.fillStyle = accent;
    c.fillText(line, 13, y + 15);

    // Trait principal crème, fortement détouré pour rester lisible en mouvement.
    c.strokeStyle = stroke;
    c.lineWidth = 15;
    c.strokeText(line, 0, y);
    c.fillStyle = color;
    c.fillText(line, 0, y);

    c.strokeStyle = "rgba(255,255,255,0.55)";
    c.lineWidth = 2;
    c.strokeText(line, -2, y - 2);
  });

  // Coup de pinceau qui signe le tag sans gêner les lettres.
  const underlineY = firstY + (lines.length - 1) * lineHeight + fontSize * 0.58;
  c.strokeStyle = accent;
  c.lineCap = "round";
  c.lineWidth = 14;
  c.beginPath();
  c.moveTo(-width * 0.34, underlineY);
  c.bezierCurveTo(-width * 0.08, underlineY + 22, width * 0.18, underlineY - 18, width * 0.35, underlineY + 4);
  c.stroke();

  // Quelques éclaboussures contrôlées : assez pour le geste peint, sans brouiller le texte.
  const seed = text.length * 17;
  c.fillStyle = accent;
  for (let i = 0; i < 18; i++) {
    const gx = ((i * 97 + seed * 23) % (width * 0.82)) - width * 0.41;
    const gy = ((i * 61 + seed * 11) % (height * 0.72)) - height * 0.36;
    c.beginPath();
    c.arc(gx, gy, 2 + (i % 3) * 1.5, 0, Math.PI * 2);
    c.fill();
  }

  // Sous-texte optionnel.
  if (sub) {
    c.font = `900 42px ${fontFamily}`;
    c.fillStyle = "#ffffff";
    c.strokeStyle = stroke;
    c.lineWidth = 7;
    c.strokeText(sub, 0, height * 0.39);
    c.fillText(sub, 0, height * 0.39);
  }

  c.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}
