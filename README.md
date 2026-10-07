# mikaevnikita.github.io

Фотогалерея на [Astro](https://astro.build), деплоится на GitHub Pages: https://mikaevnikita.github.io

## Как добавить фото

1. Положите `.webp` в `src/photos/`. Порядок задаётся именем файла (`01-…`, `02-…`), подпись берётся из имени: `03-morning-sea.webp` → «morning sea».
2. JPG/PNG можно сконвертировать командой `npm run convert` (нужен `cwebp`: `brew install webp`).
3. `git add . && git commit -m "new photos" && git push`. Сайт обновится сам.

## Локально

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # сборка в dist/
```
