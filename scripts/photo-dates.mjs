// Ведёт src/photo-dates.json: дата загрузки каждого фото из src/photos.
//   npm run photo-dates   — обновить файл (вызывается и из `npm run upload`)
// Дата загрузки — это дата коммита, которым фото впервые попало в git (автор коммита).
// Для фото, которых ещё нет в git, ставится текущее время.
// Переименованное фото (git видит его как переименование) сохраняет дату старого имени.
// Сайт сортирует фото по этой дате: новые сверху (src/lib/gallery.ts).
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const PHOTOS = resolve('src/photos');
const OUT = resolve('src/photo-dates.json');

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

// Все .webp в src/photos: ключ — путь относительно src/photos, через «/».
async function listPhotos() {
  const keys = [];
  for (const e of await readdir(PHOTOS, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith('.webp')) keys.push(e.name);
    if (e.isDirectory()) {
      for (const f of await readdir(join(PHOTOS, e.name))) if (f.endsWith('.webp')) keys.push(`${e.name}/${f}`);
    }
  }
  return keys;
}

// Переименования в индексе (после git add): новый путь → старый путь.
function stagedRenames() {
  const out = git('diff', '--cached', '-M', '--name-status', '-z', '--', 'src/photos').split('\0');
  const renames = new Map();
  for (let i = 0; i < out.length; ) {
    const status = out[i++];
    if (!status) continue;
    if (status.startsWith('R')) {
      const from = out[i++].replace(/^src\/photos\//, '');
      const to = out[i++].replace(/^src\/photos\//, '');
      renames.set(to, from);
    } else {
      i++; // у остальных статусов один путь
    }
  }
  return renames;
}

// Дата первого коммита, который добавил файл (с учётом переименований в истории).
function gitAddedAt(key) {
  const log = git('log', '--follow', '--format=%aI', '--', `src/photos/${key}`).trim();
  if (!log) return null;
  return log.split('\n').pop(); // самый старый коммит — последний в выводе
}

const existing = JSON.parse(await readFile(OUT, 'utf8').catch(() => '{}'));
const keys = await listPhotos();
const renames = stagedRenames();
const now = new Date().toISOString();

const dates = {};
const added = [];
for (const key of keys) {
  if (existing[key]) {
    dates[key] = existing[key];
  } else if (renames.has(key) && existing[renames.get(key)]) {
    dates[key] = existing[renames.get(key)];
  } else {
    const fromGit = gitAddedAt(key);
    dates[key] = fromGit ?? now;
    added.push(key);
  }
}

const sorted = Object.fromEntries(Object.entries(dates).sort(([a], [b]) => a.localeCompare(b)));
const before = await readFile(OUT, 'utf8').catch(() => '');
const after = JSON.stringify(sorted, null, 2) + '\n';
if (before !== after) await writeFile(OUT, after);

const removed = Object.keys(existing).filter((k) => !(k in dates));
console.log(`Даты загрузки: ${keys.length} фото, новых ${added.length}, удалено из списка ${removed.length}.`);
