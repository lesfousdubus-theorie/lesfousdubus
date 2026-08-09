#!/usr/bin/env bash
# Optimise les images des fils d'analyse (public/images/threads) :
#   - conversion en WebP (qualité 82, largeur max 1200px, métadonnées purgées) ;
#   - génération de src/utils/image-dimensions.json (largeur/hauteur par URL),
#     consommé par le plugin rehype qui injecte width/height (anti-CLS) ;
#   - suppression des originaux jpg/jpeg/png une fois le WebP validé.
#
# Réutilisable : ne convertit que les fichiers non encore convertis ; la carte
# des dimensions est reconstruite depuis l'état final du disque.
# Usage : bash scripts/optimize-thread-images.sh   (nécessite ImageMagick)
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$REPO/public/images/threads"
MAP="$REPO/src/utils/image-dimensions.json"

command -v convert >/dev/null || { echo "ImageMagick requis (convert)" >&2; exit 1; }

converted=0
saved=0

while IFS= read -r -d '' f; do
  out="${f%.*}.webp"
  before=$(stat -c%s "$f")
  convert "$f" -resize '1200x1200>' -quality 82 -strip "$out"
  # Valide le WebP produit avant de toucher à l'original
  if ! identify "$out" >/dev/null 2>&1; then
    echo "✗ Échec conversion : $f" >&2
    rm -f "$out"
    continue
  fi
  after=$(stat -c%s "$out")
  rm "$f"
  converted=$((converted+1))
  saved=$((saved+before-after))
done < <(find "$ROOT" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0 | sort -z)

# Carte des dimensions reconstruite depuis l'état final du disque (couvre aussi
# les WebP convertis lors d'un passage précédent).
TMPMAP="$(mktemp)"
echo '{' > "$TMPMAP"
first=1
while IFS= read -r -d '' w_file; do
  # \n indispensable : sans lui, `read` renvoie 1 (EOF sans newline) et set -e tue le script.
  read -r w h < <(identify -format '%w %h\n' "$w_file")
  url="/${w_file#"$REPO/public"/}"
  if [ $first -eq 1 ]; then first=0; else echo ',' >> "$TMPMAP"; fi
  printf '  "%s": {"w": %d, "h": %d}' "$url" "$w" "$h" >> "$TMPMAP"
done < <(find "$REPO/public/images" -type f -iname '*.webp' -print0 | sort -z)
echo '' >> "$TMPMAP"
echo '}' >> "$TMPMAP"

node -e '
  const fs = require("fs");
  const fresh = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  fs.writeFileSync(process.argv[2], JSON.stringify(fresh, null, 2) + "\n");
' "$TMPMAP" "$MAP"
rm "$TMPMAP"

echo "✓ $converted image(s) convertie(s) en WebP (~$((saved/1024)) Ko économisés sur ce passage)"
echo "✓ Dimensions écrites dans $MAP"
