import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import { existsSync } from 'node:fs';

export const TITLE = 'Nikita Mikaev';
export const SUBTITLE = 'Photography';
export const SITE_TITLE = `${TITLE} — Photographer in Tbilisi`;
export const DESCRIPTION =
  'Nikita Mikaev is a photographer based in Tbilisi, Georgia. Street, portrait, event, architecture and interior photography. Available for commercial shoots.';

export const CONTACTS = [
  { kind: 'instagram', label: 'Instagram', value: '@nikitas.roll', href: 'https://instagram.com/nikitas.roll' },
  { kind: 'telegram', label: 'Telegram', value: '@turingalan', href: 'https://t.me/turingalan' },
  { kind: 'email', label: 'Email', value: 'n.v.mikaev@gmail.com', href: 'mailto:n.v.mikaev@gmail.com' },
];

// Заголовок (h1) и описание страницы альбома для поисковиков, по slug альбома.
// Для альбомов, которых здесь нет: «<Альбом> Photography» и описание по шаблону.
const ALBUM_SEO: Record<string, { heading?: string; description?: string }> = {
  street: { description: 'Street photography from Tbilisi, Georgia: everyday life, markets, cafés and city festivals.' },
  people: { heading: 'People & Portrait Photography', description: 'Candid portraits of people in Tbilisi, Georgia: vendors, cooks, baristas and passers-by.' },
  food: { heading: 'Food Photography', description: 'Food photography in Tbilisi, Georgia, for restaurants, cafés and menus.' },
  'landscape-nature': { heading: 'Landscape & Nature Photography', description: 'Landscape and nature photography from Georgia: mountains, national parks and countryside.' },
  architecture: { description: 'Architecture photography in Tbilisi, Georgia: buildings, facades and urban details.' },
  interior: { description: 'Interior photography in Tbilisi, Georgia, for restaurants, cafés, hotels and apartments.' },
  exterior: { description: 'Exterior photography in Tbilisi, Georgia: facades, storefronts and venues.' },
  events: { heading: 'Event Photography', description: 'Event photography in Tbilisi, Georgia: festivals, parties and public events.' },
  animals: { heading: 'Animal Photography' },
  poverty: { heading: 'Poverty — Documentary Photography' },
  'the-theater-of-absurd': { heading: 'The Theater of Absurd', description: 'The Theater of Absurd — a photo series by Nikita Mikaev.' },
  zakhar: { heading: 'Zakhar — Portrait Session', description: 'Zakhar — an outdoor portrait session in Tbilisi, Georgia.' },
  katya: { heading: 'Katya — Portrait Session', description: 'Katya — an outdoor portrait session in Tbilisi, Georgia.' },
};

export type Album = { slug: string; title: string; heading: string; description: string; count: number };
export type Photo = { src: ImageMetadata; title: string; album: { slug: string; title: string } | null };

// WebP-мастера из src/photos (их готовит `npm run photos`).
// Папка = альбом, имя файла = название фото:
//   src/photos/Abstract/The Theater of Absurd.webp → альбом «Abstract», фото «The Theater of Absurd».
// Порядок — по имени. Необязательный числовой префикс («01 », «01-», «01. ») задаёт порядок
// и в название не попадает. Имена с камеры (DSC02537, IMG_1234) выводятся без названия.
const modules = import.meta.glob<{ default: ImageMetadata }>('../photos/**/*.webp', { eager: true });

const CAMERA_NAME = /^(_?DSC[FN]?|IMG|PXL|DJI|GOPR|MVIMG)[_-]?\d/i;
const titleOf = (name: string) =>
  CAMERA_NAME.test(name) ? '' : name.replace(/^\d+[-_. ]+/, '').replace(/_/g, ' ').trim();
// Адрес альбома: «Landscape/Nature» → /landscape-nature/
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const albumOf = (path: string) => {
  const parts = path.replace('../photos/', '').split('/');
  if (parts.length < 2) return null;
  // «/» в имени папки: scripts/photos.mjs пишет его как «∕» (U+2215) — «05 Landscape∕Nature» → «Landscape/Nature»
  const title = (titleOf(parts[0]) || parts[0]).replace(/[:∕]/g, '/');
  return { slug: slugify(title), title };
};

export const photos: Photo[] = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([path, mod]) => {
    const name = path.split('/').pop()!.replace(/\.[^.]+$/, '');
    return { src: mod.default, title: titleOf(name).replace(/∕/g, '/'), album: albumOf(path) };
  });

export const albums: Album[] = [
  ...new Map(photos.filter((p) => p.album).map((p) => [p.album!.slug, p.album!])).values(),
].map((a) => {
  const count = photos.filter((p) => p.album?.slug === a.slug).length;
  const seo = ALBUM_SEO[a.slug] ?? {};
  const heading = seo.heading ?? `${a.title} Photography`;
  const description = `${seo.description ?? `${heading} by ${TITLE}, a photographer based in Tbilisi, Georgia.`} ${count} photos.`;
  return { ...a, heading, description, count };
});

export const albumUrl = (slug?: string) => (slug ? `/${slug}/` : '/');

// Превью для ссылок (Open Graph): JPEG 1200×630, кадрируется вручную.
// Для альбома — public/og/<slug>.jpg, если файла нет — общий public/og.jpg.
export const ogImageOf = (slug?: string) =>
  slug && existsSync(`public/og/${slug}.jpg`) ? `/og/${slug}.jpg` : '/og.jpg';

// Подпись к фото для alt и поисковиков: «Название — Альбом — photo by Nikita Mikaev».
export const altOf = (p: Photo) => [p.title, p.album?.title, `photo by ${TITLE}`].filter(Boolean).join(' — ');

// Полноэкранный просмотр: браузер сам выберет размер по экрану и DPR.
const FULL_WIDTHS = [1280, 1920, 2560];
const FULL_QUALITY = 85;

export async function fullImage(src: ImageMetadata) {
  const widths = FULL_WIDTHS.filter((w) => w < src.width);
  if (widths.length === 0 || src.width <= 2560) widths.push(Math.min(src.width, 2560));
  const full = await getImage({
    src,
    width: Math.min(src.width, 1920), // fallback src для старых браузеров
    widths: [...new Set(widths)],
    sizes: '100vw',
    format: 'webp',
    quality: FULL_QUALITY,
  });
  return { href: full.src, srcset: full.srcSet.attribute };
}
