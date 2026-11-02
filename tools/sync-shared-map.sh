#!/usr/bin/env bash
# מסנכרן את המפה המשותפת (המקור היחיד: Hadabadra/Mikvaot/shared/map-core) אל guides/_shared/map/.
# שימוש: tools/sync-shared-map.sh [נתיב-מקומי-ל-Mikvaot]   — בלי נתיב מוריד מ-raw.githubusercontent.com
set -euo pipefail
cd "$(dirname "$0")/.."
dst=guides/_shared/map; mkdir -p "$dst"
for f in map-core.js map-ui.js; do
  if [ -n "${1:-}" ]; then cp "$1/shared/map-core/$f" "$dst/$f"
  else curl -fsSL "https://raw.githubusercontent.com/Hadabadra/Mikvaot/main/shared/map-core/$f" -o "$dst/$f"; fi
done
echo "סונכרן: $(grep -o "VERSION = '[^']*'" $dst/map-ui.js)"
