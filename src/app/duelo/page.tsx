import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import DueloClient from './DueloClient';
import { AVAILABLE_UFS } from '@/constants/elections';
import { supabase } from '@/lib/supabaseClient';
import { buildDuelOgImageUrl } from '@/lib/duelOgImage';
import { getSiteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type DueloPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: DueloPageProps): Promise<Metadata> {
  const query = await searchParams;
  const firstId = firstValue(query.c1);
  const secondId = firstValue(query.c2);
  const requestedUf = firstValue(query.uf)?.toUpperCase();

  if (!firstId || !secondId || firstId === secondId) {
    return {
      title: 'Compare candidatos',
      description: 'Escolha dois candidatos, compare seus perfis e registre sua preferência no duelo político.',
      alternates: { canonical: '/duelo' },
      openGraph: {
        title: 'Compare candidatos no Duelo Político',
        description: 'Coloque dois candidatos frente a frente e faça sua escolha.',
        url: '/duelo',
      },
    };
  }

  const { data } = await supabase
    .from('perfis_candidatos')
    .select('id, nome_completo')
    .in('id', [firstId, secondId]);
  const namesById = new Map((data || []).map((candidate) => [candidate.id, candidate.nome_completo]));
  const firstName = namesById.get(firstId);
  const secondName = namesById.get(secondId);

  if (!firstName || !secondName) {
    return {
      title: 'Compare candidatos',
      alternates: { canonical: '/duelo' },
      robots: { index: false, follow: true },
    };
  }

  const params = new URLSearchParams({ c1: firstId, c2: secondId });
  if (requestedUf && AVAILABLE_UFS.some((uf) => uf === requestedUf)) {
    params.set('uf', requestedUf);
  }
  const canonicalPath = `/duelo?${params.toString()}`;
  const canonical = new URL(canonicalPath, getSiteUrl()).toString();
  const title = `${firstName} x ${secondName}`;
  const description = `Compare ${firstName} e ${secondName} no Duelo Político e escolha quem representa melhor suas preferências.`;
  const ogImage = buildDuelOgImageUrl(firstId, secondId, requestedUf);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
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

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Carregando duelo...</div>}>
      <DueloClient />
    </Suspense>
  );
}
