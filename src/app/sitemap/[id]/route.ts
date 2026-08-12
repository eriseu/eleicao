import { NextResponse } from 'next/server';
import { getCandidateIdsForUf, xmlEscape } from '@/lib/sitemap';
import { getSiteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

interface RouteProps {
  params: Promise<{ uf: string }>; // Ou { id: string } a depender do seu nome de pasta
}

export async function GET(request: Request, { params }: RouteProps) {
  const resolvedParams = await params;
  
  // Exemplo: 'mt.xml' -> vira 'mt'
  const rawParam = resolvedParams.uf || (resolvedParams as any).id || '';
  const ufClean = rawParam.replace(/\.xml$/i, '').toUpperCase();

  const siteUrl = getSiteUrl();
  const ids = await getCandidateIdsForUf(ufClean);

  if (!ids || ids.length === 0) {
    return new NextResponse('Sitemap vazio para esta UF.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // Gera as tags do XML para cada candidato
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
}
