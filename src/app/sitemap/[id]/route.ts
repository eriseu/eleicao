import { getSiteUrl } from '@/lib/seo';
import { getSitemapCandidatePage, xmlEscape } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Define o timeout máximo para 60 segundos
export const revalidate = 86400; // Cache de 24 horas na rota do sitemap

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // <-- Ajustado para Promise
) {
  // Aguarda a resolução dos parâmetros exigidos pelo Next.js 15+
  const resolvedParams = await params;
  
  // Limpa o ".xml" caso venha na URL (ex: "0.xml" vira "0")
  const idClean = resolvedParams.id.replace('.xml', '');
  const siteUrl = getSiteUrl();
  let entries: SitemapEntry[];

  if (idClean === 'static') {
    entries = [
      { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
      { url: `${siteUrl}/ranking`, changeFrequency: 'daily', priority: 0.9 },
      { url: `${siteUrl}/duelo`, changeFrequency: 'weekly', priority: 0.8 },
    ];
  } else {
    const page = parseInt(idClean, 10);
    if (isNaN(page) || !Number.isSafeInteger(page) || page < 0) {
      return new Response('Sitemap não encontrado.', { status: 404 });
    }

    try {
      const candidates = await getSitemapCandidatePage(page);
      if (!candidates || candidates.length === 0) {
        return new Response('Sitemap não encontrado.', { status: 404 });
      }

      entries = candidates.flatMap((candidate: any) => {
        // Trata o caso em que 'candidate' pode ser string (ID) ou objeto
        const candidateId = typeof candidate === 'string' ? candidate : candidate.id;
        const candidateUf = typeof candidate === 'object' ? candidate?.uf : undefined;

        const rankingUrl = new URL('/ranking', siteUrl);
        if (candidateUf) {
          rankingUrl.searchParams.set('uf', candidateUf);
        }
        rankingUrl.searchParams.set('highlight', candidateId);

        return [
          {
            url: rankingUrl.toString(),
            changeFrequency: 'daily' as const,
            priority: 0.7,
          },
          {
            url: `${siteUrl}/candidato/${encodeURIComponent(candidateId)}`,
            changeFrequency: 'weekly' as const,
            priority: 0.6,
          },
        ];
      });
    } catch (error) {
      console.error('Erro ao gerar sitemap dinâmico:', error);
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
