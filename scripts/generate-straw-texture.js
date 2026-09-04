const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function generateStrawTexture() {
  const width = 1024;
  const height = 1024;
  const buffer = Buffer.alloc(width * height * 4);

  // Synthesize rich woven straw texture
  // Straw consists of concentric / parallel braids with cross-stitching
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Primary horizontal weave bands (height ~ 32px per braid)
      const bandY = (y % 32) / 32;
      const bandRow = Math.floor(y / 32);

      // Braid wave offset
      const xOffset = bandRow % 2 === 0 ? 0 : 16;
      const stitchX = ((x + xOffset) % 32) / 32;

      // Cylindrical rounding of each straw strip
      const stripProfile = Math.sin(bandY * Math.PI);
      const stitchProfile = Math.sin(stitchX * Math.PI);

      // Interlocking weave brightness factor
      const weave = Math.sin((x * 0.4) + Math.sin(y * 0.2) * 2) * 0.08 +
                    Math.cos((y * 0.4) - Math.cos(x * 0.2) * 2) * 0.08;

      // Fine fiber grain
      const grain = (Math.sin(x * 2.5 + y * 0.3) * 0.5 + 0.5) * 0.12;
      const microNoise = ((Math.random() - 0.5) * 0.08);

      // Shadow in crevice between bands
      const crevice = Math.pow(Math.sin(bandY * Math.PI), 0.35) * Math.pow(Math.sin(stitchX * Math.PI), 0.35);

      // Base straw color: Warm golden amber (Luffy Mugiwara)
      // R: 235, G: 180, B: 75 -> base
      // Highlight: 255, 225, 130
      // Deep shadow: 140, 85, 20
      const intensity = 0.55 + crevice * 0.45 + weave + grain + microNoise;

      const r = Math.min(255, Math.max(0, Math.round(230 * intensity + (bandRow % 3 === 0 ? 15 : -10))));
      const g = Math.min(255, Math.max(0, Math.round(175 * intensity + (bandRow % 3 === 0 ? 10 : -8))));
      const b = Math.min(255, Math.max(0, Math.round(70 * intensity + (bandRow % 3 === 0 ? 5 : -5))));

      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = 255;
    }
  }

  const outPath = path.join(__dirname, "../public/textures/straw.jpg");
  await sharp(buffer, { raw: { width, height, channels: 4 } })
    .jpeg({ quality: 92 })
    .toFile(outPath);

  console.log("Straw texture generated at:", outPath);
}

generateStrawTexture().catch((err) => {
  console.error(err);
  process.exit(1);
});
