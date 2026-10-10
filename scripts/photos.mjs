// Готовит WebP-мастера для сайта из оригиналов.
//   npm run photos                    — берёт фото из ./originals
//   npm run photos -- ~/Pictures/trip — или из любой другой папки
// Папка = альбом, имя файла = название фото:
//   originals/Abstract/The Theater of Absurd.jpg → src/photos/Abstract/The Theater of Absurd.webp
// Оригиналы в git не попадают; в src/photos (и на GitHub) кладутся только .webp.
// Скрипт только добавляет новые .webp и ничего не удаляет: оригиналы после конвертации
// можно стирать. Переименовать, перенести или удалить фото — прямо в src/photos.
import { readdir, stat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, parse, resolve } from 'node:path';
import { availableParallelism } from 'node:os';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

// Мастер — источник для всех размеров, которые Astro нарежет при сборке.
// Длинная сторона 2560 px (максимум, который отдаёт сайт) и высокое качество,
// чтобы повторное сжатие при сборке не давало заметных потерь.
const MAX_SIDE = 2560;
const QUALITY = 92;

const SRC = resolve(process.argv[2] ?? 'originals');
const OUT = resolve('src/photos');
const INPUT = /\.(jpe?g|png|tiff?|webp|avif)$/i;

// «/», набранный в Finder, хранится на диске как «:», а с «:» в пути ломаются картинки
// в dev-сервере. Заменяем его на похожий символ «∕» (U+2215); на сайте он выводится как «/».
const safe = (p) => p.replace(/:/g, '∕');

// Фото в корне и в подпапках первого уровня (альбомах).
const entries = await readdir(SRC, { withFileTypes: true }).catch(() => []);
let files = [];
for (const e of entries) {
  if (e.isFile() && INPUT.test(e.name)) files.push(e.name);
  if (e.isDirectory()) {
    for (const f of await readdir(join(SRC, e.name))) if (INPUT.test(f)) files.push(join(e.name, f));
  }
}
files.sort();
if (files.length === 0) console.log(`Нет новых фото в ${SRC}`);

// Фото, которые уже были на сайте и потом удалены из src/photos (по истории git),
// заново не создаём, даже если оригинал ещё лежит в originals.
const removed = new Set(
  (() => {
    try {
      return execFileSync('git', ['log', '--diff-filter=D', '--name-only', '-z', '--format=', '--', 'src/photos'], {
        encoding: 'utf8',
      }).split('\0');
    } catch {
      return [];
    }
  })()
    .filter(Boolean)
    .map((p) => resolve(p.trim())),
);

let done = 0;
let skipped = 0;
let removedSkipped = 0;

async function convert(file) {
  const input = join(SRC, file);
  const output = join(OUT, safe(parse(file).dir), `${safe(parse(file).name)}.webp`);
  if (removed.has(output) && !(await stat(output).catch(() => null))) {
    removedSkipped++;
    return;
  }
  const inStat = await stat(input);
  const outStat = await stat(output).catch(() => null);
  if (outStat && outStat.mtimeMs >= inStat.mtimeMs) {
    skipped++;
    return;
  }
  await mkdir(dirname(output), { recursive: true });
  // rotate() — поворот по EXIF; метаданные (EXIF, GPS) не копируются,
  // цвет приводится к sRGB.
  const info = await sharp(input, { limitInputPixels: false })
    .rotate()
    .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6, smartSubsample: true, preset: 'photo' })
    .toFile(output);
  console.log(
    `✓ ${file} → ${join(safe(parse(file).dir), parse(output).base)}  ${info.width}×${info.height}  ` +
      `${(inStat.size / 1e6).toFixed(1)} → ${(info.size / 1e6).toFixed(2)} МБ`,
  );
  done++;
}

// Кодирование WebP однопоточное — конвертируем по фото на ядро.
const queue = [...files];
await Promise.all(
  Array.from({ length: availableParallelism() }, async () => {
    while (queue.length) await convert(queue.shift());
  }),
);
console.log(`Готово: ${done} сконвертировано, ${skipped} без изменений.`);
if (removedSkipped > 0) console.log(`Пропущено ${removedSkipped}: эти фото раньше удалены из src/photos.`);

// Проверка дублей: одно и то же фото в src/photos под разными именами или в разных альбомах.
// Сравниваем перцептивный хеш (dHash 16×16): он совпадает у одного кадра, даже если файл
// переименован или пережат, но различает разные снимки. Хеши кешируются по mtime/размеру.
const CACHE = resolve('node_modules/.cache/photo-hashes.json');
const MAX_DISTANCE = 10; // из 256 бит; у разных кадров обычно 80+

const cache = JSON.parse(await readFile(CACHE, 'utf8').catch(() => '{}'));
const hashes = [];
const outEntries = await readdir(OUT, { withFileTypes: true }).catch(() => []);
for (const e of outEntries) {
  const rels = e.isDirectory() ? (await readdir(join(OUT, e.name))).map((f) => join(e.name, f)) : [e.name];
  for (const rel of rels.filter((f) => f.endsWith('.webp'))) {
    const st = await stat(join(OUT, rel));
    const key = `${st.size}:${st.mtimeMs}`;
    if (cache[rel]?.key !== key) cache[rel] = { key, hash: await dhash(join(OUT, rel)) };
    hashes.push({ rel, hash: Buffer.from(cache[rel].hash, 'hex') });
  }
}
for (const rel of Object.keys(cache)) if (!hashes.some((h) => h.rel === rel)) delete cache[rel];
await mkdir(dirname(CACHE), { recursive: true });
await writeFile(CACHE, JSON.stringify(cache));

// Группируем похожие фото
const groups = [];
const seen = new Set();
for (let i = 0; i < hashes.length; i++) {
  if (seen.has(i)) continue;
  const group = [hashes[i].rel];
  for (let j = i + 1; j < hashes.length; j++) {
    if (!seen.has(j) && distance(hashes[i].hash, hashes[j].hash) <= MAX_DISTANCE) {
      group.push(hashes[j].rel);
      seen.add(j);
    }
  }
  if (group.length > 1) groups.push(group);
}
if (groups.length > 0) {
  console.warn(`\n⚠️  Найдены дубли (${groups.length}) — одно и то же фото в нескольких местах src/photos:`);
  for (const g of groups) console.warn(g.map((rel) => `   • ${rel}`).join('\n') + '\n');
  console.warn('   Оставьте нужный вариант, остальные удалите из src/photos.');
}

async function dhash(file) {
  const px = await sharp(file).greyscale().resize(17, 16, { fit: 'fill' }).raw().toBuffer();
  const bits = Buffer.alloc(32);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (px[y * 17 + x] > px[y * 17 + x + 1]) bits[(y * 16 + x) >> 3] |= 1 << (x & 7);
    }
  }
  return bits.toString('hex');
}

function distance(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) for (let v = a[i] ^ b[i]; v; v &= v - 1) d++;
  return d;
}
