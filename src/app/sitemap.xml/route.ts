import { NextResponse } from 'next/server';
import { AVAILABLE_UFS } from '@/constants/elections';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Lista todas as UFs para gerar /sitemap/SP.xml, /sitemap/RJ.xml, etc.
  const ufsSitemaps = AVAILABLE_UFS.map(
    (uf) => `
  <sitemap>
    <loc>https://politica.centraleti.com.br/sitemap/${uf.toLowerCase()}.xml</loc>
  </sitemap>`
  ).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://politica.centraleti.com.br/sitemap/static.xml</loc>
  </sitemap>
${ufsSitemaps}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
