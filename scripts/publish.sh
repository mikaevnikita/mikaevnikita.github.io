#!/bin/bash
# Конвертирует новые фото из originals и заливает изменения src/photos на GitHub.
#   npm run upload
# В коммит попадает только src/photos: новые, переименованные и удалённые фото.
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/photos.mjs

git add -A src/photos
if git diff --cached --quiet -- src/photos; then
  echo "Нечего заливать: в src/photos нет изменений."
  exit 0
fi

# Сообщение коммита: «Add 2 photos: Landscape∕Nature; Remove 1 photo: Street»
summary() { # $1 — фильтр git (A/D), $2 — глагол
  git diff --cached --name-only --diff-filter="$1" -z -- src/photos | tr '\0' '\n' |
    awk -F/ -v verb="$2" 'NF {
      n++; a = (NF > 3) ? $3 : "All"; sub(/^[0-9]+ /, "", a)
      if (!(a in seen)) { seen[a]; list = list (list ? ", " : "") a }
    } END { if (n) printf "%s %d photo%s: %s", verb, n, (n > 1 ? "s" : ""), list }'
}
msg=$(printf '%s\n' "$(summary A Add)" "$(summary D Remove)" | grep -v '^$' | paste -sd ';' - | sed 's/;/; /g')
[ -n "$msg" ] || msg="Update photos"

echo
git diff --cached --stat -- src/photos | cat
git commit -q -m "$msg" -- src/photos
git pull -q --rebase --autostash
git push -q
echo
echo "✓ Залито: $msg"
echo "  Сайт обновится через пару минут после сборки на GitHub."
