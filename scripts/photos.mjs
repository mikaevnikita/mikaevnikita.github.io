// Готовит WebP-мастера для сайта из оригиналов.
//   npm run photos                    — берёт фото из ./originals
//   npm run photos -- ~/Pictures/trip — или из любой другой папки
// Папка = альбом, имя файла = название фото:
//   originals/Abstract/The Theater of Absurd.jpg → src/photos/Abstract/The Theater of Absurd.webp
// Оригиналы в git не попадают; в src/photos (и на GitHub) кладутся только .webp.
// Для ./originals папка src/photos синхронизируется: если фото переименовать, перенести
// в другой альбом или удалить, старый .webp тоже удалится.
import { readdir, stat, mkdir, rm, rmdir } from 'node:fs/promises';
import { dirname, join, parse, resolve } from 'node:path';
import sharp from 'sharp';

// Мастер — источник для всех размеров, которые Astro нарежет при сборке.
// Длинная сторона 2560 px (максимум, который отдаёт сайт) и высокое качество,
// чтобы повторное сжатие при сборке не давало заметных потерь.
const MAX_SIDE = 2560;
const QUALITY = 92;

const SRC = resolve(process.argv[2] ?? 'originals');
const SYNC = process.argv[2] === undefined;
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

// Удаляем .webp, у которых больше нет оригинала (переименованные, перенесённые, удалённые).
let removed = 0;
if (SYNC) {
  const expected = new Set(files.map((f) => join(parse(f).dir, `${parse(f).name}.webp`)));
  const outEntries = await readdir(OUT, { withFileTypes: true }).catch(() => []);
  for (const e of outEntries) {
    const rels = e.isDirectory()
      ? (await readdir(join(OUT, e.name))).map((f) => join(e.name, f))
      : [e.name];
    for (const rel of rels.filter((f) => f.endsWith('.webp'))) {
      if (expected.has(rel)) continue;
      await rm(join(OUT, rel));
      console.log(`✗ ${rel} — оригинала больше нет, удалён`);
      removed++;
    }
    if (e.isDirectory()) await rmdir(join(OUT, e.name)).catch(() => {}); // только если пустая
  }
}
console.log(`Готово: ${done} сконвертировано, ${skipped} без изменений, ${removed} удалено.`);
