// Готовит WebP-мастера для сайта из оригиналов.
//   npm run photos                    — берёт фото из ./originals
//   npm run photos -- ~/Pictures/trip — или из любой другой папки
// Подпапки — это альбомы: originals/01-street/x.jpg → src/photos/01-street/x.webp.
// Оригиналы в git не попадают; в src/photos (и на GitHub) кладутся только .webp.
import { readdir, stat, mkdir } from 'node:fs/promises';
import { dirname, join, parse, resolve } from 'node:path';
import sharp from 'sharp';

// Мастер — источник для всех размеров, которые Astro нарежет при сборке.
// Длинная сторона 2560 px (максимум, который отдаёт сайт) и высокое качество,
// чтобы повторное сжатие при сборке не давало заметных потерь.
const MAX_SIDE = 2560;
const QUALITY = 92;

const SRC = resolve(process.argv[2] ?? 'originals');
const OUT = resolve('src/photos');
const INPUT = /\.(jpe?g|png|tiff?|webp|avif)$/i;

// Фото в корне и в подпапках первого уровня (альбомах).
const entries = await readdir(SRC, { withFileTypes: true }).catch(() => []);
const files = [];
for (const e of entries) {
  if (e.isFile() && INPUT.test(e.name)) files.push(e.name);
  if (e.isDirectory()) {
    for (const f of await readdir(join(SRC, e.name))) if (INPUT.test(f)) files.push(join(e.name, f));
  }
}
files.sort();
if (files.length === 0) {
  console.log(`Нет фото в ${SRC}`);
  process.exit(0);
}

let done = 0;
let skipped = 0;
for (const file of files) {
  const input = join(SRC, file);
  const output = join(OUT, parse(file).dir, `${parse(file).name}.webp`);
  const inStat = await stat(input);
  const outStat = await stat(output).catch(() => null);
  if (outStat && outStat.mtimeMs >= inStat.mtimeMs) {
    skipped++;
    continue;
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
    `✓ ${file} → ${join(parse(file).dir, parse(output).base)}  ${info.width}×${info.height}  ` +
      `${(inStat.size / 1e6).toFixed(1)} → ${(info.size / 1e6).toFixed(2)} МБ`,
  );
  done++;
}
console.log(`Готово: ${done} сконвертировано, ${skipped} без изменений.`);
