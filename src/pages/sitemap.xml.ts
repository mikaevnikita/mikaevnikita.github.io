import type { APIRoute } from 'astro';
import { albums, albumUrl, altOf, fullImage, photos } from '../lib/gallery';

// Sitemap: главная и страницы альбомов, у каждой — список фото для Google Images.
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async ({ site }) => {
  const pages = await Promise.all(
    [undefined, ...albums].map(async (album) => {
      const images = await Promise.all(
        photos
          .filter((p) => !album || p.album?.slug === album.slug)
          .map(async (p) => ({ loc: new URL((await fullImage(p.src)).href, site).href, title: altOf(p) })),
      );
      return { loc: new URL(albumUrl(album?.slug), site).href, images };
    }),
  );

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages
  .map(
    (p) => `  <url>
    <loc>${esc(p.loc)}</loc>
${p.images.map((i) => `    <image:image><image:loc>${esc(i.loc)}</image:loc></image:image>`).join('\n')}
  </url>`,
  )
  .join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
