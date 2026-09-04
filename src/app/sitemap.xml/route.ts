import { NextResponse } from 'next/server';
import { AVAILABLE_UFS } from '@/constants/elections';
import { getSiteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const siteUrl = getSiteUrl();

  const ufEntries = AVAILABLE_UFS.map((uf) => {
    const loc = `${siteUrl}/sitemap/${uf.toLowerCase()}.xml`;
    return `  <sitemap>\n    <loc>${loc}</loc>\n  </sitemap>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap>\n    <loc>${siteUrl}/sitemap/static.xml</loc>\n  </sitemap>\n${ufEntries.join('\n')}\n</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
