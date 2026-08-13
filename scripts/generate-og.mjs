#!/usr/bin/env node
/**
 * Génère les images sociales (Open Graph, 1200×630) des principales pages.
 *
 * Usage : `node scripts/generate-og.mjs`
 *
 * Produit `public/og-<slug>.png` pour chaque page listée, avec un fond sombre,
 * un dégradé violet/cyan, le titre et le nom du site. Ces images sont ensuite
 * référencées par les layouts (BaseLayout / ArticleLayout) via le frontmatter
 * `ogImage` ou une table de correspondance.
 *
 * Remarque : nécessite le paquet `sharp` ou, à défaut, PIL via Python. On tente
 * d'abord sharp (déjà présent dans node_modules d'Astro), sinon fallback sur
 * Python/Pillow.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const PUBLIC = join(process.cwd(), 'public');

// Pages principales et leur titre (titre court affiché sur l'image).
// NB : on n'écrase PAS og-default.jpg (image de marque originale) ; la home
// continue d'utiliser og-default.jpg. Chaque page listée reçoit son propre og-<slug>.png.
const PAGES = {
  resume: 'Résumé de la théorie',
  'theorie-complete': 'La théorie complète',
  chronologie: 'Chronologie',
  dossiers: 'Les dossiers',
  chapitres: 'Les analyses de chapitres',
  glossaire: 'Glossaire',
  explorer: 'Explorer la théorie',
  'carte-mentale': 'La carte mentale',
};

// Rendu via Python/Pillow (plus simple et robuste que sharp pour du texte).
function renderPng(slug, title) {
  const outPath = join(PUBLIC, `og-${slug}.png`);
  const script = `
import sys
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
img = Image.new('RGB', (W, H), (14, 23, 34))
px = img.load()
# fond avec dégradé vertical violet -> bleu profond -> cyan
import colorsys
for y in range(H):
    t = y / H
    r = int(20 + 110 * t)
    g = int(30 + 60 * t)
    b = int(60 + 140 * (1 - t))
    for x in range(W):
        px[x, y] = (r, g, b)

d = ImageDraw.Draw(img)
try:
    font_title = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 72)
    font_sub = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 40)
    font_site = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 34)
except Exception:
    font_title = font_sub = font_site = ImageFont.load_default()

# bandeau site en haut
d.text((60, 40), 'LES FOUS DU BUS', font=font_site, fill=(95, 185, 194))
d.line((60, 90, W - 60, 90), fill=(124, 58, 237), width=3)

# titre, avec retour à la ligne si trop long
maxw = W - 120
title = ${JSON.stringify(title)}
words = title.split(' ')
lines, cur = [], ''
for w in words:
    t = (cur + ' ' + w).strip()
    if d.textlength(t, font=font_title) <= maxw:
        cur = t
    else:
        lines.append(cur)
        cur = w
lines.append(cur)
y0 = 230
for ln in lines:
    d.text((60, y0), ln, font=font_title, fill=(243, 239, 230))
    y0 += 88

d.text((60, H - 70), 'Une théorie sur One Piece', font=font_sub, fill=(174, 183, 194))
img.save(${JSON.stringify(outPath)})
print('OK', ${JSON.stringify(outPath)})
`;
  try {
    execFileSync('python3', ['-c', script], { stdio: 'inherit' });
    return true;
  } catch (e) {
    console.error('  échec renderPng', e.message);
    return false;
  }
}

mkdirSync(PUBLIC, { recursive: true });
let ok = 0;
let skipped = 0;
for (const [slug, title] of Object.entries(PAGES)) {
  const outPath = join(PUBLIC, `og-${slug}.png`);
  // Ne régénère jamais une image existante : les visuels committed font foi,
  // et ça évite les erreurs dans les environnements sans Pillow.
  if (existsSync(outPath)) {
    skipped++;
    continue;
  }
  if (renderPng(slug, title)) ok++;
}
console.log(
  `[og] ${ok} générée(s), ${skipped} déjà présente(s) sur ${Object.keys(PAGES).length}`,
);
