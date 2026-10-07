# mikaevnikita.github.io

Фотогалерея на [Astro](https://astro.build), деплоится на GitHub Pages: https://mikaevnikita.github.io

## Как добавить фото

1. Положите оригиналы (JPG, PNG, TIFF) в папку `originals/`. Она есть только у вас локально и на GitHub не попадает.
   Порядок на сайте задаётся именем файла (`01-…`, `02-…`), подпись берётся из имени: `03-morning-sea.jpg` → «morning sea».
   Альбомы — это подпапки: `originals/01-street/…`, `originals/02-portraits/…`. На сайте они станут плашками-фильтрами «Street», «Portraits» (числовой префикс задаёт порядок и в название не попадает). Фото из корня `originals/` видны только во вкладке «All».
2. Запустите `npm run photos`. В `src/photos/` появятся WebP-мастера: длинная сторона до 2560 px, качество 92, поворот по EXIF, sRGB, без метаданных (включая GPS). Уже сконвертированные фото пропускаются. Брать фото можно и из другой папки: `npm run photos -- ~/Pictures/export`.
3. `git add . && git commit -m "new photos" && git push`. Сайт обновится сам.

При сборке из мастеров нарезаются размеры для сетки (480–1600 px, качество 80) и для полноэкранного просмотра (1280–2560 px, качество 85), браузер выбирает нужный по экрану. Настройки лежат в `scripts/photos.mjs`, в начале `src/pages/index.astro` и в `astro.config.mjs`.

## Контакты

Ссылки в блоке «Contact me» задаются в массиве `CONTACTS` в начале `src/pages/index.astro`.

## Локально

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # сборка в dist/
```
