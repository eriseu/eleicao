import type { MetadataRoute } from 'next';
import { ACTIVE_ELECTION_YEARS } from '@/constants/elections';
import { supabase } from '@/lib/supabaseClient';

const BATCH_SIZE = 1000;

function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000';

  const urlWithProtocol = /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`;

  return urlWithProtocol.replace(/\/$/, '');
}

async function getCandidateRankingLinks(siteUrl: string) {
  const candidatesByProfile = new Map<string, string>();

  for (let from = 0; ; from += BATCH_SIZE) {
    const { data, error } = await supabase
      .from('candidaturas')
      .select('perfil_id, uf, ano_eleicao')
      .in('ano_eleicao', [...ACTIVE_ELECTION_YEARS])
      .not('perfil_id', 'is', null)
      .not('uf', 'is', null)
      .order('ano_eleicao', { ascending: false })
      .range(from, from + BATCH_SIZE - 1);

    if (error) {
      console.error('Erro ao gerar URLs de candidatos no sitemap:', error.message);
      break;
    }

    for (const candidate of data || []) {
      if (!candidatesByProfile.has(candidate.perfil_id)) {
        candidatesByProfile.set(candidate.perfil_id, candidate.uf);
      }
    }

    if (!data || data.length < BATCH_SIZE) break;
  }

  return Array.from(candidatesByProfile, ([candidateId, uf]) => {
    const url = new URL('/ranking', siteUrl);
    url.searchParams.set('uf', uf);
    url.searchParams.set('highlight', candidateId);

    return {
      url: url.toString(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    };
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const candidateRankingLinks = await getCandidateRankingLinks(siteUrl);

  return [
    {
      url: siteUrl,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/ranking`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...candidateRankingLinks,
  ];
}
