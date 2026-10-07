# mikaevnikita.github.io

Фотогалерея на [Astro](https://astro.build), деплоится на GitHub Pages: https://mikaevnikita.github.io

## Как добавить фото

1. Положите оригиналы (JPG, PNG, TIFF) в папку `originals/`. Она есть только у вас локально и на GitHub не попадает.
   **Папка — это альбом, имя файла — название фото:**
   ```
   originals/
     Abstract/
       The Theater of Absurd.jpg   → альбом «Abstract», фото «The Theater of Absurd»
     Street/
       Red Market.jpg
     DSC02537.jpg                  → без альбома (только во «All») и без подписи
   ```
   - Порядок — по имени. Чтобы задать его явно, начните имя с номера: `01 Street`, `02 The Theater of Absurd.jpg`. Номер в название не попадает.
   - Имена с камеры (`DSC…`, `IMG_…`) подписью не показываются.
2. Запустите `npm run photos`. В `src/photos/` появятся WebP-мастера с той же структурой папок: длинная сторона до 2560 px, качество 92, поворот по EXIF, sRGB, без метаданных (включая GPS). Уже сконвертированные фото пропускаются.
   Если фото в `originals/` переименовать, перенести в другой альбом или удалить, старый WebP тоже удалится. Если `originals/` пуста или её нет (например, на другом компьютере), ничего не удаляется.
   Можно взять фото и из другой папки: `npm run photos -- ~/Pictures/export`. Они лягут в корень `src/photos/`, синхронизации при этом нет.
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
