import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/seo';
import { xmlEscape } from '@/lib/sitemap'; // ajuste seu import se necessário

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const R2_BASE_URL = 'https://fotos.centraleti.com.br/candidatos';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const ufClean = resolvedParams.id.replace('.xml', '').toUpperCase();
  const siteUrl = getSiteUrl();

  // Tratamento da página estática
  if (ufClean === 'STATIC') {
    const staticXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${xmlEscape(siteUrl)}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${xmlEscape(`${siteUrl}/ranking`)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${xmlEscape(`${siteUrl}/duelo`)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

    return new NextResponse(staticXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400',
      },
    });
  }

  // Busca APENAS o JSON do estado solicitado no R2
  try {
    const res = await fetch(`${R2_BASE_URL}/${ufClean}.json`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return new NextResponse('Sitemap não encontrado.', { status: 404 });
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return new NextResponse('Sitemap não encontrado.', { status: 404 });
    }

    // Monta as URLs do estado
    const urlsXml = data
      .map((candidato: any) => {
        const id = candidato.id || candidato;
        const candidateUrl = `${siteUrl}/candidato/${encodeURIComponent(id)}`;
        return `  <url>
    <loc>${xmlEscape(candidateUrl)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
      })
      .join('\n');

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error(`Erro ao gerar sitemap para a UF ${ufClean}:`, error);
    return new NextResponse('Erro ao processar sitemap.', { status: 500 });
  }
}
