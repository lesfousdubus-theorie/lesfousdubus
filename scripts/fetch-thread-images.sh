#!/usr/bin/env bash
# Télécharge les images originales du thread X "La Galley-La : une coïncidence impossible"
# Auteur : @FoudubusTV_ — 08/08/2026
# Usage : bash scripts/fetch-thread-images.sh
#
# Nécessite curl ou wget et un accès à pbs.twimg.com (non bloqué par le réseau).
# Les images sont enregistrées dans public/images/threads/galley-la-coincidence-impossible/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST="$REPO_ROOT/public/images/threads/galley-la-coincidence-impossible"
URLS_FILE="$DEST/urls.txt"

if [ ! -f "$URLS_FILE" ]; then
  echo "❌ Fichier urls.txt introuvable : $URLS_FILE" >&2
  exit 1
fi

mkdir -p "$DEST"

command -v curl >/dev/null 2>&1 || { echo "❌ curl est requis" >&2; exit 1; }

echo "📥 Téléchargement des images du thread vers $DEST"
echo ""

success=0
fail=0
while IFS='|' read -r name url; do
  # Ignore comments and blank lines
  [[ "$name" =~ ^#.*$ || -z "$name" ]] && continue
  target="$DEST/$name"
  # If target is a directory (_placeholder_ia/ etc), skip
  [ -d "$target" ] && continue
  if [ -s "$target" ]; then
    echo "  ✓ $name (déjà présent)"
    success=$((success+1))
    continue
  fi
  echo "  ⬇  $name ← $url"
  if curl -sS -L -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/127.0 Safari/537.36" \
       -H "Referer: https://x.com/" \
       --max-time 30 \
       -o "$target" "$url"; then
    # Verify it's actually an image (not HTML)
    size=$(stat -c%s "$target" 2>/dev/null || echo 0)
    if [ "$size" -lt 1000 ]; then
      head -c 200 "$target" | head -1
      echo "    ⚠️  Fichier trop petit ($size octets) – probablement une erreur, on le supprime"
      rm -f "$target"
      fail=$((fail+1))
    else
      success=$((success+1))
    fi
  else
    echo "    ❌ Échec pour $name"
    rm -f "$target"
    fail=$((fail+1))
  fi
done < "$URLS_FILE"

echo ""
echo "✅ Terminé : $success téléchargées, $fail en échec."
if [ "$fail" -gt 0 ]; then
  echo "   Si pbs.twimg.com est inaccessible, essayez depuis une connexion différente,"
  echo "   ou téléchargez manuellement depuis le thread :"
  echo "   https://x.com/FoudubusTV_/status/2086126492228964579"
  exit 1
fi
