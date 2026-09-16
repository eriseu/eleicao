import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { decodeShortLinkTarget } from '@/lib/shortLink';
import { buildDuelOgImageUrl } from '@/lib/duelOgImage';
import { supabase } from '@/lib/supabaseClient';
import { getSiteUrl } from '@/lib/seo';
import { generateMetadata as rankingMetadata } from '@/app/ranking/page';
import { generateMetadata as candidateMetadata } from '@/app/candidato/[id]/layout';

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function resolveShortLink(target: string) {
  const url = new URL(target, 'https://politica.centraleti.com.br');
  const pathname = url.pathname;
  const searchParams = url.searchParams;

  // Detecta tipo de link
  if (pathname === '/duelo') {
    const c1 = searchParams.get('c1');
    const c2 = searchParams.get('c2');
    const uf = searchParams.get('uf');

    if (c1 && c2) {
      return {
        type: 'duelo',
        c1,
        c2,
        uf: uf || undefined,
        url: pathname + url.search,
      };
    }
  }

  if (pathname === '/ranking') {
    const uf = searchParams.get('uf');
    const municipio = searchParams.get('municipio');

    return {
      type: 'ranking',
      uf: uf || 'BR',
      municipio: municipio || undefined,
      url: pathname + url.search,
    };
  }

  return { type: 'unknown', url: target };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const target = decodeShortLinkTarget(slug);

  if (!target) {
    notFound();
  }

  const resolved = await resolveShortLink(target);

  if (resolved.type === 'duelo' && resolved.c1 && resolved.c2) {
    try {
      const { data, error } = await supabase
        .from('perfis_candidatos')
        .select('id, nome_completo')
        .in('id', [resolved.c1, resolved.c2]);

      if (!error && data && data.length > 0) {
        const byId = new Map(data.map((c) => [c.id, c]));
        const first = byId.get(resolved.c1);
        const second = byId.get(resolved.c2);

        if (first && second) {
          const title = `${first.nome_completo} x ${second.nome_completo}`;
          const description = `Compare ${first.nome_completo} e ${second.nome_completo} no Duelo Político e escolha quem representa melhor suas preferências.`;
          const ogImage = buildDuelOgImageUrl(resolved.c1, resolved.c2, resolved.uf);

          const absoluteUrl = new URL(resolved.url, getSiteUrl()).toString();

          return {
            title,
            description,
            openGraph: {
              title,
              description,
              url: absoluteUrl,
              images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
            },
            twitter: {
              card: 'summary_large_image',
              title,
              description,
              images: [ogImage],
            },
          };
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados do duelo para OG:', err);
    }

    // Fallback se houver erro ou dados não encontrados
    const title = 'Duelo Político';
    const description = 'Compare candidatos no Duelo Político';
    const ogImage = buildDuelOgImageUrl(resolved.c1, resolved.c2, resolved.uf);

    const absoluteUrl = new URL(resolved.url, getSiteUrl()).toString();

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: absoluteUrl,
        images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    };
  }

  if (resolved.type === 'ranking') {
    const url = new URL(target, getSiteUrl());
    return rankingMetadata({ searchParams: Promise.resolve(Object.fromEntries(url.searchParams)) });
  }
  const candidateMatch = new URL(target, getSiteUrl()).pathname.match(/^\/candidato\/([^/]+)$/);
  if (candidateMatch) {
    return candidateMetadata({ params: Promise.resolve({ id: decodeURIComponent(candidateMatch[1]) }), children: null });
  }

  return {
    title: 'Duelo Político',
    description: 'Compare candidatos e veja quem está mais alinhado com suas escolhas.',
  };
}

export default async function ShortLinkPage({ params }: PageProps) {
  const { slug } = await params;
  const target = decodeShortLinkTarget(slug);

  if (!target) {
    notFound();
  }

  const resolved = await resolveShortLink(target);

  if (!resolved.url || resolved.url === '/') {
    notFound();
  }

  const siteUrl = getSiteUrl();
  if (resolved.url.startsWith('/')) {
    redirect(new URL(resolved.url, siteUrl).toString());
  }

  redirect(resolved.url);
}
