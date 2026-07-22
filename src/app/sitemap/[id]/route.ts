import { getSiteUrl } from '@/lib/seo';
import { getSitemapCandidates, xmlEscape } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';

type SitemapRouteProps = {
  params: Promise<{ id: string }>;
};

type SitemapEntry = {
  url: string;
  changeFrequency: 'daily' | 'weekly';
  priority: number;
};

function createXml(entries: SitemapEntry[]) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(({ url, changeFrequency, priority }) => [
      '  <url>',
      `    <loc>${xmlEscape(url)}</loc>`,
      `    <changefreq>${changeFrequency}</changefreq>`,
      `    <priority>${priority.toFixed(1)}</priority>`,
      '  </url>',
    ].join('\n')),
    '</urlset>',
  ].join('\n');
}

export async function GET(_request: Request, { params }: SitemapRouteProps) {
  const { id: fileName } = await params;
  if (!fileName.endsWith('.xml')) {
    return new Response('Sitemap não encontrado.', { status: 404 });
  }

  const id = fileName.slice(0, -4);
  const siteUrl = getSiteUrl();
  let entries: SitemapEntry[];

  if (id === 'static') {
    entries = [
      { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
      { url: `${siteUrl}/ranking`, changeFrequency: 'daily', priority: 0.9 },
      { url: `${siteUrl}/duelo`, changeFrequency: 'weekly', priority: 0.8 },
    ];
  } else {
    const page = Number(id);
    if (!Number.isSafeInteger(page) || page < 0) {
      return new Response('Sitemap não encontrado.', { status: 404 });
    }

    try {
      const candidates = await getSitemapCandidates(page);
      if (candidates.length === 0) {
        return new Response('Sitemap não encontrado.', { status: 404 });
      }
      entries = candidates.flatMap((candidate) => {
        const rankingUrl = new URL('/ranking', siteUrl);
        rankingUrl.searchParams.set('uf', candidate.uf);
        rankingUrl.searchParams.set('highlight', candidate.id);

        return [
          {
            url: rankingUrl.toString(),
            changeFrequency: 'daily' as const,
            priority: 0.7,
          },
          {
            url: `${siteUrl}/candidato/${encodeURIComponent(candidate.id)}`,
            changeFrequency: 'weekly' as const,
            priority: 0.6,
          },
        ];
      });
    } catch (error) {
      console.error(error);
      return new Response('Não foi possível gerar o sitemap.', { status: 503 });
    }
  }

  return new Response(createXml(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
