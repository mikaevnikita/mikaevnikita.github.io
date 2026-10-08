import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mikaevgallery.com',
  // Мгновенный переход между альбомами: страница подгружается при наведении на кнопку
  prefetch: true,
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        // Большие исходники с камеры (40+ Мп) не должны падать на лимите sharp
        limitInputPixels: false,
        // Настройки энкодера WebP для фото:
        // effort 6 — максимальное сжатие (медленнее сборка, меньше файлы),
        // smartSubsample — без цветных ореолов на контрастных краях,
        // preset photo — тюнинг libwebp под фотографии.
        webp: {
          effort: 6,
          smartSubsample: true,
          preset: 'photo',
        },
      },
    },
  },
});
