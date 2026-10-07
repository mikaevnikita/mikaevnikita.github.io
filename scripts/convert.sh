#!/bin/sh
# Конвертирует JPG/PNG из src/photos в WebP (нужен cwebp: brew install webp).
# Исходники после конвертации удаляются.
set -e
cd "$(dirname "$0")/../src/photos"
for f in *.jpg *.jpeg *.JPG *.JPEG *.png *.PNG; do
  [ -e "$f" ] || continue
  out="${f%.*}.webp"
  cwebp -quiet -q 90 -metadata icc "$f" -o "$out" && rm "$f"
  echo "✓ $out"
done
