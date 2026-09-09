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

/** Texture du tableau de bord avec compteurs lumineux */
export function makeDashboardTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 320;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!;

  // Fond plastique texturé
  c.fillStyle = "#181a20";
  c.fillRect(0, 0, w, h);

  // Compteur de vitesse (gauche)
  const drawDial = (cx: number, cy: number, r: number, title: string, maxVal: number, needleVal: number) => {
    // Cerclage chromé
    c.strokeStyle = "#555b6e";
    c.lineWidth = 6;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.stroke();

    // Fond cadran
    c.fillStyle = "#0c0d12";
    c.beginPath();
    c.arc(cx, cy, r - 3, 0, Math.PI * 2);
    c.fill();

    // Graduations
    c.strokeStyle = "#4cd964";
    c.lineWidth = 3;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      const x1 = cx + Math.cos(a) * (r - 18);
      const y1 = cy + Math.sin(a) * (r - 18);
      const x2 = cx + Math.cos(a) * (r - 6);
      const y2 = cy + Math.sin(a) * (r - 6);
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();
    }

    // Aiguille orange lumineuse
    const na = Math.PI * 0.75 + (needleVal / maxVal) * Math.PI * 1.5;
    c.strokeStyle = "#ff3b30";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cx + Math.cos(na) * (r - 10), cy + Math.sin(na) * (r - 10));
    c.stroke();

    // Centre de l'aiguille
    c.fillStyle = "#ffcc00";
    c.beginPath();
    c.arc(cx, cy, 7, 0, Math.PI * 2);
    c.fill();

    // Titre
    c.fillStyle = "#8892b0";
    c.font = "bold 18px Arial, sans-serif";
    c.textAlign = "center";
    c.fillText(title, cx, cy + r * 0.55);
  };

  drawDial(280, 160, 110, "KM/H", 120, 75);
  drawDial(744, 160, 110, "RPM x1000", 6, 2.8);

  // Petit écran central digital
  c.fillStyle = "#071c0e";
  c.fillRect(440, 90, 144, 75);
  c.strokeStyle = "#1a4022";
  c.lineWidth = 3;
  c.strokeRect(440, 90, 144, 75);
  c.fillStyle = "#34d399";
  c.font = "bold 26px 'Courier New', monospace";
  c.textAlign = "center";
  c.fillText("GRAND LINE", 512, 125);
  c.font = "18px 'Courier New', monospace";
  c.fillText("56 000 KM", 512, 150);

  // Voyants lumineux
  const drawLamp = (x: number, y: number, color: string) => {
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, 9, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#222";
    c.lineWidth = 2;
    c.stroke();
  };
  drawLamp(470, 210, "#38bdf8"); // Phares
  drawLamp(512, 210, "#4ade80"); // OK
  drawLamp(554, 210, "#fbbf24"); // Moteur

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Crée une texture de paille tressée procédurale de secours haute fidélité. */
export function makeProceduralStrawTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!;

  // Fond paille dorée
  c.fillStyle = "#e5ad38";
  c.fillRect(0, 0, w, h);

  // Tressage
  for (let y = 0; y < h; y += 16) {
    const row = Math.floor(y / 16);
    const xOff = row % 2 === 0 ? 0 : 12;
    for (let x = -16; x < w + 16; x += 24) {
      const grad = c.createLinearGradient(x + xOff, y, x + xOff + 22, y + 14);
      grad.addColorStop(0, "#fad57a");
      grad.addColorStop(0.5, "#d79b26");
      grad.addColorStop(1, "#9e6912");
      c.fillStyle = grad;
      c.fillRect(x + xOff, y, 22, 14);

      // Fine rainure
      c.strokeStyle = "rgba(100, 60, 10, 0.4)";
      c.lineWidth = 1;
      c.strokeRect(x + xOff, y, 22, 14);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Texture pour l'écran TV (éteint ou allumé en mode émission One Piece) */
export function makeTvScreenTexture(isOn = false): THREE.CanvasTexture {
  const w = 720;
  const h = 405;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!;

  if (!isOn) {
    // Écran éteint : dalle noire et élégante de verre sombre éteint, sans miniature ni texte
    const grad = c.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#05070c");
    grad.addColorStop(0.5, "#090c15");
    grad.addColorStop(1, "#030408");
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);

    // Reflet diagonal très subtil typique d'une dalle d'écran éteinte
    const refGrad = c.createLinearGradient(0, 0, w, h);
    refGrad.addColorStop(0, "rgba(255,255,255,0.035)");
    refGrad.addColorStop(0.35, "rgba(255,255,255,0.01)");
    refGrad.addColorStop(1, "rgba(0,0,0,0.5)");
    c.fillStyle = refGrad;
    c.fillRect(0, 0, w, h);
  } else {
    // Écran allumé : diffusion animée de la théorie
    const grad = c.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#0c1d63");
    grad.addColorStop(0.5, "#15359e");
    grad.addColorStop(1, "#091238");
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);

    // Cadre vidéo avec lueur
    c.strokeStyle = "#ffd23f";
    c.lineWidth = 4;
    c.strokeRect(12, 12, w - 24, h - 24);

    // Barre supérieure : "EN DIRECT"
    c.fillStyle = "rgba(0,0,0,0.6)";
    c.fillRect(20, 20, w - 40, 38);
    c.fillStyle = "#ef4444";
    c.beginPath();
    c.arc(42, 39, 7, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#ffffff";
    c.font = "bold 16px Arial, sans-serif";
    c.textAlign = "left";
    c.fillText("EN DIRECT · THÉORIE ONE PIECE", 58, 44);

    c.textAlign = "right";
    c.fillStyle = "#ffd23f";
    c.font = "bold 16px 'Courier New', monospace";
    c.fillText("CANAL MUGIWARA", w - 35, 44);

    // Grand titre central
    c.textAlign = "center";
    c.fillStyle = "#ffd23f";
    c.font = "bold 44px Impact, 'Arial Black', sans-serif";
    c.shadowColor = "rgba(0,0,0,0.9)";
    c.shadowBlur = 12;
    c.fillText("LA THÉORIE DES FOUS DU BUS", w / 2, h / 2 - 25);

    c.fillStyle = "#ffffff";
    c.font = "bold 22px Arial, sans-serif";
    c.fillText("Voyage jusqu'à Laugh Tale", w / 2, h / 2 + 15);

    // Égaliseur audio animé factice
    const barWidth = 8;
    const barSpacing = 4;
    const count = 36;
    const startX = (w - (count * (barWidth + barSpacing))) / 2;
    for (let i = 0; i < count; i++) {
      const bh = 10 + Math.sin(i * 0.4 + 1.2) * 22 + Math.cos(i * 0.7) * 14;
      c.fillStyle = i % 3 === 0 ? "#ffd23f" : "#38bdf8";
      c.fillRect(startX + i * (barWidth + barSpacing), h / 2 + 80 - bh, barWidth, bh);
    }

    // Bouton de lecture / plein écran
    c.fillStyle = "rgba(0,0,0,0.7)";
    c.beginPath();
    c.roundRect(w / 2 - 120, h - 68, 240, 36, 18);
    c.fill();
    c.strokeStyle = "#ffd23f";
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = "#ffffff";
    c.font = "bold 15px Arial, sans-serif";
    c.fillText("▶ Clique pour Plein Écran", w / 2, h - 45);

    // Scanlines rétro TV subtiles
    c.fillStyle = "rgba(0, 0, 0, 0.12)";
    for (let y = 0; y < h; y += 4) {
      c.fillRect(0, y, w, 2);
    }
  }

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
