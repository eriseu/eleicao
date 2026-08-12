import { NextRequest, NextResponse } from 'next/server';
import { getSitemapCandidatePage, xmlEscape, SITEMAP_PAGE_SIZE } from '@/lib/sitemap';
import { getSiteUrl } from '@/lib/seo';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uf: string; page: string }> }
) {
  const resolvedParams = await params;
  const ufRaw = resolvedParams.uf || '';
  const ufClean = ufRaw.toUpperCase();
  
  // Trata '1.xml' -> 1
  const pageRaw = resolvedParams.page || '1';
  const pageNum = parseInt(pageRaw.replace(/\.xml$/i, ''), 10);

  if (isNaN(pageNum) || pageNum < 1) {
    return new NextResponse('Página inválida.', { status: 400 });
  }

  const siteUrl = getSiteUrl();

  try {
    // Busca apenas a fatia (ex: página 0 = 0 a 10.000)
    const candidateIds = await getSitemapCandidatePage(pageNum - 1, ufClean);

    if (!candidateIds || candidateIds.length === 0) {
      return new NextResponse(`Nenhum candidato encontrado para ${ufClean} na página ${pageNum}`, {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const urlEntries = candidateIds.map((id) => {
      const loc = xmlEscape(`${siteUrl}/candidato/${id}`);
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
  } catch (error: any) {
    console.error(`[SITEMAP PAGE ERROR] ${ufClean} pág ${pageNum}:`, error);
    return new NextResponse(`Erro ao carregar sitemap: ${error?.message || error}`, { status: 500 });
  }
}
