# mikaevnikita.github.io

Фотогалерея на [Astro](https://astro.build), деплоится на GitHub Pages: https://mikaevnikita.github.io

## Как добавить фото

1. Положите фото (JPG, PNG или WebP) в `src/photos/`. Порядок задаётся именем файла (`01-…`, `02-…`), подпись берётся из имени: `03-morning-sea.jpg` → «morning sea».
2. `git add . && git commit -m "new photos" && git push`. Сайт обновится сам.

Конвертировать ничего не нужно. При сборке каждое фото автоматически:
- переводится в WebP (sharp, `effort 6`, `smartSubsample`, пресет `photo`) и в sRGB, поворачивается по EXIF, метаданные (включая GPS) удаляются;
- нарезается для сетки (480/800/1200/1600 px, качество 80) и для полноэкранного просмотра (1280/1920/2560 px, качество 85).

Браузер сам выбирает нужный размер по экрану и плотности пикселей. Настройки лежат в начале `src/pages/index.astro` и в `astro.config.mjs`.

## Локально

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # сборка в dist/
```
