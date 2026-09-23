import { NextResponse } from 'next/server';
import { getSitemapManifest } from '@/lib/sitemap';
import { getSiteUrl } from '@/lib/seo';

export const revalidate = 86400;

export async function GET() {
  const siteUrl = getSiteUrl();

  const manifest = await getSitemapManifest();
  const ufEntries = manifest.flatMap(({ uf, pages }) => Array.from({ length: pages }, (_, page) =>
    `  <sitemap><loc>${siteUrl}/sitemap/${uf}/${page + 1}.xml</loc></sitemap>`
  ));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap>\n    <loc>${siteUrl}/sitemap/static.xml</loc>\n  </sitemap>\n${ufEntries.join('\n')}\n</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
