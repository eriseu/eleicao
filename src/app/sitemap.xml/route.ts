import { NextRequest, NextResponse } from 'next/server';
import { getSitemapPageCountForUf, xmlEscape } from '@/lib/sitemap';
import { AVAILABLE_UFS } from '@/constants/elections';
import { getSiteUrl } from '@/lib/seo';

export const revalidate = 86400; // Cache de 24 horas

export async function GET() {
  const siteUrl = getSiteUrl();

  try {
    // 1. Inclui páginas estáticas/institucionais se houver
    const sitemapEntries: string[] = [
      `  <sitemap>\n    <loc>${xmlEscape(`${siteUrl}/sitemap/static.xml`)}</loc>\n  </sitemap>`
    ];

    // 2. Mapeia cada UF e descobre quantas páginas de 10.000 itens ela tem
    const pagePromises = AVAILABLE_UFS.map(async (uf) => {
      try {
        const count = await getSitemapPageCountForUf(uf);
        return { uf: uf.toLowerCase(), count };
      } catch (err) {
        console.error(`[SITEMAP ROOT] Erro ao contar páginas para ${uf}:`, err);
        return { uf: uf.toLowerCase(), count: 0 };
      }
    });

    const ufPageCounts = await Promise.all(pagePromises);

    // 3. Monta a lista APONTANDO DIRETO PARA AS PÁGINAS (/uf/1.xml, /uf/2.xml...)
    for (const { uf, count } of ufPageCounts) {
      if (count === 0) continue;

      for (let page = 1; page <= count; page++) {
        const loc = xmlEscape(`${siteUrl}/sitemap/${uf}/${page}.xml`);
        sitemapEntries.push(`  <sitemap>\n    <loc>${loc}</loc>\n  </sitemap>`);
      }
    }

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
    console.error('[SITEMAP ROOT ERROR]', error);
    return new NextResponse('Erro ao gerar sitemap principal.', { status: 500 });
  }
}
