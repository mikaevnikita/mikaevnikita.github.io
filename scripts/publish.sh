#!/bin/bash
# Конвертирует новые фото из originals и заливает изменения src/photos на GitHub.
#   npm run upload
# В коммит попадают только src/photos (новые, переименованные и удалённые фото) и src/photo-dates.json.
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/photos.mjs

git add -A src/photos
# Даты загрузки для сортировки на сайте: новым фото — текущее время, переименованным — дата старого имени.
node scripts/photo-dates.mjs
git add src/photo-dates.json
if git diff --cached --quiet -- src/photos src/photo-dates.json; then
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
git diff --cached --stat -- src/photos src/photo-dates.json | cat
git commit -q -m "$msg" -- src/photos src/photo-dates.json
git pull -q --rebase --autostash
git push -q
echo
echo "✓ Залито: $msg"
echo "  Сайт обновится через пару минут после сборки на GitHub."
