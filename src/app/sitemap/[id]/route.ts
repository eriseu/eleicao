import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/seo';
import { xmlEscape } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Timeout estendido para 60 segundos na Vercel

const R2_BASE_URL = 'https://fotos.centraleti.com.br/candidatos';

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
  // 1. Aguarda os parâmetros (exigência do Next.js 15+)
  const resolvedParams = await params;

  // 2. Extrai o identificador limpo (ex: "br.xml" vira "BR", "ac.xml" vira "AC")
  const ufClean = resolvedParams.id.replace(/\.xml$/i, '').toUpperCase();
  const siteUrl = getSiteUrl();

  // 3. Caso seja o sitemap estático (sitemap/static.xml)
  if (ufClean === 'STATIC') {
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

  // 4. Caso seja uma UF (BR, AC, SP, RJ, etc.)
  try {
    const res = await fetch(`${R2_BASE_URL}/${ufClean}.json`, {
      next: { revalidate: 86400 }, // Cache de 24 horas no Next
    });

    if (!res.ok) {
      return new NextResponse('Sitemap não encontrado.', { status: 404 });
    }

    const candidates = await res.json();
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return new NextResponse('Sitemap não encontrado.', { status: 404 });
    }

    // 5. Mapeia cada candidato para a URL do perfil
    const entries: SitemapEntry[] = candidates.map((candidate: any) => {
      const candidateId = typeof candidate === 'string' ? candidate : candidate.id;
      return {
        url: `${siteUrl}/candidato/${encodeURIComponent(candidateId)}`,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      };
    });

    return new NextResponse(createXml(entries), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error(`Erro ao gerar sitemap para UF ${ufClean}:`, error);
    return new NextResponse('Erro ao processar sitemap.', { status: 500 });
  }
}
