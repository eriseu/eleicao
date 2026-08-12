import { NextRequest, NextResponse } from 'next/server';
import { getCandidateIdsForUf, xmlEscape } from '@/lib/sitemap';
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
    // Tenta buscar os IDs
    const ids = await getCandidateIdsForUf(ufClean);

    if (!ids || ids.length === 0) {
      console.warn(`[SITEMAP WARNING] O arquivo JSON do R2 para '${ufClean}' existe, mas veio vazio (0 candidatos).`);
      return new NextResponse(`Sitemap sem candidatos cadastrados para a UF: ${ufClean}`, {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Gera as tags do XML
    const urlEntries = ids.map((id) => {
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
    // Printa no console da Vercel/Terminal
    console.error(`[SITEMAP ROUTE ERROR] Falha ao gerar sitemap para UF '${ufClean}':`, error);

    // Retorna status 500 exibindo a causa real na tela do navegador
    return new NextResponse(`Erro ao carregar dados do R2 (${ufClean}): ${error?.message || error}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
