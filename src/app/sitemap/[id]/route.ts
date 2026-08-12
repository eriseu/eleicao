import { NextResponse } from 'next/server';
import { AVAILABLE_UFS } from '@/constants/elections';
import { getSiteUrl } from '@/lib/seo';
import { getCandidateIdsForUf, SITEMAP_PAGE_SIZE, xmlEscape } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type SitemapEntry = {
  url: string;
  changeFrequency: 'daily' | 'weekly';
  priority: number;
};

function createXml(entries: SitemapEntry[]) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(
      ({ url, changeFrequency, priority }) =>
        `  <url>\n    <loc>${xmlEscape(url)}</loc>\n    <changefreq>${changeFrequency}</changefreq>\n    <priority>${priority.toFixed(1)}</priority>\n  </url>`
    ),
    '</urlset>',
  ].join('\n');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  
  // Remove a extensão .xml (insensível a maiúsculas)
  const rawId = resolvedParams.id.replace(/\.xml$/i, '').toUpperCase();
  const siteUrl = getSiteUrl();

  // Tratamento para static.xml
  if (rawId === 'STATIC') {
    const staticEntries: SitemapEntry[] = [
      { url: siteUrl, changeFrequency: 'weekly', priority: 1.0 },
      { url: `${siteUrl}/ranking`, changeFrequency: 'daily', priority: 0.9 },
      { url: `${siteUrl}/duelo`, changeFrequency: 'weekly', priority: 0.8 },
    ];

    return new NextResponse(createXml(staticEntries), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  }

  try {
    const match = rawId.match(/^([A-Z]{2,3})(?:-(\d+))?$/);
    const ufCode = match?.[1]?.toUpperCase() ?? rawId;
    const pageNumber = match && match[2] ? Number(match[2]) - 1 : 0;

    // Comparação insensível a maiúsculas/minúsculas com a lista de UFs
    const isUfValid = AVAILABLE_UFS.some(
      (uf) => uf.toUpperCase() === ufCode
    );

    if (!isUfValid) {
      return new NextResponse('Sitemap não encontrado (UF inválida).', { status: 404 });
    }

    const pageStart = pageNumber * SITEMAP_PAGE_SIZE;
    const pageEnd = pageStart + SITEMAP_PAGE_SIZE;

    // Busca os candidatos do R2 para a UF (ex: BR.json)
    const ids = await getCandidateIdsForUf(ufCode);
    const pageIds = [...new Set(ids)].slice(pageStart, pageEnd);

    if (!pageIds.length) {
      return new NextResponse('Sitemap vazio para esta UF.', { status: 404 });
    }

    const entries: SitemapEntry[] = pageIds.map((candidateId) => ({
      url: `${siteUrl}/candidato/${encodeURIComponent(candidateId)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return new NextResponse(createXml(entries), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (err) {
    return new NextResponse('Erro ao processar sitemap.', { status: 500 });
  }
}
