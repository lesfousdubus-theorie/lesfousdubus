#!/usr/bin/env bash
# Récupère la vignette de la vidéo YouTube de présentation et l'auto-héberge
# en WebP, afin qu'aucune requête tierce (img.youtube.com) ne soit émise
# avant le clic sur la façade vidéo de l'accueil.
#
# Usage : bash scripts/fetch-video-cover.sh   (nécessite curl + ImageMagick)
# Une fois public/images/video-cover.webp présent, le build l'utilise
# automatiquement (voir src/pages/index.astro).
set -euo pipefail

VIDEO_ID="SgJ25zjMJyo"
OUT="$(dirname "$0")/../public/images/video-cover.webp"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for quality in maxresdefault hqdefault; do
  echo "→ Tentative $quality…"
  if curl -fsSL -o "$TMP/cover.jpg" "https://img.youtube.com/vi/${VIDEO_ID}/${quality}.jpg"; then
    # hqdefault existe toujours ; maxresdefault peut manquer (image 120x90 grise)
    if identify -format '%w' "$TMP/cover.jpg" | grep -qv '^120$'; then
      convert "$TMP/cover.jpg" -resize '1280x720>' -quality 82 -strip "$OUT"
      echo "✓ Vignette auto-hébergée : $OUT"
      exit 0
    fi
  fi
done

echo "✗ Impossible de récupérer la vignette (réseau indisponible ?)" >&2
exit 1
