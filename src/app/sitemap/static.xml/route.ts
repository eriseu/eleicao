import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/seo';
import { xmlEscape } from '@/lib/sitemap';

export const revalidate = 86400;

export async function GET() {
  const siteUrl = getSiteUrl();
  const routes = ['/', '/duelo', '/ranking'];
  const urlEntries = routes.map((route) => {
    const loc = xmlEscape(`${siteUrl}${route}`);
    return `  <url>\n    <loc>${loc}</loc>\n  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}