import { NextResponse } from 'next/server';
import { AVAILABLE_UFS } from '@/constants/elections';
import { getSiteUrl } from '@/lib/seo';
import { getCandidateIdsForUf, SITEMAP_PAGE_SIZE } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';

function buildUfSitemapUrl(uf: string, pageIndex: number) {
  const base = uf.toLowerCase();
  return pageIndex === 0 ? `${base}.xml` : `${base}-${pageIndex + 1}.xml`;
}

export async function GET() {
  const siteUrl = getSiteUrl();
  const urlEntries: string[] = [];
  const seenUrls = new Set<string>();

  for (const uf of AVAILABLE_UFS) {
    const ids = await getCandidateIdsForUf(uf);
    const totalPages = Math.max(0, Math.ceil(ids.length / SITEMAP_PAGE_SIZE));

    if (totalPages === 0) continue;

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
      const loc = `${siteUrl}/sitemap/${buildUfSitemapUrl(uf, pageIndex)}`;
      if (seenUrls.has(loc)) continue;

      seenUrls.add(loc);
      urlEntries.push(`
  <sitemap>
    <loc>${loc}</loc>
  </sitemap>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${siteUrl}/sitemap/static.xml</loc>
  </sitemap>
${urlEntries.join('')}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
