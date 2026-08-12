import { NextRequest, NextResponse } from 'next/server';
import { getSitemapPageCountForUf, xmlEscape } from '@/lib/sitemap';
import { getSiteUrl } from '@/lib/seo';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uf: string }> }
) {
  const resolvedParams = await params;
  const rawParam = resolvedParams.uf || '';
  const ufClean = rawParam.replace(/\.xml$/i, '').toUpperCase();
  const siteUrl = getSiteUrl();

  try {
    // Calcula o total de páginas com base no tamanho SITEMAP_PAGE_SIZE
    const pageCount = await getSitemapPageCountForUf(ufClean);

    if (pageCount === 0) {
      return new NextResponse(`Sitemap sem candidatos cadastrados para a UF: ${ufClean}`, {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Se tiver apenas 1 página, gera os links diretamente no arquivo
    // Se tiver mais de 1, gera o Sitemap Index paginado (/sitemap/mt/1.xml, /sitemap/mt/2.xml...)
    const sitemapEntries = Array.from({ length: pageCount }, (_, i) => {
      const pageNum = i + 1;
      const loc = xmlEscape(`${siteUrl}/sitemap/${ufClean.toLowerCase()}/${pageNum}.xml`);
      return `  <sitemap>\n    <loc>${loc}</loc>\n  </sitemap>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</sitemapindex>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
      },
    });

  } catch (error: any) {
    console.error(`[SITEMAP ROUTE ERROR] UF '${ufClean}':`, error);
    return new NextResponse(`Erro ao carregar dados do R2 (${ufClean}): ${error?.message || error}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
