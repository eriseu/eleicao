import { getSiteUrl } from '@/lib/seo';
import { getSitemapCandidateCount, SITEMAP_PAGE_SIZE, xmlEscape } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
  const siteUrl = getSiteUrl();

  try {
    const candidateCount = await getSitemapCandidateCount();
    const pageCount = Math.ceil(candidateCount / SITEMAP_PAGE_SIZE);
    const sitemaps = [
      `${siteUrl}/sitemap/static.xml`,
      ...Array.from({ length: pageCount }, (_, page) => `${siteUrl}/sitemap/${page}.xml`),
    ];
    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...sitemaps.map((url) => `  <sitemap><loc>${xmlEscape(url)}</loc></sitemap>`),
      '</sitemapindex>',
    ].join('\n');

    return new Response(body, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error(error);
    return new Response('Não foi possível gerar o sitemap.', { status: 503 });
  }
}

