import type { Metadata } from 'next';
import RankingClient from './RankingClient';
import { AVAILABLE_UFS } from '@/constants/elections';
import { supabase } from '@/lib/supabaseClient';

type RankingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: RankingPageProps): Promise<Metadata> {
  const query = await searchParams;
  const highlightedId = firstValue(query.highlight);
  const requestedUf = firstValue(query.uf)?.toUpperCase();

  if (!highlightedId) {
    return {
      title: 'Ranking de candidatos',
      description: 'Veja os candidatos mais bem posicionados no ranking político por Brasil, estado e município.',
      alternates: { canonical: '/ranking' },
      openGraph: {
        title: 'Ranking de candidatos',
        description: 'Acompanhe os candidatos mais bem posicionados no Duelo Político.',
        url: '/ranking',
      },
    };
  }

  const { data: candidate } = await supabase
    .from('perfis_candidatos')
    .select('nome_completo')
    .eq('id', highlightedId)
    .maybeSingle();

  if (!candidate) {
    return {
      title: 'Ranking de candidatos',
      alternates: { canonical: '/ranking' },
      robots: { index: false, follow: true },
    };
  }

  const uf = requestedUf && AVAILABLE_UFS.some((item) => item === requestedUf)
    ? requestedUf
    : 'BR';
  const canonicalParams = new URLSearchParams({ uf, highlight: highlightedId });
  const canonical = `/ranking?${canonicalParams.toString()}`;
  const scope = uf === 'BR' ? 'Brasil' : uf;
  const title = `${candidate.nome_completo} no ranking de ${scope}`;
  const description = `Veja a posição de ${candidate.nome_completo} no ranking político de ${scope}, com pontuação Elo atualizada.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      title,
      description,
      url: canonical,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default function RankingPage() {
  return <RankingClient />;
}
